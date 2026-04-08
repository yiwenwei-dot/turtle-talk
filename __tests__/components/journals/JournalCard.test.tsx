import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { JournalCard } from '@/app/components/journals/JournalCard';
import type { Journal } from '@/lib/db/types';

// Minimal base64 for a 1-byte webm (just needs to be valid base64)
const FAKE_BASE64 = btoa('fake-audio-data');

const MOCK_JOURNAL: Journal = {
  id: 'journal-1',
  childId: 'child-1',
  createdAt: '2026-01-15T10:30:00.000Z',
  audioBase64: FAKE_BASE64,
};

// Mock URL.createObjectURL / revokeObjectURL (not available in jsdom)
beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  global.URL.revokeObjectURL = jest.fn();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('JournalCard', () => {
  it('renders the formatted date from journal.createdAt', () => {
    render(<JournalCard journal={MOCK_JOURNAL} />);
    // The date text should appear somewhere in the card
    // Jan 15, 2026 — exact format depends on locale; just check the year is present
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('renders a Play button with correct aria-label when not playing', () => {
    render(<JournalCard journal={MOCK_JOURNAL} />);
    const playButton = screen.getByRole('button', { name: 'Play' });
    expect(playButton).toBeInTheDocument();
  });

  it('renders a Remove button when onDelete is provided', () => {
    render(<JournalCard journal={MOCK_JOURNAL} onDelete={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('does not render a Remove button when onDelete is omitted', () => {
    render(<JournalCard journal={MOCK_JOURNAL} />);
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  it('calls onDelete with the journal id when Remove is clicked', () => {
    const onDelete = jest.fn();
    render(<JournalCard journal={MOCK_JOURNAL} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onDelete).toHaveBeenCalledWith('journal-1');
  });

  it('renders a hidden audio element with a blob src', () => {
    const { container } = render(<JournalCard journal={MOCK_JOURNAL} />);
    const audio = container.querySelector('audio');
    expect(audio).toBeInTheDocument();
    expect(audio?.src).toContain('blob:mock-url');
    expect(audio?.style.display).toBe('none');
  });

  it('uses the Card UI primitive as the outer container (data-variant attribute)', () => {
    const { container } = render(<JournalCard journal={MOCK_JOURNAL} />);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveAttribute('data-variant');
  });
});
