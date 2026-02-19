<script lang="ts">
	import MarkdownPreview from './MarkdownPreview.svelte';

	interface Props {
		value: string;
		placeholder?: string;
		rows?: number;
		onchange?: (value: string) => void;
	}

	let { value = $bindable(), placeholder = '', rows = 5, onchange }: Props = $props();

	let showPreview = $state(false);

	function insertAt(before: string, after: string) {
		const el = document.querySelector<HTMLTextAreaElement>('[data-md-editor]');
		if (!el) return;
		const start = el.selectionStart;
		const end = el.selectionEnd;
		const selected = value.slice(start, end);
		value = value.slice(0, start) + before + selected + after + value.slice(end);
		onchange?.(value);
		requestAnimationFrame(() => {
			el.focus();
			el.setSelectionRange(start + before.length, start + before.length + selected.length);
		});
	}
</script>

<div>
	<!-- Toolbar -->
	<div class="flex items-center gap-1 border border-b-0 border-surface-300 rounded-t-md bg-surface-100 px-2 py-1 dark:border-surface-700 dark:bg-surface-800">
		<button type="button" onclick={() => insertAt('**', '**')} class="rounded px-1.5 py-0.5 text-xs text-surface-600 hover:bg-surface-200 dark:text-surface-400 dark:hover:bg-surface-700" title="Bold">
			<strong>B</strong>
		</button>
		<button type="button" onclick={() => insertAt('*', '*')} class="rounded px-1.5 py-0.5 text-xs text-surface-600 hover:bg-surface-200 dark:text-surface-400 dark:hover:bg-surface-700" title="Italic">
			<em>I</em>
		</button>
		<button type="button" onclick={() => insertAt('`', '`')} class="rounded px-1.5 py-0.5 text-xs font-mono text-surface-600 hover:bg-surface-200 dark:text-surface-400 dark:hover:bg-surface-700" title="Code">
			&lt;&gt;
		</button>
		<button type="button" onclick={() => insertAt('[', '](url)')} class="rounded px-1.5 py-0.5 text-xs text-surface-600 hover:bg-surface-200 dark:text-surface-400 dark:hover:bg-surface-700" title="Link">
			Link
		</button>
		<button type="button" onclick={() => insertAt('- ', '')} class="rounded px-1.5 py-0.5 text-xs text-surface-600 hover:bg-surface-200 dark:text-surface-400 dark:hover:bg-surface-700" title="List">
			List
		</button>
		<div class="flex-1"></div>
		<button type="button" onclick={() => (showPreview = !showPreview)} class="rounded px-1.5 py-0.5 text-xs {showPreview ? 'bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-400' : 'text-surface-600 hover:bg-surface-200 dark:text-surface-400 dark:hover:bg-surface-700'}">
			{showPreview ? 'Edit' : 'Preview'}
		</button>
	</div>

	{#if showPreview}
		<div class="min-h-[100px] rounded-b-md border border-surface-300 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800">
			{#if value.trim()}
				<MarkdownPreview content={value} />
			{:else}
				<p class="text-xs text-surface-500">Nothing to preview</p>
			{/if}
		</div>
	{:else}
		<textarea
			data-md-editor
			bind:value
			oninput={() => onchange?.(value)}
			{placeholder}
			{rows}
			class="w-full rounded-b-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
		></textarea>
	{/if}
</div>
