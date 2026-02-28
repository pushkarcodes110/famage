import type {
	ExpenseTypeValue,
	ExpenseVisibilityValue,
} from "../types";

const expenseTypeToDbMap = {
	expense: "EXPENSE",
	income: "INCOME",
} as const satisfies Record<ExpenseTypeValue, "EXPENSE" | "INCOME">;

const expenseVisibilityToDbMap = {
	personal: "PERSONAL",
	shared: "SHARED",
} as const satisfies Record<ExpenseVisibilityValue, "PERSONAL" | "SHARED">;

const expenseTypeFromDbMap = {
	EXPENSE: "expense",
	INCOME: "income",
} as const satisfies Record<"EXPENSE" | "INCOME", ExpenseTypeValue>;

const expenseVisibilityFromDbMap = {
	PERSONAL: "personal",
	SHARED: "shared",
} as const satisfies Record<"PERSONAL" | "SHARED", ExpenseVisibilityValue>;

export function mapExpenseTypeToDb(value: ExpenseTypeValue) {
	return expenseTypeToDbMap[value];
}

export function mapExpenseVisibilityToDb(
	value: ExpenseVisibilityValue,
) {
	return expenseVisibilityToDbMap[value];
}

export function mapExpenseForClient(expense: {
	id: string;
	amount: number;
	category: string;
	notes: string | null;
	expenseDate: Date;
	visibility: "PERSONAL" | "SHARED";
	type: "EXPENSE" | "INCOME";
	createdAt: Date;
	updatedAt: Date;
}) {
	return {
		id: expense.id,
		amount: expense.amount,
		category: expense.category,
		notes: expense.notes,
		expenseDate: expense.expenseDate,
		visibility: expenseVisibilityFromDbMap[expense.visibility],
		type: expenseTypeFromDbMap[expense.type],
		createdAt: expense.createdAt,
		updatedAt: expense.updatedAt,
	};
}
