import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import {
	gmailThreads,
	gmailMessages,
	gmailEntityLinks,
	crmContacts,
	crmCompanies,
	crmOpportunities
} from '$lib/server/db/schema.js';
import { eq, and, desc, like, or, sql, inArray } from 'drizzle-orm';
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

	// If filtering by entity, get thread IDs first
	let entityThreadIds: string[] | null = null;
	if (contactId || companyId || opportunityId) {
		const conditions = [
			...(contactId ? [eq(gmailEntityLinks.contactId, contactId)] : []),
			...(companyId ? [eq(gmailEntityLinks.companyId, companyId)] : []),
			...(opportunityId ? [eq(gmailEntityLinks.opportunityId, opportunityId)] : [])
		];
		const links = db.select({ threadId: gmailEntityLinks.threadId })
			.from(gmailEntityLinks)
			.where(or(...conditions))
			.all();
		entityThreadIds = [...new Set(links.map((l) => l.threadId))];
		if (entityThreadIds.length === 0) {
			return Response.json({ threads: [], total: 0 });
		}
	}

	// Build thread query conditions
	const threadConditions = [eq(gmailThreads.userId, user.id)];

	if (category !== 'all') {
		threadConditions.push(eq(gmailThreads.category, category as 'inbox' | 'sent' | 'draft' | 'archived' | 'trash'));
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
			.offset(offset)
			.all(),
		db.select({ count: sql<number>`count(*)` })
			.from(gmailThreads)
			.where(where)
			.get()
	]);

	// Enrich with first message sender and linked entities
	const enriched = threads.map((thread) => {
		// Get the latest message sender
		const latestMsg = db.select({
			fromEmail: gmailMessages.fromEmail,
			fromName: gmailMessages.fromName
		}).from(gmailMessages)
			.where(eq(gmailMessages.threadId, thread.id))
			.orderBy(desc(gmailMessages.internalDate))
			.limit(1)
			.get();

		// Get linked entities
		const links = db.select()
			.from(gmailEntityLinks)
			.where(eq(gmailEntityLinks.threadId, thread.id))
			.all();

		const linkedContacts = links
			.filter((l) => l.contactId)
			.map((l) => {
				const c = db.select({ id: crmContacts.id, firstName: crmContacts.firstName, lastName: crmContacts.lastName })
					.from(crmContacts).where(eq(crmContacts.id, l.contactId!)).get();
				return c ? { id: c.id, name: `${c.firstName} ${c.lastName}` } : null;
			})
			.filter(Boolean);

		const linkedOpportunities = links
			.filter((l) => l.opportunityId)
			.map((l) => {
				const o = db.select({ id: crmOpportunities.id, title: crmOpportunities.title })
					.from(crmOpportunities).where(eq(crmOpportunities.id, l.opportunityId!)).get();
				return o ? { id: o.id, title: o.title } : null;
			})
			.filter(Boolean);

		return {
			...thread,
			fromEmail: latestMsg?.fromEmail || '',
			fromName: latestMsg?.fromName || '',
			linkedContacts,
			linkedOpportunities
		};
	});

	return Response.json({ threads: enriched, total: countResult?.count || 0 });
};
