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
						class="w-full rounded bg-slate-800 px-2 py-1 text-lg font-semibold text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500"
						autofocus
					/>
				{:else}
					<button onclick={() => (editingTitle = true)} class="text-left text-lg font-semibold text-slate-100 hover:text-white">
						<span class="mr-2 text-slate-500">#{data.task.number}</span>
						{data.task.title}
					</button>
				{/if}
			</div>

			<!-- Description -->
			{#if data.task.description}
				<div class="mb-6 rounded-md bg-slate-800/50 p-4 text-sm text-slate-300 whitespace-pre-wrap">
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
				<h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Activity</h3>

				{#each data.activity as item (item.id)}
					<div class="flex items-start gap-2 text-sm">
						<span class="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-600"></span>
						<div>
							<span class="font-medium text-slate-300">{item.userName}</span>
							<span class="text-slate-500">{actionLabel(item.action)}</span>
							<span class="ml-1 text-xs text-slate-600">{formatDate(item.createdAt)}</span>
						</div>
					</div>
				{/each}

				{#each data.comments as comment (comment.id)}
					<div class="rounded-md border border-slate-800 p-3">
						<div class="mb-1 flex items-center gap-2 text-xs">
							<span class="font-medium text-slate-300">{comment.userName}</span>
							<span class="text-slate-600">{formatDate(comment.createdAt)}</span>
						</div>
						<p class="text-sm text-slate-300 whitespace-pre-wrap">{comment.body}</p>
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
						class="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-500"
					></textarea>
					<div class="mt-2 flex justify-end">
						<button
							type="submit"
							disabled={submitting || !commentBody.trim()}
							class="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
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
				<label class="mb-1 block text-xs text-slate-500">Status</label>
				<select
					value={data.task.statusId}
					onchange={(e) => updateField('statusId', e.currentTarget.value)}
					class="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
				>
					{#each data.statuses as status}
						<option value={status.id}>{status.name}</option>
					{/each}
				</select>
			</div>

			<div>
				<label class="mb-1 block text-xs text-slate-500">Priority</label>
				<select
					value={data.task.priority}
					onchange={(e) => updateField('priority', e.currentTarget.value)}
					class="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
				>
					<option value="urgent">Urgent</option>
					<option value="high">High</option>
					<option value="medium">Medium</option>
					<option value="low">Low</option>
				</select>
			</div>

			<div>
				<label class="mb-1 block text-xs text-slate-500">Assignee</label>
				<select
					value={data.task.assigneeId ?? ''}
					onchange={(e) => updateField('assigneeId', e.currentTarget.value || null)}
					class="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
				>
					<option value="">Unassigned</option>
					{#each data.members as member}
						<option value={member.id}>{member.name}</option>
					{/each}
				</select>
			</div>

			<div class="border-t border-slate-800 pt-4">
				<p class="text-xs text-slate-600">Created {formatDate(data.task.createdAt)}</p>
				<p class="text-xs text-slate-600">Updated {formatDate(data.task.updatedAt)}</p>
			</div>
		</div>
	</div>
</div>
