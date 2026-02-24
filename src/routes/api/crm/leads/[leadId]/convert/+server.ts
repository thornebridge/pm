import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import {
	crmLeads, crmCompanies, crmContacts, crmOpportunities,
	crmOpportunityContacts, crmActivities, crmPipelineStages
} from '$lib/server/db/schema.js';
import { eq, asc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { indexDocument } from '$lib/server/search/meilisearch.js';
import { emitCrmAutomationEvent } from '$lib/server/crm-automations/emit.js';

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { leadId } = event.params;
	const body = await event.request.json();

	// Validate lead exists and is not already converted
	const [lead] = await db.select().from(crmLeads).where(eq(crmLeads.id, leadId));
	if (!lead) return json({ error: 'Lead not found' }, { status: 404 });
	if (lead.convertedAt) return json({ error: 'Lead already converted' }, { status: 400 });

	// Validate required fields
	if (!body.companyName?.trim()) return json({ error: 'Company name is required' }, { status: 400 });
	if (!body.firstName?.trim() || !body.lastName?.trim()) return json({ error: 'Contact name is required' }, { status: 400 });
	if (body.createOpportunity && !body.opportunityTitle?.trim()) {
		return json({ error: 'Opportunity title is required' }, { status: 400 });
	}

	const now = Date.now();

	const result = await db.transaction(async (tx) => {
		// 1. Create company
		const company = {
			id: nanoid(12),
			name: body.companyName.trim(),
			website: body.website || lead.website || null,
			industry: body.industry || lead.industry || null,
			size: body.companySize || lead.companySize || null,
			phone: null as string | null,
			address: body.address || lead.address || null,
			city: null as string | null,
			state: null as string | null,
			country: 'US',
			notes: null as string | null,
			ownerId: lead.ownerId,
			createdBy: user.id,
			createdAt: now,
			updatedAt: now
		};
		await tx.insert(crmCompanies).values(company);

		// 2. Create contact
		const contact = {
			id: nanoid(12),
			firstName: body.firstName.trim(),
			lastName: body.lastName.trim(),
			email: body.email || lead.email || null,
			phone: body.phone || lead.phone || null,
			title: body.contactTitle || lead.title || null,
			isPrimary: true,
			companyId: company.id,
			source: lead.source === 'csv_import' ? 'other' as const : (lead.source as any) || null,
			notes: null as string | null,
			ownerId: lead.ownerId,
			createdBy: user.id,
			createdAt: now,
			updatedAt: now
		};
		await tx.insert(crmContacts).values(contact);

		// 3. Optionally create opportunity
		let opportunity: typeof crmOpportunities.$inferInsert | null = null;

		if (body.createOpportunity) {
			// Get target stage or default to first
			let stageId = body.stageId;
			if (!stageId) {
				const [firstStage] = await tx
					.select({ id: crmPipelineStages.id })
					.from(crmPipelineStages)
					.orderBy(asc(crmPipelineStages.position))
					.limit(1);
				stageId = firstStage?.id;
			}

			if (!stageId) {
				throw new Error('No pipeline stages configured');
			}

			const [maxPos] = await tx
				.select({ max: sql<number>`COALESCE(MAX(${crmOpportunities.position}), 0)` })
				.from(crmOpportunities)
				.where(eq(crmOpportunities.stageId, stageId));

			opportunity = {
				id: nanoid(12),
				title: body.opportunityTitle.trim(),
				companyId: company.id,
				contactId: contact.id,
				stageId,
				value: body.value ?? null,
				currency: 'USD',
				probability: null,
				expectedCloseDate: null,
				actualCloseDate: null,
				priority: body.priority || 'warm',
				source: lead.source === 'csv_import' ? 'other' : (lead.source as any) || null,
				description: null,
				lostReason: null,
				forecastCategory: null,
				nextStep: null,
				nextStepDueDate: null,
				stageEnteredAt: now,
				position: (maxPos?.max ?? 0) + 1,
				ownerId: lead.ownerId,
				createdBy: user.id,
				createdAt: now,
				updatedAt: now
			};
			await tx.insert(crmOpportunities).values(opportunity);

			// Link contact to opportunity
			await tx.insert(crmOpportunityContacts).values({
				opportunityId: opportunity.id,
				contactId: contact.id,
				role: 'decision_maker'
			});
		}

		// 4. Transfer activities from lead to new entities
		await tx.update(crmActivities).set({
			contactId: contact.id,
			companyId: company.id,
			updatedAt: now
		}).where(eq(crmActivities.leadId, leadId));

		// 5. Mark lead as converted
		await tx.update(crmLeads).set({
			convertedAt: now,
			convertedCompanyId: company.id,
			convertedContactId: contact.id,
			convertedOpportunityId: opportunity?.id || null,
			updatedAt: now
		}).where(eq(crmLeads.id, leadId));

		return { company, contact, opportunity };
	});

	// Fire-and-forget: index new records
	indexDocument('companies', { id: result.company.id, name: result.company.name, website: result.company.website, industry: result.company.industry, size: result.company.size, ownerId: result.company.ownerId, updatedAt: result.company.updatedAt });
	indexDocument('contacts', { id: result.contact.id, firstName: result.contact.firstName, lastName: result.contact.lastName, email: result.contact.email, phone: result.contact.phone, title: result.contact.title, source: result.contact.source, companyId: result.contact.companyId, ownerId: result.contact.ownerId, updatedAt: result.contact.updatedAt });
	if (result.opportunity) {
		indexDocument('opportunities', { id: result.opportunity.id, title: result.opportunity.title, companyId: result.opportunity.companyId, stageId: result.opportunity.stageId, ownerId: result.opportunity.ownerId, priority: result.opportunity.priority, source: result.opportunity.source, updatedAt: result.opportunity.updatedAt });
	}
	indexDocument('leads', { id: lead.id, firstName: lead.firstName, lastName: lead.lastName, email: lead.email, companyName: lead.companyName, statusId: lead.statusId, ownerId: lead.ownerId, convertedAt: now, updatedAt: now, createdAt: lead.createdAt });

	// Fire automation events
	emitCrmAutomationEvent({ event: 'company.created', entityType: 'company', entityId: result.company.id, entity: result.company as unknown as Record<string, unknown>, userId: user.id });
	emitCrmAutomationEvent({ event: 'contact.created', entityType: 'contact', entityId: result.contact.id, entity: result.contact as unknown as Record<string, unknown>, userId: user.id });
	if (result.opportunity) {
		emitCrmAutomationEvent({ event: 'opportunity.created', entityType: 'opportunity', entityId: result.opportunity.id, entity: result.opportunity as unknown as Record<string, unknown>, userId: user.id });
	}
	emitCrmAutomationEvent({ event: 'lead.converted', entityType: 'lead', entityId: leadId, entity: { ...lead, convertedAt: now } as unknown as Record<string, unknown>, userId: user.id });

	return json(result, { status: 201 });
};
