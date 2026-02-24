import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { getGoogleConfig, getAuthUrl } from '$lib/server/google-auth.js';
import { nanoid } from 'nanoid';

const GMAIL_SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const config = getGoogleConfig();
	if (!config) {
		return new Response(JSON.stringify({ error: 'Google OAuth not configured' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const state = nanoid(24);
	event.cookies.set('gmail_state', state, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 600
	});

	const redirectUri = `${event.url.origin}/api/crm/gmail/callback`;
	const authUrl = getAuthUrl(config, redirectUri, state, GMAIL_SCOPES);
	redirect(302, authUrl);
};
