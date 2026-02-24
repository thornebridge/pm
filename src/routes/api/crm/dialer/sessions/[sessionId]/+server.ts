import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { dialSessions, dialQueueItems, crmContacts, crmCompanies } from '$lib/server/db/schema.js';
import { eq, asc } from 'drizzle-orm';

/** GET — get session with queue items */
export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const { sessionId } = event.params;

	const session = db.select().from(dialSessions).where(eq(dialSessions.id, sessionId)).get();
	if (!session) {
		return json({ error: 'Session not found' }, { status: 404 });
	}

	const items = db
		.select({
			id: dialQueueItems.id,
			sessionId: dialQueueItems.sessionId,
			contactId: dialQueueItems.contactId,
			position: dialQueueItems.position,
			status: dialQueueItems.status,
			disposition: dialQueueItems.disposition,
			notes: dialQueueItems.notes,
			callbackAt: dialQueueItems.callbackAt,
			callLogId: dialQueueItems.callLogId,
			crmActivityId: dialQueueItems.crmActivityId,
			callDurationSeconds: dialQueueItems.callDurationSeconds,
			dialedAt: dialQueueItems.dialedAt,
			completedAt: dialQueueItems.completedAt,
			createdAt: dialQueueItems.createdAt,
			contactFirstName: crmContacts.firstName,
			contactLastName: crmContacts.lastName,
			contactEmail: crmContacts.email,
			contactPhone: crmContacts.phone,
			contactTitle: crmContacts.title,
			companyId: crmContacts.companyId,
			companyName: crmCompanies.name
		})
		.from(dialQueueItems)
		.innerJoin(crmContacts, eq(dialQueueItems.contactId, crmContacts.id))
		.leftJoin(crmCompanies, eq(crmContacts.companyId, crmCompanies.id))
		.where(eq(dialQueueItems.sessionId, sessionId))
		.orderBy(asc(dialQueueItems.position))
		.all();

	return json({ ...session, items });
};

/** PATCH — update session status/name/timestamps */
export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const { sessionId } = event.params;
	const body = await event.request.json();

	const session = db.select().from(dialSessions).where(eq(dialSessions.id, sessionId)).get();
	if (!session) {
		return json({ error: 'Session not found' }, { status: 404 });
	}

	const updates: Record<string, unknown> = { updatedAt: Date.now() };

	if (body.name !== undefined) updates.name = body.name.trim();
	if (body.status !== undefined) updates.status = body.status;
	if (body.startedAt !== undefined) updates.startedAt = body.startedAt;
	if (body.endedAt !== undefined) updates.endedAt = body.endedAt;

	db.update(dialSessions).set(updates).where(eq(dialSessions.id, sessionId)).run();

	const updated = db.select().from(dialSessions).where(eq(dialSessions.id, sessionId)).get();
	return json(updated);
};

/** DELETE — delete session (cascades to queue items) */
export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { sessionId } = event.params;

	const session = db.select().from(dialSessions).where(eq(dialSessions.id, sessionId)).get();
	if (!session) {
		return json({ error: 'Session not found' }, { status: 404 });
	}

	db.delete(dialSessions).where(eq(dialSessions.id, sessionId)).run();
	return json({ ok: true });
};
