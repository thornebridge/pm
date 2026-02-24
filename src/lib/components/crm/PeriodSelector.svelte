<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { PeriodPreset } from '$lib/utils/periods.js';

	interface Props {
		period: PeriodPreset;
		customFrom?: number | null;
		customTo?: number | null;
	}

	let { period, customFrom = null, customTo = null }: Props = $props();

	const presets: { value: PeriodPreset; label: string }[] = [
		{ value: 'this_month', label: 'This Month' },
		{ value: 'last_month', label: 'Last Month' },
		{ value: 'this_quarter', label: 'This Quarter' },
		{ value: 'last_quarter', label: 'Last Quarter' },
		{ value: 'last_90d', label: '90 Days' },
		{ value: 'ytd', label: 'YTD' },
		{ value: 'custom', label: 'Custom' }
	];

	function toDateStr(ms: number | null | undefined): string {
		if (!ms) return '';
		return new Date(ms).toISOString().slice(0, 10);
	}

	let fromStr = $state(toDateStr(customFrom));
	let toStr = $state(toDateStr(customTo));

	function navigate(preset: PeriodPreset) {
		const url = new URL($page.url);
		url.searchParams.set('period', preset);
		if (preset === 'custom' && fromStr && toStr) {
			url.searchParams.set('from', String(new Date(fromStr).getTime()));
			url.searchParams.set('to', String(new Date(toStr + 'T23:59:59').getTime()));
		} else {
			url.searchParams.delete('from');
			url.searchParams.delete('to');
		}
		goto(url.toString(), { replaceState: true });
	}

	function applyCustom() {
		if (fromStr && toStr) navigate('custom');
	}
</script>

<div class="flex flex-wrap items-center gap-2">
	{#each presets as p}
		{#if p.value !== 'custom'}
			<button
				onclick={() => navigate(p.value)}
				class="rounded-md px-3 py-1.5 text-xs font-medium transition
					{period === p.value
						? 'bg-brand-600 text-white'
						: 'bg-surface-200 text-surface-600 hover:bg-surface-300 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700'}"
			>
				{p.label}
			</button>
		{/if}
	{/each}
	<div class="flex items-center gap-1.5">
		<input
			type="date"
			bind:value={fromStr}
			onchange={applyCustom}
			class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-700 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300"
		/>
		<span class="text-xs text-surface-500">–</span>
		<input
			type="date"
			bind:value={toStr}
			onchange={applyCustom}
			class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-700 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300"
		/>
	</div>
</div>
