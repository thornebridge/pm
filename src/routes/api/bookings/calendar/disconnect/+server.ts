import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { calendarIntegrations } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	await db.delete(calendarIntegrations).where(eq(calendarIntegrations.userId, user.id));
	return json({ success: true });
};
