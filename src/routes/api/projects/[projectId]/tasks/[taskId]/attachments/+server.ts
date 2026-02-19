import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { attachments, activityLog, users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { mkdir } from 'fs/promises';
import { createWriteStream } from 'fs';
import { env } from '$env/dynamic/private';
import path from 'node:path';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

function getUploadDir(): string {
	return env.PM_UPLOAD_DIR || './data/uploads';
}

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const result = db
		.select({
			id: attachments.id,
			filename: attachments.filename,
			originalName: attachments.originalName,
			mimeType: attachments.mimeType,
			size: attachments.size,
			storagePath: attachments.storagePath,
			uploadedBy: attachments.uploadedBy,
			createdAt: attachments.createdAt,
			uploaderName: users.name
		})
		.from(attachments)
		.innerJoin(users, eq(attachments.uploadedBy, users.id))
		.where(eq(attachments.taskId, event.params.taskId))
		.all();

	return json(result);
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const formData = await event.request.formData();
	const file = formData.get('file') as File | null;

	if (!file || !(file instanceof File)) {
		return json({ error: 'No file provided' }, { status: 400 });
	}

	if (file.size > MAX_FILE_SIZE) {
		return json({ error: 'File exceeds 25 MB limit' }, { status: 400 });
	}

	const now = new Date();
	const year = now.getFullYear().toString();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const fileId = nanoid(12);
	const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
	const storedFilename = `${fileId}-${safeFilename}`;

	const uploadDir = path.join(getUploadDir(), year, month);
	await mkdir(uploadDir, { recursive: true });

	const storagePath = path.join(uploadDir, storedFilename);

	// Write file to disk
	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	await new Promise<void>((resolve, reject) => {
		const stream = createWriteStream(storagePath);
		stream.on('finish', resolve);
		stream.on('error', reject);
		stream.write(buffer);
		stream.end();
	});

	const id = nanoid(12);
	const timestamp = Date.now();

	db.insert(attachments)
		.values({
			id,
			taskId: event.params.taskId,
			filename: storedFilename,
			originalName: file.name,
			mimeType: file.type || 'application/octet-stream',
			size: file.size,
			storagePath,
			uploadedBy: user.id,
			createdAt: timestamp
		})
		.run();

	db.insert(activityLog)
		.values({
			id: nanoid(12),
			taskId: event.params.taskId,
			userId: user.id,
			action: 'attachment_added',
			detail: JSON.stringify({ attachmentId: id, filename: file.name }),
			createdAt: timestamp
		})
		.run();

	const result = {
		id,
		filename: storedFilename,
		originalName: file.name,
		mimeType: file.type || 'application/octet-stream',
		size: file.size,
		storagePath,
		uploadedBy: user.id,
		uploaderName: user.name,
		createdAt: timestamp
	};

	return json(result, { status: 201 });
};
