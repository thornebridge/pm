<script lang="ts">
	import PriorityIcon from '$lib/components/task/PriorityIcon.svelte';
	import TaskTypeIcon from '$lib/components/task/TaskTypeIcon.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import MarkdownPreview from '$lib/components/markdown/MarkdownPreview.svelte';
	import MentionInput from '$lib/components/editor/MentionInput.svelte';
	import { api } from '$lib/utils/api.js';
	import { goto, invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';
	import { pushScope, popScope } from '$lib/utils/keyboard.js';
	import { onMount, onDestroy } from 'svelte';

	let { data } = $props();

	let commentBody = $state('');
	let submitting = $state(false);
	let editingTitle = $state(false);
	let titleInput = $state(data.task.title);
	let editingDescription = $state(false);
	let descriptionInput = $state(data.task.description ?? '');

	// Comment editing state
	let editingCommentId = $state<string | null>(null);
	let editingCommentBody = $state('');

	// Checklist state
	let newChecklistItem = $state('');
	let addingChecklist = $state(false);

	// Activity/comments tab state
	let activityTab = $state<'all' | 'comments' | 'history'>('all');
	let activityLimit = $state(10);

	// Subtask state
	let newSubtaskTitle = $state('');
	let addingSubtask = $state(false);

	// Recurrence state
	let recurrence = $state<{ freq: string; interval: number; endDate?: number | null } | null>(
		data.task.recurrence ? JSON.parse(data.task.recurrence) : null
	);
	$effect(() => {
		recurrence = data.task.recurrence ? JSON.parse(data.task.recurrence) : null;
	});

	function updateRecurrence(freq: string | null) {
		if (!freq) {
			recurrence = null;
			updateField('recurrence', null);
		} else {
			const rule = { freq, interval: recurrence?.interval || 1 };
			recurrence = rule;
			updateField('recurrence', rule);
		}
	}

	function updateRecurrenceInterval(interval: number) {
		if (!recurrence) return;
		const rule = { ...recurrence, interval };
		recurrence = rule;
		updateField('recurrence', rule);
	}

	// Watch state
	let watching = $state(data.isWatching);
	$effect(() => { watching = data.isWatching; });

	$effect(() => { titleInput = data.task.title; });
	$effect(() => { descriptionInput = data.task.description ?? ''; });

	const statusMap = $derived(new Map(data.statuses.map((s) => [s.id, s])));
	const currentStatus = $derived(statusMap.get(data.task.statusId));
	const memberMap = $derived(new Map(data.members.map((m) => [m.id, m.name])));

	// Contextual keyboard scope
	let scope: ReturnType<typeof pushScope> | null = null;
	onMount(() => {
		const sortedStatuses = [...data.statuses].sort((a, b) => a.position - b.position);
		const priorities: Array<'urgent' | 'high' | 'medium' | 'low'> = ['urgent', 'high', 'medium', 'low'];
		scope = pushScope(
			{
				'1': () => sortedStatuses[0] && updateField('statusId', sortedStatuses[0].id),
				'2': () => sortedStatuses[1] && updateField('statusId', sortedStatuses[1].id),
				'3': () => sortedStatuses[2] && updateField('statusId', sortedStatuses[2].id),
				'4': () => sortedStatuses[3] && updateField('statusId', sortedStatuses[3].id),
				'e': () => (editingDescription = true),
				't': () => (editingTitle = true)
			},
			{
				'1': () => updateField('priority', priorities[0]),
				'2': () => updateField('priority', priorities[1]),
				'3': () => updateField('priority', priorities[2]),
				'4': () => updateField('priority', priorities[3])
			}
		);
	});
	onDestroy(() => {
		if (scope) popScope(scope);
	});

	async function updateField(field: string, value: unknown) {
		try {
			await api(`/api/projects/${data.task.projectId}/tasks/${data.task.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ [field]: value })
			});
			await invalidateAll();
		} catch {
			showToast(`Failed to update ${field}`, 'error');
		}
	}

	async function saveTitle() {
		if (titleInput.trim() && titleInput !== data.task.title) {
			await updateField('title', titleInput);
		}
		editingTitle = false;
	}

	async function saveDescription() {
		const newDesc = descriptionInput.trim() || null;
		if (newDesc !== (data.task.description ?? null)) {
			await updateField('description', newDesc);
		}
		editingDescription = false;
	}

	async function addComment() {
		if (!commentBody.trim()) return;
		submitting = true;
		try {
			await api(`/api/projects/${data.task.projectId}/tasks/${data.task.id}/comments`, {
				method: 'POST',
				body: JSON.stringify({ body: commentBody })
			});
			commentBody = '';
			await invalidateAll();
		} catch {
			showToast('Failed to add comment', 'error');
		} finally {
			submitting = false;
		}
	}

	async function saveComment(commentId: string) {
		if (!editingCommentBody.trim()) return;
		try {
			await api(`/api/projects/${data.task.projectId}/tasks/${data.task.id}/comments/${commentId}`, {
				method: 'PATCH',
				body: JSON.stringify({ body: editingCommentBody })
			});
			editingCommentId = null;
			editingCommentBody = '';
			await invalidateAll();
		} catch {
			showToast('Failed to update comment', 'error');
		}
	}

	async function deleteComment(commentId: string) {
		try {
			await api(`/api/projects/${data.task.projectId}/tasks/${data.task.id}/comments/${commentId}`, {
				method: 'DELETE'
			});
			await invalidateAll();
		} catch {
			showToast('Failed to delete comment', 'error');
		}
	}

	const REACTION_EMOJIS = ['👍', '👎', '❤️', '🎉', '😄', '👀', '🚀', '💯'];
	let reactionPickerOpen = $state<string | null>(null);

	function groupReactions(reactions: Array<{ emoji: string; userName: string; userId: string }>): Array<[string, { users: string[]; userIds: string[] }]> {
		const map: Record<string, { users: string[]; userIds: string[] }> = {};
		for (const r of reactions) {
			if (!map[r.emoji]) map[r.emoji] = { users: [], userIds: [] };
			map[r.emoji].users.push(r.userName);
			map[r.emoji].userIds.push(r.userId);
		}
		return Object.entries(map);
	}

	async function toggleReaction(commentId: string, emoji: string) {
		reactionPickerOpen = null;
		try {
			await api(`/api/projects/${data.task.projectId}/tasks/${data.task.id}/comments/${commentId}/reactions`, {
				method: 'POST',
				body: JSON.stringify({ emoji })
			});
			await invalidateAll();
		} catch {
			showToast('Failed to react', 'error');
		}
	}

	async function addChecklistItem() {
		if (!newChecklistItem.trim()) return;
		addingChecklist = true;
		try {
			await api(`/api/projects/${data.task.projectId}/tasks/${data.task.id}/checklist`, {
				method: 'POST',
				body: JSON.stringify({ title: newChecklistItem })
			});
			newChecklistItem = '';
			await invalidateAll();
		} catch {
			showToast('Failed to add checklist item', 'error');
		} finally {
			addingChecklist = false;
		}
	}

	async function toggleChecklistItem(itemId: string, completed: boolean) {
		try {
			await api(`/api/projects/${data.task.projectId}/tasks/${data.task.id}/checklist/${itemId}`, {
				method: 'PATCH',
				body: JSON.stringify({ completed: !completed })
			});
			await invalidateAll();
		} catch {
			showToast('Failed to update item', 'error');
		}
	}

	async function deleteChecklistItem(itemId: string) {
		try {
			await api(`/api/projects/${data.task.projectId}/tasks/${data.task.id}/checklist/${itemId}`, {
				method: 'DELETE'
			});
			await invalidateAll();
		} catch {
			showToast('Failed to delete item', 'error');
		}
	}

	// Checklist drag-and-drop reorder
	let dragIndex = $state<number | null>(null);
	let dropIndex = $state<number | null>(null);

	function handleDragStart(e: DragEvent, index: number) {
		dragIndex = index;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(index));
		}
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dropIndex = index;
	}

	function handleDragLeave() {
		dropIndex = null;
	}

	async function handleDrop(e: DragEvent, toIndex: number) {
		e.preventDefault();
		dropIndex = null;
		if (dragIndex === null || dragIndex === toIndex) { dragIndex = null; return; }

		const items = [...data.checklist];
		const [moved] = items.splice(dragIndex, 1);
		items.splice(toIndex, 0, moved);
		dragIndex = null;

		const order = items.map((i) => i.id);
		try {
			await api(`/api/projects/${data.task.projectId}/tasks/${data.task.id}/checklist`, {
				method: 'PATCH',
				body: JSON.stringify({ order })
			});
			await invalidateAll();
		} catch {
			showToast('Failed to reorder checklist', 'error');
		}
	}

	function handleDragEnd() {
		dragIndex = null;
		dropIndex = null;
	}

	async function addSubtask() {
		if (!newSubtaskTitle.trim()) return;
		addingSubtask = true;
		try {
			await api(`/api/projects/${data.task.projectId}/tasks`, {
				method: 'POST',
				body: JSON.stringify({ title: newSubtaskTitle, parentId: data.task.id })
			});
			newSubtaskTitle = '';
			await invalidateAll();
		} catch {
			showToast('Failed to add subtask', 'error');
		} finally {
			addingSubtask = false;
		}
	}

	async function toggleWatch() {
		try {
			await api(`/api/projects/${data.task.projectId}/tasks/${data.task.id}/watchers`, {
				method: watching ? 'DELETE' : 'POST'
			});
			watching = !watching;
		} catch {
			showToast('Failed to update watch status', 'error');
		}
	}

	let deleting = $state(false);

	async function deleteTask() {
		if (!confirm('Delete this task? This cannot be undone.')) return;
		deleting = true;
		try {
			await api(`/api/projects/${data.task.projectId}/tasks/${data.task.id}`, {
				method: 'DELETE'
			});
			showToast('Task deleted');
			const slug = window.location.pathname.split('/projects/')[1]?.split('/')[0];
			goto(`/projects/${slug}/board`);
		} catch {
			showToast('Failed to delete task', 'error');
		} finally {
			deleting = false;
		}
	}

	let duplicating = $state(false);

	async function duplicateTask() {
		duplicating = true;
		try {
			const result = await api<{ number: number }>(`/api/projects/${data.task.projectId}/tasks/${data.task.id}/duplicate`, {
				method: 'POST'
			});
			showToast(`Task duplicated as #${result.number}`);
			// Navigate to the project slug from URL params to build the correct path
			const slug = window.location.pathname.split('/projects/')[1]?.split('/')[0];
			if (slug && result.number) {
				goto(`/projects/${slug}/task/${result.number}`);
			}
		} catch {
			showToast('Failed to duplicate task', 'error');
		} finally {
			duplicating = false;
		}
	}

	function startEditComment(comment: { id: string; body: string }) {
		editingCommentId = comment.id;
		editingCommentBody = comment.body;
	}

	function formatDate(ts: number) {
		return new Date(ts).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function formatDateInput(ts: number | null): string {
		if (!ts) return '';
		return new Date(ts).toISOString().split('T')[0];
	}

	function actionLabel(action: string): string {
		const labels: Record<string, string> = {
			created: 'created this task',
			status_changed: 'changed status',
			assigned: 'changed assignee',
			priority_changed: 'changed priority',
			commented: 'commented',
			label_added: 'added a label',
			label_removed: 'removed a label',
			edited: 'edited'
		};
		return labels[action] || action;
	}

	function handleCommentKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			addComment();
		}
	}
</script>

<svelte:head>
	<title>#{data.task.number} {data.task.title}</title>
</svelte:head>

<div class="mx-auto max-w-4xl p-6">
	<!-- Parent breadcrumb -->
	{#if data.parentTask}
		<div class="mb-2 text-xs text-surface-500">
			<a href="/projects/{data.project.slug}/task/{data.parentTask.number}" class="hover:text-brand-600">
				#{data.parentTask.number} {data.parentTask.title}
			</a>
			<span class="mx-1">&rsaquo;</span>
			<span>Subtask</span>
		</div>
	{/if}

	<div class="grid grid-cols-1 gap-6 md:grid-cols-[1fr_240px]">
		<!-- Main content -->
		<div>
			<!-- Title -->
			<div class="mb-4">
				{#if editingTitle}
					<input
						bind:value={titleInput}
						onblur={saveTitle}
						onkeydown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { editingTitle = false; titleInput = data.task.title; } }}
						class="w-full rounded bg-surface-100 px-2 py-1 text-lg font-semibold text-surface-900 outline-none focus:ring-1 focus:ring-brand-500 dark:bg-surface-800 dark:text-surface-100"
						autofocus
					/>
				{:else}
					<button onclick={() => (editingTitle = true)} class="flex items-center gap-2 text-left text-lg font-semibold text-surface-900 hover:text-brand-600 dark:text-surface-100 dark:hover:text-white">
						{#if data.task.type && data.task.type !== 'task'}
							<TaskTypeIcon type={data.task.type} />
						{/if}
						<span class="mr-2 text-surface-500">#{data.task.number}</span>
						{data.task.title}
					</button>
				{/if}
			</div>

			<!-- Description -->
			<div class="mb-6">
				{#if editingDescription}
					<textarea
						bind:value={descriptionInput}
						rows={6}
						placeholder="Add a description (markdown supported)..."
						class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
					></textarea>
					<div class="mt-2 flex gap-2">
						<button
							onclick={saveDescription}
							class="rounded-md bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-500"
						>Save</button>
						<button
							onclick={() => { editingDescription = false; descriptionInput = data.task.description ?? ''; }}
							class="rounded-md px-3 py-1 text-xs text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100"
						>Cancel</button>
					</div>
				{:else if data.task.description}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						onclick={() => (editingDescription = true)}
						onkeydown={() => {}}
						class="cursor-pointer rounded-md bg-surface-100 p-4 hover:ring-1 hover:ring-brand-500/30 dark:bg-surface-800/50"
					>
						<MarkdownPreview content={data.task.description} />
					</div>
				{:else}
					<button
						onclick={() => (editingDescription = true)}
						class="w-full rounded-md border border-dashed border-surface-300 p-4 text-left text-sm text-surface-500 hover:border-brand-500 hover:text-brand-600 dark:border-surface-700 dark:hover:border-brand-600"
					>
						Add a description...
					</button>
				{/if}
			</div>

			<!-- Labels -->
			{#if data.labels.length > 0}
				<div class="mb-6 flex flex-wrap gap-1">
					{#each data.labels as label}
						<Badge color={label.color}>{label.name}</Badge>
					{/each}
				</div>
			{/if}

			<!-- Subtasks (#7) -->
			{#if !data.task.parentId}
				<div class="mb-6">
					<div class="mb-2 flex items-center justify-between">
						<h3 class="text-xs font-semibold uppercase tracking-wide text-surface-500">Subtasks</h3>
						{#if data.subtasks.length > 0}
							{@const doneSub = data.subtasks.filter((s) => { const st = statusMap.get(s.statusId); return st?.isClosed; }).length}
							<span class="text-xs text-surface-400">{doneSub}/{data.subtasks.length}</span>
						{/if}
					</div>
					{#if data.subtasks.length > 0}
						{@const doneSub = data.subtasks.filter((s) => { const st = statusMap.get(s.statusId); return st?.isClosed; }).length}
						<div class="mb-2 h-1 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-800">
							<div class="h-full rounded-full bg-brand-500 transition-all" style="width: {data.subtasks.length ? (doneSub / data.subtasks.length * 100) : 0}%"></div>
						</div>
						<div class="space-y-1">
							{#each data.subtasks as sub (sub.id)}
								{@const subStatus = statusMap.get(sub.statusId)}
								<a
									href="/projects/{data.project.slug}/task/{sub.number}"
									class="flex items-center gap-2 rounded-md border border-surface-300 px-3 py-1.5 text-sm transition hover:border-surface-400 dark:border-surface-800 dark:hover:border-surface-700"
								>
									{#if subStatus}
										<span class="h-2 w-2 rounded-full" style="background-color: {subStatus.color}"></span>
									{/if}
									{#if sub.type && sub.type !== 'task'}
										<TaskTypeIcon type={sub.type} />
									{/if}
									<PriorityIcon priority={sub.priority} />
									<span class="text-xs text-surface-400">#{sub.number}</span>
									<span class="flex-1 truncate {subStatus?.isClosed ? 'text-surface-400 line-through' : 'text-surface-900 dark:text-surface-200'}">{sub.title}</span>
									{#if sub.assigneeId && memberMap.get(sub.assigneeId)}
										<Avatar name={memberMap.get(sub.assigneeId) || ''} size="xs" />
									{/if}
								</a>
							{/each}
						</div>
					{/if}
					<form
						onsubmit={(e) => { e.preventDefault(); addSubtask(); }}
						class="mt-2 flex gap-2"
					>
						<input
							bind:value={newSubtaskTitle}
							placeholder="Add subtask..."
							class="flex-1 rounded-md border border-surface-300 bg-surface-50 px-2 py-1 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
						/>
						<button
							type="submit"
							disabled={addingSubtask || !newSubtaskTitle.trim()}
							class="rounded-md bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-500 disabled:opacity-50"
						>Add</button>
					</form>
				</div>
			{/if}

			<!-- Checklist -->
			{#if data.checklist.length > 0 || true}
				<div class="mb-6">
					<div class="mb-2 flex items-center justify-between">
						<h3 class="text-xs font-semibold uppercase tracking-wide text-surface-500">Checklist</h3>
						{#if data.checklist.length > 0}
							{@const done = data.checklist.filter((i) => i.completed).length}
							<span class="text-xs text-surface-400">{done}/{data.checklist.length}</span>
						{/if}
					</div>
					{#if data.checklist.length > 0}
						{@const done = data.checklist.filter((i) => i.completed).length}
						<div class="mb-2 h-1 overflow-hidden rounded-full bg-surface-800">
							<div class="h-full rounded-full bg-brand-500 transition-all" style="width: {data.checklist.length ? (done / data.checklist.length * 100) : 0}%"></div>
						</div>
					{/if}
					<div class="space-y-1">
						{#each data.checklist as item, i (item.id)}
							<div
								class="group flex items-center gap-2 rounded-md px-1 py-0.5 transition-colors {dragIndex === i ? 'opacity-40' : ''} {dropIndex === i && dragIndex !== i ? 'border-t-2 border-brand-500' : ''}"
								draggable="true"
								ondragstart={(e) => handleDragStart(e, i)}
								ondragover={(e) => handleDragOver(e, i)}
								ondragleave={handleDragLeave}
								ondrop={(e) => handleDrop(e, i)}
								ondragend={handleDragEnd}
								role="listitem"
							>
								<span class="cursor-grab text-surface-600 opacity-0 group-hover:opacity-100" aria-hidden="true">
									<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
										<path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
									</svg>
								</span>
								<input
									type="checkbox"
									checked={item.completed}
									onchange={() => toggleChecklistItem(item.id, item.completed)}
									class="h-4 w-4 rounded border-surface-700 bg-surface-800 text-brand-600 focus:ring-brand-500"
								/>
								<span class="flex-1 text-sm {item.completed ? 'text-surface-600 line-through' : 'text-surface-300'}">{item.title}</span>
								<button
									onclick={() => deleteChecklistItem(item.id)}
									class="text-xs text-surface-600 opacity-0 hover:text-red-500 group-hover:opacity-100"
								>&times;</button>
							</div>
						{/each}
					</div>
					<form
						onsubmit={(e) => { e.preventDefault(); addChecklistItem(); }}
						class="mt-2 flex gap-2"
					>
						<input
							bind:value={newChecklistItem}
							placeholder="Add item..."
							class="flex-1 rounded-md border border-surface-700 bg-surface-800 px-2 py-1 text-sm text-surface-100 outline-none placeholder:text-surface-500 focus:border-brand-500"
						/>
						<button
							type="submit"
							disabled={addingChecklist || !newChecklistItem.trim()}
							class="rounded-md bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-500 disabled:opacity-50"
						>Add</button>
					</form>
				</div>
			{/if}

			<!-- Activity + Comments -->
			<div class="space-y-3">
				<div class="flex items-center gap-2">
					<h3 class="text-xs font-semibold uppercase tracking-wide text-surface-500">Activity</h3>
					<div class="flex gap-1">
						<button
							onclick={() => { activityTab = 'all'; activityLimit = 10; }}
							class="rounded-full px-2.5 py-0.5 text-xs font-medium transition {activityTab === 'all' ? 'bg-brand-600 text-white' : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200'}"
						>All</button>
						<button
							onclick={() => { activityTab = 'comments'; activityLimit = 10; }}
							class="rounded-full px-2.5 py-0.5 text-xs font-medium transition {activityTab === 'comments' ? 'bg-brand-600 text-white' : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200'}"
						>Comments</button>
						<button
							onclick={() => { activityTab = 'history'; activityLimit = 10; }}
							class="rounded-full px-2.5 py-0.5 text-xs font-medium transition {activityTab === 'history' ? 'bg-brand-600 text-white' : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200'}"
						>History</button>
					</div>
				</div>

				{#if activityTab === 'all'}
					{@const merged = [
						...data.activity.map((a) => ({ ...a, _type: 'activity' as const, _ts: a.createdAt })),
						...data.comments.map((c) => ({ ...c, _type: 'comment' as const, _ts: c.createdAt }))
					].sort((a, b) => a._ts - b._ts)}
					{@const visible = merged.slice(-activityLimit).sort((a, b) => a._ts - b._ts)}
					{#if merged.length > activityLimit}
						<button
							onclick={() => (activityLimit += 10)}
							class="text-xs text-brand-500 hover:text-brand-400"
						>Load more ({merged.length - activityLimit} older)</button>
					{/if}
					{#each visible as entry (entry.id)}
						{#if entry._type === 'activity'}
							<div class="flex items-start gap-2 text-sm">
								<Avatar name={entry.userName} size="xs" />
								<div>
									<span class="font-medium text-surface-300">{entry.userName}</span>
									<span class="text-surface-500">{actionLabel(entry.action)}</span>
									<span class="ml-1 text-xs text-surface-600">{formatDate(entry.createdAt)}</span>
								</div>
							</div>
						{:else}
							{@const comment = entry}
							<div class="rounded-md border border-surface-800 p-3">
								<div class="mb-1 flex items-center justify-between">
									<div class="flex items-center gap-2 text-xs">
										<Avatar name={comment.userName} size="xs" />
										<span class="font-medium text-surface-300">{comment.userName}</span>
										<span class="text-surface-600">{formatDate(comment.createdAt)}</span>
									</div>
									{#if data.user && comment.userId === data.user.id}
										<div class="flex gap-1">
											<button onclick={() => startEditComment(comment)} class="text-xs text-surface-400 hover:text-surface-300">edit</button>
											<button onclick={() => deleteComment(comment.id)} class="text-xs text-surface-400 hover:text-red-500">delete</button>
										</div>
									{/if}
								</div>
								{#if editingCommentId === comment.id}
									<textarea bind:value={editingCommentBody} rows={3} class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 outline-none focus:border-brand-500"></textarea>
									<div class="mt-2 flex gap-2">
										<button onclick={() => saveComment(comment.id)} class="rounded-md bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-500">Save</button>
										<button onclick={() => { editingCommentId = null; editingCommentBody = ''; }} class="text-xs text-surface-400">Cancel</button>
									</div>
								{:else}
									<MarkdownPreview content={comment.body} />
								{/if}
								<div class="mt-2 flex flex-wrap items-center gap-1">
									{#each groupReactions(comment.reactions || []) as [emoji, info]}
										<button onclick={() => toggleReaction(comment.id, emoji)} title={info.users.join(', ')} class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors {info.userIds.includes(data.user?.id ?? '') ? 'border-brand-700 bg-brand-950' : 'border-surface-700 bg-surface-800'}">
											<span>{emoji}</span><span class="text-surface-400">{info.users.length}</span>
										</button>
									{/each}
									<div class="relative">
										<button onclick={() => reactionPickerOpen = reactionPickerOpen === comment.id ? null : comment.id} class="inline-flex items-center rounded-full border border-surface-700 px-1.5 py-0.5 text-xs text-surface-400 hover:border-surface-600 hover:text-surface-300" title="Add reaction">+</button>
										{#if reactionPickerOpen === comment.id}
											<div class="absolute bottom-full left-0 z-10 mb-1 flex gap-0.5 rounded-lg border border-surface-700 bg-surface-900 p-1.5 shadow-lg">
												{#each REACTION_EMOJIS as emoji}
													<button onclick={() => toggleReaction(comment.id, emoji)} class="rounded p-1 text-base hover:bg-surface-800">{emoji}</button>
												{/each}
											</div>
										{/if}
									</div>
								</div>
							</div>
						{/if}
					{/each}
				{:else if activityTab === 'comments'}
					{@const visibleComments = data.comments.slice(-activityLimit)}
					{#if data.comments.length > activityLimit}
						<button
							onclick={() => (activityLimit += 10)}
							class="text-xs text-brand-500 hover:text-brand-400"
						>Load more ({data.comments.length - activityLimit} older)</button>
					{/if}
					{#each visibleComments as comment (comment.id)}
						<div class="rounded-md border border-surface-800 p-3">
							<div class="mb-1 flex items-center justify-between">
								<div class="flex items-center gap-2 text-xs">
									<Avatar name={comment.userName} size="xs" />
									<span class="font-medium text-surface-300">{comment.userName}</span>
									<span class="text-surface-600">{formatDate(comment.createdAt)}</span>
								</div>
								{#if data.user && comment.userId === data.user.id}
									<div class="flex gap-1">
										<button onclick={() => startEditComment(comment)} class="text-xs text-surface-400 hover:text-surface-300">edit</button>
										<button onclick={() => deleteComment(comment.id)} class="text-xs text-surface-400 hover:text-red-500">delete</button>
									</div>
								{/if}
							</div>
							{#if editingCommentId === comment.id}
								<textarea bind:value={editingCommentBody} rows={3} class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 outline-none focus:border-brand-500"></textarea>
								<div class="mt-2 flex gap-2">
									<button onclick={() => saveComment(comment.id)} class="rounded-md bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-500">Save</button>
									<button onclick={() => { editingCommentId = null; editingCommentBody = ''; }} class="text-xs text-surface-400">Cancel</button>
								</div>
							{:else}
								<MarkdownPreview content={comment.body} />
							{/if}
							<div class="mt-2 flex flex-wrap items-center gap-1">
								{#each groupReactions(comment.reactions || []) as [emoji, info]}
									<button onclick={() => toggleReaction(comment.id, emoji)} title={info.users.join(', ')} class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors {info.userIds.includes(data.user?.id ?? '') ? 'border-brand-700 bg-brand-950' : 'border-surface-700 bg-surface-800'}">
										<span>{emoji}</span><span class="text-surface-400">{info.users.length}</span>
									</button>
								{/each}
								<div class="relative">
									<button onclick={() => reactionPickerOpen = reactionPickerOpen === comment.id ? null : comment.id} class="inline-flex items-center rounded-full border border-surface-700 px-1.5 py-0.5 text-xs text-surface-400 hover:border-surface-600 hover:text-surface-300" title="Add reaction">+</button>
									{#if reactionPickerOpen === comment.id}
										<div class="absolute bottom-full left-0 z-10 mb-1 flex gap-0.5 rounded-lg border border-surface-700 bg-surface-900 p-1.5 shadow-lg">
											{#each REACTION_EMOJIS as emoji}
												<button onclick={() => toggleReaction(comment.id, emoji)} class="rounded p-1 text-base hover:bg-surface-800">{emoji}</button>
											{/each}
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				{:else}
					{@const visibleHistory = data.activity.slice(-activityLimit)}
					{#if data.activity.length > activityLimit}
						<button
							onclick={() => (activityLimit += 10)}
							class="text-xs text-brand-500 hover:text-brand-400"
						>Load more ({data.activity.length - activityLimit} older)</button>
					{/if}
					{#each visibleHistory as item (item.id)}
						<div class="flex items-start gap-2 text-sm">
							<Avatar name={item.userName} size="xs" />
							<div>
								<span class="font-medium text-surface-300">{item.userName}</span>
								<span class="text-surface-500">{actionLabel(item.action)}</span>
								<span class="ml-1 text-xs text-surface-600">{formatDate(item.createdAt)}</span>
							</div>
						</div>
					{/each}
				{/if}

				<!-- Comment form (visible in All and Comments tabs) -->
				{#if activityTab !== 'history'}
					<form
						onsubmit={(e) => { e.preventDefault(); addComment(); }}
						class="mt-4"
					>
						<MentionInput
							bind:value={commentBody}
							users={data.members}
							placeholder="Write a comment (markdown supported, @mention users)... Ctrl+Enter to submit"
							rows={3}
						/>
						<div class="mt-2 flex justify-end">
							<button
								type="submit"
								disabled={submitting || !commentBody.trim()}
								class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
							>
								{submitting ? 'Posting...' : 'Comment'}
							</button>
						</div>
					</form>
				{/if}
			</div>
		</div>

		<!-- Sidebar metadata -->
		<div class="space-y-4">
			<button
				onclick={toggleWatch}
				class="flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition {watching ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400' : 'border-surface-300 text-surface-600 hover:border-surface-400 dark:border-surface-700 dark:text-surface-400 dark:hover:border-surface-600'}"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
					{#if watching}
						<path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
						<path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
					{:else}
						<path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd" />
						<path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
					{/if}
				</svg>
				{watching ? 'Watching' : 'Watch'}
				{#if data.watchers.length > 0}
					<span class="text-[10px] opacity-60">({data.watchers.length})</span>
				{/if}
			</button>

			<button
				onclick={duplicateTask}
				disabled={duplicating}
				class="flex w-full items-center justify-center gap-1.5 rounded-md border border-surface-300 px-3 py-1.5 text-xs font-medium text-surface-600 transition hover:border-surface-400 disabled:opacity-50 dark:border-surface-700 dark:text-surface-400 dark:hover:border-surface-600"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
					<path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
					<path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
				</svg>
				{duplicating ? 'Duplicating...' : 'Duplicate'}
			</button>

			<button
				onclick={deleteTask}
				disabled={deleting}
				class="flex w-full items-center justify-center gap-1.5 rounded-md border border-surface-300 px-3 py-1.5 text-xs font-medium text-surface-400 transition hover:border-red-300 hover:text-red-500 disabled:opacity-50 dark:border-surface-700 dark:hover:border-red-800 dark:hover:text-red-400"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
				</svg>
				{deleting ? 'Deleting...' : 'Delete'}
			</button>

			<div>
				<label for="task-type" class="mb-1 block text-xs text-surface-500">Type</label>
				<select
					id="task-type"
					value={data.task.type || 'task'}
					onchange={(e) => updateField('type', e.currentTarget.value)}
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
				>
					<option value="task">Task</option>
					<option value="bug">Bug</option>
					<option value="feature">Feature</option>
					<option value="improvement">Improvement</option>
				</select>
			</div>

			<div>
				<label for="task-status" class="mb-1 block text-xs text-surface-500">Status</label>
				<select
					id="task-status"
					value={data.task.statusId}
					onchange={(e) => updateField('statusId', e.currentTarget.value)}
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
				>
					{#each data.statuses as status}
						<option value={status.id}>{status.name}</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="task-priority" class="mb-1 block text-xs text-surface-500">Priority</label>
				<select
					id="task-priority"
					value={data.task.priority}
					onchange={(e) => updateField('priority', e.currentTarget.value)}
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
				>
					<option value="urgent">Urgent</option>
					<option value="high">High</option>
					<option value="medium">Medium</option>
					<option value="low">Low</option>
				</select>
			</div>

			<div>
				<label for="task-assignee" class="mb-1 block text-xs text-surface-500">Assignee</label>
				<select
					id="task-assignee"
					value={data.task.assigneeId ?? ''}
					onchange={(e) => updateField('assigneeId', e.currentTarget.value || null)}
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
				>
					<option value="">Unassigned</option>
					{#each data.members as member}
						<option value={member.id}>{member.name}</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="task-due" class="mb-1 block text-xs text-surface-500">Due date</label>
				<input
					id="task-due"
					type="date"
					value={formatDateInput(data.task.dueDate)}
					onchange={(e) => updateField('dueDate', e.currentTarget.value ? new Date(e.currentTarget.value).getTime() : null)}
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
				/>
			</div>

			<div>
				<label for="task-start" class="mb-1 block text-xs text-surface-500">Start date</label>
				<input
					id="task-start"
					type="date"
					value={formatDateInput(data.task.startDate)}
					onchange={(e) => updateField('startDate', e.currentTarget.value ? new Date(e.currentTarget.value).getTime() : null)}
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
				/>
			</div>

			<div>
				<label for="task-recurrence" class="mb-1 block text-xs text-surface-500">Repeat</label>
				<select
					id="task-recurrence"
					value={recurrence?.freq ?? ''}
					onchange={(e) => updateRecurrence(e.currentTarget.value || null)}
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
				>
					<option value="">None</option>
					<option value="daily">Daily</option>
					<option value="weekly">Weekly</option>
					<option value="monthly">Monthly</option>
				</select>
				{#if recurrence}
					<div class="mt-1.5 flex items-center gap-1.5">
						<span class="text-xs text-surface-500">Every</span>
						<input
							type="number"
							min="1"
							max="99"
							value={recurrence.interval}
							onchange={(e) => updateRecurrenceInterval(parseInt(e.currentTarget.value) || 1)}
							class="w-14 rounded-md border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
						/>
						<span class="text-xs text-surface-500">{recurrence.freq === 'daily' ? 'day(s)' : recurrence.freq === 'weekly' ? 'week(s)' : 'month(s)'}</span>
					</div>
					{#if data.task.recurrenceSourceId}
						<p class="mt-1 text-xs text-surface-400">Part of a recurring series</p>
					{/if}
				{/if}
			</div>

			{#if data.task.estimatePoints !== null && data.task.estimatePoints !== undefined}
				<div>
					<span class="block text-xs text-surface-500">Estimate</span>
					<span class="text-sm text-surface-700 dark:text-surface-300">{data.task.estimatePoints} pts</span>
				</div>
			{/if}

			<div class="border-t border-surface-300 pt-4 dark:border-surface-800">
				<p class="text-xs text-surface-400 dark:text-surface-600">Created {formatDate(data.task.createdAt)}</p>
				<p class="text-xs text-surface-400 dark:text-surface-600">Updated {formatDate(data.task.updatedAt)}</p>
			</div>
		</div>
	</div>
</div>
