import { db } from '$lib/server/db/index.js';
import { gmailIntegrations } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { getGoogleConfig, refreshAccessToken } from '$lib/server/google-auth.js';

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

export async function getValidGmailToken(userId: string): Promise<string | null> {
	const config = await getGoogleConfig();
	if (!config) return null;

	const [integration] = await db
		.select()
		.from(gmailIntegrations)
		.where(eq(gmailIntegrations.userId, userId));
	if (!integration) return null;

	// Refresh if expiring within 5 minutes
	if (integration.tokenExpiry < Date.now() + 5 * 60 * 1000) {
		try {
			const refreshed = await refreshAccessToken(config, integration.refreshToken);
			const now = Date.now();
			await db.update(gmailIntegrations)
				.set({
					accessToken: refreshed.accessToken,
					tokenExpiry: now + refreshed.expiresIn * 1000,
					updatedAt: now
				})
				.where(eq(gmailIntegrations.userId, userId));
			return refreshed.accessToken;
		} catch (err) {
			console.error('[gmail] Token refresh failed:', err);
			return null;
		}
	}

	return integration.accessToken;
}

export class GmailAuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'GmailAuthError';
	}
}

export class GmailApiError extends Error {
	status: number;
	constructor(message: string, status: number) {
		super(message);
		this.name = 'GmailApiError';
		this.status = status;
	}
}

export async function gmailFetch(
	userId: string,
	path: string,
	options: RequestInit = {}
): Promise<Response> {
	const token = await getValidGmailToken(userId);
	if (!token) throw new GmailAuthError('Gmail token expired or refresh failed. Try disconnecting and reconnecting Gmail.');

	const headers = new Headers(options.headers);
	headers.set('Authorization', `Bearer ${token}`);

	const res = await fetch(`${GMAIL_API}${path}`, { ...options, headers });

	// Detect common API errors and provide actionable messages
	if (res.status === 403) {
		const body = await res.json().catch(() => ({}));
		const reason = body?.error?.errors?.[0]?.reason || '';
		const msg = body?.error?.message || '';
		if (reason === 'accessNotConfigured' || msg.includes('has not been used') || msg.includes('is not enabled')) {
			throw new GmailApiError(
				'Gmail API is not enabled. Go to Google Cloud Console → APIs & Services → Enable "Gmail API".',
				403
			);
		}
		if (reason === 'insufficientPermissions' || msg.includes('Insufficient Permission')) {
			throw new GmailApiError(
				'Insufficient Gmail permissions. Disconnect and reconnect Gmail to re-authorize with the required scopes.',
				403
			);
		}
		throw new GmailApiError(`Gmail API access denied: ${msg || reason || 'Unknown 403 error'}`, 403);
	}

	if (res.status === 401) {
		throw new GmailAuthError('Gmail authentication failed. Token may be revoked. Try disconnecting and reconnecting Gmail.');
	}

	return res;
}

/**
 * Validate that the Gmail integration is working (token is valid, API is accessible).
 * Returns { ok: true } or { ok: false, error: string } with an actionable message.
 */
export async function validateConnection(userId: string): Promise<{ ok: boolean; error?: string }> {
	try {
		const token = await getValidGmailToken(userId);
		if (!token) {
			return { ok: false, error: 'Gmail token expired or refresh failed. Try disconnecting and reconnecting Gmail.' };
		}

		const headers = new Headers();
		headers.set('Authorization', `Bearer ${token}`);
		const res = await fetch(`${GMAIL_API}/profile`, { headers });

		if (res.status === 401) {
			return { ok: false, error: 'Gmail authentication failed. Token may be revoked. Disconnect and reconnect Gmail.' };
		}
		if (res.status === 403) {
			const body = await res.json().catch(() => ({}));
			const msg = body?.error?.message || '';
			if (msg.includes('has not been used') || msg.includes('is not enabled')) {
				return { ok: false, error: 'Gmail API is not enabled in your Google Cloud project. Enable it at: Google Cloud Console → APIs & Services → Library → Gmail API.' };
			}
			if (msg.includes('Insufficient Permission')) {
				return { ok: false, error: 'Insufficient Gmail permissions. Disconnect and reconnect Gmail to grant the required scopes.' };
			}
			return { ok: false, error: `Gmail API access denied: ${msg}` };
		}
		if (!res.ok) {
			return { ok: false, error: `Gmail API returned HTTP ${res.status}. Check your Google Cloud project configuration.` };
		}

		return { ok: true };
	} catch (err) {
		if (err instanceof GmailAuthError) return { ok: false, error: err.message };
		if (err instanceof GmailApiError) return { ok: false, error: err.message };
		return { ok: false, error: `Connection test failed: ${err instanceof Error ? err.message : 'Unknown error'}` };
	}
}

export async function getProfile(userId: string): Promise<{ email: string; historyId: string }> {
	const res = await gmailFetch(userId, '/profile');
	if (!res.ok) {
		const body = await res.text().catch(() => '');
		throw new GmailApiError(`Gmail profile fetch failed (${res.status}): ${body}`, res.status);
	}
	const data = await res.json();
	return { email: data.emailAddress, historyId: data.historyId };
}

export async function listMessages(
	userId: string,
	query: string,
	maxResults = 200
): Promise<Array<{ id: string; threadId: string }>> {
	const params = new URLSearchParams({
		q: query,
		maxResults: String(maxResults)
	});

	const all: Array<{ id: string; threadId: string }> = [];
	let pageToken: string | undefined;

	do {
		if (pageToken) params.set('pageToken', pageToken);
		const res = await gmailFetch(userId, `/messages?${params}`);
		if (!res.ok) {
			const body = await res.text().catch(() => '');
			throw new GmailApiError(`Gmail listMessages failed (${res.status}): ${body}`, res.status);
		}
		const data = await res.json();
		if (data.messages) all.push(...data.messages);
		pageToken = data.nextPageToken;
	} while (pageToken && all.length < maxResults);

	return all.slice(0, maxResults);
}

export async function getMessage(
	userId: string,
	messageId: string
): Promise<GmailMessage> {
	const res = await gmailFetch(userId, `/messages/${messageId}?format=full`);
	if (!res.ok) throw new GmailApiError(`Gmail getMessage failed (${res.status})`, res.status);
	return res.json();
}

export async function listHistory(
	userId: string,
	startHistoryId: string
): Promise<{ history: GmailHistoryRecord[]; historyId: string }> {
	const params = new URLSearchParams({ startHistoryId });
	params.append('historyTypes', 'messageAdded');
	params.append('historyTypes', 'messageDeleted');
	params.append('historyTypes', 'labelAdded');
	params.append('historyTypes', 'labelRemoved');

	const allHistory: GmailHistoryRecord[] = [];
	let pageToken: string | undefined;
	let latestHistoryId = startHistoryId;

	do {
		if (pageToken) params.set('pageToken', pageToken);
		const res = await gmailFetch(userId, `/history?${params}`);

		if (res.status === 404) {
			// historyId expired — caller should do full re-sync
			throw new HistoryExpiredError();
		}
		if (!res.ok) throw new GmailApiError(`Gmail listHistory failed (${res.status})`, res.status);

		const data = await res.json();
		if (data.history) allHistory.push(...data.history);
		if (data.historyId) latestHistoryId = data.historyId;
		pageToken = data.nextPageToken;
	} while (pageToken);

	return { history: allHistory, historyId: latestHistoryId };
}

export class HistoryExpiredError extends Error {
	constructor() {
		super('Gmail history ID expired');
		this.name = 'HistoryExpiredError';
	}
}

export async function sendMessage(
	userId: string,
	raw: string,
	threadId?: string
): Promise<{ id: string; threadId: string }> {
	const body: Record<string, string> = { raw };
	if (threadId) body.threadId = threadId;

	const res = await gmailFetch(userId, '/messages/send', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Gmail send failed (${res.status}): ${text}`);
	}
	return res.json();
}

export async function modifyMessage(
	userId: string,
	messageId: string,
	addLabelIds: string[] = [],
	removeLabelIds: string[] = []
): Promise<void> {
	const res = await gmailFetch(userId, `/messages/${messageId}/modify`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ addLabelIds, removeLabelIds })
	});
	if (!res.ok) {
		console.error('[gmail] modifyMessage failed:', res.status);
	}
}

export async function getAttachment(
	userId: string,
	messageId: string,
	attachmentId: string
): Promise<{ data: string; size: number }> {
	const res = await gmailFetch(userId, `/messages/${messageId}/attachments/${attachmentId}`);
	if (!res.ok) throw new Error(`Gmail getAttachment failed (${res.status})`);
	return res.json();
}

// ── Gmail API types ──────────────────────────────────────────────────────────

export interface GmailMessagePart {
	partId?: string;
	mimeType: string;
	filename?: string;
	headers?: Array<{ name: string; value: string }>;
	body?: { attachmentId?: string; size: number; data?: string };
	parts?: GmailMessagePart[];
}

export interface GmailMessage {
	id: string;
	threadId: string;
	labelIds?: string[];
	snippet: string;
	internalDate: string;
	payload: GmailMessagePart;
}

export interface GmailHistoryRecord {
	id: string;
	messages?: Array<{ id: string; threadId: string }>;
	messagesAdded?: Array<{ message: { id: string; threadId: string; labelIds?: string[] } }>;
	messagesDeleted?: Array<{ message: { id: string; threadId: string } }>;
	labelsAdded?: Array<{ message: { id: string; threadId: string; labelIds?: string[] }; labelIds: string[] }>;
	labelsRemoved?: Array<{ message: { id: string; threadId: string; labelIds?: string[] }; labelIds: string[] }>;
}

// ── Message parsing helpers ──────────────────────────────────────────────────

export function getHeader(msg: GmailMessage, name: string): string {
	const header = msg.payload.headers?.find(
		(h) => h.name.toLowerCase() === name.toLowerCase()
	);
	return header?.value || '';
}

export function parseEmailAddress(raw: string): { name: string; email: string } {
	const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
	if (match) return { name: match[1].replace(/^"|"$/g, '').trim(), email: match[2].toLowerCase() };
	return { name: '', email: raw.trim().toLowerCase() };
}

export function parseEmailList(raw: string): string[] {
	if (!raw) return [];
	return raw.split(',').map((e) => parseEmailAddress(e.trim()).email).filter(Boolean);
}

function decodeBase64Url(data: string): string {
	const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
	return Buffer.from(base64, 'base64').toString('utf-8');
}

export function extractBody(payload: GmailMessagePart): { html: string; text: string } {
	let html = '';
	let text = '';

	function walk(part: GmailMessagePart) {
		if (part.mimeType === 'text/html' && part.body?.data) {
			html = decodeBase64Url(part.body.data);
		} else if (part.mimeType === 'text/plain' && part.body?.data) {
			text = decodeBase64Url(part.body.data);
		}
		if (part.parts) part.parts.forEach(walk);
	}

	walk(payload);
	return { html, text };
}

export function extractAttachments(payload: GmailMessagePart): Array<{
	attachmentId: string;
	filename: string;
	mimeType: string;
	size: number;
}> {
	const attachments: Array<{
		attachmentId: string;
		filename: string;
		mimeType: string;
		size: number;
	}> = [];

	function walk(part: GmailMessagePart) {
		if (part.body?.attachmentId && part.filename) {
			attachments.push({
				attachmentId: part.body.attachmentId,
				filename: part.filename,
				mimeType: part.mimeType,
				size: part.body.size
			});
		}
		if (part.parts) part.parts.forEach(walk);
	}

	walk(payload);
	return attachments;
}

export function determineCategory(labelIds: string[]): 'inbox' | 'sent' | 'draft' | 'archived' | 'trash' {
	if (labelIds.includes('TRASH')) return 'trash';
	if (labelIds.includes('DRAFT')) return 'draft';
	if (labelIds.includes('SENT') && !labelIds.includes('INBOX')) return 'sent';
	if (labelIds.includes('INBOX')) return 'inbox';
	return 'archived';
}
