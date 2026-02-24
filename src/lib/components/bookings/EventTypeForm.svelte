<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';
	import { fly, fade } from 'svelte/transition';

	interface Props {
		open: boolean;
		onclose: () => void;
		eventType?: {
			id: string;
			title: string;
			slug: string;
			description?: string | null;
			durationMinutes: number;
			color: string;
			location?: string | null;
			bufferMinutes: number;
			minNoticeHours: number;
			maxDaysOut: number;
		};
	}

	let { open, onclose, eventType }: Props = $props();

	let title = $state('');
	let slug = $state('');
	let description = $state('');
	let durationMinutes = $state(30);
	let color = $state('#6366f1');
	let location = $state('');
	let bufferMinutes = $state(0);
	let minNoticeHours = $state(4);
	let maxDaysOut = $state(60);
	let saving = $state(false);
	let slugEdited = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();

	$effect(() => {
		if (open) {
			if (eventType) {
				title = eventType.title;
				slug = eventType.slug;
				description = eventType.description || '';
				durationMinutes = eventType.durationMinutes;
				color = eventType.color;
				location = eventType.location || '';
				bufferMinutes = eventType.bufferMinutes;
				minNoticeHours = eventType.minNoticeHours;
				maxDaysOut = eventType.maxDaysOut;
				slugEdited = true;
			} else {
				title = '';
				slug = '';
				description = '';
				durationMinutes = 30;
				color = '#6366f1';
				location = '';
				bufferMinutes = 0;
				minNoticeHours = 4;
				maxDaysOut = 60;
				slugEdited = false;
			}
			saving = false;
			requestAnimationFrame(() => inputEl?.focus());
		}
	});

	function slugify(text: string): string {
		return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	}

	function onTitleInput() {
		if (!slugEdited) {
			slug = slugify(title);
		}
	}

	async function save() {
		if (!title.trim() || !slug.trim()) return;
		saving = true;
		try {
			const payload = {
				title: title.trim(),
				slug: slug.trim(),
				description: description || null,
				durationMinutes,
				color,
				location: location || null,
				bufferMinutes,
				minNoticeHours,
				maxDaysOut
			};

			if (eventType) {
				await api(`/api/bookings/event-types/${eventType.id}`, {
					method: 'PATCH',
					body: JSON.stringify(payload)
				});
				showToast('Event type updated');
			} else {
				await api('/api/bookings/event-types', {
					method: 'POST',
					body: JSON.stringify(payload)
				});
				showToast('Event type created');
			}
			onclose();
			await invalidateAll();
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
		} finally {
			saving = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			save();
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 pt-[10vh] pb-10 dark:bg-black/60"
		onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
		onkeydown={handleKeydown}
		transition:fade={{ duration: 150 }}
	>
		<div
			class="w-full max-w-lg rounded-xl border border-surface-300 bg-surface-50 shadow-2xl dark:border-surface-700 dark:bg-surface-900"
			transition:fly={{ y: -10, duration: 200 }}
		>
			<div class="border-b border-surface-300 px-4 py-3 dark:border-surface-800">
				<h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">
					{eventType ? 'Edit Event Type' : 'New Event Type'}
				</h2>
			</div>
			<form onsubmit={(e) => { e.preventDefault(); save(); }} class="space-y-3 p-4">
				<div>
					<label for="et-title" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Title *</label>
					<input
						id="et-title"
						bind:this={inputEl}
						bind:value={title}
						oninput={onTitleInput}
						placeholder="e.g. 30 Minute Consultation"
						class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
					/>
				</div>
				<div>
					<label for="et-slug" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">URL Slug *</label>
					<div class="flex items-center gap-1">
						<span class="text-xs text-surface-500">/bookings/</span>
						<input
							id="et-slug"
							bind:value={slug}
							oninput={() => { slugEdited = true; }}
							placeholder="30-min-consultation"
							class="flex-1 rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
						/>
					</div>
				</div>
				<div>
					<label for="et-desc" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Description</label>
					<textarea
						id="et-desc"
						bind:value={description}
						rows={2}
						placeholder="Brief description shown on the booking page"
						class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
					></textarea>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="et-duration" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Duration (min)</label>
						<select id="et-duration" bind:value={durationMinutes} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
							<option value={15}>15 min</option>
							<option value={30}>30 min</option>
							<option value={45}>45 min</option>
							<option value={60}>60 min</option>
							<option value={90}>90 min</option>
						</select>
					</div>
					<div>
						<label for="et-color" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Color</label>
						<input
							id="et-color"
							type="color"
							bind:value={color}
							class="h-9 w-full cursor-pointer rounded-md border border-surface-300 bg-surface-50 dark:border-surface-700 dark:bg-surface-800"
						/>
					</div>
				</div>
				<div>
					<label for="et-location" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Location</label>
					<input
						id="et-location"
						bind:value={location}
						placeholder="e.g. Google Meet, Phone, Office"
						class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
					/>
				</div>
				<div class="grid grid-cols-3 gap-3">
					<div>
						<label for="et-buffer" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Buffer (min)</label>
						<input id="et-buffer" type="number" min="0" max="60" bind:value={bufferMinutes} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
					<div>
						<label for="et-notice" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Min Notice (hrs)</label>
						<input id="et-notice" type="number" min="0" max="168" bind:value={minNoticeHours} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
					<div>
						<label for="et-maxdays" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Max Days Out</label>
						<input id="et-maxdays" type="number" min="1" max="365" bind:value={maxDaysOut} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
				</div>
				<div class="flex items-center justify-between pt-1">
					<span class="text-[10px] text-surface-400">Ctrl+Enter to save</span>
					<div class="flex gap-2">
						<button type="button" onclick={onclose} class="rounded-md px-3 py-1.5 text-sm text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100">Cancel</button>
						<button type="submit" disabled={saving || !title.trim() || !slug.trim()} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50">
							{saving ? 'Saving...' : eventType ? 'Update' : 'Create'}
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}
