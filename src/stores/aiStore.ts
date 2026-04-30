// Zustand store for AI CPA chat

import { create } from 'zustand';
import type { ChatMessage, ChatSession } from '@/types';

interface AIState {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isTyping: boolean;

  // Actions
  createSession: () => void;
  selectSession: (sessionId: string) => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  endSession: () => void;
}

export const useAIStore = create<AIState>((set, get) => ({
  sessions: [],
  currentSession: null,
  messages: [],
  isLoading: false,
  isTyping: false,

  createSession: () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'New Conversation',
      isActive: true,
      userId: 'current-user',
      companyId: 'current-company',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
    };

    set((state) => ({
      sessions: [newSession, ...state.sessions],
      currentSession: newSession,
      messages: [],
    }));
  },

  selectSession: (sessionId: string) => {
    const session = get().sessions.find((s) => s.id === sessionId);
    if (session) {
      set({
        currentSession: session,
        messages: session.messages,
      });
    }
  },

  sendMessage: async (content: string) => {
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sessionId: get().currentSession?.id || '',
      role: 'USER',
      content,
      userId: 'current-user',
      createdAt: new Date(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isTyping: true,
    }));

    // Simulate AI response (in production, this would call OpenAI API)
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        sessionId: get().currentSession?.id || '',
        role: 'ASSISTANT',
        content: `I understand you're asking about: "${content}"

As your AI CPA Assistant, I can help you with:

• Financial analysis and reporting
• Account inquiries and transactions
• Accounts Payable and Receivable management
• Budget comparisons and forecasting
• Tax and compliance questions

Please ask any specific question about your company's financial data, and I'll provide detailed, professional insights based on your accounting records.`,
        model: 'gpt-4',
        tokens: content.length * 2,
        latency: Math.floor(Math.random() * 1000) + 500,
        createdAt: new Date(),
      };

      set((state) => ({
        messages: [...state.messages, aiResponse],
        isTyping: false,
      }));
    }, 1500);
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  endSession: () => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === state.currentSession?.id
          ? { ...s, isActive: false, endedAt: new Date() }
          : s
      ),
      currentSession: null,
      messages: [],
    }));
  },
}));