import { broadcast } from './index.js';

export function broadcastTaskCreated(projectId: string, task: unknown, userId: string) {
	broadcast(projectId, { type: 'task:created', task }, userId);
}

export function broadcastTaskUpdated(projectId: string, task: unknown, userId: string) {
	broadcast(projectId, { type: 'task:updated', task }, userId);
}

export function broadcastTaskDeleted(projectId: string, taskId: string, userId: string) {
	broadcast(projectId, { type: 'task:deleted', taskId }, userId);
}

export function broadcastCommentAdded(projectId: string, taskId: string, comment: unknown, userId: string) {
	broadcast(projectId, { type: 'comment:added', taskId, comment }, userId);
}
