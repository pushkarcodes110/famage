import { z } from "zod";

export const EXPENSE_PERIOD = {
	daily: "daily",
	weekly: "weekly",
	monthly: "monthly",
	yearly: "yearly",
} as const;

export type ExpensePeriod =
	(typeof EXPENSE_PERIOD)[keyof typeof EXPENSE_PERIOD];

export const EXPENSE_TYPE = {
	expense: "expense",
	income: "income",
} as const;

export type ExpenseTypeValue =
	(typeof EXPENSE_TYPE)[keyof typeof EXPENSE_TYPE];

export const EXPENSE_VISIBILITY = {
	personal: "personal",
	shared: "shared",
} as const;

export type ExpenseVisibilityValue =
	(typeof EXPENSE_VISIBILITY)[keyof typeof EXPENSE_VISIBILITY];

export const INCOME_SOURCE = {
	salary: "salary",
	freelancing: "freelancing",
	refund: "refund",
	gift: "gift",
	interest: "interest",
	otherIncome: "other_income",
} as const;

export type IncomeSourceValue =
	(typeof INCOME_SOURCE)[keyof typeof INCOME_SOURCE];

export const expenseCategorySchema = z.enum([
	"groceries",
	"utilities",
	"school",
	"transport",
	"health",
	"entertainment",
	"other",
	"salary",
	"freelancing",
	"refund",
	"gift",
	"interest",
	"other_income",
]);

export const expensePeriodSchema = z.enum([
	EXPENSE_PERIOD.daily,
	EXPENSE_PERIOD.weekly,
	EXPENSE_PERIOD.monthly,
	EXPENSE_PERIOD.yearly,
]);

export const expenseTypeSchema = z.enum([
	EXPENSE_TYPE.expense,
	EXPENSE_TYPE.income,
]);

export const expenseVisibilitySchema = z.enum([
	EXPENSE_VISIBILITY.personal,
	EXPENSE_VISIBILITY.shared,
]);

export const createExpenseSchema = z.object({
	amount: z
		.number()
		.int("Amount must be a whole number")
		.min(1, "Amount must be at least 1")
		.max(10_000_000, "Amount is too large"),
	category: expenseCategorySchema,
	notes: z.string().trim().max(240).optional(),
	expenseDate: z.string().datetime(),
	visibility: expenseVisibilitySchema,
	type: expenseTypeSchema.default(EXPENSE_TYPE.expense),
});

export const updateExpenseSchema = z.object({
	id: z.string().min(1),
	amount: z
		.number()
		.int("Amount must be a whole number")
		.min(1, "Amount must be at least 1")
		.max(10_000_000, "Amount is too large"),
	category: expenseCategorySchema,
	notes: z.string().trim().max(240).optional(),
	expenseDate: z.string().datetime(),
	visibility: expenseVisibilitySchema,
	type: expenseTypeSchema.default(EXPENSE_TYPE.expense),
});

export const getExpenseSchema = z.object({
	id: z.string().min(1),
});

export const deleteExpenseSchema = z.object({
	id: z.string().min(1),
});

export const listExpensesSchema = z
	.object({
		period: expensePeriodSchema.default(EXPENSE_PERIOD.monthly),
	})
	.optional();
