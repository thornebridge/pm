<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md';
		children: Snippet;
	}

	let { variant = 'primary', size = 'md', children, class: className = '', ...rest }: Props = $props();

	const base = 'inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50';

	const variants = {
		primary: 'bg-indigo-600 text-white hover:bg-indigo-500',
		secondary: 'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700',
		ghost: 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
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
