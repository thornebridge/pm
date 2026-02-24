import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { dialSessions, dialQueueItems, crmContacts, crmCompanies } from '$lib/server/db/schema.js';
import { eq, asc, sql, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/** GET — list queue items with contact data */
export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const { sessionId } = event.params;

	const items = await db
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
		.orderBy(asc(dialQueueItems.position));

	return json(items);
};

/** POST — add contacts to the queue */
export const POST: RequestHandler = async (event) => {
	requireAuth(event);
	const { sessionId } = event.params;
	const body = await event.request.json();

	const contactIds: string[] = body.contactIds;
	if (!Array.isArray(contactIds) || contactIds.length === 0) {
		return json({ error: 'contactIds array is required' }, { status: 400 });
	}

	const [session] = await db.select().from(dialSessions).where(eq(dialSessions.id, sessionId));
	if (!session) {
		return json({ error: 'Session not found' }, { status: 404 });
	}

	// Get existing contacts in this session to deduplicate
	const existing = await db
		.select({ contactId: dialQueueItems.contactId })
		.from(dialQueueItems)
		.where(eq(dialQueueItems.sessionId, sessionId));
	const existingSet = new Set(existing.map((e) => e.contactId));

	// Get current max position
	const [maxPos] = await db
		.select({ maxP: sql<number>`coalesce(max(${dialQueueItems.position}), 0)` })
		.from(dialQueueItems)
		.where(eq(dialQueueItems.sessionId, sessionId));
	let nextPosition = (maxPos?.maxP ?? 0) + 1;

	const now = Date.now();
	let added = 0;

	for (const contactId of contactIds) {
		if (existingSet.has(contactId)) continue;

		await db.insert(dialQueueItems)
			.values({
				id: nanoid(12),
				sessionId,
				contactId,
				position: nextPosition++,
				status: 'pending',
				createdAt: now
			});
		added++;
	}

	// Update session totalContacts
	if (added > 0) {
		await db.update(dialSessions)
			.set({
				totalContacts: session.totalContacts + added,
				updatedAt: Date.now()
			})
			.where(eq(dialSessions.id, sessionId));
	}

	return json({ added, total: session.totalContacts + added }, { status: 201 });
};
