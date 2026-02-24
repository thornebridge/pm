import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { orgSettings } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

function getOrgSettings() {
	let settings = db.select().from(orgSettings).where(eq(orgSettings.id, 'default')).get();
	if (!settings) {
		db.insert(orgSettings)
			.values({ id: 'default', platformName: 'PM', updatedAt: Date.now() })
			.run();
		settings = db.select().from(orgSettings).where(eq(orgSettings.id, 'default')).get()!;
	}
	return settings;
}

/** GET — read org settings (mask API key) */
export const GET: RequestHandler = async (event) => {
	requireAdmin(event);
	const settings = getOrgSettings();
	return json({
		...settings,
		telnyxApiKey: settings.telnyxApiKey
			? `${'•'.repeat(Math.max(0, settings.telnyxApiKey.length - 4))}${settings.telnyxApiKey.slice(-4)}`
			: null
	});
};

/** PUT — update org settings */
export const PUT: RequestHandler = async (event) => {
	requireAdmin(event);
	const body = await event.request.json();

	const current = getOrgSettings();

	const platformName =
		typeof body.platformName === 'string' && body.platformName.trim().length > 0 && body.platformName.trim().length <= 30
			? body.platformName.trim()
			: current.platformName;

	// Telnyx fields
	const telnyxEnabled = typeof body.telnyxEnabled === 'boolean' ? body.telnyxEnabled : current.telnyxEnabled;
	const telnyxApiKey = typeof body.telnyxApiKey === 'string'
		? (body.telnyxApiKey.trim() || null)
		: current.telnyxApiKey;
	const telnyxConnectionId = typeof body.telnyxConnectionId === 'string'
		? (body.telnyxConnectionId.trim() || null)
		: current.telnyxConnectionId;
	const telnyxCredentialId = typeof body.telnyxCredentialId === 'string'
		? (body.telnyxCredentialId.trim() || null)
		: current.telnyxCredentialId;
	// telnyxCallerNumber stores a JSON array of numbers
	let telnyxCallerNumber = current.telnyxCallerNumber;
	if (typeof body.telnyxCallerNumbers === 'string') {
		// Parse lines/commas into a JSON array
		const numbers = body.telnyxCallerNumbers
			.split(/[\n,]+/)
			.map((n: string) => n.trim())
			.filter(Boolean);
		telnyxCallerNumber = numbers.length > 0 ? JSON.stringify(numbers) : null;
	} else if (Array.isArray(body.telnyxCallerNumbers)) {
		const numbers = body.telnyxCallerNumbers.filter(Boolean);
		telnyxCallerNumber = numbers.length > 0 ? JSON.stringify(numbers) : null;
	}
	const telnyxRecordCalls = typeof body.telnyxRecordCalls === 'boolean'
		? body.telnyxRecordCalls
		: current.telnyxRecordCalls;

	db.update(orgSettings)
		.set({
			platformName,
			telnyxEnabled,
			telnyxApiKey,
			telnyxConnectionId,
			telnyxCredentialId,
			telnyxCallerNumber,
			telnyxRecordCalls,
			updatedAt: Date.now()
		})
		.where(eq(orgSettings.id, 'default'))
		.run();

	return json({
		...current,
		platformName,
		telnyxEnabled,
		telnyxApiKey: telnyxApiKey
			? `${'•'.repeat(Math.max(0, telnyxApiKey.length - 4))}${telnyxApiKey.slice(-4)}`
			: null,
		telnyxConnectionId,
		telnyxCredentialId,
		telnyxCallerNumber,
		telnyxRecordCalls
	});
};
