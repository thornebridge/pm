<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md';
		children: Snippet;
	}

	let { variant = 'primary', size = 'md', children, class: className = '', ...rest }: Props = $props();

	const base = 'inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-surface-50 dark:focus:ring-offset-surface-900 disabled:opacity-50';

	const variants = {
		primary: 'bg-brand-600 text-white hover:bg-brand-500',
		secondary: 'border border-surface-300 bg-surface-50 text-surface-900 hover:bg-surface-200 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:hover:bg-surface-700',
		ghost: 'text-surface-600 hover:bg-surface-200 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-100',
		danger: 'bg-red-600 text-white hover:bg-red-500'
	};

	const sizes = {
		sm: 'px-2 py-1 text-xs',
		md: 'px-3 py-1.5 text-sm'
	};
</script>

<button class="{base} {variants[variant]} {sizes[size]} {className}" {...rest}>
	{@render children()}
</button>
