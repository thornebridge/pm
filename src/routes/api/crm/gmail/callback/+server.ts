import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { gmailIntegrations } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { getGoogleConfig, exchangeCodeForTokens } from '$lib/server/google-auth.js';
import { getProfile, validateConnection } from '$lib/server/gmail/gmail-api.js';
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

	const config = await getGoogleConfig();
	if (!config) {
		redirect(302, '/crm/email?error=not_configured');
	}

	const redirectUri = `${event.url.origin}/api/crm/gmail/callback`;
	let tokens;
	try {
		tokens = await exchangeCodeForTokens(config, code, redirectUri);
	} catch (err) {
		console.error('[gmail] Token exchange failed:', err);
		redirect(302, '/crm/email?error=token_exchange');
	}

	const now = Date.now();

	// Upsert: delete existing then insert
	await db.delete(gmailIntegrations).where(eq(gmailIntegrations.userId, user.id));
	const integrationId = nanoid(12);
	await db.insert(gmailIntegrations)
		.values({
			id: integrationId,
			userId: user.id,
			email: '', // will be updated below
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			tokenExpiry: now + tokens.expiresIn * 1000,
			syncStatus: 'idle',
			createdAt: now,
			updatedAt: now
		});

	// Fetch Gmail profile to get the user's email address
	// NOTE: Do NOT save historyId here — leave it null so the first sync
	// triggers initialSync() which fetches existing messages.
	// historyId is stored after initialSync completes.
	try {
		const profile = await getProfile(user.id);
		await db.update(gmailIntegrations)
			.set({ email: profile.email, updatedAt: Date.now() })
			.where(eq(gmailIntegrations.userId, user.id));
	} catch (err) {
		console.error('[gmail] Failed to fetch profile:', err);
	}

	// Validate that the connection actually works before reporting success
	const validation = await validateConnection(user.id);
	if (!validation.ok) {
		console.error('[gmail] Connection validation failed after OAuth:', validation.error);
		await db.update(gmailIntegrations)
			.set({ syncStatus: 'error', syncError: validation.error || 'Connection validation failed', updatedAt: Date.now() })
			.where(eq(gmailIntegrations.userId, user.id));
		// Still redirect to success — the UI will show the error banner
	}

	redirect(302, '/crm/email?success=gmail_connected');
};
