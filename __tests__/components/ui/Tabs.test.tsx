import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, Tab } from '@/app/components/ui/Tabs';

function renderTabs(activeValue = 'a', onChange = jest.fn()) {
  return render(
    <Tabs value={activeValue} onChange={onChange}>
      <Tab value="a" label="Alpha" />
      <Tab value="b" label="Beta" />
      <Tab value="c" label="Gamma" />
    </Tabs>
  );
}

describe('Tabs', () => {
  it('renders all tab labels', () => {
    renderTabs();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('has role="tablist" on the container', () => {
    renderTabs();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('each button has role="tab"', () => {
    renderTabs();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
  });

  it('active tab has aria-selected="true", others have aria-selected="false"', () => {
    renderTabs('b');
    const tabs = screen.getAllByRole('tab');
    const alpha = tabs.find((t) => t.textContent === 'Alpha')!;
    const beta = tabs.find((t) => t.textContent === 'Beta')!;
    const gamma = tabs.find((t) => t.textContent === 'Gamma')!;

    expect(beta).toHaveAttribute('aria-selected', 'true');
    expect(alpha).toHaveAttribute('aria-selected', 'false');
    expect(gamma).toHaveAttribute('aria-selected', 'false');
  });

  it('clicking an inactive tab calls onChange with the correct value', async () => {
    const onChange = jest.fn();
    renderTabs('a', onChange);
    await userEvent.click(screen.getByText('Beta'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('clicking the active tab calls onChange with the same value', async () => {
    // Design choice: clicking active tab still fires onChange (no short-circuit).
    const onChange = jest.fn();
    renderTabs('a', onChange);
    await userEvent.click(screen.getByText('Alpha'));
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('active tab has data-active="true", inactive tabs have data-active="false"', () => {
    renderTabs('c');
    const tabs = screen.getAllByRole('tab');
    const alpha = tabs.find((t) => t.textContent === 'Alpha')!;
    const gamma = tabs.find((t) => t.textContent === 'Gamma')!;

    expect(gamma).toHaveAttribute('data-active', 'true');
    expect(alpha).toHaveAttribute('data-active', 'false');
  });
});
