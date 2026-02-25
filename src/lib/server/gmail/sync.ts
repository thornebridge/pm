import { db } from '$lib/server/db/index.js';
import { gmailIntegrations, gmailThreads, gmailMessages, gmailAttachments, emailReminders } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
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
	validateConnection,
	HistoryExpiredError,
	GmailAuthError,
	GmailApiError,
	type GmailMessage
} from './gmail-api.js';
import { autoLinkThread } from './auto-link.js';
import { indexDocument, removeDocument } from '$lib/server/search/meilisearch.js';

let pollInterval: ReturnType<typeof setInterval> | null = null;
const syncingUsers = new Set<string>();

export function startGmailSyncPoller(intervalMs = 120_000): void {
	if (pollInterval) return;

	// Run immediately on startup
	pollAllUsers().catch((err) => {
		console.error('[gmail/sync] Poller error:', err);
	});

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
	const integrations = await db.select().from(gmailIntegrations);

	for (const integration of integrations) {
		// Skip if another sync is already running for this user (e.g. manual sync)
		if (syncingUsers.has(integration.userId)) continue;

		try {
			await db.update(gmailIntegrations)
				.set({ syncStatus: 'syncing', updatedAt: Date.now() })
				.where(eq(gmailIntegrations.userId, integration.userId));

			if (integration.historyId) {
				await _incrementalSync(integration.userId);
			} else {
				await _initialSync(integration.userId);
			}

			await db.update(gmailIntegrations)
				.set({ syncStatus: 'ok', syncError: null, updatedAt: Date.now() })
				.where(eq(gmailIntegrations.userId, integration.userId));
		} catch (err) {
			const errorMsg = classifySyncError(err);
			console.error(`[gmail/sync] Failed for user ${integration.userId}:`, errorMsg);
			await db.update(gmailIntegrations)
				.set({ syncStatus: 'error', syncError: errorMsg, updatedAt: Date.now() })
				.where(eq(gmailIntegrations.userId, integration.userId));
		}
	}
}

function classifySyncError(err: unknown): string {
	if (err instanceof GmailAuthError) return err.message;
	if (err instanceof GmailApiError) return err.message;
	if (err instanceof Error) {
		if (err.message.includes('fetch failed') || err.message.includes('ECONNREFUSED')) {
			return 'Network error connecting to Gmail API. Check your server\'s internet connectivity.';
		}
		return err.message;
	}
	return 'Unknown sync error';
}

export async function initialSync(userId: string): Promise<void> {
	// Acquire per-user lock to prevent concurrent syncs
	if (syncingUsers.has(userId)) {
		console.log(`[gmail/sync] Skipping initial sync for user ${userId} — already syncing`);
		return;
	}
	syncingUsers.add(userId);

	try {
		await _initialSync(userId);
	} finally {
		syncingUsers.delete(userId);
	}
}

async function _initialSync(userId: string): Promise<void> {
	console.log(`[gmail/sync] Starting initial sync for user ${userId}`);

	// Validate connection before attempting sync
	const validation = await validateConnection(userId);
	if (!validation.ok) {
		throw new GmailApiError(validation.error || 'Gmail connection validation failed', 0);
	}

	const messageRefs = await listMessages(userId, 'newer_than:30d', 500);
	if (messageRefs.length === 0) {
		// Still save historyId so incremental sync can start
		const profile = await getProfile(userId);
		const now = Date.now();
		await db.update(gmailIntegrations)
			.set({ historyId: profile.historyId, lastSyncAt: now, updatedAt: now })
			.where(eq(gmailIntegrations.userId, userId));
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
			await upsertMessage(userId, msg);
		}
	}

	// Get current historyId
	const profile = await getProfile(userId);
	const now = Date.now();
	await db.update(gmailIntegrations)
		.set({ historyId: profile.historyId, lastSyncAt: now, updatedAt: now })
		.where(eq(gmailIntegrations.userId, userId));

	// Run auto-linking on all synced threads
	const threads = await db.select({ id: gmailThreads.id })
		.from(gmailThreads)
		.where(eq(gmailThreads.userId, userId));
	for (const thread of threads) {
		await autoLinkThread(thread.id, userId);
	}

	console.log(`[gmail/sync] Initial sync complete for user ${userId}: ${messageRefs.length} messages`);
}

export async function incrementalSync(userId: string): Promise<void> {
	if (syncingUsers.has(userId)) {
		console.log(`[gmail/sync] Skipping incremental sync for user ${userId} — already syncing`);
		return;
	}
	syncingUsers.add(userId);

	try {
		await _incrementalSync(userId);
	} finally {
		syncingUsers.delete(userId);
	}
}

async function _incrementalSync(userId: string): Promise<void> {
	const [integration] = await db.select()
		.from(gmailIntegrations)
		.where(eq(gmailIntegrations.userId, userId));
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
						await upsertMessage(userId, fullMsg);
						addedThreadIds.add(fullMsg.threadId);
					} catch (err) {
						// 404 = message was deleted between history fetch and getMessage — safe to skip
						if (err instanceof Error && err.message.includes('(404)')) continue;
						console.error(`[gmail/sync] Failed to sync message ${message.id}:`, err);
					}
				}
			}

			// Handle deleted messages
			if (record.messagesDeleted) {
				for (const { message } of record.messagesDeleted) {
					await db.delete(gmailMessages).where(eq(gmailMessages.id, message.id));
					// Update thread message count
					await updateThreadFromMessages(message.threadId, userId);
				}
			}

			// Handle label changes
			if (record.labelsAdded || record.labelsRemoved) {
				const affected = [...(record.labelsAdded || []), ...(record.labelsRemoved || [])];
				for (const { message } of affected) {
					try {
						const fullMsg = await getMessage(userId, message.id);
						await upsertMessage(userId, fullMsg);
					} catch (err) {
						if (err instanceof Error && err.message.includes('(404)')) continue;
						console.error(`[gmail/sync] Failed to update labels for message ${message.id}:`, err);
					}
				}
			}
		}

		// Auto-link newly added threads and auto-cancel follow-up reminders on replies
		for (const threadId of addedThreadIds) {
			await autoLinkThread(threadId, userId);
			await checkAndCancelFollowUpReminders(threadId, userId);
		}

		const now = Date.now();
		await db.update(gmailIntegrations)
			.set({ historyId: newHistoryId, lastSyncAt: now, updatedAt: now })
			.where(eq(gmailIntegrations.userId, userId));
	} catch (err) {
		if (err instanceof HistoryExpiredError) {
			console.log(`[gmail/sync] History expired for user ${userId}, doing full re-sync`);
			// Clear historyId to trigger fresh initial sync
			await db.update(gmailIntegrations)
				.set({ historyId: null, updatedAt: Date.now() })
				.where(eq(gmailIntegrations.userId, userId));
			await _initialSync(userId);
		} else {
			throw err;
		}
	}
}

async function upsertMessage(userId: string, msg: GmailMessage): Promise<void> {
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

	// Ensure thread row exists before inserting message (FK constraint)
	await db.insert(gmailThreads)
		.values({
			id: msg.threadId,
			userId,
			subject,
			lastMessageAt: internalDate,
			syncedAt: now
		})
		.onConflictDoNothing();

	// Atomic upsert — avoids race condition between concurrent syncs
	await db.insert(gmailMessages)
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
		.onConflictDoUpdate({
			target: gmailMessages.id,
			set: {
				labelIds: JSON.stringify(labelIds),
				isRead,
				syncedAt: now
			}
		});

	// Upsert attachments
	for (const att of attachments) {
		await db.insert(gmailAttachments)
			.values({
				id: nanoid(12),
				messageId: msg.id,
				gmailAttachmentId: att.attachmentId,
				filename: att.filename,
				mimeType: att.mimeType,
				size: att.size
			})
			.onConflictDoNothing();
	}

	// Upsert thread
	await updateThreadFromMessages(msg.threadId, userId);
}

async function checkAndCancelFollowUpReminders(threadId: string, userId: string): Promise<void> {
	try {
		const pendingReminders = await db.select()
			.from(emailReminders)
			.where(and(
				eq(emailReminders.threadId, threadId),
				eq(emailReminders.userId, userId),
				eq(emailReminders.type, 'follow_up'),
				eq(emailReminders.status, 'pending')
			));

		if (pendingReminders.length === 0) return;

		// Get current thread to check message count
		const [thread] = await db.select({ messageCount: gmailThreads.messageCount })
			.from(gmailThreads)
			.where(eq(gmailThreads.id, threadId));

		if (!thread) return;

		for (const reminder of pendingReminders) {
			if (reminder.messageCountAtCreation !== null && thread.messageCount > reminder.messageCountAtCreation) {
				await db.update(emailReminders)
					.set({ status: 'auto_cancelled', cancelledAt: Date.now(), cancelReason: 'Recipient replied' })
					.where(eq(emailReminders.id, reminder.id));
			}
		}
	} catch (err) {
		console.error(`[gmail/sync] Failed to check follow-up reminders for thread ${threadId}:`, err);
	}
}

async function updateThreadFromMessages(threadId: string, userId: string): Promise<void> {
	const now = Date.now();
	const messages = await db.select()
		.from(gmailMessages)
		.where(eq(gmailMessages.threadId, threadId));

	if (messages.length === 0) {
		// Thread has no messages left — delete it
		await db.delete(gmailThreads).where(eq(gmailThreads.id, threadId));
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

	// Atomic upsert — avoids race condition between concurrent syncs
	await db.insert(gmailThreads)
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
		.onConflictDoUpdate({
			target: gmailThreads.id,
			set: {
				subject: latest.subject,
				snippet: latest.snippet,
				lastMessageAt: latest.internalDate,
				messageCount: messages.length,
				isRead,
				isStarred,
				labels: JSON.stringify(uniqueLabels),
				category,
				syncedAt: now
			}
		});

	// Index for search
	indexDocument('email_threads', {
		id: threadId, userId, subject: latest.subject, snippet: latest.snippet,
		lastMessageAt: latest.internalDate, messageCount: messages.length,
		category, isRead, isStarred,
		fromEmail: latest.fromEmail, fromName: latest.fromName
	});
}
