import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { orgSettings } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

function maskSecret(value: string | null): string | null {
	if (!value) return null;
	return `${'•'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

async function getOrgSettings() {
	let [settings] = await db.select().from(orgSettings).where(eq(orgSettings.id, 'default'));
	if (!settings) {
		await db.insert(orgSettings)
			.values({ id: 'default', platformName: 'PM', updatedAt: Date.now() });
		[settings] = await db.select().from(orgSettings).where(eq(orgSettings.id, 'default'));
	}
	return settings;
}

/** GET — read org settings (mask secrets) */
export const GET: RequestHandler = async (event) => {
	requireAdmin(event);
	const settings = await getOrgSettings();
	return json({
		...settings,
		telnyxApiKey: maskSecret(settings.telnyxApiKey),
		googleClientSecret: maskSecret(settings.googleClientSecret),
		resendApiKey: maskSecret(settings.resendApiKey)
	});
};

/** PUT — update org settings */
export const PUT: RequestHandler = async (event) => {
	requireAdmin(event);
	const body = await event.request.json();

	const current = await getOrgSettings();

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
	let telnyxCallerNumber = current.telnyxCallerNumber;
	if (typeof body.telnyxCallerNumbers === 'string') {
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

	// Google Calendar fields
	const googleClientId = typeof body.googleClientId === 'string'
		? (body.googleClientId.trim() || null)
		: current.googleClientId;
	const googleClientSecret = typeof body.googleClientSecret === 'string' && !body.googleClientSecret.startsWith('•')
		? (body.googleClientSecret.trim() || null)
		: current.googleClientSecret;

	// Email fields
	const emailProvider = typeof body.emailProvider === 'string'
		? (body.emailProvider || null)
		: current.emailProvider;
	const emailFromAddress = typeof body.emailFromAddress === 'string'
		? (body.emailFromAddress.trim() || null)
		: current.emailFromAddress;
	const resendApiKey = typeof body.resendApiKey === 'string' && !body.resendApiKey.startsWith('•')
		? (body.resendApiKey.trim() || null)
		: current.resendApiKey;

	await db.update(orgSettings)
		.set({
			platformName,
			telnyxEnabled,
			telnyxApiKey,
			telnyxConnectionId,
			telnyxCredentialId,
			telnyxCallerNumber,
			telnyxRecordCalls,
			googleClientId,
			googleClientSecret,
			emailProvider,
			emailFromAddress,
			resendApiKey,
			updatedAt: Date.now()
		})
		.where(eq(orgSettings.id, 'default'));

	return json({
		...current,
		platformName,
		telnyxEnabled,
		telnyxApiKey: maskSecret(telnyxApiKey),
		telnyxConnectionId,
		telnyxCredentialId,
		telnyxCallerNumber,
		telnyxRecordCalls,
		googleClientId,
		googleClientSecret: maskSecret(googleClientSecret),
		emailProvider,
		emailFromAddress,
		resendApiKey: maskSecret(resendApiKey)
	});
};
