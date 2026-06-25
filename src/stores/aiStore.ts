// Zustand store for AI CPA chat — calls production API (not mock loop).

import { create } from 'zustand';
import type { ChatMessage, ChatSession } from '@/types';
import api from '@/services/api';

interface AIState {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isTyping: boolean;

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

    const res = await api.sendAIMessage(content);

    if (!res.success) {
      const err = res.error ?? 'AI request failed';
      const aiResponse: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        sessionId: get().currentSession?.id || '',
        role: 'ASSISTANT',
        content:
          err.includes('MANUAL') || err.includes('manual')
            ? 'AI CPA is disabled while manual operations mode is on.'
            : err,
        createdAt: new Date(),
      };
      set((state) => ({
        messages: [...state.messages, aiResponse],
        isTyping: false,
      }));
      return;
    }

    const payload = res.data as {
      response?: string;
      model?: string;
      tokens?: number;
      latency?: number;
    };

    const aiResponse: ChatMessage = {
      id: `msg-${Date.now()}-ai`,
      sessionId: get().currentSession?.id || '',
      role: 'ASSISTANT',
      content: payload.response ?? 'No response from AI service.',
      model: payload.model,
      tokens: payload.tokens,
      latency: payload.latency,
      createdAt: new Date(),
    };

    set((state) => ({
      messages: [...state.messages, aiResponse],
      isTyping: false,
    }));
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
