<script lang="ts">
	import { api } from '$lib/utils/api.js';

	interface Company {
		id: string;
		name: string;
	}
	interface Member {
		id: string;
		name: string;
	}
	interface Stage {
		id: string;
		name: string;
	}
	interface Contact {
		id: string;
		firstName: string;
		lastName: string;
		email: string | null;
		phone: string | null;
		title: string | null;
		source: string | null;
		companyId: string | null;
		companyName: string | null;
		ownerName: string | null;
		recentCall: { disposition: string | null; dialedAt: number | null } | null;
	}

	interface Props {
		sessionId: string;
		companies: Company[];
		members: Member[];
		stages: Stage[];
		oncontactsadded: () => void;
	}

	let { sessionId, companies, members, stages, oncontactsadded }: Props = $props();

	// Filters
	let search = $state('');
	let companyFilter = $state('');
	let ownerFilter = $state('');
	let sourceFilter = $state('');
	let hasPhoneFilter = $state(true);
	let stageFilter = $state('');
	let priorityFilter = $state('');

	// Results
	let contacts = $state<Contact[]>([]);
	let loading = $state(false);
	let selected = $state<Set<string>>(new Set());
	let adding = $state(false);

	// Debounced search
	let searchTimer: ReturnType<typeof setTimeout> | null = null;

	function scheduleSearch() {
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(fetchContacts, 300);
	}

	$effect(() => {
		// Track all filter values to trigger search
		void search;
		void companyFilter;
		void ownerFilter;
		void sourceFilter;
		void hasPhoneFilter;
		void stageFilter;
		void priorityFilter;
		scheduleSearch();
	});

	async function fetchContacts() {
		loading = true;
		try {
			const params = new URLSearchParams();
			if (search) params.set('search', search);
			if (companyFilter) params.set('companyId', companyFilter);
			if (ownerFilter) params.set('ownerId', ownerFilter);
			if (sourceFilter) params.set('source', sourceFilter);
			if (hasPhoneFilter) params.set('hasPhone', 'true');
			if (stageFilter) params.set('opportunityStageId', stageFilter);
			if (priorityFilter) params.set('opportunityPriority', priorityFilter);
			params.set('excludeSessionId', sessionId);
			params.set('limit', '100');

			contacts = await api<Contact[]>(`/api/crm/dialer/contacts?${params}`);
			selected = new Set();
		} catch (err) {
			console.error('Failed to fetch contacts:', err);
		} finally {
			loading = false;
		}
	}

	function toggleSelect(id: string) {
		const next = new Set(selected);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		selected = next;
	}

	function toggleSelectAll() {
		if (selected.size === contacts.length) {
			selected = new Set();
		} else {
			selected = new Set(contacts.map((c) => c.id));
		}
	}

	async function addToQueue() {
		if (selected.size === 0 || adding) return;
		adding = true;
		try {
			await api(`/api/crm/dialer/sessions/${sessionId}/queue`, {
				method: 'POST',
				body: JSON.stringify({ contactIds: Array.from(selected) })
			});
			// Remove added contacts from results
			contacts = contacts.filter((c) => !selected.has(c.id));
			selected = new Set();
			oncontactsadded();
		} catch (err) {
			console.error('Failed to add contacts to queue:', err);
		} finally {
			adding = false;
		}
	}

	const allSelected = $derived(contacts.length > 0 && selected.size === contacts.length);

	const dispositionLabel: Record<string, string> = {
		connected_interested: 'Interested',
		connected_not_interested: 'Not Interested',
		connected_callback: 'Callback',
		connected_left_voicemail: 'Left VM',
		connected_wrong_number: 'Wrong #',
		no_answer: 'No Answer',
		busy: 'Busy',
		voicemail_left_message: 'VM Left',
		voicemail_no_message: 'VM No Msg'
	};
</script>

<div class="rounded-lg border border-surface-200 dark:border-surface-700">
	<!-- Filters -->
	<div class="border-b border-surface-200 bg-surface-50 px-4 py-3 dark:border-surface-700 dark:bg-surface-800/50">
		<div class="mb-2 flex items-center gap-2">
			<input
				bind:value={search}
				placeholder="Search name, email, phone..."
				class="flex-1 rounded-md border border-surface-300 bg-white px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-400 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
			/>
			<button
				onclick={addToQueue}
				disabled={selected.size === 0 || adding}
				class="shrink-0 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
			>
				{adding ? 'Adding...' : `Add ${selected.size > 0 ? selected.size : ''} to Queue`}
			</button>
		</div>
		<div class="flex flex-wrap gap-2">
			<select bind:value={companyFilter} class="rounded-md border border-surface-300 bg-white px-2 py-1 text-xs text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
				<option value="">All companies</option>
				{#each companies as c}
					<option value={c.id}>{c.name}</option>
				{/each}
			</select>
			<select bind:value={ownerFilter} class="rounded-md border border-surface-300 bg-white px-2 py-1 text-xs text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
				<option value="">All owners</option>
				{#each members as m}
					<option value={m.id}>{m.name}</option>
				{/each}
			</select>
			<select bind:value={sourceFilter} class="rounded-md border border-surface-300 bg-white px-2 py-1 text-xs text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
				<option value="">All sources</option>
				<option value="referral">Referral</option>
				<option value="inbound">Inbound</option>
				<option value="outbound">Outbound</option>
				<option value="website">Website</option>
				<option value="event">Event</option>
				<option value="other">Other</option>
			</select>
			<select bind:value={stageFilter} class="rounded-md border border-surface-300 bg-white px-2 py-1 text-xs text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
				<option value="">All stages</option>
				{#each stages as s}
					<option value={s.id}>{s.name}</option>
				{/each}
			</select>
			<select bind:value={priorityFilter} class="rounded-md border border-surface-300 bg-white px-2 py-1 text-xs text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
				<option value="">All priorities</option>
				<option value="hot">Hot</option>
				<option value="warm">Warm</option>
				<option value="cold">Cold</option>
			</select>
			<label class="flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-400">
				<input type="checkbox" bind:checked={hasPhoneFilter} class="rounded" />
				Has phone
			</label>
		</div>
	</div>

	<!-- Results table -->
	{#if loading}
		<div class="p-6 text-center text-sm text-surface-500">Loading contacts...</div>
	{:else if contacts.length === 0}
		<div class="p-6 text-center text-sm text-surface-500 dark:text-surface-400">
			No contacts found. Adjust your filters.
		</div>
	{:else}
		<div class="max-h-[calc(100vh-380px)] overflow-y-auto">
			<table class="w-full text-left text-sm">
				<thead class="sticky top-0 border-b border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800/80">
					<tr>
						<th class="w-8 px-3 py-2">
							<input
								type="checkbox"
								checked={allSelected}
								onchange={toggleSelectAll}
								class="rounded"
							/>
						</th>
						<th class="px-3 py-2 font-medium text-surface-600 dark:text-surface-400">Name</th>
						<th class="px-3 py-2 font-medium text-surface-600 dark:text-surface-400">Company</th>
						<th class="px-3 py-2 font-medium text-surface-600 dark:text-surface-400">Phone</th>
						<th class="px-3 py-2 font-medium text-surface-600 dark:text-surface-400">Source</th>
						<th class="px-3 py-2 font-medium text-surface-600 dark:text-surface-400">Status</th>
					</tr>
				</thead>
				<tbody>
					{#each contacts as contact (contact.id)}
						<tr
							onclick={() => toggleSelect(contact.id)}
							class="cursor-pointer border-b border-surface-100 transition-colors hover:bg-surface-50 dark:border-surface-800 dark:hover:bg-surface-800/30 {selected.has(contact.id) ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''}"
						>
							<td class="w-8 px-3 py-2">
								<input
									type="checkbox"
									checked={selected.has(contact.id)}
									onclick={(e) => e.stopPropagation()}
									onchange={() => toggleSelect(contact.id)}
									class="rounded"
								/>
							</td>
							<td class="px-3 py-2">
								<div class="font-medium text-surface-900 dark:text-surface-100">{contact.firstName} {contact.lastName}</div>
								{#if contact.title}
									<div class="text-xs text-surface-500">{contact.title}</div>
								{/if}
							</td>
							<td class="px-3 py-2 text-surface-600 dark:text-surface-400">{contact.companyName || '—'}</td>
							<td class="px-3 py-2 text-surface-600 dark:text-surface-400">{contact.phone || '—'}</td>
							<td class="px-3 py-2 text-surface-600 dark:text-surface-400">{contact.source || '—'}</td>
							<td class="px-3 py-2">
								{#if contact.recentCall}
									<span class="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" title="Called recently">
										{contact.recentCall.disposition ? dispositionLabel[contact.recentCall.disposition] || 'Called' : 'Recently Called'}
									</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="border-t border-surface-200 px-4 py-2 text-xs text-surface-500 dark:border-surface-700">
			{contacts.length} contacts found · {selected.size} selected
		</div>
	{/if}
</div>
