import { getSession } from "@saas/auth/lib/server";
import { ProfileEditorScreen } from "@saas/famage/components/screens/ProfileEditorScreen";
import { redirect } from "next/navigation";
import { withQuery } from "ufo";

export default async function FamageProfilePage() {
	const session = await getSession();

	if (!session) {
		redirect(
			withQuery("/famage/auth/login", {
				redirectTo: "/famage/profile",
			}),
		);
	}

	return <ProfileEditorScreen />;
}
