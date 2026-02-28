import { createFamily } from "./procedures/create-family";
import { getFamilyMemberExpenses } from "./procedures/get-family-member-expenses";
import { getFamilyOverview } from "./procedures/get-family-overview";
import { inviteFamilyMember } from "./procedures/invite-family-member";
import { updateFamily } from "./procedures/update-family";

export const familyRouter = {
	overview: getFamilyOverview,
	create: createFamily,
	update: updateFamily,
	inviteMember: inviteFamilyMember,
	memberExpenses: getFamilyMemberExpenses,
};
