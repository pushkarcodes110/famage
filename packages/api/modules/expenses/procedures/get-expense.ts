import { ORPCError } from "@orpc/client";
import { db } from "@repo/database";
import { protectedProcedure } from "../../../orpc/procedures";
import { mapExpenseForClient } from "../lib/mappers";
import { mapSharedSplitModeFromDb } from "../lib/shared-expenses";
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
		const expense = await db.expense.findFirst({
			where: {
				id: input.id,
				userId: user.id,
			},
			include: {
				sharedExpense: {
					include: {
						participants: true,
					},
				},
			},
		});

		if (!expense) {
			throw new ORPCError("NOT_FOUND");
		}

		return {
			expense: {
				...mapExpenseForClient(expense),
				sharedDetails: expense.sharedExpense
					? {
							paidByUserId: expense.sharedExpense.paidByUserId,
							splitMode: mapSharedSplitModeFromDb(
								expense.sharedExpense.splitMode,
							),
							excludePayer: expense.sharedExpense.excludePayer,
							participants:
								expense.sharedExpense.participants.map(
									(participant) => ({
										userId: participant.userId,
										shareType: mapSharedSplitModeFromDb(
											participant.shareType,
										),
										shareValue: participant.shareValue,
										owedAmount: participant.owedAmount,
									}),
								),
						}
					: null,
			},
		};
	});
