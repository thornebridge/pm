import { getSearchClient } from './meilisearch.js';
import { INDEXES } from './indexes.js';
import { db } from '$lib/server/db/index.js';
import {
	crmContacts,
	crmCompanies,
	crmOpportunities,
	crmLeads,
	gmailThreads,
	gmailMessages,
	tasks,
	projects,
	comments
} from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';

const BATCH_SIZE = 500;

/** Create/update all indexes with their settings. Non-blocking. */
export async function initSearchIndexes(): Promise<void> {
	const client = getSearchClient();
	if (!client) return;

	try {
		for (const config of Object.values(INDEXES)) {
			await client.createIndex(config.uid, { primaryKey: config.primaryKey }).catch(() => {
				// Index may already exist, that's fine
			});
			const index = client.index(config.uid);
			await index.updateSearchableAttributes(config.searchableAttributes);
			await index.updateFilterableAttributes(config.filterableAttributes);
			await index.updateSortableAttributes(config.sortableAttributes);
		}
		console.log('[search] Indexes initialized');
	} catch (err) {
		console.error('[search] Failed to initialize indexes:', (err as Error).message);
	}
}

/** Full reindex of all entities. Returns counts per index. */
export async function reindexAll(): Promise<Record<string, number>> {
	const client = getSearchClient();
	if (!client) return {};

	const counts: Record<string, number> = {};

	// Contacts
	counts.contacts = await reindexContacts(client);
	// Companies
	counts.companies = await reindexCompanies(client);
	// Opportunities
	counts.opportunities = await reindexOpportunities(client);
	// Leads
	counts.leads = await reindexLeads(client);
	// Email threads
	counts.email_threads = await reindexEmailThreads(client);
	// Tasks
	counts.tasks = await reindexTasks(client);
	// Projects
	counts.projects = await reindexProjects(client);
	// Comments
	counts.comments = await reindexComments(client);

	console.log('[search] Full reindex complete:', counts);
	return counts;
}

// --- Entity-specific reindexers ---

async function reindexContacts(client: import('meilisearch').MeiliSearch): Promise<number> {
	const index = client.index(INDEXES.contacts.uid);
	await index.deleteAllDocuments();
	const rows = await db.select().from(crmContacts);
	if (rows.length === 0) return 0;
	for (let i = 0; i < rows.length; i += BATCH_SIZE) {
		const batch = rows.slice(i, i + BATCH_SIZE).map((r) => ({
			id: r.id,
			firstName: r.firstName,
			lastName: r.lastName,
			email: r.email,
			phone: r.phone,
			title: r.title,
			source: r.source,
			companyId: r.companyId,
			ownerId: r.ownerId,
			notes: r.notes,
			updatedAt: r.updatedAt
		}));
		await index.addDocuments(batch);
	}
	return rows.length;
}

async function reindexCompanies(client: import('meilisearch').MeiliSearch): Promise<number> {
	const index = client.index(INDEXES.companies.uid);
	await index.deleteAllDocuments();
	const rows = await db.select().from(crmCompanies);
	if (rows.length === 0) return 0;
	for (let i = 0; i < rows.length; i += BATCH_SIZE) {
		const batch = rows.slice(i, i + BATCH_SIZE).map((r) => ({
			id: r.id,
			name: r.name,
			website: r.website,
			industry: r.industry,
			size: r.size,
			phone: r.phone,
			city: r.city,
			state: r.state,
			ownerId: r.ownerId,
			notes: r.notes,
			updatedAt: r.updatedAt
		}));
		await index.addDocuments(batch);
	}
	return rows.length;
}

async function reindexOpportunities(client: import('meilisearch').MeiliSearch): Promise<number> {
	const index = client.index(INDEXES.opportunities.uid);
	await index.deleteAllDocuments();
	const rows = await db.select().from(crmOpportunities);
	if (rows.length === 0) return 0;
	for (let i = 0; i < rows.length; i += BATCH_SIZE) {
		const batch = rows.slice(i, i + BATCH_SIZE).map((r) => ({
			id: r.id,
			title: r.title,
			description: r.description,
			value: r.value,
			currency: r.currency,
			priority: r.priority,
			source: r.source,
			companyId: r.companyId,
			stageId: r.stageId,
			ownerId: r.ownerId,
			nextStep: r.nextStep,
			expectedCloseDate: r.expectedCloseDate,
			updatedAt: r.updatedAt
		}));
		await index.addDocuments(batch);
	}
	return rows.length;
}

async function reindexLeads(client: import('meilisearch').MeiliSearch): Promise<number> {
	const index = client.index(INDEXES.leads.uid);
	await index.deleteAllDocuments();
	const rows = await db.select().from(crmLeads);
	if (rows.length === 0) return 0;
	for (let i = 0; i < rows.length; i += BATCH_SIZE) {
		const batch = rows.slice(i, i + BATCH_SIZE).map((r) => ({
			id: r.id,
			firstName: r.firstName,
			lastName: r.lastName,
			email: r.email,
			phone: r.phone,
			title: r.title,
			companyName: r.companyName,
			source: r.source,
			statusId: r.statusId,
			ownerId: r.ownerId,
			notes: r.notes,
			convertedAt: r.convertedAt,
			updatedAt: r.updatedAt,
			createdAt: r.createdAt
		}));
		await index.addDocuments(batch);
	}
	return rows.length;
}

async function reindexEmailThreads(client: import('meilisearch').MeiliSearch): Promise<number> {
	const index = client.index(INDEXES.email_threads.uid);
	await index.deleteAllDocuments();
	const rows = await db.select().from(gmailThreads);
	if (rows.length === 0) return 0;
	for (let i = 0; i < rows.length; i += BATCH_SIZE) {
		const batchThreads = rows.slice(i, i + BATCH_SIZE);
		const batch = await Promise.all(batchThreads.map(async (thread) => {
			const [latestMsg] = await db.select({ fromEmail: gmailMessages.fromEmail, fromName: gmailMessages.fromName })
				.from(gmailMessages)
				.where(eq(gmailMessages.threadId, thread.id))
				.orderBy(desc(gmailMessages.internalDate))
				.limit(1);
			return {
				id: thread.id,
				userId: thread.userId,
				subject: thread.subject,
				snippet: thread.snippet,
				lastMessageAt: thread.lastMessageAt,
				messageCount: thread.messageCount,
				category: thread.category,
				isRead: thread.isRead,
				isStarred: thread.isStarred,
				fromEmail: latestMsg?.fromEmail || '',
				fromName: latestMsg?.fromName || ''
			};
		}));
		await index.addDocuments(batch);
	}
	return rows.length;
}

async function reindexTasks(client: import('meilisearch').MeiliSearch): Promise<number> {
	const index = client.index(INDEXES.tasks.uid);
	await index.deleteAllDocuments();
	const rows = await db.select({
		id: tasks.id,
		number: tasks.number,
		title: tasks.title,
		projectId: tasks.projectId,
		projectSlug: projects.slug,
		projectName: projects.name,
		assigneeId: tasks.assigneeId,
		statusId: tasks.statusId,
		priority: tasks.priority,
		dueDate: tasks.dueDate,
		updatedAt: tasks.updatedAt
	}).from(tasks).innerJoin(projects, eq(tasks.projectId, projects.id));
	if (rows.length === 0) return 0;
	for (let i = 0; i < rows.length; i += BATCH_SIZE) {
		await index.addDocuments(rows.slice(i, i + BATCH_SIZE));
	}
	return rows.length;
}

async function reindexProjects(client: import('meilisearch').MeiliSearch): Promise<number> {
	const index = client.index(INDEXES.projects.uid);
	await index.deleteAllDocuments();
	const rows = await db.select({
		id: projects.id,
		name: projects.name,
		slug: projects.slug,
		description: projects.description,
		archived: projects.archived,
		updatedAt: projects.updatedAt
	}).from(projects);
	if (rows.length === 0) return 0;
	for (let i = 0; i < rows.length; i += BATCH_SIZE) {
		await index.addDocuments(rows.slice(i, i + BATCH_SIZE));
	}
	return rows.length;
}

async function reindexComments(client: import('meilisearch').MeiliSearch): Promise<number> {
	const index = client.index(INDEXES.comments.uid);
	await index.deleteAllDocuments();
	const rows = await db.select({
		id: comments.id,
		body: comments.body,
		taskId: comments.taskId,
		taskNumber: tasks.number,
		taskTitle: tasks.title,
		projectId: tasks.projectId,
		projectSlug: projects.slug,
		createdAt: comments.createdAt
	}).from(comments)
		.innerJoin(tasks, eq(comments.taskId, tasks.id))
		.innerJoin(projects, eq(tasks.projectId, projects.id));
	if (rows.length === 0) return 0;
	for (let i = 0; i < rows.length; i += BATCH_SIZE) {
		await index.addDocuments(rows.slice(i, i + BATCH_SIZE));
	}
	return rows.length;
}
