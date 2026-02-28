import { handle } from "hono/vercel";

async function handler(request: Request) {
	const { app } = await import("@repo/api");
	const routeHandler = handle(app);

	return routeHandler(request);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
