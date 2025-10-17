'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Card } from '@heroui/react';
import TimelineDashboard from '../components/TimelineDashboard';
import InlineChatPanel from '../components/InlineChatPanel';
import UploadDocumentModal from '../components/UploadDocumentModal';

export default function DemoPage() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  const handleUploadSuccess = (result: any) => {
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

          {/* Info Card */}
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">About this Dashboard</h3>
              <div className="grid md:grid-cols-2 gap-6 text-sm text-default-600">
                <div>
                  <h4 className="font-semibold text-default-900 mb-2">Timeline Visualization</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>View extracted data across time</li>
                    <li>Filter by data layers (TB, PAQL, PAQN)</li>
                    <li>Click points for detailed information</li>
                    <li>Compare across different companies</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-default-900 mb-2">Document Chat</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Ask questions about uploaded documents</li>
                    <li>RAG-powered responses with citations</li>
                    <li>Context-aware answers from embeddings</li>
                    <li>Switch between companies seamlessly</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-default-900 mb-2">Data Layers</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li><strong>TB:</strong> Time-Based events and timelines</li>
                    <li><strong>PAQL:</strong> Qualitative business information</li>
                    <li><strong>PAQN:</strong> Quantitative financial metrics</li>
                    <li><strong>Document:</strong> Document placement markers</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-default-900 mb-2">Document Processing</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>AI-powered PDF structure extraction</li>
                    <li>Semantic section identification</li>
                    <li>Automatic metric extraction</li>
                    <li>Vector embeddings for search</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>
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
