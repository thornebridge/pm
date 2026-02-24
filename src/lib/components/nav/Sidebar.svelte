<script lang="ts">
	import { browser } from '$app/environment';
	import { untrack } from 'svelte';
	import FolderTree from './FolderTree.svelte';
	import NotificationBell from '$lib/components/notifications/NotificationBell.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { page } from '$app/state';
	interface Props {
		user: { name: string; role: string } | null;
		folders: Array<{ id: string; name: string; slug: string; parentId: string | null; color: string | null; position: number }>;
		projects: Array<{ id: string; name: string; slug: string; color: string; folderId: string | null }>;
		open: boolean;
		onclose: () => void;
		collapsed?: boolean;
		ontogglecollapse?: () => void;
		platformName?: string;
		telnyxEnabled?: boolean;
		hasLogo?: boolean;
	}

	let { user, folders, projects, open, onclose, collapsed = false, ontogglecollapse, platformName = 'PM', telnyxEnabled = false, hasLogo = false }: Props = $props();

	type NavLink = { href: string; label: string; icon: string };
	type NavSection = { label?: string; items: NavLink[] };

	const operationsSections: NavSection[] = [
		{
			items: [
				{ href: '/dashboard', label: 'Dashboard', icon: 'M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z' },
				{ href: '/my-tasks', label: 'My Tasks', icon: 'M9 2a1 1 0 000 2h2a1 1 0 100-2H9z M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' },
				{ href: '/projects', label: 'Projects', icon: 'M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z' },
				{ href: '/bookings', label: 'Bookings', icon: 'M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z' },
				{ href: '/activity', label: 'Activity', icon: 'M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z' }
			]
		}
	];

	const financialsSections: NavSection[] = [
		{
			items: [
				{ href: '/financials/dashboard', label: 'Dashboard', icon: 'M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z' }
			]
		},
		{
			label: 'Ledger',
			items: [
				{ href: '/financials/transactions', label: 'Transactions', icon: 'M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zm14 4H2v6a2 2 0 002 2h12a2 2 0 002-2V8zm-6 3a1 1 0 100 2h3a1 1 0 100-2h-3z' },
				{ href: '/financials/journal-entries', label: 'Journal', icon: 'M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z' },
				{ href: '/financials/accounts', label: 'Accounts', icon: 'M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z' },
				{ href: '/financials/recurring', label: 'Recurring', icon: 'M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z' }
			]
		},
		{
			label: 'Planning',
			items: [
				{ href: '/financials/budgets', label: 'Budgets', icon: 'M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z' },
				{ href: '/financials/reports', label: 'Reports', icon: 'M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3-2a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm-3 3a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1z' },
				{ href: '/financials/reconciliation', label: 'Reconcile', icon: 'M9 2a1 1 0 000 2h2a1 1 0 100-2H9z M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' }
			]
		}
	];

	const baseCrmSections: NavSection[] = [
		{
			items: [
				{ href: '/crm/dashboard', label: 'Dashboard', icon: 'M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z' },
				{ href: '/crm/pipeline', label: 'Pipeline', icon: 'M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z' }
			]
		},
		{
			label: 'Customers',
			items: [
				{ href: '/crm/companies', label: 'Companies', icon: 'M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z' },
				{ href: '/crm/contacts', label: 'Contacts', icon: 'M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z' },
				{ href: '/crm/leads', label: 'Leads', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' }
			]
		},
		{
			label: 'Deals',
			items: [
				{ href: '/crm/opportunities', label: 'Opportunities', icon: 'M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z' },
				{ href: '/crm/proposals', label: 'Proposals', icon: 'M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zm14 4H2v6a2 2 0 002 2h12a2 2 0 002-2V8zm-6 3a1 1 0 100 2h3a1 1 0 100-2h-3z' },
				{ href: '/crm/products', label: 'Products', icon: 'M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.884l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.116l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z' }
			]
		},
		{
			label: 'Outreach',
			items: [
				{ href: '/crm/email', label: 'Email', icon: 'M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884zM18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z' },
				{ href: '/crm/activities', label: 'Activities', icon: 'M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z' },
				{ href: '/crm/automations', label: 'Automations', icon: 'M13 10V3L4 14h7v7l9-11h-7z' }
			]
		},
		{
			items: [
				{ href: '/crm/reporting', label: 'Reporting', icon: 'M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z' },
				{ href: '/crm/forecasting', label: 'Forecasting', icon: 'M2 12l5-5 4 4 7-7 M14 4h6v6' },
				{ href: '/crm/tasks', label: 'Tasks', icon: 'M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z' },
				{ href: '/crm/settings', label: 'Settings', icon: 'M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z' }
			]
		}
	];

	const dialerLink: NavLink = { href: '/crm/dialer', label: 'Dialer', icon: 'M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z' };

	const crmSections = $derived.by((): NavSection[] => {
		if (!telnyxEnabled) return baseCrmSections;
		return baseCrmSections.map(section =>
			section.label === 'Outreach'
				? { ...section, items: [...section.items.slice(0, 2), dialerLink, ...section.items.slice(2)] }
				: section
		);
	});

	const adminSections: NavSection[] = [
		{
			items: [
				{ href: '/admin', label: 'Admin', icon: 'M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z' }
			]
		}
	];

	type SidebarMode = 'ops' | 'sales' | 'finance' | 'admin';

	const modes: Array<{ key: SidebarMode; label: string; icon: string }> = [
		{ key: 'ops', label: 'Ops', icon: 'M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z' },
		{ key: 'sales', label: 'Sales', icon: 'M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z' },
		{ key: 'finance', label: 'Finance', icon: 'M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z' }
	];

	const adminMode: { key: SidebarMode; label: string; icon: string } = { key: 'admin', label: 'Admin', icon: 'M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z' };

	const hasWorkspace = $derived(folders.length > 0 || projects.length > 0);
	const isAdmin = $derived(user?.role === 'admin');

	const visibleModes = $derived(isAdmin ? [...modes, adminMode] : modes);

	// Mode state with URL auto-detection
	let activeMode = $state<SidebarMode>(
		browser ? (localStorage.getItem('pm-sidebar-mode') as SidebarMode) || 'ops' : 'ops'
	);

	const detectedMode = $derived.by((): SidebarMode => {
		const path = page.url.pathname;
		if (path.startsWith('/crm')) return 'sales';
		if (path.startsWith('/financials')) return 'finance';
		if (path.startsWith('/admin')) return 'admin';
		return 'ops';
	});

	$effect(() => {
		const mode = detectedMode;
		untrack(() => {
			activeMode = mode;
			if (browser) localStorage.setItem('pm-sidebar-mode', mode);
		});
	});

	function setMode(mode: SidebarMode) {
		activeMode = mode;
		if (browser) localStorage.setItem('pm-sidebar-mode', mode);
	}

	const activeSections = $derived.by((): NavSection[] => {
		switch (activeMode) {
			case 'ops': return operationsSections;
			case 'sales': return crmSections;
			case 'finance': return financialsSections;
			case 'admin': return adminSections;
			default: return operationsSections;
		}
	});

	function isActive(href: string): boolean {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}
</script>

<aside class="dark fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col border-r border-surface-800 bg-surface-900 transition-all md:static md:translate-x-0 {open ? 'translate-x-0 w-60' : '-translate-x-full w-60'} {collapsed ? 'md:w-14' : 'md:w-60'}">
	<div class="flex h-12 items-center justify-between px-4">
		{#if !collapsed}
			<div class="flex items-center gap-2">
				{#if hasLogo}
					<img src="/api/admin/logo" alt="" class="h-6 w-6 rounded object-contain" />
				{:else}
					<span class="inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold text-white" style="background-color: var(--color-brand-500)">{platformName.charAt(0)}</span>
				{/if}
				<span class="text-sm font-semibold text-surface-100">{platformName}</span>
			</div>
		{:else if hasLogo}
			<img src="/api/admin/logo" alt="" class="mx-auto h-6 w-6 rounded object-contain" />
		{:else}
			<span class="mx-auto inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold text-white" style="background-color: var(--color-brand-500)">{platformName.charAt(0)}</span>
		{/if}
		<button onclick={onclose} class="text-surface-500 hover:text-surface-300 md:hidden">&times;</button>
		{#if ontogglecollapse}
			<button
				onclick={ontogglecollapse}
				class="hidden rounded-md p-1 text-surface-500 hover:bg-surface-800 hover:text-surface-300 md:block {collapsed ? 'mx-auto' : ''}"
				title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform {collapsed ? 'rotate-180' : ''}" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
				</svg>
			</button>
		{/if}
	</div>

	<!-- Mode selector -->
	<div class="border-b border-surface-800 px-2 pb-2">
		{#if collapsed}
			<div class="flex flex-col items-center gap-0.5">
				{#each visibleModes as mode (mode.key)}
					<button
						onclick={() => setMode(mode.key)}
						title={mode.label}
						class="rounded-md p-1.5 transition {activeMode === mode.key ? 'bg-surface-700 text-surface-100' : 'text-surface-500 hover:bg-surface-800 hover:text-surface-300'}"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d={mode.icon} clip-rule="evenodd" />
						</svg>
					</button>
				{/each}
			</div>
		{:else}
			<div class="flex gap-1">
				{#each visibleModes as mode (mode.key)}
					<button
						onclick={() => setMode(mode.key)}
						class="rounded-md px-2.5 py-1 text-xs font-medium transition {activeMode === mode.key ? 'bg-surface-700 text-surface-100' : 'text-surface-500 hover:bg-surface-800/50 hover:text-surface-300'}"
					>
						{mode.label}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<nav class="flex-1 overflow-y-auto px-2 py-2">
		{#each activeSections as section, i}
			{#if section.label && !collapsed}
				<div class="mt-3 {i > 0 ? 'pt-2' : ''}">
					<span class="px-2 text-[10px] font-semibold uppercase tracking-wider text-surface-500">{section.label}</span>
				</div>
			{:else if section.label && collapsed}
				<div class="my-1.5 mx-2 border-t border-surface-800"></div>
			{/if}
			<div class="space-y-0.5 {section.label && !collapsed ? 'mt-1' : ''}">
				{#each section.items as link (link.href)}
					<a
						href={link.href}
						onclick={onclose}
						class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition {isActive(link.href) ? 'bg-surface-800 text-surface-100' : 'text-surface-300 hover:bg-surface-800 hover:text-surface-100'} {collapsed ? 'justify-center' : ''}"
						title={collapsed ? link.label : undefined}
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d={link.icon} clip-rule="evenodd" />
						</svg>
						{#if !collapsed}<span>{link.label}</span>{/if}
					</a>
				{/each}
			</div>
		{/each}

		<!-- Workspace (always visible) -->
		{#if hasWorkspace}
			{#if !collapsed}
				<div class="pt-3">
					<span class="px-2 text-[10px] font-semibold uppercase tracking-wider text-surface-500">Workspace</span>
					<div class="mt-1">
						<FolderTree {folders} {projects} onnavigate={onclose} />
					</div>
				</div>
			{:else}
				{#if projects.length > 0}
					<div class="mt-3 flex flex-col items-center gap-1.5">
						{#each projects as project (project.id)}
							<a
								href="/projects/{project.slug}/home"
								title={project.name}
								class="h-2.5 w-2.5 rounded-full transition-transform hover:scale-150"
								style="background-color: {project.color}"
							></a>
						{/each}
					</div>
				{/if}
			{/if}
		{/if}
	</nav>

	<div class="border-t border-surface-800 px-4 py-3">
		<div class="flex items-center justify-between">
			<a href="/settings" onclick={onclose} class="flex items-center gap-2 text-sm text-surface-400 hover:text-surface-100">
				{#if user}
					<Avatar name={user.name} size="sm" />
				{/if}
				{#if !collapsed}
					{user?.name}
				{/if}
			</a>
			{#if !collapsed}
				<NotificationBell />
			{/if}
		</div>
	</div>
</aside>
