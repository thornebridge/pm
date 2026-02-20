import { broadcast, broadcastAll } from './index.js';

// ── Task helpers (existing, now also broadcast workspace-wide) ──────────────

export function broadcastTaskCreated(projectId: string, task: unknown, userId: string) {
	broadcast(projectId, { type: 'task:created', task }, userId);
	broadcastAll({ type: 'task:created', task });
}

export function broadcastTaskUpdated(projectId: string, task: unknown, userId: string) {
	broadcast(projectId, { type: 'task:updated', task }, userId);
	broadcastAll({ type: 'task:updated', task });
}

export function broadcastTaskDeleted(projectId: string, taskId: string, userId: string) {
	broadcast(projectId, { type: 'task:deleted', taskId }, userId);
	broadcastAll({ type: 'task:deleted', taskId });
}

export function broadcastCommentAdded(projectId: string, taskId: string, comment: unknown, userId: string) {
	broadcast(projectId, { type: 'comment:added', taskId, comment }, userId);
	broadcastAll({ type: 'comment:added', taskId, comment });
}

// ── Project & folder (workspace-only) ───────────────────────────────────────

export function broadcastProjectChanged(event: string) {
	broadcastAll({ type: `project:${event}` });
}

export function broadcastFolderChanged(event: string) {
	broadcastAll({ type: `folder:${event}` });
}

// ── Project-scoped helpers (project subscribers + workspace-wide) ───────────

export function broadcastStatusChanged(projectId: string, userId: string) {
	broadcast(projectId, { type: 'status:changed' }, userId);
	broadcastAll({ type: 'status:changed' });
}

export function broadcastLabelChanged(projectId: string, userId: string) {
	broadcast(projectId, { type: 'label:changed' }, userId);
	broadcastAll({ type: 'label:changed' });
}

export function broadcastChecklistChanged(projectId: string, userId: string) {
	broadcast(projectId, { type: 'checklist:changed' }, userId);
	broadcastAll({ type: 'checklist:changed' });
}

export function broadcastCommentChanged(projectId: string, userId: string) {
	broadcast(projectId, { type: 'comment:changed' }, userId);
	broadcastAll({ type: 'comment:changed' });
}

export function broadcastReactionChanged(projectId: string, userId: string) {
	broadcast(projectId, { type: 'reaction:changed' }, userId);
	broadcastAll({ type: 'reaction:changed' });
}

export function broadcastWatcherChanged(projectId: string, userId: string) {
	broadcast(projectId, { type: 'watcher:changed' }, userId);
	broadcastAll({ type: 'watcher:changed' });
}

export function broadcastDependencyChanged(projectId: string, userId: string) {
	broadcast(projectId, { type: 'dependency:changed' }, userId);
	broadcastAll({ type: 'dependency:changed' });
}

export function broadcastTimeEntryChanged(projectId: string, userId: string) {
	broadcast(projectId, { type: 'time:changed' }, userId);
	broadcastAll({ type: 'time:changed' });
}

export function broadcastAttachmentChanged(projectId: string, userId: string) {
	broadcast(projectId, { type: 'attachment:changed' }, userId);
	broadcastAll({ type: 'attachment:changed' });
}

export function broadcastAutomationChanged(projectId: string, userId: string) {
	broadcast(projectId, { type: 'automation:changed' }, userId);
	broadcastAll({ type: 'automation:changed' });
}

export function broadcastViewChanged(projectId: string, userId: string) {
	broadcast(projectId, { type: 'view:changed' }, userId);
	broadcastAll({ type: 'view:changed' });
}

// ── Workspace-only helpers ──────────────────────────────────────────────────

export function broadcastNotificationChanged() {
	broadcastAll({ type: 'notification:changed' });
}

export function broadcastAdminChanged() {
	broadcastAll({ type: 'admin:changed' });
}
