import { NextRequest, NextResponse } from 'next/server';

import { apiJson, handleCorsPreflight, rejectIfOriginNotAllowed } from '@/lib/apiSecurity';
import { hashOtp, IMAGE_GENERATION_TABLE, isOtpExpired, normalizePhone, verifyOtpHash } from '@/lib/generationFlow';
import { RATE_LIMITS, enforceRateLimit } from '@/lib/rateLimit';
import { parseStrictJson, validateVerifyOtpInput } from '@/lib/requestValidation';
import { getSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  const blockedOriginResponse = rejectIfOriginNotAllowed(request);
  if (blockedOriginResponse) return blockedOriginResponse;

  try {
    const body = await parseStrictJson(request);

    const prevalidatedPhone = typeof body?.phone === 'string' ? body.phone : '';
    const rateLimit = enforceRateLimit(request, {
      endpointKey: 'verifyOtp',
      limits: RATE_LIMITS.verifyOtp,
      userIdentifier: prevalidatedPhone,
    });
    if (rateLimit.limited) {
      return apiJson(
        request,
        {
          error: 'Too many verification attempts. Please wait and try again.',
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429, headers: rateLimit.headers }
      );
    }

    const validated = validateVerifyOtpInput(body);
    if ('error' in validated) {
      return apiJson(request, { error: validated.error }, { status: 400 });
    }

    const phone = normalizePhone(validated.data.phone);
    const otp = validated.data.otp;
    console.log('[VERIFY OTP] Normalized Phone:', phone);
    const supabase = getSupabaseClient();

    const { data: requestRow, error: selectError } = await supabase
      .from(IMAGE_GENERATION_TABLE)
      .select('id, otp_hash, otp_expires_at, status, tries_left')
      .eq('phone', phone)
      .maybeSingle();

    if (selectError) {
      console.error('OTP verify select error:', selectError);
      return apiJson(request, { error: 'Unable to verify OTP' }, { status: 500 });
    }

    if (!requestRow) {
      return apiJson(request, { error: 'No OTP request found for this phone number' }, { status: 404 });
    }

    if (requestRow.status === 'verified' || requestRow.status === 'generated') {
      return apiJson(request, { success: true, verified: true, requestId: requestRow.id });
    }

    if (requestRow.tries_left <= 0) {
      return apiJson(request, { error: 'Too many failed attempts. Please request a new code.' }, { status: 403 });
    }

    if (isOtpExpired(requestRow.otp_expires_at)) {
      return apiJson(request, { error: 'Verification code expired. Request a new code.' }, { status: 400 });
    }

    const providedHash = hashOtp(phone, otp);
    const isMatch = verifyOtpHash(providedHash, requestRow.otp_hash || '');

    if (!isMatch) {
      const newTries = (requestRow.tries_left ?? 5) - 1;
      await supabase
        .from(IMAGE_GENERATION_TABLE)
        .update({ tries_left: newTries })
        .eq('id', requestRow.id);

      const errorMsg = newTries <= 0 
        ? 'Too many failed attempts. Please request a new code.' 
        : `Incorrect verification code. ${newTries} attempts remaining.`;
        
      return apiJson(request, { error: errorMsg }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from(IMAGE_GENERATION_TABLE)
      .update({
        status: 'verified',
        otp_hash: null, // Destroy hash after successful verification
        otp_expires_at: null,
        tries_left: 5,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestRow.id);

    if (updateError) {
      console.error('OTP verify update error:', updateError);
      return apiJson(request, { error: 'Unable to verify OTP' }, { status: 500 });
    }

    return apiJson(request, {
      success: true,
      verified: true,
      requestId: requestRow.id,
    });
  } catch (error: any) {
    console.error('OTP verify unexpected error:', error);
    return apiJson(
      request,
      { error: 'Unable to verify OTP' },
      { status: 500 }
    );
  }
}
