import { db } from "@repo/database";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDateRangeForPeriod } from "../../expenses/lib/date-range";
import { mapExpenseForClient } from "../../expenses/lib/mappers";
import { parseFamilyMetadata } from "../lib/helpers";

export const getFamilyOverview = protectedProcedure
	.route({
		method: "GET",
		path: "/family/overview",
		tags: ["Family"],
		summary: "Get family overview",
		description:
			"Returns family members, shared expenses, and monthly spend summary for the authenticated user",
	})
	.handler(async ({ context: { user } }) => {
		const familyMembership = await db.member.findFirst({
			where: {
				userId: user.id,
				organization: {
					metadata: {
						contains: '"kind":"family"',
					},
				},
			},
			include: {
				organization: {
					include: {
						members: {
							include: {
								user: {
									select: {
										id: true,
										name: true,
										email: true,
									},
								},
							},
						},
						invitations: {
							where: {
								status: "pending",
								expiresAt: {
									gte: new Date(),
								},
							},
							orderBy: {
								createdAt: "desc",
							},
						},
					},
				},
			},
		});

		if (!familyMembership) {
			return {
				family: null,
			};
		}

		const memberUserIds = familyMembership.organization.members.map(
			(member) => member.userId,
		);
		const monthlyRange = getDateRangeForPeriod("monthly");

		const [monthlySpendByMember, sharedExpenses] = await Promise.all([
			db.expense.groupBy({
				by: ["userId"],
				where: {
					userId: {
						in: memberUserIds,
					},
					type: "EXPENSE",
					expenseDate: {
						gte: monthlyRange.startDate,
						lte: monthlyRange.endDate,
					},
				},
				_sum: {
					amount: true,
				},
			}),
			db.expense.findMany({
				where: {
					userId: {
						in: memberUserIds,
					},
					type: "EXPENSE",
					visibility: "SHARED",
				},
				include: {
					sharedExpense: {
						include: {
							settlements: {
								where: {
									status: "PENDING",
								},
								include: {
									fromUser: {
										select: {
											id: true,
											name: true,
										},
									},
									toUser: {
										select: {
											id: true,
											name: true,
										},
									},
								},
							},
						},
					},
				},
				orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
				take: 5,
			}),
		]);

		const monthlySpendByUserId = new Map(
			monthlySpendByMember.map((item) => [
				item.userId,
				item._sum.amount ?? 0,
			]),
		);
		const familyMetadata = parseFamilyMetadata(
			familyMembership.organization.metadata,
		);
		const members = familyMembership.organization.members.map((member) => ({
			id: member.id,
			userId: member.user.id,
			name: member.user.name,
			email: member.user.email,
			role: member.role,
			monthlySpend: monthlySpendByUserId.get(member.user.id) ?? 0,
		}));

		const totalMonthlySpend = members.reduce(
			(total, member) => total + member.monthlySpend,
			0,
		);

		return {
			family: {
				id: familyMembership.organization.id,
				name: familyMembership.organization.name,
				slug: familyMembership.organization.slug,
				monthlyBudget:
					typeof familyMetadata.monthlyBudget === "number"
						? familyMetadata.monthlyBudget
						: null,
				members,
				pendingInvitations:
					familyMembership.organization.invitations.map(
						(invitation) => ({
							id: invitation.id,
							email: invitation.email,
							expiresAt: invitation.expiresAt,
							createdAt: invitation.createdAt,
						}),
					),
				sharedExpenses: sharedExpenses.map((expense) => ({
					...mapExpenseForClient(expense),
					settlements:
						expense.sharedExpense?.settlements.map(
							(settlement) => ({
								id: settlement.id,
								amount: settlement.amount,
								fromUserId: settlement.fromUserId,
								fromUserName: settlement.fromUser.name,
								toUserId: settlement.toUserId,
								toUserName: settlement.toUser.name,
							}),
						) ?? [],
				})),
				totalMonthlySpend,
				canManageInvites: ["owner", "admin"].includes(
					familyMembership.role,
				),
				canManageSettings: familyMembership.role === "owner",
			},
		};
	});
