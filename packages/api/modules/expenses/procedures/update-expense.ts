import { ORPCError } from "@orpc/client";
import { getExpenseByIdForUser, updateExpenseByIdForUser } from "@repo/database";
import { protectedProcedure } from "../../../orpc/procedures";
import {
	mapExpenseForClient,
	mapExpenseTypeToDb,
	mapExpenseVisibilityToDb,
} from "../lib/mappers";
import { updateExpenseSchema } from "../types";

export const updateExpenseProcedure = protectedProcedure
	.route({
		method: "PATCH",
		path: "/expenses/{id}",
		tags: ["Expenses"],
		summary: "Update expense",
		description: "Update an existing expense for the authenticated user",
	})
	.input(updateExpenseSchema)
	.handler(async ({ input, context: { user } }) => {
		const updateResult = await updateExpenseByIdForUser({
			id: input.id,
			userId: user.id,
			data: {
				type: mapExpenseTypeToDb(input.type),
				amount: input.amount,
				category: input.category,
				notes: input.notes,
				expenseDate: new Date(input.expenseDate),
				visibility: mapExpenseVisibilityToDb(input.visibility),
			},
		});

		if (updateResult.count === 0) {
			throw new ORPCError("NOT_FOUND");
		}

		const updatedExpense = await getExpenseByIdForUser({
			id: input.id,
			userId: user.id,
		});

		if (!updatedExpense) {
			throw new ORPCError("NOT_FOUND");
		}

		return {
			expense: mapExpenseForClient(updatedExpense),
		};
	});
