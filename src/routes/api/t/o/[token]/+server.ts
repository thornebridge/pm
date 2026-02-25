import type { RequestHandler } from './$types';
import { recordOpenEvent } from '$lib/server/gmail/tracking.js';

const PIXEL = Buffer.from(
	'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
	'base64'
);

export const GET: RequestHandler = async (event) => {
	const token = event.params.token;

	// Fire-and-forget: record event without blocking the pixel response
	recordOpenEvent(
		token,
		event.getClientAddress(),
		event.request.headers.get('user-agent')
	).catch(() => {});

	return new Response(PIXEL, {
		headers: {
			'Content-Type': 'image/gif',
			'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
			'Pragma': 'no-cache',
			'Expires': '0'
		}
	});
};
