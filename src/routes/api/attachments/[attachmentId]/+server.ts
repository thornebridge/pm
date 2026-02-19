import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { attachments, activityLog } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { createReadStream } from 'fs';
import { unlink, stat } from 'fs/promises';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const attachment = db
		.select()
		.from(attachments)
		.where(eq(attachments.id, event.params.attachmentId))
		.get();

	if (!attachment) {
		throw error(404, 'Attachment not found');
	}

	// Verify file exists on disk
	try {
		await stat(attachment.storagePath);
	} catch {
		throw error(404, 'File not found on disk');
	}

	const stream = createReadStream(attachment.storagePath);
	const readableStream = new ReadableStream({
		start(controller) {
			stream.on('data', (chunk: Buffer) => {
				controller.enqueue(new Uint8Array(chunk));
			});
			stream.on('end', () => {
				controller.close();
			});
			stream.on('error', (err) => {
				controller.error(err);
			});
		},
		cancel() {
			stream.destroy();
		}
	});

	return new Response(readableStream, {
		headers: {
			'Content-Type': attachment.mimeType,
			'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.originalName)}"`,
			'Content-Length': attachment.size.toString()
		}
	});
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const attachment = db
		.select()
		.from(attachments)
		.where(eq(attachments.id, event.params.attachmentId))
		.get();

	if (!attachment) {
		return json({ error: 'Attachment not found' }, { status: 404 });
	}

	// Remove file from disk (ignore errors if file is already gone)
	try {
		await unlink(attachment.storagePath);
	} catch {
		// File may already be deleted; proceed with DB cleanup
	}

	db.delete(attachments).where(eq(attachments.id, event.params.attachmentId)).run();

	db.insert(activityLog)
		.values({
			id: nanoid(12),
			taskId: attachment.taskId,
			userId: user.id,
			action: 'attachment_removed',
			detail: JSON.stringify({ attachmentId: attachment.id, filename: attachment.originalName }),
			createdAt: Date.now()
		})
		.run();

	return json({ ok: true });
};
