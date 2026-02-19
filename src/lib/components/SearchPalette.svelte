<script lang="ts">
	import { goto } from '$app/navigation';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open, onclose }: Props = $props();

	let query = $state('');
	let results = $state<{
		tasks: Array<{ id: string; number: number; title: string; projectSlug: string; projectName: string }>;
		projects: Array<{ id: string; name: string; slug: string }>;
		comments: Array<{ id: string; body: string; taskNumber: number; taskTitle: string; projectSlug: string }>;
	}>({ tasks: [], projects: [], comments: [] });
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let inputEl: HTMLInputElement | undefined = $state();
	let selectedIndex = $state(-1);

	interface FlatItem {
		url: string;
		type: 'project' | 'task' | 'comment';
	}

	const flatResults = $derived<FlatItem[]>([
		...results.projects.map((p) => ({ url: `/projects/${p.slug}/board`, type: 'project' as const })),
		...results.tasks.map((t) => ({ url: `/projects/${t.projectSlug}/task/${t.number}`, type: 'task' as const })),
		...results.comments.map((c) => ({ url: `/projects/${c.projectSlug}/task/${c.taskNumber}`, type: 'comment' as const }))
	]);

	$effect(() => {
		if (open) {
			requestAnimationFrame(() => inputEl?.focus());
		} else {
			query = '';
			results = { tasks: [], projects: [], comments: [] };
			selectedIndex = -1;
		}
	});

	// Reset index when results change
	$effect(() => {
		flatResults;
		selectedIndex = -1;
	});

	function handleInput() {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(async () => {
			if (query.trim().length < 2) {
				results = { tasks: [], projects: [], comments: [] };
				return;
			}
			try {
				const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
				if (res.ok) results = await res.json();
			} catch {
				// ignore
			}
		}, 200);
	}

	function navigate(url: string) {
		onclose();
		goto(url);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
			return;
		}
		if (flatResults.length === 0) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % flatResults.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + flatResults.length) % flatResults.length;
		} else if (e.key === 'Enter' && selectedIndex >= 0 && flatResults[selectedIndex]) {
			e.preventDefault();
			navigate(flatResults[selectedIndex].url);
		}
	}

	// Compute offsets for highlighting: projects come first, then tasks, then comments
	function isSelected(sectionOffset: number, itemIndex: number): boolean {
		return selectedIndex === sectionOffset + itemIndex;
	}

	const hasResults = $derived(results.tasks.length > 0 || results.projects.length > 0 || results.comments.length > 0);
	const projectsOffset = 0;
	const tasksOffset = $derived(results.projects.length);
	const commentsOffset = $derived(results.projects.length + results.tasks.length);
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 pt-[15vh] dark:bg-black/60"
		onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
		onkeydown={handleKeydown}
	>
		<div class="w-full max-w-lg overflow-hidden rounded-xl border border-surface-300 bg-surface-50 shadow-2xl dark:border-surface-700 dark:bg-surface-900">
			<div class="flex items-center gap-2 border-b border-surface-300 px-4 py-3 dark:border-surface-800">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-surface-500" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
				</svg>
				<input
					bind:this={inputEl}
					bind:value={query}
					oninput={handleInput}
					placeholder="Search tasks, projects, comments..."
					class="flex-1 bg-transparent text-sm text-surface-900 outline-none placeholder:text-surface-500 dark:text-surface-100"
				/>
				<kbd class="rounded border border-surface-300 px-1.5 py-0.5 text-[10px] text-surface-400 dark:border-surface-700">Esc</kbd>
			</div>

			{#if hasResults}
				<div class="max-h-80 overflow-y-auto p-2">
					{#if results.projects.length > 0}
						<div class="mb-2">
							<span class="px-2 text-[10px] font-semibold uppercase tracking-wider text-surface-500">Projects</span>
							{#each results.projects as project, i}
								<button
									onclick={() => navigate(`/projects/${project.slug}/board`)}
									class="mt-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm {isSelected(projectsOffset, i) ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300' : 'text-surface-700 hover:bg-surface-200 dark:text-surface-300 dark:hover:bg-surface-800'}"
								>
									{project.name}
								</button>
							{/each}
						</div>
					{/if}

					{#if results.tasks.length > 0}
						<div class="mb-2">
							<span class="px-2 text-[10px] font-semibold uppercase tracking-wider text-surface-500">Tasks</span>
							{#each results.tasks as task, i}
								<button
									onclick={() => navigate(`/projects/${task.projectSlug}/task/${task.number}`)}
									class="mt-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm {isSelected(tasksOffset, i) ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300' : 'hover:bg-surface-200 dark:hover:bg-surface-800'}"
								>
									<span class="text-xs {isSelected(tasksOffset, i) ? 'text-brand-500' : 'text-surface-400'}">#{task.number}</span>
									<span class="flex-1 truncate {isSelected(tasksOffset, i) ? '' : 'text-surface-700 dark:text-surface-300'}">{task.title}</span>
									<span class="text-[10px] {isSelected(tasksOffset, i) ? 'text-brand-500' : 'text-surface-400'}">{task.projectName}</span>
								</button>
							{/each}
						</div>
					{/if}

					{#if results.comments.length > 0}
						<div>
							<span class="px-2 text-[10px] font-semibold uppercase tracking-wider text-surface-500">Comments</span>
							{#each results.comments as comment, i}
								<button
									onclick={() => navigate(`/projects/${comment.projectSlug}/task/${comment.taskNumber}`)}
									class="mt-0.5 flex w-full flex-col rounded-md px-2 py-1.5 text-left {isSelected(commentsOffset, i) ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300' : 'hover:bg-surface-200 dark:hover:bg-surface-800'}"
								>
									<span class="text-xs {isSelected(commentsOffset, i) ? '' : 'text-surface-700 dark:text-surface-300'}">#{comment.taskNumber} {comment.taskTitle}</span>
									<span class="truncate text-[10px] {isSelected(commentsOffset, i) ? 'text-brand-500' : 'text-surface-500'}">{comment.body}</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{:else if query.length >= 2}
				<p class="p-4 text-center text-xs text-surface-500">No results found.</p>
			{/if}
		</div>
	</div>
{/if}
