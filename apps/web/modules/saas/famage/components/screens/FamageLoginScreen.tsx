"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@repo/auth/client";
import { useAuthErrorMessages } from "@saas/auth/hooks/errors-messages";
import { useSession } from "@saas/auth/hooks/use-session";
import { sessionQueryKey } from "@saas/auth/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { AlertTriangleIcon, ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { withQuery } from "ufo";
import { z } from "zod";

const loginFormSchema = z.object({
	email: z.string().email("Enter a valid email"),
	password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function FamageLoginScreen() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const queryClient = useQueryClient();
	const { getAuthErrorMessage } = useAuthErrorMessages();
	const { user, loaded } = useSession();

	const invitationId = searchParams.get("invitationId");
	const redirectTo = searchParams.get("redirectTo") ?? "/famage";
	const redirectPath = invitationId
		? `/organization-invitation/${invitationId}`
		: redirectTo;

	const form = useForm<LoginFormValues>({
		resolver: zodResolver(loginFormSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	useEffect(() => {
		if (loaded && user) {
			router.replace(redirectPath);
		}
	}, [loaded, user, redirectPath, router]);

	const onSubmit = form.handleSubmit(async (values) => {
		const { data, error } = await authClient.signIn.email(values);

		if (error) {
			form.setError("root", {
				message: getAuthErrorMessage(error.code, error.message),
			});
			return;
		}

		if ((data as any).twoFactorRedirect) {
			router.replace(
				withQuery(
					"/auth/verify",
					Object.fromEntries(searchParams.entries()),
				),
			);
			return;
		}

		await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
		router.replace(redirectPath);
	});

	return (
		<section className="space-y-5">
			<header className="space-y-1">
				<p className="font-medium text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
					Welcome back
				</p>
				<h1 className="font-semibold text-2xl tracking-tight">
					Sign in to FAMAGE
				</h1>
			</header>

			<form className="space-y-4" onSubmit={onSubmit}>
				{form.formState.errors.root?.message ? (
					<Alert variant="error">
						<AlertTriangleIcon />
						<AlertDescription>
							{form.formState.errors.root.message}
						</AlertDescription>
					</Alert>
				) : null}

				<div className="space-y-1">
					<label htmlFor="email" className="font-medium text-xs">
						Email
					</label>
					<Input
						id="email"
						type="email"
						autoComplete="email"
						{...form.register("email")}
					/>
					{form.formState.errors.email ? (
						<p className="text-destructive text-xs">
							{form.formState.errors.email.message}
						</p>
					) : null}
				</div>

				<div className="space-y-1">
					<div className="flex items-center justify-between gap-3">
						<label
							htmlFor="password"
							className="font-medium text-xs"
						>
							Password
						</label>
						<Link
							href="/famage/auth/forgot-password"
							className="text-muted-foreground text-xs"
						>
							Forgot?
						</Link>
					</div>
					<Input
						id="password"
						type="password"
						autoComplete="current-password"
						{...form.register("password")}
					/>
					{form.formState.errors.password ? (
						<p className="text-destructive text-xs">
							{form.formState.errors.password.message}
						</p>
					) : null}
				</div>

				<Button
					type="submit"
					size="lg"
					variant="primary"
					className="h-12 w-full rounded-2xl font-semibold"
					loading={form.formState.isSubmitting}
				>
					Sign in
				</Button>
			</form>

			<p className="text-center text-sm">
				<span className="text-muted-foreground">No account yet? </span>
				<Link
					href={withQuery("/famage/auth/signup", { redirectTo })}
					className="font-medium"
				>
					Create one <ArrowRightIcon className="ml-1 inline size-4" />
				</Link>
			</p>
		</section>
	);
}
