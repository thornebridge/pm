<script lang="ts">
	interface Segment {
		label: string;
		value: number;
		color: string;
	}

	interface Props {
		segments: Segment[];
		centerLabel?: string;
		centerValue?: string;
	}

	let { segments, centerLabel = '', centerValue = '' }: Props = $props();

	const SIZE = 200;
	const CX = SIZE / 2;
	const CY = SIZE / 2;
	const R = 70;
	const STROKE = 28;

	const total = $derived(segments.reduce((a, s) => a + s.value, 0));

	function segmentPath(startAngle: number, endAngle: number): string {
		const r = R;
		const x1 = CX + r * Math.cos(startAngle);
		const y1 = CY + r * Math.sin(startAngle);
		const x2 = CX + r * Math.cos(endAngle);
		const y2 = CY + r * Math.sin(endAngle);
		const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
		return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
	}

	const arcs = $derived(() => {
		if (total === 0) return [];
		let angle = -Math.PI / 2;
		return segments
			.filter((s) => s.value > 0)
			.map((s) => {
				const start = angle;
				const sweep = (s.value / total) * 2 * Math.PI;
				angle += sweep;
				return { ...s, path: segmentPath(start, start + sweep - 0.01) };
			});
	});
</script>

<div class="flex items-center gap-4">
	<svg viewBox="0 0 {SIZE} {SIZE}" class="h-36 w-36 shrink-0">
		{#if total === 0}
			<circle cx={CX} cy={CY} r={R} fill="none" class="stroke-surface-200 dark:stroke-surface-800" stroke-width={STROKE} />
		{:else}
			{#each arcs() as arc}
				<path d={arc.path} fill="none" stroke={arc.color} stroke-width={STROKE} stroke-linecap="round" />
			{/each}
		{/if}
		{#if centerValue}
			<text x={CX} y={CY - 4} text-anchor="middle" class="fill-surface-900 text-lg font-bold dark:fill-surface-100">
				{centerValue}
			</text>
		{/if}
		{#if centerLabel}
			<text x={CX} y={CY + 14} text-anchor="middle" class="fill-surface-500 text-[10px]">
				{centerLabel}
			</text>
		{/if}
	</svg>
	<div class="flex flex-col gap-1.5">
		{#each segments.filter((s) => s.value > 0) as seg}
			<div class="flex items-center gap-2">
				<span class="h-2.5 w-2.5 rounded-full" style="background-color: {seg.color}"></span>
				<span class="text-xs text-surface-700 dark:text-surface-300">{seg.label}</span>
				<span class="text-xs font-medium text-surface-900 dark:text-surface-100">{seg.value}</span>
			</div>
		{/each}
	</div>
</div>
