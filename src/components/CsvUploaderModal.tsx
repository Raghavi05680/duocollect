'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CsvUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

export default function CsvUploaderModal({ isOpen, onClose, onUploadComplete }: CsvUploaderModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successCount, setSuccessCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessCount(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          let inserted = 0;

          for (const row of rows) {
            const customerName = row.customer_name || row['Customer Name'] || row.name;
            const companyName = row.company_name || row['Company Name'] || customerName;
            const email = row.email || row['Email'] || `${customerName.toLowerCase().replace(/\s+/g, '')}@example.com`;
            const phone = row.phone || row['Phone'] || '+910000000000';
            const invoiceNumber = row.invoice_number || row['Invoice Number'] || `INV-${Math.floor(1000 + Math.random() * 9000)}`;
            const amount = parseFloat(row.amount || row['Amount'] || '0');
            const currency = row.currency || '₹';
            const dueDate = row.due_date || row['Due Date'] || new Date().toISOString().split('T')[0];
            const riskScore = parseInt(row.risk_score || row['Risk Score'] || `${Math.floor(40 + Math.random() * 55)}`, 10);

            if (!customerName || isNaN(amount)) continue;

            // 1. Create or fetch customer
            const { data: customerData, error: custErr } = await supabase
              .from('customers')
              .insert({ name: customerName, company_name: companyName, email, phone })
              .select('id')
              .single();

            const customerId = customerData?.id;

            if (customerId) {
              // 2. Insert corresponding invoice
              await supabase.from('invoices').insert({
                customer_id: customerId,
                invoice_number: invoiceNumber,
                amount,
                currency,
                issue_date: new Date().toISOString().split('T')[0],
                due_date: dueDate,
                status: 'overdue',
                risk_score: riskScore,
              });
              inserted++;
            }
          }

          setSuccessCount(inserted);
          onUploadComplete();
        } catch (err: any) {
          setErrorMsg(err.message || 'Failed to parse and insert data');
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        setErrorMsg(err.message);
        setLoading(false);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl">
        <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Import Ledger Dataset</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Upload CSV accounting exports from Tally, Zoho Books, SAP, or QuickBooks. Supported headers: <code className="text-cyan-400">customer_name, amount, due_date, risk_score, invoice_number</code>.
          </p>

          <label className="border-2 border-dashed border-zinc-700 hover:border-cyan-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-zinc-800/30 group">
            {loading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                <span className="text-sm text-zinc-300">Ingesting & Syncing with Supabase...</span>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-zinc-400 group-hover:text-cyan-400 transition mb-2" />
                <span className="text-sm font-medium text-zinc-200">Click to browse or drop CSV</span>
                <span className="text-xs text-zinc-500 mt-1">.csv format up to 5MB</span>
              </>
            )}
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={handleFileUpload} 
              disabled={loading} 
            />
          </label>

          {successCount !== null && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Successfully parsed and loaded {successCount} invoices!</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2 text-rose-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-zinc-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}