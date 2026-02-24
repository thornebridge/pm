import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import {
	crmLeads,
	crmLeadStatuses,
	crmActivities,
	crmCompanies,
	crmContacts,
	crmOpportunities,
	users
} from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	const [lead] = await db.select().from(crmLeads).where(eq(crmLeads.id, params.leadId));
	if (!lead) throw error(404, 'Lead not found');

	const [status] = await db.select().from(crmLeadStatuses).where(eq(crmLeadStatuses.id, lead.statusId));

	const owner = lead.ownerId
		? (await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, lead.ownerId)))[0]
		: null;

	const activities = await db
		.select({
			id: crmActivities.id,
			type: crmActivities.type,
			subject: crmActivities.subject,
			description: crmActivities.description,
			userName: users.name,
			createdAt: crmActivities.createdAt
		})
		.from(crmActivities)
		.innerJoin(users, eq(crmActivities.userId, users.id))
		.where(eq(crmActivities.leadId, params.leadId))
		.orderBy(desc(crmActivities.createdAt))
		.limit(20);

	// If converted, load linked entities
	let convertedCompany = null;
	let convertedContact = null;
	let convertedOpportunity = null;

	if (lead.convertedAt) {
		if (lead.convertedCompanyId) {
			convertedCompany = (await db.select({ id: crmCompanies.id, name: crmCompanies.name }).from(crmCompanies).where(eq(crmCompanies.id, lead.convertedCompanyId)))[0] || null;
		}
		if (lead.convertedContactId) {
			convertedContact = (await db.select({ id: crmContacts.id, firstName: crmContacts.firstName, lastName: crmContacts.lastName }).from(crmContacts).where(eq(crmContacts.id, lead.convertedContactId)))[0] || null;
		}
		if (lead.convertedOpportunityId) {
			convertedOpportunity = (await db.select({ id: crmOpportunities.id, title: crmOpportunities.title }).from(crmOpportunities).where(eq(crmOpportunities.id, lead.convertedOpportunityId)))[0] || null;
		}
	}

	return { lead, status, owner, activities, convertedCompany, convertedContact, convertedOpportunity };
};
