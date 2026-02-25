<script lang="ts">
	interface Option {
		value: string;
		label: string;
		color?: string;
	}

	interface Props {
		label: string;
		options: Option[];
		selected: string[];
		onchange: (values: string[]) => void;
		searchable?: boolean;
	}

	let { label, options, selected, onchange, searchable = false }: Props = $props();

	let open = $state(false);
	let search = $state('');
	let dropdownEl: HTMLDivElement | undefined = $state();

	const filteredOptions = $derived(
		searchable && search
			? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
			: options
	);

	const count = $derived(selected.length);

	function toggle(value: string) {
		if (selected.includes(value)) {
			onchange(selected.filter((v) => v !== value));
		} else {
			onchange([...selected, value]);
		}
	}

	function selectAll() {
		onchange(options.map((o) => o.value));
	}

	function clearAll() {
		onchange([]);
	}

	function handleClickOutside(e: MouseEvent) {
		if (dropdownEl && !dropdownEl.contains(e.target as Node)) {
			open = false;
			search = '';
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="relative" bind:this={dropdownEl}>
	<button
		type="button"
		onclick={(e) => { e.stopPropagation(); open = !open; }}
		class="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition
			{count > 0
				? 'border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/20 dark:text-brand-300'
				: 'border-surface-300 text-surface-600 hover:border-surface-400 dark:border-surface-700 dark:text-surface-400 dark:hover:border-surface-600'}"
	>
		{label}
		{#if count > 0}
			<span class="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-medium text-white">{count}</span>
		{/if}
		<svg class="h-3 w-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
	</button>

	{#if open}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border border-surface-300 bg-white shadow-lg dark:border-surface-700 dark:bg-surface-900"
			role="presentation"
			onclick={(e) => e.stopPropagation()}
		>
			{#if searchable}
				<div class="border-b border-surface-200 p-1.5 dark:border-surface-800">
					<!-- svelte-ignore a11y_autofocus -->
					<input
						bind:value={search}
						placeholder="Search..."
						class="w-full rounded border-0 bg-surface-100 px-2 py-1 text-xs text-surface-900 outline-none placeholder:text-surface-400 dark:bg-surface-800 dark:text-surface-100"
						autofocus
					/>
				</div>
			{/if}

			<div class="flex items-center justify-between border-b border-surface-200 px-2 py-1 dark:border-surface-800">
				<button type="button" onclick={selectAll} class="text-[10px] text-brand-600 hover:text-brand-700 dark:text-brand-400">Select all</button>
				<button type="button" onclick={clearAll} class="text-[10px] text-surface-500 hover:text-surface-700 dark:hover:text-surface-300">Clear</button>
			</div>

			<div class="max-h-48 overflow-y-auto p-1">
				{#each filteredOptions as option (option.value)}
					<label
						class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800"
					>
						<input
							type="checkbox"
							checked={selected.includes(option.value)}
							onchange={() => toggle(option.value)}
							class="h-3 w-3 rounded border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-600"
						/>
						{#if option.color}
							<span class="h-2 w-2 rounded-full shrink-0" style="background-color: {option.color}"></span>
						{/if}
						<span class="truncate">{option.label}</span>
					</label>
				{:else}
					<p class="px-2 py-2 text-[10px] text-surface-400">No options</p>
				{/each}
			</div>
		</div>
	{/if}
</div>
