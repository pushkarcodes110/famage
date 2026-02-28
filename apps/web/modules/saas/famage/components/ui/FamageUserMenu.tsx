"use client";

import { authClient } from "@repo/auth/client";
import { useSession } from "@saas/auth/hooks/use-session";
import { UserAvatar } from "@shared/components/UserAvatar";
import { Button } from "@ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import {
	CircleUserRoundIcon,
	LogInIcon,
	LogOutIcon,
	UserPenIcon,
	UserPlusIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { withQuery } from "ufo";

export function FamageUserMenu() {
	const pathname = usePathname();
	const { loaded, user } = useSession();

	const redirectTo = pathname || "/famage";
	const loginHref = withQuery("/famage/auth/login", { redirectTo });
	const signupHref = withQuery("/famage/auth/signup", { redirectTo });

	function onLogout() {
		authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					window.location.href = "/famage";
				},
			},
		});
	}

	if (!loaded) {
		return <div className="size-9 animate-pulse rounded-full bg-muted" />;
	}

	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					size="icon"
					variant="light"
					className="size-9 rounded-full"
					aria-label="Profile menu"
				>
					{user ? (
						<UserAvatar
							name={user.name || "Famage User"}
							avatarUrl={user.image}
							className="size-8 rounded-full"
						/>
					) : (
						<CircleUserRoundIcon className="size-4" />
					)}
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" className="w-56">
				{user ? (
					<>
						<DropdownMenuLabel>
							{user.name}
							<span className="block font-normal text-xs opacity-70">
								{user.email}
							</span>
						</DropdownMenuLabel>

						<DropdownMenuSeparator />

						<DropdownMenuItem asChild>
							<Link href="/famage/profile">
								<UserPenIcon className="mr-2 size-4" />
								Edit profile
							</Link>
						</DropdownMenuItem>

						<DropdownMenuItem onClick={onLogout}>
							<LogOutIcon className="mr-2 size-4" />
							Logout
						</DropdownMenuItem>
					</>
				) : (
					<>
						<DropdownMenuLabel>Welcome to FAMAGE</DropdownMenuLabel>

						<DropdownMenuSeparator />

						<DropdownMenuItem asChild>
							<Link href={loginHref}>
								<LogInIcon className="mr-2 size-4" />
								Sign in
							</Link>
						</DropdownMenuItem>

						<DropdownMenuItem asChild>
							<Link href={signupHref}>
								<UserPlusIcon className="mr-2 size-4" />
								Create account
							</Link>
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
