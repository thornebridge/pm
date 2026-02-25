<script lang="ts">
	interface Props {
		from: number | null;
		to: number | null;
		onchange: (from: number | null, to: number | null) => void;
	}

	let { from, to, onchange }: Props = $props();

	let open = $state(false);
	let dropdownEl: HTMLDivElement | undefined = $state();

	const hasValue = $derived(from != null || to != null);

	const displayLabel = $derived.by(() => {
		if (!hasValue) return 'Due date';
		if (from && to) return 'Due: range';
		if (from) return 'Due: from';
		return 'Due: until';
	});

	function toDateStr(epoch: number | null): string {
		if (!epoch) return '';
		return new Date(epoch).toISOString().slice(0, 10);
	}

	function fromDateStr(str: string): number | null {
		if (!str) return null;
		return new Date(str + 'T00:00:00').getTime();
	}

	function handleFromChange(e: Event) {
		const val = (e.target as HTMLInputElement).value;
		onchange(fromDateStr(val), to);
	}

	function handleToChange(e: Event) {
		const val = (e.target as HTMLInputElement).value;
		onchange(from, fromDateStr(val));
	}

	function setPreset(preset: string) {
		const now = Date.now();
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const todayMs = today.getTime();

		switch (preset) {
			case 'overdue':
				onchange(null, todayMs - 1);
				break;
			case 'week': {
				const end = new Date(today);
				end.setDate(end.getDate() + (7 - end.getDay()));
				onchange(todayMs, end.getTime());
				break;
			}
			case 'month': {
				const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
				onchange(todayMs, end.getTime());
				break;
			}
		}
		open = false;
	}

	function clear() {
		onchange(null, null);
		open = false;
	}

	function handleClickOutside(e: MouseEvent) {
		if (dropdownEl && !dropdownEl.contains(e.target as Node)) {
			open = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="relative" bind:this={dropdownEl}>
	<button
		type="button"
		onclick={(e) => { e.stopPropagation(); open = !open; }}
		class="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition
			{hasValue
				? 'border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/20 dark:text-brand-300'
				: 'border-surface-300 text-surface-600 hover:border-surface-400 dark:border-surface-700 dark:text-surface-400 dark:hover:border-surface-600'}"
	>
		{displayLabel}
		<svg class="h-3 w-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
	</button>

	{#if open}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border border-surface-300 bg-white p-2 shadow-lg dark:border-surface-700 dark:bg-surface-900"
			role="presentation"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="mb-2 space-y-1.5">
				<label class="block text-[10px] font-medium text-surface-500">From
				<input
					type="date"
					value={toDateStr(from)}
					onchange={handleFromChange}
					class="w-full rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				/>
				</label>
				<label class="block text-[10px] font-medium text-surface-500">To
				<input
					type="date"
					value={toDateStr(to)}
					onchange={handleToChange}
					class="w-full rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				/>
				</label>
			</div>

			<div class="border-t border-surface-200 pt-1.5 dark:border-surface-800">
				<p class="mb-1 text-[10px] font-medium text-surface-500">Quick presets</p>
				<div class="flex flex-wrap gap-1">
					<button type="button" onclick={() => setPreset('overdue')} class="rounded bg-surface-100 px-1.5 py-0.5 text-[10px] text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700">Overdue</button>
					<button type="button" onclick={() => setPreset('week')} class="rounded bg-surface-100 px-1.5 py-0.5 text-[10px] text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700">This week</button>
					<button type="button" onclick={() => setPreset('month')} class="rounded bg-surface-100 px-1.5 py-0.5 text-[10px] text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700">This month</button>
				</div>
			</div>

			{#if hasValue}
				<div class="mt-1.5 border-t border-surface-200 pt-1.5 dark:border-surface-800">
					<button type="button" onclick={clear} class="text-[10px] text-red-500 hover:text-red-600">Clear dates</button>
				</div>
			{/if}
		</div>
	{/if}
</div>
