<script lang="ts">
	interface Bar {
		label: string;
		value: number;
		color?: string;
	}

	interface Props {
		bars: Bar[];
		formatValue?: (n: number) => string;
	}

	let { bars, formatValue = (n) => String(n) }: Props = $props();

	const WIDTH = 600;
	const HEIGHT = 200;
	const PADDING = { top: 20, right: 20, bottom: 40, left: 50 };

	const chartW = WIDTH - PADDING.left - PADDING.right;
	const chartH = HEIGHT - PADDING.top - PADDING.bottom;

	const maxVal = $derived(Math.max(...bars.map((b) => b.value), 1));
	const barW = $derived(bars.length > 0 ? Math.min(50, chartW / bars.length * 0.7) : 50);
	const gap = $derived(bars.length > 0 ? chartW / bars.length : 0);
</script>

{#if bars.length === 0}
	<p class="py-8 text-center text-xs text-surface-500">No data.</p>
{:else}
	<svg viewBox="0 0 {WIDTH} {HEIGHT}" class="w-full">
		<!-- Y-axis gridlines -->
		{#each [0, 0.25, 0.5, 0.75, 1] as ratio}
			{@const y = PADDING.top + (1 - ratio) * chartH}
			<line x1={PADDING.left} y1={y} x2={PADDING.left + chartW} y2={y} class="stroke-surface-200 dark:stroke-surface-800" stroke-width="1" />
			<text x={PADDING.left - 8} y={y + 4} text-anchor="end" class="fill-surface-500 text-[10px]">
				{formatValue(Math.round(maxVal * ratio))}
			</text>
		{/each}

		<!-- Bars -->
		{#each bars as bar, i}
			{@const x = PADDING.left + i * gap + (gap - barW) / 2}
			{@const h = (bar.value / maxVal) * chartH}
			{@const y = PADDING.top + chartH - h}
			{@const color = bar.color || '#6366f1'}

			<rect {x} {y} width={barW} height={h} rx={3} fill={color} opacity="0.85" />

			<!-- Value label -->
			<text
				x={x + barW / 2}
				y={y - 4}
				text-anchor="middle"
				class="fill-surface-700 text-[10px] font-medium dark:fill-surface-300"
			>
				{formatValue(bar.value)}
			</text>

			<!-- Bar label -->
			<text
				x={x + barW / 2}
				y={HEIGHT - 8}
				text-anchor="middle"
				class="fill-surface-600 text-[10px] dark:fill-surface-400"
			>
				{bar.label}
			</text>
		{/each}

		<!-- Baseline -->
		<line x1={PADDING.left} y1={PADDING.top + chartH} x2={PADDING.left + chartW} y2={PADDING.top + chartH} class="stroke-surface-300 dark:stroke-surface-700" stroke-width="1" />
	</svg>
{/if}
