'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import CsvUploaderModal from '@/components/CsvUploaderModal';
import ReminderModal from '@/components/ReminderModal';
import { 
  FileSpreadsheet, 
  Send, 
  ShieldAlert, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export interface Customer {
  id?: string;
  name: string;
  company_name: string;
  email: string;
  phone?: string;
}

export interface Invoice {
  id: string;
  customer_id?: string;
  invoice_number: string;
  amount: number;
  currency: string;
  issue_date: string;
  due_date: string;
  status: string;
  risk_score: number;
  customers?: Customer;
}

export interface AuditLog {
  id: string;
  invoice_id: string;
  stage: string;
  subject: string;
  recipient_email: string;
  sent_at: string;
}

export default function Dashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Modals
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState<boolean>(false);

  // Fetch Invoices and Audit Logs
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Invoices with foreign key relationship to customers
      const { data: invoiceData, error: invoiceError } = await supabase
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
            id,
            name,
            company_name,
            email,
            phone
          )
        `)
        .order('risk_score', { ascending: false });

      if (invoiceError) {
        console.error('Supabase invoice query error:', invoiceError.message);
      } else if (invoiceData) {
        setInvoices(invoiceData as unknown as Invoice[]);
      }

      // 2. Fetch Reminder Audit Logs
      const { data: logData, error: logError } = await supabase
        .from('reminder_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(10);

      if (logError) {
        console.error('Supabase audit query error:', logError.message);
      } else if (logData) {
        setAuditLogs(logData as AuditLog[]);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('Error fetching dashboard data:', err.message);
      } else {
        console.error('An unexpected error occurred while fetching dashboard data.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute Dashboard Metrics
  const totalOutstanding = invoices.reduce((acc, inv) => acc + Number(inv.amount || 0), 0);
  const highRiskInvoices = invoices.filter((inv) => inv.risk_score >= 70);
  const highRiskExposure = highRiskInvoices.reduce((acc, inv) => acc + Number(inv.amount || 0), 0);
  const avgRiskScore = invoices.length > 0 
    ? Math.round(invoices.reduce((acc, inv) => acc + Number(inv.risk_score || 0), 0) / invoices.length)
    : 0;

  const handleOpenReminder = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsReminderModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      {/* Header Bar */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              DuoCollect Copilot
            </h1>
          </div>
          <p className="text-slate-400 mt-1 text-sm">
            Autonomous Accounts Receivable Collections & Risk-Adaptive Nudges
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg transition text-sm flex items-center gap-2"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-lg shadow-indigo-600/20 transition flex items-center gap-2 text-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import CSV Dataset
          </button>
        </div>
      </div>

      {/* Metric KPIs */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Outstanding</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            ₹{totalOutstanding.toLocaleString('en-IN')}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Across {invoices.length} total active invoices</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">High Risk Exposure</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400">
            ₹{highRiskExposure.toLocaleString('en-IN')}
          </p>
          <span className="text-xs text-rose-500/80 mt-1 block">{highRiskInvoices.length} invoices require immediate nudge</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Portfolio Risk</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {avgRiskScore} <span className="text-sm font-normal text-slate-400">/ 100</span>
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Dynamic score based on days overdue</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Audit Dispatches</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white">{auditLogs.length}</p>
          <span className="text-xs text-slate-500 mt-1 block">Logged automated reminder dispatches</span>
        </div>
      </div>

      {/* Main Content: Invoice Table */}
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Accounts Receivable Ledger</h2>
            <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
              {invoices.length} Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Debtor / Company</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4 text-center">Risk Score</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      Loading invoice records from Supabase...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No invoices found. Click &quot;Import CSV Dataset&quot; to populate your ledger.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const isHighRisk = inv.risk_score >= 70;
                    const isMediumRisk = inv.risk_score >= 40 && inv.risk_score < 70;

                    return (
                      <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-4 px-4 font-mono text-slate-200 font-medium">
                          {inv.invoice_number}
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-medium text-white">
                            {inv.customers?.name || 'Direct Client'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {inv.customers?.company_name || inv.customers?.email || 'N/A'}
                          </div>
                        </td>
                        <td className="py-4 px-4 font-semibold text-slate-100">
                          {inv.currency || '₹'}{Number(inv.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-4 text-slate-400">
                          {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN') : 'N/A'}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isHighRisk
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : isMediumRisk
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {inv.risk_score} / 100
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="capitalize text-xs text-slate-400 bg-slate-800/80 px-2 py-1 rounded">
                            {inv.status || 'overdue'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleOpenReminder(inv)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-medium transition"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Send Nudge
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Trail Section */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
          <h3 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            Recent Collections Activity & Audit Trail
          </h3>

          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-500">No automated dispatches recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg text-xs gap-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[10px] font-mono uppercase">
                      {log.stage || 'nudge'}
                    </span>
                    <span className="text-slate-300 font-medium">{log.subject}</span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-500">
                    <span>To: {log.recipient_email}</span>
                    <span>{new Date(log.sent_at).toLocaleTimeString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CSV Uploader Modal */}
      {isCsvModalOpen && (
        <CsvUploaderModal
          isOpen={isCsvModalOpen}
          onClose={() => setIsCsvModalOpen(false)}
          onSuccess={fetchDashboardData}
        />
      )}

      {/* Gemini AI Reminder Modal */}
      {isReminderModalOpen && selectedInvoice && (
        <ReminderModal
          isOpen={isReminderModalOpen}
          invoice={selectedInvoice}
          onClose={() => setIsReminderModalOpen(false)}
          onDispatchSuccess={fetchDashboardData}
        />
      )}
    </div>
  );
}