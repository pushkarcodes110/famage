import { SessionProvider } from "@saas/auth/components/SessionProvider";
import { sessionQueryKey } from "@saas/auth/lib/api";
import { getSession } from "@saas/auth/lib/server";
import { FamageAppShell } from "@saas/famage/components/ui/FamageAppShell";
import { Document } from "@shared/components/Document";
import { getServerQueryClient } from "@shared/lib/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import type { PropsWithChildren } from "react";

export const dynamic = "force-dynamic";

export default async function FamageLayout({ children }: PropsWithChildren) {
	const locale = await getLocale();
	const messages = await getMessages();
	const session = await getSession();
	const queryClient = getServerQueryClient();

	await queryClient.prefetchQuery({
		queryKey: sessionQueryKey,
		queryFn: () => session,
	});

	return (
		<Document locale={locale}>
			<NextIntlClientProvider messages={messages}>
				<HydrationBoundary state={dehydrate(queryClient)}>
					<SessionProvider>
						<FamageAppShell>{children}</FamageAppShell>
					</SessionProvider>
				</HydrationBoundary>
			</NextIntlClientProvider>
		</Document>
	);
}
