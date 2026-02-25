<script lang="ts">
	interface Contact {
		id: string;
		firstName: string;
		lastName: string;
		email: string | null;
		companyName?: string;
		source?: string;
	}

	interface Props {
		contacts: Contact[];
		selectedIds: Set<string>;
		onchange: (selectedIds: Set<string>) => void;
	}

	let { contacts, selectedIds, onchange }: Props = $props();

	let search = $state('');
	let companyFilter = $state('');

	const companies = $derived(
		[...new Set(contacts.map((c) => c.companyName).filter(Boolean))] as string[]
	);

	const filteredContacts = $derived(
		contacts.filter((c) => {
			if (search) {
				const q = search.toLowerCase();
				const nameMatch = `${c.firstName} ${c.lastName}`.toLowerCase().includes(q);
				const emailMatch = c.email?.toLowerCase().includes(q);
				if (!nameMatch && !emailMatch) return false;
			}
			if (companyFilter && c.companyName !== companyFilter) return false;
			return true;
		})
	);

	const selectableCount = $derived(filteredContacts.filter((c) => c.email).length);

	function toggleContact(id: string) {
		const next = new Set(selectedIds);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		onchange(next);
	}

	function selectAll() {
		const next = new Set(selectedIds);
		for (const c of filteredContacts) {
			if (c.email) next.add(c.id);
		}
		onchange(next);
	}

	function deselectAll() {
		const next = new Set(selectedIds);
		for (const c of filteredContacts) {
			next.delete(c.id);
		}
		onchange(next);
	}
</script>

<div class="space-y-3">
	<div class="flex items-center gap-2">
		<input
			bind:value={search}
			placeholder="Search contacts..."
			class="flex-1 rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
		/>
		{#if companies.length > 0}
			<select
				bind:value={companyFilter}
				class="rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
			>
				<option value="">All companies</option>
				{#each companies as company}
					<option value={company}>{company}</option>
				{/each}
			</select>
		{/if}
	</div>

	<div class="flex items-center justify-between">
		<div class="flex gap-2">
			<button onclick={selectAll} class="text-xs text-brand-600 hover:text-brand-500 dark:text-brand-400">Select All ({selectableCount})</button>
			<button onclick={deselectAll} class="text-xs text-surface-500 hover:text-surface-700 dark:hover:text-surface-300">Deselect All</button>
		</div>
		<span class="text-xs font-medium text-surface-600 dark:text-surface-400">{selectedIds.size} selected</span>
	</div>

	<div class="max-h-80 overflow-y-auto rounded-lg border border-surface-200 dark:border-surface-700">
		{#each filteredContacts as contact (contact.id)}
			{@const hasEmail = !!contact.email}
			<label
				class="flex items-center gap-3 border-b border-surface-100 px-3 py-2 last:border-0 dark:border-surface-800
					{selectedIds.has(contact.id) ? 'bg-brand-50 dark:bg-brand-900/10' : ''}
					{hasEmail ? 'cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/50' : 'opacity-50'}"
			>
				<input
					type="checkbox"
					checked={selectedIds.has(contact.id)}
					disabled={!hasEmail}
					onchange={() => toggleContact(contact.id)}
					class="h-4 w-4 rounded border-surface-400"
				/>
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<span class="text-sm font-medium text-surface-900 dark:text-surface-100">
							{contact.firstName} {contact.lastName}
						</span>
						{#if !hasEmail}
							<span class="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">No email</span>
						{/if}
					</div>
					<div class="flex items-center gap-2 text-xs text-surface-500">
						{#if contact.email}
							<span>{contact.email}</span>
						{/if}
						{#if contact.companyName}
							<span>&middot; {contact.companyName}</span>
						{/if}
					</div>
				</div>
			</label>
		{/each}
		{#if filteredContacts.length === 0}
			<div class="px-3 py-4 text-center text-xs text-surface-500">No contacts found</div>
		{/if}
	</div>
</div>
