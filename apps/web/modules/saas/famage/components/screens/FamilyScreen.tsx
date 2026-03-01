"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "@saas/auth/hooks/use-session";
import {
	formatCurrency,
	getInitials,
	getTransactionCategoryLabel,
} from "@saas/famage/lib/mock-data";
import { orpc } from "@shared/lib/orpc-query-utils";
import {
	skipToken,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { Input } from "@ui/components/input";
import { cn } from "@ui/lib";
import { ArrowRightIcon, HouseIcon, PlusIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const avatarClasses = [
	"bg-amber-100 text-amber-700",
	"bg-sky-100 text-sky-700",
	"bg-emerald-100 text-emerald-700",
	"bg-rose-100 text-rose-700",
	"bg-violet-100 text-violet-700",
	"bg-orange-100 text-orange-700",
] as const;

const budgetSegmentClasses = [
	"bg-amber-500",
	"bg-sky-500",
	"bg-emerald-500",
	"bg-rose-500",
	"bg-violet-500",
	"bg-orange-500",
] as const;

const familyFormSchema = z.object({
	name: z.string().trim().min(2, "Enter your family name"),
	monthlyBudget: z
		.string()
		.trim()
		.refine((value) => value === "" || /^\d+$/.test(value), {
			message: "Monthly budget must be a whole number",
		}),
});

type FamilyFormValues = z.infer<typeof familyFormSchema>;

interface BudgetSegment {
	userId: string;
	name: string;
	monthlySpend: number;
	percentOfReference: number;
	barWidthPercent: number;
	barClassName: string;
}

interface ExpenseDetail {
	id: string;
	amount: number;
	category: string;
	notes: string | null;
	expenseDate: string | Date;
	createdAt: string | Date;
	visibility: "personal" | "shared";
	type: "expense" | "income";
}

export function FamilyScreen() {
	const { user, loaded } = useSession();
	const queryClient = useQueryClient();
	const [selectedMemberUserId, setSelectedMemberUserId] = useState<
		string | null
	>(null);
	const [selectedPeriod, setSelectedPeriod] = useState<
		"daily" | "weekly" | "monthly"
	>("monthly");
	const [selectedExpenseDetail, setSelectedExpenseDetail] =
		useState<ExpenseDetail | null>(null);

	const familyOverviewQuery = useQuery(
		user
			? {
					...orpc.family.overview.queryOptions(),
					enabled: true,
				}
			: {
					queryKey: ["family", "overview", "guest"],
					queryFn: async () => ({ family: null }),
					enabled: false,
				},
	);

	const family = familyOverviewQuery.data?.family ?? null;

	const createFamilyForm = useForm<FamilyFormValues>({
		resolver: zodResolver(familyFormSchema),
		defaultValues: {
			name: "",
			monthlyBudget: "",
		},
	});

	const createFamilyMutation = useMutation({
		...orpc.family.create.mutationOptions(),
		onSuccess: async () => {
			createFamilyForm.reset();
			await queryClient.invalidateQueries({
				queryKey: orpc.family.overview.queryKey(),
			});
			toast.success("Family created");
		},
		onError: (error) => {
			createFamilyForm.setError("root", {
				message: error.message,
			});
		},
	});

	useEffect(() => {
		if (!family?.members.length) {
			setSelectedMemberUserId(null);
			return;
		}

		setSelectedMemberUserId((currentValue) => {
			if (
				currentValue &&
				family.members.some((member) => member.userId === currentValue)
			) {
				return currentValue;
			}

			return family.members[0]?.userId ?? null;
		});
	}, [family?.members]);

	const memberExpensesQuery = useQuery(
		orpc.family.memberExpenses.queryOptions({
			input:
				selectedMemberUserId && family
					? {
							memberUserId: selectedMemberUserId,
							period: selectedPeriod,
						}
					: skipToken,
		}),
	);

	const budgetUsagePercent = useMemo(() => {
		if (!family?.monthlyBudget || family.monthlyBudget <= 0) {
			return null;
		}

		return Math.min(
			100,
			Math.round((family.totalMonthlySpend / family.monthlyBudget) * 100),
		);
	}, [family?.monthlyBudget, family?.totalMonthlySpend]);

	const budgetSegments = useMemo(() => {
		if (!family?.members.length) {
			return [] as BudgetSegment[];
		}

		const hasBudget =
			typeof family.monthlyBudget === "number" &&
			family.monthlyBudget > 0;
		const denominator = hasBudget
			? (family.monthlyBudget ?? 0)
			: Math.max(family.totalMonthlySpend, 1);
		let accumulatedWidth = 0;

		return family.members
			.map((member, index) => {
				const percentOfReference =
					(member.monthlySpend / Math.max(denominator, 1)) * 100;
				const barWidthPercent = hasBudget
					? Math.max(
							0,
							Math.min(
								percentOfReference,
								100 - accumulatedWidth,
							),
						)
					: Math.max(percentOfReference, 0);

				accumulatedWidth += barWidthPercent;

				return {
					userId: member.userId,
					name: member.name,
					monthlySpend: member.monthlySpend,
					percentOfReference,
					barWidthPercent,
					barClassName:
						budgetSegmentClasses[
							index % budgetSegmentClasses.length
						],
				};
			})
			.filter(
				(segment) =>
					segment.percentOfReference > 0 || segment.monthlySpend > 0,
			);
	}, [family]);

	const budgetOverflowAmount = useMemo(() => {
		if (!family?.monthlyBudget || family.monthlyBudget <= 0) {
			return 0;
		}

		return Math.max(family.totalMonthlySpend - family.monthlyBudget, 0);
	}, [family?.monthlyBudget, family?.totalMonthlySpend]);

	const onSubmitCreateFamily = createFamilyForm.handleSubmit((values) => {
		createFamilyMutation.mutate({
			name: values.name,
			monthlyBudget:
				values.monthlyBudget === ""
					? undefined
					: Number.parseInt(values.monthlyBudget, 10),
		});
	});

	if (loaded && !user) {
		return (
			<section className="space-y-5">
				<header className="space-y-1">
					<p className="font-medium text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
						Family
					</p>
					<h1 className="font-semibold text-2xl tracking-tight">
						Shared space
					</h1>
				</header>

				<Card className="border-dashed bg-card/70">
					<CardContent className="space-y-3 p-4 text-center">
						<p className="font-medium text-sm">
							Sign in to manage your family
						</p>
						<Button
							asChild
							variant="outline"
							className="h-10 rounded-xl"
						>
							<Link href="/famage/auth/login?redirectTo=/famage/family">
								Sign in
							</Link>
						</Button>
					</CardContent>
				</Card>
			</section>
		);
	}

	if (user && familyOverviewQuery.isLoading) {
		return (
			<section className="space-y-5">
				<header className="space-y-1">
					<p className="font-medium text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
						Family
					</p>
					<h1 className="font-semibold text-2xl tracking-tight">
						Shared space
					</h1>
				</header>

				<Card>
					<CardContent className="p-4 text-center text-sm text-muted-foreground">
						Loading family details...
					</CardContent>
				</Card>
			</section>
		);
	}

	if (user && !family) {
		return (
			<section className="space-y-5">
				<header className="space-y-1">
					<p className="font-medium text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
						Family setup
					</p>
					<h1 className="font-semibold text-2xl tracking-tight">
						Create your family group
					</h1>
				</header>

				<Card>
					<CardContent className="p-4">
						<form
							className="space-y-4"
							onSubmit={onSubmitCreateFamily}
						>
							<div className="space-y-1">
								<label
									htmlFor="family-name"
									className="font-medium text-xs"
								>
									Family name
								</label>
								<Input
									id="family-name"
									type="text"
									placeholder="Ex: The Sharma Family"
									{...createFamilyForm.register("name")}
								/>
								{createFamilyForm.formState.errors.name ? (
									<p className="text-destructive text-xs">
										{
											createFamilyForm.formState.errors
												.name.message
										}
									</p>
								) : null}
							</div>

							<div className="space-y-1">
								<label
									htmlFor="monthly-budget"
									className="font-medium text-xs"
								>
									Monthly budget (optional)
								</label>
								<Input
									id="monthly-budget"
									inputMode="numeric"
									placeholder="Ex: 50000"
									{...createFamilyForm.register(
										"monthlyBudget",
									)}
								/>
								{createFamilyForm.formState.errors
									.monthlyBudget ? (
									<p className="text-destructive text-xs">
										{
											createFamilyForm.formState.errors
												.monthlyBudget.message
										}
									</p>
								) : null}
							</div>

							{createFamilyForm.formState.errors.root?.message ? (
								<p className="text-destructive text-xs">
									{
										createFamilyForm.formState.errors.root
											.message
									}
								</p>
							) : null}

							<Button
								type="submit"
								className="w-full"
								loading={createFamilyMutation.isPending}
							>
								Create family
							</Button>
						</form>
					</CardContent>
				</Card>
			</section>
		);
	}

	return (
		<section className="space-y-5">
			<header className="space-y-1">
				<p className="font-medium text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
					Family
				</p>
				<h1 className="font-semibold text-2xl tracking-tight">
					Shared space
				</h1>
			</header>

			<Card className="border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card">
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-2">
							<span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
								<HouseIcon className="size-4" />
							</span>
							<div>
								<CardTitle className="text-lg">
									{family?.name}
								</CardTitle>
								<CardDescription>
									{family?.members.length ?? 0} members
									connected
								</CardDescription>
							</div>
						</div>
						{family?.canManageInvites ? (
							<Button
								type="button"
								size="icon"
								variant="outline"
								className="size-8 rounded-full border-primary/40 bg-card/80"
								asChild
							>
								<Link href="/famage/family/settings?focus=add-member">
									<PlusIcon className="size-4" />
									<span className="sr-only">
										Invite family member
									</span>
								</Link>
							</Button>
						) : null}
					</div>
				</CardHeader>

				<CardContent className="space-y-3 pt-0">
					<div className="rounded-2xl bg-card/80 p-3">
						<p className="text-[11px] text-muted-foreground">
							Monthly family spend
						</p>
						<p className="mt-1 font-semibold text-lg">
							{formatCurrency(family?.totalMonthlySpend ?? 0)}
						</p>
						{typeof family?.monthlyBudget === "number" ? (
							<p className="mt-1 text-muted-foreground text-xs">
								Budget: {formatCurrency(family.monthlyBudget)}
							</p>
						) : null}
					</div>

					{budgetUsagePercent !== null ? (
						<div className="space-y-2">
							<div className="flex items-center justify-between text-xs">
								<span className="text-muted-foreground">
									Budget usage
								</span>
								<span className="font-semibold">
									{budgetUsagePercent}%
								</span>
							</div>
							<div className="h-6 overflow-hidden rounded-full bg-primary/15">
								<div className="flex h-full">
									{budgetSegments.map((segment) => (
										<div
											key={segment.userId}
											className={cn(
												"flex h-full items-center justify-center text-[10px] font-semibold text-white",
												segment.barClassName,
											)}
											style={{
												width: `${segment.barWidthPercent}%`,
											}}
											title={`${segment.name}: ${Math.round(segment.percentOfReference)}%`}
										>
											{segment.barWidthPercent >= 12
												? `${Math.round(segment.percentOfReference)}%`
												: null}
										</div>
									))}
								</div>
							</div>

							<div className="space-y-1">
								{budgetSegments.map((segment) => (
									<div
										key={segment.userId}
										className="flex items-center justify-between text-xs"
									>
										<div className="flex items-center gap-2">
											<span
												className={cn(
													"inline-block size-2.5 rounded-full",
													segment.barClassName,
												)}
											/>
											<span className="text-muted-foreground">
												{segment.name}
											</span>
										</div>
										<span className="font-medium">
											{formatCurrency(
												segment.monthlySpend,
											)}{" "}
											(
											{Math.round(
												segment.percentOfReference,
											)}
											%)
										</span>
									</div>
								))}
							</div>

							{budgetOverflowAmount > 0 ? (
								<p className="text-destructive text-xs">
									Over budget by{" "}
									{formatCurrency(budgetOverflowAmount)}.
								</p>
							) : null}
						</div>
					) : null}
				</CardContent>
			</Card>

			{family?.pendingInvitations.length ? (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							Pending invitations
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 pt-0">
						{family.pendingInvitations.map((invitation) => (
							<div
								key={invitation.id}
								className="rounded-xl border bg-card px-3 py-2"
							>
								<p className="font-medium text-sm">
									{invitation.email}
								</p>
								<p className="text-muted-foreground text-xs">
									Expires on{" "}
									{new Date(
										invitation.expiresAt,
									).toLocaleDateString("en-IN")}
								</p>
							</div>
						))}
					</CardContent>
				</Card>
			) : null}

			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<UsersIcon className="size-4 text-primary" />
					<h2 className="font-semibold text-base">Members</h2>
				</div>

				<ul className="space-y-2">
					{family?.members.map((member, index) => (
						<li key={member.userId}>
							<button
								type="button"
								onClick={() =>
									setSelectedMemberUserId(member.userId)
								}
								className={cn(
									"flex w-full items-center justify-between rounded-2xl border bg-card px-3 py-2 text-left",
									selectedMemberUserId === member.userId &&
										"border-primary/40 bg-primary/5",
								)}
							>
								<div className="flex items-center gap-2">
									<Avatar className="size-9 rounded-full">
										<AvatarFallback
											className={cn(
												"rounded-full font-semibold text-[11px]",
												avatarClasses[
													index % avatarClasses.length
												],
											)}
										>
											{getInitials(member.name)}
										</AvatarFallback>
									</Avatar>
									<div>
										<p className="font-medium text-sm">
											{member.userId === user?.id
												? "You"
												: member.name}
										</p>
										<p className="text-muted-foreground text-xs">
											{member.role}
										</p>
									</div>
								</div>

								<p className="font-semibold text-sm">
									{formatCurrency(member.monthlySpend)}
								</p>
							</button>
						</li>
					))}
				</ul>
			</div>

			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<h2 className="font-semibold text-base">
						Member expense details
					</h2>
					<Badge className="font-medium normal-case" status="info">
						{selectedPeriod}
					</Badge>
				</div>

				<div className="grid grid-cols-3 gap-2">
					{(["daily", "weekly", "monthly"] as const).map((period) => (
						<Button
							key={period}
							type="button"
							variant={
								selectedPeriod === period
									? "primary"
									: "outline"
							}
							className="h-9"
							onClick={() => setSelectedPeriod(period)}
						>
							{period}
						</Button>
					))}
				</div>

				{memberExpensesQuery.isLoading ? (
					<Card>
						<CardContent className="p-4 text-center text-sm text-muted-foreground">
							Loading member expenses...
						</CardContent>
					</Card>
				) : memberExpensesQuery.data ? (
					<div className="space-y-2">
						<Card>
							<CardContent className="grid grid-cols-3 gap-2 p-3">
								<div>
									<p className="text-[11px] text-muted-foreground">
										Expenses
									</p>
									<p className="font-semibold text-sm">
										{formatCurrency(
											memberExpensesQuery.data.summary
												.totalExpenses,
										)}
									</p>
								</div>
								<div>
									<p className="text-[11px] text-muted-foreground">
										Income
									</p>
									<p className="font-semibold text-sm">
										{formatCurrency(
											memberExpensesQuery.data.summary
												.totalIncome,
										)}
									</p>
								</div>
								<div>
									<p className="text-[11px] text-muted-foreground">
										Balance
									</p>
									<p className="font-semibold text-sm">
										{formatCurrency(
											memberExpensesQuery.data.summary
												.balance,
										)}
									</p>
								</div>
							</CardContent>
						</Card>

						{memberExpensesQuery.data.trend.length ? (
							<Card>
								<CardContent className="space-y-2 p-3">
									<p className="font-medium text-sm">Trend</p>
									<div className="flex items-end gap-2">
										{memberExpensesQuery.data.trend.map(
											(bucket) => {
												const maxAmount = Math.max(
													1,
													...memberExpensesQuery.data.trend.map(
														(item) =>
															item.totalAmount,
													),
												);
												const heightPercent = Math.max(
													8,
													Math.round(
														(bucket.totalAmount /
															maxAmount) *
															100,
													),
												);

												return (
													<div
														key={bucket.label}
														className="flex-1 space-y-1"
													>
														<div className="h-16 rounded bg-primary/15">
															<div
																className="h-full rounded bg-primary"
																style={{
																	height: `${heightPercent}%`,
																	marginTop: `${100 - heightPercent}%`,
																}}
															/>
														</div>
														<p className="text-center text-[10px] text-muted-foreground">
															{bucket.label}
														</p>
													</div>
												);
											},
										)}
									</div>
								</CardContent>
							</Card>
						) : null}

						{memberExpensesQuery.data.expenses.length ? (
							<ul className="space-y-2">
								{memberExpensesQuery.data.expenses
									.slice(0, 8)
									.map((expense) => (
										<li key={expense.id}>
											<button
												type="button"
												onClick={() =>
													setSelectedExpenseDetail(
														expense,
													)
												}
												className="w-full rounded-2xl border bg-card p-3 text-left"
											>
												<div className="flex items-center justify-between">
													<p className="font-medium text-sm">
														{getTransactionCategoryLabel(
															expense.category,
														)}
													</p>
													<p className="font-semibold text-sm">
														{formatCurrency(
															expense.amount,
														)}
													</p>
												</div>
												<p className="mt-1 text-muted-foreground text-xs">
													{new Date(
														expense.expenseDate,
													).toLocaleDateString(
														"en-IN",
														{
															month: "short",
															day: "numeric",
														},
													)}
													{expense.visibility ===
													"shared"
														? " • Shared"
														: " • Personal"}
												</p>
											</button>
										</li>
									))}
							</ul>
						) : (
							<Card className="border-dashed">
								<CardContent className="p-4 text-center text-sm text-muted-foreground">
									No transactions found for this period.
								</CardContent>
							</Card>
						)}
					</div>
				) : (
					<Card className="border-dashed">
						<CardContent className="p-4 text-center text-sm text-muted-foreground">
							Select a member to view details.
						</CardContent>
					</Card>
				)}
			</div>

			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<h2 className="font-semibold text-base">Shared expenses</h2>
				</div>

				{family?.sharedExpenses.length ? (
					<ul className="space-y-2">
						{family.sharedExpenses.map((expense) => (
							<li
								key={expense.id}
								className="rounded-2xl border bg-card p-3"
							>
								<div className="flex items-center justify-between">
									<p className="font-medium text-sm">
										{getTransactionCategoryLabel(
											expense.category,
										)}
									</p>
									<p className="font-semibold text-sm">
										{formatCurrency(expense.amount)}
									</p>
								</div>
								<p className="mt-1 text-muted-foreground text-xs">
									{new Date(
										expense.expenseDate,
									).toLocaleDateString("en-IN", {
										month: "short",
										day: "numeric",
									})}
									• Shared
								</p>
								{expense.settlements?.length ? (
									<ul className="mt-2 space-y-1.5">
										{expense.settlements.map(
											(settlement) => (
												<li
													key={settlement.id}
													className="flex items-center justify-between rounded-lg bg-muted/60 px-2.5 py-2 text-xs"
												>
													<div className="flex items-center gap-1">
														<span className="font-medium">
															{settlement.fromUserId ===
															user?.id
																? "You"
																: settlement.fromUserName}
														</span>
														<ArrowRightIcon className="size-3 text-muted-foreground" />
														<span className="font-medium">
															{settlement.toUserId ===
															user?.id
																? "You"
																: settlement.toUserName}
														</span>
													</div>
													<span className="font-semibold">
														{formatCurrency(
															settlement.amount,
														)}
													</span>
												</li>
											),
										)}
									</ul>
								) : null}
							</li>
						))}
					</ul>
				) : (
					<Card className="border-dashed">
						<CardContent className="p-4 text-center">
							<p className="font-medium text-sm">
								No shared expenses yet
							</p>
							<p className="mt-1 text-muted-foreground text-xs">
								Shared entries will appear here after they are
								added.
							</p>
						</CardContent>
					</Card>
				)}
			</div>

			<Dialog
				open={Boolean(selectedExpenseDetail)}
				onOpenChange={(open) => {
					if (!open) {
						setSelectedExpenseDetail(null);
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Expense details</DialogTitle>
						<DialogDescription>
							View full information for this transaction.
						</DialogDescription>
					</DialogHeader>

					{selectedExpenseDetail ? (
						<div className="space-y-3">
							<div className="rounded-xl border bg-card px-3 py-2">
								<p className="text-[11px] text-muted-foreground">
									Amount
								</p>
								<p className="font-semibold text-base">
									{formatCurrency(
										selectedExpenseDetail.amount,
									)}
								</p>
							</div>

							<div className="grid grid-cols-2 gap-2 text-xs">
								<div className="rounded-xl border bg-card px-3 py-2">
									<p className="text-muted-foreground">
										Category
									</p>
									<p className="mt-1 font-medium">
										{getTransactionCategoryLabel(
											selectedExpenseDetail.category,
										)}
									</p>
								</div>
								<div className="rounded-xl border bg-card px-3 py-2">
									<p className="text-muted-foreground">
										Visibility
									</p>
									<p className="mt-1 font-medium capitalize">
										{selectedExpenseDetail.visibility}
									</p>
								</div>
								<div className="rounded-xl border bg-card px-3 py-2">
									<p className="text-muted-foreground">
										Expense date
									</p>
									<p className="mt-1 font-medium">
										{new Date(
											selectedExpenseDetail.expenseDate,
										).toLocaleDateString("en-IN", {
											year: "numeric",
											month: "short",
											day: "numeric",
										})}
									</p>
								</div>
								<div className="rounded-xl border bg-card px-3 py-2">
									<p className="text-muted-foreground">
										Added on
									</p>
									<p className="mt-1 font-medium">
										{new Date(
											selectedExpenseDetail.createdAt,
										).toLocaleString("en-IN", {
											year: "numeric",
											month: "short",
											day: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</p>
								</div>
							</div>

							<div className="rounded-xl border bg-card px-3 py-2">
								<p className="text-[11px] text-muted-foreground">
									Description
								</p>
								<p className="mt-1 text-sm">
									{selectedExpenseDetail.notes?.trim()
										? selectedExpenseDetail.notes
										: "No description added"}
								</p>
							</div>
						</div>
					) : null}
				</DialogContent>
			</Dialog>
		</section>
	);
}
