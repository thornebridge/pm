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

	const ROW_HEIGHT = 32;
	const WIDTH = 600;
	const PADDING = { top: 4, right: 80, bottom: 4, left: 120 };

	const chartW = WIDTH - PADDING.left - PADDING.right;
	const height = $derived(PADDING.top + PADDING.bottom + bars.length * ROW_HEIGHT);
	const maxVal = $derived(Math.max(...bars.map((b) => b.value), 1));
</script>

{#if bars.length === 0}
	<p class="py-8 text-center text-xs text-surface-500">No data.</p>
{:else}
	<svg viewBox="0 0 {WIDTH} {height}" class="w-full">
		{#each bars as bar, i}
			{@const y = PADDING.top + i * ROW_HEIGHT}
			{@const barW = Math.max((bar.value / maxVal) * chartW, 2)}
			{@const barH = ROW_HEIGHT - 8}
			{@const color = bar.color || '#6366f1'}

			<!-- Label -->
			<text
				x={PADDING.left - 8}
				y={y + barH / 2 + 4}
				text-anchor="end"
				class="fill-surface-700 text-[11px] dark:fill-surface-300"
			>
				{bar.label}
			</text>

			<!-- Bar -->
			<rect x={PADDING.left} y={y} width={barW} height={barH} rx={3} fill={color} opacity="0.85" />

			<!-- Value -->
			<text
				x={PADDING.left + barW + 6}
				y={y + barH / 2 + 4}
				text-anchor="start"
				class="fill-surface-600 text-[10px] font-medium dark:fill-surface-400"
			>
				{formatValue(bar.value)}
			</text>
		{/each}
	</svg>
{/if}
