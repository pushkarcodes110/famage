import { ORPCError } from "@orpc/client";
import { db, getOrganizationBySlug } from "@repo/database";
import slugify from "@sindresorhus/slugify";
import { nanoid } from "nanoid";
import { protectedProcedure } from "../../../orpc/procedures";
import { createFamilySchema } from "../types";

async function generateFamilySlug(name: string): Promise<string> {
	const baseSlug = slugify(name, {
		lowercase: true,
	});

	let slug = baseSlug;

	for (let attempt = 0; attempt < 3; attempt += 1) {
		const existingOrganization = await getOrganizationBySlug(slug);

		if (!existingOrganization) {
			return slug;
		}

		slug = `${baseSlug}-${nanoid(5)}`;
	}

	throw new ORPCError("INTERNAL_SERVER_ERROR", {
		message: "Unable to generate unique family slug. Please try again.",
	});
}

export const createFamily = protectedProcedure
	.route({
		method: "POST",
		path: "/family",
		tags: ["Family"],
		summary: "Create family group",
		description: "Creates a family group for the authenticated user",
	})
	.input(createFamilySchema)
	.handler(async ({ input, context: { user } }) => {
		const existingMembership = await db.member.findFirst({
			where: {
				userId: user.id,
				organization: {
					metadata: {
						contains: '"kind":"family"',
					},
				},
			},
			select: {
				organizationId: true,
			},
		});

		if (existingMembership) {
			throw new ORPCError("BAD_REQUEST", {
				message: "You already belong to a family group.",
			});
		}

		const slug = await generateFamilySlug(input.name);
		const familyMetadata = JSON.stringify({
			kind: "family",
			monthlyBudget: input.monthlyBudget ?? null,
		});

		const family = await db.organization.create({
			data: {
				name: input.name,
				slug,
				createdAt: new Date(),
				metadata: familyMetadata,
				members: {
					create: {
						userId: user.id,
						role: "owner",
						createdAt: new Date(),
					},
				},
			},
		});

		return {
			family: {
				id: family.id,
				name: family.name,
				slug: family.slug,
				monthlyBudget: input.monthlyBudget ?? null,
			},
		};
	});
