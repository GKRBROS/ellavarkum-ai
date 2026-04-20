import 'server-only';

import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://localhost:3000',
  'https://frameforge.one',
  'https://frameforge-mauve.vercel.app',
]);

const ALLOW_METHODS = 'POST,OPTIONS';
const ALLOW_HEADERS = 'Content-Type,Authorization,X-Requested-With';

const normalizeOrigin = (origin: string) => {
  try {
    return new URL(origin).origin;
  } catch {
    return origin.replace(/\/$/, '');
  }
};

const getAllowedOrigin = (request: NextRequest) => {
  const requestOrigin = request.headers.get('origin');
  if (!requestOrigin) return null;

  const normalized = normalizeOrigin(requestOrigin);
  return ALLOWED_ORIGINS.has(normalized) ? normalized : null;
};

const applyHeaders = (request: NextRequest, response: NextResponse) => {
  const allowedOrigin = getAllowedOrigin(request);

  response.headers.set('Vary', 'Origin');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Pragma', 'no-cache');

  if (allowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    response.headers.set('Access-Control-Allow-Methods', ALLOW_METHODS);
    response.headers.set('Access-Control-Allow-Headers', ALLOW_HEADERS);
  }

  return response;
};

export const rejectIfOriginNotAllowed = (request: NextRequest) => {
  const requestOrigin = request.headers.get('origin');
  if (!requestOrigin) return null;

  if (getAllowedOrigin(request)) return null;

  const response = NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
  return applyHeaders(request, response);
};

export const handleCorsPreflight = (request: NextRequest) => {
  const originError = rejectIfOriginNotAllowed(request);
  if (originError) return originError;

  const response = new NextResponse(null, { status: 204 });
  return applyHeaders(request, response);
};

export const apiJson = (request: NextRequest, body: unknown, init?: ResponseInit) => {
  const response = NextResponse.json(body, init);
  return applyHeaders(request, response);
};
