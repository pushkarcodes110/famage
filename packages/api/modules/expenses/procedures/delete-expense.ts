import { ORPCError } from "@orpc/client";
import { deleteExpenseByIdForUser } from "@repo/database";
import { protectedProcedure } from "../../../orpc/procedures";
import { deleteExpenseSchema } from "../types";

export const deleteExpenseProcedure = protectedProcedure
	.route({
		method: "DELETE",
		path: "/expenses/{id}",
		tags: ["Expenses"],
		summary: "Delete expense",
		description: "Delete an expense by id for the authenticated user",
	})
	.input(deleteExpenseSchema)
	.handler(async ({ input, context: { user } }) => {
		const deleteResult = await deleteExpenseByIdForUser({
			id: input.id,
			userId: user.id,
		});

		if (deleteResult.count === 0) {
			throw new ORPCError("NOT_FOUND");
		}

		return {
			success: true,
		};
	});
