import { json, type RequestHandler } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth/guard.js';
import { testAIConnection } from '$lib/server/ai/providers.js';

export const POST: RequestHandler = async (event) => {
	requireAdmin(event);
	const body = await event.request.json();
	const { provider, apiKey, model, endpoint } = body;

	if (!provider || !apiKey) {
		return json({ valid: false, error: 'Provider and API key are required' }, { status: 400 });
	}

	const result = await testAIConnection({ provider, apiKey, model: model || '', endpoint: endpoint || '' });
	return json(result);
};
