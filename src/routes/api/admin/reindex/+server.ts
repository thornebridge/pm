import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/auth/guard.js';
import { reindexAll } from '$lib/server/search/reindex.js';
import { isMeilisearchEnabled } from '$lib/server/search/meilisearch.js';

export const POST: RequestHandler = async (event) => {
	requireAdmin(event);

	if (!isMeilisearchEnabled()) {
		return json({ error: 'Meilisearch is not configured' }, { status: 503 });
	}

	const counts = await reindexAll();
	return json({ ok: true, counts });
};
