import React from 'react';
import { render, screen } from '@testing-library/react';
import TalkTitleTile from '@/app/v2/components/TalkTitleTile';

describe('TalkTitleTile', () => {
  it('renders Talking with tammy text', () => {
    render(<TalkTitleTile />);
    expect(screen.getByText(/Talking with tammy/i)).toBeInTheDocument();
  });
});
