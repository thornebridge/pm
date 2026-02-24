import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { calendarIntegrations } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { getGoogleConfig, exchangeCodeForTokens } from '$lib/server/bookings/google-calendar.js';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const code = event.url.searchParams.get('code');
	const state = event.url.searchParams.get('state');
	const error = event.url.searchParams.get('error');

	if (error) {
		console.error('[google-calendar] OAuth error:', error);
		redirect(302, '/bookings?error=oauth_denied');
	}

	const storedState = event.cookies.get('gcal_state');
	event.cookies.delete('gcal_state', { path: '/' });

	if (!code || !state || state !== storedState) {
		redirect(302, '/bookings?error=oauth_invalid');
	}

	const config = getGoogleConfig();
	if (!config) {
		redirect(302, '/bookings?error=not_configured');
	}

	try {
		const redirectUri = `${event.url.origin}/api/bookings/calendar/callback`;
		const tokens = await exchangeCodeForTokens(config, code, redirectUri);
		const now = Date.now();

		// Upsert: delete existing then insert
		db.delete(calendarIntegrations).where(eq(calendarIntegrations.userId, user.id)).run();
		db.insert(calendarIntegrations)
			.values({
				id: nanoid(12),
				userId: user.id,
				provider: 'google',
				accessToken: tokens.accessToken,
				refreshToken: tokens.refreshToken,
				tokenExpiry: now + tokens.expiresIn * 1000,
				calendarId: 'primary',
				createdAt: now,
				updatedAt: now
			})
			.run();

		redirect(302, '/bookings?success=calendar_connected');
	} catch (err) {
		console.error('[google-calendar] Token exchange failed:', err);
		redirect(302, '/bookings?error=token_exchange');
	}
};
