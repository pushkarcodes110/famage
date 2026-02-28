import { send as sendWithMailgun } from "./mailgun";
import { send as sendWithNodemailer } from "./nodemailer";
import { send as sendWithPlunk } from "./plunk";
import { send as sendWithPostmark } from "./postmark";
import { send as sendWithResend } from "./resend";

const provider = (process.env.MAIL_PROVIDER ?? "").trim().toLowerCase();

function getProvider() {
	if (provider === "resend" || (!provider && process.env.RESEND_API_KEY)) {
		return {
			name: "resend",
			send: sendWithResend,
		} as const;
	}

	if (provider === "postmark") {
		return {
			name: "postmark",
			send: sendWithPostmark,
		} as const;
	}

	if (provider === "plunk") {
		return {
			name: "plunk",
			send: sendWithPlunk,
		} as const;
	}

	if (provider === "mailgun") {
		return {
			name: "mailgun",
			send: sendWithMailgun,
		} as const;
	}

	return {
		name: "nodemailer",
		send: sendWithNodemailer,
	} as const;
}

const selectedProvider = getProvider();

export const activeProviderName = selectedProvider.name;
export const send = selectedProvider.send;
