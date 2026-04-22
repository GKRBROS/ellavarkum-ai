import { NextRequest, NextResponse } from 'next/server';

import { apiJson, handleCorsPreflight, rejectIfOriginNotAllowed } from '@/lib/apiSecurity';
import { generateOtp, hashOtp, IMAGE_GENERATION_TABLE, normalizeEmail } from '@/lib/generationFlow';
import { RATE_LIMITS, enforceRateLimit } from '@/lib/rateLimit';
import { parseStrictJson, validateRequestOtpInput } from '@/lib/requestValidation';
import { sendOtpEmail } from '@/lib/sesEmail';
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

    const prevalidatedEmail = typeof body?.email === 'string' ? body.email : '';
    const rateLimit = enforceRateLimit(request, {
      endpointKey: 'requestOtp',
      limits: RATE_LIMITS.requestOtp,
      userIdentifier: prevalidatedEmail,
    });
    if (rateLimit.limited) {
      return apiJson(
        request,
        {
          error: 'Too many OTP requests. Please try again shortly.',
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429, headers: rateLimit.headers }
      );
    }

    const validated = validateRequestOtpInput(body);
    if ('error' in validated) {
      return apiJson(request, { error: validated.error }, { status: 400 });
    }

    const email = normalizeEmail(validated.data.email);
    const supabase = getSupabaseClient();

    const { data: existingRequest, error: selectError } = await supabase
      .from(IMAGE_GENERATION_TABLE)
      .select('id, is_verified, generation_status')
      .eq('email', email)
      .maybeSingle();

    if (selectError) {
      console.error('OTP request select error:', selectError);
      return apiJson(request, { error: 'Unable to process OTP request' }, { status: 500 });
    }

    if (existingRequest?.generation_status === 'completed') {
      return apiJson(
        request,
        { error: 'This email has already completed generation. Please use a different email.' },
        { status: 409 }
      );
    }

    const otp = generateOtp();
    const otpCodeHash = hashOtp(email, otp);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from(IMAGE_GENERATION_TABLE)
      .upsert(
        {
          email,
          otp_code_hash: otpCodeHash,
          otp_expires_at: otpExpiresAt,
          otp_verified_at: null,
          is_verified: false,
          verification_attempts: 0,
          generation_status: 'otp_pending',
          generated_at: null,
          last_error: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      )
      .select('id, email, otp_expires_at')
      .single();

    if (error) {
      console.error('OTP request upsert error:', error);
      return apiJson(request, { error: 'Unable to create OTP request' }, { status: 500 });
    }

    if (!data) {
      return apiJson(request, { error: 'Unable to create OTP request' }, { status: 500 });
    }

    let messageId: string | null = null;

    try {
      messageId = await sendOtpEmail({ to: email, otp });
    } catch (mailError: any) {
      if (!existingRequest && data?.id) {
        await supabase.from(IMAGE_GENERATION_TABLE).delete().eq('id', data.id);
      }
      console.error('OTP email send error:', mailError);
      return apiJson(
        request,
        { error: 'Failed to send OTP email' },
        { status: 500 }
      );
    }

    const exposeOtp = process.env.EXPOSE_OTP_IN_RESPONSE === 'true';

    return apiJson(request, {
      success: true,
      requestId: data.id,
      email: data.email,
      expiresAt: data.otp_expires_at,
      expiresInMinutes: 10,
      emailSent: true,
      messageId,
      otp: exposeOtp ? otp : undefined,
    });
  } catch (error: any) {
    console.error('OTP request unexpected error:', error);
    return apiJson(
      request,
      { error: 'Unable to create OTP request' },
      { status: 500 }
    );
  }
}
