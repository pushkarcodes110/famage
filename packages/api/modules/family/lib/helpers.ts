import type { FamilyMetadata, FamilyPeriod, TrendBucket } from "../types";

export function parseFamilyMetadata(metadata: string | null): FamilyMetadata {
	if (!metadata) {
		return {};
	}

	try {
		const parsed = JSON.parse(metadata) as FamilyMetadata;
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}

export function buildFamilyTrend(
	expenses: Array<{
		amount: number;
		type: "EXPENSE" | "INCOME";
		expenseDate: Date;
	}>,
	period: FamilyPeriod,
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
					return (
						expense.type === "EXPENSE" && mondayIndexedDay === index
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
				const weekOfMonth = Math.min(
					Math.floor((dayOfMonth - 1) / 7),
					4,
				);
				return expense.type === "EXPENSE" && weekOfMonth === index;
			})
			.reduce((sum, expense) => sum + expense.amount, 0),
	}));
}
