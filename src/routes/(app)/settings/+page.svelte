<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';
	import { setActiveTheme } from '$lib/stores/theme.js';
	import Modal from '$lib/components/ui/Modal.svelte';

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
	let reminderDueSoon = $state(true);
	let reminderDueToday = $state(true);
	let reminderOverdue = $state(true);
	let dueDateEmailMode = $state('off');
	let digestDay = $state(1);
	let digestHour = $state(8);
	let savingNotifs = $state(false);

	// Theme state
	let themes = $state<Array<{ id: string; name: string; description: string | null; variables: Record<string, string>; builtin: boolean }>>([]);
	let themesLoaded = $state(false);
	let importSource = $state('');
	let importing = $state(false);
	let importError = $state('');
	let showImport = $state(false);
	let showFormatHelp = $state(false);

	// Logo state (admin only)
	let logoUploading = $state(false);
	let hasLogo = $state(data.hasLogo ?? false);

	async function uploadLogo(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (file.size > 512 * 1024) {
			showToast('Logo must be under 512KB', 'error');
			return;
		}

		logoUploading = true;
		try {
			const formData = new FormData();
			formData.append('logo', file);
			const csrfMatch = document.cookie.match(/(?:^|;\s*)pm_csrf=([^;]*)/);
			await fetch('/api/admin/logo', {
				method: 'POST',
				body: formData,
				headers: csrfMatch ? { 'x-csrf-token': csrfMatch[1] } : {}
			}).then(async (res) => {
				if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
			});
			hasLogo = true;
			await invalidateAll();
			showToast('Logo uploaded');
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to upload logo', 'error');
		} finally {
			logoUploading = false;
			input.value = '';
		}
	}

	async function removeLogo() {
		try {
			await api('/api/admin/logo', { method: 'DELETE' });
			hasLogo = false;
			await invalidateAll();
			showToast('Logo removed');
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to remove logo', 'error');
		}
	}

	// Determine active theme ID from current data
	const activeThemeId = $derived.by(() => {
		// If no themeVariables override, it's Forest (default)
		if (!data.themeVariables) return 'forest';
		// Match against loaded themes
		const match = themes.find((t) => {
			const vars = t.variables;
			return vars && data.themeVariables && vars['--color-brand-500'] === data.themeVariables['--color-brand-500'];
		});
		return match?.id ?? 'forest';
	});

	const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	$effect(() => {
		api<{
			onAssigned: boolean; onStatusChange: boolean; onComment: boolean; emailEnabled: boolean;
			reminderDueSoon: boolean; reminderDueToday: boolean; reminderOverdue: boolean;
			dueDateEmailMode: string; digestDay: number; digestHour: number;
		}>('/api/notifications/preferences').then((prefs) => {
			onAssigned = prefs.onAssigned ?? true;
			onStatusChange = prefs.onStatusChange ?? true;
			onComment = prefs.onComment ?? true;
			emailEnabled = prefs.emailEnabled ?? true;
			reminderDueSoon = prefs.reminderDueSoon ?? true;
			reminderDueToday = prefs.reminderDueToday ?? true;
			reminderOverdue = prefs.reminderOverdue ?? true;
			dueDateEmailMode = prefs.dueDateEmailMode ?? 'off';
			digestDay = prefs.digestDay ?? 1;
			digestHour = prefs.digestHour ?? 8;
			notifLoaded = true;
		}).catch(() => { notifLoaded = true; });
	});

	// Load themes
	$effect(() => {
		api<Array<{ id: string; name: string; description: string | null; variables: Record<string, string>; builtin: boolean }>>('/api/themes')
			.then((t) => { themes = t; themesLoaded = true; })
			.catch(() => { themesLoaded = true; });
	});

	async function saveNotifs() {
		savingNotifs = true;
		try {
			await api('/api/notifications/preferences', {
				method: 'PUT',
				body: JSON.stringify({
					onAssigned, onStatusChange, onComment, emailEnabled,
					reminderDueSoon, reminderDueToday, reminderOverdue,
					dueDateEmailMode, digestDay, digestHour
				})
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

	async function activateTheme(themeId: string) {
		try {
			await setActiveTheme(themeId);
			showToast('Theme applied');
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to apply theme', 'error');
		}
	}

	async function importTheme() {
		if (!importSource.trim()) return;
		importing = true;
		importError = '';
		try {
			const result = await api<{ id: string; name: string }>('/api/themes', {
				method: 'POST',
				body: JSON.stringify({ source: importSource })
			});
			showToast(`Theme "${result.name}" imported`);
			importSource = '';
			// Reload themes and activate the new one
			const updated = await api<typeof themes>('/api/themes');
			themes = updated;
			await setActiveTheme(result.id);
		} catch (err) {
			if (err instanceof Error) {
				importError = err.message;
			}
			showToast('Failed to import theme', 'error');
		} finally {
			importing = false;
		}
	}

	async function exportTheme(themeId: string) {
		try {
			const result = await api<{ source: string }>(`/api/themes/${themeId}`);
			await navigator.clipboard.writeText(result.source);
			showToast('Theme copied to clipboard');
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to export theme', 'error');
		}
	}

	async function deleteTheme(themeId: string) {
		try {
			await api(`/api/themes/${themeId}`, { method: 'DELETE' });
			themes = themes.filter((t) => t.id !== themeId);
			await invalidateAll();
			showToast('Theme deleted');
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to delete theme', 'error');
		}
	}

	function getSwatches(variables: Record<string, string>): string[] {
		return [
			variables['--color-brand-300'] || '#999',
			variables['--color-brand-400'] || '#888',
			variables['--color-brand-500'] || '#777',
			variables['--color-brand-600'] || '#666',
			variables['--color-brand-700'] || '#555',
			variables['--color-brand-800'] || '#444'
		];
	}

	function getSurfaceSwatches(variables: Record<string, string>): string[] {
		return [
			variables['--color-surface-100'] || '#eee',
			variables['--color-surface-500'] || '#888',
			variables['--color-surface-900'] || '#111'
		];
	}

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		goto('/login');
	}
</script>

<svelte:head>
	<title>Settings</title>
</svelte:head>

<div class="mx-auto max-w-2xl p-6">
	<h1 class="mb-6 text-lg font-semibold text-surface-900 dark:text-surface-100">Settings</h1>

	<!-- Appearance -->
	<section class="mb-6">
		<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Appearance</h2>
		{#if themesLoaded}
			<div class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
				{#each themes as theme (theme.id)}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						onclick={() => activateTheme(theme.id)}
						onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activateTheme(theme.id); } }}
						role="button"
						tabindex="0"
						class="group relative cursor-pointer overflow-hidden rounded-lg border transition-all {activeThemeId === theme.id ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-surface-300 hover:border-surface-400 dark:border-surface-700 dark:hover:border-surface-600'}"
					>
						<!-- Brand color swatch bar -->
						<div class="flex h-8">
							{#each getSwatches(theme.variables) as color}
								<div class="flex-1" style="background-color: {color}"></div>
							{/each}
						</div>
						<!-- Surface color strip -->
						<div class="flex h-1.5">
							{#each getSurfaceSwatches(theme.variables) as color}
								<div class="flex-1" style="background-color: {color}"></div>
							{/each}
						</div>
						<!-- Name + actions row -->
						<div class="flex items-center justify-between px-2 py-1.5">
							<span class="truncate text-xs font-medium text-surface-700 dark:text-surface-300">{theme.name}</span>
							<div class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
								<button
									onclick={(e) => { e.stopPropagation(); exportTheme(theme.id); }}
									class="rounded p-0.5 text-surface-400 hover:bg-surface-200 hover:text-surface-600 dark:hover:bg-surface-700 dark:hover:text-surface-300"
									title="Copy to clipboard"
								>
									<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
									</svg>
								</button>
								{#if !theme.builtin}
									<a
										href="/settings/theme-builder?edit={theme.id}"
										onclick={(e) => e.stopPropagation()}
										class="rounded p-0.5 text-surface-400 hover:bg-surface-200 hover:text-surface-600 dark:hover:bg-surface-700 dark:hover:text-surface-300"
										title="Edit theme"
									>
										<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
										</svg>
									</a>
									<button
										onclick={(e) => { e.stopPropagation(); deleteTheme(theme.id); }}
										class="rounded p-0.5 text-surface-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
										title="Delete theme"
									>
										<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
										</svg>
									</button>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Build Custom Theme -->
			<div class="mt-4">
				<a
					href="/settings/theme-builder"
					class="inline-flex items-center gap-1.5 rounded-md border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-500 hover:bg-brand-600/10"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
					</svg>
					Build Custom Theme
				</a>
			</div>

			<!-- Import toggle + format help -->
			<div class="mt-4 flex items-center gap-2">
				<button
					onclick={() => (showImport = !showImport)}
					class="flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-300"
				>
					<svg class="h-3.5 w-3.5 transition-transform {showImport ? 'rotate-90' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
					</svg>
					Import Theme
				</button>
				<button
					onclick={() => (showFormatHelp = true)}
					class="flex h-4 w-4 items-center justify-center rounded-full border border-surface-600 text-[10px] text-surface-500 hover:border-surface-400 hover:text-surface-300"
					title="Theme format help"
				>?</button>
			</div>

			{#if showImport}
				<div class="mt-2">
					<textarea
						id="import-theme"
						bind:value={importSource}
						placeholder="Paste .pmtheme markdown here..."
						rows={4}
						class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 font-mono text-xs text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
					></textarea>
					{#if importError}
						<p class="mt-1 text-xs text-red-500">{importError}</p>
					{/if}
					<div class="mt-2 flex justify-end">
						<button
							onclick={importTheme}
							disabled={importing || !importSource.trim()}
							class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
						>
							{importing ? 'Importing...' : 'Import'}
						</button>
					</div>
				</div>
			{/if}
		{:else}
			<p class="text-sm text-surface-400">Loading themes...</p>
		{/if}
	</section>

	<!-- Logo (admin only) -->
	{#if data.user?.role === 'admin'}
		<section class="mb-6">
			<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Logo</h2>
			<div class="flex items-center gap-4">
				{#if hasLogo}
					<img src="/api/admin/logo" alt="Org logo" class="h-10 w-10 rounded object-contain border border-surface-300 dark:border-surface-700" />
				{:else}
					<div class="flex h-10 w-10 items-center justify-center rounded border border-dashed border-surface-400 text-xs text-surface-400 dark:border-surface-600">
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
						</svg>
					</div>
				{/if}
				<div class="flex items-center gap-2">
					<label class="cursor-pointer rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-700 hover:border-surface-400 dark:border-surface-700 dark:text-surface-300 dark:hover:border-surface-600">
						{logoUploading ? 'Uploading...' : 'Upload'}
						<input type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" class="hidden" onchange={uploadLogo} disabled={logoUploading} />
					</label>
					{#if hasLogo}
						<button
							onclick={removeLogo}
							class="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-red-600 hover:border-red-400 dark:border-surface-700 dark:text-red-400 dark:hover:border-red-800"
						>Remove</button>
					{/if}
				</div>
			</div>
			<p class="mt-1.5 text-xs text-surface-400 dark:text-surface-600">SVG, PNG, JPEG, or WebP. Max 512KB. Shown in sidebar.</p>
		</section>
	{/if}

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
				<p class="text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-500">Activity Notifications</p>
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

				<div class="border-t border-surface-200 pt-3 dark:border-surface-800">
					<p class="mb-2 text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-500">Due Date Reminders</p>
					<div class="space-y-2">
						<label class="flex items-center gap-3">
							<input type="checkbox" bind:checked={reminderDueSoon} class="rounded border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-700" />
							<span class="text-sm text-surface-700 dark:text-surface-300">1 day before due date</span>
						</label>
						<label class="flex items-center gap-3">
							<input type="checkbox" bind:checked={reminderDueToday} class="rounded border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-700" />
							<span class="text-sm text-surface-700 dark:text-surface-300">Day of due date</span>
						</label>
						<label class="flex items-center gap-3">
							<input type="checkbox" bind:checked={reminderOverdue} class="rounded border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-700" />
							<span class="text-sm text-surface-700 dark:text-surface-300">Overdue tasks</span>
						</label>
					</div>
					<p class="mt-2 text-xs text-surface-400 dark:text-surface-600">In-app and push notifications for selected reminder types</p>
				</div>

				<div class="border-t border-surface-200 pt-3 dark:border-surface-800">
					<p class="mb-2 text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-500">Due Date Emails</p>
					<div class="space-y-3">
						<div>
							<label for="email-mode" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Mode</label>
							<select
								id="email-mode"
								bind:value={dueDateEmailMode}
								class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
							>
								<option value="off">Off</option>
								<option value="each">Individual</option>
								<option value="daily">Daily Digest</option>
								<option value="weekly">Weekly Digest</option>
							</select>
						</div>

						{#if dueDateEmailMode === 'weekly'}
							<div>
								<label for="digest-day" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Send on</label>
								<select
									id="digest-day"
									bind:value={digestDay}
									class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
								>
									{#each dayNames as day, i}
										<option value={i}>{day}</option>
									{/each}
								</select>
							</div>
						{/if}

						{#if dueDateEmailMode === 'daily' || dueDateEmailMode === 'weekly'}
							<div>
								<label for="digest-hour" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Send at (UTC)</label>
								<select
									id="digest-hour"
									bind:value={digestHour}
									class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
								>
									{#each Array.from({ length: 24 }, (_, i) => i) as hour}
										<option value={hour}>{String(hour).padStart(2, '0')}:00 UTC</option>
									{/each}
								</select>
							</div>
							<p class="text-xs text-surface-400 dark:text-surface-600">A summary of your upcoming and overdue tasks</p>
						{/if}
					</div>
				</div>

				<div class="border-t border-surface-200 pt-3 dark:border-surface-800">
					<p class="mb-2 text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-500">Email</p>
					<label class="flex items-center gap-3">
						<input type="checkbox" bind:checked={emailEnabled} class="rounded border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-700" />
						<span class="text-sm text-surface-700 dark:text-surface-300">Email notifications</span>
					</label>
					<p class="ml-8 mt-1 text-xs text-surface-400 dark:text-surface-600">Master switch — turns off all email when disabled</p>
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

<!-- Format help modal -->
<Modal open={showFormatHelp} onclose={() => (showFormatHelp = false)} title=".pmtheme Format">
	<div class="space-y-3 text-sm text-surface-700 dark:text-surface-300">
		<p>A <code class="rounded bg-surface-200 px-1 py-0.5 text-xs dark:bg-surface-800">.pmtheme</code> file is a Markdown document with a specific structure:</p>

		<div>
			<p class="mb-1 font-semibold text-surface-900 dark:text-surface-100">Structure</p>
			<ul class="list-inside list-disc space-y-0.5 text-xs">
				<li><code class="rounded bg-surface-200 px-1 dark:bg-surface-800"># Theme Name</code> — H1 heading becomes the theme name</li>
				<li>Description text follows the heading</li>
				<li><code class="rounded bg-surface-200 px-1 dark:bg-surface-800">## Colors</code> — section with a <code class="rounded bg-surface-200 px-1 dark:bg-surface-800">pmtheme</code> code block</li>
				<li><code class="rounded bg-surface-200 px-1 dark:bg-surface-800">## Options</code> — optional section for font and mode</li>
			</ul>
		</div>

		<div>
			<p class="mb-1 font-semibold text-surface-900 dark:text-surface-100">Required Color Keys (20)</p>
			<div class="grid grid-cols-2 gap-x-4 text-xs">
				<div>
					<p class="font-medium text-surface-500">Brand (10)</p>
					<p class="font-mono text-[10px]">brand-50 through brand-900</p>
				</div>
				<div>
					<p class="font-medium text-surface-500">Surface (10)</p>
					<p class="font-mono text-[10px]">surface-50 through surface-900</p>
				</div>
			</div>
		</div>

		<div>
			<p class="mb-1 font-semibold text-surface-900 dark:text-surface-100">Optional Fields</p>
			<ul class="list-inside list-disc space-y-0.5 text-xs">
				<li><code class="rounded bg-surface-200 px-1 dark:bg-surface-800">font</code> — CSS font-family value</li>
				<li><code class="rounded bg-surface-200 px-1 dark:bg-surface-800">mode</code> — <code class="rounded bg-surface-200 px-1 dark:bg-surface-800">dark</code> or <code class="rounded bg-surface-200 px-1 dark:bg-surface-800">light</code></li>
				<li><code class="rounded bg-surface-200 px-1 dark:bg-surface-800">texture</code> — <code class="rounded bg-surface-200 px-1 dark:bg-surface-800">none</code>, <code class="rounded bg-surface-200 px-1 dark:bg-surface-800">grid</code>, or <code class="rounded bg-surface-200 px-1 dark:bg-surface-800">dots</code></li>
				<li><code class="rounded bg-surface-200 px-1 dark:bg-surface-800">card-style</code> — <code class="rounded bg-surface-200 px-1 dark:bg-surface-800">rounded</code> or <code class="rounded bg-surface-200 px-1 dark:bg-surface-800">square</code></li>
				<li><code class="rounded bg-surface-200 px-1 dark:bg-surface-800">depth-style</code> — <code class="rounded bg-surface-200 px-1 dark:bg-surface-800">shadow</code>, <code class="rounded bg-surface-200 px-1 dark:bg-surface-800">flat</code>, or <code class="rounded bg-surface-200 px-1 dark:bg-surface-800">glass</code></li>
				<li><code class="rounded bg-surface-200 px-1 dark:bg-surface-800">gradient</code> — <code class="rounded bg-surface-200 px-1 dark:bg-surface-800">none</code>, <code class="rounded bg-surface-200 px-1 dark:bg-surface-800">subtle</code>, or <code class="rounded bg-surface-200 px-1 dark:bg-surface-800">vivid</code></li>
			</ul>
		</div>

		<div>
			<p class="mb-1 font-semibold text-surface-900 dark:text-surface-100">Minimal Example</p>
			<pre class="overflow-x-auto rounded-md bg-surface-200 p-2 text-[10px] leading-relaxed dark:bg-surface-800"><code># My Theme

A custom theme.

## Colors

```pmtheme
brand-50: #eef2ff
brand-100: #e0e7ff
...
surface-900: #171717
```

## Options

```pmtheme
mode: dark
```</code></pre>
		</div>
	</div>
</Modal>
