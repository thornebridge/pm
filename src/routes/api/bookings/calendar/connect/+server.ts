import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { getGoogleConfig, getAuthUrl } from '$lib/server/bookings/google-calendar.js';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const config = await getGoogleConfig();
	if (!config) {
		return new Response(JSON.stringify({ error: 'Google Calendar not configured' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const state = nanoid(24);
	event.cookies.set('gcal_state', state, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 600 // 10 minutes
	});

	const redirectUri = `${event.url.origin}/api/bookings/calendar/callback`;
	const authUrl = getAuthUrl(config, redirectUri, state);
	redirect(302, authUrl);
};
