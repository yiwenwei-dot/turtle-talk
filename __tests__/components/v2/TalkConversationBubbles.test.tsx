import React from 'react';
import { render, screen } from '@testing-library/react';
import TalkConversationBubbles from '@/app/v2/components/TalkConversationBubbles';

describe('TalkConversationBubbles', () => {
  it('shows placeholder when no messages', () => {
    render(<TalkConversationBubbles messages={[]} />);
    expect(
      screen.getByText(/Tap the button below to talk with Tammy\./i),
    ).toBeInTheDocument();
  });

  it('shows placeholder when messages is empty and pendingUserTranscript is empty', () => {
    render(<TalkConversationBubbles messages={[]} pendingUserTranscript={null} />);
    expect(
      screen.getByText(/Tap the button below to talk with Tammy\./i),
    ).toBeInTheDocument();
  });

  it('shows assistant bubble when messages has one from assistant', () => {
    render(
      <TalkConversationBubbles
        messages={[{ role: 'assistant', content: 'Hello there!' }]}
      />,
    );
    expect(screen.getByText('Hello there!')).toBeInTheDocument();
  });

  it('shows user bubble when messages has one from user', () => {
    render(
      <TalkConversationBubbles messages={[{ role: 'user', content: 'Hi Tammy' }]} />,
    );
    expect(screen.getByText('Hi Tammy')).toBeInTheDocument();
  });

  it('shows pending user transcript as user bubble when no messages', () => {
    render(
      <TalkConversationBubbles messages={[]} pendingUserTranscript="I am speaking..." />,
    );
    expect(screen.getByText('I am speaking...')).toBeInTheDocument();
  });
});
