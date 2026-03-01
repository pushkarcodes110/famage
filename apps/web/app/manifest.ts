import { config } from "@repo/config";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: config.appName,
		short_name: config.appName,
		description: `${config.appName} - family finance tracking`,
		start_url: "/",
		scope: "/",
		display: "standalone",
		background_color: "#0b0f14",
		theme_color: "#0b0f14",
		icons: [
			{
				src: "/icon.svg",
				sizes: "any",
				type: "image/svg+xml",
				purpose: "any",
			},
		],
	};
}
