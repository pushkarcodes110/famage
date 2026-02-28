"use client";

import { cn } from "@ui/lib";
import {
	BarChart3Icon,
	HomeIcon,
	PlusCircleIcon,
	UsersIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavigationItem {
	href: string;
	label: string;
	icon: LucideIcon;
}

const navigationItems: NavigationItem[] = [
	{
		href: "/famage",
		label: "Home",
		icon: HomeIcon,
	},
	{
		href: "/famage/add-expense",
		label: "Add Expense",
		icon: PlusCircleIcon,
	},
	{
		href: "/famage/reports",
		label: "Reports",
		icon: BarChart3Icon,
	},
	{
		href: "/famage/family",
		label: "Family",
		icon: UsersIcon,
	},
];

function isNavigationItemActive(pathname: string, href: string): boolean {
	if (href === "/famage") {
		return pathname === href;
	}

	return pathname.startsWith(href);
}

export function BottomNavigation() {
	const pathname = usePathname();

	return (
		<div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
			<nav
				aria-label="Bottom navigation"
				className="pointer-events-auto w-full max-w-[430px] rounded-3xl border bg-card/95 p-2 shadow-lg backdrop-blur"
			>
				<ul className="grid grid-cols-4 gap-1">
					{navigationItems.map((item) => {
						const isActive = isNavigationItemActive(pathname, item.href);
						const Icon = item.icon;

						return (
							<li key={item.href}>
								<Link
									href={item.href}
									className={cn(
										"flex h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-center text-[11px] font-medium transition-colors",
										isActive
											? "bg-primary text-primary-foreground"
											: "text-muted-foreground",
									)}
								>
									<Icon className="size-4" />
									<span className="leading-none">{item.label}</span>
								</Link>
							</li>
						);
					})}
				</ul>
			</nav>
		</div>
	);
}
