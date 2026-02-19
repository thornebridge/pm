<script lang="ts">
	interface Props {
		type: 'task' | 'bug' | 'feature' | 'improvement';
		class?: string;
	}

	let { type, class: className = '' }: Props = $props();

	const config: Record<string, { icon: string; color: string; title: string }> = {
		task: { icon: '\u25CB', color: 'text-surface-400', title: 'Task' },
		bug: { icon: '\u25CF', color: 'text-red-500', title: 'Bug' },
		feature: { icon: '\u2605', color: 'text-amber-500', title: 'Feature' },
		improvement: { icon: '\u2191', color: 'text-blue-500', title: 'Improvement' }
	};

	const c = $derived(config[type] || config.task);
</script>

<span class="inline-flex text-xs leading-none {c.color} {className}" title={c.title}>{c.icon}</span>
