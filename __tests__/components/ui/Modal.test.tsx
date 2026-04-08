import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '@/app/components/ui/Modal';

describe('Modal', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    onClose.mockClear();
  });

  it('returns null when open is false', () => {
    const { container } = render(
      <Modal open={false} onClose={onClose}>
        <p>Content</p>
      </Modal>
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders children when open is true', () => {
    render(
      <Modal open={true} onClose={onClose}>
        <p>Hello Modal</p>
      </Modal>
    );
    expect(screen.getByText('Hello Modal')).toBeInTheDocument();
  });

  it('has role="dialog" and aria-modal="true"', () => {
    render(
      <Modal open={true} onClose={onClose}>
        <p>Content</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('calls onClose when backdrop is clicked', () => {
    const { container } = render(
      <Modal open={true} onClose={onClose}>
        <p>Content</p>
      </Modal>
    );
    const dialog = container.querySelector('[role="dialog"]')!;
    // The backdrop is the first child div of the dialog
    const backdrop = dialog.children[0] as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose when panel content is clicked', () => {
    render(
      <Modal open={true} onClose={onClose}>
        <button>Click me</button>
      </Modal>
    );
    fireEvent.click(screen.getByText('Click me'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('applies default maxWidth of 480px', () => {
    const { container } = render(
      <Modal open={true} onClose={onClose}>
        <p>Content</p>
      </Modal>
    );
    const dialog = container.querySelector('[role="dialog"]')!;
    const panel = dialog.children[1] as HTMLElement;
    expect(panel.style.maxWidth).toBe('480px');
  });

  it('accepts a custom maxWidth prop', () => {
    const { container } = render(
      <Modal open={true} onClose={onClose} maxWidth={600}>
        <p>Content</p>
      </Modal>
    );
    const dialog = container.querySelector('[role="dialog"]')!;
    const panel = dialog.children[1] as HTMLElement;
    expect(panel.style.maxWidth).toBe('600px');
  });
});
