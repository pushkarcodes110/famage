import { BottomNavigation } from "@saas/famage/components/ui/BottomNavigation";
import { FamageUserMenu } from "@saas/famage/components/ui/FamageUserMenu";
import { HouseIcon } from "lucide-react";
import Link from "next/link";
import type { PropsWithChildren } from "react";

export function FamageAppShell({ children }: PropsWithChildren) {
	return (
		<div className="min-h-screen bg-background">
			<div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col">
				<header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 px-4 pb-3 pt-4 backdrop-blur">
					<div className="flex items-center justify-between gap-3">
						<Link
							href="/famage"
							className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-2 shadow-xs"
						>
							<span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
								<HouseIcon className="size-4" />
							</span>
							<span className="font-semibold text-sm tracking-tight">
								FAMAGE
							</span>
						</Link>

						<FamageUserMenu />
					</div>

					<p className="mt-2 text-muted-foreground text-xs">
						Family + Manage expenses with clarity.
					</p>
				</header>

				<main className="flex-1 px-4 pb-32 pt-5">{children}</main>
			</div>

			<BottomNavigation />
		</div>
	);
}
