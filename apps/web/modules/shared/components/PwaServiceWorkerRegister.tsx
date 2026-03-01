"use client";

import { useEffect } from "react";

export function PwaServiceWorkerRegister() {
	useEffect(() => {
		if (process.env.NODE_ENV !== "production") {
			return;
		}

		if (!("serviceWorker" in navigator)) {
			return;
		}

		if (
			!window.isSecureContext &&
			window.location.hostname !== "localhost"
		) {
			return;
		}

		navigator.serviceWorker.register("/sw.js").catch(() => {
			// Keep registration failures silent for end users.
		});
	}, []);

	return null;
}
