import { NextRequest } from 'next/server';
import { sendOtpToAdmin, validateAdminEmail, rateLimitAdminOtp } from '@/lib/adminAuth';
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
  
  const { email } = await req.json();
  if (!email) return apiJson(req, { error: 'Email is required' }, { status: 400 });

  // Rate limit per email and IP
  const rateLimitResult = await rateLimitAdminOtp(email, req);
  if (!rateLimitResult.allowed) {
    return apiJson(req, { error: rateLimitResult.error, retryAfterSeconds: rateLimitResult.retryAfter }, { status: 429 });
  }

  // Check if email is a registered admin
  const admin = await validateAdminEmail(email);
  if (!admin) {
    return apiJson(req, { error: 'Email is not a registered admin' }, { status: 403 });
  }

  // Send OTP
  try {
    const otpResult = await sendOtpToAdmin(email);
    return apiJson(req, { 
      success: true, 
      email, 
      expiresAt: otpResult.expiresAt, 
      expiresInMinutes: otpResult.expiresInMinutes, 
      emailSent: true 
    });
  } catch (error: any) {
    return apiJson(req, { error: error.message || 'Failed to send OTP' }, { status: 500 });
  }
}
