import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConversationView } from '@/app/components/talk/ConversationView';

// Mock next/navigation (including usePathname used by BottomNav)
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/talk',
}));

// Mock all hooks used by ConversationView
jest.mock('@/app/hooks/useVoiceSession', () => ({
  useVoiceSession: () => ({
    state: 'idle',
    mood: 'idle',
    messages: [],
    pendingUserTranscript: null,
    isMuted: false,
    error: null,
    isMeaningful: false,
    startListening: jest.fn(),
    toggleMute: jest.fn(),
    endConversation: jest.fn(),
  }),
}));

jest.mock('@/app/hooks/useMissions', () => ({
  useMissions: () => ({
    missions: [],
    activeMissions: [],
    completedMissions: [],
    addMission: jest.fn(),
    completeMission: jest.fn(),
    deleteMission: jest.fn(),
  }),
}));

jest.mock('@/app/hooks/usePersonalMemory', () => ({
  usePersonalMemory: () => ({
    childName: null,
    messages: [],
    topics: [],
    saveChildName: jest.fn(),
    saveMessages: jest.fn(),
    saveTopic: jest.fn(),
    clearAll: jest.fn(),
  }),
}));

jest.mock('@/app/hooks/useChildSession', () => ({
  useChildSession: () => ({
    child: null,
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

// Mock createVoiceProvider to return a stub VoiceConversationProvider
jest.mock('@/lib/speech/voice', () => ({
  createVoiceProvider: () => ({
    name: 'mock',
    start: jest.fn(),
    stop: jest.fn(),
    setMuted: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  }),
}));

// Mock child components that use browser APIs not available in jsdom
jest.mock('@/app/components/talk/ConversationBubblesCard', () => ({
  __esModule: true,
  default: () => <div data-testid="conversation-bubbles-card" />,
}));

jest.mock('@/app/components/talk/ConversationSubtitles', () => ({
  __esModule: true,
  default: () => <div data-testid="conversation-subtitles" />,
}));

jest.mock('@/app/components/BottomNav', () => ({
  __esModule: true,
  default: () => <div data-testid="bottom-nav" />,
}));

describe('ConversationView', () => {
  it('renders without crashing', () => {
    render(<ConversationView />);
    expect(screen.getByText('TurtleTalk')).toBeTruthy();
  });
});
