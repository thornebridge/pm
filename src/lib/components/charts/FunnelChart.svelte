<script lang="ts">
	import { formatCurrency } from '$lib/utils/currency.js';

	interface Stage {
		name: string;
		color: string;
		count: number;
		value: number;
	}

	interface Props {
		stages: Stage[];
	}

	let { stages }: Props = $props();

	const WIDTH = 600;
	const HEIGHT = 40 * Math.max(stages.length, 1);
	const PADDING = { top: 8, right: 160, bottom: 8, left: 8 };

	const chartW = WIDTH - PADDING.left - PADDING.right;
	const maxCount = $derived(Math.max(...stages.map((s) => s.count), 1));
	const rowH = $derived(stages.length > 0 ? (HEIGHT - PADDING.top - PADDING.bottom) / stages.length : 36);
</script>

{#if stages.length === 0}
	<p class="py-8 text-center text-xs text-surface-500">No pipeline data.</p>
{:else}
	<svg viewBox="0 0 {WIDTH} {HEIGHT}" class="w-full">
		{#each stages as stage, i}
			{@const widthRatio = stage.count / maxCount}
			{@const barW = Math.max(widthRatio * chartW, 4)}
			{@const x = PADDING.left + (chartW - barW) / 2}
			{@const y = PADDING.top + i * rowH}
			{@const barH = rowH - 4}

			<!-- Funnel bar -->
			<rect {x} {y} width={barW} height={barH} rx={3} fill={stage.color} opacity="0.85" />

			<!-- Stage name inside bar -->
			<text
				x={WIDTH / 2 - PADDING.right / 2 + PADDING.left / 2}
				y={y + barH / 2 + 4}
				text-anchor="middle"
				class="fill-white text-[11px] font-medium"
			>
				{stage.name}
			</text>

			<!-- Stats on the right -->
			<text
				x={PADDING.left + chartW + 12}
				y={y + barH / 2 + 1}
				text-anchor="start"
				class="fill-surface-700 text-[11px] font-medium dark:fill-surface-300"
			>
				{stage.count} deals
			</text>
			<text
				x={PADDING.left + chartW + 12}
				y={y + barH / 2 + 14}
				text-anchor="start"
				class="fill-surface-500 text-[10px]"
			>
				{formatCurrency(stage.value)}
			</text>

			<!-- Conversion arrow between stages -->
			{#if i < stages.length - 1}
				{@const nextRatio = stages[i + 1].count / maxCount}
				{@const pct = stage.count > 0 ? Math.round((stages[i + 1].count / stage.count) * 100) : 0}
				{@const arrowX = PADDING.left + chartW + 110}
				{@const arrowY = y + barH + 2}
				<text
					x={arrowX}
					y={arrowY + 1}
					text-anchor="middle"
					class="fill-surface-400 text-[9px]"
				>
					{pct}%↓
				</text>
			{/if}
		{/each}
	</svg>
{/if}
