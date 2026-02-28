import { ORPCError } from "@orpc/client";
import { db, getExpenseByIdForUser } from "@repo/database";
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
			if (!familyMemberUserIds.has(input.sharedDetails.paidByUserId)) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Payer must belong to your family group.",
				});
			}
			const hasOutsider = input.sharedDetails.participants.some(
				(participant) => !familyMemberUserIds.has(participant.userId),
			);
			if (hasOutsider) {
				throw new ORPCError("BAD_REQUEST", {
					message:
						"All split participants must belong to your family group.",
				});
			}
		}

		const updatedCount = await db.$transaction(async (transaction) => {
			const updateResult = await transaction.expense.updateMany({
				where: {
					id: input.id,
					userId: user.id,
				},
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
				return 0;
			}

			const existingSharedExpense =
				await transaction.sharedExpense.findUnique({
					where: {
						expenseId: input.id,
					},
					select: {
						id: true,
					},
				});

			if (!isSharedExpense || !familyMembership || !input.sharedDetails) {
				if (existingSharedExpense) {
					await transaction.sharedSettlement.deleteMany({
						where: {
							sourceSharedExpenseId: existingSharedExpense.id,
						},
					});
					await transaction.sharedExpense.delete({
						where: {
							id: existingSharedExpense.id,
						},
					});
				}
				return updateResult.count;
			}
			const sharedDetails = input.sharedDetails;

			const allocations = buildSharedOwedAllocations({
				amount: input.amount,
				sharedDetails,
			});

			const sharedExpense = existingSharedExpense
				? await transaction.sharedExpense.update({
						where: {
							id: existingSharedExpense.id,
						},
						data: {
							organizationId: familyMembership.organizationId,
							paidByUserId: sharedDetails.paidByUserId,
							splitMode: mapSharedSplitModeToDb(
								sharedDetails.splitMode,
							),
							excludePayer: sharedDetails.excludePayer,
						},
					})
				: await transaction.sharedExpense.create({
						data: {
							expenseId: input.id,
							organizationId: familyMembership.organizationId,
							paidByUserId: sharedDetails.paidByUserId,
							splitMode: mapSharedSplitModeToDb(
								sharedDetails.splitMode,
							),
							excludePayer: sharedDetails.excludePayer,
							createdByUserId: user.id,
						},
					});

			await transaction.sharedExpenseParticipant.deleteMany({
				where: {
					sharedExpenseId: sharedExpense.id,
				},
			});
			await transaction.sharedSettlement.deleteMany({
				where: {
					sourceSharedExpenseId: sharedExpense.id,
				},
			});

			await transaction.sharedExpenseParticipant.createMany({
				data: allocations.map((allocation) => ({
					sharedExpenseId: sharedExpense.id,
					userId: allocation.userId,
					shareType: mapSharedSplitModeToDb(sharedDetails.splitMode),
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
					sourceSharedExpenseId: sharedExpense.id,
				}));

			if (settlements.length > 0) {
				await transaction.sharedSettlement.createMany({
					data: settlements,
				});
			}

			return updateResult.count;
		});

		if (updatedCount === 0) {
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
