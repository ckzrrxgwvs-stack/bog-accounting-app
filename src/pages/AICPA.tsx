// AI CPA Chat interface

import React, { useState, useRef, useEffect } from 'react';
import { useAIStore } from '@/stores/aiStore';
import { Send, RefreshCw, Settings, Maximize2, Minimize2 } from 'lucide-react';
import type { ChatMessage } from '@/types';

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'USER';
  const isAssistant = message.role === 'ASSISTANT';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-black text-white'
            : isAssistant
            ? 'bg-gray-100 text-black'
            : 'bg-gray-200 text-gray-600 italic'
        }`}
      >
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        {isAssistant && message.model && (
          <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-400">
            {message.model} • {message.tokens} tokens • {message.latency}ms
          </div>
        )}
        <div className="mt-1 text-xs opacity-50">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-gray-100 rounded-lg px-4 py-3">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function SuggestedQuestions() {
  const { sendMessage } = useAIStore();
  const questions = [
    'What was our revenue last quarter?',
    'Show me all outstanding invoices',
    'What are our top expenses?',
    'Compare actual vs budget for this month',
    'Generate a cash flow summary',
  ];

  return (
    <div className="p-4 border-t border-gray-200">
      <p className="text-xs text-gray-500 mb-2">Suggested questions:</p>
      <div className="flex flex-wrap gap-2">
        {questions.map((q) => (
          <button
            key={q}
            onClick={() => sendMessage(q)}
            className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full text-gray-700 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AICPA() {
  const { messages, isTyping, sendMessage, clearMessages, createSession, currentSession } = useAIStore();
  const [input, setInput] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!currentSession && messages.length === 0) {
      createSession();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={`flex flex-col h-[calc(100vh-8rem)] bg-white border border-gray-200 rounded-lg overflow-hidden ${
      isFullscreen ? 'fixed inset-4 z-50' : ''
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-white font-bold">
            AI
          </div>
          <div className="ml-3">
            <h2 className="font-semibold text-black">AI CPA Assistant</h2>
            <p className="text-xs text-gray-500">Your virtual accounting advisor</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={clearMessages}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title="Clear chat"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <div className="w-8 h-8 bg-black rounded text-white font-bold">AI</div>
            </div>
            <h3 className="text-lg font-semibold text-black mb-2">Welcome to AI CPA Assistant</h3>
            <p className="text-gray-500 max-w-md mb-6">
              I can help you with financial analysis, account inquiries, transaction lookups,
              report generation, and answering questions about your company's accounting data.
            </p>
            <p className="text-sm text-gray-400">Try asking me something like:</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isTyping && <TypingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions (only when no messages) */}
      {messages.length === 0 && <SuggestedQuestions />}

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your finances..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="flex-shrink-0 w-12 h-12 bg-black text-white rounded-lg flex items-center justify-center hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}