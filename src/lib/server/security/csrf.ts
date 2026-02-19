import crypto from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';

const CSRF_COOKIE = 'pm_csrf';
const CSRF_HEADER = 'x-csrf-token';

export function generateCsrfToken(cookies: Cookies): string {
	let token = cookies.get(CSRF_COOKIE);
	if (!token) {
		token = crypto.randomBytes(24).toString('hex');
		cookies.set(CSRF_COOKIE, token, {
			path: '/',
			httpOnly: false,
			secure: true,
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 // 24 hours
		});
	}
	return token;
}

export function validateCsrf(cookies: Cookies, request: Request): boolean {
	const cookie = cookies.get(CSRF_COOKIE);
	const header = request.headers.get(CSRF_HEADER);
	if (!cookie || !header) return false;
	return crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(header));
}
