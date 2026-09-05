'use client';

import { useState } from 'react';

export interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  onDispatchSuccess: () => void;
}

export default function ReminderModal({
  isOpen,
  onClose,
  invoice,
  onDispatchSuccess,
}: ReminderModalProps) {
  const [tone, setTone] = useState<'friendly' | 'firm' | 'urgent'>('friendly');
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen || !invoice) return null;

  // 1. Generate AI Reminder via Gemini API
  const handleGenerate = async () => {
    setIsGenerating(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/generate-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: invoice.client_name,
          amount: invoice.amount,
          dueDate: invoice.due_date,
          invoiceNumber: invoice.invoice_number,
          tone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate reminder');

      setGeneratedEmail(data.emailBody);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error generating email' });
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Dispatch Email via Resend API
  const handleSendEmail = async () => {
    if (!generatedEmail) return;
    setIsSending(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: invoice.client_email,
          clientName: invoice.client_name,
          invoiceNumber: invoice.invoice_number,
          emailBody: generatedEmail,
          invoiceId: invoice.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send email');

      setStatusMessage({ type: 'success', text: 'Email dispatched successfully!' });
      
      // Notify parent page to refresh invoice list/status
      onDispatchSuccess();

      // Automatically close modal after 1.5 seconds
      setTimeout(() => {
        onClose();
        setStatusMessage(null);
        setGeneratedEmail('');
      }, 1500);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error sending email' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 dark:text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-bold">Generate AI Reminder</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Invoice #{invoice.invoice_number} — {invoice.client_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Tone Selector */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Select Communication Tone</label>
          <div className="grid grid-cols-3 gap-3">
            {(['friendly', 'firm', 'urgent'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`rounded-lg border py-2 px-4 text-sm font-medium capitalize transition ${
                  tone === t
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-slate-800 dark:text-gray-300 dark:hover:bg-slate-800'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-4">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            {isGenerating ? 'Drafting with Gemini AI...' : 'Generate Email Draft'}
          </button>
        </div>

        {/* Draft Area */}
        {generatedEmail && (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Generated Draft</label>
            <textarea
              rows={6}
              value={generatedEmail}
              onChange={(e) => setGeneratedEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        )}

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`mt-4 rounded-lg p-3 text-sm font-medium ${
              statusMessage.type === 'success'
                ? 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400'
                : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400'
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-3 border-t pt-4 dark:border-slate-800">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSendEmail}
            disabled={!generatedEmail || isSending}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50"
          >
            {isSending ? 'Sending Via Resend...' : 'Dispatch Email'}
          </button>
        </div>
      </div>
    </div>
  );
}