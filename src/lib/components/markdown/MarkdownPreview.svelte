<script lang="ts">
	import { renderMarkdown } from '$lib/utils/markdown.js';

	interface Props {
		content: string;
	}

	let { content }: Props = $props();

	const html = $derived(renderMarkdown(content));
</script>

<div class="prose-sm text-sm text-surface-700 dark:text-surface-300 [&_a]:text-brand-600 [&_a]:dark:text-brand-400">
	{@html html}
</div>
