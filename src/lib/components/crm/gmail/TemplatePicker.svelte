<script lang="ts">
	import { fly } from 'svelte/transition';
	import { api } from '$lib/utils/api.js';

	interface Template {
		id: string;
		name: string;
		subjectTemplate: string;
		bodyTemplate: string;
		category: string | null;
	}

	interface Props {
		open: boolean;
		onselect: (template: Template) => void;
		onclose: () => void;
	}

	let { open, onselect, onclose }: Props = $props();

	let templates = $state<Template[]>([]);
	let loading = $state(false);
	let search = $state('');

	$effect(() => {
		if (open) {
			loading = true;
			api<{ templates: Template[] }>('/api/crm/gmail/templates')
				.then((res) => { templates = res.templates; })
				.catch(() => { templates = []; })
				.finally(() => { loading = false; });
		}
	});

	const filteredTemplates = $derived(
		search.trim()
			? templates.filter((t) =>
				t.name.toLowerCase().includes(search.toLowerCase()) ||
				t.subjectTemplate.toLowerCase().includes(search.toLowerCase())
			)
			: templates
	);

	const groupedTemplates = $derived(() => {
		const groups: Record<string, Template[]> = {};
		for (const t of filteredTemplates) {
			const cat = t.category || 'Uncategorized';
			if (!groups[cat]) groups[cat] = [];
			groups[cat].push(t);
		}
		return groups;
	});
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-hidden rounded-lg border border-surface-300 bg-white shadow-lg dark:border-surface-700 dark:bg-surface-800"
		transition:fly={{ y: -8, duration: 150 }}
		onkeydown={(e) => e.key === 'Escape' && onclose()}
	>
		<div class="border-b border-surface-200 p-2 dark:border-surface-700">
			<input
				bind:value={search}
				placeholder="Search templates..."
				class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-xs text-surface-900 placeholder-surface-400 dark:border-surface-600 dark:bg-surface-700 dark:text-surface-100"
			/>
		</div>

		<div class="max-h-56 overflow-y-auto">
			{#if loading}
				<div class="px-3 py-4 text-center text-xs text-surface-500">Loading templates...</div>
			{:else if filteredTemplates.length === 0}
				<div class="px-3 py-4 text-center text-xs text-surface-500">
					{templates.length === 0 ? 'No templates yet' : 'No matching templates'}
				</div>
			{:else}
				{#each Object.entries(groupedTemplates()) as [category, catTemplates]}
					<div class="border-b border-surface-100 last:border-0 dark:border-surface-700">
						<div class="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-surface-400">
							{category}
						</div>
						{#each catTemplates as template}
							<button
								onclick={() => { onselect(template); onclose(); }}
								class="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-surface-50 dark:hover:bg-surface-700"
							>
								<span class="text-xs font-medium text-surface-900 dark:text-surface-100">{template.name}</span>
								<span class="truncate text-[10px] text-surface-500">{template.subjectTemplate}</span>
							</button>
						{/each}
					</div>
				{/each}
			{/if}
		</div>

		<div class="border-t border-surface-200 px-3 py-1.5 dark:border-surface-700">
			<a href="/crm/email/templates" class="text-[10px] text-brand-600 hover:text-brand-500 dark:text-brand-400">
				Manage Templates
			</a>
		</div>
	</div>
{/if}
