import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import {
	gmailThreads,
	gmailMessages,
	gmailAttachments,
	gmailEntityLinks,
	crmContacts,
	crmCompanies,
	crmOpportunities
} from '$lib/server/db/schema.js';
import { eq, and, asc } from 'drizzle-orm';
import { modifyMessage } from '$lib/server/gmail/gmail-api.js';

export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { threadId } = event.params;

	const [thread] = await db.select()
		.from(gmailThreads)
		.where(and(eq(gmailThreads.id, threadId), eq(gmailThreads.userId, user.id)));

	if (!thread) {
		return new Response(JSON.stringify({ error: 'Thread not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const messages = await db.select()
		.from(gmailMessages)
		.where(eq(gmailMessages.threadId, threadId))
		.orderBy(asc(gmailMessages.internalDate));

	// Get attachments for all messages
	const messagesWithAttachments = [];
	for (const msg of messages) {
		const attachments = await db.select()
			.from(gmailAttachments)
			.where(eq(gmailAttachments.messageId, msg.id));
		messagesWithAttachments.push({ ...msg, attachments });
	}

	// Get linked entities
	const links = await db.select()
		.from(gmailEntityLinks)
		.where(eq(gmailEntityLinks.threadId, threadId));

	const linkedEntities = [];
	for (const link of links) {
		if (link.contactId) {
			const [c] = await db.select().from(crmContacts).where(eq(crmContacts.id, link.contactId));
			if (c) linkedEntities.push({ linkId: link.id, type: 'contact', id: c.id, name: `${c.firstName} ${c.lastName}`, linkType: link.linkType });
		} else if (link.companyId) {
			const [c] = await db.select().from(crmCompanies).where(eq(crmCompanies.id, link.companyId));
			if (c) linkedEntities.push({ linkId: link.id, type: 'company', id: c.id, name: c.name, linkType: link.linkType });
		} else if (link.opportunityId) {
			const [o] = await db.select().from(crmOpportunities).where(eq(crmOpportunities.id, link.opportunityId));
			if (o) linkedEntities.push({ linkId: link.id, type: 'opportunity', id: o.id, name: o.title, linkType: link.linkType });
		}
	}

	return Response.json({ thread, messages: messagesWithAttachments, linkedEntities });
};

export const PATCH: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { threadId } = event.params;

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
	const updates: Record<string, unknown> = {};

	// Handle mark read/unread
	if (typeof body.isRead === 'boolean') {
		updates.isRead = body.isRead;
		// Update in Gmail too
		const messages = await db.select({ id: gmailMessages.id })
			.from(gmailMessages)
			.where(eq(gmailMessages.threadId, threadId));
		for (const msg of messages) {
			if (body.isRead) {
				modifyMessage(user.id, msg.id, [], ['UNREAD']).catch(() => {});
			} else {
				modifyMessage(user.id, msg.id, ['UNREAD'], []).catch(() => {});
			}
		}
	}

	// Handle star/unstar
	if (typeof body.isStarred === 'boolean') {
		updates.isStarred = body.isStarred;
		const messages = await db.select({ id: gmailMessages.id })
			.from(gmailMessages)
			.where(eq(gmailMessages.threadId, threadId));
		const firstMsg = messages[0];
		if (firstMsg) {
			if (body.isStarred) {
				modifyMessage(user.id, firstMsg.id, ['STARRED'], []).catch(() => {});
			} else {
				modifyMessage(user.id, firstMsg.id, [], ['STARRED']).catch(() => {});
			}
		}
	}

	// Handle archive
	if (body.archive === true) {
		updates.category = 'archived';
		const messages = await db.select({ id: gmailMessages.id })
			.from(gmailMessages)
			.where(eq(gmailMessages.threadId, threadId));
		for (const msg of messages) {
			modifyMessage(user.id, msg.id, [], ['INBOX']).catch(() => {});
		}
	}

	if (Object.keys(updates).length > 0) {
		await db.update(gmailThreads)
			.set(updates)
			.where(eq(gmailThreads.id, threadId));
	}

	return Response.json({ ok: true });
};
