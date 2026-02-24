import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import {
	crmContacts,
	crmCompanies,
	crmOpportunityContacts,
	crmOpportunities,
	crmActivities,
	crmPipelineStages,
	users,
	gmailEntityLinks,
	gmailThreads
} from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	const contact = db.select().from(crmContacts).where(eq(crmContacts.id, params.contactId)).get();
	if (!contact) throw error(404, 'Contact not found');

	const company = contact.companyId
		? db.select().from(crmCompanies).where(eq(crmCompanies.id, contact.companyId)).get()
		: null;

	const owner = contact.ownerId
		? db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, contact.ownerId)).get()
		: null;

	// Opportunities this contact is linked to
	const oppLinks = db
		.select({
			opportunityId: crmOpportunityContacts.opportunityId,
			role: crmOpportunityContacts.role
		})
		.from(crmOpportunityContacts)
		.where(eq(crmOpportunityContacts.contactId, params.contactId))
		.all();

	let opportunities: Array<{
		id: string;
		title: string;
		value: number | null;
		currency: string;
		stageName: string;
		stageColor: string;
		role: string | null;
	}> = [];

	if (oppLinks.length > 0) {
		opportunities = oppLinks
			.map((link) => {
				const opp = db
					.select({
						id: crmOpportunities.id,
						title: crmOpportunities.title,
						value: crmOpportunities.value,
						currency: crmOpportunities.currency,
						stageName: crmPipelineStages.name,
						stageColor: crmPipelineStages.color
					})
					.from(crmOpportunities)
					.innerJoin(crmPipelineStages, eq(crmOpportunities.stageId, crmPipelineStages.id))
					.where(eq(crmOpportunities.id, link.opportunityId))
					.get();
				return opp ? { ...opp, role: link.role } : null;
			})
			.filter(Boolean) as typeof opportunities;
	}

	const activities = db
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
		.where(eq(crmActivities.contactId, params.contactId))
		.orderBy(desc(crmActivities.createdAt))
		.limit(20)
		.all();

	// Get linked email threads
	const emailLinks = db.select({ threadId: gmailEntityLinks.threadId })
		.from(gmailEntityLinks)
		.where(eq(gmailEntityLinks.contactId, params.contactId))
		.all();
	const emailThreadIds = [...new Set(emailLinks.map((l) => l.threadId))];
	const emails = emailThreadIds.flatMap((tid) => {
		const t = db.select().from(gmailThreads).where(eq(gmailThreads.id, tid)).get();
		return t ? [t] : [];
	}).sort((a, b) => b.lastMessageAt - a.lastMessageAt);

	return { contact, company, owner, opportunities, activities, emails };
};
