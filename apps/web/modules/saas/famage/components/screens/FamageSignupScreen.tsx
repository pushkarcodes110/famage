"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@repo/auth/client";
import { config } from "@repo/config";
import { useAuthErrorMessages } from "@saas/auth/hooks/errors-messages";
import { useSession } from "@saas/auth/hooks/use-session";
import { sessionQueryKey } from "@saas/auth/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import {
	AlertTriangleIcon,
	ArrowRightIcon,
	MailboxIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { withQuery } from "ufo";
import { z } from "zod";

const signupFormSchema = z
	.object({
		name: z.string().trim().min(2, "Enter your full name"),
		email: z.string().email("Enter a valid email"),
		password: z.string().min(8, "Password must be at least 8 characters"),
		confirmPassword: z.string().min(8, "Confirm your password"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

type SignupFormValues = z.infer<typeof signupFormSchema>;

export function FamageSignupScreen() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const queryClient = useQueryClient();
	const { getAuthErrorMessage } = useAuthErrorMessages();
	const { user, loaded } = useSession();

	const redirectTo = searchParams.get("redirectTo") ?? "/famage";

	const form = useForm<SignupFormValues>({
		resolver: zodResolver(signupFormSchema),
		defaultValues: {
			name: "",
			email: "",
			password: "",
			confirmPassword: "",
		},
	});

	useEffect(() => {
		if (loaded && user) {
			router.replace(redirectTo);
		}
	}, [loaded, user, redirectTo, router]);

	const onSubmit = form.handleSubmit(async ({ name, email, password }) => {
		const { error } = await authClient.signUp.email({
			name,
			email,
			password,
			callbackURL: redirectTo,
		});

		if (error) {
			form.setError("root", {
				message: getAuthErrorMessage(error.code, error.message),
			});
			return;
		}

		if (config.auth.requireEmailVerification) {
			return;
		}

		await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
		router.replace(redirectTo);
	});

	return (
		<section className="space-y-5">
			<header className="space-y-1">
				<p className="font-medium text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
					Get started
				</p>
				<h1 className="font-semibold text-2xl tracking-tight">Create your FAMAGE account</h1>
			</header>

			{config.auth.requireEmailVerification && form.formState.isSubmitSuccessful ? (
				<Alert variant="success">
					<MailboxIcon />
					<AlertTitle>Verify your email</AlertTitle>
					<AlertDescription>
						We sent you a verification link. Open your inbox to continue.
					</AlertDescription>
				</Alert>
			) : (
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
						<label htmlFor="name" className="font-medium text-xs">
							Full name
						</label>
						<Input id="name" type="text" {...form.register("name")} />
						{form.formState.errors.name ? (
							<p className="text-destructive text-xs">
								{form.formState.errors.name.message}
							</p>
						) : null}
					</div>

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
						<label htmlFor="password" className="font-medium text-xs">
							Password
						</label>
						<Input
							id="password"
							type="password"
							autoComplete="new-password"
							{...form.register("password")}
						/>
						{form.formState.errors.password ? (
							<p className="text-destructive text-xs">
								{form.formState.errors.password.message}
							</p>
						) : null}
					</div>

					<div className="space-y-1">
						<label htmlFor="confirmPassword" className="font-medium text-xs">
							Confirm password
						</label>
						<Input
							id="confirmPassword"
							type="password"
							autoComplete="new-password"
							{...form.register("confirmPassword")}
						/>
						{form.formState.errors.confirmPassword ? (
							<p className="text-destructive text-xs">
								{form.formState.errors.confirmPassword.message}
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
						Create account
					</Button>
				</form>
			)}

			<p className="text-center text-sm">
				<span className="text-muted-foreground">Already have an account? </span>
				<Link
					href={withQuery("/famage/auth/login", { redirectTo })}
					className="font-medium"
				>
					Sign in <ArrowRightIcon className="ml-1 inline size-4" />
				</Link>
			</p>
		</section>
	);
}
