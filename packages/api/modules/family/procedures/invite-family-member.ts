import { ORPCError } from "@orpc/client";
import { config } from "@repo/config";
import { db, getUserByEmail } from "@repo/database";
import type { Locale } from "@repo/i18n";
import { sendEmail } from "@repo/mail";
import { getBaseUrl } from "@repo/utils";
import { parse as parseCookies } from "cookie";
import { protectedProcedure } from "../../../orpc/procedures";
import { inviteFamilyMemberSchema } from "../types";

function getLocaleFromHeaders(headers: Headers): Locale {
	const cookies = parseCookies(headers.get("cookie") ?? "");
	const locale = cookies[config.i18n.localeCookieName];

	if (locale && locale in config.i18n.locales) {
		return locale as Locale;
	}

	return config.i18n.defaultLocale;
}

export const inviteFamilyMember = protectedProcedure
	.route({
		method: "POST",
		path: "/family/invitations",
		tags: ["Family"],
		summary: "Invite family member",
		description:
			"Invites an existing app user to the family group and sends an email invitation link",
	})
	.input(inviteFamilyMemberSchema)
	.handler(async ({ input, context }) => {
		const familyMembership = await db.member.findFirst({
			where: {
				userId: context.user.id,
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
				message: "Only family admins can send invitations.",
			});
		}

		const normalizedEmail = input.email.trim().toLowerCase();

		if (normalizedEmail === context.user.email.toLowerCase()) {
			throw new ORPCError("BAD_REQUEST", {
				message: "You are already a member of this family.",
			});
		}

		const invitedUser = await getUserByEmail(normalizedEmail);

		if (!invitedUser) {
			throw new ORPCError("BAD_REQUEST", {
				message:
					"Invite failed: the email is not registered. Family invites are allowed only for existing users.",
			});
		}

		const existingMembership = await db.member.findFirst({
			where: {
				organizationId: familyMembership.organizationId,
				userId: invitedUser.id,
			},
			select: {
				id: true,
			},
		});

		if (existingMembership) {
			throw new ORPCError("BAD_REQUEST", {
				message: "This user is already a member of your family.",
			});
		}

		const existingInvitation = await db.invitation.findFirst({
			where: {
				organizationId: familyMembership.organizationId,
				email: normalizedEmail,
				status: "pending",
				expiresAt: {
					gte: new Date(),
				},
			},
			select: {
				id: true,
			},
		});

		if (existingInvitation) {
			throw new ORPCError("BAD_REQUEST", {
				message: "An active invitation already exists for this email.",
			});
		}

		const invitation = await db.invitation.create({
			data: {
				organizationId: familyMembership.organizationId,
				email: normalizedEmail,
				role: "member",
				status: "pending",
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
				inviterId: context.user.id,
			},
		});

		const url = new URL("/famage/auth/login", getBaseUrl());
		url.searchParams.set("invitationId", invitation.id);
		url.searchParams.set("email", normalizedEmail);
		url.searchParams.set(
			"redirectTo",
			`/organization-invitation/${invitation.id}`,
		);

		await sendEmail({
			to: normalizedEmail,
			templateId: "organizationInvitation",
			locale: getLocaleFromHeaders(context.headers),
			context: {
				organizationName: familyMembership.organization.name,
				url: url.toString(),
			},
		});

		return {
			success: true,
			invitationId: invitation.id,
		};
	});
