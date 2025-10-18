'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Progress } from '@heroui/react';
import { processDocument } from '../process-document';

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

interface ProcessingResult {
  success: boolean;
  companyId?: string;
  documentId?: string;
  documentTitle?: string;
  company?: string;
  documentDate?: string;
  error?: string;
  sections?: number;
  totalChunks?: number;
}

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: ProcessingResult) => void;
}

export default function UploadDocumentModal({ isOpen, onClose, onSuccess }: UploadDocumentModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStatus('idle');
      setResult(null);
      setProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    setProgress(10);

    try {
      // Create FormData with the file
      const formData = new FormData();
      formData.append('pdf', file);

      setStatus('processing');
      setProgress(30);

      // Call the server action
      const response = await processDocument(formData);

      if (response.success) {
        setStatus('success');
        setProgress(100);
        const successResult = {
          success: true,
          companyId: response.companyId,
          documentId: response.documentId,
          documentTitle: response.documentTitle,
          company: response.company,
          documentDate: response.documentDate,
          sections: response.sections,
          totalChunks: response.totalChunks,
        };
        setResult(successResult);

        // Notify parent component
        if (onSuccess) {
          onSuccess(successResult);
        }
      } else {
        setStatus('error');
        setResult({
          success: false,
          error: response.error || 'Unknown error occurred',
        });
      }
    } catch (error) {
      setStatus('error');
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process document',
      });
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setFile(null);
    setStatus('idle');
    setResult(null);
    setProgress(0);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="2xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="text-2xl font-semibold">Upload Document</h2>
              <p className="text-sm text-default-500 font-normal">
                Upload a PDF document to extract structure, sections, and generate embeddings
              </p>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-6">
                {/* File Input */}
                <div>
                  <label
                    htmlFor="file-upload"
                    className="block text-sm font-medium mb-2"
                  >
                    Select PDF File
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    disabled={status === 'processing' || status === 'uploading'}
                    className="block w-full text-sm text-default-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-primary file:text-primary-foreground
                      hover:file:bg-primary/90
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {file && (
                    <p className="mt-2 text-sm text-default-500">
                      Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                {/* Progress Bar */}
                {(status === 'uploading' || status === 'processing') && (
                  <div className="space-y-2">
                    <Progress
                      value={progress}
                      color="primary"
                      className="w-full"
                    />
                    <p className="text-sm text-center text-default-500">
                      {status === 'uploading' && 'Uploading file...'}
                      {status === 'processing' && 'Extracting structure and generating embeddings...'}
                    </p>
                  </div>
                )}

                {/* Results */}
                {result && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className={`border-2 rounded-lg p-4 ${
                      result.success
                        ? 'border-success bg-success-50 dark:bg-success-900/20 dark:border-success-800'
                        : 'border-danger bg-danger-50 dark:bg-danger-900/20 dark:border-danger-800'
                    }`}
                  >
                    <h3 className={`text-lg font-semibold mb-3 ${
                      result.success
                        ? 'text-success-900 dark:text-success-100'
                        : 'text-danger-900 dark:text-danger-100'
                    }`}>
                      {result.success ? 'Success!' : 'Error'}
                    </h3>
                    {result.success ? (
                      <div className="space-y-3">
                        <p className="text-success-800 dark:text-success-200">Document processed successfully!</p>
                        <div className="grid grid-cols-2 gap-3">
                          {result.company && (
                            <div className="bg-white dark:bg-default-100 p-3 rounded-lg">
                              <p className="text-xs text-default-500">Company</p>
                              <p className="font-semibold mt-1 text-foreground">{result.company}</p>
                            </div>
                          )}
                          {result.documentTitle && (
                            <div className="bg-white dark:bg-default-100 p-3 rounded-lg">
                              <p className="text-xs text-default-500">Document</p>
                              <p className="font-semibold mt-1 text-sm text-foreground">{result.documentTitle}</p>
                            </div>
                          )}
                          <div className="bg-white dark:bg-default-100 p-3 rounded-lg">
                            <p className="text-xs text-default-500">Sections Found</p>
                            <p className="text-xl font-bold mt-1 text-foreground">{result.sections}</p>
                          </div>
                          <div className="bg-white dark:bg-default-100 p-3 rounded-lg">
                            <p className="text-xs text-default-500">Total Chunks</p>
                            <p className="text-xl font-bold mt-1 text-foreground">{result.totalChunks}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-danger-700 dark:text-danger-300 font-medium">Failed to process document</p>
                        <p className="text-sm text-danger-900 dark:text-danger-100 font-mono bg-white dark:bg-default-100 p-3 rounded border border-danger-200 dark:border-danger-800">
                          {result.error}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Info */}
                {status === 'idle' && !result && (
                  <div className="bg-default-100 p-4 rounded-lg">
                    <h3 className="text-sm font-semibold mb-2">How it works</h3>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-default-600">
                      <li>AI analyzes the PDF to extract document structure</li>
                      <li>Each section is processed to extract content and metrics</li>
                      <li>Embeddings are generated for similarity search</li>
                      <li>Everything is saved to the database</li>
                    </ol>
                  </div>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                color="danger"
                variant="light"
                onPress={handleClose}
                disabled={status === 'processing' || status === 'uploading'}
              >
                {status === 'success' ? 'Close' : 'Cancel'}
              </Button>
              {status !== 'success' && (
                <Button
                  color="primary"
                  onPress={handleUpload}
                  disabled={!file || status === 'processing' || status === 'uploading'}
                  isLoading={status === 'processing' || status === 'uploading'}
                >
                  Process Document
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
