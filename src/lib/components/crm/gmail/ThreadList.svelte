<script lang="ts">
	interface Props {
		threads: Array<{
			id: string;
			subject: string;
			snippet: string | null;
			lastMessageAt: number;
			messageCount: number;
			isRead: boolean;
			isStarred: boolean;
			fromEmail: string;
			fromName: string;
			linkedContacts: Array<{ id: string; name: string }>;
			linkedOpportunities: Array<{ id: string; title: string }>;
			hasBeenOpened?: boolean;
			hasActiveReminder?: boolean;
		}>;
		total: number;
		loading: boolean;
		selectedThreadId: string | null;
		onselect: (threadId: string) => void;
	}

	let { threads, total, loading, selectedThreadId, onselect }: Props = $props();

	function formatDate(ms: number): string {
		const date = new Date(ms);
		const now = new Date();
		const diff = now.getTime() - ms;

		if (diff < 24 * 60 * 60 * 1000) {
			return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
		}
		if (diff < 7 * 24 * 60 * 60 * 1000) {
			return date.toLocaleDateString('en-US', { weekday: 'short' });
		}
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function senderDisplay(thread: Props['threads'][0]): string {
		if (thread.fromName) return thread.fromName;
		if (thread.fromEmail) return thread.fromEmail.split('@')[0];
		return 'Unknown';
	}
</script>

<div class="flex h-full flex-col overflow-hidden">
	{#if loading && threads.length === 0}
		<div class="flex flex-1 items-center justify-center">
			<div class="text-sm text-surface-500">Loading emails...</div>
		</div>
	{:else if threads.length === 0}
		<div class="flex flex-1 items-center justify-center">
			<div class="text-center">
				<p class="text-sm text-surface-500">No emails found</p>
			</div>
		</div>
	{:else}
		<div class="flex-1 overflow-y-auto">
			{#each threads as thread (thread.id)}
				<button
					onclick={() => onselect(thread.id)}
					class="flex w-full items-start gap-3 border-b border-surface-200 px-4 py-3 text-left transition dark:border-surface-800
						{selectedThreadId === thread.id ? 'bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-surface-50 dark:hover:bg-surface-800/50'}
						{!thread.isRead ? 'bg-surface-50 dark:bg-surface-900' : ''}"
				>
					<!-- Unread indicator -->
					<div class="mt-2 shrink-0">
						{#if !thread.isRead}
							<div class="h-2 w-2 rounded-full bg-brand-500"></div>
						{:else}
							<div class="h-2 w-2"></div>
						{/if}
					</div>

					<div class="min-w-0 flex-1">
						<div class="flex items-center justify-between gap-2">
							<span class="truncate text-sm {!thread.isRead ? 'font-semibold text-surface-900 dark:text-surface-100' : 'text-surface-700 dark:text-surface-300'}">
								{senderDisplay(thread)}
							</span>
							<span class="shrink-0 text-[10px] text-surface-500">{formatDate(thread.lastMessageAt)}</span>
						</div>
						<div class="flex items-center gap-1">
							<p class="truncate text-sm {!thread.isRead ? 'font-medium text-surface-800 dark:text-surface-200' : 'text-surface-600 dark:text-surface-400'}">
								{thread.subject}
							</p>
							{#if thread.messageCount > 1}
								<span class="shrink-0 rounded bg-surface-200 px-1 text-[10px] text-surface-600 dark:bg-surface-800 dark:text-surface-400">
									{thread.messageCount}
								</span>
							{/if}
						</div>
						<div class="mt-0.5 flex items-center gap-1">
							<p class="min-w-0 flex-1 truncate text-xs text-surface-500">{thread.snippet || ''}</p>
							{#if thread.hasBeenOpened}
								<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 shrink-0 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
									<path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
									<path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
								</svg>
							{/if}
							{#if thread.hasActiveReminder}
								<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 shrink-0 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
								</svg>
							{/if}
						</div>

						<!-- Entity badges -->
						{#if thread.linkedContacts.length > 0 || thread.linkedOpportunities.length > 0}
							<div class="mt-1 flex flex-wrap gap-1">
								{#each thread.linkedContacts.slice(0, 2) as contact}
									<span class="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
										{contact.name}
									</span>
								{/each}
								{#each thread.linkedOpportunities.slice(0, 1) as opp}
									<span class="rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
										{opp.title}
									</span>
								{/each}
							</div>
						{/if}
					</div>
				</button>
			{/each}
		</div>
		{#if total > threads.length}
			<div class="border-t border-surface-200 px-4 py-2 text-center text-xs text-surface-500 dark:border-surface-800">
				Showing {threads.length} of {total}
			</div>
		{/if}
	{/if}
</div>
