import React from 'react';
import { render, screen } from '@testing-library/react';
import AppreciationPageInner from '@/app/components/appreciation/AppreciationPageInner';

// ── next/navigation ──────────────────────────────────────────────────────────
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/appreciation',
  useSearchParams: () => ({ get: () => null }),
}));

// ── hooks ────────────────────────────────────────────────────────────────────
const mockUseChildSession = jest.fn(() => ({ child: null, isLoading: false, refetch: jest.fn() }));
jest.mock('@/app/hooks/useChildSession', () => ({
  useChildSession: (...args: unknown[]) => mockUseChildSession(...args),
}));

jest.mock('@/app/hooks/useTree', () => ({
  useTree: () => ({
    tree: null,
    isLoading: false,
    refetch: jest.fn(),
    placeOnTree: jest.fn(),
  }),
}));

jest.mock('@/app/hooks/useEncouragement', () => ({
  useEncouragement: () => ({ items: [], isLoading: false, refetch: jest.fn() }),
}));

jest.mock('@/app/hooks/useWishList', () => ({
  useWishList: () => ({ items: [], isLoading: false, refetch: jest.fn() }),
}));

const mockUsePersonalMemory = jest.fn(() => ({
  childName: null as string | null,
  messages: [] as unknown[],
  topics: [] as unknown[],
  saveChildName: jest.fn(),
  saveMessages: jest.fn(),
  saveTopic: jest.fn(),
  clearAll: jest.fn(),
}));
jest.mock('@/app/hooks/usePersonalMemory', () => ({
  usePersonalMemory: (...args: unknown[]) => mockUsePersonalMemory(...args),
}));

jest.mock('@/app/hooks/useLocalTree', () => ({
  useLocalTree: () => ({
    placedDecorations: [],
    unplacedDecorations: [],
    placedCount: 0,
    growthStage: 0,
    placeDecoration: jest.fn(),
  }),
}));

// ── sub-components ───────────────────────────────────────────────────────────
jest.mock('@/app/components/ChildLoginModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/app/appreciation/ChristmasTree', () => ({
  __esModule: true,
  default: () => <div data-testid="christmas-tree" />,
}));

jest.mock('@/app/appreciation/DecorationBox', () => ({
  __esModule: true,
  default: () => <div data-testid="decoration-box" />,
}));

// ── tests ────────────────────────────────────────────────────────────────────
describe('AppreciationPageInner', () => {
  it('renders without crashing (smoke test)', () => {
    const { container } = render(<AppreciationPageInner />);
    expect(container).toBeTruthy();
  });

  it('shows the tree heading for guest users', () => {
    render(<AppreciationPageInner />);
    // childName is null → falls back to "Explorer"
    expect(screen.getByText("Explorer's Tree")).toBeInTheDocument();
  });

  it('shows the guest decoration subtitle', () => {
    render(<AppreciationPageInner />);
    expect(screen.getByText('Decorate it with your mission rewards!')).toBeInTheDocument();
  });

  it('shows progress text for placed count', () => {
    render(<AppreciationPageInner />);
    expect(screen.getByText('0 of 10 — fill it up to unlock a wish!')).toBeInTheDocument();
  });

  it('renders the christmas tree', () => {
    render(<AppreciationPageInner />);
    expect(screen.getByTestId('christmas-tree')).toBeInTheDocument();
  });

  it('renders the decoration picker button', () => {
    render(<AppreciationPageInner />);
    expect(screen.getByText('Pick a cheer and put it on your tree')).toBeInTheDocument();
  });

  it('shows the "Log in so your tree is saved" nudge for guests', () => {
    render(<AppreciationPageInner />);
    expect(screen.getByText('Log in so your tree is saved')).toBeInTheDocument();
  });

  it('shows guest missions message in wish-list section', () => {
    render(<AppreciationPageInner />);
    expect(
      screen.getByText('Complete more missions with Shelly to earn more decorations!')
    ).toBeInTheDocument();
  });

  it('shows the child name in the heading when childName is set', () => {
    mockUsePersonalMemory.mockReturnValueOnce({
      childName: 'Aria',
      messages: [],
      topics: [],
      saveChildName: jest.fn(),
      saveMessages: jest.fn(),
      saveTopic: jest.fn(),
      clearAll: jest.fn(),
    });
    render(<AppreciationPageInner />);
    expect(screen.getByText("Aria's Tree")).toBeInTheDocument();
  });

  it('renders "My Tree" heading when a child session is active', () => {
    mockUseChildSession.mockReturnValueOnce({
      child: { childId: 'c1', firstName: 'Sam', emoji: '🐢' },
      isLoading: false,
      refetch: jest.fn(),
    });
    render(<AppreciationPageInner />);
    expect(screen.getByText('My Tree')).toBeInTheDocument();
  });

  it('shows logged-in subtitle when child session is active', () => {
    mockUseChildSession.mockReturnValueOnce({
      child: { childId: 'c1', firstName: 'Sam', emoji: '🐢' },
      isLoading: false,
      refetch: jest.fn(),
    });
    render(<AppreciationPageInner />);
    expect(screen.getByText('Decorate it with cheers from your grown-up!')).toBeInTheDocument();
  });
});
