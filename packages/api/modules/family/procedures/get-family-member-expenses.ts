import { ORPCError } from "@orpc/client";
import { db } from "@repo/database";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDateRangeForPeriod } from "../../expenses/lib/date-range";
import { mapExpenseForClient } from "../../expenses/lib/mappers";
import { buildFamilyTrend } from "../lib/helpers";
import { familyMemberExpensesSchema } from "../types";

export const getFamilyMemberExpenses = protectedProcedure
	.route({
		method: "GET",
		path: "/family/member-expenses",
		tags: ["Family"],
		summary: "Get family member expenses",
		description:
			"Returns daily, weekly, or monthly expense details for a selected family member",
	})
	.input(familyMemberExpensesSchema)
	.handler(async ({ input, context: { user } }) => {
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
					},
				},
			},
		});

		if (!familyMembership) {
			throw new ORPCError("NOT_FOUND", {
				message: "Family group not found.",
			});
		}

		const selectedMember = familyMembership.organization.members.find(
			(member) => member.userId === input.memberUserId,
		);

		if (!selectedMember) {
			throw new ORPCError("FORBIDDEN", {
				message: "Selected user is not a member of your family group.",
			});
		}

		const { startDate, endDate } = getDateRangeForPeriod(input.period);

		const [expenses, expenseTotals, incomeTotals, categoryBreakdown] =
			await Promise.all([
				db.expense.findMany({
					where: {
						userId: input.memberUserId,
						expenseDate: {
							gte: startDate,
							lte: endDate,
						},
					},
					orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
				}),
				db.expense.aggregate({
					where: {
						userId: input.memberUserId,
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
						userId: input.memberUserId,
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
				db.expense.groupBy({
					by: ["category"],
					where: {
						userId: input.memberUserId,
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
				}),
			]);

		const trend = buildFamilyTrend(expenses, input.period);
		const totalExpenses = expenseTotals._sum.amount ?? 0;
		const totalIncome = incomeTotals._sum.amount ?? 0;

		return {
			member: {
				userId: selectedMember.user.id,
				name: selectedMember.user.name,
				email: selectedMember.user.email,
				role: selectedMember.role,
			},
			period: input.period,
			range: {
				startDate,
				endDate,
			},
			summary: {
				totalExpenses,
				totalIncome,
				balance: totalIncome - totalExpenses,
				transactionCount: expenses.length,
			},
			expenses: expenses.map((expense) => mapExpenseForClient(expense)),
			breakdown: categoryBreakdown.map((categoryItem) => ({
				category: categoryItem.category,
				totalAmount: categoryItem._sum.amount ?? 0,
				transactionCount: categoryItem._count._all,
			})),
			trend,
		};
	});
