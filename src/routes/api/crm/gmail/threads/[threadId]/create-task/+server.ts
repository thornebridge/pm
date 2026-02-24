import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { gmailThreads, gmailEntityLinks, crmTasks } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { threadId } = event.params;

	// Verify thread belongs to user
	const [thread] = await db.select()
		.from(gmailThreads)
		.where(and(eq(gmailThreads.id, threadId), eq(gmailThreads.userId, user.id)));

	if (!thread) {
		return new Response(JSON.stringify({ error: 'Thread not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const body = await event.request.json();
	const validPriorities = ['urgent', 'high', 'medium', 'low'] as const;
	type Priority = (typeof validPriorities)[number];
	const {
		title = `Follow up: ${thread.subject}`,
		description,
		dueDate,
		priority: rawPriority = 'medium',
		assigneeId = user.id,
		opportunityId,
		contactId,
		companyId
	} = body as {
		title?: string;
		description?: string;
		dueDate?: number;
		priority?: string;
		assigneeId?: string;
		opportunityId?: string;
		contactId?: string;
		companyId?: string;
	};
	const priority: Priority = validPriorities.includes(rawPriority as Priority) ? (rawPriority as Priority) : 'medium';

	// Auto-fill from linked entities if not provided
	let finalOppId = opportunityId;
	let finalContactId = contactId;
	let finalCompanyId = companyId;

	if (!finalOppId || !finalContactId || !finalCompanyId) {
		const links = await db.select()
			.from(gmailEntityLinks)
			.where(eq(gmailEntityLinks.threadId, threadId));

		if (!finalContactId) {
			const contactLink = links.find((l) => l.contactId);
			if (contactLink) finalContactId = contactLink.contactId!;
		}
		if (!finalCompanyId) {
			const companyLink = links.find((l) => l.companyId);
			if (companyLink) finalCompanyId = companyLink.companyId!;
		}
		if (!finalOppId) {
			const oppLink = links.find((l) => l.opportunityId);
			if (oppLink) finalOppId = oppLink.opportunityId!;
		}
	}

	const now = Date.now();
	const task = {
		id: nanoid(12),
		title,
		description: description || `Created from email thread: ${thread.subject}`,
		dueDate: dueDate || null,
		priority,
		assigneeId,
		opportunityId: finalOppId || null,
		contactId: finalContactId || null,
		companyId: finalCompanyId || null,
		createdBy: user.id,
		createdAt: now,
		updatedAt: now
	};

	await db.insert(crmTasks).values(task);

	return Response.json({ ok: true, task });
};
