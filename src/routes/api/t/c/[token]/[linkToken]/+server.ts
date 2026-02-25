import type { RequestHandler } from './$types';
import { getOriginalUrl, recordClickEvent } from '$lib/server/gmail/tracking.js';

export const GET: RequestHandler = async (event) => {
	const { token, linkToken } = event.params;

	const originalUrl = await getOriginalUrl(token, linkToken);

	if (originalUrl) {
		recordClickEvent(
			token,
			linkToken,
			originalUrl,
			event.getClientAddress(),
			event.request.headers.get('user-agent')
		).catch(() => {});
	}

	const redirectTo = originalUrl || '/';
	return new Response(null, {
		status: 302,
		headers: { 'Location': redirectTo }
	});
};
