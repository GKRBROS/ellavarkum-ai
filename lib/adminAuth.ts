import { db } from './supabase';
import { generateOtp, hashOtp, normalizePhone } from './generationFlow';
import { sendOtpSms } from './snsSms';

export async function validateAdminPhone(phone: string) {
  const { data } = await db.from('admin_users').select('*').eq('phone', normalizePhone(phone)).single();
  return data;
}

export async function sendOtpToAdmin(phone: string) {
  const normalizedPhone = normalizePhone(phone);
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const otpHash = hashOtp(normalizedPhone, otp);
  
  await db.from('admin_otps').upsert(
    { 
      phone: normalizedPhone, 
      otp_code_hash: otpHash, 
      otp_expires_at: expiresAt,
      is_verified: false,
      verification_attempts: 0,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'phone' }
  );

  try {
    const smsResult = await sendOtpSms(normalizedPhone, otp);
    if (!smsResult.success) throw smsResult.error;
  } catch (smsError) {
    console.error('Failed to send admin OTP SMS:', smsError);
    throw new Error('Failed to send OTP SMS');
  }

  return { success: true, expiresAt, expiresInMinutes: 10 };
}

export async function rateLimitAdminOtp(phone: string, req: any) {
  // Implement rate limiting logic (reuse user flow)
  return { allowed: true, error: null as string | null, retryAfter: null as number | null };
}

export async function rateLimitAdminRegister(req: any) {
  // Implement rate limiting logic
  return { allowed: true, error: null as string | null, retryAfter: null as number | null };
}

export async function requireAdminAuth(req: any) {
  // Implement admin authentication (JWT/session)
  return true;
}

