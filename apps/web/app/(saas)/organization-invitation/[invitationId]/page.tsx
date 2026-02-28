import { OrganizationInvitationModal } from "@saas/organizations/components/OrganizationInvitationModal";
import { AuthWrapper } from "@saas/shared/components/AuthWrapper";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

function isFamilyOrganization(metadata: string | null | undefined): boolean {
	if (!metadata) {
		return false;
	}

	try {
		const parsed = JSON.parse(metadata) as { kind?: string };
		return parsed.kind === "family";
	} catch {
		return false;
	}
}

export default async function OrganizationInvitationPage({
	params,
}: {
	params: Promise<{ invitationId: string }>;
}) {
	const { invitationId } = await params;
	const [{ auth }, { getOrganizationById }] = await Promise.all([
		import("@repo/auth"),
		import("@repo/database"),
	]);

	const invitation = await auth.api.getInvitation({
		query: {
			id: invitationId,
		},
		headers: await headers(),
	});

	if (!invitation) {
		redirect("/app");
	}

	const organization = await getOrganizationById(invitation.organizationId);
	const familyInvite = isFamilyOrganization(organization?.metadata);

	return (
		<AuthWrapper>
			<OrganizationInvitationModal
				organizationName={invitation.organizationName}
				organizationSlug={invitation.organizationSlug}
				logoUrl={organization?.logo || undefined}
				invitationId={invitationId}
				acceptRedirectPath={familyInvite ? "/famage/family" : undefined}
				rejectRedirectPath={familyInvite ? "/famage/family" : undefined}
			/>
		</AuthWrapper>
	);
}
