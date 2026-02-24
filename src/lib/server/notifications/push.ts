import webpush from 'web-push';
import { db } from '../db/index.js';
import { pushSubscriptions } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

let configured = false;

function ensureConfigured() {
	if (configured) return true;

	const publicKey = env.PM_VAPID_PUBLIC_KEY;
	const privateKey = env.PM_VAPID_PRIVATE_KEY;
	const vapidEmail = env.PM_VAPID_EMAIL;

	if (!publicKey || !privateKey || !vapidEmail) return false;

	webpush.setVapidDetails(vapidEmail, publicKey, privateKey);
	configured = true;
	return true;
}

export async function sendPushNotification(
	userId: string,
	payload: { title: string; body: string; url?: string; tag?: string }
) {
	if (!ensureConfigured()) return;

	const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));

	for (const sub of subs) {
		try {
			await webpush.sendNotification(
				{
					endpoint: sub.endpoint,
					keys: { p256dh: sub.keysP256dh, auth: sub.keysAuth }
				},
				JSON.stringify(payload)
			);
		} catch (err: unknown) {
			// Remove invalid subscriptions (410 Gone or 404)
			if (err && typeof err === 'object' && 'statusCode' in err) {
				const statusCode = (err as { statusCode: number }).statusCode;
				if (statusCode === 410 || statusCode === 404) {
					await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
				}
			}
		}
	}
}
