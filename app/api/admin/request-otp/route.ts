import { NextRequest } from 'next/server';
import { sendOtpToAdmin, validateAdminPhone, rateLimitAdminOtp } from '@/lib/adminAuth';
import { apiJson, handleCorsPreflight, rejectIfOriginNotAllowed } from '@/lib/apiSecurity';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(req: NextRequest) {
  const originError = rejectIfOriginNotAllowed(req);
  if (originError) return originError;

  if (!req.headers.get('content-type')?.startsWith('application/json')) {
    return apiJson(req, { error: 'Invalid content type' }, { status: 400 });
  }
  
  const { phone } = await req.json();
  if (!phone) return apiJson(req, { error: 'Phone number is required' }, { status: 400 });

  // Rate limit per phone and IP
  const rateLimitResult = await rateLimitAdminOtp(phone, req);
  if (!rateLimitResult.allowed) {
    return apiJson(req, { error: rateLimitResult.error, retryAfterSeconds: rateLimitResult.retryAfter }, { status: 429 });
  }

  // Check if phone is a registered admin
  const admin = await validateAdminPhone(phone);
  if (!admin) {
    return apiJson(req, { error: 'Phone number is not a registered admin' }, { status: 403 });
  }

  // Send OTP
  try {
    const otpResult = await sendOtpToAdmin(phone);
    return apiJson(req, { 
      success: true, 
      phone, 
      expiresAt: otpResult.expiresAt, 
      expiresInMinutes: otpResult.expiresInMinutes, 
      smsSent: true 
    });
  } catch (error: any) {
    return apiJson(req, { error: error.message || 'Failed to send OTP' }, { status: 500 });
  }
}
