import type { ExpensePeriod } from "../types";

export interface DateRange {
	startDate: Date;
	endDate: Date;
}

export function getDateRangeForPeriod(period: ExpensePeriod): DateRange {
	const now = new Date();
	const startDate = new Date(now);
	const endDate = new Date(now);

	if (period === "daily") {
		startDate.setHours(0, 0, 0, 0);
		endDate.setHours(23, 59, 59, 999);
		return { startDate, endDate };
	}

	if (period === "weekly") {
		const day = now.getDay();
		const mondayOffset = day === 0 ? -6 : 1 - day;

		startDate.setDate(now.getDate() + mondayOffset);
		startDate.setHours(0, 0, 0, 0);

		endDate.setDate(startDate.getDate() + 6);
		endDate.setHours(23, 59, 59, 999);

		return { startDate, endDate };
	}

	if (period === "yearly") {
		startDate.setMonth(0, 1);
		startDate.setHours(0, 0, 0, 0);

		endDate.setTime(now.getTime());

		return { startDate, endDate };
	}

	startDate.setDate(1);
	startDate.setHours(0, 0, 0, 0);

	endDate.setMonth(startDate.getMonth() + 1);
	endDate.setDate(0);
	endDate.setHours(23, 59, 59, 999);

	return { startDate, endDate };
}
