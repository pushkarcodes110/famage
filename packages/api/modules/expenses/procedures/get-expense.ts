import { ORPCError } from "@orpc/client";
import { getExpenseByIdForUser } from "@repo/database";
import { protectedProcedure } from "../../../orpc/procedures";
import { mapExpenseForClient } from "../lib/mappers";
import { getExpenseSchema } from "../types";

export const getExpense = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/{id}",
		tags: ["Expenses"],
		summary: "Get a single expense",
		description: "Returns an expense by id for the authenticated user",
	})
	.input(getExpenseSchema)
	.handler(async ({ input, context: { user } }) => {
		const expense = await getExpenseByIdForUser({
			id: input.id,
			userId: user.id,
		});

		if (!expense) {
			throw new ORPCError("NOT_FOUND");
		}

		return {
			expense: mapExpenseForClient(expense),
		};
	});
