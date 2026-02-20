<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';
	import { fly, fade } from 'svelte/transition';

	interface Props {
		open: boolean;
		onclose: () => void;
		companies: Array<{ id: string; name: string }>;
		members: Array<{ id: string; name: string }>;
		prefilledCompanyId?: string;
		prefilledContactId?: string;
		prefilledOpportunityId?: string;
	}

	let { open, onclose, companies, members, prefilledCompanyId, prefilledContactId, prefilledOpportunityId }: Props = $props();

	let title = $state('');
	let description = $state('');
	let dueDateStr = $state('');
	let priority = $state('medium');
	let companyId = $state('');
	let assigneeId = $state('');
	let saving = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();

	$effect(() => {
		if (open) {
			title = '';
			description = '';
			dueDateStr = '';
			priority = 'medium';
			companyId = prefilledCompanyId || '';
			assigneeId = '';
			saving = false;
			requestAnimationFrame(() => inputEl?.focus());
		}
	});

	async function save() {
		if (!title.trim()) return;
		saving = true;
		try {
			const payload: Record<string, unknown> = {
				title: title.trim(),
				description: description || null,
				priority,
				companyId: companyId || null,
				contactId: prefilledContactId || null,
				opportunityId: prefilledOpportunityId || null,
				assigneeId: assigneeId || null
			};

			if (dueDateStr) {
				payload.dueDate = new Date(dueDateStr).getTime();
			}

			await api('/api/crm/tasks', {
				method: 'POST',
				body: JSON.stringify(payload)
			});
			showToast('Task created');
			onclose();
			await invalidateAll();
		} catch {
			showToast('Failed to create task', 'error');
		} finally {
			saving = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			save();
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 pt-[10vh] pb-10 dark:bg-black/60"
		onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
		onkeydown={handleKeydown}
		transition:fade={{ duration: 150 }}
	>
		<div
			class="w-full max-w-lg rounded-xl border border-surface-300 bg-surface-50 shadow-2xl dark:border-surface-700 dark:bg-surface-900"
			transition:fly={{ y: -10, duration: 200 }}
		>
			<div class="border-b border-surface-300 px-4 py-3 dark:border-surface-800">
				<h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Add Sales Task</h2>
			</div>
			<form onsubmit={(e) => { e.preventDefault(); save(); }} class="space-y-3 p-4">
				<div>
					<label for="crm-task-title" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Title *</label>
					<input id="crm-task-title" bind:this={inputEl} bind:value={title} placeholder="What needs to be done?" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
				</div>
				<div>
					<label for="crm-task-desc" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Description</label>
					<textarea id="crm-task-desc" bind:value={description} rows={2} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"></textarea>
				</div>
				<div class="grid grid-cols-3 gap-3">
					<div>
						<label for="crm-task-due" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Due Date</label>
						<input id="crm-task-due" type="date" bind:value={dueDateStr} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
					<div>
						<label for="crm-task-priority" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Priority</label>
						<select id="crm-task-priority" bind:value={priority} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
							<option value="urgent">Urgent</option>
							<option value="high">High</option>
							<option value="medium">Medium</option>
							<option value="low">Low</option>
						</select>
					</div>
					<div>
						<label for="crm-task-assignee" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Assignee</label>
						<select id="crm-task-assignee" bind:value={assigneeId} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
							<option value="">Me</option>
							{#each members as m}
								<option value={m.id}>{m.name}</option>
							{/each}
						</select>
					</div>
				</div>
				<div>
					<label for="crm-task-company" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Company</label>
					<select id="crm-task-company" bind:value={companyId} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
						<option value="">None</option>
						{#each companies as c}
							<option value={c.id}>{c.name}</option>
						{/each}
					</select>
				</div>
				<div class="flex items-center justify-between pt-1">
					<span class="text-[10px] text-surface-400">Ctrl+Enter to save</span>
					<div class="flex gap-2">
						<button type="button" onclick={onclose} class="rounded-md px-3 py-1.5 text-sm text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100">Cancel</button>
						<button type="submit" disabled={saving || !title.trim()} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50">
							{saving ? 'Creating...' : 'Create Task'}
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}
