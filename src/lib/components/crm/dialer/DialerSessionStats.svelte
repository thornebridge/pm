<script lang="ts">
	interface Props {
		totalContacts: number;
		completedContacts: number;
		totalConnected: number;
		totalNoAnswer: number;
		totalDurationSeconds: number;
		skippedCount: number;
	}

	let { totalContacts, completedContacts, totalConnected, totalNoAnswer, totalDurationSeconds, skippedCount }: Props = $props();

	const progressPercent = $derived(
		totalContacts > 0 ? Math.round((completedContacts / totalContacts) * 100) : 0
	);

	const avgDuration = $derived(() => {
		if (completedContacts === 0) return '—';
		const avg = Math.round(totalDurationSeconds / completedContacts);
		const m = Math.floor(avg / 60);
		const s = avg % 60;
		return m > 0 ? `${m}m ${s}s` : `${s}s`;
	});
</script>

<div class="flex flex-wrap items-center gap-4 rounded-lg border border-surface-200 bg-surface-50 px-4 py-3 dark:border-surface-700 dark:bg-surface-800/50">
	<!-- Progress bar -->
	<div class="flex min-w-[140px] items-center gap-2">
		<div class="h-2 w-24 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
			<div
				class="h-full rounded-full bg-brand-600 transition-all"
				style="width: {progressPercent}%"
			></div>
		</div>
		<span class="text-xs font-medium text-surface-600 dark:text-surface-400">
			{completedContacts}/{totalContacts}
		</span>
	</div>

	<!-- Stats -->
	<div class="flex items-center gap-1.5">
		<span class="h-2 w-2 rounded-full bg-green-500"></span>
		<span class="text-xs text-surface-600 dark:text-surface-400">Connected: <strong class="text-surface-900 dark:text-surface-100">{totalConnected}</strong></span>
	</div>

	<div class="flex items-center gap-1.5">
		<span class="h-2 w-2 rounded-full bg-red-500"></span>
		<span class="text-xs text-surface-600 dark:text-surface-400">No Answer: <strong class="text-surface-900 dark:text-surface-100">{totalNoAnswer}</strong></span>
	</div>

	<div class="flex items-center gap-1.5">
		<span class="h-2 w-2 rounded-full bg-surface-400"></span>
		<span class="text-xs text-surface-600 dark:text-surface-400">Skipped: <strong class="text-surface-900 dark:text-surface-100">{skippedCount}</strong></span>
	</div>

	<div class="flex items-center gap-1.5">
		<svg class="h-3.5 w-3.5 text-surface-400" viewBox="0 0 20 20" fill="currentColor">
			<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
		</svg>
		<span class="text-xs text-surface-600 dark:text-surface-400">Avg: <strong class="text-surface-900 dark:text-surface-100">{avgDuration()}</strong></span>
	</div>
</div>
