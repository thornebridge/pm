import { db } from '$lib/server/db/index.js';
import { crmContacts, crmCompanies, crmOpportunities } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export interface MergeContext {
	contactId?: string;
	opportunityId?: string;
}

export interface ResolvedMergeData {
	firstName: string;
	lastName: string;
	email: string;
	companyName: string;
	title: string;
	opportunityTitle: string;
	opportunityValue: string;
}

export const MERGE_FIELDS = [
	{ key: '{{firstName}}', label: 'First Name', source: 'Contact' },
	{ key: '{{lastName}}', label: 'Last Name', source: 'Contact' },
	{ key: '{{email}}', label: 'Email', source: 'Contact' },
	{ key: '{{companyName}}', label: 'Company Name', source: 'Contact → Company' },
	{ key: '{{title}}', label: 'Job Title', source: 'Contact' },
	{ key: '{{opportunityTitle}}', label: 'Opportunity Title', source: 'Opportunity' },
	{ key: '{{opportunityValue}}', label: 'Opportunity Value', source: 'Opportunity' }
] as const;

export async function resolveMergeData(ctx: MergeContext): Promise<ResolvedMergeData> {
	const data: ResolvedMergeData = {
		firstName: '',
		lastName: '',
		email: '',
		companyName: '',
		title: '',
		opportunityTitle: '',
		opportunityValue: ''
	};

	if (ctx.contactId) {
		const [contact] = await db
			.select()
			.from(crmContacts)
			.where(eq(crmContacts.id, ctx.contactId));

		if (contact) {
			data.firstName = contact.firstName || '';
			data.lastName = contact.lastName || '';
			data.email = contact.email || '';
			data.title = contact.title || '';

			if (contact.companyId) {
				const [company] = await db
					.select({ name: crmCompanies.name })
					.from(crmCompanies)
					.where(eq(crmCompanies.id, contact.companyId));
				data.companyName = company?.name || '';
			}
		}
	}

	if (ctx.opportunityId) {
		const [opp] = await db
			.select({ title: crmOpportunities.title, value: crmOpportunities.value })
			.from(crmOpportunities)
			.where(eq(crmOpportunities.id, ctx.opportunityId));

		if (opp) {
			data.opportunityTitle = opp.title || '';
			data.opportunityValue = opp.value != null ? String(opp.value) : '';
		}
	}

	return data;
}

export function applyMergeFields(template: string, data: ResolvedMergeData): string {
	return template
		.replace(/\{\{firstName\}\}/g, data.firstName)
		.replace(/\{\{lastName\}\}/g, data.lastName)
		.replace(/\{\{email\}\}/g, data.email)
		.replace(/\{\{companyName\}\}/g, data.companyName)
		.replace(/\{\{title\}\}/g, data.title)
		.replace(/\{\{opportunityTitle\}\}/g, data.opportunityTitle)
		.replace(/\{\{opportunityValue\}\}/g, data.opportunityValue);
}
