"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@repo/auth/client";
import { useAuthErrorMessages } from "@saas/auth/hooks/errors-messages";
import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { AlertTriangleIcon, ArrowLeftIcon, MailboxIcon } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";

const forgotPasswordFormSchema = z.object({
	email: z.string().trim().email("Enter a valid email"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;

export function FamageForgotPasswordScreen() {
	const { getAuthErrorMessage } = useAuthErrorMessages();

	const form = useForm<ForgotPasswordFormValues>({
		resolver: zodResolver(forgotPasswordFormSchema),
		defaultValues: {
			email: "",
		},
	});

	const onSubmit = form.handleSubmit(async ({ email }) => {
		try {
			const redirectTo = new URL(
				"/famage/auth/reset-password",
				window.location.origin,
			).toString();

			const { error } = await authClient.requestPasswordReset({
				email,
				redirectTo,
			});

			if (error) {
				throw error;
			}
		} catch (error) {
			form.setError("root", {
				message: getAuthErrorMessage(
					error && typeof error === "object" && "code" in error
						? (error.code as string)
						: undefined,
				),
			});
		}
	});

	return (
		<section className="space-y-5">
			<header className="space-y-1">
				<p className="font-medium text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
					Password reset
				</p>
				<h1 className="font-semibold text-2xl tracking-tight">
					Forgot password?
				</h1>
			</header>

			{form.formState.isSubmitSuccessful ? (
				<Alert variant="success">
					<MailboxIcon />
					<AlertTitle>Reset link sent</AlertTitle>
					<AlertDescription>
						Check your inbox for a secure password reset link.
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

					<Button
						type="submit"
						size="lg"
						variant="primary"
						className="h-12 w-full rounded-2xl font-semibold"
						loading={form.formState.isSubmitting}
					>
						Send reset link
					</Button>
				</form>
			)}

			<p className="text-center text-sm">
				<Link href="/famage/auth/login" className="font-medium">
					<ArrowLeftIcon className="mr-1 inline size-4" />
					Back to sign in
				</Link>
			</p>
		</section>
	);
}
