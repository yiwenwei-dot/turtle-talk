import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TalkEndCallButton from '@/app/v2/components/TalkEndCallButton';

describe('TalkEndCallButton', () => {
  it('in idle state without error shows Start call button', () => {
    const onStart = jest.fn();
    render(
      <TalkEndCallButton
        state="idle"
        hasError={false}
        onEnd={() => {}}
        onRetry={async () => {}}
        onStart={onStart}
      />,
    );
    expect(screen.getByRole('button', { name: /Tap to talk to Shelly/i })).toBeInTheDocument();
  });

  it('calls onStart when Start call is clicked', async () => {
    const onStart = jest.fn();
    render(
      <TalkEndCallButton
        state="idle"
        hasError={false}
        onEnd={() => {}}
        onRetry={async () => {}}
        onStart={onStart}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Tap to talk to Shelly/i }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('in active state shows End call button', () => {
    render(
      <TalkEndCallButton
        state="listening"
        hasError={false}
        onEnd={() => {}}
        onRetry={async () => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /End call/i })).toBeInTheDocument();
  });

  it('calls onEnd when End call is clicked', async () => {
    const onEnd = jest.fn();
    render(
      <TalkEndCallButton
        state="listening"
        hasError={false}
        onEnd={onEnd}
        onRetry={async () => {}}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /End call/i }));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('when hasError and idle shows Try again button', () => {
    render(
      <TalkEndCallButton
        state="idle"
        hasError
        onEnd={() => {}}
        onRetry={async () => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /Try again/i })).toBeInTheDocument();
  });

  it('calls onRetry when Try again is clicked', async () => {
    const onRetry = jest.fn().mockResolvedValue(undefined);
    render(
      <TalkEndCallButton
        state="idle"
        hasError
        onEnd={() => {}}
        onRetry={onRetry}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('in connecting state shows Connecting text', () => {
    render(
      <TalkEndCallButton
        state="connecting"
        hasError={false}
        onEnd={() => {}}
        onRetry={async () => {}}
      />,
    );
    expect(screen.getByText(/Connecting/i)).toBeInTheDocument();
  });
});
