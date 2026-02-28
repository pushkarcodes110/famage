import { config } from "@repo/config";
import nodemailer from "nodemailer";
import type { SendEmailHandler } from "../../types";

const { from } = config.mails;

export const send: SendEmailHandler = async ({ to, subject, text, html }) => {
	const host = process.env.MAIL_HOST as string;
	const port = Number.parseInt(process.env.MAIL_PORT as string, 10);
	const user = process.env.MAIL_USER as string;
	const pass = process.env.MAIL_PASS as string;

	if (!host || !port || !user || !pass) {
		throw new Error(
			"MAIL_HOST, MAIL_PORT, MAIL_USER and MAIL_PASS must be set",
		);
	}

	const secure =
		process.env.MAIL_SECURE === "true" ||
		(!process.env.MAIL_SECURE && port === 465);

	const transporter = nodemailer.createTransport({
		host,
		port,
		secure,
		auth: {
			user,
			pass,
		},
	});

	await transporter.sendMail({
		to,
		from,
		subject,
		text,
		html,
	});
};
