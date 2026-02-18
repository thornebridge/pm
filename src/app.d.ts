declare global {
	namespace App {
		interface Locals {
			user: {
				id: string;
				email: string;
				name: string;
				role: 'admin' | 'member';
			} | null;
			sessionId: string | null;
		}
	}
}

export {};
