'use client';

import { useState } from 'react';

export interface CsvUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

export default function CsvUploaderModal({
  isOpen,
  onClose,
  onSuccess,
}: CsvUploaderModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatusMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setStatusMessage({ type: 'error', text: 'Please select a CSV file to upload.' });
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload CSV file.');
      }

      setStatusMessage({ type: 'success', text: 'CSV uploaded and processed successfully!' });

      // Notify parent page to refresh invoice data
      await onSuccess();

      // Close modal after successful delay
      setTimeout(() => {
        onClose();
        setFile(null);
        setStatusMessage(null);
      }, 1500);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'An error occurred during file upload.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 dark:text-white">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
          <h3 className="text-xl font-bold">Import Invoices via CSV</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Upload Form */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Select CSV File</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950 dark:file:text-indigo-400"
          />
        </div>

        {/* Status Notification */}
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

        {/* Action Controls */}
        <div className="mt-6 flex justify-end gap-3 border-t pt-4 dark:border-slate-800">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      </div>
    </div>
  );
}