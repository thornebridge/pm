<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';
	import TemplateForm from '$lib/components/crm/gmail/TemplateForm.svelte';

	let { data } = $props();

	interface Template {
		id: string;
		name: string;
		subjectTemplate: string;
		bodyTemplate: string;
		category: string | null;
		createdAt: number;
		updatedAt: number;
	}

	let templates = $state<Template[]>(data.templates);
	let showForm = $state(false);
	let editingTemplate = $state<Template | undefined>(undefined);
	let deleting = $state<string | null>(null);

	const existingCategories = $derived(
		[...new Set(templates.map((t) => t.category).filter(Boolean))] as string[]
	);

	async function handleSave(formData: { name: string; subjectTemplate: string; bodyTemplate: string; category?: string }) {
		try {
			if (editingTemplate) {
				const updated = await api<Template>(`/api/crm/gmail/templates/${editingTemplate.id}`, {
					method: 'PATCH',
					body: JSON.stringify(formData)
				});
				templates = templates.map((t) => (t.id === editingTemplate!.id ? { ...t, ...updated } : t));
				showToast('Template updated');
			} else {
				const created = await api<Template>('/api/crm/gmail/templates', {
					method: 'POST',
					body: JSON.stringify(formData)
				});
				templates = [created, ...templates];
				showToast('Template created');
			}
			showForm = false;
			editingTemplate = undefined;
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to save template', 'error');
		}
	}

	function startEdit(template: Template) {
		editingTemplate = template;
		showForm = true;
	}

	async function deleteTemplate(id: string) {
		if (!confirm('Delete this template?')) return;
		deleting = id;
		try {
			await api(`/api/crm/gmail/templates/${id}`, { method: 'DELETE' });
			templates = templates.filter((t) => t.id !== id);
			showToast('Template deleted');
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to delete template', 'error');
		} finally {
			deleting = null;
		}
	}

	function handleCancel() {
		showForm = false;
		editingTemplate = undefined;
	}
</script>

<svelte:head>
	<title>Email Templates | CRM</title>
</svelte:head>

<div class="mx-auto max-w-4xl p-6">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Email Templates</h1>
			<p class="text-xs text-surface-500">Create reusable templates with merge fields for personalized outreach</p>
		</div>
		<div class="flex gap-2">
			<a href="/crm/email" class="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-600 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800">
				Back to Email
			</a>
			{#if !showForm}
				<button
					onclick={() => { editingTemplate = undefined; showForm = true; }}
					class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500"
				>
					New Template
				</button>
			{/if}
		</div>
	</div>

	{#if showForm}
		<div class="mb-6 rounded-lg border border-surface-200 bg-white p-4 shadow-sm dark:border-surface-700 dark:bg-surface-900">
			<h2 class="mb-4 text-sm font-semibold text-surface-900 dark:text-surface-100">
				{editingTemplate ? 'Edit Template' : 'New Template'}
			</h2>
			<TemplateForm
				template={editingTemplate}
				{existingCategories}
				onsave={handleSave}
				oncancel={handleCancel}
			/>
		</div>
	{/if}

	{#if templates.length === 0 && !showForm}
		<div class="flex flex-col items-center justify-center rounded-lg border border-dashed border-surface-300 py-12 dark:border-surface-700">
			<svg xmlns="http://www.w3.org/2000/svg" class="mb-3 h-10 w-10 text-surface-400" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd" />
			</svg>
			<p class="text-sm text-surface-600 dark:text-surface-400">No templates yet</p>
			<button
				onclick={() => { showForm = true; }}
				class="mt-3 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500"
			>
				Create your first template
			</button>
		</div>
	{:else}
		<div class="overflow-hidden rounded-lg border border-surface-200 dark:border-surface-700">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800">
					<tr>
						<th class="px-4 py-2 text-xs font-medium text-surface-600 dark:text-surface-400">Name</th>
						<th class="px-4 py-2 text-xs font-medium text-surface-600 dark:text-surface-400">Category</th>
						<th class="px-4 py-2 text-xs font-medium text-surface-600 dark:text-surface-400">Subject</th>
						<th class="px-4 py-2 text-xs font-medium text-surface-600 dark:text-surface-400 text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-200 dark:divide-surface-700">
					{#each templates as template (template.id)}
						<tr class="bg-white dark:bg-surface-900 hover:bg-surface-50 dark:hover:bg-surface-800/50">
							<td class="px-4 py-3 font-medium text-surface-900 dark:text-surface-100">{template.name}</td>
							<td class="px-4 py-3">
								{#if template.category}
									<span class="rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-600 dark:bg-surface-700 dark:text-surface-400">
										{template.category}
									</span>
								{:else}
									<span class="text-xs text-surface-400">—</span>
								{/if}
							</td>
							<td class="max-w-xs truncate px-4 py-3 text-surface-600 dark:text-surface-400">{template.subjectTemplate}</td>
							<td class="px-4 py-3 text-right">
								<button onclick={() => startEdit(template)} class="text-xs text-brand-600 hover:text-brand-500 dark:text-brand-400">Edit</button>
								<button
									onclick={() => deleteTemplate(template.id)}
									disabled={deleting === template.id}
									class="ml-3 text-xs text-red-600 hover:text-red-500 disabled:opacity-50"
								>
									{deleting === template.id ? 'Deleting...' : 'Delete'}
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
