import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and Password required' }, { status: 400 });
    }

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'frameforgeone@gmail.com';
    const inputHash = crypto.createHash('sha256').update(password).digest('hex');
    const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '6d781443fc608d52568974a37819cf5b140b4145415e4e8e4115ea9c086678b7';

    if (email === ADMIN_EMAIL && inputHash === ADMIN_PASSWORD_HASH) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
