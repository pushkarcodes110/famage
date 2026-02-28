import { ORPCError } from "@orpc/client";
import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { protectedProcedure } from "../../../orpc/procedures";
import {
	mapExpenseForClient,
	mapExpenseTypeToDb,
	mapExpenseVisibilityToDb,
} from "../lib/mappers";
import {
	buildSharedOwedAllocations,
	getFamilyMembershipForUser,
	mapSharedSplitModeToDb,
} from "../lib/shared-expenses";
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
			const isSharedExpense =
				input.type === "expense" && input.visibility === "shared";

			const familyMembership = isSharedExpense
				? await getFamilyMembershipForUser(user.id)
				: null;

			if (isSharedExpense && !input.sharedDetails) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Shared expenses require split details.",
				});
			}

			if (isSharedExpense && !familyMembership) {
				throw new ORPCError("BAD_REQUEST", {
					message: "You need a family group to add shared expenses.",
				});
			}

			if (isSharedExpense && familyMembership && input.sharedDetails) {
				const familyMemberUserIds = new Set(
					familyMembership.organization.members.map(
						(member) => member.userId,
					),
				);
				if (
					!familyMemberUserIds.has(input.sharedDetails.paidByUserId)
				) {
					throw new ORPCError("BAD_REQUEST", {
						message: "Payer must belong to your family group.",
					});
				}
				const hasOutsider = input.sharedDetails.participants.some(
					(participant) =>
						!familyMemberUserIds.has(participant.userId),
				);
				if (hasOutsider) {
					throw new ORPCError("BAD_REQUEST", {
						message:
							"All split participants must belong to your family group.",
					});
				}
			}

			const expense = await db.$transaction(async (transaction) => {
				const createdExpense = await transaction.expense.create({
					data: {
						userId: user.id,
						type: mapExpenseTypeToDb(input.type),
						amount: input.amount,
						category: input.category,
						notes: input.notes,
						expenseDate: new Date(input.expenseDate),
						visibility: mapExpenseVisibilityToDb(input.visibility),
					},
				});

				if (
					!isSharedExpense ||
					!familyMembership ||
					!input.sharedDetails
				) {
					return createdExpense;
				}
				const sharedDetails = input.sharedDetails;

				const allocations = buildSharedOwedAllocations({
					amount: createdExpense.amount,
					sharedDetails,
				});

				const createdSharedExpense =
					await transaction.sharedExpense.create({
						data: {
							expenseId: createdExpense.id,
							organizationId: familyMembership.organizationId,
							paidByUserId: sharedDetails.paidByUserId,
							splitMode: mapSharedSplitModeToDb(
								sharedDetails.splitMode,
							),
							excludePayer: sharedDetails.excludePayer,
							createdByUserId: user.id,
						},
					});

				await transaction.sharedExpenseParticipant.createMany({
					data: allocations.map((allocation) => ({
						sharedExpenseId: createdSharedExpense.id,
						userId: allocation.userId,
						shareType: mapSharedSplitModeToDb(
							sharedDetails.splitMode,
						),
						shareValue: allocation.shareValue,
						owedAmount: allocation.owedAmount,
					})),
				});

				const settlements = allocations
					.filter(
						(allocation) =>
							allocation.userId !== sharedDetails.paidByUserId &&
							allocation.owedAmount > 0,
					)
					.map((allocation) => ({
						organizationId: familyMembership.organizationId,
						fromUserId: allocation.userId,
						toUserId: sharedDetails.paidByUserId,
						amount: allocation.owedAmount,
						status: "PENDING" as const,
						sourceSharedExpenseId: createdSharedExpense.id,
					}));

				if (settlements.length > 0) {
					await transaction.sharedSettlement.createMany({
						data: settlements,
					});
				}

				return createdExpense;
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
