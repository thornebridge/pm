import type { Role } from '$lib/config/workspaces';

declare global {
	namespace App {
		interface Locals {
			user: {
				id: string;
				email: string;
				name: string;
				role: Role;
			} | null;
			sessionId: string | null;
			isApiKey?: boolean;
			themeMode: 'dark' | 'light';
		}
	}
}

export {};
