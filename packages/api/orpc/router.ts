import type { RouterClient } from "@orpc/server";
import { adminRouter } from "../modules/admin/router";
import { aiRouter } from "../modules/ai/router";
import { contactRouter } from "../modules/contact/router";
import { expensesRouter } from "../modules/expenses/router";
import { familyRouter } from "../modules/family/router";
import { newsletterRouter } from "../modules/newsletter/router";
import { organizationsRouter } from "../modules/organizations/router";
import { paymentsRouter } from "../modules/payments/router";
import { usersRouter } from "../modules/users/router";
import { publicProcedure } from "./procedures";

export const router = publicProcedure.router({
	admin: adminRouter,
	newsletter: newsletterRouter,
	contact: contactRouter,
	expenses: expensesRouter,
	family: familyRouter,
	organizations: organizationsRouter,
	users: usersRouter,
	payments: paymentsRouter,
	ai: aiRouter,
});

export type ApiRouterClient = RouterClient<typeof router>;
