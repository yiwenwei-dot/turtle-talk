import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MissionCard } from '@/app/components/missions/MissionCard';
import type { Mission } from '@/lib/speech/types';

const baseMission: Mission = {
  id: 'mission-1',
  title: 'Be kind to a friend',
  description: 'Do something nice for someone today.',
  theme: 'kind',
  difficulty: 'easy',
  status: 'active',
  createdAt: '2024-01-15T10:00:00.000Z',
};

const completedMission: Mission = {
  ...baseMission,
  id: 'mission-2',
  status: 'completed',
  completedAt: '2024-01-16T12:00:00.000Z',
};

describe('MissionCard', () => {
  it('renders the mission title', () => {
    render(<MissionCard mission={baseMission} />);
    expect(screen.getByText('Be kind to a friend')).toBeInTheDocument();
  });

  it('renders the mission description', () => {
    render(<MissionCard mission={baseMission} />);
    expect(screen.getByText('Do something nice for someone today.')).toBeInTheDocument();
  });

  it('renders the difficulty badge for active missions', () => {
    render(<MissionCard mission={baseMission} />);
    const badge = screen.getByText('easy');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-difficulty', 'easy');
  });

  it('renders difficulty badge for medium missions', () => {
    const mediumMission: Mission = { ...baseMission, difficulty: 'medium' };
    render(<MissionCard mission={mediumMission} />);
    const badge = screen.getByText('medium');
    expect(badge).toHaveAttribute('data-difficulty', 'medium');
  });

  it('renders difficulty badge for stretch missions', () => {
    const stretchMission: Mission = { ...baseMission, difficulty: 'stretch' };
    render(<MissionCard mission={stretchMission} />);
    const badge = screen.getByText('stretch');
    expect(badge).toHaveAttribute('data-difficulty', 'stretch');
  });

  it('does not render difficulty badge for completed missions', () => {
    render(<MissionCard mission={completedMission} />);
    expect(screen.queryByText('easy')).not.toBeInTheDocument();
  });

  it('renders the theme emoji for kind theme', () => {
    render(<MissionCard mission={baseMission} />);
    expect(screen.getByText('💛')).toBeInTheDocument();
  });

  it('applies line-through style when mission is completed', () => {
    render(<MissionCard mission={completedMission} />);
    const title = screen.getByText('Be kind to a friend');
    expect(title).toHaveStyle({ textDecoration: 'line-through' });
  });

  it('does not apply line-through style when mission is active', () => {
    render(<MissionCard mission={baseMission} />);
    const title = screen.getByText('Be kind to a friend');
    expect(title).not.toHaveStyle({ textDecoration: 'line-through' });
  });

  it('shows Done! button when onComplete is provided and mission is active', () => {
    render(<MissionCard mission={baseMission} onComplete={jest.fn()} />);
    expect(screen.getByText('Done!')).toBeInTheDocument();
  });

  it('does not show Done! button when mission is completed', () => {
    render(<MissionCard mission={completedMission} onComplete={jest.fn()} />);
    expect(screen.queryByText('Done!')).not.toBeInTheDocument();
  });

  it('does not show Done! button when onComplete is not provided', () => {
    render(<MissionCard mission={baseMission} />);
    expect(screen.queryByText('Done!')).not.toBeInTheDocument();
  });

  it('calls onComplete with mission id when Done! button is clicked', () => {
    const onComplete = jest.fn();
    render(<MissionCard mission={baseMission} onComplete={onComplete} />);
    fireEvent.click(screen.getByText('Done!'));
    expect(onComplete).toHaveBeenCalledWith('mission-1');
  });

  it('shows overflow menu button', () => {
    render(<MissionCard mission={baseMission} />);
    // menu toggle button has aria-haspopup="menu"
    expect(document.querySelector('[aria-haspopup="menu"]')).toBeInTheDocument();
  });

  it('opens overflow menu on button click and shows Remove option when onDelete provided', () => {
    const onDelete = jest.fn();
    render(<MissionCard mission={baseMission} onDelete={onDelete} />);
    const toggleBtn = document.querySelector('[aria-haspopup="menu"]') as HTMLElement;
    fireEvent.click(toggleBtn);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Remove')).toBeInTheDocument();
  });

  it('calls onDelete with mission id when Remove is clicked from menu', () => {
    const onDelete = jest.fn();
    render(<MissionCard mission={baseMission} onDelete={onDelete} />);
    const toggleBtn = document.querySelector('[aria-haspopup="menu"]') as HTMLElement;
    fireEvent.click(toggleBtn);
    fireEvent.click(screen.getByText('Remove'));
    expect(onDelete).toHaveBeenCalledWith('mission-1');
  });

  it('shows completed date for completed missions', () => {
    render(<MissionCard mission={completedMission} />);
    expect(screen.getByText(/Completed/)).toBeInTheDocument();
  });

  it('shows started date for active missions', () => {
    render(<MissionCard mission={baseMission} />);
    expect(screen.getByText(/Started/)).toBeInTheDocument();
  });

  it('matches snapshot for active mission', () => {
    const { container } = render(
      <MissionCard mission={baseMission} onComplete={jest.fn()} onDelete={jest.fn()} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot for completed mission', () => {
    const { container } = render(<MissionCard mission={completedMission} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
