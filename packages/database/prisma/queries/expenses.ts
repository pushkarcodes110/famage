import { db } from "../client";
import {
	type ExpenseType,
	type ExpenseVisibility,
	Prisma,
} from "../generated/client";

export interface ExpenseDateRange {
	startDate: Date;
	endDate: Date;
}

export interface ExpenseMutationInput {
	userId: string;
	type: ExpenseType;
	amount: number;
	category: string;
	notes?: string;
	expenseDate: Date;
	visibility: ExpenseVisibility;
}

export interface ExpenseUpdateInput {
	type?: ExpenseType;
	amount?: number;
	category?: string;
	notes?: string;
	expenseDate?: Date;
	visibility?: ExpenseVisibility;
}

export async function getExpenseById(id: string) {
	return await db.expense.findUnique({
		where: {
			id,
		},
	});
}

export async function getExpenseByIdForUser({
	id,
	userId,
}: {
	id: string;
	userId: string;
}) {
	return await db.expense.findFirst({
		where: {
			id,
			userId,
		},
	});
}

export async function getExpensesByUserIdAndDateRange({
	userId,
	startDate,
	endDate,
}: {
	userId: string;
} & ExpenseDateRange) {
	return await db.expense.findMany({
		where: {
			userId,
			expenseDate: {
				gte: startDate,
				lte: endDate,
			},
		},
		orderBy: [
			{
				expenseDate: "desc",
			},
			{
				createdAt: "desc",
			},
		],
	});
}

export async function createExpense(input: ExpenseMutationInput) {
	return await db.expense.create({
		data: {
			...input,
		},
	});
}

export async function updateExpenseByIdForUser({
	id,
	userId,
	data,
}: {
	id: string;
	userId: string;
	data: ExpenseUpdateInput;
}) {
	return await db.expense.updateMany({
		where: {
			id,
			userId,
		},
		data,
	});
}

export async function deleteExpenseByIdForUser({
	id,
	userId,
}: {
	id: string;
	userId: string;
}) {
	return await db.expense.deleteMany({
		where: {
			id,
			userId,
		},
	});
}

export async function getExpenseCategoryBreakdownByUserIdAndDateRange({
	userId,
	startDate,
	endDate,
}: {
	userId: string;
} & ExpenseDateRange) {
	return await db.expense.groupBy({
		by: ["category"],
		where: {
			userId,
			type: "EXPENSE",
			expenseDate: {
				gte: startDate,
				lte: endDate,
			},
		},
		_sum: {
			amount: true,
		},
		_count: {
			_all: true,
		},
		orderBy: {
			_sum: {
				amount: "desc",
			},
		},
	});
}

export async function getExpenseTotalsByUserIdAndDateRange({
	userId,
	startDate,
	endDate,
}: {
	userId: string;
} & ExpenseDateRange) {
	const [expenseTotals, incomeTotals, sharedExpenseCount, transactionCount] =
		await Promise.all([
			db.expense.aggregate({
				where: {
					userId,
					type: "EXPENSE",
					expenseDate: {
						gte: startDate,
						lte: endDate,
					},
				},
				_sum: {
					amount: true,
				},
			}),
			db.expense.aggregate({
				where: {
					userId,
					type: "INCOME",
					expenseDate: {
						gte: startDate,
						lte: endDate,
					},
				},
				_sum: {
					amount: true,
				},
			}),
			db.expense.count({
				where: {
					userId,
					type: "EXPENSE",
					visibility: "SHARED",
					expenseDate: {
						gte: startDate,
						lte: endDate,
					},
				},
			}),
			db.expense.count({
				where: {
					userId,
					expenseDate: {
						gte: startDate,
						lte: endDate,
					},
				},
			}),
		]);

	return {
		totalExpenses: expenseTotals._sum.amount ?? 0,
		totalIncome: incomeTotals._sum.amount ?? 0,
		sharedExpenseCount,
		transactionCount,
	};
}
