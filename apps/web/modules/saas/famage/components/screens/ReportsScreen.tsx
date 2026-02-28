"use client";

import {
	EXPENSE_PERIOD,
	type ExpensePeriod,
} from "@repo/api/modules/expenses/types";
import { useSession } from "@saas/auth/hooks/use-session";
import {
	formatCurrency,
	getTransactionCategoryLabel,
} from "@saas/famage/lib/mock-data";
import { orpc } from "@shared/lib/orpc-query-utils";
import { skipToken, useQuery } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@ui/components/card";
import { cn } from "@ui/lib";
import { BarChart3Icon, PieChartIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const reportPeriodOptions: Array<{ key: ExpensePeriod; label: string }> = [
	{ key: EXPENSE_PERIOD.daily, label: "Daily" },
	{ key: EXPENSE_PERIOD.weekly, label: "Weekly" },
	{ key: EXPENSE_PERIOD.monthly, label: "Monthly" },
	{ key: EXPENSE_PERIOD.yearly, label: "Yearly" },
];

const periodLabelMap: Record<ExpensePeriod, string> = {
	[EXPENSE_PERIOD.daily]: "daily",
	[EXPENSE_PERIOD.weekly]: "weekly",
	[EXPENSE_PERIOD.monthly]: "monthly",
	[EXPENSE_PERIOD.yearly]: "yearly",
};

const chartBarHeightClasses = [
	"h-4",
	"h-6",
	"h-8",
	"h-10",
	"h-12",
	"h-14",
	"h-16",
	"h-20",
	"h-24",
];

interface TrendBucket {
	label: string;
	totalAmount: number;
}

interface YearlyTrendInsights {
	selectedMonth: TrendBucket;
	highestMonth: TrendBucket;
	selectedShare: number;
	selectedRelativeHeight: number;
}

function getTrendBarHeightClass(
	totalAmount: number,
	maxAmount: number,
): string {
	if (maxAmount <= 0) {
		return chartBarHeightClasses[0];
	}

	const normalized = totalAmount / maxAmount;
	const scaledIndex = Math.max(
		0,
		Math.min(
			chartBarHeightClasses.length - 1,
			Math.round(normalized * (chartBarHeightClasses.length - 1)),
		),
	);

	return chartBarHeightClasses[scaledIndex];
}

function getBarToneClass(index: number): string {
	if (index % 3 === 0) {
		return "bg-primary/80";
	}

	if (index % 3 === 1) {
		return "bg-secondary/40";
	}

	return "bg-muted";
}

export function ReportsScreen() {
	const { user, loaded } = useSession();
	const [period, setPeriod] = useState<ExpensePeriod>(EXPENSE_PERIOD.monthly);
	const [selectedYearMonthIndex, setSelectedYearMonthIndex] =
		useState<number>(new Date().getMonth());

	const reportsQuery = useQuery(
		orpc.expenses.list.queryOptions({
			input: user
				? {
						period,
					}
				: skipToken,
		}),
	);

	const trend = reportsQuery.data?.trend ?? [];
	const categories = reportsQuery.data?.breakdown ?? [];
	const totalExpenseForPeriod = reportsQuery.data?.summary.totalExpenses ?? 0;
	const maxTrendAmount = trend.reduce(
		(maximum, item) => Math.max(maximum, item.totalAmount),
		0,
	);
	const isYearlyPeriod = period === EXPENSE_PERIOD.yearly;

	const safeSelectedYearMonthIndex = useMemo(() => {
		if (!isYearlyPeriod || trend.length === 0) {
			return 0;
		}

		return Math.min(selectedYearMonthIndex, trend.length - 1);
	}, [isYearlyPeriod, selectedYearMonthIndex, trend.length]);

	const yearlyTrendInsights = useMemo<YearlyTrendInsights | null>(() => {
		if (!isYearlyPeriod || trend.length === 0) {
			return null;
		}

		const selectedMonth = trend[safeSelectedYearMonthIndex];
		const highestMonth = trend.reduce((highest, month) =>
			month.totalAmount > highest.totalAmount ? month : highest,
		);
		const totalYearlyAmount = trend.reduce(
			(totalAmount, month) => totalAmount + month.totalAmount,
			0,
		);

		return {
			selectedMonth,
			highestMonth,
			selectedShare:
				totalYearlyAmount > 0
					? Math.round(
							(selectedMonth.totalAmount / totalYearlyAmount) *
								100,
						)
					: 0,
			selectedRelativeHeight:
				highestMonth.totalAmount > 0
					? Math.round(
							(selectedMonth.totalAmount /
								highestMonth.totalAmount) *
								100,
						)
					: 0,
		};
	}, [isYearlyPeriod, safeSelectedYearMonthIndex, trend]);

	return (
		<section className="space-y-5">
			<header className="space-y-1">
				<p className="font-medium text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
					Reports
				</p>
				<h1 className="font-semibold text-2xl tracking-tight">
					Spending insights
				</h1>
			</header>

			<div
				role="tablist"
				aria-label="Report period"
				className="grid grid-cols-4 gap-2 rounded-2xl bg-muted p-1"
			>
				{reportPeriodOptions.map((option) => (
					<button
						key={option.key}
						type="button"
						role="tab"
						aria-selected={period === option.key}
						onClick={() => setPeriod(option.key)}
						className={cn(
							"min-h-10 rounded-xl px-3 font-medium text-sm",
							period === option.key
								? "bg-card text-foreground shadow-xs"
								: "text-muted-foreground",
						)}
					>
						{option.label}
					</button>
				))}
			</div>

			{loaded && !user ? (
				<Card className="border-dashed bg-card/70">
					<CardContent className="space-y-3 p-4 text-center">
						<p className="font-medium text-sm">
							Sign in to view live reports
						</p>
						<Button
							asChild
							variant="outline"
							className="h-10 rounded-xl"
						>
							<Link href="/famage/auth/login?redirectTo=/famage/reports">
								Sign in
							</Link>
						</Button>
					</CardContent>
				</Card>
			) : null}

			<Card>
				<CardHeader className="pb-2">
					<div className="flex items-center gap-2">
						<BarChart3Icon className="size-4 text-primary" />
						<CardTitle className="text-lg">Trend</CardTitle>
					</div>
					<CardDescription>
						{user
							? `Expense trend for this ${periodLabelMap[period]}`
							: "Sign in to generate your chart from real expenses"}
					</CardDescription>
				</CardHeader>

				<CardContent className="pb-4">
					<div className="rounded-2xl border bg-muted/40 p-4">
						{isYearlyPeriod ? (
							<div className="space-y-4">
								<div className="-mx-1 overflow-x-auto pb-1">
									<div
										role="tablist"
										aria-label="Year months"
										className="flex min-w-max gap-2 px-1"
									>
										{trend.map((month, index) => (
											<button
												key={month.label}
												type="button"
												role="tab"
												aria-selected={
													safeSelectedYearMonthIndex ===
													index
												}
												onClick={() =>
													setSelectedYearMonthIndex(
														index,
													)
												}
												className={cn(
													"min-h-9 rounded-full border px-3 font-medium text-xs transition-colors",
													safeSelectedYearMonthIndex ===
														index
														? "border-primary bg-primary/10 text-foreground"
														: "border-border bg-card text-muted-foreground",
												)}
											>
												{month.label}
											</button>
										))}
									</div>
								</div>

								{yearlyTrendInsights ? (
									<div className="rounded-xl border bg-card p-4">
										<div className="flex items-start justify-between gap-3">
											<div>
												<p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
													{
														yearlyTrendInsights
															.selectedMonth.label
													}
												</p>
												<p className="mt-1 font-semibold text-lg">
													{formatCurrency(
														yearlyTrendInsights
															.selectedMonth
															.totalAmount,
													)}
												</p>
											</div>
											<p className="text-right text-muted-foreground text-xs">
												{
													yearlyTrendInsights.selectedShare
												}
												% of yearly spend
											</p>
										</div>

										<div className="mt-3 space-y-1.5">
											<div className="h-2 rounded-full bg-muted">
												<div
													className="h-full rounded-full bg-primary transition-all duration-300"
													style={{
														width:
															yearlyTrendInsights.selectedRelativeHeight >
															0
																? `${Math.max(yearlyTrendInsights.selectedRelativeHeight, 8)}%`
																: "0%",
													}}
												/>
											</div>
											<p className="text-muted-foreground text-xs">
												Peak month:{" "}
												{
													yearlyTrendInsights
														.highestMonth.label
												}{" "}
												(
												{formatCurrency(
													yearlyTrendInsights
														.highestMonth
														.totalAmount,
												)}
												)
											</p>
										</div>
									</div>
								) : (
									<p className="w-full text-center text-muted-foreground text-sm">
										No trend data for this period yet.
									</p>
								)}
							</div>
						) : (
							<div className="flex h-32 items-end justify-between gap-2">
								{trend.length > 0 ? (
									trend.map((bar, index) => (
										<div
											key={bar.label}
											className="flex flex-1 flex-col items-center gap-2"
										>
											<div
												className={cn(
													"w-full rounded-xl",
													getTrendBarHeightClass(
														bar.totalAmount,
														maxTrendAmount,
													),
													getBarToneClass(index),
												)}
											/>
											<p className="text-[10px] text-muted-foreground uppercase tracking-wide">
												{bar.label}
											</p>
										</div>
									))
								) : (
									<p className="w-full text-center text-muted-foreground text-sm">
										No trend data for this period yet.
									</p>
								)}
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="pb-2">
					<div className="flex items-center gap-2">
						<PieChartIcon className="size-4 text-primary" />
						<CardTitle className="text-lg">
							Category breakdown
						</CardTitle>
					</div>
				</CardHeader>

				<CardContent className="space-y-3">
					{reportsQuery.isPending ? (
						<div className="rounded-2xl border bg-muted/40 p-4 text-center text-sm">
							Loading report...
						</div>
					) : categories.length > 0 ? (
						<ul className="space-y-2">
							{categories.map((category) => {
								const percentage =
									totalExpenseForPeriod > 0
										? Math.round(
												(category.totalAmount /
													totalExpenseForPeriod) *
													100,
											)
										: 0;

								return (
									<li
										key={category.category}
										className="flex items-center justify-between rounded-xl border bg-card p-3"
									>
										<div>
											<p className="font-medium text-sm">
												{getTransactionCategoryLabel(
													category.category,
												)}
											</p>
											<p className="text-muted-foreground text-xs">
												{percentage}% of total •{" "}
												{category.transactionCount}{" "}
												entries
											</p>
										</div>
										<p className="font-semibold text-sm">
											{formatCurrency(
												category.totalAmount,
											)}
										</p>
									</li>
								);
							})}
						</ul>
					) : (
						<div className="rounded-2xl border border-dashed bg-muted/40 p-4 text-center">
							<p className="font-medium text-sm">
								No data for this period
							</p>
							<p className="mt-1 text-muted-foreground text-xs">
								Add expenses to generate category insights.
							</p>
						</div>
					)}
				</CardContent>
			</Card>
		</section>
	);
}
