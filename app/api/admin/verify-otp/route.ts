import { NextRequest } from 'next/server';
import { apiJson, handleCorsPreflight, rejectIfOriginNotAllowed } from '@/lib/apiSecurity';
import { validateAdminEmail } from '@/lib/adminAuth';
import { getSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  const originError = rejectIfOriginNotAllowed(request);
  if (originError) return originError;

  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return apiJson(request, { error: 'Email and verification code are required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 1. Check if the email is a registered admin
    const admin = await validateAdminEmail(email);
    if (!admin) {
      return apiJson(request, { error: 'Access denied' }, { status: 403 });
    }

    // 2. Fetch the latest OTP for this admin
    // We already have a unique constraint on email, but order by updated_at just in case 
    // to always get the most recent one if duplicates exist before cleanup.
    const { data: otpRow, error: selectError } = await supabase
      .from('admin_otps')
      .select('id, otp_code_hash, otp_expires_at, is_verified, verification_attempts')
      .eq('email', email)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selectError) {
      console.error('Admin OTP verify select error:', selectError);
      return apiJson(request, { error: 'Unable to verify OTP' }, { status: 500 });
    }

    if (!otpRow) {
      return apiJson(request, { error: 'No verification request found for this email' }, { status: 404 });
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
    const hashedInput = Buffer.from(otp).toString('base64');
    if (hashedInput !== otpRow.otp_code_hash) {
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
        otp_code_hash: null, // Clear it out
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
        email: admin.email,
        name: admin.name
      }
    });

  } catch (error: any) {
    console.error('Admin OTP verify unexpected error:', error);
    return apiJson(request, { error: 'Unable to verify OTP' }, { status: 500 });
  }
}
