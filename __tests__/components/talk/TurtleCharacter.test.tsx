import React from 'react';
import { render, screen } from '@testing-library/react';
import TurtleCharacter from '@/app/components/talk/TurtleCharacter';
import type { TurtleMood } from '@/lib/speech/types';

const moods: TurtleMood[] = ['idle', 'listening', 'talking', 'happy', 'sad', 'confused', 'surprised'];

describe('TurtleCharacter', () => {
  it.each(moods)('renders without crashing for mood: %s', (mood) => {
    const { container } = render(<TurtleCharacter mood={mood} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it.each(moods)('applies correct CSS class for mood: %s', (mood) => {
    const { container } = render(<TurtleCharacter mood={mood} />);
    const svg = container.querySelector('svg');
    // SVG className is SVGAnimatedString in jsdom, use getAttribute instead
    expect(svg?.getAttribute('class')).toContain(`mood-${mood}`);
  });

  it('renders with default size 200', () => {
    const { container } = render(<TurtleCharacter mood="idle" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('200');
    expect(svg?.getAttribute('height')).toBe('200');
  });

  it('renders with custom size', () => {
    const { container } = render(<TurtleCharacter mood="happy" size={300} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('300');
    expect(svg?.getAttribute('height')).toBe('300');
  });

  it('has accessible aria-label', () => {
    render(<TurtleCharacter mood="happy" />);
    expect(screen.getByLabelText('Tammy the turtle, feeling happy')).toBeTruthy();
  });

  it('renders ellipse elements for the shell', () => {
    const { container } = render(<TurtleCharacter mood="idle" />);
    const ellipses = container.querySelectorAll('ellipse');
    expect(ellipses.length).toBeGreaterThan(0);
  });

  it('renders a mouth ellipse for "talking" mood', () => {
    const { container } = render(<TurtleCharacter mood="talking" />);
    const ellipsesWithClass = container.querySelectorAll('.talk-mouth');
    expect(ellipsesWithClass.length).toBeGreaterThan(0);
  });

  it('renders a mouth path (not ellipse) for "happy" mood', () => {
    const { container } = render(<TurtleCharacter mood="happy" />);
    const paths = container.querySelectorAll('path');
    // Should have mouth path
    expect(paths.length).toBeGreaterThan(0);
  });

  it('renders pulse ring for "listening" mood', () => {
    const { container } = render(<TurtleCharacter mood="listening" />);
    const ring = container.querySelector('.pulse-ring');
    expect(ring).not.toBeNull();
  });

  it('does NOT render pulse ring for non-listening moods', () => {
    const { container } = render(<TurtleCharacter mood="happy" />);
    const ring = container.querySelector('.pulse-ring');
    expect(ring).toBeNull();
  });
});
