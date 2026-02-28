"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@repo/auth/client";
import { useAuthErrorMessages } from "@saas/auth/hooks/errors-messages";
import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { AlertTriangleIcon, ArrowLeftIcon, MailboxIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

const resetPasswordFormSchema = z.object({
	password: z.string().min(8, "Password must be at least 8 characters"),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

export function FamageResetPasswordScreen() {
	const { getAuthErrorMessage } = useAuthErrorMessages();
	const searchParams = useSearchParams();
	const token = searchParams.get("token");

	const form = useForm<ResetPasswordFormValues>({
		resolver: zodResolver(resetPasswordFormSchema),
		defaultValues: {
			password: "",
		},
	});

	const onSubmit = form.handleSubmit(async ({ password }) => {
		try {
			const { error } = await authClient.resetPassword({
				token: token ?? undefined,
				newPassword: password,
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
					Set a new password
				</h1>
			</header>

			{form.formState.isSubmitSuccessful ? (
				<Alert variant="success">
					<MailboxIcon />
					<AlertTitle>Password updated</AlertTitle>
					<AlertDescription>
						Your password has been reset. Sign in with your new
						password.
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
						<label
							htmlFor="password"
							className="font-medium text-xs"
						>
							New password
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

					<Button
						type="submit"
						size="lg"
						variant="primary"
						className="h-12 w-full rounded-2xl font-semibold"
						loading={form.formState.isSubmitting}
					>
						Update password
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
