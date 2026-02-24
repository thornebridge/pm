import { db } from '$lib/server/db/index.js';
import { gmailIntegrations, gmailThreads, gmailMessages, gmailAttachments } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
	getMessage,
	listMessages,
	listHistory,
	getProfile,
	getHeader,
	parseEmailAddress,
	parseEmailList,
	extractBody,
	extractAttachments,
	determineCategory,
	HistoryExpiredError,
	type GmailMessage
} from './gmail-api.js';
import { autoLinkThread } from './auto-link.js';
import { indexDocument, removeDocument } from '$lib/server/search/meilisearch.js';

let pollInterval: ReturnType<typeof setInterval> | null = null;

export function startGmailSyncPoller(intervalMs = 120_000): void {
	if (pollInterval) return;

	pollInterval = setInterval(() => {
		pollAllUsers().catch((err) => {
			console.error('[gmail/sync] Poller error:', err);
		});
	}, intervalMs);

	console.log(`[gmail/sync] Poller started (interval: ${intervalMs}ms)`);
}

export function stopGmailSyncPoller(): void {
	if (pollInterval) {
		clearInterval(pollInterval);
		pollInterval = null;
	}
}

async function pollAllUsers(): Promise<void> {
	const integrations = db.select().from(gmailIntegrations).all();

	for (const integration of integrations) {
		try {
			if (integration.historyId) {
				await incrementalSync(integration.userId);
			} else {
				await initialSync(integration.userId);
			}
		} catch (err) {
			console.error(`[gmail/sync] Failed for user ${integration.userId}:`, err);
		}
	}
}

export async function initialSync(userId: string): Promise<void> {
	console.log(`[gmail/sync] Starting initial sync for user ${userId}`);

	const messageRefs = await listMessages(userId, 'newer_than:30d', 500);
	if (messageRefs.length === 0) {
		// Still save historyId so incremental sync can start
		const profile = await getProfile(userId);
		const now = Date.now();
		db.update(gmailIntegrations)
			.set({ historyId: profile.historyId, lastSyncAt: now, updatedAt: now })
			.where(eq(gmailIntegrations.userId, userId))
			.run();
		return;
	}

	// Batch fetch messages in groups of 50
	for (let i = 0; i < messageRefs.length; i += 50) {
		const batch = messageRefs.slice(i, i + 50);
		const messages = await Promise.all(
			batch.map((ref) => getMessage(userId, ref.id).catch(() => null))
		);

		for (const msg of messages) {
			if (!msg) continue;
			upsertMessage(userId, msg);
		}
	}

	// Get current historyId
	const profile = await getProfile(userId);
	const now = Date.now();
	db.update(gmailIntegrations)
		.set({ historyId: profile.historyId, lastSyncAt: now, updatedAt: now })
		.where(eq(gmailIntegrations.userId, userId))
		.run();

	// Run auto-linking on all synced threads
	const threads = db.select({ id: gmailThreads.id })
		.from(gmailThreads)
		.where(eq(gmailThreads.userId, userId))
		.all();
	for (const thread of threads) {
		autoLinkThread(thread.id, userId);
	}

	console.log(`[gmail/sync] Initial sync complete for user ${userId}: ${messageRefs.length} messages`);
}

export async function incrementalSync(userId: string): Promise<void> {
	const integration = db.select()
		.from(gmailIntegrations)
		.where(eq(gmailIntegrations.userId, userId))
		.get();
	if (!integration?.historyId) return;

	try {
		const { history, historyId: newHistoryId } = await listHistory(userId, integration.historyId);

		const addedThreadIds = new Set<string>();

		for (const record of history) {
			// Handle new messages
			if (record.messagesAdded) {
				for (const { message } of record.messagesAdded) {
					try {
						const fullMsg = await getMessage(userId, message.id);
						upsertMessage(userId, fullMsg);
						addedThreadIds.add(fullMsg.threadId);
					} catch {
						// Message may have been deleted already
					}
				}
			}

			// Handle deleted messages
			if (record.messagesDeleted) {
				for (const { message } of record.messagesDeleted) {
					db.delete(gmailMessages).where(eq(gmailMessages.id, message.id)).run();
					// Update thread message count
					updateThreadFromMessages(message.threadId, userId);
				}
			}

			// Handle label changes
			if (record.labelsAdded || record.labelsRemoved) {
				const affected = [...(record.labelsAdded || []), ...(record.labelsRemoved || [])];
				for (const { message } of affected) {
					try {
						const fullMsg = await getMessage(userId, message.id);
						upsertMessage(userId, fullMsg);
					} catch {
						// Message may have been deleted
					}
				}
			}
		}

		// Auto-link newly added threads
		for (const threadId of addedThreadIds) {
			autoLinkThread(threadId, userId);
		}

		const now = Date.now();
		db.update(gmailIntegrations)
			.set({ historyId: newHistoryId, lastSyncAt: now, updatedAt: now })
			.where(eq(gmailIntegrations.userId, userId))
			.run();
	} catch (err) {
		if (err instanceof HistoryExpiredError) {
			console.log(`[gmail/sync] History expired for user ${userId}, doing full re-sync`);
			// Clear historyId to trigger fresh initial sync
			db.update(gmailIntegrations)
				.set({ historyId: null, updatedAt: Date.now() })
				.where(eq(gmailIntegrations.userId, userId))
				.run();
			await initialSync(userId);
		} else {
			throw err;
		}
	}
}

function upsertMessage(userId: string, msg: GmailMessage): void {
	const now = Date.now();
	const { html, text } = extractBody(msg.payload);
	const attachments = extractAttachments(msg.payload);
	const labelIds = msg.labelIds || [];
	const from = parseEmailAddress(getHeader(msg, 'From'));
	const toRaw = getHeader(msg, 'To');
	const ccRaw = getHeader(msg, 'Cc');
	const bccRaw = getHeader(msg, 'Bcc');
	const subject = getHeader(msg, 'Subject') || '(no subject)';
	const internalDate = parseInt(msg.internalDate, 10);
	const isRead = !labelIds.includes('UNREAD');

	// Upsert message
	const existing = db.select({ id: gmailMessages.id }).from(gmailMessages).where(eq(gmailMessages.id, msg.id)).get();
	if (existing) {
		db.update(gmailMessages)
			.set({
				labelIds: JSON.stringify(labelIds),
				isRead,
				syncedAt: now
			})
			.where(eq(gmailMessages.id, msg.id))
			.run();
	} else {
		db.insert(gmailMessages)
			.values({
				id: msg.id,
				threadId: msg.threadId,
				userId,
				fromEmail: from.email,
				fromName: from.name,
				toEmails: JSON.stringify(parseEmailList(toRaw)),
				ccEmails: ccRaw ? JSON.stringify(parseEmailList(ccRaw)) : null,
				bccEmails: bccRaw ? JSON.stringify(parseEmailList(bccRaw)) : null,
				subject,
				bodyHtml: html || null,
				bodyText: text || null,
				snippet: msg.snippet,
				internalDate,
				labelIds: JSON.stringify(labelIds),
				isRead,
				hasAttachments: attachments.length > 0,
				syncedAt: now
			})
			.run();

		// Upsert attachments
		for (const att of attachments) {
			db.insert(gmailAttachments)
				.values({
					id: nanoid(12),
					messageId: msg.id,
					gmailAttachmentId: att.attachmentId,
					filename: att.filename,
					mimeType: att.mimeType,
					size: att.size
				})
				.onConflictDoNothing()
				.run();
		}
	}

	// Upsert thread
	updateThreadFromMessages(msg.threadId, userId);
}

function updateThreadFromMessages(threadId: string, userId: string): void {
	const now = Date.now();
	const messages = db.select()
		.from(gmailMessages)
		.where(eq(gmailMessages.threadId, threadId))
		.all();

	if (messages.length === 0) {
		// Thread has no messages left — delete it
		db.delete(gmailThreads).where(eq(gmailThreads.id, threadId)).run();
		removeDocument('email_threads', threadId);
		return;
	}

	const latest = messages.reduce((a, b) => (a.internalDate > b.internalDate ? a : b));
	const allLabelIds = messages.flatMap((m) => {
		try { return JSON.parse(m.labelIds || '[]'); } catch { return []; }
	});
	const uniqueLabels = [...new Set(allLabelIds)];
	const isRead = messages.every((m) => m.isRead);
	const isStarred = allLabelIds.includes('STARRED');
	const category = determineCategory(uniqueLabels);

	const existingThread = db.select({ id: gmailThreads.id }).from(gmailThreads).where(eq(gmailThreads.id, threadId)).get();
	if (existingThread) {
		db.update(gmailThreads)
			.set({
				subject: latest.subject,
				snippet: latest.snippet,
				lastMessageAt: latest.internalDate,
				messageCount: messages.length,
				isRead,
				isStarred,
				labels: JSON.stringify(uniqueLabels),
				category,
				syncedAt: now
			})
			.where(eq(gmailThreads.id, threadId))
			.run();
	} else {
		db.insert(gmailThreads)
			.values({
				id: threadId,
				userId,
				subject: latest.subject,
				snippet: latest.snippet,
				lastMessageAt: latest.internalDate,
				messageCount: messages.length,
				isRead,
				isStarred,
				labels: JSON.stringify(uniqueLabels),
				category,
				syncedAt: now
			})
			.run();
	}

	// Index for search
	indexDocument('email_threads', {
		id: threadId, userId, subject: latest.subject, snippet: latest.snippet,
		lastMessageAt: latest.internalDate, messageCount: messages.length,
		category, isRead, isStarred,
		fromEmail: latest.fromEmail, fromName: latest.fromName
	});
}
