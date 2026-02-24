<script lang="ts">
	import { forecastCategoryConfig, type ForecastCategory } from '$lib/utils/forecast.js';

	interface Props {
		category: ForecastCategory | string | null | undefined;
	}

	let { category }: Props = $props();

	const config = $derived(
		category && category in forecastCategoryConfig
			? forecastCategoryConfig[category as ForecastCategory]
			: null
	);
</script>

{#if config}
	<span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium {config.bgClass} {config.textClass}">
		{config.label}
	</span>
{/if}
