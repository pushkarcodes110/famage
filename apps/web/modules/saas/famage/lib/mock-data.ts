export const FAMAGE_PERIOD = {
	daily: "daily",
	monthly: "monthly",
	weekly: "weekly",
} as const;

export type FamagePeriod =
	(typeof FAMAGE_PERIOD)[keyof typeof FAMAGE_PERIOD];

export const EXPENSE_VISIBILITY = {
	personal: "personal",
	shared: "shared",
} as const;

export type ExpenseVisibility =
	(typeof EXPENSE_VISIBILITY)[keyof typeof EXPENSE_VISIBILITY];

export const EXPENSE_CATEGORY = {
	groceries: "groceries",
	utilities: "utilities",
	school: "school",
	transport: "transport",
	health: "health",
	entertainment: "entertainment",
	other: "other",
} as const;

export type ExpenseCategoryKey =
	(typeof EXPENSE_CATEGORY)[keyof typeof EXPENSE_CATEGORY];

export const INCOME_SOURCE = {
	salary: "salary",
	freelancing: "freelancing",
	refund: "refund",
	gift: "gift",
	interest: "interest",
	otherIncome: "other_income",
} as const;

export type IncomeSourceKey =
	(typeof INCOME_SOURCE)[keyof typeof INCOME_SOURCE];

export type TransactionCategoryKey = ExpenseCategoryKey | IncomeSourceKey;

export interface ExpenseCategory {
	key: ExpenseCategoryKey;
	label: string;
}

export const expenseCategories: ExpenseCategory[] = [
	{
		key: EXPENSE_CATEGORY.groceries,
		label: "Groceries",
	},
	{
		key: EXPENSE_CATEGORY.utilities,
		label: "Utilities",
	},
	{
		key: EXPENSE_CATEGORY.school,
		label: "School",
	},
	{
		key: EXPENSE_CATEGORY.transport,
		label: "Transport",
	},
	{
		key: EXPENSE_CATEGORY.health,
		label: "Health",
	},
	{
		key: EXPENSE_CATEGORY.entertainment,
		label: "Fun",
	},
	{
		key: EXPENSE_CATEGORY.other,
		label: "Other",
	},
];

export interface IncomeSource {
	key: IncomeSourceKey;
	label: string;
}

export const incomeSources: IncomeSource[] = [
	{
		key: INCOME_SOURCE.salary,
		label: "Salary",
	},
	{
		key: INCOME_SOURCE.freelancing,
		label: "Freelancing",
	},
	{
		key: INCOME_SOURCE.refund,
		label: "Refund",
	},
	{
		key: INCOME_SOURCE.gift,
		label: "Gift",
	},
	{
		key: INCOME_SOURCE.interest,
		label: "Interest",
	},
	{
		key: INCOME_SOURCE.otherIncome,
		label: "Other income",
	},
];

const transactionCategoryLabelMap: Record<TransactionCategoryKey, string> = {
	[EXPENSE_CATEGORY.groceries]: "Groceries",
	[EXPENSE_CATEGORY.utilities]: "Utilities",
	[EXPENSE_CATEGORY.school]: "School",
	[EXPENSE_CATEGORY.transport]: "Transport",
	[EXPENSE_CATEGORY.health]: "Health",
	[EXPENSE_CATEGORY.entertainment]: "Fun",
	[EXPENSE_CATEGORY.other]: "Other",
	[INCOME_SOURCE.salary]: "Salary",
	[INCOME_SOURCE.freelancing]: "Freelancing",
	[INCOME_SOURCE.refund]: "Refund",
	[INCOME_SOURCE.gift]: "Gift",
	[INCOME_SOURCE.interest]: "Interest",
	[INCOME_SOURCE.otherIncome]: "Other income",
};

export function getTransactionCategoryLabel(category: string): string {
	if (category in transactionCategoryLabelMap) {
		return transactionCategoryLabelMap[category as TransactionCategoryKey];
	}

	return category
		.split("_")
		.join(" ")
		.replace(/^\w/, (char) => char.toUpperCase());
}

export interface DashboardSummary {
	totalExpenses: number;
	totalIncome: number;
	balance: number;
}

export const dashboardSummaries: Record<FamagePeriod, DashboardSummary> = {
	[FAMAGE_PERIOD.daily]: {
		totalExpenses: 95,
		totalIncome: 0,
		balance: -95,
	},
	[FAMAGE_PERIOD.monthly]: {
		totalExpenses: 2480,
		totalIncome: 4200,
		balance: 1720,
	},
	[FAMAGE_PERIOD.weekly]: {
		totalExpenses: 640,
		totalIncome: 980,
		balance: 340,
	},
};

export interface TransactionRecord {
	id: string;
	title: string;
	category: TransactionCategoryKey;
	amount: number;
	dateLabel: string;
	isShared: boolean;
}

export const recentTransactions: Record<FamagePeriod, TransactionRecord[]> = {
	[FAMAGE_PERIOD.daily]: [
		{
			id: "txn-8",
			title: "Morning Groceries",
			category: EXPENSE_CATEGORY.groceries,
			amount: -48,
			dateLabel: "08:15 AM",
			isShared: false,
		},
		{
			id: "txn-9",
			title: "Metro Card",
			category: EXPENSE_CATEGORY.transport,
			amount: -23,
			dateLabel: "10:40 AM",
			isShared: false,
		},
		{
			id: "txn-10",
			title: "Medicine",
			category: EXPENSE_CATEGORY.health,
			amount: -24,
			dateLabel: "01:10 PM",
			isShared: true,
		},
	],
	[FAMAGE_PERIOD.monthly]: [
		{
			id: "txn-1",
			title: "Fresh Mart",
			category: EXPENSE_CATEGORY.groceries,
			amount: -124,
			dateLabel: "Feb 26",
			isShared: true,
		},
		{
			id: "txn-2",
			title: "Electric Bill",
			category: EXPENSE_CATEGORY.utilities,
			amount: -89,
			dateLabel: "Feb 24",
			isShared: true,
		},
		{
			id: "txn-3",
			title: "School Lunch",
			category: EXPENSE_CATEGORY.school,
			amount: -32,
			dateLabel: "Feb 23",
			isShared: false,
		},
		{
			id: "txn-4",
			title: "Salary Credit",
			category: INCOME_SOURCE.salary,
			amount: 2100,
			dateLabel: "Feb 20",
			isShared: false,
		},
	],
	[FAMAGE_PERIOD.weekly]: [
		{
			id: "txn-5",
			title: "City Transport",
			category: EXPENSE_CATEGORY.transport,
			amount: -42,
			dateLabel: "Thu",
			isShared: false,
		},
		{
			id: "txn-6",
			title: "Weekend Groceries",
			category: EXPENSE_CATEGORY.groceries,
			amount: -118,
			dateLabel: "Tue",
			isShared: true,
		},
		{
			id: "txn-7",
			title: "Freelance Payout",
			category: INCOME_SOURCE.freelancing,
			amount: 640,
			dateLabel: "Mon",
			isShared: false,
		},
	],
};

export interface FamilyMember {
	id: string;
	name: string;
	monthlySpend: number;
	avatarClassName: string;
}

export const familyMembers: FamilyMember[] = [
	{
		id: "member-1",
		name: "Pushkar",
		monthlySpend: 910,
		avatarClassName: "bg-amber-100 text-amber-700",
	},
	{
		id: "member-2",
		name: "Anita",
		monthlySpend: 840,
		avatarClassName: "bg-sky-100 text-sky-700",
	},
	{
		id: "member-3",
		name: "Riya",
		monthlySpend: 380,
		avatarClassName: "bg-emerald-100 text-emerald-700",
	},
	{
		id: "member-4",
		name: "Kabir",
		monthlySpend: 350,
		avatarClassName: "bg-rose-100 text-rose-700",
	},
];

export interface SharedExpensePreview {
	id: string;
	title: string;
	dateLabel: string;
	totalAmount: number;
	participants: number;
}

export const sharedExpensesPreview: SharedExpensePreview[] = [
	{
		id: "shared-1",
		title: "Family Dinner",
		dateLabel: "Feb 25",
		totalAmount: 96,
		participants: 4,
	},
	{
		id: "shared-2",
		title: "Internet Recharge",
		dateLabel: "Feb 21",
		totalAmount: 48,
		participants: 2,
	},
	{
		id: "shared-3",
		title: "Movie Night",
		dateLabel: "Feb 18",
		totalAmount: 64,
		participants: 3,
	},
];

export interface ChartBarPlaceholder {
	id: string;
	label: string;
	heightClassName: string;
	tone: ChartBarTone;
}

export const CHART_BAR_TONE = {
	primary: "primary",
	secondary: "secondary",
	muted: "muted",
} as const;

export type ChartBarTone =
	(typeof CHART_BAR_TONE)[keyof typeof CHART_BAR_TONE];

export const reportChartBars: Record<FamagePeriod, ChartBarPlaceholder[]> = {
	[FAMAGE_PERIOD.daily]: [
		{
			id: "bar-d-1",
			label: "00-03",
			heightClassName: "h-6",
			tone: CHART_BAR_TONE.muted,
		},
		{
			id: "bar-d-2",
			label: "04-07",
			heightClassName: "h-10",
			tone: CHART_BAR_TONE.secondary,
		},
		{
			id: "bar-d-3",
			label: "08-11",
			heightClassName: "h-14",
			tone: CHART_BAR_TONE.primary,
		},
		{
			id: "bar-d-4",
			label: "12-15",
			heightClassName: "h-16",
			tone: CHART_BAR_TONE.primary,
		},
		{
			id: "bar-d-5",
			label: "16-19",
			heightClassName: "h-8",
			tone: CHART_BAR_TONE.secondary,
		},
		{
			id: "bar-d-6",
			label: "20-23",
			heightClassName: "h-4",
			tone: CHART_BAR_TONE.muted,
		},
	],
	[FAMAGE_PERIOD.monthly]: [
		{
			id: "bar-m-1",
			label: "W1",
			heightClassName: "h-16",
			tone: CHART_BAR_TONE.secondary,
		},
		{
			id: "bar-m-2",
			label: "W2",
			heightClassName: "h-20",
			tone: CHART_BAR_TONE.primary,
		},
		{
			id: "bar-m-3",
			label: "W3",
			heightClassName: "h-14",
			tone: CHART_BAR_TONE.muted,
		},
		{
			id: "bar-m-4",
			label: "W4",
			heightClassName: "h-24",
			tone: CHART_BAR_TONE.primary,
		},
	],
	[FAMAGE_PERIOD.weekly]: [
		{
			id: "bar-w-1",
			label: "Mon",
			heightClassName: "h-12",
			tone: CHART_BAR_TONE.secondary,
		},
		{
			id: "bar-w-2",
			label: "Tue",
			heightClassName: "h-16",
			tone: CHART_BAR_TONE.primary,
		},
		{
			id: "bar-w-3",
			label: "Wed",
			heightClassName: "h-10",
			tone: CHART_BAR_TONE.muted,
		},
		{
			id: "bar-w-4",
			label: "Thu",
			heightClassName: "h-[4.5rem]",
			tone: CHART_BAR_TONE.primary,
		},
		{
			id: "bar-w-5",
			label: "Fri",
			heightClassName: "h-14",
			tone: CHART_BAR_TONE.secondary,
		},
	],
};

export interface CategoryBreakdownItem {
	id: string;
	category: string;
	amount: number;
	percentage: number;
}

export const reportCategoryBreakdown: Record<FamagePeriod, CategoryBreakdownItem[]> = {
	[FAMAGE_PERIOD.daily]: [
		{
			id: "cat-d-1",
			category: "Groceries",
			amount: 48,
			percentage: 50,
		},
		{
			id: "cat-d-2",
			category: "Transport",
			amount: 23,
			percentage: 24,
		},
		{
			id: "cat-d-3",
			category: "Health",
			amount: 24,
			percentage: 26,
		},
	],
	[FAMAGE_PERIOD.monthly]: [
		{
			id: "cat-m-1",
			category: "Groceries",
			amount: 720,
			percentage: 29,
		},
		{
			id: "cat-m-2",
			category: "Utilities",
			amount: 460,
			percentage: 19,
		},
		{
			id: "cat-m-3",
			category: "School",
			amount: 380,
			percentage: 15,
		},
		{
			id: "cat-m-4",
			category: "Transport",
			amount: 250,
			percentage: 10,
		},
	],
	[FAMAGE_PERIOD.weekly]: [
		{
			id: "cat-w-1",
			category: "Groceries",
			amount: 210,
			percentage: 33,
		},
		{
			id: "cat-w-2",
			category: "Transport",
			amount: 120,
			percentage: 19,
		},
		{
			id: "cat-w-3",
			category: "Utilities",
			amount: 88,
			percentage: 14,
		},
		{
			id: "cat-w-4",
			category: "Health",
			amount: 62,
			percentage: 10,
		},
	],
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "INR",
	maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
	return currencyFormatter.format(value);
}

export function getInitials(name: string): string {
	const words = name.trim().split(" ").filter(Boolean);

	if (words.length === 0) {
		return "FM";
	}

	if (words.length === 1) {
		return words[0].slice(0, 2).toUpperCase();
	}

	return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
}
