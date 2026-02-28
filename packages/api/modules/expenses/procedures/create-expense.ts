import { ORPCError } from "@orpc/client";
import { logger } from "@repo/logs";
import { createExpense } from "@repo/database";
import { protectedProcedure } from "../../../orpc/procedures";
import {
	mapExpenseForClient,
	mapExpenseTypeToDb,
	mapExpenseVisibilityToDb,
} from "../lib/mappers";
import { createExpenseSchema } from "../types";

function getErrorCode(error: unknown): string | undefined {
	if (typeof error !== "object" || error === null || !("code" in error)) {
		return undefined;
	}

	const code = (error as { code?: unknown }).code;
	return typeof code === "string" ? code : undefined;
}

export const createExpenseProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/expenses",
		tags: ["Expenses"],
		summary: "Create expense",
		description: "Create an expense for the authenticated user",
	})
	.input(createExpenseSchema)
	.handler(async ({ input, context: { user } }) => {
		try {
			const expense = await createExpense({
				userId: user.id,
				type: mapExpenseTypeToDb(input.type),
				amount: input.amount,
				category: input.category,
				notes: input.notes,
				expenseDate: new Date(input.expenseDate),
				visibility: mapExpenseVisibilityToDb(input.visibility),
			});

			return {
				expense: mapExpenseForClient(expense),
			};
		} catch (error) {
			logger.error(error, {
				module: "expenses",
				procedure: "create",
				userId: user.id,
			});

			const errorCode = getErrorCode(error);

			if (errorCode === "P2021" || errorCode === "P2022") {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message:
						"Expense schema is not synced. Run: pnpm --filter @repo/database generate && pnpm --filter @repo/database push. Then restart dev server.",
					cause: error,
				});
			}

			if (errorCode === "P2003") {
				throw new ORPCError("BAD_REQUEST", {
					message:
						"Could not link this expense to your account. Please sign in again and retry.",
					cause: error,
				});
			}

			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message:
					"Failed to create expense due to a server-side error. Check server logs for details.",
				cause: error,
			});
		}
	});
