import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { commentReactions, comments } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

const ALLOWED_EMOJIS = ['👍', '👎', '❤️', '🎉', '😄', '👀', '🚀', '💯'];

// POST: toggle a reaction (add if missing, remove if exists)
export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { emoji } = await event.request.json();

	if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
		return json({ error: 'Invalid emoji' }, { status: 400 });
	}

	// Verify comment exists
	const comment = comments && db
		.select({ id: comments.id })
		.from(comments)
		.where(and(eq(comments.id, event.params.commentId), eq(comments.taskId, event.params.taskId)))
		.get();

	if (!comment) return json({ error: 'Comment not found' }, { status: 404 });

	// Check if reaction exists
	const existing = db
		.select()
		.from(commentReactions)
		.where(
			and(
				eq(commentReactions.commentId, event.params.commentId),
				eq(commentReactions.userId, user.id),
				eq(commentReactions.emoji, emoji)
			)
		)
		.get();

	if (existing) {
		// Remove
		db.delete(commentReactions)
			.where(
				and(
					eq(commentReactions.commentId, event.params.commentId),
					eq(commentReactions.userId, user.id),
					eq(commentReactions.emoji, emoji)
				)
			)
			.run();
		return json({ action: 'removed' });
	} else {
		// Add
		db.insert(commentReactions)
			.values({
				commentId: event.params.commentId,
				userId: user.id,
				emoji,
				createdAt: Date.now()
			})
			.run();
		return json({ action: 'added' });
	}
};
