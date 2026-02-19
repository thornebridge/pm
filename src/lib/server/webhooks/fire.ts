import { db } from '../db/index.js';
import { webhooks } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';

export async function fireWebhooks(event: string, payload: Record<string, unknown>) {
	const activeHooks = db
		.select()
		.from(webhooks)
		.where(eq(webhooks.active, true))
		.all();

	for (const hook of activeHooks) {
		const events = JSON.parse(hook.events) as string[];
		if (!events.includes(event) && !events.includes('*')) continue;

		const body = JSON.stringify({ event, timestamp: Date.now(), data: payload });
		const signature = hook.secret
			? crypto.createHmac('sha256', hook.secret).update(body).digest('hex')
			: '';

		fetch(hook.url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Webhook-Event': event,
				'X-Webhook-Signature': signature
			},
			body,
			signal: AbortSignal.timeout(10_000)
		}).catch(() => {
			// Silently fail - don't block the main flow
		});
	}
}
