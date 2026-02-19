<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';
	import {
		loadSavedView,
		toSavedViewData,
		getActiveViewId,
		hasActiveFilters
	} from '$lib/stores/filters.svelte.js';
	import { normalizeSavedViewData } from '$lib/utils/taskFilters.js';

	interface SavedView {
		id: string;
		name: string;
		filters: string;
		userId: string;
		shared: boolean;
	}

	interface Props {
		views: SavedView[];
		projectId: string;
		currentUserId: string;
		onviewschange: (views: SavedView[]) => void;
	}

	let { views, projectId, currentUserId, onviewschange }: Props = $props();

	let showSave = $state(false);
	let viewName = $state('');
	let viewShared = $state(false);
	let saving = $state(false);

	const activeViewId = $derived(getActiveViewId());

	async function saveView() {
		if (!viewName.trim()) return;
		saving = true;
		try {
			const data = toSavedViewData();
			const view = await api<SavedView>(`/api/projects/${projectId}/views`, {
				method: 'POST',
				body: JSON.stringify({ name: viewName, filters: data, shared: viewShared })
			});
			onviewschange([...views, view]);
			loadSavedView(view.id, data);
			viewName = '';
			viewShared = false;
			showSave = false;
			showToast('View saved');
		} catch {
			showToast('Failed to save view', 'error');
		} finally {
			saving = false;
		}
	}

	async function updateView() {
		if (!activeViewId) return;
		try {
			const data = toSavedViewData();
			await api(`/api/projects/${projectId}/views`, {
				method: 'PATCH',
				body: JSON.stringify({ id: activeViewId, filters: data })
			});
			const updated = views.map((v) =>
				v.id === activeViewId ? { ...v, filters: JSON.stringify(data) } : v
			);
			onviewschange(updated);
			showToast('View updated');
		} catch {
			showToast('Failed to update view', 'error');
		}
	}

	async function deleteView(id: string) {
		try {
			await api(`/api/projects/${projectId}/views`, {
				method: 'DELETE',
				body: JSON.stringify({ id })
			});
			onviewschange(views.filter((v) => v.id !== id));
			showToast('View deleted');
		} catch {
			showToast('Failed to delete view', 'error');
		}
	}

	function handleLoad(view: SavedView) {
		const data = typeof view.filters === 'string' ? JSON.parse(view.filters) : view.filters;
		loadSavedView(view.id, data);
	}
</script>

<div class="flex flex-wrap items-center gap-1.5">
	{#if views.length > 0}
		<span class="text-[10px] text-surface-500">Views:</span>
		{#each views as view (view.id)}
			<span class="group inline-flex items-center gap-0.5">
				<button
					type="button"
					onclick={() => handleLoad(view)}
					class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition
						{activeViewId === view.id
							? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-900/20 dark:text-brand-300'
							: 'border-surface-300 text-surface-600 hover:border-brand-400 hover:text-brand-600 dark:border-surface-700 dark:text-surface-400 dark:hover:border-brand-500'}"
				>
					{#if view.shared && view.userId !== currentUserId}
						<svg class="h-2.5 w-2.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
					{/if}
					{view.name}
				</button>
				{#if view.userId === currentUserId}
					<button
						type="button"
						onclick={() => deleteView(view.id)}
						class="text-[10px] text-surface-400 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
					>&times;</button>
				{/if}
			</span>
		{/each}
	{/if}

	{#if showSave}
		<form
			onsubmit={(e) => { e.preventDefault(); saveView(); }}
			class="inline-flex items-center gap-1"
		>
			<input
				bind:value={viewName}
				placeholder="View name"
				class="w-28 rounded-md border border-surface-300 bg-surface-50 px-2 py-0.5 text-[11px] text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				autofocus
			/>
			<label class="flex items-center gap-1 text-[10px] text-surface-500">
				<input
					type="checkbox"
					bind:checked={viewShared}
					class="h-2.5 w-2.5 rounded border-surface-300 text-brand-600 dark:border-surface-600"
				/>
				Shared
			</label>
			<button
				type="submit"
				disabled={saving || !viewName.trim()}
				class="rounded bg-brand-600 px-1.5 py-0.5 text-[10px] text-white hover:bg-brand-500 disabled:opacity-50"
			>Save</button>
			<button
				type="button"
				onclick={() => { showSave = false; viewName = ''; viewShared = false; }}
				class="text-[10px] text-surface-500 hover:text-surface-700"
			>Cancel</button>
		</form>
	{:else}
		<div class="inline-flex items-center gap-1.5">
			{#if hasActiveFilters()}
				<button
					type="button"
					onclick={() => (showSave = true)}
					class="text-[10px] text-surface-500 hover:text-brand-600 dark:hover:text-brand-400"
				>Save view</button>
			{/if}
			{#if activeViewId}
				<button
					type="button"
					onclick={updateView}
					class="text-[10px] text-brand-600 hover:text-brand-700 dark:text-brand-400"
				>Update view</button>
			{/if}
		</div>
	{/if}
</div>
