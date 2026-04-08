import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IconButton } from '@/app/components/ui/IconButton';

describe('IconButton', () => {
  it('renders with aria-label', () => {
    render(<IconButton aria-label="Mute"><span /></IconButton>);
    expect(screen.getByRole('button', { name: /mute/i })).toBeInTheDocument();
  });

  it('calls onClick', async () => {
    const fn = jest.fn();
    render(<IconButton aria-label="test" onClick={fn}><span /></IconButton>);
    await userEvent.click(screen.getByRole('button'));
    expect(fn).toHaveBeenCalled();
  });

  it('renders ghost variant by default', () => {
    render(<IconButton aria-label="test"><span /></IconButton>);
    expect(screen.getByRole('button').getAttribute('data-variant')).toBe('ghost');
  });

  it('renders danger variant', () => {
    render(<IconButton aria-label="test" variant="danger"><span /></IconButton>);
    expect(screen.getByRole('button').getAttribute('data-variant')).toBe('danger');
  });

  it('renders primary variant', () => {
    render(<IconButton aria-label="test" variant="primary"><span /></IconButton>);
    expect(screen.getByRole('button').getAttribute('data-variant')).toBe('primary');
  });

  it('renders gold variant', () => {
    render(<IconButton aria-label="test" variant="gold"><span /></IconButton>);
    expect(screen.getByRole('button').getAttribute('data-variant')).toBe('gold');
  });

  it('is disabled when prop set', () => {
    render(<IconButton aria-label="test" disabled><span /></IconButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders at default 64px size', () => {
    render(<IconButton aria-label="test"><span /></IconButton>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveStyle({ width: 'var(--tt-icon-btn-size)' });
  });

  it('accepts custom size', () => {
    render(<IconButton aria-label="test" size={44}><span /></IconButton>);
    expect(screen.getByRole('button')).toHaveStyle({ width: '44px' });
  });

  it('forwards className', () => {
    render(<IconButton aria-label="test" className="my-class"><span /></IconButton>);
    expect(screen.getByRole('button').className).toContain('my-class');
  });
});
