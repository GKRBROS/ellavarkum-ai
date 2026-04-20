import { NextRequest, NextResponse } from 'next/server';

import { apiJson, handleCorsPreflight, rejectIfOriginNotAllowed } from '@/lib/apiSecurity';
import { generateOtp, hashOtp, IMAGE_GENERATION_TABLE, normalizeEmail } from '@/lib/generationFlow';
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
    const body = await request.json().catch(() => null);
    const rawEmail = body?.email;

    if (typeof rawEmail !== 'string' || !rawEmail.trim()) {
      return apiJson(request, { error: 'Email is required' }, { status: 400 });
    }

    const email = normalizeEmail(rawEmail);
    const supabase = getSupabaseClient();

    const { data: existingRequest, error: selectError } = await supabase
      .from(IMAGE_GENERATION_TABLE)
      .select('id, is_verified')
      .eq('email', email)
      .maybeSingle();

    if (selectError) {
      console.error('OTP request select error:', selectError);
      return apiJson(request, { error: 'Unable to process OTP request' }, { status: 500 });
    }

    if (existingRequest) {
      return apiJson(
        request,
        { error: 'This email has already been used. Please use a different email.' },
        { status: 409 }
      );
    }

    const otp = generateOtp();
    const otpCodeHash = hashOtp(email, otp);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from(IMAGE_GENERATION_TABLE)
      .insert({
        email,
        otp_code_hash: otpCodeHash,
        otp_expires_at: otpExpiresAt,
        otp_verified_at: null,
        is_verified: false,
        verification_attempts: 0,
        generation_status: 'otp_pending',
      })
      .select('id, email, otp_expires_at')
      .single();

    if (error) {
      console.error('OTP request insert error:', error);
      return apiJson(request, { error: 'Unable to create OTP request' }, { status: 500 });
    }

    let messageId: string | null = null;

    try {
      messageId = await sendOtpEmail({ to: email, otp });
    } catch (mailError: any) {
      await supabase.from(IMAGE_GENERATION_TABLE).delete().eq('id', data.id);
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
