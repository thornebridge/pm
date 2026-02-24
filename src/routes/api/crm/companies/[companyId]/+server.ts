import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import {
	crmCompanies,
	crmContacts,
	crmOpportunities,
	crmActivities
} from '$lib/server/db/schema.js';
import { eq, count } from 'drizzle-orm';
import { indexDocument, removeDocument } from '$lib/server/search/meilisearch.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const { companyId } = event.params;

	const [company] = await db.select().from(crmCompanies).where(eq(crmCompanies.id, companyId));
	if (!company) return json({ error: 'Company not found' }, { status: 404 });

	const [contactCount] = await db
		.select({ n: count() })
		.from(crmContacts)
		.where(eq(crmContacts.companyId, companyId));

	const [oppCount] = await db
		.select({ n: count() })
		.from(crmOpportunities)
		.where(eq(crmOpportunities.companyId, companyId));

	const [activityCount] = await db
		.select({ n: count() })
		.from(crmActivities)
		.where(eq(crmActivities.companyId, companyId));

	return json({
		...company,
		contactCount: contactCount?.n || 0,
		opportunityCount: oppCount?.n || 0,
		activityCount: activityCount?.n || 0
	});
};

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const { companyId } = event.params;

	const [existing] = await db.select().from(crmCompanies).where(eq(crmCompanies.id, companyId));
	if (!existing) return json({ error: 'Company not found' }, { status: 404 });

	const body = await event.request.json();
	const updates: Record<string, unknown> = { updatedAt: Date.now() };

	const fields = [
		'name',
		'website',
		'industry',
		'size',
		'phone',
		'address',
		'city',
		'state',
		'country',
		'notes',
		'ownerId'
	];
	for (const f of fields) {
		if (f in body) updates[f] = body[f];
	}

	if ('name' in body && !body.name?.trim()) {
		return json({ error: 'Company name is required' }, { status: 400 });
	}

	await db.update(crmCompanies).set(updates).where(eq(crmCompanies.id, companyId));
	const [updated] = await db.select().from(crmCompanies).where(eq(crmCompanies.id, companyId));
	if (updated) indexDocument('companies', { id: updated.id, name: updated.name, website: updated.website, industry: updated.industry, size: updated.size, phone: updated.phone, city: updated.city, state: updated.state, ownerId: updated.ownerId, notes: updated.notes, updatedAt: updated.updatedAt });
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { companyId } = event.params;

	const [existing] = await db.select().from(crmCompanies).where(eq(crmCompanies.id, companyId));
	if (!existing) return json({ error: 'Company not found' }, { status: 404 });

	await db.delete(crmCompanies).where(eq(crmCompanies.id, companyId));
	removeDocument('companies', companyId);
	return json({ ok: true });
};
