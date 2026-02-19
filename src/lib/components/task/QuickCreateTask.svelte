<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';
	import { fly, fade } from 'svelte/transition';

	interface Project {
		id: string;
		name: string;
		slug: string;
	}

	interface Props {
		open: boolean;
		onclose: () => void;
		projects: Project[];
		currentProjectId?: string;
	}

	let { open, onclose, projects, currentProjectId }: Props = $props();

	let title = $state('');
	let projectId = $state('');
	let priority = $state<'urgent' | 'high' | 'medium' | 'low'>('medium');
	let description = $state('');
	let creating = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();

	$effect(() => {
		if (open) {
			projectId = currentProjectId || projects[0]?.id || '';
			requestAnimationFrame(() => inputEl?.focus());
		} else {
			title = '';
			description = '';
			priority = 'medium';
			creating = false;
		}
	});

	async function create() {
		if (!title.trim() || !projectId) return;
		creating = true;
		try {
			await api(`/api/projects/${projectId}/tasks`, {
				method: 'POST',
				body: JSON.stringify({ title, description: description || undefined, priority })
			});
			showToast('Task created');
			onclose();
			await invalidateAll();
		} catch {
			showToast('Failed to create task', 'error');
		} finally {
			creating = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			create();
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 pt-[15vh] dark:bg-black/60"
		onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
		onkeydown={handleKeydown}
		transition:fade={{ duration: 150 }}
	>
		<div
			class="w-full max-w-md rounded-xl border border-surface-300 bg-surface-50 shadow-2xl dark:border-surface-700 dark:bg-surface-900"
			transition:fly={{ y: -10, duration: 200 }}
		>
			<div class="border-b border-surface-300 px-4 py-3 dark:border-surface-800">
				<h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Quick Create Task</h2>
			</div>
			<form
				onsubmit={(e) => { e.preventDefault(); create(); }}
				class="space-y-3 p-4"
			>
				<select
					bind:value={projectId}
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				>
					{#each projects as p}
						<option value={p.id}>{p.name}</option>
					{/each}
				</select>

				<input
					bind:this={inputEl}
					bind:value={title}
					placeholder="Task title"
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				/>

				<textarea
					bind:value={description}
					placeholder="Description (optional)"
					rows={2}
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				></textarea>

				<select
					bind:value={priority}
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				>
					<option value="urgent">Urgent</option>
					<option value="high">High</option>
					<option value="medium">Medium</option>
					<option value="low">Low</option>
				</select>

				<div class="flex items-center justify-between pt-1">
					<span class="text-[10px] text-surface-400">Ctrl+Enter to submit</span>
					<div class="flex gap-2">
						<button
							type="button"
							onclick={onclose}
							class="rounded-md px-3 py-1.5 text-sm text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100"
						>Cancel</button>
						<button
							type="submit"
							disabled={creating || !title.trim() || !projectId}
							class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
						>{creating ? 'Creating...' : 'Create'}</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}
