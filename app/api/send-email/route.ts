import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

const resend = new Resend(process.env.RESEND_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { invoiceId, toEmail, subject, body, stage } = await req.json();

    // 1. Send via Resend (on free tier, onboarding@resend.dev sends to your registered email)
    const emailResult = await resend.emails.send({
      from: 'DuoCollect Copilot <onboarding@resend.dev>',
      to: [toEmail || 'delivered@resend.dev'],
      subject: subject || 'Invoice Payment Reminder',
      text: body || 'Please settle your overdue payment.',
    });

    // 2. Insert audit log into Supabase
    if (invoiceId) {
      await supabase.from('reminder_logs').insert({
        invoice_id: invoiceId,
        stage: stage || 'polite_nudge',
        subject: subject,
        body: body,
        recipient_email: toEmail,
        sent_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, emailResult });
  } catch (error: any) {
    console.error('Email Dispatch Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}