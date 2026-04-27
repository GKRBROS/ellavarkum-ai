import 'server-only';

import crypto from 'crypto';

import { PROMPTS, type GenderOption } from './prompts';

export type { GenderOption };

const OTP_SECRET = process.env.OTP_SECRET?.trim() || '';
const DEV_FALLBACK_OTP_SECRET = crypto.randomBytes(32).toString('hex');

export const IMAGE_GENERATION_TABLE = 'elavarkum_requests';

export const normalizePhone = (phone: string) => phone.trim().replace(/\s+/g, '');

export const generateOtp = () => crypto.randomInt(100_000, 1_000_000).toString();

export const hashOtp = (phone: string, otp: string) => {
	const secret = OTP_SECRET || (process.env.NODE_ENV === 'production' ? '' : DEV_FALLBACK_OTP_SECRET);
	if (!secret) {
		throw new Error('OTP_SECRET must be configured in production environments');
	}

	return crypto
		.createHmac('sha256', secret)
		.update(`${normalizePhone(phone)}:${otp}`)
		.digest('hex');
};

export const verifyOtpHash = (providedHash: string, storedHash: string) => {
	try {
		const provided = Buffer.from(providedHash, 'hex');
		const stored = Buffer.from(storedHash, 'hex');
		if (provided.length !== stored.length) return false;
		return crypto.timingSafeEqual(provided, stored);
	} catch (e) {
		return false;
	}
};

export const parseGender = (value: unknown): GenderOption => {
	return value === 'male' || value === 'female' || value === 'neutral' ? value : 'neutral';
};

export const buildGenerationPrompt = (input: {
	name: string;
	gender: GenderOption;
}) => {
	return PROMPTS[input.gender] || PROMPTS.neutral;
};

export const isOtpExpired = (expiresAt: string | null) => {
	if (!expiresAt) {
		return true;
	}
	return Date.parse(expiresAt) <= Date.now();
};

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
