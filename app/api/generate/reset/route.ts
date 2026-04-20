import { NextRequest } from 'next/server';

import { apiJson, handleCorsPreflight, rejectIfOriginNotAllowed } from '@/lib/apiSecurity';
import { IMAGE_GENERATION_TABLE, normalizeEmail } from '@/lib/generationFlow';
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
    const rawRequestId = body?.requestId;

    if (typeof rawEmail !== 'string' || !rawEmail.trim()) {
      return apiJson(request, { error: 'Email is required' }, { status: 400 });
    }

    const email = normalizeEmail(rawEmail);
    const requestId = typeof rawRequestId === 'string' ? rawRequestId.trim() : '';
    const supabase = getSupabaseClient();

    const baseQuery = supabase
      .from(IMAGE_GENERATION_TABLE)
      .select('id, email, is_verified')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1);

    const { data: latestRows, error: latestError } = await baseQuery;

    if (latestError) {
      console.error('Reset generation lookup error:', latestError);
      return apiJson(request, { error: 'Unable to find generation request' }, { status: 500 });
    }

    const latestRow = latestRows?.[0] || null;
    if (!latestRow) {
      return apiJson(request, { error: 'No request found for this email' }, { status: 404 });
    }

    let targetId = latestRow.id;

    if (requestId) {
      const { data: requestedRow, error: requestedError } = await supabase
        .from(IMAGE_GENERATION_TABLE)
        .select('id, email, is_verified')
        .eq('email', email)
        .eq('id', requestId)
        .maybeSingle();

      if (requestedError) {
        console.error('Reset generation requestId lookup error:', requestedError);
        return apiJson(request, { error: 'Unable to find the specified request' }, { status: 500 });
      }

      if (!requestedRow) {
        return apiJson(request, { error: 'No matching request found for this email and requestId' }, { status: 404 });
      }

      targetId = requestedRow.id;

      if (!requestedRow.is_verified) {
        return apiJson(request, { error: 'Email is not verified for this request' }, { status: 403 });
      }
    } else if (!latestRow.is_verified) {
      return apiJson(request, { error: 'Latest request for this email is not verified yet' }, { status: 403 });
    }

    const { error: updateError } = await supabase
      .from(IMAGE_GENERATION_TABLE)
      .update({
        prompt_used: null,
        photo_url: null,
        generated_image_url: null,
        final_image_url: null,
        generated_at: null,
        last_error: null,
        generation_status: 'email_verified',
      })
      .eq('email', email)
      .eq('id', targetId);

    if (updateError) {
      console.error('Reset generation update error:', updateError);
      return apiJson(request, { error: 'Unable to reset generation request' }, { status: 500 });
    }

    return apiJson(request, {
      success: true,
      message: 'Generation state reset. You can generate again for this email.',
      email,
      requestId: targetId,
      status: 'email_verified',
    });
  } catch (error: any) {
    console.error('Reset generation unexpected error:', error);
    return apiJson(request, { error: 'Unable to reset generation request' }, { status: 500 });
  }
}
