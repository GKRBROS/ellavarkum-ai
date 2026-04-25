import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { sendOtpEmail } from '@/lib/sesEmail';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Check tries_left
    const { data: user, error: selectError } = await supabase
      .from('elavarkum_requests')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    let currentTries = 3;
    if (user) {
      currentTries = user.tries_left;
      if (currentTries <= 0 && email !== 'frameforgeone@gmail.com') {
        return NextResponse.json({ error: 'Max tries reached' }, { status: 403 });
      }
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();

    // Upsert OTP
    const { error: upsertError } = await supabase
      .from('elavarkum_requests')
      .upsert({
        email,
        otp_code: otp,
        otp_expires_at: expiresAt,
        tries_left: currentTries,
        status: 'pending'
      }, { onConflict: 'email' });

    if (upsertError) throw upsertError;

    // Send Real Email via SES
    try {
      await sendOtpEmail({ to: email, otp });
    } catch (mailError) {
      console.error('SES Email Error:', mailError);
      return NextResponse.json({ error: 'Failed to send email. Check SES configuration.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, triesLeft: currentTries });
  } catch (err: any) {
    console.error('OTP Request Error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
