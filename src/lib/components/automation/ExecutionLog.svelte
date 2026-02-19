<script lang="ts">
	interface Execution {
		id: string;
		triggerEvent: string;
		status: string;
		actionsRun: Array<{ action: string; result: string; error?: string }>;
		error: string | null;
		durationMs: number | null;
		createdAt: number;
	}

	interface Props {
		executions: Execution[];
	}

	let { executions }: Props = $props();

	function formatTime(ts: number): string {
		return new Date(ts).toLocaleString();
	}

	const statusColors: Record<string, string> = {
		success: 'text-green-600 dark:text-green-400',
		error: 'text-red-600 dark:text-red-400',
		skipped: 'text-surface-500 dark:text-surface-400'
	};
</script>

{#if executions.length === 0}
	<p class="text-xs text-surface-500 dark:text-surface-400">No executions yet.</p>
{:else}
	<div class="space-y-1 max-h-64 overflow-y-auto">
		{#each executions as exec}
			<div class="flex items-center gap-3 rounded-md border border-surface-200 px-3 py-2 text-xs dark:border-surface-700">
				<span class="font-medium {statusColors[exec.status] || ''}">
					{exec.status}
				</span>
				<span class="text-surface-500 dark:text-surface-400">{exec.triggerEvent}</span>
				{#if exec.durationMs != null}
					<span class="text-surface-400 dark:text-surface-500">{exec.durationMs}ms</span>
				{/if}
				<span class="ml-auto text-surface-400 dark:text-surface-500">{formatTime(exec.createdAt)}</span>
				{#if exec.error}
					<span class="text-red-500" title={exec.error}>err</span>
				{/if}
			</div>
		{/each}
	</div>
{/if}
