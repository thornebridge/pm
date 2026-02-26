import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { apiKeys } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const DELETE: RequestHandler = async (event) => {
	requireAdmin(event);

	const { keyId } = event.params;

	const [deleted] = await db
		.delete(apiKeys)
		.where(eq(apiKeys.id, keyId))
		.returning({ id: apiKeys.id });

	if (!deleted) {
		return json({ error: 'API key not found' }, { status: 404 });
	}

	return json({ ok: true });
};
