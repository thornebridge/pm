<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let tab = $state<'invites' | 'users' | 'webhooks' | 'backup' | 'audit'>('invites');

	// Invite state
	let email = $state('');
	let role = $state<'member' | 'admin'>('member');
	let creating = $state(false);

	// Webhook state
	interface Webhook {
		id: string;
		url: string;
		secret: string | null;
		events: string;
		active: boolean;
		createdAt: number;
	}
	let webhooksList = $state<Webhook[]>([]);
	let webhookUrl = $state('');
	let webhookEvents = $state<string[]>(['task.created', 'task.updated', 'task.deleted']);
	let creatingWebhook = $state(false);

	const WEBHOOK_EVENT_OPTIONS = ['task.created', 'task.updated', 'task.deleted', 'comment.created', '*'];

	// Audit log filters
	let auditUser = $state(data.auditFilters?.user ?? '');
	let auditProject = $state(data.auditFilters?.project ?? '');
	let auditAction = $state(data.auditFilters?.action ?? '');

	const ACTION_OPTIONS = ['created', 'status_changed', 'assigned', 'priority_changed', 'commented', 'edited', 'label_added', 'label_removed'];

	onMount(async () => {
		try {
			webhooksList = await api('/api/admin/webhooks');
		} catch {}
	});

	async function createInvite() {
		creating = true;
		try {
			await api('/api/admin/invites', {
				method: 'POST',
				body: JSON.stringify({ email: email || undefined, role })
			});
			email = '';
			await invalidateAll();
			showToast('Invite created');
		} catch {
			showToast('Failed to create invite', 'error');
		} finally {
			creating = false;
		}
	}

	async function deleteInvite(id: string) {
		try {
			await api('/api/admin/invites', {
				method: 'DELETE',
				body: JSON.stringify({ id })
			});
			await invalidateAll();
		} catch {
			showToast('Failed to delete invite', 'error');
		}
	}

	async function updateUserRole(userId: string, newRole: string) {
		try {
			await api(`/api/admin/users/${userId}`, {
				method: 'PATCH',
				body: JSON.stringify({ role: newRole })
			});
			await invalidateAll();
			showToast('Role updated');
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to update role', 'error');
		}
	}

	async function deleteUser(userId: string, userName: string) {
		if (!confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
		try {
			await api(`/api/admin/users/${userId}`, { method: 'DELETE' });
			await invalidateAll();
			showToast('User deleted');
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to delete user', 'error');
		}
	}

	async function createWebhook() {
		if (!webhookUrl.trim() || webhookEvents.length === 0) return;
		creatingWebhook = true;
		try {
			const wh = await api<Webhook>('/api/admin/webhooks', {
				method: 'POST',
				body: JSON.stringify({ url: webhookUrl, events: webhookEvents })
			});
			webhooksList = [...webhooksList, wh];
			webhookUrl = '';
			showToast('Webhook created');
		} catch {
			showToast('Failed to create webhook', 'error');
		} finally {
			creatingWebhook = false;
		}
	}

	async function toggleWebhook(id: string, active: boolean) {
		try {
			await api('/api/admin/webhooks', {
				method: 'PATCH',
				body: JSON.stringify({ id, active: !active })
			});
			webhooksList = webhooksList.map((w) => (w.id === id ? { ...w, active: !active } : w));
		} catch {
			showToast('Failed to update webhook', 'error');
		}
	}

	async function deleteWebhook(id: string) {
		try {
			await api('/api/admin/webhooks', {
				method: 'DELETE',
				body: JSON.stringify({ id })
			});
			webhooksList = webhooksList.filter((w) => w.id !== id);
		} catch {
			showToast('Failed to delete webhook', 'error');
		}
	}

	function toggleWebhookEvent(event: string) {
		if (webhookEvents.includes(event)) {
			webhookEvents = webhookEvents.filter((e) => e !== event);
		} else {
			webhookEvents = [...webhookEvents, event];
		}
	}

	function applyAuditFilters() {
		const params = new URLSearchParams();
		if (auditUser) params.set('auditUser', auditUser);
		if (auditProject) params.set('auditProject', auditProject);
		if (auditAction) params.set('auditAction', auditAction);
		goto(`/admin?${params.toString()}`, { invalidateAll: true });
	}

	function clearAuditFilters() {
		auditUser = '';
		auditProject = '';
		auditAction = '';
		goto('/admin', { invalidateAll: true });
	}

	function formatDate(ts: number) {
		return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function formatDateTime(ts: number) {
		return new Date(ts).toLocaleDateString('en-US', {
			month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
		});
	}

	function actionLabel(action: string): string {
		const labels: Record<string, string> = {
			created: 'created',
			status_changed: 'moved',
			assigned: 'assigned',
			priority_changed: 'reprioritized',
			commented: 'commented on',
			label_added: 'labeled',
			label_removed: 'unlabeled',
			edited: 'edited'
		};
		return labels[action] || action;
	}
</script>

<svelte:head>
	<title>Admin</title>
</svelte:head>

<div class="mx-auto max-w-2xl p-6">
	<h1 class="mb-4 text-lg font-semibold text-surface-900 dark:text-surface-100">Admin</h1>

	<!-- Tabs -->
	<div class="mb-6 flex gap-1 overflow-x-auto border-b border-surface-300 dark:border-surface-800">
		{#each [['invites', 'Invites'], ['users', `Users (${data.users.length})`], ['webhooks', 'Webhooks'], ['audit', 'Audit Log'], ['backup', 'Backup']] as [key, label]}
			<button
				onclick={() => (tab = key as typeof tab)}
				class="whitespace-nowrap px-3 py-2 text-sm font-medium transition {tab === key ? 'border-b-2 border-brand-500 text-brand-600 dark:text-brand-400' : 'text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100'}"
			>
				{label}
			</button>
		{/each}
	</div>

	{#if tab === 'invites'}
		<form
			onsubmit={(e) => { e.preventDefault(); createInvite(); }}
			class="mb-6 flex items-end gap-2"
		>
			<div class="flex-1">
				<label for="email" class="mb-1 block text-xs text-surface-600 dark:text-surface-400">Email (optional)</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					placeholder="user@example.com"
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				/>
			</div>
			<select
				bind:value={role}
				class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
			>
				<option value="member">Member</option>
				<option value="admin">Admin</option>
			</select>
			<button type="submit" disabled={creating} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50">
				Create invite
			</button>
		</form>
		<div class="space-y-2">
			{#each data.invites as invite}
				<div class="flex items-center justify-between rounded-md border border-surface-300 px-4 py-3 dark:border-surface-800">
					<div>
						<p class="font-mono text-xs text-surface-600 dark:text-surface-400">{invite.token}</p>
						<div class="mt-1 flex gap-3 text-xs text-surface-500">
							{#if invite.email}<span>{invite.email}</span>{/if}
							<span>{invite.role}</span>
							{#if invite.usedAt}
								<span class="text-green-600 dark:text-green-500">Used</span>
							{:else if invite.expiresAt < Date.now()}
								<span class="text-red-500 dark:text-red-400">Expired</span>
							{:else}
								<span>Expires {formatDate(invite.expiresAt)}</span>
							{/if}
						</div>
					</div>
					{#if !invite.usedAt}
						<button onclick={() => deleteInvite(invite.id)} class="text-xs text-surface-500 hover:text-red-500">Delete</button>
					{/if}
				</div>
			{:else}
				<p class="text-sm text-surface-500">No invites yet.</p>
			{/each}
		</div>

	{:else if tab === 'users'}
		<div class="space-y-2">
			{#each data.users as user (user.id)}
				<div class="flex items-center justify-between rounded-md border border-surface-300 px-4 py-3 dark:border-surface-800">
					<div>
						<p class="text-sm font-medium text-surface-900 dark:text-surface-100">{user.name}</p>
						<p class="text-xs text-surface-500">{user.email}</p>
						<p class="mt-0.5 text-[10px] text-surface-400 dark:text-surface-600">Joined {formatDate(user.createdAt)}</p>
					</div>
					<div class="flex items-center gap-2">
						<select
							value={user.role}
							onchange={(e) => updateUserRole(user.id, e.currentTarget.value)}
							disabled={user.id === data.user?.id}
							class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-700 disabled:opacity-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
						>
							<option value="member">Member</option>
							<option value="admin">Admin</option>
						</select>
						{#if user.id !== data.user?.id}
							<button onclick={() => deleteUser(user.id, user.name)} class="text-xs text-surface-400 hover:text-red-500">Delete</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>

	{:else if tab === 'webhooks'}
		<form
			onsubmit={(e) => { e.preventDefault(); createWebhook(); }}
			class="mb-6 space-y-3"
		>
			<div>
				<label for="wh-url" class="mb-1 block text-xs text-surface-600 dark:text-surface-400">Webhook URL</label>
				<input
					id="wh-url"
					type="url"
					bind:value={webhookUrl}
					placeholder="https://example.com/webhook"
					required
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				/>
			</div>
			<div>
				<span class="mb-1 block text-xs text-surface-600 dark:text-surface-400">Events</span>
				<div class="flex flex-wrap gap-2">
					{#each WEBHOOK_EVENT_OPTIONS as event}
						<label class="flex items-center gap-1 text-xs text-surface-700 dark:text-surface-300">
							<input
								type="checkbox"
								checked={webhookEvents.includes(event)}
								onchange={() => toggleWebhookEvent(event)}
								class="rounded border-surface-400 text-brand-600 focus:ring-brand-500 dark:border-surface-600"
							/>
							{event}
						</label>
					{/each}
				</div>
			</div>
			<button type="submit" disabled={creatingWebhook || !webhookUrl.trim()} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50">
				Create webhook
			</button>
		</form>
		<div class="space-y-2">
			{#each webhooksList as wh (wh.id)}
				<div class="rounded-md border border-surface-300 px-4 py-3 dark:border-surface-800">
					<div class="flex items-center justify-between">
						<p class="text-sm text-surface-900 dark:text-surface-100 {wh.active ? '' : 'opacity-50'}">{wh.url}</p>
						<div class="flex items-center gap-2">
							<button
								onclick={() => toggleWebhook(wh.id, wh.active)}
								class="text-xs {wh.active ? 'text-green-600 dark:text-green-500' : 'text-surface-400'}"
							>{wh.active ? 'Active' : 'Inactive'}</button>
							<button onclick={() => deleteWebhook(wh.id)} class="text-xs text-surface-400 hover:text-red-500">Delete</button>
						</div>
					</div>
					<p class="mt-1 text-[10px] text-surface-500">{JSON.parse(wh.events).join(', ')}</p>
				</div>
			{:else}
				<p class="text-sm text-surface-500">No webhooks configured.</p>
			{/each}
		</div>

	{:else if tab === 'audit'}
		<!-- Filters -->
		<div class="mb-4 flex flex-wrap items-end gap-2">
			<div>
				<label class="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-400">User</label>
				<select
					bind:value={auditUser}
					class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
				>
					<option value="">All users</option>
					{#each data.users as u}
						<option value={u.id}>{u.name}</option>
					{/each}
				</select>
			</div>
			<div>
				<label class="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-400">Project</label>
				<select
					bind:value={auditProject}
					class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
				>
					<option value="">All projects</option>
					{#each data.allProjects as p}
						<option value={p.id}>{p.name}</option>
					{/each}
				</select>
			</div>
			<div>
				<label class="mb-1 block text-[10px] font-medium uppercase tracking-wider text-surface-400">Action</label>
				<select
					bind:value={auditAction}
					class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
				>
					<option value="">All actions</option>
					{#each ACTION_OPTIONS as a}
						<option value={a}>{a}</option>
					{/each}
				</select>
			</div>
			<button
				onclick={applyAuditFilters}
				class="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-500"
			>Filter</button>
			{#if auditUser || auditProject || auditAction}
				<button
					onclick={clearAuditFilters}
					class="text-xs text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
				>Clear</button>
			{/if}
		</div>

		<!-- Audit entries -->
		<div class="space-y-1">
			{#each data.auditLog as entry (entry.id)}
				<div class="rounded-md border border-surface-300 bg-surface-50 px-3 py-2 dark:border-surface-800 dark:bg-surface-900">
					<div class="text-xs text-surface-500">
						<span class="font-medium text-surface-700 dark:text-surface-300">{entry.userName}</span>
						{actionLabel(entry.action)}
						<a href="/projects/{entry.projectSlug}/task/{entry.taskNumber}" class="font-medium text-surface-700 hover:text-brand-600 dark:text-surface-300">
							#{entry.taskNumber} {entry.taskTitle}
						</a>
					</div>
					<div class="mt-0.5 flex items-center gap-3 text-[10px] text-surface-400">
						<span>{entry.projectName}</span>
						<span>{formatDateTime(entry.createdAt)}</span>
						{#if entry.detail}
							<span class="font-mono text-surface-400/70">{entry.detail}</span>
						{/if}
					</div>
				</div>
			{:else}
				<p class="text-sm text-surface-500">No activity recorded yet.</p>
			{/each}
		</div>

		{#if data.auditLog.length >= data.auditLimit}
			<div class="mt-4 text-center">
				<button
					onclick={() => {
						const params = new URLSearchParams();
						if (auditUser) params.set('auditUser', auditUser);
						if (auditProject) params.set('auditProject', auditProject);
						if (auditAction) params.set('auditAction', auditAction);
						params.set('auditOffset', String(data.auditOffset + data.auditLimit));
						goto(`/admin?${params.toString()}`, { invalidateAll: true });
					}}
					class="text-xs text-brand-600 hover:text-brand-500"
				>Load more</button>
			</div>
		{/if}

	{:else if tab === 'backup'}
		<div class="space-y-4">
			<p class="text-sm text-surface-600 dark:text-surface-400">
				Download a full backup of the SQLite database.
			</p>
			<a
				href="/api/admin/backup"
				download
				class="inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
			>
				Download backup
			</a>
		</div>
	{/if}
</div>
