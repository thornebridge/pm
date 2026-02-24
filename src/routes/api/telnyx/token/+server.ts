import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { getTelnyxConfig, generateWebRtcToken } from '$lib/server/telnyx/index.js';

/** GET — generate a short-lived WebRTC JWT for the browser */
export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const config = getTelnyxConfig();
	if (!config) {
		return json({ error: 'Telnyx integration is not configured' }, { status: 503 });
	}

	try {
		const token = await generateWebRtcToken(config);
		return json({
			token,
			callerNumbers: config.callerNumbers,
			recordCalls: config.recordCalls
		});
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : 'Failed to generate token' }, { status: 500 });
	}
};
