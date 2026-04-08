import { render, screen } from '@testing-library/react';
import { Card } from '@/app/components/ui/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Hello Card</Card>);
    expect(screen.getByText('Hello Card')).toBeInTheDocument();
  });

  it('default variant renders with data-variant="default"', () => {
    render(<Card>content</Card>);
    const el = screen.getByText('content');
    expect(el).toHaveAttribute('data-variant', 'default');
  });

  it('sm variant renders with data-variant="sm"', () => {
    render(<Card variant="sm">content</Card>);
    const el = screen.getByText('content');
    expect(el).toHaveAttribute('data-variant', 'sm');
  });

  it('forwards className', () => {
    render(<Card className="my-custom-class">content</Card>);
    const el = screen.getByText('content');
    expect(el).toHaveClass('my-custom-class');
  });

  it('forwards style prop', () => {
    render(<Card style={{ opacity: 0.5 }}>content</Card>);
    const el = screen.getByText('content');
    expect(el).toHaveStyle({ opacity: 0.5 });
  });

  it('default variant has borderRadius CSS var applied', () => {
    render(<Card>content</Card>);
    const el = screen.getByText('content');
    expect(el).toHaveStyle({ borderRadius: 'var(--tt-radius-card)' });
  });

  it('sm variant has borderRadius CSS var applied', () => {
    render(<Card variant="sm">content</Card>);
    const el = screen.getByText('content');
    expect(el).toHaveStyle({ borderRadius: 'var(--tt-radius-card-sm)' });
  });
});
