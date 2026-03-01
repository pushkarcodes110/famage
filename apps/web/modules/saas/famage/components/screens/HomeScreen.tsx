"use client";

import {
	EXPENSE_PERIOD,
	type ExpensePeriod,
} from "@repo/api/modules/expenses/types";
import { useSession } from "@saas/auth/hooks/use-session";
import {
	dashboardSummaries,
	EXPENSE_CATEGORY,
	FAMAGE_PERIOD,
	formatCurrency,
	getTransactionCategoryLabel,
	INCOME_SOURCE,
	recentTransactions,
} from "@saas/famage/lib/mock-data";
import { orpc } from "@shared/lib/orpc-query-utils";
import {
	skipToken,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@ui/components/card";
import { cn } from "@ui/lib";
import type { LucideIcon } from "lucide-react";
import {
	ArrowDownCircleIcon,
	ArrowUpCircleIcon,
	BadgeDollarSignIcon,
	BookOpenIcon,
	BriefcaseBusinessIcon,
	BusIcon,
	CoinsIcon,
	GiftIcon,
	HeartPulseIcon,
	PencilIcon,
	ReceiptTextIcon,
	RotateCcwIcon,
	ShoppingBasketIcon,
	SparklesIcon,
	Trash2Icon,
	TvIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

type HomeTransaction = {
	id: string;
	title: string;
	category: string;
	amount: number;
	dateLabel: string;
	isShared: boolean;
};

const periodOptions: Array<{ key: ExpensePeriod; label: string }> = [
	{ key: EXPENSE_PERIOD.daily, label: "Daily" },
	{ key: EXPENSE_PERIOD.weekly, label: "Weekly" },
	{ key: EXPENSE_PERIOD.monthly, label: "Monthly" },
];

const categoryIconMap: Record<string, LucideIcon> = {
	[EXPENSE_CATEGORY.groceries]: ShoppingBasketIcon,
	[EXPENSE_CATEGORY.utilities]: ReceiptTextIcon,
	[EXPENSE_CATEGORY.school]: BookOpenIcon,
	[EXPENSE_CATEGORY.transport]: BusIcon,
	[EXPENSE_CATEGORY.health]: HeartPulseIcon,
	[EXPENSE_CATEGORY.entertainment]: TvIcon,
	[EXPENSE_CATEGORY.other]: ReceiptTextIcon,
	[INCOME_SOURCE.salary]: BriefcaseBusinessIcon,
	[INCOME_SOURCE.freelancing]: BadgeDollarSignIcon,
	[INCOME_SOURCE.refund]: RotateCcwIcon,
	[INCOME_SOURCE.gift]: GiftIcon,
	[INCOME_SOURCE.interest]: CoinsIcon,
	[INCOME_SOURCE.otherIncome]: ReceiptTextIcon,
};

function formatTransactionDate(
	period: ExpensePeriod,
	dateString: string,
): string {
	const expenseDate = new Date(dateString);

	if (period === EXPENSE_PERIOD.daily) {
		return expenseDate.toLocaleTimeString("en-IN", {
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	if (period === EXPENSE_PERIOD.weekly) {
		return expenseDate.toLocaleDateString("en-IN", {
			weekday: "short",
		});
	}

	return expenseDate.toLocaleDateString("en-IN", {
		month: "short",
		day: "numeric",
	});
}

export function HomeScreen() {
	const { user, loaded } = useSession();
	const queryClient = useQueryClient();
	const [period, setPeriod] = useState<ExpensePeriod>(EXPENSE_PERIOD.monthly);

	const expensesQuery = useQuery(
		orpc.expenses.list.queryOptions({
			input: user
				? {
						period,
					}
				: skipToken,
		}),
	);

	const deleteExpenseMutation = useMutation(
		orpc.expenses.delete.mutationOptions(),
	);

	async function invalidateFamageData() {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: orpc.expenses.list.queryKey({
					input: { period: EXPENSE_PERIOD.daily },
				}),
			}),
			queryClient.invalidateQueries({
				queryKey: orpc.expenses.list.queryKey({
					input: { period: EXPENSE_PERIOD.weekly },
				}),
			}),
			queryClient.invalidateQueries({
				queryKey: orpc.expenses.list.queryKey({
					input: { period: EXPENSE_PERIOD.monthly },
				}),
			}),
			queryClient.invalidateQueries({
				queryKey: orpc.expenses.list.queryKey({
					input: { period: EXPENSE_PERIOD.yearly },
				}),
			}),
			queryClient.invalidateQueries({
				queryKey: orpc.family.overview.queryKey(),
			}),
		]);
	}

	const isUsingLiveData = Boolean(user);

	const summary = isUsingLiveData
		? {
				totalExpenses: expensesQuery.data?.summary.totalExpenses ?? 0,
				totalIncome: expensesQuery.data?.summary.totalIncome ?? 0,
				balance: expensesQuery.data?.summary.balance ?? 0,
			}
		: (dashboardSummaries[period as keyof typeof dashboardSummaries] ??
			dashboardSummaries[FAMAGE_PERIOD.monthly]);

	const transactions: HomeTransaction[] = isUsingLiveData
		? (expensesQuery.data?.expenses ?? []).map((expense) => ({
				id: expense.id,
				title: getTransactionCategoryLabel(expense.category),
				category: expense.category,
				amount:
					expense.type === "income"
						? expense.amount
						: -expense.amount,
				dateLabel: formatTransactionDate(
					period,
					expense.expenseDate.toString(),
				),
				isShared: expense.visibility === "shared",
			}))
		: (recentTransactions[period as keyof typeof recentTransactions] ??
			recentTransactions[FAMAGE_PERIOD.monthly]);

	async function handleDeleteExpense(id: string) {
		if (!window.confirm("Delete this expense?")) {
			return;
		}

		try {
			await deleteExpenseMutation.mutateAsync({ id });
			await invalidateFamageData();
			toast.success("Expense deleted");
		} catch {
			toast.error("Failed to delete expense");
		}
	}

	return (
		<section className="space-y-5">
			<header className="space-y-1">
				<p className="font-medium text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
					Dashboard
				</p>
				<h1 className="font-semibold text-2xl tracking-tight">
					Family finances, simplified
				</h1>
			</header>

			<Card className="border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card">
				<CardHeader className="pb-3">
					<div className="flex items-start justify-between gap-3">
						<div>
							<CardTitle className="text-lg">Summary</CardTitle>
							<CardDescription>
								Quick overview for this {period}
							</CardDescription>
						</div>

						<div
							role="tablist"
							aria-label="Summary period"
							className="inline-flex rounded-full border bg-card p-1"
						>
							{periodOptions.map((option) => (
								<button
									key={option.key}
									type="button"
									role="tab"
									aria-selected={period === option.key}
									onClick={() => setPeriod(option.key)}
									className={cn(
										"min-h-9 rounded-full px-3 font-medium text-xs",
										period === option.key
											? "bg-primary text-primary-foreground"
											: "text-muted-foreground",
									)}
								>
									{option.label}
								</button>
							))}
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-3 p-4 pt-0">
					<div className="grid grid-cols-3 gap-3">
						<div className="rounded-2xl bg-card/80 p-3">
							<p className="text-[11px] text-muted-foreground">
								Expenses
							</p>
							<p className="mt-1 font-semibold text-destructive text-sm">
								{formatCurrency(summary.totalExpenses)}
							</p>
						</div>

						<div className="rounded-2xl bg-card/80 p-3">
							<p className="text-[11px] text-muted-foreground">
								Income
							</p>
							<p className="mt-1 font-semibold text-sm text-success">
								{formatCurrency(summary.totalIncome)}
							</p>
						</div>

						<div className="rounded-2xl bg-card/80 p-3">
							<p className="text-[11px] text-muted-foreground">
								Balance
							</p>
							<p className="mt-1 font-semibold text-foreground text-sm">
								{formatCurrency(summary.balance)}
							</p>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-2">
						<Button
							asChild
							size="sm"
							className="h-10 rounded-xl"
							variant="primary"
						>
							<Link href="/famage/add-expense">
								+ Add Expense
							</Link>
						</Button>
						<Button
							asChild
							size="sm"
							className="h-10 rounded-xl"
							variant="outline"
						>
							<Link href="/famage/add-expense?type=income">
								+ Add Credit
							</Link>
						</Button>
					</div>
				</CardContent>
			</Card>

			{loaded && !user ? (
				<Card className="border-dashed bg-card/70">
					<CardContent className="space-y-3 p-4 text-center">
						<p className="font-medium text-sm">
							Sign in to sync your expenses
						</p>
						<Button
							asChild
							variant="outline"
							className="h-10 rounded-xl"
						>
							<Link href="/famage/auth/login?redirectTo=/famage">
								Sign in
							</Link>
						</Button>
					</CardContent>
				</Card>
			) : null}

			<div className="flex items-center justify-between">
				<h2 className="font-semibold text-base">Recent transactions</h2>
				<p className="text-muted-foreground text-xs">
					{transactions.length} item
					{transactions.length === 1 ? "" : "s"}
				</p>
			</div>

			{isUsingLiveData && expensesQuery.isPending ? (
				<Card>
					<CardContent className="p-4 text-center text-muted-foreground text-sm">
						Loading transactions...
					</CardContent>
				</Card>
			) : transactions.length > 0 ? (
				<ul className="space-y-3">
					{transactions.map((transaction) => {
						const Icon =
							categoryIconMap[transaction.category] ??
							categoryIconMap.other;
						const isPositive = transaction.amount > 0;

						return (
							<li key={transaction.id}>
								<div className="flex items-center gap-3 rounded-2xl border bg-card p-3">
									<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
										<Icon className="size-4 text-primary" />
									</div>

									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<p className="truncate font-medium text-sm">
												{transaction.title}
											</p>
											{transaction.isShared ? (
												<Badge
													className="px-2 py-0.5 font-medium normal-case"
													status="info"
												>
													Shared
												</Badge>
											) : null}
										</div>
										<p className="text-muted-foreground text-xs">
											{transaction.dateLabel}
										</p>
									</div>

									<div className="text-right">
										<div className="flex items-center justify-end gap-1">
											{isPositive ? (
												<ArrowUpCircleIcon className="size-4 text-success" />
											) : (
												<ArrowDownCircleIcon className="size-4 text-destructive" />
											)}
											<p
												className={cn(
													"font-semibold text-sm",
													{
														"text-destructive":
															!isPositive,
														"text-success":
															isPositive,
													},
												)}
											>
												{`${isPositive ? "+" : ""}${formatCurrency(
													Math.abs(
														transaction.amount,
													),
												)}`}
											</p>
										</div>
									</div>

									{isUsingLiveData ? (
										<div className="ml-1 flex shrink-0 flex-col gap-1">
											<Button
												asChild
												size="icon"
												variant="light"
												className="size-8"
											>
												<Link
													href={`/famage/add-expense?expenseId=${transaction.id}`}
												>
													<PencilIcon className="size-3.5" />
												</Link>
											</Button>

											<Button
												type="button"
												size="icon"
												variant="light"
												className="size-8"
												onClick={() =>
													handleDeleteExpense(
														transaction.id,
													)
												}
												disabled={
													deleteExpenseMutation.isPending
												}
											>
												<Trash2Icon className="size-3.5 text-destructive" />
											</Button>
										</div>
									) : null}
								</div>
							</li>
						);
					})}
				</ul>
			) : (
				<Card className="border-dashed">
					<CardContent className="space-y-3 p-4 text-center">
						<p className="font-medium text-sm">
							No transactions yet
						</p>
						<p className="text-muted-foreground text-xs">
							Add your first expense to populate this list.
						</p>
						<Button
							asChild
							className="h-10 rounded-xl"
							variant="outline"
						>
							<Link href="/famage/add-expense">
								Add your first expense
							</Link>
						</Button>
					</CardContent>
				</Card>
			)}

			<Card className="border-dashed bg-card/70">
				<CardContent className="flex items-start gap-3 p-4">
					<span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
						<SparklesIcon className="size-4" />
					</span>
					<div>
						<p className="font-medium text-sm">
							Keep expenses updated daily
						</p>
						<p className="mt-1 text-muted-foreground text-xs leading-relaxed">
							Your summaries and reports update instantly as you
							save or edit expenses.
						</p>
					</div>
				</CardContent>
			</Card>

			<div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center px-4">
				<Button
					asChild
					className="pointer-events-auto h-12 w-full max-w-[430px] rounded-2xl font-semibold text-sm shadow-lg"
					size="lg"
					variant="primary"
				>
					<Link href="/famage/add-expense">+ Add Expense</Link>
				</Button>
			</div>
		</section>
	);
}
