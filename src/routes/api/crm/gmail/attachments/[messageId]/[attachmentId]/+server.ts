import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { gmailMessages, gmailAttachments } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getAttachment } from '$lib/server/gmail/gmail-api.js';

export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { messageId, attachmentId } = event.params;

	// Verify message belongs to user
	const msg = db.select({ userId: gmailMessages.userId })
		.from(gmailMessages)
		.where(eq(gmailMessages.id, messageId))
		.get();

	if (!msg || msg.userId !== user.id) {
		return new Response('Not found', { status: 404 });
	}

	// Get attachment metadata
	const att = db.select()
		.from(gmailAttachments)
		.where(and(eq(gmailAttachments.messageId, messageId), eq(gmailAttachments.gmailAttachmentId, attachmentId)))
		.get();

	if (!att) {
		return new Response('Not found', { status: 404 });
	}

	try {
		const data = await getAttachment(user.id, messageId, attachmentId);
		const buffer = Buffer.from(data.data, 'base64url');

		return new Response(buffer, {
			headers: {
				'Content-Type': att.mimeType,
				'Content-Disposition': `attachment; filename="${att.filename}"`,
				'Content-Length': String(buffer.length)
			}
		});
	} catch (err) {
		console.error('[gmail] Attachment download failed:', err);
		return new Response('Failed to download attachment', { status: 500 });
	}
};
