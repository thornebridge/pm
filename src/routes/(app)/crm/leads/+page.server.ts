import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { crmLeads, crmLeadStatuses, users } from '$lib/server/db/schema.js';
import { eq, desc, isNull } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const leads = await db
		.select({
			id: crmLeads.id,
			firstName: crmLeads.firstName,
			lastName: crmLeads.lastName,
			email: crmLeads.email,
			phone: crmLeads.phone,
			title: crmLeads.title,
			companyName: crmLeads.companyName,
			source: crmLeads.source,
			statusId: crmLeads.statusId,
			statusName: crmLeadStatuses.name,
			statusColor: crmLeadStatuses.color,
			ownerId: crmLeads.ownerId,
			ownerName: users.name,
			convertedAt: crmLeads.convertedAt,
			createdAt: crmLeads.createdAt
		})
		.from(crmLeads)
		.leftJoin(crmLeadStatuses, eq(crmLeads.statusId, crmLeadStatuses.id))
		.leftJoin(users, eq(crmLeads.ownerId, users.id))
		.where(isNull(crmLeads.convertedAt))
		.orderBy(desc(crmLeads.createdAt));

	return { leads };
};
