import React, { act } from 'react';
import { render, screen } from '@testing-library/react';
import { PullToRetry } from '@/app/components/talk/PullToRetry';

// jsdom does not implement setPointerCapture — stub it
Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
  value: jest.fn(),
  writable: true,
  configurable: true,
});

/** Fire a pointer event with the given clientY by directly setting the property. */
function firePointer(el: HTMLElement, type: string, clientY: number) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clientY', { value: clientY, configurable: true });
  Object.defineProperty(event, 'pointerId', { value: 1, configurable: true });
  Object.defineProperty(event, 'currentTarget', { value: el, configurable: true });
  act(() => { el.dispatchEvent(event); });
}

describe('PullToRetry', () => {
  it('renders children', () => {
    render(
      <PullToRetry>
        <span>child content</span>
      </PullToRetry>,
    );
    expect(screen.getByText('child content')).toBeTruthy();
  });

  it('calls onRetry after a drag >= 60px', () => {
    const onRetry = jest.fn();
    const { container } = render(
      <PullToRetry onRetry={onRetry}>
        <span>child</span>
      </PullToRetry>,
    );
    const div = container.firstChild as HTMLElement;

    firePointer(div, 'pointerdown', 10);
    firePointer(div, 'pointermove', 71); // delta = 61, above threshold

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not call onRetry when drag is shorter than 60px', () => {
    const onRetry = jest.fn();
    const { container } = render(
      <PullToRetry onRetry={onRetry}>
        <span>child</span>
      </PullToRetry>,
    );
    const div = container.firstChild as HTMLElement;

    firePointer(div, 'pointerdown', 10);
    firePointer(div, 'pointermove', 59); // delta = 49, below threshold
    firePointer(div, 'pointerup', 59);

    expect(onRetry).not.toHaveBeenCalled();
  });

  it('does not throw when no onRetry prop is provided', () => {
    const { container } = render(
      <PullToRetry>
        <span>child</span>
      </PullToRetry>,
    );
    const div = container.firstChild as HTMLElement;

    // Should not throw even without onRetry
    firePointer(div, 'pointerdown', 0);
    firePointer(div, 'pointermove', 100);
    firePointer(div, 'pointerup', 100);
  });
});
