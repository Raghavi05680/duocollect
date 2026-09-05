import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

const resend = new Resend(process.env.RESEND_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { invoiceId, toEmail, subject, body, stage } = await req.json();

    // On Resend free sandbox tier, emails MUST go to your registered account email
    const targetEmail = toEmail && !toEmail.endsWith('@example.com') && !toEmail.endsWith('.in')
      ? toEmail
      : 'raghavibuddareddy@gmail.com';

    console.log(`[Resend] Dispatching email to: ${targetEmail}`);

    // 1. Send via Resend
    const { data, error } = await resend.emails.send({
      from: 'DuoCollect Copilot <onboarding@resend.dev>',
      to: [targetEmail],
      subject: subject || 'Invoice Payment Reminder',
      text: body || 'Please settle your overdue payment.',
    });

    if (error) {
      console.error('[Resend API Error]:', error);
      return NextResponse.json({ error: error.message }, { status: 422 });
    }

    console.log('[Resend Success] Email Sent ID:', data?.id);

    // 2. Insert audit log into Supabase
    if (invoiceId) {
      const { error: dbError } = await supabase.from('reminder_logs').insert({
        invoice_id: invoiceId,
        stage: stage || 'polite_nudge',
        subject: subject,
        body: body,
        recipient_email: targetEmail,
        sent_at: new Date().toISOString(),
      });

      if (dbError) {
        console.error('[Supabase Audit Log Error]:', dbError.message);
      }
    }

    return NextResponse.json({ success: true, emailResult: data });
  } catch (error: any) {
    console.error('Email Dispatch Server Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}