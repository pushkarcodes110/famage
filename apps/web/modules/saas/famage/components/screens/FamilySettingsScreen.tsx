"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@repo/auth/client";
import { useSession } from "@saas/auth/hooks/use-session";
import { getInitials } from "@saas/famage/lib/mock-data";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@ui/components/avatar";
import { Button } from "@ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@ui/components/card";
import { Input } from "@ui/components/input";
import { cn } from "@ui/lib";
import { HouseIcon, MailPlusIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { withQuery } from "ufo";
import { z } from "zod";

const avatarClasses = [
	"bg-amber-100 text-amber-700",
	"bg-sky-100 text-sky-700",
	"bg-emerald-100 text-emerald-700",
	"bg-rose-100 text-rose-700",
	"bg-violet-100 text-violet-700",
	"bg-orange-100 text-orange-700",
] as const;

const familySettingsFormSchema = z.object({
	name: z.string().trim().min(2, "Enter your family name"),
	monthlyBudget: z
		.string()
		.trim()
		.refine((value) => value === "" || /^\d+$/.test(value), {
			message: "Monthly budget must be a whole number",
		}),
});

const inviteMemberFormSchema = z.object({
	email: z.string().trim().email("Enter a valid email"),
});

type FamilySettingsFormValues = z.infer<typeof familySettingsFormSchema>;
type InviteMemberFormValues = z.infer<typeof inviteMemberFormSchema>;

function getErrorMessage(error: unknown, fallback: string): string {
	if (typeof error === "object" && error !== null && "message" in error) {
		const message = (error as { message?: unknown }).message;
		if (typeof message === "string" && message.length > 0) {
			return message;
		}
	}

	return fallback;
}

export function FamilySettingsScreen() {
	const { user, loaded } = useSession();
	const queryClient = useQueryClient();
	const searchParams = useSearchParams();
	const addMemberSectionRef = useRef<HTMLDivElement | null>(null);
	const [isAddMemberHighlighted, setIsAddMemberHighlighted] = useState(false);

	const redirectTo = "/famage/family/settings";
	const loginHref = withQuery("/famage/auth/login", { redirectTo });

	const familyOverviewQuery = useQuery({
		...orpc.family.overview.queryOptions(),
		enabled: Boolean(user),
	});
	const family = familyOverviewQuery.data?.family ?? null;

	const canManageFamilySettings = family?.canManageSettings === true;
	const canManageFamilyMembers = family?.canManageInvites === true;

	const familySettingsForm = useForm<FamilySettingsFormValues>({
		resolver: zodResolver(familySettingsFormSchema),
		defaultValues: {
			name: "",
			monthlyBudget: "",
		},
	});

	const inviteMemberForm = useForm<InviteMemberFormValues>({
		resolver: zodResolver(inviteMemberFormSchema),
		defaultValues: {
			email: "",
		},
	});

	const updateFamilyMutation = useMutation({
		...orpc.family.update.mutationOptions(),
		onSuccess: async () => {
			await queryClient.invalidateQueries();
			toast.success("Family details updated");
		},
		onError: (error) => {
			familySettingsForm.setError("root", {
				message: error.message,
			});
		},
	});

	const inviteMemberMutation = useMutation({
		...orpc.family.inviteMember.mutationOptions(),
		onSuccess: async () => {
			inviteMemberForm.reset();
			await queryClient.invalidateQueries();
			toast.success("Invitation sent");
		},
		onError: (error) => {
			inviteMemberForm.setError("root", {
				message: error.message,
			});
		},
	});

	const removeMemberMutation = useMutation({
		mutationFn: async (memberId: string) => {
			if (!family) {
				throw new Error("Family not found.");
			}

			const { error } = await authClient.organization.removeMember({
				memberIdOrEmail: memberId,
				organizationId: family.id,
			});

			if (error) {
				throw new Error(error.message || "Failed to remove member");
			}
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries();
			toast.success("Member removed");
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to remove member"));
		},
	});

	const cancelInvitationMutation = useMutation({
		mutationFn: async (invitationId: string) => {
			const { error } = await authClient.organization.cancelInvitation({
				invitationId,
			});

			if (error) {
				throw new Error(error.message || "Failed to cancel invitation");
			}
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries();
			toast.success("Invitation canceled");
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to cancel invitation"));
		},
	});

	useEffect(() => {
		if (!family) {
			return;
		}

		familySettingsForm.reset({
			name: family.name,
			monthlyBudget:
				typeof family.monthlyBudget === "number"
					? String(family.monthlyBudget)
					: "",
		});
	}, [family, familySettingsForm]);

	useEffect(() => {
		if (searchParams.get("focus") !== "add-member") {
			return;
		}

		addMemberSectionRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});
		setIsAddMemberHighlighted(true);

		const timeout = window.setTimeout(() => {
			setIsAddMemberHighlighted(false);
		}, 2200);

		return () => {
			window.clearTimeout(timeout);
		};
	}, [searchParams]);

	const familyMembers = useMemo(
		() => family?.members ?? [],
		[family?.members],
	);
	const pendingInvitations = useMemo(
		() => family?.pendingInvitations ?? [],
		[family?.pendingInvitations],
	);

	const onSubmitFamilySettings = familySettingsForm.handleSubmit((values) => {
		updateFamilyMutation.mutate({
			name: values.name,
			monthlyBudget:
				values.monthlyBudget === ""
					? undefined
					: Number.parseInt(values.monthlyBudget, 10),
		});
	});

	const onSubmitInviteMember = inviteMemberForm.handleSubmit((values) => {
		inviteMemberMutation.mutate({
			email: values.email,
		});
	});

	if (loaded && !user) {
		return (
			<section className="space-y-5">
				<header className="space-y-1">
					<p className="font-medium text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
						Family settings
					</p>
					<h1 className="font-semibold text-2xl tracking-tight">
						Manage your family
					</h1>
				</header>

				<Card className="border-dashed bg-card/70">
					<CardContent className="space-y-3 p-4 text-center">
						<p className="font-medium text-sm">
							Sign in to manage family settings
						</p>
						<Button
							asChild
							variant="outline"
							className="h-10 rounded-xl"
						>
							<Link href={loginHref}>Sign in</Link>
						</Button>
					</CardContent>
				</Card>
			</section>
		);
	}

	if (user && familyOverviewQuery.isLoading) {
		return (
			<section className="space-y-5">
				<header className="space-y-1">
					<p className="font-medium text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
						Family settings
					</p>
					<h1 className="font-semibold text-2xl tracking-tight">
						Manage your family
					</h1>
				</header>

				<Card>
					<CardContent className="p-4 text-center text-sm text-muted-foreground">
						Loading family settings...
					</CardContent>
				</Card>
			</section>
		);
	}

	if (user && !family) {
		return (
			<section className="space-y-5">
				<header className="space-y-1">
					<p className="font-medium text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
						Family settings
					</p>
					<h1 className="font-semibold text-2xl tracking-tight">
						Manage your family
					</h1>
				</header>

				<Card className="border-dashed">
					<CardContent className="space-y-3 p-4 text-center">
						<p className="font-medium text-sm">
							You need a family group before using settings.
						</p>
						<Button
							asChild
							variant="outline"
							className="h-10 rounded-xl"
						>
							<Link href="/famage/family">Go to family page</Link>
						</Button>
					</CardContent>
				</Card>
			</section>
		);
	}

	return (
		<section className="space-y-5">
			<header className="space-y-1">
				<p className="font-medium text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
					Family settings
				</p>
				<h1 className="font-semibold text-2xl tracking-tight">
					Manage your family
				</h1>
			</header>

			<Card className="border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card">
				<CardHeader className="pb-3">
					<div className="flex items-center gap-2">
						<span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
							<HouseIcon className="size-4" />
						</span>
						<div>
							<CardTitle className="text-lg">
								{family?.name}
							</CardTitle>
							<CardDescription>
								{family?.members.length ?? 0} family members
							</CardDescription>
						</div>
					</div>
				</CardHeader>
			</Card>

			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-lg">Family details</CardTitle>
					<CardDescription>
						Update your family name and monthly budget.
					</CardDescription>
				</CardHeader>

				<CardContent>
					{canManageFamilySettings ? (
						<form
							className="space-y-3"
							onSubmit={onSubmitFamilySettings}
						>
							<div className="space-y-1">
								<label
									htmlFor="family-settings-name"
									className="font-medium text-xs"
								>
									Family name
								</label>
								<Input
									id="family-settings-name"
									type="text"
									{...familySettingsForm.register("name")}
								/>
								{familySettingsForm.formState.errors.name ? (
									<p className="text-destructive text-xs">
										{
											familySettingsForm.formState.errors
												.name.message
										}
									</p>
								) : null}
							</div>

							<div className="space-y-1">
								<label
									htmlFor="family-settings-monthly-budget"
									className="font-medium text-xs"
								>
									Monthly budget
								</label>
								<Input
									id="family-settings-monthly-budget"
									inputMode="numeric"
									placeholder="Ex: 50000"
									{...familySettingsForm.register(
										"monthlyBudget",
									)}
								/>
								{familySettingsForm.formState.errors
									.monthlyBudget ? (
									<p className="text-destructive text-xs">
										{
											familySettingsForm.formState.errors
												.monthlyBudget.message
										}
									</p>
								) : null}
							</div>

							{familySettingsForm.formState.errors.root
								?.message ? (
								<p className="text-destructive text-xs">
									{
										familySettingsForm.formState.errors.root
											.message
									}
								</p>
							) : null}

							<Button
								type="submit"
								variant="primary"
								size="lg"
								className="h-12 w-full rounded-2xl font-semibold"
								loading={updateFamilyMutation.isPending}
							>
								Save family details
							</Button>
						</form>
					) : (
						<p className="text-muted-foreground text-sm">
							Only the family creator can edit these details.
						</p>
					)}
				</CardContent>
			</Card>

			<div
				id="add-member"
				ref={addMemberSectionRef}
				className={cn(
					"scroll-mt-24 transition-shadow",
					isAddMemberHighlighted &&
						"rounded-xl ring-2 ring-primary/40",
				)}
			>
				<Card>
					<CardHeader className="pb-2">
						<div className="flex items-center gap-2">
							<MailPlusIcon className="size-4 text-primary" />
							<CardTitle className="text-lg">
								Add family member
							</CardTitle>
						</div>
						<CardDescription>
							Send invites to existing app users.
						</CardDescription>
					</CardHeader>

					<CardContent>
						{canManageFamilyMembers ? (
							<form
								className="space-y-3"
								onSubmit={onSubmitInviteMember}
							>
								<div className="space-y-1">
									<label
										htmlFor="invite-member-email"
										className="font-medium text-xs"
									>
										Email
									</label>
									<Input
										id="invite-member-email"
										type="email"
										placeholder="member@example.com"
										{...inviteMemberForm.register("email")}
									/>
									{inviteMemberForm.formState.errors.email ? (
										<p className="text-destructive text-xs">
											{
												inviteMemberForm.formState
													.errors.email.message
											}
										</p>
									) : null}
								</div>

								{inviteMemberForm.formState.errors.root
									?.message ? (
									<p className="text-destructive text-xs">
										{
											inviteMemberForm.formState.errors
												.root.message
										}
									</p>
								) : null}

								<Button
									type="submit"
									className="w-full"
									loading={inviteMemberMutation.isPending}
								>
									Send invite
								</Button>
							</form>
						) : (
							<p className="text-muted-foreground text-sm">
								Only family admins can invite members.
							</p>
						)}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader className="pb-2">
					<div className="flex items-center gap-2">
						<UsersIcon className="size-4 text-primary" />
						<CardTitle className="text-lg">
							Family members
						</CardTitle>
					</div>
					<CardDescription>
						View members and remove access when needed.
					</CardDescription>
				</CardHeader>

				<CardContent className="space-y-2">
					{familyMembers.map((member, index) => (
						<div
							key={member.userId}
							className="flex items-center justify-between rounded-2xl border bg-card px-3 py-2"
						>
							<div className="flex items-center gap-2">
								<Avatar className="size-9 rounded-full">
									<AvatarFallback
										className={cn(
											"rounded-full font-semibold text-[11px]",
											avatarClasses[
												index % avatarClasses.length
											],
										)}
									>
										{getInitials(member.name)}
									</AvatarFallback>
								</Avatar>
								<div>
									<p className="font-medium text-sm">
										{member.name}
									</p>
									<p className="text-muted-foreground text-xs">
										{member.email} • {member.role}
									</p>
								</div>
							</div>

							{canManageFamilyMembers &&
							member.userId !== user?.id ? (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => {
										if (
											window.confirm(
												`Remove ${member.name} from family?`,
											)
										) {
											removeMemberMutation.mutate(
												member.id,
											);
										}
									}}
									loading={removeMemberMutation.isPending}
								>
									Remove
								</Button>
							) : (
								<span className="text-muted-foreground text-xs">
									{member.userId === user?.id
										? "You"
										: "Member"}
								</span>
							)}
						</div>
					))}
				</CardContent>
			</Card>

			{pendingInvitations.length > 0 ? (
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-lg">
							Pending invitations
						</CardTitle>
						<CardDescription>
							Track and revoke outstanding invitations.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						{pendingInvitations.map((invitation) => (
							<div
								key={invitation.id}
								className="flex items-center justify-between rounded-2xl border bg-card px-3 py-2"
							>
								<div>
									<p className="font-medium text-sm">
										{invitation.email}
									</p>
									<p className="text-muted-foreground text-xs">
										Expires on{" "}
										{new Date(
											invitation.expiresAt,
										).toLocaleDateString("en-IN")}
									</p>
								</div>
								{canManageFamilyMembers ? (
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() =>
											cancelInvitationMutation.mutate(
												invitation.id,
											)
										}
										loading={
											cancelInvitationMutation.isPending
										}
									>
										Cancel
									</Button>
								) : null}
							</div>
						))}
					</CardContent>
				</Card>
			) : null}
		</section>
	);
}
