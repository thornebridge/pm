import { json, type RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guard.js';
import { processAllDueRules } from '$lib/server/financials/recurring-processor.js';

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const results = await processAllDueRules(user.id);

	return json({ processed: results.length, results });
};
