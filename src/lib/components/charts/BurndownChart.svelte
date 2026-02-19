<script lang="ts">
	interface Snapshot {
		date: number;
		totalTasks: number;
		completedTasks: number;
		totalPoints: number;
		completedPoints: number;
	}

	interface Props {
		snapshots: Snapshot[];
		startDate: number | null;
		endDate: number | null;
	}

	let { snapshots, startDate, endDate }: Props = $props();

	const WIDTH = 600;
	const HEIGHT = 250;
	const PADDING = { top: 20, right: 20, bottom: 30, left: 40 };

	const chartW = WIDTH - PADDING.left - PADDING.right;
	const chartH = HEIGHT - PADDING.top - PADDING.bottom;

	const sorted = $derived([...snapshots].sort((a, b) => a.date - b.date));

	const maxTasks = $derived(sorted.length > 0 ? Math.max(...sorted.map((s) => s.totalTasks), 1) : 1);

	// Ideal line: from total at start to 0 at end
	const idealLine = $derived.by(() => {
		if (sorted.length < 2) return '';
		const x1 = PADDING.left;
		const y1 = PADDING.top;
		const x2 = PADDING.left + chartW;
		const y2 = PADDING.top + chartH;
		return `M${x1},${y1} L${x2},${y2}`;
	});

	// Actual remaining line
	const actualLine = $derived.by(() => {
		if (sorted.length === 0) return '';
		const points = sorted.map((s, i) => {
			const x = PADDING.left + (i / Math.max(sorted.length - 1, 1)) * chartW;
			const remaining = s.totalTasks - s.completedTasks;
			const y = PADDING.top + (1 - remaining / maxTasks) * chartH;
			return `${x},${y}`;
		});
		return `M${points.join(' L')}`;
	});

	// Y-axis labels
	const yLabels = $derived.by(() => {
		const steps = 4;
		return Array.from({ length: steps + 1 }, (_, i) => {
			const val = Math.round((maxTasks / steps) * (steps - i));
			const y = PADDING.top + (i / steps) * chartH;
			return { val, y };
		});
	});

	// X-axis date labels
	const xLabels = $derived.by(() => {
		if (sorted.length === 0) return [];
		const step = Math.max(1, Math.floor(sorted.length / 5));
		return sorted
			.filter((_, i) => i % step === 0 || i === sorted.length - 1)
			.map((s, i, arr) => ({
				label: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
				x: PADDING.left + (sorted.indexOf(s) / Math.max(sorted.length - 1, 1)) * chartW
			}));
	});
</script>

{#if sorted.length < 2}
	<p class="text-center text-xs text-surface-500 py-8">Not enough data for burndown chart. Snapshots build over time.</p>
{:else}
	<svg viewBox="0 0 {WIDTH} {HEIGHT}" class="w-full max-w-[600px]">
		<!-- Grid lines -->
		{#each yLabels as { y }}
			<line x1={PADDING.left} y1={y} x2={PADDING.left + chartW} y2={y} class="stroke-surface-200 dark:stroke-surface-800" stroke-width="1" />
		{/each}

		<!-- Y-axis labels -->
		{#each yLabels as { val, y }}
			<text x={PADDING.left - 8} y={y + 4} text-anchor="end" class="fill-surface-500 text-[10px]">{val}</text>
		{/each}

		<!-- X-axis labels -->
		{#each xLabels as { label, x }}
			<text x={x} y={HEIGHT - 8} text-anchor="middle" class="fill-surface-500 text-[10px]">{label}</text>
		{/each}

		<!-- Ideal line -->
		<path d={idealLine} fill="none" class="stroke-surface-400 dark:stroke-surface-600" stroke-width="1.5" stroke-dasharray="4 3" />

		<!-- Actual line -->
		<path d={actualLine} fill="none" class="stroke-brand-500" stroke-width="2" />

		<!-- Data points -->
		{#each sorted as s, i}
			{@const x = PADDING.left + (i / Math.max(sorted.length - 1, 1)) * chartW}
			{@const remaining = s.totalTasks - s.completedTasks}
			{@const y = PADDING.top + (1 - remaining / maxTasks) * chartH}
			<circle cx={x} cy={y} r="3" class="fill-brand-500" />
		{/each}
	</svg>

	<div class="mt-2 flex justify-center gap-4 text-[10px] text-surface-500">
		<span class="flex items-center gap-1">
			<span class="inline-block h-0.5 w-4 bg-surface-400 dark:bg-surface-600" style="border-bottom: 1.5px dashed"></span>
			Ideal
		</span>
		<span class="flex items-center gap-1">
			<span class="inline-block h-0.5 w-4 bg-brand-500"></span>
			Actual
		</span>
	</div>
{/if}
