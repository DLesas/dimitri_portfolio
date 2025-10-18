'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardBody, Button, Input, Select, SelectItem, Spinner } from '@heroui/react';
import { fetchAvailableCompanies } from '../actions/fetch-companies';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

type Company = {
  companyId: string;
  name: string;
  sector: string | null;
  ticker: string | null;
};

export default function ChatWindow() {
  const [isOpen, setIsOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Simple useChat setup following Vercel's pattern
  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/Felix/api/chat',
    }),
  });

  const isDisabled = status !== 'ready';

  // Load companies when chat is opened
  useEffect(() => {
    if (isOpen && companies.length === 0 && !isLoadingCompanies) {
      loadCompanies();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function loadCompanies() {
    setIsLoadingCompanies(true);
    try {
      const result = await fetchAvailableCompanies();
      if (result.success) {
        setCompanies(result.companies);
        if (result.companies.length > 0) {
          setSelectedCompanyId(result.companies[0].companyId);
        }
      } else {
        console.error('Failed to load companies:', result.error);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setIsLoadingCompanies(false);
    }
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCompanyChange = (keys: 'all' | Set<React.Key>) => {
    if (keys === 'all') return;
    const selectedKey = Array.from(keys)[0] as string;
    setSelectedCompanyId(selectedKey);
    setMessages([]);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          color="primary"
          size="lg"
          isIconOnly
          className="h-14 w-14 rounded-full shadow-lg"
          onPress={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
              />
            </svg>
          )}
        </Button>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-40 w-96 h-[600px]"
          >
            <Card className="h-full flex flex-col shadow-2xl">
              <CardHeader className="flex-shrink-0 border-b border-default-200">
                <div className="w-full space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold">Document Chat</h3>
                    <p className="text-xs text-default-500">Ask questions about company documents</p>
                  </div>

                  {/* Company Selector */}
                  {isLoadingCompanies ? (
                    <div className="flex justify-center py-2">
                      <Spinner size="sm" />
                    </div>
                  ) : companies.length > 0 ? (
                    <Select
                      label="Company"
                      size="sm"
                      selectedKeys={new Set([selectedCompanyId])}
                      onSelectionChange={handleCompanyChange}
                    >
                      {companies.map((company) => (
                        <SelectItem key={company.companyId} textValue={company.name}>
                          {company.name}{company.ticker ? ` (${company.ticker})` : ''}
                        </SelectItem>
                      ))}
                    </Select>
                  ) : (
                    <p className="text-xs text-warning">
                      No companies available. Upload documents first.
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardBody className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-default-400 space-y-1 px-4">
                      <p className="text-sm font-medium">No messages yet</p>
                      <p className="text-xs">Ask a question about the documents</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg p-2.5 text-sm ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-default-100 text-foreground'
                          }`}
                        >
                          {message.parts.map((part, index) =>
                            part.type === 'text' ? (
                              <p key={index} className="whitespace-pre-wrap break-words">
                                {part.text}
                              </p>
                            ) : null
                          )}
                        </div>
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </CardBody>

              {/* Input Area */}
              <div className="flex-shrink-0 p-4 border-t border-default-200">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (input.trim() && selectedCompanyId) {
                      sendMessage(
                        { text: input },
                        {
                          body: {
                            companyId: selectedCompanyId,
                          },
                        }
                      );
                      setInput('');
                    }
                  }}
                  className="flex gap-2"
                >
                  <Input
                    placeholder="Type a message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isDisabled || !selectedCompanyId || companies.length === 0}
                    size="sm"
                    className="flex-1"
                  />
                  <Button
                    color="primary"
                    size="sm"
                    type="submit"
                    disabled={isDisabled || !input.trim() || !selectedCompanyId}
                    isLoading={isDisabled}
                    isIconOnly
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                      />
                    </svg>
                  </Button>
                </form>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
