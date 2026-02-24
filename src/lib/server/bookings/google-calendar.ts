import { db } from '$lib/server/db/index.js';
import { orgSettings, calendarIntegrations } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

export interface GoogleCalendarConfig {
	clientId: string;
	clientSecret: string;
}

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

export function getGoogleConfig(): GoogleCalendarConfig | null {
	const org = db.select().from(orgSettings).where(eq(orgSettings.id, 'default')).get();
	const clientId = org?.googleClientId || env.GOOGLE_CLIENT_ID;
	const clientSecret = org?.googleClientSecret || env.GOOGLE_CLIENT_SECRET;
	if (!clientId || !clientSecret) return null;
	return { clientId, clientSecret };
}

export function getAuthUrl(config: GoogleCalendarConfig, redirectUri: string, state: string): string {
	const params = new URLSearchParams({
		client_id: config.clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
		access_type: 'offline',
		prompt: 'consent',
		state
	});
	return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeCodeForTokens(
	config: GoogleCalendarConfig,
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

async function refreshAccessToken(
	config: GoogleCalendarConfig,
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

export async function getValidToken(userId: string): Promise<string | null> {
	const config = getGoogleConfig();
	if (!config) return null;

	const integration = db
		.select()
		.from(calendarIntegrations)
		.where(eq(calendarIntegrations.userId, userId))
		.get();
	if (!integration) return null;

	// Refresh if expiring within 5 minutes
	if (integration.tokenExpiry < Date.now() + 5 * 60 * 1000) {
		try {
			const refreshed = await refreshAccessToken(config, integration.refreshToken);
			const now = Date.now();
			db.update(calendarIntegrations)
				.set({
					accessToken: refreshed.accessToken,
					tokenExpiry: now + refreshed.expiresIn * 1000,
					updatedAt: now
				})
				.where(eq(calendarIntegrations.userId, userId))
				.run();
			return refreshed.accessToken;
		} catch (err) {
			console.error('[google-calendar] Token refresh failed:', err);
			return null;
		}
	}

	return integration.accessToken;
}

export async function getFreeBusy(
	userId: string,
	timeMin: number,
	timeMax: number
): Promise<Array<{ start: number; end: number }>> {
	const token = await getValidToken(userId);
	if (!token) return [];

	const integration = db
		.select({ calendarId: calendarIntegrations.calendarId })
		.from(calendarIntegrations)
		.where(eq(calendarIntegrations.userId, userId))
		.get();

	const calendarId = integration?.calendarId || 'primary';

	const res = await fetch(`${GOOGLE_CALENDAR_API}/freeBusy`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			timeMin: new Date(timeMin).toISOString(),
			timeMax: new Date(timeMax).toISOString(),
			items: [{ id: calendarId }]
		})
	});

	if (!res.ok) {
		console.error('[google-calendar] FreeBusy failed:', res.status, await res.text());
		return [];
	}

	const data = await res.json();
	const busy = data.calendars?.[calendarId]?.busy || [];
	return busy.map((b: { start: string; end: string }) => ({
		start: new Date(b.start).getTime(),
		end: new Date(b.end).getTime()
	}));
}

export async function createCalendarEvent(
	userId: string,
	event: {
		summary: string;
		description?: string;
		location?: string;
		start: number;
		end: number;
		attendeeEmail: string;
	}
): Promise<string | null> {
	const token = await getValidToken(userId);
	if (!token) return null;

	const integration = db
		.select({ calendarId: calendarIntegrations.calendarId })
		.from(calendarIntegrations)
		.where(eq(calendarIntegrations.userId, userId))
		.get();

	const calendarId = integration?.calendarId || 'primary';

	const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			summary: event.summary,
			description: event.description,
			location: event.location,
			start: { dateTime: new Date(event.start).toISOString() },
			end: { dateTime: new Date(event.end).toISOString() },
			attendees: [{ email: event.attendeeEmail }]
		})
	});

	if (!res.ok) {
		console.error('[google-calendar] Create event failed:', res.status, await res.text());
		return null;
	}

	const data = await res.json();
	return data.id;
}

export async function deleteCalendarEvent(userId: string, eventId: string): Promise<void> {
	const token = await getValidToken(userId);
	if (!token) return;

	const integration = db
		.select({ calendarId: calendarIntegrations.calendarId })
		.from(calendarIntegrations)
		.where(eq(calendarIntegrations.userId, userId))
		.get();

	const calendarId = integration?.calendarId || 'primary';

	const res = await fetch(
		`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
		{
			method: 'DELETE',
			headers: { Authorization: `Bearer ${token}` }
		}
	);

	if (!res.ok && res.status !== 404) {
		console.error('[google-calendar] Delete event failed:', res.status, await res.text());
	}
}
