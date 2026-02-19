<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		color?: string;
		children: Snippet;
	}

	let { color = '#2d4f3e', children }: Props = $props();
</script>

<span
	class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
	style="background-color: {color}20; color: {color}"
>
	{@render children()}
</span>
