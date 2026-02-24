import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { telnyxCallLogs, crmContacts, crmCompanies, users } from '$lib/server/db/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import { getTelnyxConfig, getNextCallerNumber } from '$lib/server/telnyx/index.js';

/** GET — list call logs */
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const url = event.url;

	const contactId = url.searchParams.get('contactId');
	const companyId = url.searchParams.get('companyId');
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
	const offset = parseInt(url.searchParams.get('offset') || '0');

	const conditions = [];
	if (contactId) conditions.push(eq(telnyxCallLogs.contactId, contactId));
	if (companyId) conditions.push(eq(telnyxCallLogs.companyId, companyId));

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const calls = db
		.select({
			id: telnyxCallLogs.id,
			direction: telnyxCallLogs.direction,
			fromNumber: telnyxCallLogs.fromNumber,
			toNumber: telnyxCallLogs.toNumber,
			status: telnyxCallLogs.status,
			startedAt: telnyxCallLogs.startedAt,
			answeredAt: telnyxCallLogs.answeredAt,
			endedAt: telnyxCallLogs.endedAt,
			durationSeconds: telnyxCallLogs.durationSeconds,
			recordingUrl: telnyxCallLogs.recordingUrl,
			contactId: telnyxCallLogs.contactId,
			companyId: telnyxCallLogs.companyId,
			userId: telnyxCallLogs.userId,
			notes: telnyxCallLogs.notes,
			createdAt: telnyxCallLogs.createdAt,
			userName: users.name,
			contactFirstName: crmContacts.firstName,
			contactLastName: crmContacts.lastName,
			companyName: crmCompanies.name
		})
		.from(telnyxCallLogs)
		.leftJoin(users, eq(telnyxCallLogs.userId, users.id))
		.leftJoin(crmContacts, eq(telnyxCallLogs.contactId, crmContacts.id))
		.leftJoin(crmCompanies, eq(telnyxCallLogs.companyId, crmCompanies.id))
		.where(where)
		.orderBy(desc(telnyxCallLogs.createdAt))
		.limit(limit)
		.offset(offset)
		.all();

	return json(calls);
};

/** POST — create a call log record (browser registers call before webhooks fire) */
export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const config = getTelnyxConfig();
	if (!config) {
		return json({ error: 'Telnyx integration is not configured' }, { status: 503 });
	}

	const body = await event.request.json();
	const { toNumber, contactId, companyId, direction } = body;

	if (!toNumber) {
		return json({ error: 'toNumber is required' }, { status: 400 });
	}

	const now = Date.now();
	const id = crypto.randomUUID();
	const fromNumber = getNextCallerNumber(config);

	db.insert(telnyxCallLogs)
		.values({
			id,
			direction: direction || 'outbound',
			fromNumber,
			toNumber,
			status: 'initiated',
			startedAt: now,
			contactId: contactId || null,
			companyId: companyId || null,
			userId: user.id,
			createdAt: now,
			updatedAt: now
		})
		.run();

	return json({ id, status: 'initiated' }, { status: 201 });
};
