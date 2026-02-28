import { ORPCError } from "@orpc/client";
import { db } from "@repo/database";
import type { z } from "zod";
import {
	SHARED_SPLIT_MODE,
	type SharedSplitModeValue,
	type sharedExpenseDetailsSchema,
} from "../types";

const sharedSplitModeToDbMap = {
	[SHARED_SPLIT_MODE.equal]: "EQUAL",
	[SHARED_SPLIT_MODE.exact]: "EXACT",
	[SHARED_SPLIT_MODE.percentage]: "PERCENTAGE",
	[SHARED_SPLIT_MODE.shares]: "SHARES",
} as const;

const sharedSplitModeFromDbMap = {
	EQUAL: SHARED_SPLIT_MODE.equal,
	EXACT: SHARED_SPLIT_MODE.exact,
	PERCENTAGE: SHARED_SPLIT_MODE.percentage,
	SHARES: SHARED_SPLIT_MODE.shares,
} as const;

interface OwedAllocation {
	userId: string;
	shareValue: number | null;
	owedAmount: number;
}

type SharedExpenseDetailsInput = z.infer<typeof sharedExpenseDetailsSchema>;

export function mapSharedSplitModeToDb(mode: SharedSplitModeValue) {
	return sharedSplitModeToDbMap[mode];
}

export function mapSharedSplitModeFromDb(
	mode: keyof typeof sharedSplitModeFromDbMap,
) {
	return sharedSplitModeFromDbMap[mode];
}

export async function getFamilyMembershipForUser(userId: string) {
	return await db.member.findFirst({
		where: {
			userId,
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
						select: {
							userId: true,
						},
					},
				},
			},
		},
	});
}

export function buildSharedOwedAllocations({
	amount,
	sharedDetails,
}: {
	amount: number;
	sharedDetails: SharedExpenseDetailsInput;
}): OwedAllocation[] {
	const uniqueParticipantIds = Array.from(
		new Set(
			sharedDetails.participants.map((participant) => participant.userId),
		),
	);

	if (uniqueParticipantIds.length === 0) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Select at least one family member for split.",
		});
	}

	if (
		sharedDetails.excludePayer &&
		uniqueParticipantIds.includes(sharedDetails.paidByUserId) &&
		uniqueParticipantIds.length === 1
	) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"Split participants cannot be empty after excluding payer.",
		});
	}

	const effectiveParticipantIds = sharedDetails.excludePayer
		? uniqueParticipantIds.filter(
				(participantId) => participantId !== sharedDetails.paidByUserId,
			)
		: uniqueParticipantIds;

	if (effectiveParticipantIds.length === 0) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Select at least one member other than payer.",
		});
	}

	if (sharedDetails.splitMode === SHARED_SPLIT_MODE.equal) {
		return allocateEqual(amount, effectiveParticipantIds);
	}

	const shareValueByUserId = new Map(
		sharedDetails.participants.map((participant) => [
			participant.userId,
			participant.shareValue ?? null,
		]),
	);

	if (sharedDetails.splitMode === SHARED_SPLIT_MODE.exact) {
		const allocations = effectiveParticipantIds.map((userId) => ({
			userId,
			shareValue: shareValueByUserId.get(userId) ?? null,
			owedAmount: shareValueByUserId.get(userId) ?? 0,
		}));
		const sum = allocations.reduce(
			(total, item) => total + item.owedAmount,
			0,
		);
		if (sum !== amount) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Exact split amounts must total the expense amount.",
			});
		}
		return allocations;
	}

	if (sharedDetails.splitMode === SHARED_SPLIT_MODE.percentage) {
		const baseItems = effectiveParticipantIds.map((userId) => {
			const shareValue = shareValueByUserId.get(userId) ?? null;
			return {
				userId,
				shareValue,
				rawAmount: ((shareValue ?? 0) * amount) / 100,
			};
		});
		const percentageSum = baseItems.reduce(
			(total, item) => total + (item.shareValue ?? 0),
			0,
		);
		if (percentageSum !== 100) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Percentage split must add up to 100.",
			});
		}
		return distributeWithRemainder(baseItems);
	}

	const baseItems = effectiveParticipantIds.map((userId) => {
		const shareValue = shareValueByUserId.get(userId) ?? null;
		return {
			userId,
			shareValue,
			rawAmount: ((shareValue ?? 0) * amount) / 1,
		};
	});
	const sharesTotal = baseItems.reduce(
		(total, item) => total + (item.shareValue ?? 0),
		0,
	);
	if (sharesTotal <= 0) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Shares split requires at least one positive share value.",
		});
	}

	return distributeWithRemainder(
		baseItems.map((item) => ({
			...item,
			rawAmount: ((item.shareValue ?? 0) / sharesTotal) * amount,
		})),
	);
}

function allocateEqual(
	amount: number,
	participantIds: string[],
): OwedAllocation[] {
	const baseAmount = Math.floor(amount / participantIds.length);
	const remainder = amount % participantIds.length;

	return participantIds.map((userId, index) => ({
		userId,
		shareValue: null,
		owedAmount: baseAmount + (index < remainder ? 1 : 0),
	}));
}

function distributeWithRemainder(
	baseItems: Array<{
		userId: string;
		shareValue: number | null;
		rawAmount: number;
	}>,
): OwedAllocation[] {
	const flooredItems = baseItems.map((item) => ({
		...item,
		owedAmount: Math.floor(item.rawAmount),
		fraction: item.rawAmount - Math.floor(item.rawAmount),
	}));
	const targetTotal = Math.round(
		baseItems.reduce((total, item) => total + item.rawAmount, 0),
	);
	let remainder =
		targetTotal -
		flooredItems.reduce((total, item) => total + item.owedAmount, 0);

	const sortedByFraction = [...flooredItems].sort((left, right) => {
		if (right.fraction === left.fraction) {
			return left.userId.localeCompare(right.userId);
		}

		return right.fraction - left.fraction;
	});

	let cursor = 0;
	while (remainder > 0 && sortedByFraction.length > 0) {
		sortedByFraction[cursor % sortedByFraction.length].owedAmount += 1;
		remainder -= 1;
		cursor += 1;
	}

	return sortedByFraction
		.sort((left, right) => left.userId.localeCompare(right.userId))
		.map((item) => ({
			userId: item.userId,
			shareValue: item.shareValue,
			owedAmount: item.owedAmount,
		}));
}
