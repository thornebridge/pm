<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		contactName: string;
		onsave: (disposition: string, notes: string, callbackAt: number | null) => void;
		onskip: () => void;
	}

	let { contactName, onsave, onskip }: Props = $props();

	let selectedDisposition = $state<string | null>(null);
	let notes = $state('');
	let callbackDate = $state('');
	let callbackTime = $state('09:00');
	let saving = $state(false);

	const dispositionGroups = [
		{
			label: 'Connected',
			items: [
				{ value: 'connected_interested', label: 'Interested', key: '1', color: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' },
				{ value: 'connected_not_interested', label: 'Not Interested', key: '2', color: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' },
				{ value: 'connected_callback', label: 'Callback', key: '3', color: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' },
				{ value: 'connected_left_voicemail', label: 'Left VM', key: '4', color: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800' },
				{ value: 'connected_wrong_number', label: 'Wrong #', key: '5', color: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' },
				{ value: 'connected_do_not_call', label: 'Do Not Call', key: '6', color: 'bg-red-200 text-red-800 border-red-400 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700' }
			]
		},
		{
			label: 'No Contact',
			items: [
				{ value: 'no_answer', label: 'No Answer', key: '7', color: 'bg-surface-100 text-surface-700 border-surface-300 dark:bg-surface-800 dark:text-surface-300 dark:border-surface-600' },
				{ value: 'busy', label: 'Busy', key: '8', color: 'bg-surface-100 text-surface-700 border-surface-300 dark:bg-surface-800 dark:text-surface-300 dark:border-surface-600' },
				{ value: 'voicemail_left_message', label: 'VM — Left Msg', key: '9', color: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800' },
				{ value: 'voicemail_no_message', label: 'VM — No Msg', key: '0', color: 'bg-surface-100 text-surface-700 border-surface-300 dark:bg-surface-800 dark:text-surface-300 dark:border-surface-600' }
			]
		}
	];

	const showCallbackPicker = $derived(selectedDisposition === 'connected_callback');

	function handleSave() {
		if (!selectedDisposition || saving) return;
		saving = true;

		let callbackAt: number | null = null;
		if (showCallbackPicker && callbackDate) {
			callbackAt = new Date(`${callbackDate}T${callbackTime}`).getTime();
		}

		onsave(selectedDisposition, notes, callbackAt);
	}

	function handleKeydown(e: KeyboardEvent) {
		// Don't capture when typing in textarea
		if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;

		const allItems = dispositionGroups.flatMap((g) => g.items);
		const match = allItems.find((item) => item.key === e.key);
		if (match) {
			selectedDisposition = match.value;
			e.preventDefault();
		}
		if (e.key === 'Enter' && selectedDisposition) {
			handleSave();
			e.preventDefault();
		}
	}

	onMount(() => {
		document.addEventListener('keydown', handleKeydown);
	});
	onDestroy(() => {
		document.removeEventListener('keydown', handleKeydown);
	});
</script>

<div class="rounded-lg border border-surface-200 bg-white p-5 dark:border-surface-700 dark:bg-surface-900">
	<h3 class="mb-1 text-sm font-semibold text-surface-900 dark:text-surface-100">Disposition</h3>
	<p class="mb-4 text-xs text-surface-500">How did the call with <strong>{contactName}</strong> go?</p>

	{#each dispositionGroups as group}
		<p class="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-surface-500">{group.label}</p>
		<div class="mb-3 flex flex-wrap gap-1.5">
			{#each group.items as item}
				<button
					onclick={() => (selectedDisposition = item.value)}
					class="rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all {selectedDisposition === item.value ? item.color + ' ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-surface-900' : 'border-surface-200 bg-surface-50 text-surface-600 hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700'}"
				>
					<span class="mr-1 inline-block rounded bg-surface-200/50 px-1 py-0.5 text-[10px] font-mono dark:bg-surface-700/50">{item.key}</span>
					{item.label}
				</button>
			{/each}
		</div>
	{/each}

	{#if showCallbackPicker}
		<div class="mb-3 flex gap-2">
			<input
				type="date"
				bind:value={callbackDate}
				class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
			/>
			<input
				type="time"
				bind:value={callbackTime}
				class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
			/>
		</div>
	{/if}

	<textarea
		bind:value={notes}
		placeholder="Notes (optional)..."
		rows="2"
		class="mb-3 w-full resize-none rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-400 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
	></textarea>

	<div class="flex items-center gap-2">
		<button
			onclick={handleSave}
			disabled={!selectedDisposition || saving}
			class="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
		>
			{saving ? 'Saving...' : 'Save & Next'}
		</button>
		<button
			onclick={onskip}
			class="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-600 transition hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800"
		>
			Skip
		</button>
		<span class="ml-auto text-[10px] text-surface-400">Press 1-9/0 to select, Enter to save</span>
	</div>
</div>
