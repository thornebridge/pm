import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { gmailIntegrations } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { getGoogleConfig, exchangeCodeForTokens } from '$lib/server/google-auth.js';
import { getProfile } from '$lib/server/gmail/gmail-api.js';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const code = event.url.searchParams.get('code');
	const state = event.url.searchParams.get('state');
	const error = event.url.searchParams.get('error');

	if (error) {
		console.error('[gmail] OAuth error:', error);
		redirect(302, '/crm/email?error=oauth_denied');
	}

	const storedState = event.cookies.get('gmail_state');
	event.cookies.delete('gmail_state', { path: '/' });

	if (!code || !state || state !== storedState) {
		redirect(302, '/crm/email?error=oauth_invalid');
	}

	const config = getGoogleConfig();
	if (!config) {
		redirect(302, '/crm/email?error=not_configured');
	}

	try {
		const redirectUri = `${event.url.origin}/api/crm/gmail/callback`;
		const tokens = await exchangeCodeForTokens(config, code, redirectUri);
		const now = Date.now();

		// Upsert: delete existing then insert
		db.delete(gmailIntegrations).where(eq(gmailIntegrations.userId, user.id)).run();
		const integrationId = nanoid(12);
		db.insert(gmailIntegrations)
			.values({
				id: integrationId,
				userId: user.id,
				email: '', // will be updated below
				accessToken: tokens.accessToken,
				refreshToken: tokens.refreshToken,
				tokenExpiry: now + tokens.expiresIn * 1000,
				createdAt: now,
				updatedAt: now
			})
			.run();

		// Fetch Gmail profile to get the user's email address
		try {
			const profile = await getProfile(user.id);
			db.update(gmailIntegrations)
				.set({ email: profile.email, historyId: profile.historyId, updatedAt: Date.now() })
				.where(eq(gmailIntegrations.userId, user.id))
				.run();
		} catch (err) {
			console.error('[gmail] Failed to fetch profile:', err);
		}

		redirect(302, '/crm/email?success=gmail_connected');
	} catch (err) {
		console.error('[gmail] Token exchange failed:', err);
		redirect(302, '/crm/email?error=token_exchange');
	}
};
