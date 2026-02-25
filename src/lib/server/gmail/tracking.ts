import { db } from '$lib/server/db/index.js';
import { emailTrackingTokens, emailTrackingEvents } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const PM_BASE_URL = 'https://pm.thornebridge.tech';

interface InjectTrackingOpts {
	html: string;
	userId: string;
	recipientEmail: string;
	subject: string;
}

interface InjectTrackingResult {
	html: string;
	tokenId: string;
}

export async function injectTracking(opts: InjectTrackingOpts): Promise<InjectTrackingResult> {
	const tokenId = nanoid(12);
	const linkMap: Array<{ token: string; originalUrl: string }> = [];

	// Rewrite links
	let processedHtml = opts.html.replace(
		/<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
		(match, before, url, after) => {
			// Skip non-http links
			if (/^(mailto:|#|tel:|javascript:)/i.test(url)) return match;
			const linkToken = nanoid(8);
			linkMap.push({ token: linkToken, originalUrl: url });
			return `<a ${before}href="${PM_BASE_URL}/api/t/c/${tokenId}/${linkToken}"${after}>`;
		}
	);

	// Append tracking pixel
	processedHtml += `<img src="${PM_BASE_URL}/api/t/o/${tokenId}" width="1" height="1" style="display:none;border:0;" alt="" />`;

	// Persist token
	await db.insert(emailTrackingTokens).values({
		id: tokenId,
		messageId: '',
		threadId: null,
		userId: opts.userId,
		recipientEmail: opts.recipientEmail,
		subject: opts.subject,
		trackedLinks: linkMap.length > 0 ? JSON.stringify(linkMap) : null,
		firstOpenedAt: null,
		createdAt: Date.now()
	});

	return { html: processedHtml, tokenId };
}

export async function associateTrackingWithMessage(tokenId: string, messageId: string, threadId?: string): Promise<void> {
	await db.update(emailTrackingTokens)
		.set({
			messageId,
			...(threadId ? { threadId } : {})
		})
		.where(eq(emailTrackingTokens.id, tokenId));
}

export async function recordOpenEvent(tokenId: string, ipAddress: string | null, userAgent: string | null): Promise<void> {
	const [token] = await db.select({ id: emailTrackingTokens.id, firstOpenedAt: emailTrackingTokens.firstOpenedAt })
		.from(emailTrackingTokens)
		.where(eq(emailTrackingTokens.id, tokenId));

	if (!token) return;

	const now = Date.now();

	await db.insert(emailTrackingEvents).values({
		id: nanoid(12),
		tokenId,
		type: 'open',
		linkUrl: null,
		linkToken: null,
		ipAddress,
		userAgent,
		timestamp: now
	});

	// Update firstOpenedAt if this is the first open
	if (!token.firstOpenedAt) {
		await db.update(emailTrackingTokens)
			.set({ firstOpenedAt: now })
			.where(eq(emailTrackingTokens.id, tokenId));
	}
}

export async function getOriginalUrl(tokenId: string, linkToken: string): Promise<string | null> {
	const [token] = await db.select({ trackedLinks: emailTrackingTokens.trackedLinks })
		.from(emailTrackingTokens)
		.where(eq(emailTrackingTokens.id, tokenId));

	if (!token?.trackedLinks) return null;

	try {
		const links: Array<{ token: string; originalUrl: string }> = JSON.parse(token.trackedLinks);
		const match = links.find((l) => l.token === linkToken);
		return match?.originalUrl || null;
	} catch {
		return null;
	}
}

export async function recordClickEvent(
	tokenId: string,
	linkToken: string,
	linkUrl: string,
	ipAddress: string | null,
	userAgent: string | null
): Promise<void> {
	await db.insert(emailTrackingEvents).values({
		id: nanoid(12),
		tokenId,
		type: 'click',
		linkUrl,
		linkToken,
		ipAddress,
		userAgent,
		timestamp: Date.now()
	});
}
