import "server-only";
import { headers } from "next/headers";
import { cache } from "react";

export const getSession = cache(async () => {
	const { auth } = await import("@repo/auth");
	const session = await auth.api.getSession({
		headers: await headers(),
		query: {
			disableCookieCache: true,
		},
	});

	return session;
});

export const getActiveOrganization = cache(async (slug: string) => {
	try {
		const { auth } = await import("@repo/auth");
		const activeOrganization = await auth.api.getFullOrganization({
			query: {
				organizationSlug: slug,
			},
			headers: await headers(),
		});

		return activeOrganization;
	} catch {
		return null;
	}
});

export const getOrganizationList = cache(async () => {
	try {
		const { auth } = await import("@repo/auth");
		const organizationList = await auth.api.listOrganizations({
			headers: await headers(),
		});

		return organizationList;
	} catch {
		return [];
	}
});

export const getUserAccounts = cache(async () => {
	try {
		const { auth } = await import("@repo/auth");
		const userAccounts = await auth.api.listUserAccounts({
			headers: await headers(),
		});

		return userAccounts;
	} catch {
		return [];
	}
});

export const getUserPasskeys = cache(async () => {
	try {
		const { auth } = await import("@repo/auth");
		const userPasskeys = await auth.api.listPasskeys({
			headers: await headers(),
		});

		return userPasskeys;
	} catch {
		return [];
	}
});

export const getInvitation = cache(async (id: string) => {
	try {
		const { getInvitationById } = await import("@repo/database");
		return await getInvitationById(id);
	} catch {
		return null;
	}
});
