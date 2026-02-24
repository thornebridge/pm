import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/auth/guard.js';
import { validateTelnyxCredentials } from '$lib/server/telnyx/index.js';

/** POST — test Telnyx credentials */
export const POST: RequestHandler = async (event) => {
	requireAdmin(event);
	const body = await event.request.json();

	const { apiKey, credentialId } = body;
	if (!apiKey || !credentialId) {
		return json({ valid: false, error: 'API Key and Credential ID are required' }, { status: 400 });
	}

	const result = await validateTelnyxCredentials(apiKey, credentialId);
	return json(result);
};
