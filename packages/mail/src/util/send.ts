import { config } from "@repo/config";
import { logger } from "@repo/logs";
import type { mailTemplates } from "../../emails";
import { activeProviderName, send } from "../provider";
import type { TemplateId } from "./templates";
import { getTemplate } from "./templates";

export async function sendEmail<T extends TemplateId>(
	params: {
		to: string;
		locale?: keyof typeof config.i18n.locales;
	} & (
		| {
				templateId: T;
				context: Omit<
					Parameters<(typeof mailTemplates)[T]>[0],
					"locale" | "translations"
				>;
		  }
		| {
				subject: string;
				text?: string;
				html?: string;
		  }
	),
) {
	const { to, locale = config.i18n.defaultLocale } = params;

	let html: string;
	let text: string;
	let subject: string;

	if ("templateId" in params) {
		const { templateId, context } = params;
		const template = await getTemplate({
			templateId,
			context,
			locale,
		});
		subject = template.subject;
		text = template.text;
		html = template.html;
	} else {
		subject = params.subject;
		text = params.text ?? "";
		html = params.html ?? "";
	}

	try {
		logger.info("Attempting to send email", {
			provider: activeProviderName,
			to,
			subject,
			templateId: "templateId" in params ? params.templateId : "custom",
			locale,
		});

		await send({
			to,
			subject,
			text,
			html,
		});

		logger.info("Email send completed", {
			provider: activeProviderName,
			to,
			subject,
		});
		return true;
	} catch (e) {
		logger.error("Email send failed", {
			provider: activeProviderName,
			to,
			subject,
			error: e instanceof Error ? e.message : String(e),
		});
		return false;
	}
}
