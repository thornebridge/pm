<script lang="ts">
	interface SprintVelocity {
		name: string;
		completedPoints: number;
		totalPoints: number;
	}

	interface Props {
		sprints: SprintVelocity[];
	}

	let { sprints }: Props = $props();

	const WIDTH = 600;
	const HEIGHT = 200;
	const PADDING = { top: 10, right: 20, bottom: 40, left: 40 };

	const chartW = WIDTH - PADDING.left - PADDING.right;
	const chartH = HEIGHT - PADDING.top - PADDING.bottom;

	const maxPoints = $derived(Math.max(...sprints.map((s) => Math.max(s.completedPoints, s.totalPoints)), 1));
	const barWidth = $derived(sprints.length > 0 ? Math.min(40, chartW / sprints.length * 0.7) : 40);
	const gap = $derived(sprints.length > 0 ? chartW / sprints.length : 0);
</script>

{#if sprints.length === 0}
	<p class="text-center text-xs text-surface-500 py-8">No completed sprints yet.</p>
{:else}
	<svg viewBox="0 0 {WIDTH} {HEIGHT}" class="w-full max-w-[600px]">
		<!-- Y-axis gridlines -->
		{#each [0, 0.25, 0.5, 0.75, 1] as ratio}
			{@const y = PADDING.top + (1 - ratio) * chartH}
			<line x1={PADDING.left} y1={y} x2={PADDING.left + chartW} y2={y} class="stroke-surface-200 dark:stroke-surface-800" stroke-width="1" />
			<text x={PADDING.left - 8} y={y + 4} text-anchor="end" class="fill-surface-500 text-[10px]">{Math.round(maxPoints * ratio)}</text>
		{/each}

		<!-- Bars -->
		{#each sprints as sprint, i}
			{@const x = PADDING.left + i * gap + (gap - barWidth) / 2}
			{@const h = (sprint.completedPoints / maxPoints) * chartH}
			{@const y = PADDING.top + chartH - h}

			<rect {x} {y} width={barWidth} height={h} rx={3} class="fill-brand-500 opacity-85" />

			<!-- Sprint label -->
			<text
				x={x + barWidth / 2}
				y={HEIGHT - 8}
				text-anchor="middle"
				class="fill-surface-600 text-[10px] dark:fill-surface-400"
			>
				{sprint.name}
			</text>

			<!-- Value label -->
			<text
				x={x + barWidth / 2}
				y={y - 4}
				text-anchor="middle"
				class="fill-surface-700 text-[10px] font-medium dark:fill-surface-300"
			>
				{sprint.completedPoints}
			</text>
		{/each}

		<!-- Baseline -->
		<line x1={PADDING.left} y1={PADDING.top + chartH} x2={PADDING.left + chartW} y2={PADDING.top + chartH} class="stroke-surface-300 dark:stroke-surface-700" stroke-width="1" />
	</svg>
{/if}
