import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import {
	crmContacts,
	crmCompanies,
	crmActivities,
	crmOpportunities,
	dialQueueItems,
	users
} from '$lib/server/db/schema.js';
import { eq, like, desc, asc, and, or, isNotNull, sql, not, inArray } from 'drizzle-orm';

/** GET — search/filter contacts for building a dial queue */
export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const url = event.url;

	const search = url.searchParams.get('search');
	const companyId = url.searchParams.get('companyId');
	const source = url.searchParams.get('source');
	const ownerId = url.searchParams.get('ownerId');
	const hasPhone = url.searchParams.get('hasPhone');
	const lastContactedBefore = url.searchParams.get('lastContactedBefore');
	const opportunityStageId = url.searchParams.get('opportunityStageId');
	const opportunityPriority = url.searchParams.get('opportunityPriority');
	const excludeSessionId = url.searchParams.get('excludeSessionId');
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
	const offset = parseInt(url.searchParams.get('offset') || '0');

	const conditions = [];

	// Text search
	if (search) {
		conditions.push(
			or(
				like(crmContacts.firstName, `%${search}%`),
				like(crmContacts.lastName, `%${search}%`),
				like(crmContacts.email, `%${search}%`),
				like(crmContacts.phone, `%${search}%`)
			)
		);
	}

	// Standard filters
	if (companyId) conditions.push(eq(crmContacts.companyId, companyId));
	if (source) conditions.push(eq(crmContacts.source, source as any));
	if (ownerId) conditions.push(eq(crmContacts.ownerId, ownerId));
	if (hasPhone === 'true') conditions.push(isNotNull(crmContacts.phone));

	// Exclude contacts marked Do Not Call in any session
	const dncContactIds = db
		.select({ contactId: dialQueueItems.contactId })
		.from(dialQueueItems)
		.where(eq(dialQueueItems.disposition, 'connected_do_not_call'))
		.all()
		.map((r) => r.contactId);

	if (dncContactIds.length > 0) {
		conditions.push(not(inArray(crmContacts.id, dncContactIds)));
	}

	// Exclude contacts already in a specific session
	if (excludeSessionId) {
		const sessionContactIds = db
			.select({ contactId: dialQueueItems.contactId })
			.from(dialQueueItems)
			.where(eq(dialQueueItems.sessionId, excludeSessionId))
			.all()
			.map((r) => r.contactId);

		if (sessionContactIds.length > 0) {
			conditions.push(not(inArray(crmContacts.id, sessionContactIds)));
		}
	}

	// Filter by opportunity stage
	if (opportunityStageId) {
		const oppContactIds = db
			.select({ contactId: crmOpportunities.contactId })
			.from(crmOpportunities)
			.where(eq(crmOpportunities.stageId, opportunityStageId))
			.all()
			.filter((r) => r.contactId)
			.map((r) => r.contactId!);

		if (oppContactIds.length > 0) {
			conditions.push(inArray(crmContacts.id, oppContactIds));
		} else {
			// No contacts match this stage — return empty
			return json([]);
		}
	}

	// Filter by opportunity priority
	if (opportunityPriority) {
		const oppContactIds = db
			.select({ contactId: crmOpportunities.contactId })
			.from(crmOpportunities)
			.where(eq(crmOpportunities.priority, opportunityPriority as 'hot' | 'warm' | 'cold'))
			.all()
			.filter((r) => r.contactId)
			.map((r) => r.contactId!);

		if (oppContactIds.length > 0) {
			conditions.push(inArray(crmContacts.id, oppContactIds));
		} else {
			return json([]);
		}
	}

	// Filter by last contacted date
	if (lastContactedBefore) {
		const ts = parseInt(lastContactedBefore);
		// Contacts whose most recent activity is before the given timestamp
		// OR contacts with no activity at all
		const recentlyContactedIds = db
			.select({ contactId: crmActivities.contactId })
			.from(crmActivities)
			.where(
				and(
					isNotNull(crmActivities.contactId),
					sql`${crmActivities.createdAt} > ${ts}`
				)
			)
			.all()
			.filter((r) => r.contactId)
			.map((r) => r.contactId!);

		if (recentlyContactedIds.length > 0) {
			conditions.push(not(inArray(crmContacts.id, recentlyContactedIds)));
		}
	}

	const where = conditions.length > 0
		? conditions.length === 1
			? conditions[0]
			: and(...conditions)
		: undefined;

	let query = db
		.select({
			id: crmContacts.id,
			firstName: crmContacts.firstName,
			lastName: crmContacts.lastName,
			email: crmContacts.email,
			phone: crmContacts.phone,
			title: crmContacts.title,
			source: crmContacts.source,
			companyId: crmContacts.companyId,
			companyName: crmCompanies.name,
			ownerId: crmContacts.ownerId,
			ownerName: users.name,
			createdAt: crmContacts.createdAt
		})
		.from(crmContacts)
		.leftJoin(crmCompanies, eq(crmContacts.companyId, crmCompanies.id))
		.leftJoin(users, eq(crmContacts.ownerId, users.id))
		.orderBy(asc(crmContacts.lastName), asc(crmContacts.firstName))
		.limit(limit)
		.offset(offset);

	if (where) {
		query = query.where(where) as typeof query;
	}

	const contacts = query.all();

	// Enrich with recently-called info (within 48 hours)
	const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1000;
	const contactIds = contacts.map((c) => c.id);

	let recentCalls: Record<string, { disposition: string | null; dialedAt: number | null }> = {};
	if (contactIds.length > 0) {
		const recentItems = db
			.select({
				contactId: dialQueueItems.contactId,
				disposition: dialQueueItems.disposition,
				dialedAt: dialQueueItems.dialedAt
			})
			.from(dialQueueItems)
			.where(
				and(
					inArray(dialQueueItems.contactId, contactIds),
					sql`${dialQueueItems.dialedAt} > ${fortyEightHoursAgo}`
				)
			)
			.orderBy(desc(dialQueueItems.dialedAt))
			.all();

		// Keep only the most recent per contact
		for (const item of recentItems) {
			if (!recentCalls[item.contactId]) {
				recentCalls[item.contactId] = {
					disposition: item.disposition,
					dialedAt: item.dialedAt
				};
			}
		}
	}

	const enriched = contacts.map((c) => ({
		...c,
		recentCall: recentCalls[c.id] || null
	}));

	return json(enriched);
};
