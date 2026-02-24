import { db } from '$lib/server/db/index.js';
import { orgSettings } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

export interface GoogleOAuthConfig {
	clientId: string;
	clientSecret: string;
}

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export async function getGoogleConfig(): Promise<GoogleOAuthConfig | null> {
	const [org] = await db.select().from(orgSettings).where(eq(orgSettings.id, 'default'));
	const clientId = org?.googleClientId || env.GOOGLE_CLIENT_ID;
	const clientSecret = org?.googleClientSecret || env.GOOGLE_CLIENT_SECRET;
	if (!clientId || !clientSecret) return null;
	return { clientId, clientSecret };
}

export function getAuthUrl(
	config: GoogleOAuthConfig,
	redirectUri: string,
	state: string,
	scopes: string
): string {
	const params = new URLSearchParams({
		client_id: config.clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: scopes,
		access_type: 'offline',
		prompt: 'consent',
		state
	});
	return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeCodeForTokens(
	config: GoogleOAuthConfig,
	code: string,
	redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
	const res = await fetch(GOOGLE_TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			code,
			client_id: config.clientId,
			client_secret: config.clientSecret,
			redirect_uri: redirectUri,
			grant_type: 'authorization_code'
		})
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Google token exchange failed (${res.status}): ${text}`);
	}
	const data = await res.json();
	return {
		accessToken: data.access_token,
		refreshToken: data.refresh_token,
		expiresIn: data.expires_in
	};
}

export async function refreshAccessToken(
	config: GoogleOAuthConfig,
	refreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
	const res = await fetch(GOOGLE_TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			refresh_token: refreshToken,
			client_id: config.clientId,
			client_secret: config.clientSecret,
			grant_type: 'refresh_token'
		})
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Google token refresh failed (${res.status}): ${text}`);
	}
	const data = await res.json();
	return { accessToken: data.access_token, expiresIn: data.expires_in };
}
