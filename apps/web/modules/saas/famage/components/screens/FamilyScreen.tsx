"use client";

import { EXPENSE_PERIOD } from "@repo/api/modules/expenses/types";
import { useSession } from "@saas/auth/hooks/use-session";
import {
	familyMembers,
	formatCurrency,
	getInitials,
	getTransactionCategoryLabel,
	sharedExpensesPreview,
} from "@saas/famage/lib/mock-data";
import { orpc } from "@shared/lib/orpc-query-utils";
import { skipToken, useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@ui/components/avatar";
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
import { HouseIcon, UsersIcon } from "lucide-react";
import Link from "next/link";

const totalFamilySpend = familyMembers.reduce(
	(total, member) => total + member.monthlySpend,
	0,
);

export function FamilyScreen() {
	const { user, loaded } = useSession();

	const expensesQuery = useQuery(
		orpc.expenses.list.queryOptions({
			input: user
				? {
						period: EXPENSE_PERIOD.monthly,
					}
				: skipToken,
		}),
	);

	const sharedExpenses = user
		? (expensesQuery.data?.expenses ?? [])
				.filter((expense) => expense.visibility === "shared")
				.slice(0, 5)
		: sharedExpensesPreview;

	const monthlySpend = user
		? expensesQuery.data?.summary.totalExpenses ?? 0
		: totalFamilySpend;

	return (
		<section className="space-y-5">
			<header className="space-y-1">
				<p className="font-medium text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
					Family
				</p>
				<h1 className="font-semibold text-2xl tracking-tight">Shared space</h1>
			</header>

			<Card className="border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card">
				<CardHeader className="pb-3">
					<div className="flex items-center gap-2">
						<span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
							<HouseIcon className="size-4" />
						</span>
						<div>
							<CardTitle className="text-lg">The Kumar Family</CardTitle>
							<CardDescription>
								4 members connected this month
							</CardDescription>
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-3 pt-0">
					<div className="rounded-2xl bg-card/80 p-3">
						<p className="text-[11px] text-muted-foreground">
							{user ? "Your monthly spend" : "Monthly family spend"}
						</p>
						<p className="mt-1 font-semibold text-lg">
							{formatCurrency(monthlySpend)}
						</p>
					</div>

					<div className="space-y-2">
						<div className="flex items-center justify-between text-xs">
							<span className="text-muted-foreground">Shared budget health</span>
							<span className="font-semibold">68%</span>
						</div>
						<div className="h-2 rounded-full bg-primary/20">
							<div className="h-2 w-[68%] rounded-full bg-primary" />
						</div>
					</div>
				</CardContent>
			</Card>

			{loaded && !user ? (
				<Card className="border-dashed bg-card/70">
					<CardContent className="space-y-3 p-4 text-center">
						<p className="font-medium text-sm">Sign in to track shared expenses</p>
						<Button asChild variant="outline" className="h-10 rounded-xl">
							<Link href="/famage/auth/login?redirectTo=/famage/family">
								Sign in
							</Link>
						</Button>
					</CardContent>
				</Card>
			) : null}

			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<UsersIcon className="size-4 text-primary" />
					<h2 className="font-semibold text-base">Members</h2>
				</div>

				<ul className="space-y-2">
					{familyMembers.map((member) => (
						<li
							key={member.id}
							className="flex items-center justify-between rounded-2xl border bg-card px-3 py-2"
						>
							<div className="flex items-center gap-2">
								<Avatar className="size-9 rounded-full">
									<AvatarFallback
										className={cn(
											"rounded-full font-semibold text-[11px]",
											member.avatarClassName,
										)}
									>
										{getInitials(member.name)}
									</AvatarFallback>
								</Avatar>
								<div>
									<p className="font-medium text-sm">{member.name}</p>
									<p className="text-muted-foreground text-xs">Monthly spend</p>
								</div>
							</div>

							<p className="font-semibold text-sm">
								{formatCurrency(member.monthlySpend)}
							</p>
						</li>
					))}
				</ul>
			</div>

			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<h2 className="font-semibold text-base">Shared expenses</h2>
					<Badge className="font-medium normal-case" status="info">
						Preview
					</Badge>
				</div>

				{expensesQuery.isPending ? (
					<Card>
						<CardContent className="p-4 text-center text-sm text-muted-foreground">
							Loading shared expenses...
						</CardContent>
					</Card>
				) : sharedExpenses.length > 0 ? (
					<ul className="space-y-2">
						{sharedExpenses.map((expense) => (
							<li
								key={expense.id}
								className="rounded-2xl border bg-card p-3"
							>
								<div className="flex items-center justify-between">
									<p className="font-medium text-sm">
										{"title" in expense
											? expense.title
											: getTransactionCategoryLabel(expense.category)}
									</p>
									<p className="font-semibold text-sm">
										{formatCurrency(
											"totalAmount" in expense
												? expense.totalAmount
												: expense.amount,
										)}
									</p>
								</div>
								<p className="mt-1 text-muted-foreground text-xs">
									{"dateLabel" in expense
										? expense.dateLabel
										: new Date(expense.expenseDate).toLocaleDateString("en-IN", {
												month: "short",
												day: "numeric",
										  })}
									{user ? " • Shared" : " • Split preview"}
								</p>
							</li>
						))}
					</ul>
				) : (
					<Card className="border-dashed">
						<CardContent className="p-4 text-center">
							<p className="font-medium text-sm">No shared expenses yet</p>
							<p className="mt-1 text-muted-foreground text-xs">
								Shared entries will appear here after they are added.
							</p>
						</CardContent>
					</Card>
				)}
			</div>

			<Card className="border-dashed bg-card/70">
				<CardContent className="p-4 text-center">
					<p className="font-medium text-sm">No pending settlements</p>
					<p className="mt-1 text-muted-foreground text-xs">
						Everyone is currently balanced for this cycle.
					</p>
				</CardContent>
			</Card>
		</section>
	);
}
