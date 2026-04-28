import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

// Next.js App Router Route Handler - Body size limits are typically handled at the infrastructure level (e.g., Vercel's 4.5MB limit).
// The config object below is for Page Router and is ignored in App Router, but kept for documentation if needed.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

import sharp from 'sharp';

import { apiJson, handleCorsPreflight, rejectIfOriginNotAllowed } from '@/lib/apiSecurity';
import { mergeImages } from '@/lib/imageProcessor';
import {
  buildGenerationPrompt,
  GenderOption,
  IMAGE_GENERATION_TABLE,
} from '@/lib/generationFlow';
import { RATE_LIMITS, enforceRateLimit } from '@/lib/rateLimit';
import { validateGenerateFormData } from '@/lib/requestValidation';
import { getOpenRouterApiKeys } from '@/lib/secrets';
import { sendFinalImageEmail } from '@/lib/sesEmail';
import { isS3Configured, uploadBufferToS3 } from '@/lib/s3Storage';
import { getSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

const OPENROUTER_TIMEOUT_MS = 60000; // Reduced from 120s to 60s for faster failure recovery
const DEFAULT_OPENROUTER_IMAGE_MODELS = [
  'bytedance-seed/seedream-4.5',
  'google/gemini-pro-1.5-vision-latest',
  'openai/gpt-4o-mini',
  'anthropic/claude-3-haiku:beta'
];
const OPENROUTER_IMAGE_MODELS = (process.env.OPENROUTER_IMAGE_MODELS || '')
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);
const OPENROUTER_API_KEYS = getOpenRouterApiKeys();
// Prioritize custom models from ENV, then fall back to known vision-capable defaults
const IMAGE_MODEL_CANDIDATES = [...OPENROUTER_IMAGE_MODELS, ...DEFAULT_OPENROUTER_IMAGE_MODELS];
const RETRYABLE_OPENROUTER_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const SKIP_OPTIONAL_STORAGE_UPLOADS = process.env.NETLIFY === 'true' || process.env.NODE_ENV === 'production';
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);
const ALLOWED_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp']);

const buildFinalImageUrl = (request: NextRequest, finalImagePath: string) => {
  const origin = request.nextUrl.origin;
  if (!finalImagePath) return '';
  if (finalImagePath.startsWith('http')) {
    return finalImagePath;
  }
  const path = finalImagePath.startsWith('/') ? finalImagePath : `/${finalImagePath}`;
  return `${origin}${path}`;
};

export async function POST(request: NextRequest) {
  const blockedOriginResponse = rejectIfOriginNotAllowed(request);
  if (blockedOriginResponse) return blockedOriginResponse;

  const isProduction = process.env.NODE_ENV === 'production';

  try {
    const formData = await request.formData();
    const prevalidatedPhone = typeof formData.get('phone') === 'string' ? String(formData.get('phone')) : '';
    const rateLimit = enforceRateLimit(request, {
      endpointKey: 'generate',
      limits: RATE_LIMITS.generate,
      userIdentifier: prevalidatedPhone,
    });
    if (rateLimit.limited) {
      return apiJson(
        request,
        {
          error: 'Too many generation requests. Please wait and retry.',
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429, headers: rateLimit.headers }
      );
    }

    const validated = validateGenerateFormData(formData);
    if ('error' in validated) {
      return apiJson(request, { error: validated.error }, { status: 400 });
    }

    const { photo, phone, requestId, name, gender } = validated.data;
    console.log('[GENERATE] Input Phone:', phone);
    console.log('[GENERATE] Input RequestId:', requestId);

    const supabase = getSupabaseClient();

    const requestSelect = 'id, status';
    const requestQuery = supabase
      .from(IMAGE_GENERATION_TABLE)
      .select(requestSelect)
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1);

    const { data: requestRows, error: requestError } = await requestQuery;
    const requestRow = requestRows?.[0] || null;

    if (!requestId && !requestRow) {
      return apiJson(request, { error: 'No verified request found for this phone number' }, { status: 404 });
    }

    const resolvedRequestId = requestId || requestRow?.id || '';

    const { data: validatedRequestRow, error: validatedRequestError } = await supabase
      .from(IMAGE_GENERATION_TABLE)
      .select('id, status, tries_left')
      .eq('phone', phone)
      .eq('id', resolvedRequestId)
      .maybeSingle() as { data: any, error: any };

    if (requestError || validatedRequestError) {
      console.error('Generate request lookup error:', requestError || validatedRequestError);
      return apiJson(request, { error: 'Unable to validate session' }, { status: 500 });
    }
    if (!validatedRequestRow) return apiJson(request, { error: 'No matching request found' }, { status: 404 });
    if (validatedRequestRow.status !== 'verified' && validatedRequestRow.status !== 'generated') {
      return apiJson(request, { error: 'Phone number is not verified yet' }, { status: 403 });
    }

    const imageMimeType = (photo.type || '').toLowerCase();
    const imageExtension = (photo.name.split('.').pop() || '').toLowerCase();
    const isAllowedImageType = ALLOWED_IMAGE_MIME_TYPES.has(imageMimeType) || ALLOWED_IMAGE_EXTENSIONS.has(imageExtension);
    if (!isAllowedImageType) {
      return apiJson(request, { error: 'Only PNG, JPEG/JPG, or WEBP images are allowed' }, { status: 400 });
    }

    const buffer = Buffer.from(await photo.arrayBuffer());
    const timestamp = Date.now();
    const filename = `upload-${timestamp}.${imageExtension || 'png'}`;

    const tmpUploadsPath = join('/tmp', 'elam-ai-gen');
    await mkdir(tmpUploadsPath, { recursive: true }).catch(() => undefined);
    await writeFile(join(tmpUploadsPath, filename), buffer);

    let uploadedImageUrl = `/elam-ai-gen/${filename}`;
    let s3UploadPromise: Promise<string> | null = null;

    if (isS3Configured()) {
      s3UploadPromise = uploadBufferToS3({
        key: `elam ai gen/${filename}`,
        body: buffer,
        contentType: photo.type || 'application/octet-stream',
      }).catch(err => {
        console.warn('Background S3 original upload failed:', err);
        return `/elam-ai-gen/${filename}`;
      });
    }

    const resizedBuffer = await sharp(buffer).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    const dataUrl = `data:image/jpeg;base64,${resizedBuffer.toString('base64')}`;
    const prompt = buildGenerationPrompt({ name, gender });

    if (OPENROUTER_API_KEYS.length === 0) throw new Error('OPENROUTER_API_KEY or OPENROUTER_API_KEYS must be configured');

    let result: any = null;
    let lastOpenRouterError = 'Unknown OpenRouter error';

    for (const apiKey of OPENROUTER_API_KEYS) {
      for (const model of IMAGE_MODEL_CANDIDATES) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);
        try {
          console.log(`[GENERATE] Attempting model: ${model} with Key Index: ${OPENROUTER_API_KEYS.indexOf(apiKey)}`);
          
          const apiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://ellavarkkumai.frameforge.one',
              'X-Title': 'Ellavarkkum AI',
            },
            signal: controller.signal,
            body: JSON.stringify({
              model,
              messages: [
                { 
                  role: 'user', 
                  content: [
                    { type: 'text', text: prompt }, 
                    { type: 'image_url', image_url: { url: dataUrl } }
                  ] 
                }
              ],
              modalities: ['image'],
            }),
          });

          if (apiResponse.ok) {
            result = await apiResponse.json();
            console.log(`[GENERATE] Success with model: ${model}`);
            break;
          }

          let errorDetail = 'Unknown error';
          try {
            const contentType = apiResponse.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const errJson = await apiResponse.json();
              errorDetail = JSON.stringify(errJson);
            } else {
              errorDetail = (await apiResponse.text()).slice(0, 500);
            }
          } catch {
            errorDetail = 'Failed to parse upstream error body';
          }

          lastOpenRouterError = `Model ${model} failed (${apiResponse.status}): ${errorDetail}`;
          console.error(`[GENERATE] OpenRouter Error (${apiResponse.status}):`, errorDetail);
          
          if (!RETRYABLE_OPENROUTER_STATUS.has(apiResponse.status)) {
            console.log(`[GENERATE] Non-retryable status ${apiResponse.status} for model ${model}. Skipping to next.`);
          }
        } catch (error: any) {
          lastOpenRouterError = error?.name === 'AbortError' 
            ? `Model ${model} timed out after ${OPENROUTER_TIMEOUT_MS}ms` 
            : `Model ${model} request failed: ${error?.message || 'Unknown request error'}`;
          console.error(`[GENERATE] Fetch Exception:`, lastOpenRouterError);
        } finally {
          clearTimeout(timeoutId);
        }
      }

      if (result) {
        break;
      }
    }

    if (!result) throw new Error(`OpenRouter upstream unavailable. ${lastOpenRouterError}`);

    const generatedImageUrl: string | undefined = result.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!generatedImageUrl) throw new Error('No image returned from AI');

    const imageBuffer = generatedImageUrl.startsWith('data:')
      ? Buffer.from(generatedImageUrl.split(',')[1], 'base64')
      : Buffer.from(await (await fetch(generatedImageUrl, { cache: 'no-store' })).arrayBuffer());

    const generatedFilename = `generated-${timestamp}.png`;
    const tmpGeneratedPath = join('/tmp', 'elam-ai-final');
    await mkdir(tmpGeneratedPath, { recursive: true }).catch(() => undefined);
    const tempGeneratedFile = join(tmpGeneratedPath, generatedFilename);
    await writeFile(tempGeneratedFile, imageBuffer);

    const finalImagePath = await mergeImages(tempGeneratedFile, timestamp.toString(), name);
    const finalImageUrl = buildFinalImageUrl(request, finalImagePath);

    const currentTries = validatedRequestRow?.tries_left ?? 3;
    const newTries = Math.max(0, currentTries - 1);
    console.log('[GENERATE] Tries update: Current Tries:', currentTries, 'New Tries:', newTries);

    // Finalize the original image URL (if s3 upload was started, get result)
    if (s3UploadPromise) {
      uploadedImageUrl = await s3UploadPromise;
    }

    const { data: dbData, error: dbError } = await supabase
      .from(IMAGE_GENERATION_TABLE)
      .update({
        name,
        gender,
        prompt_used: prompt,
        photo_url: uploadedImageUrl,
        generated_image_url: finalImageUrl,
        status: 'generated',
        tries_left: newTries,
        updated_at: new Date().toISOString(),
      })
      .eq('phone', phone)
      .eq('id', validatedRequestRow.id)
      .select('id, phone, generated_image_url')
      .single();

    if (dbError) {
      console.error('Database update error:', dbError);
      return apiJson(request, { error: 'Unable to persist generation result' }, { status: 500 });
    }

    return apiJson(request, {
      success: true,
      uploadedImage: uploadedImageUrl,
      generatedImage: finalImageUrl,
      finalImage: finalImagePath,
      finalImageUrl,
      dbId: dbData?.id,
      requestId: validatedRequestRow.id,
      prompt,
      triesLeft: newTries,
    });
  } catch (error: any) {
    console.error('CRITICAL ERROR during generation:', error);
    if (error?.name === 'AbortError') {
      return apiJson(request, { error: 'Generation timed out due to upstream inactivity. Please try again with a shorter prompt or retry.' }, { status: 504 });
    }
    return apiJson(request, { error: 'Internal Server Error' }, { status: 500 });
  }
}
