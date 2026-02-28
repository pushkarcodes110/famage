"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@repo/auth/client";
import { useSession } from "@saas/auth/hooks/use-session";
import { Button } from "@ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@ui/components/card";
import { Input } from "@ui/components/input";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";

const profileFormSchema = z.object({
	name: z.string().trim().min(2, "Please enter your name"),
	age: z.preprocess(
		(value) => {
			if (value === "" || value === null || value === undefined) {
				return undefined;
			}

			const parsed = Number(value);
			return Number.isNaN(parsed) ? value : parsed;
		},
		z
			.number()
			.int("Age must be a whole number")
			.min(13, "Age must be at least 13")
			.max(120, "Age must be below 120")
			.optional(),
	),
	dateOfBirth: z.string().optional(),
	phoneNumber: z.string().max(20, "Phone number is too long").optional(),
	city: z.string().max(80, "City is too long").optional(),
});

export function ProfileEditorScreen() {
	const { user, reloadSession } = useSession();

	const form = useForm({
		resolver: zodResolver(profileFormSchema),
		defaultValues: {
			name: user?.name ?? "",
			age: user?.age ?? undefined,
			dateOfBirth: user?.dateOfBirth ?? "",
			phoneNumber: user?.phoneNumber ?? "",
			city: user?.city ?? "",
		},
	});

	const onSubmit = form.handleSubmit(async (values) => {
		const { error } = await authClient.updateUser({
			name: values.name.trim(),
			age: values.age,
			dateOfBirth: values.dateOfBirth || undefined,
			phoneNumber: values.phoneNumber?.trim() || undefined,
			city: values.city?.trim() || undefined,
		});

		if (error) {
			toast.error(error.message || "Failed to update profile");
			return;
		}

		await reloadSession();

		form.reset({
			name: values.name.trim(),
			age: values.age,
			dateOfBirth: values.dateOfBirth || "",
			phoneNumber: values.phoneNumber?.trim() || "",
			city: values.city?.trim() || "",
		});

		toast.success("Profile updated");
	});

	return (
		<section className="space-y-5">
			<header className="space-y-1">
				<p className="font-medium text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
					Profile
				</p>
				<h1 className="font-semibold text-2xl tracking-tight">Edit profile</h1>
			</header>

			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-lg">Personal details</CardTitle>
					<CardDescription>
						Keep your family profile up to date.
					</CardDescription>
				</CardHeader>

				<CardContent>
					<form className="space-y-3" onSubmit={onSubmit}>
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
								value={user?.email ?? ""}
								disabled
							/>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1">
								<label htmlFor="age" className="font-medium text-xs">
									Age
								</label>
								<Input
									id="age"
									type="number"
									inputMode="numeric"
									min={13}
									max={120}
									{...form.register("age")}
								/>
								{form.formState.errors.age ? (
									<p className="text-destructive text-xs">
										{form.formState.errors.age.message as string}
									</p>
								) : null}
							</div>

							<div className="space-y-1">
								<label htmlFor="dateOfBirth" className="font-medium text-xs">
									Date of birth
								</label>
								<Input
									id="dateOfBirth"
									type="date"
									{...form.register("dateOfBirth")}
								/>
							</div>
						</div>

						<div className="space-y-1">
							<label htmlFor="phoneNumber" className="font-medium text-xs">
								Phone number
							</label>
							<Input
								id="phoneNumber"
								type="tel"
								placeholder="+91 98765 43210"
								{...form.register("phoneNumber")}
							/>
							{form.formState.errors.phoneNumber ? (
								<p className="text-destructive text-xs">
									{form.formState.errors.phoneNumber.message}
								</p>
							) : null}
						</div>

						<div className="space-y-1">
							<label htmlFor="city" className="font-medium text-xs">
								City
							</label>
							<Input id="city" type="text" {...form.register("city")} />
							{form.formState.errors.city ? (
								<p className="text-destructive text-xs">
									{form.formState.errors.city.message}
								</p>
							) : null}
						</div>

						<Button
							type="submit"
							variant="primary"
							size="lg"
							className="h-12 w-full rounded-2xl font-semibold"
							loading={form.formState.isSubmitting}
						>
							Save profile
						</Button>
					</form>
				</CardContent>
			</Card>
		</section>
	);
}
