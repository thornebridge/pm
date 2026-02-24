import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import {
	crmProposals,
	crmOpportunities,
	crmCompanies
} from '$lib/server/db/schema.js';
import { eq, desc, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const url = event.url;
	const status = url.searchParams.get('status');
	const opportunityId = url.searchParams.get('opportunity');
	const limit = parseInt(url.searchParams.get('limit') || '100');
	const offset = parseInt(url.searchParams.get('offset') || '0');

	let query = db
		.select({
			id: crmProposals.id,
			opportunityId: crmProposals.opportunityId,
			opportunityTitle: crmOpportunities.title,
			companyName: crmCompanies.name,
			title: crmProposals.title,
			description: crmProposals.description,
			amount: crmProposals.amount,
			status: crmProposals.status,
			sentAt: crmProposals.sentAt,
			expiresAt: crmProposals.expiresAt,
			respondedAt: crmProposals.respondedAt,
			createdAt: crmProposals.createdAt
		})
		.from(crmProposals)
		.innerJoin(crmOpportunities, eq(crmProposals.opportunityId, crmOpportunities.id))
		.innerJoin(crmCompanies, eq(crmOpportunities.companyId, crmCompanies.id))
		.orderBy(desc(crmProposals.createdAt))
		.limit(limit)
		.offset(offset);

	if (status) {
		query = query.where(eq(crmProposals.status, status as 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired')) as typeof query;
	}
	if (opportunityId) {
		query = query.where(eq(crmProposals.opportunityId, opportunityId)) as typeof query;
	}

	const rows = await query;
	return json(rows);
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	if (!body.opportunityId || !body.title?.trim()) {
		return json({ error: 'Opportunity and title are required' }, { status: 400 });
	}

	const now = Date.now();
	const proposal = {
		id: nanoid(12),
		opportunityId: body.opportunityId,
		title: body.title.trim(),
		description: body.description || null,
		amount: body.amount ?? null,
		status: 'draft' as const,
		sentAt: null,
		expiresAt: body.expiresAt ?? null,
		respondedAt: null,
		createdBy: user.id,
		createdAt: now,
		updatedAt: now
	};

	await db.insert(crmProposals).values(proposal);
	return json(proposal, { status: 201 });
};
