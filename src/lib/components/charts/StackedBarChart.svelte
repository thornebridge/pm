<script lang="ts">
	interface Segment {
		value: number;
		color: string;
		label: string;
	}

	interface Group {
		label: string;
		segments: Segment[];
	}

	interface Props {
		groups: Group[];
		formatValue?: (n: number) => string;
	}

	let { groups, formatValue = (n) => String(n) }: Props = $props();

	const WIDTH = 600;
	const HEIGHT = 220;
	const PADDING = { top: 20, right: 20, bottom: 40, left: 50 };

	const chartW = WIDTH - PADDING.left - PADDING.right;
	const chartH = HEIGHT - PADDING.top - PADDING.bottom;

	const maxTotal = $derived(Math.max(...groups.map((g) => g.segments.reduce((a, s) => a + s.value, 0)), 1));
	const barW = $derived(groups.length > 0 ? Math.min(50, chartW / groups.length * 0.7) : 50);
	const gap = $derived(groups.length > 0 ? chartW / groups.length : 0);
</script>

{#if groups.length === 0}
	<p class="py-8 text-center text-xs text-surface-500">No data.</p>
{:else}
	<svg viewBox="0 0 {WIDTH} {HEIGHT}" class="w-full">
		<!-- Y-axis gridlines -->
		{#each [0, 0.25, 0.5, 0.75, 1] as ratio}
			{@const y = PADDING.top + (1 - ratio) * chartH}
			<line x1={PADDING.left} y1={y} x2={PADDING.left + chartW} y2={y} class="stroke-surface-200 dark:stroke-surface-800" stroke-width="1" />
			<text x={PADDING.left - 8} y={y + 4} text-anchor="end" class="fill-surface-500 text-[10px]">
				{formatValue(Math.round(maxTotal * ratio))}
			</text>
		{/each}

		<!-- Stacked bars -->
		{#each groups as group, gi}
			{@const x = PADDING.left + gi * gap + (gap - barW) / 2}
			{@const total = group.segments.reduce((a, s) => a + s.value, 0)}
			{#each group.segments as segment, si}
				{@const prevH = group.segments.slice(0, si).reduce((a, s) => a + (s.value / maxTotal) * chartH, 0)}
				{@const segH = Math.max((segment.value / maxTotal) * chartH, 0)}
				{@const y = PADDING.top + chartH - prevH - segH}
				{#if segH > 0}
					<rect {x} {y} width={barW} height={segH} rx={si === group.segments.length - 1 ? 3 : 0} fill={segment.color} opacity="0.85" />
				{/if}
			{/each}

			<!-- Total label -->
			{@const totalH = (total / maxTotal) * chartH}
			<text
				x={x + barW / 2}
				y={PADDING.top + chartH - totalH - 4}
				text-anchor="middle"
				class="fill-surface-700 text-[10px] font-medium dark:fill-surface-300"
			>
				{formatValue(total)}
			</text>

			<!-- Group label -->
			<text
				x={x + barW / 2}
				y={HEIGHT - 8}
				text-anchor="middle"
				class="fill-surface-600 text-[10px] dark:fill-surface-400"
			>
				{group.label}
			</text>
		{/each}

		<!-- Baseline -->
		<line x1={PADDING.left} y1={PADDING.top + chartH} x2={PADDING.left + chartW} y2={PADDING.top + chartH} class="stroke-surface-300 dark:stroke-surface-700" stroke-width="1" />
	</svg>
{/if}
