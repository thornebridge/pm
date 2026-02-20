<script lang="ts">
	import { goto } from '$app/navigation';
	import { fade, scale } from 'svelte/transition';
	import { themeMode, toggleTheme } from '$lib/stores/theme.js';

	interface Props {
		open: boolean;
		onclose: () => void;
		projectSlug?: string | null;
		isAdmin?: boolean;
	}

	let { open, onclose, projectSlug = null, isAdmin = false }: Props = $props();

	let query = $state('');
	let results = $state<{
		tasks: Array<{ id: string; number: number; title: string; projectSlug: string; projectName: string }>;
		projects: Array<{ id: string; name: string; slug: string }>;
		comments: Array<{ id: string; body: string; taskNumber: number; taskTitle: string; projectSlug: string }>;
	}>({ tasks: [], projects: [], comments: [] });
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let inputEl: HTMLInputElement | undefined = $state();
	let selectedIndex = $state(-1);

	// Command mode
	const isCommandMode = $derived(query.startsWith('>'));
	const commandQuery = $derived(isCommandMode ? query.slice(1).trim().toLowerCase() : '');

	interface Command {
		id: string;
		label: string;
		group: string;
		shortcut?: string;
		action: () => void;
	}

	const commands = $derived.by((): Command[] => {
		const cmds: Command[] = [
			// Navigation
			{ id: 'nav-dashboard', label: 'Go to Dashboard', group: 'Navigation', shortcut: 'D', action: () => navigate('/dashboard') },
			{ id: 'nav-projects', label: 'Go to Projects', group: 'Navigation', shortcut: 'P', action: () => navigate('/projects') },
			{ id: 'nav-my-tasks', label: 'Go to My Tasks', group: 'Navigation', shortcut: 'M', action: () => navigate('/my-tasks') },
			{ id: 'nav-activity', label: 'Go to Activity', group: 'Navigation', shortcut: 'A', action: () => navigate('/activity') },
			// Actions
			{ id: 'action-theme', label: `Toggle Theme (${$themeMode === 'light' ? 'to dark' : 'to light'})`, group: 'Actions', action: () => { toggleTheme(); onclose(); } }
		];

		if (isAdmin) {
			cmds.push({ id: 'nav-admin', label: 'Go to Admin', group: 'Navigation', action: () => navigate('/admin') });
		}

		if (projectSlug) {
			cmds.push(
				{ id: 'proj-home', label: 'Go to Home', group: 'Project', action: () => navigate(`/projects/${projectSlug}/home`) },
				{ id: 'proj-board', label: 'Go to Board', group: 'Project', action: () => navigate(`/projects/${projectSlug}/board`) },
				{ id: 'proj-list', label: 'Go to List', group: 'Project', action: () => navigate(`/projects/${projectSlug}/list`) },
				{ id: 'proj-gantt', label: 'Go to Gantt', group: 'Project', action: () => navigate(`/projects/${projectSlug}/gantt`) },
				{ id: 'proj-calendar', label: 'Go to Calendar', group: 'Project', action: () => navigate(`/projects/${projectSlug}/calendar`) },
				{ id: 'proj-sprints', label: 'Go to Sprints', group: 'Project', action: () => navigate(`/projects/${projectSlug}/sprints`) },
				{ id: 'proj-settings', label: 'Go to Settings', group: 'Project', action: () => navigate(`/projects/${projectSlug}/settings`) }
			);
		}

		return cmds;
	});

	const filteredCommands = $derived(
		commandQuery
			? commands.filter((c) => c.label.toLowerCase().includes(commandQuery))
			: commands
	);

	// Group commands for display
	const commandGroups = $derived.by(() => {
		const groups = new Map<string, Command[]>();
		for (const cmd of filteredCommands) {
			const arr = groups.get(cmd.group) || [];
			arr.push(cmd);
			groups.set(cmd.group, arr);
		}
		return [...groups.entries()];
	});

	// Flat items for search mode
	interface FlatItem {
		url: string;
		type: 'project' | 'task' | 'comment';
	}

	const flatResults = $derived<FlatItem[]>([
		...results.projects.map((p) => ({ url: `/projects/${p.slug}/home`, type: 'project' as const })),
		...results.tasks.map((t) => ({ url: `/projects/${t.projectSlug}/task/${t.number}`, type: 'task' as const })),
		...results.comments.map((c) => ({ url: `/projects/${c.projectSlug}/task/${c.taskNumber}`, type: 'comment' as const }))
	]);

	const totalItems = $derived(isCommandMode ? filteredCommands.length : flatResults.length);

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
		if (isCommandMode) {
			filteredCommands;
		} else {
			flatResults;
		}
		selectedIndex = -1;
	});

	function handleInput() {
		if (isCommandMode) return; // No API search in command mode
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

		if (totalItems === 0) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % totalItems;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + totalItems) % totalItems;
		} else if (e.key === 'Enter' && selectedIndex >= 0) {
			e.preventDefault();
			if (isCommandMode) {
				filteredCommands[selectedIndex]?.action();
			} else if (flatResults[selectedIndex]) {
				navigate(flatResults[selectedIndex].url);
			}
		}
	}

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
		class="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
		onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
		onkeydown={handleKeydown}
	>
		<div class="absolute inset-0 bg-black/40 dark:bg-black/60" transition:fade={{ duration: 150 }}></div>
		<div
			class="relative w-full max-w-lg overflow-hidden rounded-xl border border-surface-300 bg-surface-50 shadow-2xl dark:border-surface-700 dark:bg-surface-900"
			transition:scale={{ start: 0.98, duration: 150 }}
		>
			<div class="flex items-center gap-2 border-b border-surface-300 px-4 py-3 dark:border-surface-800">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-surface-500" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
				</svg>
				<input
					bind:this={inputEl}
					bind:value={query}
					oninput={handleInput}
					placeholder="Search or type > for commands..."
					class="flex-1 bg-transparent text-sm text-surface-900 outline-none placeholder:text-surface-500 dark:text-surface-100"
				/>
				<kbd class="rounded border border-surface-300 px-1.5 py-0.5 text-[10px] text-surface-400 dark:border-surface-700">Esc</kbd>
			</div>

			{#if isCommandMode}
				<!-- Command mode -->
				<div class="max-h-80 overflow-y-auto p-2">
					{#if commandGroups.length > 0}
						{@const flatIdx = { current: 0 }}
						{#each commandGroups as [group, cmds]}
							<div class="mb-2">
								<span class="px-2 text-[10px] font-semibold uppercase tracking-wider text-surface-500">{group}</span>
								{#each cmds as cmd}
									{@const idx = flatIdx.current++}
									<!-- NOTE: idx computed inline is tricky; use array index approach -->
									<button
										onclick={() => cmd.action()}
										class="mt-0.5 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm {selectedIndex === idx ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300' : 'text-surface-700 hover:bg-surface-200 dark:text-surface-300 dark:hover:bg-surface-800'}"
									>
										<span>{cmd.label}</span>
										{#if cmd.shortcut}
											<kbd class="rounded border border-surface-300 px-1 py-0.5 text-[10px] text-surface-400 dark:border-surface-700">{cmd.shortcut}</kbd>
										{/if}
									</button>
								{/each}
							</div>
						{/each}
					{:else}
						<p class="p-4 text-center text-xs text-surface-500">No commands found.</p>
					{/if}
				</div>
			{:else if hasResults}
				<!-- Search results -->
				<div class="max-h-80 overflow-y-auto p-2">
					{#if results.projects.length > 0}
						<div class="mb-2">
							<span class="px-2 text-[10px] font-semibold uppercase tracking-wider text-surface-500">Projects</span>
							{#each results.projects as project, i}
								<button
									onclick={() => navigate(`/projects/${project.slug}/home`)}
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
			{:else if query.length >= 2 && !isCommandMode}
				<p class="p-4 text-center text-xs text-surface-500">No results found.</p>
			{:else if !isCommandMode && query.length === 0}
				<div class="p-3 text-center text-xs text-surface-400">
					Type to search or <kbd class="rounded border border-surface-300 px-1 py-0.5 text-[10px] dark:border-surface-700">&gt;</kbd> for commands
				</div>
			{/if}
		</div>
	</div>
{/if}
