<script lang="ts">
	import PriorityIcon from '$lib/components/task/PriorityIcon.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';

	let { data } = $props();

	let commentBody = $state('');
	let submitting = $state(false);
	let editingTitle = $state(false);
	let titleInput = $state(data.task.title);
	$effect(() => { titleInput = data.task.title; });

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

	function formatDate(ts: number) {
		return new Date(ts).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
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
	<div class="grid grid-cols-[1fr_240px] gap-6">
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
			{#if data.task.description}
				<div class="mb-6 rounded-md bg-surface-100 p-4 text-sm text-surface-700 whitespace-pre-wrap dark:bg-surface-800/50 dark:text-surface-300">
					{data.task.description}
				</div>
			{/if}

			<!-- Labels -->
			{#if data.labels.length > 0}
				<div class="mb-6 flex flex-wrap gap-1">
					{#each data.labels as label}
						<Badge color={label.color}>{label.name}</Badge>
					{/each}
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
						<div class="mb-1 flex items-center gap-2 text-xs">
							<span class="font-medium text-surface-700 dark:text-surface-300">{comment.userName}</span>
							<span class="text-surface-400 dark:text-surface-600">{formatDate(comment.createdAt)}</span>
						</div>
						<p class="text-sm text-surface-700 whitespace-pre-wrap dark:text-surface-300">{comment.body}</p>
					</div>
				{/each}

				<!-- Comment form -->
				<form
					onsubmit={(e) => { e.preventDefault(); addComment(); }}
					class="mt-4"
				>
					<textarea
						bind:value={commentBody}
						placeholder="Write a comment..."
						rows={3}
						class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
					></textarea>
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

			<div class="border-t border-surface-300 pt-4 dark:border-surface-800">
				<p class="text-xs text-surface-400 dark:text-surface-600">Created {formatDate(data.task.createdAt)}</p>
				<p class="text-xs text-surface-400 dark:text-surface-600">Updated {formatDate(data.task.updatedAt)}</p>
			</div>
		</div>
	</div>
</div>
