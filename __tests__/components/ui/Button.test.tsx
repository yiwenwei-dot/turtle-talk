import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/app/components/ui/Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders primary variant by default', () => {
    render(<Button>Primary</Button>);
    expect(screen.getByRole('button').getAttribute('data-variant')).toBe('primary');
  });

  it('renders danger variant', () => {
    render(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button').getAttribute('data-variant')).toBe('danger');
  });

  it('renders ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button').getAttribute('data-variant')).toBe('ghost');
  });

  it('renders gold variant', () => {
    render(<Button variant="gold">Gold</Button>);
    expect(screen.getByRole('button').getAttribute('data-variant')).toBe('gold');
  });

  it('renders connect variant with full opacity when not disabled', () => {
    render(<Button variant="connect">Connect</Button>);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('data-variant')).toBe('connect');
    expect(btn).toHaveStyle({ opacity: '1' });
  });

  it('renders with icon', () => {
    render(<Button icon={<span data-testid="icon" />}>With Icon</Button>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('forwards className', () => {
    render(<Button className="tt-tap-shake">Shake</Button>);
    expect(screen.getByRole('button').className).toContain('tt-tap-shake');
  });
});
