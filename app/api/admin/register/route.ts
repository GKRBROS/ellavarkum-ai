import { NextRequest } from 'next/server';
import { db } from '@/lib/supabase';
import { requireAdminAuth, rateLimitAdminRegister } from '@/lib/adminAuth';
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

  const { email, name } = await req.json();
  if (!email || !name) return apiJson(req, { error: 'Email and name are required' }, { status: 400 });

  // Rate limit per IP
  const rateLimitResult = await rateLimitAdminRegister(req);
  if (!rateLimitResult.allowed) {
    return apiJson(req, { error: rateLimitResult.error, retryAfterSeconds: rateLimitResult.retryAfter }, { status: 429 });
  }

  // Require admin authentication (e.g., JWT/session)
  const admin = await requireAdminAuth(req);
  if (!admin) {
    return apiJson(req, { error: 'Unauthorized' }, { status: 401 });
  }

  // Insert new admin
  const { error } = await db.from('admin_users').insert([{ email, name }]);
  if (error) {
    return apiJson(req, { error: 'Failed to register admin (may already exist)' }, { status: 409 });
  }

  return apiJson(req, { success: true, email, name });
}
