/**
 * Format a phone number for display: (555) 123-4567
 */
export function formatPhoneNumber(phone: string): string {
	const digits = phone.replace(/\D/g, '');

	// US number with country code: +1 (555) 123-4567
	if (digits.length === 11 && digits.startsWith('1')) {
		return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
	}

	// US 10-digit: (555) 123-4567
	if (digits.length === 10) {
		return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
	}

	// 7-digit local: 123-4567
	if (digits.length === 7) {
		return `${digits.slice(0, 3)}-${digits.slice(3)}`;
	}

	// Return as-is for non-US formats
	return phone;
}

/**
 * Normalize a phone number to E.164 format: +15551234567
 */
export function normalizePhoneNumber(phone: string): string {
	const digits = phone.replace(/\D/g, '');

	if (digits.length === 11 && digits.startsWith('1')) {
		return `+${digits}`;
	}

	if (digits.length === 10) {
		return `+1${digits}`;
	}

	// Already has + prefix
	if (phone.startsWith('+')) {
		return phone.replace(/[^\d+]/g, '');
	}

	return `+${digits}`;
}

/**
 * Format call duration in seconds to mm:ss or hh:mm:ss
 */
export function formatCallDuration(seconds: number): string {
	const hrs = Math.floor(seconds / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	if (hrs > 0) {
		return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
	}
	return `${mins}:${String(secs).padStart(2, '0')}`;
}
