import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { dialSessions, dialQueueItems, crmContacts, crmCompanies } from '$lib/server/db/schema.js';
import { eq, desc, asc, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user.id;

	// Load all sessions for this user (most recent first)
	const sessions = await db
		.select()
		.from(dialSessions)
		.where(eq(dialSessions.userId, userId))
		.orderBy(desc(dialSessions.createdAt))
		.limit(50);

	// Find active or paused session (prefer active)
	const activeSession =
		sessions.find((s) => s.status === 'active') ||
		sessions.find((s) => s.status === 'paused') ||
		null;

	// Load queue items for the active session
	let queueItems: Array<Record<string, unknown>> = [];
	if (activeSession) {
		queueItems = await db
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
			.where(eq(dialQueueItems.sessionId, activeSession.id))
			.orderBy(asc(dialQueueItems.position));
	}

	return { sessions, activeSession, queueItems };
};
