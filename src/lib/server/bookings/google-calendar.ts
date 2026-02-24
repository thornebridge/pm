import { db } from '$lib/server/db/index.js';
import { calendarIntegrations } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import {
	getGoogleConfig,
	getAuthUrl as _getAuthUrl,
	exchangeCodeForTokens,
	refreshAccessToken,
	type GoogleOAuthConfig
} from '$lib/server/google-auth.js';

export type { GoogleOAuthConfig as GoogleCalendarConfig };
export { getGoogleConfig, exchangeCodeForTokens };

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const CALENDAR_SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';

export function getAuthUrl(config: GoogleOAuthConfig, redirectUri: string, state: string): string {
	return _getAuthUrl(config, redirectUri, state, CALENDAR_SCOPES);
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
