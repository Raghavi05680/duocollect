'use client';

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Send, 
  Search, 
  Upload, 
  DollarSign, 
  ShieldAlert, 
  RefreshCw 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ReminderModal from '@/components/ReminderModal';
import CsvUploaderModal from '@/components/CsvUploaderModal';

interface InvoiceRecord {
  id: string;
  customer_id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  issue_date: string;
  due_date: string;
  status: string;
  risk_score: number;
  customers?: {
    name: string;
    company_name: string;
    email: string;
    phone: string;
  };
}

export default function Dashboard() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          customer_id,
          invoice_number,
          amount,
          currency,
          issue_date,
          due_date,
          status,
          risk_score,
          customers (
            name,
            company_name,
            email,
            phone
          )
        `)
        .order('risk_score', { ascending: false });

      if (error) throw error;
      setInvoices((data as any) || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('reminder_logs')
        .select(`
          id,
          stage,
          subject,
          body,
          recipient_email,
          sent_at,
          invoices (
            invoice_number
          )
        `)
        .order('sent_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching reminder logs:', error.message);
        return;
      }

      if (data) {
        setLogs(data);
      }
    } catch (err) {
      console.error('Error fetching reminder logs:', err);
    }
  };

  const refreshAllData = () => {
    fetchInvoices();
    fetchLogs();
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  const totalOutstanding = invoices.reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);
  const highRiskCount = invoices.filter((inv) => (inv.risk_score || 0) >= 75).length;
  const averageRisk = invoices.length 
    ? Math.round(invoices.reduce((acc, inv) => acc + (inv.risk_score || 0), 0) / invoices.length) 
    : 0;

  const filteredInvoices = invoices.filter((inv) => {
    const custName = inv.customers?.name?.toLowerCase() || '';
    const compName = inv.customers?.company_name?.toLowerCase() || '';
    const invNum = inv.invoice_number?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    return custName.includes(q) || compName.includes(q) || invNum.includes(q);
  });

  const handleOpenReminder = (inv: InvoiceRecord) => {
    setSelectedInvoice({
      id: inv.id,
      customer_name: inv.customers?.name || 'Valued Client',
      company_name: inv.customers?.company_name || 'Client Corp',
      to_email: inv.customers?.email || 'client@example.com',
      invoice_number: inv.invoice_number,
      amount: inv.amount,
      currency: inv.currency || '₹',
      due_date: inv.due_date,
      risk_score: inv.risk_score,
    });
    setIsReminderModalOpen(true);
  };

  const getRiskBadge = (score: number) => {
    if (score >= 75) {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
          High Risk ({score})
        </span>
      );
    }
    if (score >= 40) {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
          Medium ({score})
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        Low ({score})
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              DuoCollect <span className="text-xs uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Copilot</span>
            </h1>
            <p className="text-sm text-zinc-400 mt-1">Autonomous Accounts Receivable & Adaptive AI Collections</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshAllData}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-lg transition"
              title="Refresh Records"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-medium rounded-lg transition text-xs shadow-lg shadow-cyan-500/10"
            >
              <Upload className="w-4 h-4" />
              Import CSV Dataset
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 backdrop-blur-sm">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-zinc-400">Total Outstanding</span>
              <DollarSign className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-3 text-2xl font-bold text-white">
              ₹{totalOutstanding.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-xs text-zinc-500">Across {invoices.length} active invoices</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 backdrop-blur-sm">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-zinc-400">High Risk Exposure</span>
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-3 text-2xl font-bold text-rose-400">
              {highRiskCount} Accounts
            </div>
            <div className="mt-1 text-xs text-rose-400/80">Require immediate escalation</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 backdrop-blur-sm">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-zinc-400">Average Risk Score</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-3 text-2xl font-bold text-amber-400">
              {averageRisk} / 100
            </div>
            <div className="mt-1 text-xs text-zinc-500">Portfolio health rating</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 backdrop-blur-sm">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-zinc-400">Audit Dispatches</span>
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3 text-2xl font-bold text-white">
              {logs.length} Logged
            </div>
            <div className="mt-1 text-xs text-emerald-400/80">Historical trail synced</div>
          </div>
        </div>

        {/* Invoices Table Section */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden backdrop-blur-sm">
          <div className="p-4 border-b border-zinc-800/80 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search debtor, company, invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-lg pl-9 pr-4 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <span className="text-xs text-zinc-500 font-medium">
              Showing {filteredInvoices.length} of {invoices.length} entries
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Debtor / Company</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Risk Severity</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-zinc-500">
                      Loading ledger records from Supabase...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-zinc-500">
                      No invoices found. Import a CSV or seed your database.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-cyan-400">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white">{inv.customers?.name || 'Customer'}</div>
                        <div className="text-zinc-500 text-[11px]">{inv.customers?.company_name || 'Individual'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300">
                        {inv.due_date}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-white">
                        {inv.currency || '₹'} {Number(inv.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        {getRiskBadge(inv.risk_score || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenReminder(inv)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-cyan-500/10 hover:border-cyan-500/40 text-zinc-300 hover:text-cyan-400 border border-zinc-700/80 rounded-lg transition text-xs font-medium"
                        >
                          <Send className="w-3 h-3" />
                          Send Nudge
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log Activity Feed */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Recent Collections Activity & Audit Trail
          </h3>
          {logs.length === 0 ? (
            <p className="text-xs text-zinc-500">No reminder activities dispatched yet. Approving a nudge will create an audit entry here.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="p-3 bg-zinc-800/40 border border-zinc-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{log.recipient_email || 'Recipient'}</span>
                      {log.invoices?.invoice_number && (
                        <span className="text-zinc-500 font-mono text-[11px]">({log.invoices.invoice_number})</span>
                      )}
                    </div>
                    <div className="text-zinc-400 text-[11px] mt-0.5 font-medium">{log.subject}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {log.stage?.replace('_', ' ')}
                    </span>
                    <span className="text-zinc-500 text-[10px] whitespace-nowrap">
                      {new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* AI Draft & Dispatch Modal */}
      <ReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        invoice={selectedInvoice}
        onDispatchSuccess={refreshAllData}
      />

      {/* CSV Dataset Uploader Modal */}
      <CsvUploaderModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onUploadComplete={refreshAllData}
      />
    </div>
  );
}