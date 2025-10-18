'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@heroui/react';
import TimelineDashboard from '../components/TimelineDashboard';
import InlineChatPanel from '../components/InlineChatPanel';
import UploadDocumentModal from '../components/UploadDocumentModal';

interface UploadResult {
  companyId?: string;
  documentId?: string;
  success: boolean;
}

export default function DemoPage() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  const handleUploadSuccess = (result: UploadResult) => {
    // Refresh timeline when a new document is uploaded
    if (result.companyId) {
      setSelectedCompanyId(result.companyId);
    }
    // Close modal after a delay so user can see success message
    setTimeout(() => {
      setIsUploadModalOpen(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80 p-6">
      <div className="max-w-[1800px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">Document Analysis Dashboard</h1>
              <p className="text-default-500 mt-1">
                Timeline visualization and document chat interface
              </p>
            </div>
            <Button
              color="primary"
              size="lg"
              onPress={() => setIsUploadModalOpen(true)}
              startContent={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
              }
            >
              Upload Document
            </Button>
          </div>

          {/* Main Layout: Timeline + Chat */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timeline Dashboard - Takes up 2 columns on large screens */}
            <div className="lg:col-span-2">
              <TimelineDashboard
                defaultCompanyId={selectedCompanyId}
                onCompanyChange={setSelectedCompanyId}
              />
            </div>

            {/* Chat Panel - Takes up 1 column on large screens */}
            <div className="lg:col-span-1">
              <InlineChatPanel
                defaultCompanyId={selectedCompanyId}
                className="h-full"
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Upload Modal */}
      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}
