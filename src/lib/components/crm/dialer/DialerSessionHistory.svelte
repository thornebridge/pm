<script lang="ts">
	interface Session {
		id: string;
		name: string;
		status: string;
		totalContacts: number;
		completedContacts: number;
		totalConnected: number;
		totalNoAnswer: number;
		totalDurationSeconds: number;
		startedAt: number | null;
		endedAt: number | null;
		createdAt: number;
	}

	interface Props {
		sessions: Session[];
		onselect: (session: Session) => void;
		oncreate: () => void;
	}

	let { sessions, onselect, oncreate }: Props = $props();

	function formatDate(ts: number): string {
		return new Date(ts).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function formatDuration(seconds: number): string {
		if (seconds === 0) return '—';
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return m > 0 ? `${m}m ${s}s` : `${s}s`;
	}

	function avgDuration(session: Session): string {
		if (session.completedContacts === 0) return '—';
		return formatDuration(Math.round(session.totalDurationSeconds / session.completedContacts));
	}

	const statusColors: Record<string, string> = {
		active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
		paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
		completed: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400'
	};
</script>

<div>
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-base font-semibold text-surface-900 dark:text-surface-100">Dial Sessions</h2>
		<button
			onclick={oncreate}
			class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-500"
		>
			New Session
		</button>
	</div>

	{#if sessions.length === 0}
		<div class="rounded-lg border border-surface-200 bg-surface-50 p-8 text-center dark:border-surface-700 dark:bg-surface-800/50">
			<svg class="mx-auto mb-3 h-10 w-10 text-surface-400" viewBox="0 0 20 20" fill="currentColor">
				<path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
			</svg>
			<p class="text-sm text-surface-500 dark:text-surface-400">No dial sessions yet. Create one to start calling.</p>
		</div>
	{:else}
		<div class="overflow-x-auto rounded-lg border border-surface-200 dark:border-surface-700">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800/50">
					<tr>
						<th class="px-4 py-2.5 font-medium text-surface-600 dark:text-surface-400">Name</th>
						<th class="px-4 py-2.5 font-medium text-surface-600 dark:text-surface-400">Status</th>
						<th class="px-4 py-2.5 font-medium text-surface-600 dark:text-surface-400 text-right">Contacts</th>
						<th class="px-4 py-2.5 font-medium text-surface-600 dark:text-surface-400 text-right">Connected</th>
						<th class="px-4 py-2.5 font-medium text-surface-600 dark:text-surface-400 text-right">No Answer</th>
						<th class="px-4 py-2.5 font-medium text-surface-600 dark:text-surface-400 text-right">Avg Duration</th>
						<th class="px-4 py-2.5 font-medium text-surface-600 dark:text-surface-400">Date</th>
					</tr>
				</thead>
				<tbody>
					{#each sessions as session (session.id)}
						<tr
							onclick={() => onselect(session)}
							class="cursor-pointer border-b border-surface-100 transition-colors hover:bg-surface-50 dark:border-surface-800 dark:hover:bg-surface-800/30"
						>
							<td class="px-4 py-2.5 font-medium text-surface-900 dark:text-surface-100">{session.name}</td>
							<td class="px-4 py-2.5">
								<span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium {statusColors[session.status] || ''}">{session.status}</span>
							</td>
							<td class="px-4 py-2.5 text-right text-surface-600 dark:text-surface-400">
								{session.completedContacts}/{session.totalContacts}
							</td>
							<td class="px-4 py-2.5 text-right text-surface-600 dark:text-surface-400">{session.totalConnected}</td>
							<td class="px-4 py-2.5 text-right text-surface-600 dark:text-surface-400">{session.totalNoAnswer}</td>
							<td class="px-4 py-2.5 text-right text-surface-600 dark:text-surface-400">{avgDuration(session)}</td>
							<td class="px-4 py-2.5 text-surface-500 dark:text-surface-500">{formatDate(session.createdAt)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
