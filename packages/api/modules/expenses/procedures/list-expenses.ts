import {
	getExpenseCategoryBreakdownByUserIdAndDateRange,
	getExpenseTotalsByUserIdAndDateRange,
	getExpensesByUserIdAndDateRange,
} from "@repo/database";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDateRangeForPeriod } from "../lib/date-range";
import { mapExpenseForClient } from "../lib/mappers";
import type { ExpensePeriod } from "../types";
import { listExpensesSchema } from "../types";

interface TrendBucket {
	label: string;
	totalAmount: number;
}

function buildTrend(
	expenses: Array<{
		amount: number;
		type: "EXPENSE" | "INCOME";
		expenseDate: Date;
	}>,
	period: ExpensePeriod,
): TrendBucket[] {
	if (period === "daily") {
		const dailyBuckets = [
			{ label: "00-03", startHour: 0, endHour: 3 },
			{ label: "04-07", startHour: 4, endHour: 7 },
			{ label: "08-11", startHour: 8, endHour: 11 },
			{ label: "12-15", startHour: 12, endHour: 15 },
			{ label: "16-19", startHour: 16, endHour: 19 },
			{ label: "20-23", startHour: 20, endHour: 23 },
		];

		return dailyBuckets.map((bucket) => ({
			label: bucket.label,
			totalAmount: expenses
				.filter((expense) => {
					const hour = expense.expenseDate.getHours();
					return (
						expense.type === "EXPENSE" &&
						hour >= bucket.startHour &&
						hour <= bucket.endHour
					);
				})
				.reduce((sum, expense) => sum + expense.amount, 0),
		}));
	}

	if (period === "weekly") {
		const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
		return weekdays.map((weekday, index) => ({
			label: weekday,
			totalAmount: expenses
				.filter((expense) => {
					const day = expense.expenseDate.getDay();
					const mondayIndexedDay = day === 0 ? 6 : day - 1;
					return expense.type === "EXPENSE" && mondayIndexedDay === index;
				})
				.reduce((sum, expense) => sum + expense.amount, 0),
		}));
	}

	if (period === "yearly") {
		const yearMonths = [
			"Jan",
			"Feb",
			"Mar",
			"Apr",
			"May",
			"Jun",
			"Jul",
			"Aug",
			"Sep",
			"Oct",
			"Nov",
			"Dec",
		];

		return yearMonths.map((monthLabel, index) => ({
			label: monthLabel,
			totalAmount: expenses
				.filter((expense) => {
					return (
						expense.type === "EXPENSE" &&
						expense.expenseDate.getMonth() === index
					);
				})
				.reduce((sum, expense) => sum + expense.amount, 0),
		}));
	}

	const monthWeeks = ["W1", "W2", "W3", "W4", "W5"];
	return monthWeeks.map((weekLabel, index) => ({
		label: weekLabel,
		totalAmount: expenses
			.filter((expense) => {
				const dayOfMonth = expense.expenseDate.getDate();
				const weekOfMonth = Math.min(Math.floor((dayOfMonth - 1) / 7), 4);
				return expense.type === "EXPENSE" && weekOfMonth === index;
			})
			.reduce((sum, expense) => sum + expense.amount, 0),
	}));
}

export const listExpenses = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses",
		tags: ["Expenses"],
		summary: "List expenses for active user",
		description: "Returns expenses, summary, category breakdown and trend for a period",
	})
	.input(listExpensesSchema)
	.handler(async ({ input, context: { user } }) => {
		const period = input?.period ?? "monthly";
		const { startDate, endDate } = getDateRangeForPeriod(period);

		const [expenses, totals, categoryBreakdown] = await Promise.all([
			getExpensesByUserIdAndDateRange({
				userId: user.id,
				startDate,
				endDate,
			}),
			getExpenseTotalsByUserIdAndDateRange({
				userId: user.id,
				startDate,
				endDate,
			}),
			getExpenseCategoryBreakdownByUserIdAndDateRange({
				userId: user.id,
				startDate,
				endDate,
			}),
		]);

		const trend = buildTrend(expenses, period);
		const totalExpenses = totals.totalExpenses;
		const totalIncome = totals.totalIncome;

		return {
			period,
			range: {
				startDate,
				endDate,
			},
			summary: {
				totalExpenses,
				totalIncome,
				balance: totalIncome - totalExpenses,
				transactionCount: totals.transactionCount,
				sharedExpenseCount: totals.sharedExpenseCount,
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
