import { db } from '$lib/server/db/index.js';
import { emailReminders, gmailThreads, notifications, pushSubscriptions } from '$lib/server/db/schema.js';
import { eq, and, lte } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import webpush from 'web-push';

const PM_BASE_URL = 'https://pm.thornebridge.tech';

export function startEmailReminderPoller(): void {
	setTimeout(() => processEmailReminders().catch((e) =>
		console.error('[email-reminders]', e)), 15_000);
	setInterval(() => processEmailReminders().catch((e) =>
		console.error('[email-reminders]', e)), 5 * 60 * 1000);
}

async function processEmailReminders(): Promise<void> {
	const now = Date.now();

	const pending = await db.select()
		.from(emailReminders)
		.where(and(
			eq(emailReminders.status, 'pending'),
			lte(emailReminders.remindAt, now)
		));

	for (const reminder of pending) {
		try {
			if (reminder.type === 'follow_up') {
				await processFollowUp(reminder);
			} else {
				await processSnooze(reminder);
			}
		} catch (err) {
			console.error(`[email-reminders] Failed to process reminder ${reminder.id}:`, err);
		}
	}
}

async function processFollowUp(reminder: typeof emailReminders.$inferSelect): Promise<void> {
	// Check if a reply was received
	const [thread] = await db.select({ messageCount: gmailThreads.messageCount, subject: gmailThreads.subject })
		.from(gmailThreads)
		.where(eq(gmailThreads.id, reminder.threadId));

	if (!thread) {
		// Thread was deleted
		await db.update(emailReminders)
			.set({ status: 'cancelled', cancelledAt: Date.now(), cancelReason: 'Thread deleted' })
			.where(eq(emailReminders.id, reminder.id));
		return;
	}

	if (reminder.messageCountAtCreation !== null && thread.messageCount > reminder.messageCountAtCreation) {
		// Reply detected — auto-cancel
		await db.update(emailReminders)
			.set({ status: 'auto_cancelled', cancelledAt: Date.now(), cancelReason: 'Recipient replied' })
			.where(eq(emailReminders.id, reminder.id));
		return;
	}

	// No reply — fire the reminder
	await fireReminder(reminder, thread.subject, 'email_follow_up', `Follow up: ${thread.subject}`, 'No reply received');
}

async function processSnooze(reminder: typeof emailReminders.$inferSelect): Promise<void> {
	const [thread] = await db.select({ subject: gmailThreads.subject })
		.from(gmailThreads)
		.where(eq(gmailThreads.id, reminder.threadId));

	if (!thread) {
		await db.update(emailReminders)
			.set({ status: 'cancelled', cancelledAt: Date.now(), cancelReason: 'Thread deleted' })
			.where(eq(emailReminders.id, reminder.id));
		return;
	}

	await fireReminder(reminder, thread.subject, 'email_snooze', `Snoozed thread: ${thread.subject}`, 'Thread unsnoozed');
}

async function fireReminder(
	reminder: typeof emailReminders.$inferSelect,
	subject: string,
	notifType: 'email_follow_up' | 'email_snooze',
	title: string,
	body: string
): Promise<void> {
	const now = Date.now();

	// Create in-app notification
	await db.insert(notifications).values({
		id: nanoid(12),
		userId: reminder.userId,
		type: notifType,
		title,
		body,
		url: `/crm/email?thread=${reminder.threadId}`,
		taskId: null,
		actorId: null,
		read: false,
		createdAt: now
	});

	// Send web push notification
	try {
		const subs = await db.select()
			.from(pushSubscriptions)
			.where(eq(pushSubscriptions.userId, reminder.userId));

		const vapidPublic = process.env.PM_VAPID_PUBLIC_KEY;
		const vapidPrivate = process.env.PM_VAPID_PRIVATE_KEY;
		const vapidEmail = process.env.PM_VAPID_EMAIL;

		if (vapidPublic && vapidPrivate && vapidEmail && subs.length > 0) {
			webpush.setVapidDetails(`mailto:${vapidEmail}`, vapidPublic, vapidPrivate);

			const payload = JSON.stringify({
				title,
				body,
				url: `${PM_BASE_URL}/crm/email?thread=${reminder.threadId}`
			});

			for (const sub of subs) {
				try {
					const pushSub = {
						endpoint: sub.endpoint,
						keys: { p256dh: sub.keysP256dh, auth: sub.keysAuth }
					};
					await webpush.sendNotification(pushSub, payload);
				} catch {
					// Subscription may have expired
				}
			}
		}
	} catch {
		// Non-critical
	}

	// Mark reminder as fired
	await db.update(emailReminders)
		.set({ status: 'fired', firedAt: now })
		.where(eq(emailReminders.id, reminder.id));
}
