import { getSession } from "@saas/auth/lib/server";
import { FamilySettingsScreen } from "@saas/famage/components/screens/FamilySettingsScreen";
import { redirect } from "next/navigation";
import { withQuery } from "ufo";

export default async function FamageFamilySettingsPage() {
	const session = await getSession();

	if (!session) {
		redirect(
			withQuery("/famage/auth/login", {
				redirectTo: "/famage/family/settings",
			}),
		);
	}

	return <FamilySettingsScreen />;
}
