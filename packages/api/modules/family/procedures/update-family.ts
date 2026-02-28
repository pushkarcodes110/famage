import { ORPCError } from "@orpc/client";
import { db } from "@repo/database";
import { protectedProcedure } from "../../../orpc/procedures";
import { parseFamilyMetadata } from "../lib/helpers";
import { updateFamilySchema } from "../types";

export const updateFamily = protectedProcedure
	.route({
		method: "PATCH",
		path: "/family",
		tags: ["Family"],
		summary: "Update family details",
		description:
			"Updates family group details like name and monthly budget for family admins",
	})
	.input(updateFamilySchema)
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
				organization: true,
			},
		});

		if (!familyMembership) {
			throw new ORPCError("NOT_FOUND", {
				message: "Family group not found.",
			});
		}

		if (!["owner", "admin"].includes(familyMembership.role)) {
			throw new ORPCError("FORBIDDEN", {
				message: "Only family admins can update family details.",
			});
		}

		const existingMetadata = parseFamilyMetadata(
			familyMembership.organization.metadata,
		);

		const updatedMetadata = JSON.stringify({
			...existingMetadata,
			kind: "family",
			monthlyBudget: input.monthlyBudget ?? null,
		});

		const updatedFamily = await db.organization.update({
			where: {
				id: familyMembership.organizationId,
			},
			data: {
				name: input.name,
				metadata: updatedMetadata,
			},
		});

		return {
			family: {
				id: updatedFamily.id,
				name: updatedFamily.name,
				monthlyBudget: input.monthlyBudget ?? null,
			},
		};
	});
