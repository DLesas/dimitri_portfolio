'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardBody, Button, Input, Select, SelectItem, Spinner, Divider } from '@heroui/react';
import { fetchAvailableCompanies } from '../actions/fetch-companies';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

type Company = {
  companyId: string;
  name: string;
  sector: string | null;
  ticker: string | null;
};

interface InlineChatPanelProps {
  defaultCompanyId?: string;
  className?: string;
}

export default function InlineChatPanel({ defaultCompanyId, className }: InlineChatPanelProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(defaultCompanyId || '');
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

  // Load companies on mount
  useEffect(() => {
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update selected company if prop changes
  useEffect(() => {
    if (defaultCompanyId && defaultCompanyId !== selectedCompanyId) {
      setSelectedCompanyId(defaultCompanyId);
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultCompanyId]);

  async function loadCompanies() {
    setIsLoadingCompanies(true);
    try {
      const result = await fetchAvailableCompanies();
      if (result.success) {
        setCompanies(result.companies);
        if (!selectedCompanyId && result.companies.length > 0) {
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

  const handleSubmit = (e: React.FormEvent) => {
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
  };

  return (
    <Card className={`flex flex-col ${className}`}>
      <CardHeader className="flex-shrink-0">
        <div className="w-full space-y-3">
          <div>
            <h3 className="text-xl font-semibold">Document Chat</h3>
            <p className="text-sm text-default-500">Ask questions about company documents</p>
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
              placeholder="Select a company"
            >
              {companies.map((company) => (
                <SelectItem key={company.companyId} textValue={company.name}>
                  {company.name}{company.ticker ? ` (${company.ticker})` : ''}
                </SelectItem>
              ))}
            </Select>
          ) : (
            <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
              <p className="text-sm text-warning-700">
                No companies available. Upload documents first.
              </p>
            </div>
          )}
        </div>
      </CardHeader>

      <Divider />

      <CardBody className="flex-1 overflow-y-auto p-4 min-h-[300px] max-h-[500px]">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-default-400 space-y-2 px-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-12 h-12 mx-auto opacity-50"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                />
              </svg>
              <p className="font-medium">No messages yet</p>
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
                  className={`max-w-[85%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-default-100 text-foreground'
                  }`}
                >
                  {message.parts.map((part, index) =>
                    part.type === 'text' ? (
                      <p key={index} className="text-sm whitespace-pre-wrap break-words">
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

      <Divider />

      {/* Input Area */}
      <div className="flex-shrink-0 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isDisabled || !selectedCompanyId || companies.length === 0}
            size="md"
            className="flex-1"
          />
          <Button
            color="primary"
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
              className="w-5 h-5"
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
  );
}
