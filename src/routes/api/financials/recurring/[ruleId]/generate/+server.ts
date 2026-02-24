import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { generateFromRule } from '$lib/server/financials/recurring-processor.js';

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const result = await generateFromRule(event.params.ruleId, user.id);

	if ('error' in result) {
		return json({ error: result.error }, { status: result.status || 400 });
	}

	return json(result, { status: 201 });
};
