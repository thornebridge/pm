<script lang="ts">
	import PriorityIcon from '$lib/components/task/PriorityIcon.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import MarkdownPreview from '$lib/components/markdown/MarkdownPreview.svelte';
	import MentionInput from '$lib/components/editor/MentionInput.svelte';
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';

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

	// Watch state
	let watching = $state(data.isWatching);
	$effect(() => { watching = data.isWatching; });

	$effect(() => { titleInput = data.task.title; });
	$effect(() => { descriptionInput = data.task.description ?? ''; });

	const statusMap = $derived(new Map(data.statuses.map((s) => [s.id, s])));
	const currentStatus = $derived(statusMap.get(data.task.statusId));

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
</script>

<svelte:head>
	<title>#{data.task.number} {data.task.title}</title>
</svelte:head>

<div class="mx-auto max-w-4xl p-6">
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
					<button onclick={() => (editingTitle = true)} class="text-left text-lg font-semibold text-surface-900 hover:text-brand-600 dark:text-surface-100 dark:hover:text-white">
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
						<div class="mb-2 h-1 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-800">
							<div class="h-full rounded-full bg-brand-500 transition-all" style="width: {data.checklist.length ? (done / data.checklist.length * 100) : 0}%"></div>
						</div>
					{/if}
					<div class="space-y-1">
						{#each data.checklist as item (item.id)}
							<div class="group flex items-center gap-2">
								<input
									type="checkbox"
									checked={item.completed}
									onchange={() => toggleChecklistItem(item.id, item.completed)}
									class="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-700"
								/>
								<span class="flex-1 text-sm {item.completed ? 'text-surface-400 line-through dark:text-surface-600' : 'text-surface-700 dark:text-surface-300'}">{item.title}</span>
								<button
									onclick={() => deleteChecklistItem(item.id)}
									class="text-xs text-surface-400 opacity-0 hover:text-red-500 group-hover:opacity-100"
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
							class="flex-1 rounded-md border border-surface-300 bg-surface-50 px-2 py-1 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
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
				<h3 class="text-xs font-semibold uppercase tracking-wide text-surface-500">Activity</h3>

				{#each data.activity as item (item.id)}
					<div class="flex items-start gap-2 text-sm">
						<span class="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-surface-400 dark:bg-surface-600"></span>
						<div>
							<span class="font-medium text-surface-700 dark:text-surface-300">{item.userName}</span>
							<span class="text-surface-500">{actionLabel(item.action)}</span>
							<span class="ml-1 text-xs text-surface-400 dark:text-surface-600">{formatDate(item.createdAt)}</span>
						</div>
					</div>
				{/each}

				{#each data.comments as comment (comment.id)}
					<div class="rounded-md border border-surface-300 p-3 dark:border-surface-800">
						<div class="mb-1 flex items-center justify-between">
							<div class="flex items-center gap-2 text-xs">
								<span class="font-medium text-surface-700 dark:text-surface-300">{comment.userName}</span>
								<span class="text-surface-400 dark:text-surface-600">{formatDate(comment.createdAt)}</span>
								{#if comment.updatedAt > comment.createdAt}
									<span class="text-surface-400 dark:text-surface-600">(edited)</span>
								{/if}
							</div>
							{#if data.user && comment.userId === data.user.id}
								<div class="flex gap-1">
									<button
										onclick={() => startEditComment(comment)}
										class="text-xs text-surface-400 hover:text-surface-700 dark:hover:text-surface-300"
									>edit</button>
									<button
										onclick={() => deleteComment(comment.id)}
										class="text-xs text-surface-400 hover:text-red-500"
									>delete</button>
								</div>
							{/if}
						</div>
						{#if editingCommentId === comment.id}
							<textarea
								bind:value={editingCommentBody}
								rows={3}
								class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
							></textarea>
							<div class="mt-2 flex gap-2">
								<button
									onclick={() => saveComment(comment.id)}
									class="rounded-md bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-500"
								>Save</button>
								<button
									onclick={() => { editingCommentId = null; editingCommentBody = ''; }}
									class="text-xs text-surface-600 hover:text-surface-900 dark:text-surface-400"
								>Cancel</button>
							</div>
						{:else}
							<MarkdownPreview content={comment.body} />
						{/if}
					</div>
				{/each}

				<!-- Comment form -->
				<form
					onsubmit={(e) => { e.preventDefault(); addComment(); }}
					class="mt-4"
				>
					<MentionInput
						bind:value={commentBody}
						users={data.members}
						placeholder="Write a comment (markdown supported, @mention users)..."
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
