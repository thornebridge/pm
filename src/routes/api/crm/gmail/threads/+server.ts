import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import {
	gmailThreads,
	gmailMessages,
	gmailEntityLinks,
	crmContacts,
	crmCompanies,
	crmOpportunities,
	emailTrackingTokens,
	emailReminders
} from '$lib/server/db/schema.js';
import { eq, and, desc, like, or, sql, inArray, isNotNull } from 'drizzle-orm';
import { getSearchClient } from '$lib/server/search/meilisearch.js';

export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const url = event.url;

	const category = url.searchParams.get('category') || 'inbox';
	const search = url.searchParams.get('search') || '';
	const contactId = url.searchParams.get('contactId');
	const companyId = url.searchParams.get('companyId');
	const opportunityId = url.searchParams.get('opportunityId');
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
	const offset = parseInt(url.searchParams.get('offset') || '0', 10);
	const isSnoozedCategory = category === 'snoozed';

	// If filtering by entity, get thread IDs first
	let entityThreadIds: string[] | null = null;
	if (contactId || companyId || opportunityId) {
		const conditions = [
			...(contactId ? [eq(gmailEntityLinks.contactId, contactId)] : []),
			...(companyId ? [eq(gmailEntityLinks.companyId, companyId)] : []),
			...(opportunityId ? [eq(gmailEntityLinks.opportunityId, opportunityId)] : [])
		];
		const links = await db.select({ threadId: gmailEntityLinks.threadId })
			.from(gmailEntityLinks)
			.where(or(...conditions));
		entityThreadIds = [...new Set(links.map((l) => l.threadId))];
		if (entityThreadIds.length === 0) {
			return Response.json({ threads: [], total: 0 });
		}
	}

	// Build thread query conditions
	const threadConditions = [eq(gmailThreads.userId, user.id)];

	if (isSnoozedCategory) {
		// Show threads with active snooze reminders (any category)
		threadConditions.push(
			sql`EXISTS (SELECT 1 FROM email_reminders WHERE thread_id = ${gmailThreads.id} AND type = 'snooze' AND status = 'pending')`
		);
	} else {
		if (category !== 'all') {
			threadConditions.push(eq(gmailThreads.category, category as 'inbox' | 'sent' | 'draft' | 'archived' | 'trash'));
		}
		// Exclude snoozed threads from regular views
		threadConditions.push(
			sql`NOT EXISTS (SELECT 1 FROM email_reminders WHERE thread_id = ${gmailThreads.id} AND type = 'snooze' AND status = 'pending')`
		);
	}

	if (search) {
		// Try Meilisearch for better typo-tolerant search
		const client = getSearchClient();
		let meiliThreadIds: string[] | null = null;
		if (client) {
			try {
				const filters = [`userId = "${user.id}"`];
				if (category !== 'all') filters.push(`category = "${category}"`);
				const meiliResults = await client.index('email_threads').search(search, {
					filter: filters.join(' AND '),
					limit: 200
				});
				meiliThreadIds = meiliResults.hits.map((h: Record<string, unknown>) => h.id as string);
			} catch {
				// Fall through to SQL LIKE
			}
		}

		if (meiliThreadIds !== null) {
			if (meiliThreadIds.length === 0) {
				return Response.json({ threads: [], total: 0 });
			}
			threadConditions.push(inArray(gmailThreads.id, meiliThreadIds));
		} else {
			threadConditions.push(
				or(
					like(gmailThreads.subject, `%${search}%`),
					like(gmailThreads.snippet, `%${search}%`)
				)!
			);
		}
	}

	if (entityThreadIds) {
		threadConditions.push(
			sql`${gmailThreads.id} IN (${sql.join(entityThreadIds.map((id) => sql`${id}`), sql`, `)})`
		);
	}

	const where = and(...threadConditions);

	const [threads, countResult] = await Promise.all([
		db.select()
			.from(gmailThreads)
			.where(where)
			.orderBy(desc(gmailThreads.lastMessageAt))
			.limit(limit)
			.offset(offset),
		db.select({ count: sql<number>`count(*)` })
			.from(gmailThreads)
			.where(where)
			.then(rows => rows[0])
	]);

	// Enrich with first message sender and linked entities
	const enriched = [];
	for (const thread of threads) {
		// Get the latest message sender
		const [latestMsg] = await db.select({
			fromEmail: gmailMessages.fromEmail,
			fromName: gmailMessages.fromName
		}).from(gmailMessages)
			.where(eq(gmailMessages.threadId, thread.id))
			.orderBy(desc(gmailMessages.internalDate))
			.limit(1);

		// Get linked entities
		const links = await db.select()
			.from(gmailEntityLinks)
			.where(eq(gmailEntityLinks.threadId, thread.id));

		const linkedContacts = [];
		for (const l of links.filter((l) => l.contactId)) {
			const [c] = await db.select({ id: crmContacts.id, firstName: crmContacts.firstName, lastName: crmContacts.lastName })
				.from(crmContacts).where(eq(crmContacts.id, l.contactId!));
			if (c) linkedContacts.push({ id: c.id, name: `${c.firstName} ${c.lastName}` });
		}

		const linkedOpportunities = [];
		for (const l of links.filter((l) => l.opportunityId)) {
			const [o] = await db.select({ id: crmOpportunities.id, title: crmOpportunities.title })
				.from(crmOpportunities).where(eq(crmOpportunities.id, l.opportunityId!));
			if (o) linkedOpportunities.push({ id: o.id, title: o.title });
		}

		// Check for tracking opens
		const [trackingToken] = await db.select({ firstOpenedAt: emailTrackingTokens.firstOpenedAt })
			.from(emailTrackingTokens)
			.where(and(eq(emailTrackingTokens.threadId, thread.id), isNotNull(emailTrackingTokens.firstOpenedAt)))
			.limit(1);

		// Check for active reminders
		const [activeReminder] = await db.select({ id: emailReminders.id })
			.from(emailReminders)
			.where(and(eq(emailReminders.threadId, thread.id), eq(emailReminders.status, 'pending')))
			.limit(1);

		enriched.push({
			...thread,
			fromEmail: latestMsg?.fromEmail || '',
			fromName: latestMsg?.fromName || '',
			linkedContacts,
			linkedOpportunities,
			hasBeenOpened: !!trackingToken,
			hasActiveReminder: !!activeReminder
		});
	}

	return Response.json({ threads: enriched, total: countResult?.count || 0 });
};
