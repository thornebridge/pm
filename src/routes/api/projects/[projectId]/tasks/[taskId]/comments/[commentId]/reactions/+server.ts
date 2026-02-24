import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { commentReactions, comments } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { broadcastReactionChanged } from '$lib/server/ws/handlers.js';

const ALLOWED_EMOJIS = ['\ud83d\udc4d', '\ud83d\udc4e', '\u2764\ufe0f', '\ud83c\udf89', '\ud83d\ude04', '\ud83d\udc40', '\ud83d\ude80', '\ud83d\udcaf'];

// POST: toggle a reaction (add if missing, remove if exists)
export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { emoji } = await event.request.json();

	if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
		return json({ error: 'Invalid emoji' }, { status: 400 });
	}

	// Verify comment exists
	const [comment] = await db
		.select({ id: comments.id })
		.from(comments)
		.where(and(eq(comments.id, event.params.commentId), eq(comments.taskId, event.params.taskId)));

	if (!comment) return json({ error: 'Comment not found' }, { status: 404 });

	// Check if reaction exists
	const [existing] = await db
		.select()
		.from(commentReactions)
		.where(
			and(
				eq(commentReactions.commentId, event.params.commentId),
				eq(commentReactions.userId, user.id),
				eq(commentReactions.emoji, emoji)
			)
		);

	if (existing) {
		// Remove
		await db.delete(commentReactions)
			.where(
				and(
					eq(commentReactions.commentId, event.params.commentId),
					eq(commentReactions.userId, user.id),
					eq(commentReactions.emoji, emoji)
				)
			);
		broadcastReactionChanged(event.params.projectId, user.id);
		return json({ action: 'removed' });
	} else {
		// Add
		await db.insert(commentReactions)
			.values({
				commentId: event.params.commentId,
				userId: user.id,
				emoji,
				createdAt: Date.now()
			});
		broadcastReactionChanged(event.params.projectId, user.id);
		return json({ action: 'added' });
	}
};
