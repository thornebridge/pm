<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';

	let { data } = $props();

	let name = $state(data.user?.name ?? '');
	let email = $state(data.user?.email ?? '');
	let savingProfile = $state(false);

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let savingPassword = $state(false);

	// Notification preferences
	let notifLoaded = $state(false);
	let onAssigned = $state(true);
	let onStatusChange = $state(true);
	let onComment = $state(true);
	let emailEnabled = $state(true);
	let savingNotifs = $state(false);

	$effect(() => {
		api<{ onAssigned: boolean; onStatusChange: boolean; onComment: boolean; emailEnabled: boolean }>('/api/notifications/preferences').then((prefs) => {
			onAssigned = prefs.onAssigned ?? true;
			onStatusChange = prefs.onStatusChange ?? true;
			onComment = prefs.onComment ?? true;
			emailEnabled = prefs.emailEnabled ?? true;
			notifLoaded = true;
		}).catch(() => { notifLoaded = true; });
	});

	async function saveNotifs() {
		savingNotifs = true;
		try {
			await api('/api/notifications/preferences', {
				method: 'PUT',
				body: JSON.stringify({ onAssigned, onStatusChange, onComment, emailEnabled })
			});
			showToast('Notification preferences saved');
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to save preferences', 'error');
		} finally {
			savingNotifs = false;
		}
	}

	async function saveProfile() {
		if (!name.trim() || !email.trim()) return;
		savingProfile = true;
		try {
			await api('/api/users/me', {
				method: 'PATCH',
				body: JSON.stringify({ name, email })
			});
			await invalidateAll();
			showToast('Profile updated');
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to update profile', 'error');
		} finally {
			savingProfile = false;
		}
	}

	async function changePassword() {
		if (!currentPassword || !newPassword) return;
		if (newPassword !== confirmPassword) {
			showToast('Passwords do not match', 'error');
			return;
		}
		if (newPassword.length < 8) {
			showToast('Password must be at least 8 characters', 'error');
			return;
		}
		savingPassword = true;
		try {
			await api('/api/users/me', {
				method: 'PATCH',
				body: JSON.stringify({ currentPassword, newPassword })
			});
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
			showToast('Password changed');
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to change password', 'error');
		} finally {
			savingPassword = false;
		}
	}

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		goto('/login');
	}
</script>

<svelte:head>
	<title>Settings</title>
</svelte:head>

<div class="mx-auto max-w-md p-6">
	<h1 class="mb-6 text-lg font-semibold text-surface-900 dark:text-surface-100">Settings</h1>

	<!-- Profile -->
	<section class="mb-6">
		<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Profile</h2>
		<form
			onsubmit={(e) => { e.preventDefault(); saveProfile(); }}
			class="space-y-3"
		>
			<div>
				<label for="name" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Name</label>
				<input
					id="name"
					bind:value={name}
					required
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				/>
			</div>
			<div>
				<label for="email" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Email</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					required
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				/>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-xs text-surface-400 dark:text-surface-600">Role: {data.user?.role}</span>
				<button
					type="submit"
					disabled={savingProfile}
					class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
				>
					{savingProfile ? 'Saving...' : 'Save'}
				</button>
			</div>
		</form>
	</section>

	<!-- Password -->
	<section class="mb-6">
		<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Change Password</h2>
		<form
			onsubmit={(e) => { e.preventDefault(); changePassword(); }}
			class="space-y-3"
		>
			<div>
				<label for="current-password" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Current password</label>
				<input
					id="current-password"
					type="password"
					bind:value={currentPassword}
					required
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				/>
			</div>
			<div>
				<label for="new-password" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">New password</label>
				<input
					id="new-password"
					type="password"
					bind:value={newPassword}
					required
					minlength={8}
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				/>
			</div>
			<div>
				<label for="confirm-password" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Confirm new password</label>
				<input
					id="confirm-password"
					type="password"
					bind:value={confirmPassword}
					required
					minlength={8}
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				/>
			</div>
			<div class="flex justify-end">
				<button
					type="submit"
					disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
					class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
				>
					{savingPassword ? 'Changing...' : 'Change password'}
				</button>
			</div>
		</form>
	</section>

	<!-- Notifications -->
	<section class="mb-6">
		<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Notifications</h2>
		{#if notifLoaded}
			<div class="space-y-3">
				<label class="flex items-center gap-3">
					<input type="checkbox" bind:checked={onAssigned} class="rounded border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-700" />
					<span class="text-sm text-surface-700 dark:text-surface-300">Task assigned to me</span>
				</label>
				<label class="flex items-center gap-3">
					<input type="checkbox" bind:checked={onStatusChange} class="rounded border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-700" />
					<span class="text-sm text-surface-700 dark:text-surface-300">Status changes on my tasks</span>
				</label>
				<label class="flex items-center gap-3">
					<input type="checkbox" bind:checked={onComment} class="rounded border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-700" />
					<span class="text-sm text-surface-700 dark:text-surface-300">Comments &amp; mentions</span>
				</label>

				<div class="mt-2 border-t border-surface-200 pt-3 dark:border-surface-800">
					<label class="flex items-center gap-3">
						<input type="checkbox" bind:checked={emailEnabled} class="rounded border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-700" />
						<span class="text-sm text-surface-700 dark:text-surface-300">Email notifications</span>
					</label>
					<p class="ml-8 mt-1 text-xs text-surface-400 dark:text-surface-600">Receive email for enabled notification types above</p>
				</div>

				<div class="flex justify-end pt-1">
					<button
						onclick={saveNotifs}
						disabled={savingNotifs}
						class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
					>
						{savingNotifs ? 'Saving...' : 'Save'}
					</button>
				</div>
			</div>
		{:else}
			<p class="text-sm text-surface-400">Loading...</p>
		{/if}
	</section>

	<!-- Sign out -->
	<section class="border-t border-surface-300 pt-4 dark:border-surface-800">
		<button
			onclick={logout}
			class="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-600 hover:border-red-400 hover:text-red-600 dark:border-surface-700 dark:text-surface-400 dark:hover:border-red-800 dark:hover:text-red-400"
		>
			Sign out
		</button>
	</section>
</div>
