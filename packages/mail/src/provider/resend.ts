import { config } from "@repo/config";
import { logger } from "@repo/logs";
import { Resend } from "resend";
import type { SendEmailHandler } from "../../types";

const resend = new Resend(process.env.RESEND_API_KEY);

const { from } = config.mails;

export const send: SendEmailHandler = async ({ to, subject, html, text }) => {
	if (!process.env.RESEND_API_KEY) {
		throw new Error("RESEND_API_KEY must be set when using Resend");
	}

	const response = await resend.emails.send({
		from,
		to: [to],
		subject,
		html,
		text,
	});

	if (response.error) {
		logger.error("Resend send failed", {
			to,
			subject,
			errorName: response.error.name,
			errorMessage: response.error.message,
		});

		throw new Error(`Resend send failed: ${response.error.message}`);
	}

	logger.info("Resend send success", {
		to,
		subject,
		id: response.data?.id,
	});
};
