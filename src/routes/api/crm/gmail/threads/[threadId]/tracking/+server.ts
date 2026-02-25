import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { gmailThreads, emailTrackingTokens, emailTrackingEvents } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { threadId } = event.params;

	// Verify thread ownership
	const [thread] = await db.select({ id: gmailThreads.id })
		.from(gmailThreads)
		.where(and(eq(gmailThreads.id, threadId), eq(gmailThreads.userId, user.id)));

	if (!thread) {
		return new Response(JSON.stringify({ error: 'Thread not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Get all tracking tokens for this thread
	const tokens = await db.select()
		.from(emailTrackingTokens)
		.where(eq(emailTrackingTokens.threadId, threadId));

	let totalOpens = 0;
	let totalClicks = 0;
	let firstOpenAt: number | null = null;
	let opened = false;
	let clicked = false;

	const messages = [];

	for (const token of tokens) {
		const events = await db.select()
			.from(emailTrackingEvents)
			.where(eq(emailTrackingEvents.tokenId, token.id));

		const opens = events.filter((e) => e.type === 'open');
		const clicks = events.filter((e) => e.type === 'click');

		const openTimestamps = opens.map((e) => e.timestamp);
		const msgFirstOpen = openTimestamps.length > 0 ? Math.min(...openTimestamps) : null;
		const msgLastOpen = openTimestamps.length > 0 ? Math.max(...openTimestamps) : null;

		// Aggregate clicks by URL
		const clicksByUrl: Record<string, { count: number; firstAt: number }> = {};
		for (const c of clicks) {
			const url = c.linkUrl || 'unknown';
			if (!clicksByUrl[url]) {
				clicksByUrl[url] = { count: 0, firstAt: c.timestamp };
			}
			clicksByUrl[url].count++;
			if (c.timestamp < clicksByUrl[url].firstAt) {
				clicksByUrl[url].firstAt = c.timestamp;
			}
		}

		totalOpens += opens.length;
		totalClicks += clicks.length;
		if (opens.length > 0) opened = true;
		if (clicks.length > 0) clicked = true;
		if (msgFirstOpen && (!firstOpenAt || msgFirstOpen < firstOpenAt)) {
			firstOpenAt = msgFirstOpen;
		}

		messages.push({
			messageId: token.messageId,
			recipientEmail: token.recipientEmail,
			opens: {
				count: opens.length,
				firstAt: msgFirstOpen,
				lastAt: msgLastOpen
			},
			clicks: Object.entries(clicksByUrl).map(([url, data]) => ({
				url,
				count: data.count,
				firstAt: data.firstAt
			})),
			totalClicks: clicks.length
		});
	}

	return Response.json({
		messages,
		summary: { totalOpens, totalClicks, opened, clicked, firstOpenAt }
	});
};
