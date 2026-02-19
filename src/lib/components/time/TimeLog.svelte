<script lang="ts">
	import { onMount } from 'svelte';
	import { showToast } from '$lib/stores/toasts.js';

	interface Props {
		taskId: string;
		projectId: string;
	}

	let { taskId, projectId }: Props = $props();

	interface Entry {
		id: string;
		description: string | null;
		startedAt: number;
		stoppedAt: number | null;
		durationMs: number | null;
		userName: string;
	}

	let entries = $state<Entry[]>([]);
	let loading = $state(true);

	onMount(async () => {
		try {
			const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}/time`);
			if (res.ok) entries = await res.json();
		} finally {
			loading = false;
		}
	});

	function formatDuration(ms: number | null): string {
		if (!ms) return '—';
		const s = Math.floor(ms / 1000);
		const h = Math.floor(s / 3600);
		const m = Math.floor((s % 3600) / 60);
		if (h > 0) return `${h}h ${m}m`;
		return `${m}m`;
	}

	function formatDate(ts: number): string {
		return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
	}

	async function deleteEntry(id: string) {
		try {
			await fetch(`/api/time-entries/${id}`, { method: 'DELETE' });
			entries = entries.filter((e) => e.id !== id);
		} catch {
			showToast('Failed to delete entry', 'error');
		}
	}

	const totalMs = $derived(entries.reduce((sum, e) => sum + (e.durationMs || 0), 0));
</script>

{#if loading}
	<p class="text-xs text-surface-500">Loading...</p>
{:else if entries.length === 0}
	<p class="text-xs text-surface-500">No time tracked yet.</p>
{:else}
	<div class="space-y-1">
		<div class="text-xs text-surface-500">
			Total: <span class="font-medium text-surface-700 dark:text-surface-300">{formatDuration(totalMs)}</span>
		</div>
		{#each entries as entry (entry.id)}
			<div class="flex items-center justify-between rounded-md border border-surface-200 px-2 py-1.5 text-xs dark:border-surface-800">
				<div>
					<span class="text-surface-700 dark:text-surface-300">{entry.userName}</span>
					<span class="mx-1 text-surface-400">-</span>
					<span class="font-mono text-surface-600 dark:text-surface-400">{formatDuration(entry.durationMs)}</span>
					<span class="ml-1 text-surface-400">{formatDate(entry.startedAt)}</span>
				</div>
				<button onclick={() => deleteEntry(entry.id)} class="text-surface-400 hover:text-red-500">&times;</button>
			</div>
		{/each}
	</div>
{/if}
