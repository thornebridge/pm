<script lang="ts">
	import { timer, startTimer, stopTimer } from '$lib/stores/timer.js';
	import { showToast } from '$lib/stores/toasts.js';

	interface Props {
		taskId: string;
		projectId: string;
	}

	let { taskId, projectId }: Props = $props();

	let elapsed = $state(0);
	let intervalId: ReturnType<typeof setInterval> | null = null;

	const isRunningForThis = $derived($timer.running && $timer.taskId === taskId);

	$effect(() => {
		if (isRunningForThis && $timer.startedAt) {
			elapsed = Date.now() - $timer.startedAt;
			intervalId = setInterval(() => {
				if ($timer.startedAt) {
					elapsed = Date.now() - $timer.startedAt;
				}
			}, 1000);
		} else {
			if (intervalId) clearInterval(intervalId);
			intervalId = null;
			elapsed = 0;
		}

		return () => {
			if (intervalId) clearInterval(intervalId);
		};
	});

	function formatDuration(ms: number): string {
		const s = Math.floor(ms / 1000);
		const h = Math.floor(s / 3600);
		const m = Math.floor((s % 3600) / 60);
		const sec = s % 60;
		return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
	}

	async function handleToggle() {
		if (isRunningForThis) {
			const result = stopTimer();
			if (result) {
				try {
					await fetch(`/api/projects/${projectId}/tasks/${taskId}/time`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							startedAt: result.startedAt,
							stoppedAt: Date.now(),
							durationMs: result.durationMs
						})
					});
					showToast('Time entry saved');
				} catch {
					showToast('Failed to save time entry', 'error');
				}
			}
		} else {
			if ($timer.running) {
				showToast('Stop the current timer first', 'error');
				return;
			}
			startTimer(taskId, projectId);
		}
	}
</script>

<div class="flex items-center gap-2">
	<button
		onclick={handleToggle}
		class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition {isRunningForThis ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50' : 'bg-surface-200 text-surface-700 hover:bg-surface-300 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700'}"
	>
		{#if isRunningForThis}
			<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd" />
			</svg>
			Stop
		{:else}
			<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8.118v3.764a1 1 0 001.555.832l3.197-1.882a1 1 0 000-1.664l-3.197-1.882z" clip-rule="evenodd" />
			</svg>
			Track
		{/if}
	</button>
	{#if isRunningForThis}
		<span class="font-mono text-xs text-surface-600 dark:text-surface-400">{formatDuration(elapsed)}</span>
	{/if}
</div>
