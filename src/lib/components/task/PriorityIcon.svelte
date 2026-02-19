<script lang="ts">
	interface Props {
		priority: 'urgent' | 'high' | 'medium' | 'low';
		class?: string;
	}

	let { priority, class: className = '' }: Props = $props();

	const colors = {
		urgent: 'text-red-500',
		high: 'text-orange-400',
		medium: 'text-yellow-500 dark:text-yellow-400',
		low: 'text-surface-500'
	};

	const labels = {
		urgent: '!!!',
		high: '!!',
		medium: '!',
		low: '-'
	};
</script>

<span class="inline-flex items-center text-xs font-bold {colors[priority]} {className}" title={priority}>
	{labels[priority]}
</span>
