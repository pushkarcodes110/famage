import { z } from "zod";

export const FAMILY_PERIOD = {
	daily: "daily",
	weekly: "weekly",
	monthly: "monthly",
} as const;

export type FamilyPeriod = (typeof FAMILY_PERIOD)[keyof typeof FAMILY_PERIOD];

export const familyPeriodSchema = z.enum([
	FAMILY_PERIOD.daily,
	FAMILY_PERIOD.weekly,
	FAMILY_PERIOD.monthly,
]);

export const createFamilySchema = z.object({
	name: z.string().trim().min(2).max(80),
	monthlyBudget: z
		.number()
		.int("Monthly budget must be a whole number")
		.min(0, "Monthly budget cannot be negative")
		.max(1_000_000_000, "Monthly budget is too large")
		.optional(),
});

export const updateFamilySchema = z.object({
	name: z.string().trim().min(2).max(80),
	monthlyBudget: z
		.number()
		.int("Monthly budget must be a whole number")
		.min(0, "Monthly budget cannot be negative")
		.max(1_000_000_000, "Monthly budget is too large")
		.optional(),
});

export const inviteFamilyMemberSchema = z.object({
	email: z.string().trim().email(),
});

export const familyMemberExpensesSchema = z.object({
	memberUserId: z.string().min(1),
	period: familyPeriodSchema.default(FAMILY_PERIOD.monthly),
});

export interface TrendBucket {
	label: string;
	totalAmount: number;
}

export interface FamilyMetadata {
	kind?: string;
	monthlyBudget?: number | null;
}
