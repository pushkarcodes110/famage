"use client";

import {
	EXPENSE_TYPE,
	type ExpenseTypeValue,
	SHARED_SPLIT_MODE,
} from "@repo/api/modules/expenses/types";
import { useSession } from "@saas/auth/hooks/use-session";
import {
	EXPENSE_CATEGORY,
	EXPENSE_VISIBILITY,
	type ExpenseVisibility,
	expenseCategories,
	formatCurrency,
	getInitials,
	INCOME_SOURCE,
	incomeSources,
	type TransactionCategoryKey,
} from "@saas/famage/lib/mock-data";
import { orpc } from "@shared/lib/orpc-query-utils";
import {
	skipToken,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@ui/components/avatar";
import { Button } from "@ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@ui/components/card";
import { Input } from "@ui/components/input";
import { Textarea } from "@ui/components/textarea";
import { cn } from "@ui/lib";
import type { LucideIcon } from "lucide-react";
import {
	ArrowDownCircleIcon,
	ArrowRightIcon,
	ArrowUpCircleIcon,
	BadgeDollarSignIcon,
	BookOpenIcon,
	BriefcaseBusinessIcon,
	BusIcon,
	CheckCircle2Icon,
	CircleIcon,
	CoinsIcon,
	GiftIcon,
	HeartPulseIcon,
	ReceiptTextIcon,
	RotateCcwIcon,
	ShoppingBasketIcon,
	TvIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { withQuery } from "ufo";

const visibilityOptions = [
	{
		label: "Personal",
		value: EXPENSE_VISIBILITY.personal,
	},
	{
		label: "Shared (Family)",
		value: EXPENSE_VISIBILITY.shared,
	},
];

const entryTypeOptions: Array<{
	label: string;
	value: ExpenseTypeValue;
}> = [
	{
		label: "Expense",
		value: EXPENSE_TYPE.expense,
	},
	{
		label: "Credit",
		value: EXPENSE_TYPE.income,
	},
];

function getEntryTypeFromQuery(value: string | null): ExpenseTypeValue {
	return value === EXPENSE_TYPE.income
		? EXPENSE_TYPE.income
		: EXPENSE_TYPE.expense;
}

const categoryIcons: Record<TransactionCategoryKey, LucideIcon> = {
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

const EMPTY_FAMILY_MEMBERS: Array<{ userId: string; name: string }> = [];

export function AddExpenseScreen() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const queryClient = useQueryClient();
	const { user, loaded } = useSession();

	const expenseId = searchParams.get("expenseId");
	const requestedType = searchParams.get("type");
	const isEditing = Boolean(expenseId);

	const [amount, setAmount] = useState("128");
	const [entryType, setEntryType] = useState<ExpenseTypeValue>(() =>
		getEntryTypeFromQuery(requestedType),
	);
	const [selectedCategory, setSelectedCategory] =
		useState<TransactionCategoryKey>(EXPENSE_CATEGORY.groceries);
	const [notes, setNotes] = useState(
		"Weekend groceries and household essentials.",
	);
	const [selectedDate, setSelectedDate] = useState(
		new Date().toISOString().slice(0, 10),
	);
	const [visibility, setVisibility] = useState<ExpenseVisibility>(
		EXPENSE_VISIBILITY.personal,
	);
	const [sharedPaidByUserId, setSharedPaidByUserId] = useState<string | null>(
		null,
	);
	const [selectedSharedMemberUserIds, setSelectedSharedMemberUserIds] =
		useState<string[]>([]);

	const expenseQuery = useQuery(
		orpc.expenses.find.queryOptions({
			input:
				user && expenseId
					? {
							id: expenseId,
						}
					: skipToken,
		}),
	);
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

	const createExpenseMutation = useMutation(
		orpc.expenses.create.mutationOptions(),
	);
	const updateExpenseMutation = useMutation(
		orpc.expenses.update.mutationOptions(),
	);

	const isShared = visibility === EXPENSE_VISIBILITY.shared;
	const isIncome = entryType === EXPENSE_TYPE.income;
	const ModeIcon = isIncome ? ArrowUpCircleIcon : ArrowDownCircleIcon;
	const categoryOptions = isIncome ? incomeSources : expenseCategories;
	const parsedAmount = Number(amount);
	const isSaving =
		createExpenseMutation.isPending || updateExpenseMutation.isPending;
	const isEditingExpenseLoading = isEditing && expenseQuery.isPending;
	const family = familyOverviewQuery.data?.family ?? null;
	const familyMemberOptions = useMemo(
		() => family?.members ?? EMPTY_FAMILY_MEMBERS,
		[family?.members],
	);
	const familyMemberNameByUserId = useMemo(
		() =>
			new Map(
				familyMemberOptions.map((member) => [
					member.userId,
					member.name,
				]),
			),
		[familyMemberOptions],
	);

	const sharedPreviewRows = useMemo(() => {
		if (
			!isShared ||
			!sharedPaidByUserId ||
			selectedSharedMemberUserIds.length === 0 ||
			!Number.isInteger(parsedAmount) ||
			parsedAmount <= 0
		) {
			return [];
		}

		const baseAmount = Math.floor(
			parsedAmount / selectedSharedMemberUserIds.length,
		);
		const remainder = parsedAmount % selectedSharedMemberUserIds.length;
		const participantAmounts = selectedSharedMemberUserIds.map(
			(userId, index) => ({
				userId,
				owedAmount: baseAmount + (index < remainder ? 1 : 0),
			}),
		);

		return participantAmounts
			.filter(
				(participantAmount) =>
					participantAmount.userId !== sharedPaidByUserId &&
					participantAmount.owedAmount > 0,
			)
			.map((participantAmount) => ({
				fromLabel:
					familyMemberNameByUserId.get(participantAmount.userId) ??
					participantAmount.userId,
				toLabel:
					familyMemberNameByUserId.get(sharedPaidByUserId) ??
					sharedPaidByUserId,
				amount: participantAmount.owedAmount,
			}));
	}, [
		familyMemberNameByUserId,
		isShared,
		parsedAmount,
		selectedSharedMemberUserIds,
		sharedPaidByUserId,
	]);
	const modeAuraClass = isIncome
		? "from-success/30 via-success/10 to-transparent"
		: "from-destructive/30 via-destructive/10 to-transparent";
	const modeHighlightCardClass = isIncome
		? "border-success/30 bg-gradient-to-br from-success/15 via-card to-card"
		: "border-destructive/30 bg-gradient-to-br from-destructive/15 via-card to-card";
	const modeSecondaryCardClass = isIncome
		? "border-success/20 bg-success/5"
		: "border-destructive/20 bg-destructive/5";
	const modeSelectedCategoryClass = isIncome
		? "border-success/40 bg-success/10"
		: "border-destructive/40 bg-destructive/10";
	const modeSelectedIconClass = isIncome
		? "text-success"
		: "text-destructive";
	const modeSubmitButtonClass = isIncome
		? "bg-success text-white hover:bg-success/90"
		: "bg-destructive text-white hover:bg-destructive/90";

	useEffect(() => {
		if (isEditing) {
			return;
		}

		setEntryType(getEntryTypeFromQuery(requestedType));
	}, [requestedType, isEditing]);

	useEffect(() => {
		if (isIncome) {
			if (
				!incomeSources.some((source) => source.key === selectedCategory)
			) {
				setSelectedCategory(INCOME_SOURCE.salary);
			}
			setVisibility(EXPENSE_VISIBILITY.personal);
			return;
		}

		if (
			!expenseCategories.some(
				(category) => category.key === selectedCategory,
			)
		) {
			setSelectedCategory(EXPENSE_CATEGORY.groceries);
		}
	}, [isIncome, selectedCategory]);

	useEffect(() => {
		if (!expenseQuery.data?.expense) {
			return;
		}

		const expense = expenseQuery.data.expense;
		setEntryType(expense.type);
		setAmount(String(expense.amount));
		setSelectedCategory(expense.category as TransactionCategoryKey);
		setNotes(expense.notes ?? "");
		setVisibility(expense.visibility as ExpenseVisibility);
		setSelectedDate(
			new Date(expense.expenseDate).toISOString().slice(0, 10),
		);
		if (expense.sharedDetails) {
			setSharedPaidByUserId(expense.sharedDetails.paidByUserId);
			setSelectedSharedMemberUserIds(
				expense.sharedDetails.participants.map(
					(participant: { userId: string }) => participant.userId,
				),
			);
		}
	}, [expenseQuery.data?.expense]);

	useEffect(() => {
		if (!familyMemberOptions.length) {
			setSelectedSharedMemberUserIds((currentValue) =>
				currentValue.length ? [] : currentValue,
			);
			setSharedPaidByUserId((currentValue) =>
				currentValue === null ? currentValue : null,
			);
			return;
		}

		setSelectedSharedMemberUserIds((currentValue) => {
			const validCurrentMembers = currentValue.filter((memberId) =>
				familyMemberOptions.some(
					(member) => member.userId === memberId,
				),
			);

			if (validCurrentMembers.length > 0) {
				return validCurrentMembers;
			}

			return familyMemberOptions.map((member) => member.userId);
		});

		setSharedPaidByUserId((currentValue) => {
			if (
				currentValue &&
				familyMemberOptions.some(
					(member) => member.userId === currentValue,
				)
			) {
				return currentValue;
			}

			if (
				user?.id &&
				familyMemberOptions.some((member) => member.userId === user.id)
			) {
				return user.id;
			}

			return familyMemberOptions[0]?.userId ?? null;
		});
	}, [familyMemberOptions, user?.id]);

	const redirectToLoginHref = useMemo(() => {
		const currentPath = withQuery("/famage/add-expense", {
			...(expenseId ? { expenseId } : {}),
			...(entryType === EXPENSE_TYPE.income
				? { type: EXPENSE_TYPE.income }
				: {}),
		});
		return withQuery("/famage/auth/login", {
			redirectTo: currentPath,
		});
	}, [expenseId, entryType]);

	async function handleSaveExpense(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!user) {
			router.push(redirectToLoginHref);
			return;
		}

		if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
			toast.error("Enter a valid amount");
			return;
		}

		const payload = {
			amount: parsedAmount,
			category: selectedCategory,
			notes: notes.trim() || undefined,
			expenseDate: new Date(
				`${selectedDate}T12:00:00.000Z`,
			).toISOString(),
			visibility: isIncome ? EXPENSE_VISIBILITY.personal : visibility,
			type: entryType,
			sharedDetails:
				!isIncome && isShared
					? {
							paidByUserId: sharedPaidByUserId ?? user.id,
							splitMode: SHARED_SPLIT_MODE.equal,
							excludePayer: false,
							participants: selectedSharedMemberUserIds.map(
								(userId) => ({
									userId,
								}),
							),
						}
					: undefined,
		} as const;

		if (isShared && payload.sharedDetails?.participants.length === 0) {
			toast.error("Select at least one family member for shared split");
			return;
		}

		try {
			if (isEditing && expenseId) {
				await updateExpenseMutation.mutateAsync({
					id: expenseId,
					...payload,
				});
				toast.success(isIncome ? "Credit updated" : "Expense updated");
			} else {
				await createExpenseMutation.mutateAsync(payload);
				toast.success(isIncome ? "Credit saved" : "Expense saved");
			}

			await queryClient.invalidateQueries();
			router.push("/famage");
		} catch (error) {
			if (typeof error === "object" && error !== null) {
				const message =
					"message" in error && typeof error.message === "string"
						? error.message
						: undefined;
				const code =
					"code" in error && typeof error.code === "string"
						? error.code
						: undefined;

				if (message) {
					toast.error(code ? `${message} (${code})` : message);
					return;
				}
			}

			toast.error("Failed to save expense");
		}
	}

	return (
		<section className="relative isolate space-y-5 overflow-hidden">
			<div
				className={cn(
					"pointer-events-none absolute inset-x-0 -top-8 h-44 rounded-3xl bg-gradient-to-b blur-2xl transition-colors duration-300",
					modeAuraClass,
				)}
			/>

			<header className="space-y-1">
				<p className="font-medium text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
					{isEditing ? "Edit entry" : "Add entry"}
				</p>
				<h1 className="font-semibold text-2xl tracking-tight">
					{isEditing
						? "Update transaction"
						: isIncome
							? "Capture credit"
							: "Capture spending"}
				</h1>
			</header>

			<Card
				className={cn(
					"relative transition-colors duration-300",
					modeHighlightCardClass,
				)}
			>
				<CardContent className="flex items-center justify-between p-4">
					<div className="space-y-1">
						<p className="font-medium text-xs uppercase tracking-[0.16em] text-muted-foreground">
							{isIncome ? "Credit mode" : "Expense mode"}
						</p>
						<p className="font-semibold text-sm">
							{isIncome
								? "You are adding incoming money."
								: "You are adding outgoing spend."}
						</p>
					</div>

					<span
						className={cn(
							"inline-flex size-10 items-center justify-center rounded-xl border bg-card/90 transition-colors duration-300",
							isIncome
								? "border-success/40 text-success"
								: "border-destructive/40 text-destructive",
						)}
					>
						<ModeIcon className="size-5 motion-safe:animate-pulse" />
					</span>
				</CardContent>
			</Card>

			{loaded && !user ? (
				<Card className="border-dashed bg-card/70">
					<CardContent className="space-y-3 p-4 text-center">
						<p className="font-medium text-sm">
							Sign in to save expenses
						</p>
						<Button
							asChild
							variant="outline"
							className="h-10 rounded-xl"
						>
							<Link href={redirectToLoginHref}>Sign in</Link>
						</Button>
					</CardContent>
				</Card>
			) : null}

			<form className="space-y-4" onSubmit={handleSaveExpense}>
				<Card
					className={cn(
						"transition-colors duration-300",
						modeSecondaryCardClass,
					)}
				>
					<CardHeader className="pb-2">
						<CardTitle className="text-lg">Type</CardTitle>
						<CardDescription>
							Choose whether this is outgoing expense or incoming
							credit.
						</CardDescription>
					</CardHeader>

					<CardContent>
						<div
							role="tablist"
							aria-label="Transaction type"
							className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1"
						>
							{entryTypeOptions.map((option) => (
								<button
									key={option.value}
									type="button"
									role="tab"
									aria-selected={entryType === option.value}
									onClick={() => setEntryType(option.value)}
									className={cn(
										"min-h-10 rounded-xl px-3 font-medium text-sm transition-colors duration-300",
										entryType === option.value
											? option.value ===
												EXPENSE_TYPE.income
												? "bg-success/15 text-success shadow-xs"
												: "bg-destructive/15 text-destructive shadow-xs"
											: "text-muted-foreground",
									)}
								>
									{option.label}
								</button>
							))}
						</div>
					</CardContent>
				</Card>

				<Card
					className={cn(
						"transition-colors duration-300",
						modeHighlightCardClass,
					)}
				>
					<CardHeader className="pb-2">
						<CardTitle className="text-lg">
							{isIncome ? "Credit amount" : "Amount"}
						</CardTitle>
						<CardDescription>
							{isIncome
								? "Add the incoming amount received."
								: "Use a clear number for quick family visibility."}
						</CardDescription>
					</CardHeader>

					<CardContent className="space-y-3">
						<Input
							inputMode="numeric"
							placeholder="0"
							value={amount}
							onChange={(event) => setAmount(event.target.value)}
							className={cn(
								"h-20 border-none text-center font-semibold text-4xl shadow-none transition-colors duration-300",
								isIncome
									? "bg-success/10 text-success"
									: "bg-destructive/10 text-destructive",
							)}
						/>
						<p className="text-center text-muted-foreground text-xs">
							Preview:{" "}
							{Number.isNaN(parsedAmount)
								? "₹0"
								: formatCurrency(parsedAmount)}
						</p>
					</CardContent>
				</Card>

				<Card
					className={cn(
						"transition-colors duration-300",
						modeSecondaryCardClass,
					)}
				>
					<CardHeader className="pb-2">
						<CardTitle className="text-lg">
							{isIncome ? "Credit source" : "Category"}
						</CardTitle>
					</CardHeader>

					<CardContent>
						<div className="grid grid-cols-2 gap-2">
							{categoryOptions.map((category) => {
								const Icon = categoryIcons[category.key];
								const isSelected =
									selectedCategory === category.key;

								return (
									<button
										key={category.key}
										type="button"
										onClick={() =>
											setSelectedCategory(category.key)
										}
										className={cn(
											"flex min-h-11 items-center gap-2 rounded-xl border p-3 text-left transition-colors duration-300",
											isSelected
												? modeSelectedCategoryClass
												: "bg-card",
										)}
									>
										<Icon
											className={cn(
												"size-4 transition-colors duration-300",
												isSelected
													? modeSelectedIconClass
													: "text-primary",
											)}
										/>
										<span className="font-medium text-sm">
											{category.label}
										</span>
									</button>
								);
							})}
						</div>
					</CardContent>
				</Card>

				<Card
					className={cn(
						"transition-colors duration-300",
						modeSecondaryCardClass,
					)}
				>
					<CardHeader className="pb-2">
						<CardTitle className="text-lg">Details</CardTitle>
					</CardHeader>

					<CardContent className="space-y-3">
						<Textarea
							className="min-h-[90px]"
							placeholder="Add notes"
							value={notes}
							onChange={(event) => setNotes(event.target.value)}
						/>

						<Input
							type="date"
							value={selectedDate}
							onChange={(event) =>
								setSelectedDate(event.target.value)
							}
							className="h-11"
						/>
					</CardContent>
				</Card>

				{!isIncome ? (
					<Card className="border-destructive/20 bg-destructive/5 transition-colors duration-300">
						<CardHeader className="pb-2">
							<CardTitle className="text-lg">
								Visibility
							</CardTitle>
						</CardHeader>

						<CardContent className="space-y-3">
							<div
								role="tablist"
								aria-label="Expense visibility"
								className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1"
							>
								{visibilityOptions.map((option) => (
									<button
										key={option.value}
										type="button"
										role="tab"
										aria-selected={
											visibility === option.value
										}
										onClick={() =>
											setVisibility(option.value)
										}
										className={cn(
											"min-h-10 rounded-xl px-3 font-medium text-sm transition-colors duration-300",
											visibility === option.value
												? "bg-destructive/15 text-destructive shadow-xs"
												: "text-muted-foreground",
										)}
									>
										{option.label}
									</button>
								))}
							</div>

							{isShared ? (
								<div className="space-y-3 rounded-2xl border bg-muted/40 p-3">
									<div className="flex items-center justify-between">
										<p className="font-medium text-sm">
											Family members
										</p>
										<p className="text-muted-foreground text-xs">
											Split equally
										</p>
									</div>
									{familyMemberOptions.length > 0 ? (
										<>
											<div className="space-y-2">
												<p className="text-muted-foreground text-xs">
													Paid by
												</p>
												<div className="flex flex-wrap gap-2">
													{familyMemberOptions.map(
														(member) => (
															<button
																key={
																	member.userId
																}
																type="button"
																onClick={() =>
																	setSharedPaidByUserId(
																		member.userId,
																	)
																}
																className={cn(
																	"rounded-full border px-3 py-1.5 font-medium text-xs",
																	sharedPaidByUserId ===
																		member.userId
																		? "border-primary bg-primary/10 text-foreground"
																		: "bg-card text-muted-foreground",
																)}
															>
																{member.name}
															</button>
														),
													)}
												</div>
											</div>

											<ul className="space-y-2">
												{familyMemberOptions.map(
													(member) => {
														const isSelected =
															selectedSharedMemberUserIds.includes(
																member.userId,
															);

														return (
															<li
																key={
																	member.userId
																}
															>
																<button
																	type="button"
																	onClick={() =>
																		setSelectedSharedMemberUserIds(
																			(
																				currentValue,
																			) =>
																				isSelected
																					? currentValue.filter(
																							(
																								memberUserId,
																							) =>
																								memberUserId !==
																								member.userId,
																						)
																					: [
																							...currentValue,
																							member.userId,
																						],
																		)
																	}
																	className="flex w-full items-center justify-between rounded-xl bg-card px-3 py-2 text-left"
																>
																	<div className="flex items-center gap-2">
																		<Avatar className="size-8 rounded-full">
																			<AvatarFallback className="rounded-full font-semibold text-[11px]">
																				{getInitials(
																					member.name,
																				)}
																			</AvatarFallback>
																		</Avatar>
																		<span className="font-medium text-sm">
																			{
																				member.name
																			}
																		</span>
																	</div>

																	{isSelected ? (
																		<CheckCircle2Icon className="size-4 text-success" />
																	) : (
																		<CircleIcon className="size-4 text-muted-foreground" />
																	)}
																</button>
															</li>
														);
													},
												)}
											</ul>

											<div className="space-y-2 rounded-xl border bg-card px-3 py-2">
												<p className="text-muted-foreground text-xs">
													Split preview
												</p>
												{sharedPreviewRows.length >
												0 ? (
													<ul className="space-y-1.5">
														{sharedPreviewRows.map(
															(row) => (
																<li
																	key={`${row.fromLabel}-${row.toLabel}-${row.amount}`}
																	className="flex items-center justify-between rounded-lg bg-muted/60 px-2.5 py-2 text-sm"
																>
																	<div className="flex items-center gap-1.5">
																		<span className="font-medium">
																			{
																				row.fromLabel
																			}
																		</span>
																		<ArrowRightIcon className="size-3.5 text-muted-foreground" />
																		<span className="font-medium">
																			{
																				row.toLabel
																			}
																		</span>
																	</div>
																	<span className="font-semibold">
																		{formatCurrency(
																			row.amount,
																		)}
																	</span>
																</li>
															),
														)}
													</ul>
												) : (
													<div className="rounded-lg bg-muted/60 px-2.5 py-2 text-xs text-muted-foreground">
														No dues in this split
													</div>
												)}
											</div>
										</>
									) : (
										<p className="text-muted-foreground text-xs">
											Create a family group first to add
											shared splits.
										</p>
									)}
								</div>
							) : null}
						</CardContent>
					</Card>
				) : null}

				<Button
					className={cn(
						"h-12 w-full rounded-2xl font-semibold transition-colors duration-300",
						modeSubmitButtonClass,
					)}
					size="lg"
					type="submit"
					variant="primary"
					loading={isSaving}
					disabled={isSaving || isEditingExpenseLoading}
				>
					{isEditing
						? isIncome
							? "Update Credit"
							: "Update Expense"
						: isIncome
							? "Save Credit"
							: "Save Expense"}
				</Button>
			</form>
		</section>
	);
}
