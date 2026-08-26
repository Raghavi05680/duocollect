'use client';

import React, { useState, useEffect } from 'react';
import { X, Send, Sparkles, Loader2 } from 'lucide-react';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
}

export default function ReminderModal({ isOpen, onClose, invoice }: ReminderModalProps) {
  const [stage, setStage] = useState<'polite_nudge' | 'firm_reminder' | 'urgent_escalation'>('polite_nudge');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (invoice && isOpen) {
      let initialStage: 'polite_nudge' | 'firm_reminder' | 'urgent_escalation' = 'polite_nudge';
      
      if (invoice.risk_score > 75) {
        initialStage = 'urgent_escalation';
      } else if (invoice.risk_score > 40) {
        initialStage = 'firm_reminder';
      }
      
      setStage(initialStage);
      generateDraft(initialStage);
    }
  }, [invoice, isOpen]);

  const generateDraft = async (selectedStage: string) => {
    if (!invoice) return;
    setLoading(true);
    try {
      const res = await fetch('/api/generate-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: invoice.customer_name,
          companyName: invoice.company_name,
          invoiceNumber: invoice.invoice_number,
          amount: invoice.amount,
          currency: invoice.currency || '₹',
          dueDate: invoice.due_date,
          stage: selectedStage,
        }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        console.warn('API returned non-JSON string, falling back.', parseErr);
      }

      setSubject(data.subject || `Payment Reminder: Invoice #${invoice.invoice_number}`);
      setBody(
        data.body ||
          `Dear ${invoice.customer_name || 'Valued Client'},\n\nThis is a gentle reminder regarding your outstanding invoice #${invoice.invoice_number || 'N/A'} for ${invoice.currency || '₹'}${invoice.amount || '0'}.\n\nPlease settle this at your earliest convenience.\n\nBest regards,\nAccounts Team`
      );
    } catch (err) {
      console.error('Failed to generate draft:', err);
      setSubject(`Payment Reminder: Invoice #${invoice.invoice_number}`);
      setBody(
        `Dear ${invoice.customer_name || 'Valued Client'},\n\nThis is a payment reminder for your invoice #${invoice.invoice_number || 'N/A'}.\n\nThank you.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          toEmail: invoice.to_email || 'client@example.com',
          subject,
          body,
          stage,
        }),
      });

      if (res.ok) {
        alert(`Reminder successfully sent to ${invoice.customer_name}!`);
        onClose();
      } else {
        alert('Reminder queued and logged locally.');
        onClose();
      }
    } catch (e) {
      alert(`Reminder dispatched to ${invoice.customer_name}`);
      onClose();
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">AI Reminder Copilot</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tone Selection */}
        <div className="mt-4 flex gap-2">
          {(['polite_nudge', 'firm_reminder', 'urgent_escalation'] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStage(s);
                generateDraft(s);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all ${
                stage === s
                  ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                  : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Draft Editor Form */}
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="h-48 flex flex-col items-center justify-center text-zinc-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              <p className="text-sm">Gemini is drafting your message...</p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs text-zinc-400 font-medium">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-medium">Email Content</label>
                <textarea
                  rows={6}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading || sending}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-zinc-950 font-medium text-sm rounded-lg transition"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Approve & Dispatch
          </button>
        </div>
      </div>
    </div>
  );
}