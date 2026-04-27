import { apiJson, handleCorsPreflight, rejectIfOriginNotAllowed } from '@/lib/apiSecurity';
import { getSupabaseClient } from '@/lib/supabase';
import { hashOtp, normalizePhone, verifyOtpHash } from '@/lib/generationFlow';
import { validateAdminPhone } from '@/lib/adminAuth';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  const originError = rejectIfOriginNotAllowed(request);
  if (originError) return originError;

  try {
    const { phone, otp } = await request.json();

    if (!phone || !otp) {
      return apiJson(request, { error: 'Phone number and verification code are required' }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    const supabase = getSupabaseClient();

    // 1. Check if the phone is a registered admin
    const admin = await validateAdminPhone(normalizedPhone);
    if (!admin) {
      return apiJson(request, { error: 'Access denied' }, { status: 403 });
    }

    // 2. Fetch the latest OTP for this admin
    const { data: otpRow, error: selectError } = await supabase
      .from('admin_otps')
      .select('id, otp_code_hash, otp_expires_at, is_verified, verification_attempts')
      .eq('phone', normalizedPhone)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selectError) {
      console.error('Admin OTP verify select error:', selectError);
      return apiJson(request, { error: 'Unable to verify OTP' }, { status: 500 });
    }

    if (!otpRow) {
      return apiJson(request, { error: 'No verification request found for this phone number' }, { status: 404 });
    }

    // 3. Check if already verified
    if (otpRow.is_verified) {
       return apiJson(request, { 
         success: true, 
         verified: true,
         message: 'Already verified'
       });
    }

    // 4. Check if expired
    const now = new Date();
    const expiresAt = new Date(otpRow.otp_expires_at);
    if (now > expiresAt) {
      return apiJson(request, { error: 'Verification code expired. Please request a new one.' }, { status: 400 });
    }

    // 5. Verify the code
    const providedHash = hashOtp(normalizedPhone, otp);
    const isMatch = verifyOtpHash(providedHash, otpRow.otp_code_hash || '');

    if (!isMatch) {
      // Increment verification attempts
      await supabase
        .from('admin_otps')
        .update({ verification_attempts: (otpRow.verification_attempts || 0) + 1 })
        .eq('id', otpRow.id);

      return apiJson(request, { error: 'Incorrect verification code' }, { status: 400 });
    }

    // 6. Success - mark as verified
    const { error: updateError } = await supabase
      .from('admin_otps')
      .update({
        is_verified: true,
        otp_verified_at: new Date().toISOString(),
        otp_code_hash: null, // Clear it out after success
        verification_attempts: 0
      })
      .eq('id', otpRow.id);

    if (updateError) {
      console.error('Admin OTP verify update error:', updateError);
      return apiJson(request, { error: 'Failed to complete verification' }, { status: 500 });
    }

    return apiJson(request, {
      success: true,
      verified: true,
      admin: {
        phone: admin.phone,
        name: admin.name
      }
    });

  } catch (error: any) {
    console.error('Admin OTP verify unexpected error:', error);
    return apiJson(request, { error: 'Unable to verify OTP' }, { status: 500 });
  }
}
