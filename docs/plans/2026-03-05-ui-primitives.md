# UI Primitives & Modular Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace 30–40% duplicated inline-style code with a shared primitives layer (`app/components/ui/`) so every design token lives once and every page uses composable building blocks.

**Architecture:** Phase 1 establishes design tokens as CSS custom properties. Phase 2 builds primitives (Button → IconButton → Card → Modal → Tabs) from general to specific, each consuming the tokens. Phase 3 extracts inline page components into dedicated files. All changes are on `feat/material-ui` branch.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, CSS custom properties (no new dependencies)

---

## Task 1: Design tokens

Single source of truth for every colour, radius, shadow, and spacing value used across the app.

**Files:**
- Create: `app/components/ui/tokens.css`
- Modify: `app/globals.css`

**Step 1: Create the tokens file**

```css
/* app/components/ui/tokens.css
   ─────────────────────────────────────────────────────────────────────────────
   TurtleTalk design tokens — import this before any other app CSS.
   All child-facing UI (dark ocean theme) lives here.
   Parent dashboard tokens stay in globals.css (.parent-dashboard scope).
   ─────────────────────────────────────────────────────────────────────────────
*/

:root {
  /* ── Brand colours ─────────────────────────────────────────────────────── */
  --tt-primary:        #22c55e;
  --tt-primary-dark:   #16a34a;
  --tt-danger:         #ef4444;
  --tt-danger-dark:    #dc2626;
  --tt-gold:           #d97706;
  --tt-gold-dark:      #b45309;
  --tt-surface:        rgba(8, 22, 48, 0.88);   /* dark glass panel */
  --tt-surface-border: rgba(255, 255, 255, 0.12);
  --tt-ghost-bg:       rgba(255, 255, 255, 0.10);
  --tt-ghost-border:   rgba(255, 255, 255, 0.25);

  /* ── Gradients ──────────────────────────────────────────────────────────── */
  --tt-grad-primary: linear-gradient(135deg, var(--tt-primary-dark), var(--tt-primary));
  --tt-grad-danger:  linear-gradient(135deg, var(--tt-danger-dark),  var(--tt-danger));
  --tt-grad-gold:    linear-gradient(135deg, var(--tt-gold-dark),    var(--tt-gold));
  --tt-grad-connect: linear-gradient(135deg, #15803d, var(--tt-primary-dark));

  /* ── Shadows ────────────────────────────────────────────────────────────── */
  --tt-shadow-primary: 0 4px 20px rgba(22, 163, 74, 0.45);
  --tt-shadow-danger:  0 4px 20px rgba(220, 38, 38, 0.50);
  --tt-shadow-gold:    0 4px 20px rgba(217, 119, 6, 0.50);
  --tt-shadow-glass:   0 8px 40px rgba(0, 0, 0, 0.40);

  /* ── Radii ──────────────────────────────────────────────────────────────── */
  --tt-radius-pill:   9999px;
  --tt-radius-card:   20px;
  --tt-radius-card-sm: 16px;
  --tt-radius-sm:     8px;

  /* ── Button sizing ──────────────────────────────────────────────────────── */
  --tt-btn-height:      44px;
  --tt-icon-btn-size:   64px;   /* circular FAB (Mute, End, etc.) */
  --tt-btn-font-size:   0.95rem;
  --tt-btn-font-weight: 700;

  /* ── Motion ─────────────────────────────────────────────────────────────── */
  --tt-transition-fast: 0.15s ease;
  --tt-transition-mid:  0.25s ease;
  --tt-transition-spring: 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

**Step 2: Import tokens in globals.css**

Add at the top of `app/globals.css`, after `@import "tailwindcss"`:
```css
@import "./components/ui/tokens.css";
```

**Step 3: Replace hardcoded hex values in globals.css with tokens**

In globals.css replace:
- `rgba(8, 22, 48, 0.88)` → `var(--tt-surface)`
- `rgba(255, 255, 255, 0.12)` → `var(--tt-surface-border)` (where used as a border, not text opacity)

There are 2 instances in the `.bottom-nav` and `.talk-bottom-bar` media query sections. Replace them.

**Step 4: Run build to confirm no breakage**
```bash
cd C:/Users/iankt/projects/turtle-talk && npx next build 2>&1 | tail -10
```
Expected: clean build.

**Step 5: Commit**
```bash
cd C:/Users/iankt/projects/turtle-talk && git add app/components/ui/tokens.css app/globals.css && git commit -m "feat(ui): add design tokens CSS — single source for colours, radii, shadows"
```

---

## Task 2: Button primitive

Replaces 8+ duplicate green/red/ghost pill-button patterns across the app.

**Files:**
- Create: `app/components/ui/Button.tsx`
- Create: `__tests__/components/ui/Button.test.tsx`

**Step 1: Write the failing tests**

```tsx
// __tests__/components/ui/Button.test.tsx
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
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('data-variant')).toBe('primary');
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

  it('renders with icon', () => {
    render(<Button icon={<span data-testid="icon" />}>With Icon</Button>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('forwards className', () => {
    render(<Button className="tt-tap-shake">Shake</Button>);
    expect(screen.getByRole('button').className).toContain('tt-tap-shake');
  });
});
```

**Step 2: Run tests to confirm they fail**
```bash
cd C:/Users/iankt/projects/turtle-talk && npx jest Button.test --no-coverage 2>&1 | tail -10
```
Expected: FAIL — `Cannot find module '@/app/components/ui/Button'`

**Step 3: Implement Button**

```tsx
// app/components/ui/Button.tsx
'use client';

import type { ReactNode, ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'danger' | 'gold' | 'ghost' | 'connect';

const VARIANT_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--tt-grad-primary)',
    boxShadow: 'var(--tt-shadow-primary)',
    border: '2px solid rgba(255,255,255,0.25)',
    color: '#ffffff',
  },
  danger: {
    background: 'var(--tt-grad-danger)',
    boxShadow: 'var(--tt-shadow-danger)',
    border: '2px solid rgba(255,255,255,0.25)',
    color: '#ffffff',
  },
  gold: {
    background: 'var(--tt-grad-gold)',
    boxShadow: 'var(--tt-shadow-gold)',
    border: '2px solid rgba(255,255,255,0.25)',
    color: '#ffffff',
  },
  ghost: {
    background: 'var(--tt-ghost-bg)',
    boxShadow: 'none',
    border: '1px solid var(--tt-ghost-border)',
    color: '#ffffff',
  },
  connect: {
    background: 'var(--tt-grad-connect)',
    boxShadow: 'none',
    border: '2px solid rgba(255,255,255,0.25)',
    color: '#ffffff',
    opacity: 0.85,
  },
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
  children?: ReactNode;
}

export function Button({
  variant = 'primary',
  icon,
  children,
  className = '',
  style,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      data-variant={variant}
      disabled={disabled}
      className={`tt-tap-shake active:scale-[0.98] active:opacity-90 ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 'var(--tt-btn-height)',
        padding: '10px 24px',
        borderRadius: 'var(--tt-radius-pill)',
        fontSize: 'var(--tt-btn-font-size)',
        fontWeight: 'var(--tt-btn-font-weight)' as React.CSSProperties['fontWeight'],
        cursor: disabled ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.6 : 1,
        transition: `background var(--tt-transition-mid), box-shadow var(--tt-transition-mid)`,
        ...VARIANT_STYLES[variant],
        ...style,
      }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
```

**Step 4: Run tests to confirm they pass**
```bash
cd C:/Users/iankt/projects/turtle-talk && npx jest Button.test --no-coverage 2>&1 | tail -10
```
Expected: PASS — 9 tests

**Step 5: Commit**
```bash
cd C:/Users/iankt/projects/turtle-talk && git add app/components/ui/Button.tsx __tests__/components/ui/Button.test.tsx && git commit -m "feat(ui): Button primitive — primary/danger/gold/ghost/connect variants"
```

---

## Task 3: IconButton primitive

Replaces MuteButton, EndButton, ClearButton and the 64px circular FAB pattern repeated across BottomNav and TalkBottomBar.

**Files:**
- Create: `app/components/ui/IconButton.tsx`
- Create: `__tests__/components/ui/IconButton.test.tsx`

**Step 1: Write failing tests**

```tsx
// __tests__/components/ui/IconButton.test.tsx
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

  it('is disabled when prop set', () => {
    render(<IconButton aria-label="test" disabled><span /></IconButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

**Step 2: Run to confirm fail**
```bash
cd C:/Users/iankt/projects/turtle-talk && npx jest IconButton.test --no-coverage 2>&1 | tail -5
```

**Step 3: Implement IconButton**

```tsx
// app/components/ui/IconButton.tsx
'use client';

import type { ReactNode, ButtonHTMLAttributes } from 'react';
import type { ButtonVariant } from './Button';

const ICON_BTN_STYLES: Partial<Record<ButtonVariant, React.CSSProperties>> = {
  ghost: {
    background: 'var(--tt-ghost-bg)',
    border: '1px solid var(--tt-ghost-border)',
  },
  danger: {
    background: 'var(--tt-grad-danger)',
    boxShadow: 'var(--tt-shadow-danger)',
    border: '2px solid rgba(255,255,255,0.25)',
  },
  primary: {
    background: 'var(--tt-grad-primary)',
    boxShadow: 'var(--tt-shadow-primary)',
    border: '2px solid rgba(255,255,255,0.25)',
  },
  gold: {
    background: 'var(--tt-grad-gold)',
    boxShadow: 'var(--tt-shadow-gold)',
    border: '2px solid rgba(255,255,255,0.25)',
  },
};

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: number;
  children: ReactNode;
}

export function IconButton({
  variant = 'ghost',
  size,
  children,
  className = '',
  style,
  disabled,
  ...rest
}: IconButtonProps) {
  const dim = size ?? 'var(--tt-icon-btn-size)';
  return (
    <button
      type="button"
      data-variant={variant}
      disabled={disabled}
      className={`tt-tap-shake active:scale-[0.98] active:opacity-90 ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dim,
        height: dim,
        minWidth: dim,
        minHeight: dim,
        borderRadius: 'var(--tt-radius-pill)',
        color: '#ffffff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        flexShrink: 0,
        transition: `background var(--tt-transition-fast), box-shadow var(--tt-transition-fast)`,
        ...ICON_BTN_STYLES[variant],
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
```

**Step 4: Run tests to confirm pass**
```bash
cd C:/Users/iankt/projects/turtle-talk && npx jest IconButton.test --no-coverage 2>&1 | tail -5
```
Expected: PASS — 5 tests

**Step 5: Commit**
```bash
cd C:/Users/iankt/projects/turtle-talk && git add app/components/ui/IconButton.tsx __tests__/components/ui/IconButton.test.tsx && git commit -m "feat(ui): IconButton primitive — 64px circular FAB with ghost/danger/primary/gold variants"
```

---

## Task 4: Card primitive

Replaces the repeated glass-panel pattern (used in BottomNav, mission cards, conversation bubbles card, modal inner containers).

**Files:**
- Create: `app/components/ui/Card.tsx`
- Create: `__tests__/components/ui/Card.test.tsx`

**Step 1: Write failing tests**

```tsx
// __tests__/components/ui/Card.test.tsx
import { render, screen } from '@testing-library/react';
import { Card } from '@/app/components/ui/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card><p>Hello</p></Card>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders glass variant by default', () => {
    render(<Card data-testid="card"><p>x</p></Card>);
    expect(screen.getByTestId('card').getAttribute('data-variant')).toBe('glass');
  });

  it('renders frosted variant', () => {
    render(<Card variant="frosted" data-testid="card"><p>x</p></Card>);
    expect(screen.getByTestId('card').getAttribute('data-variant')).toBe('frosted');
  });

  it('renders flat variant', () => {
    render(<Card variant="flat" data-testid="card"><p>x</p></Card>);
    expect(screen.getByTestId('card').getAttribute('data-variant')).toBe('flat');
  });

  it('forwards className and style', () => {
    render(<Card className="my-class" style={{ margin: 4 }} data-testid="card"><p>x</p></Card>);
    const el = screen.getByTestId('card');
    expect(el.className).toContain('my-class');
  });
});
```

**Step 2: Run to confirm fail**
```bash
cd C:/Users/iankt/projects/turtle-talk && npx jest Card.test --no-coverage 2>&1 | tail -5
```

**Step 3: Implement Card**

```tsx
// app/components/ui/Card.tsx
import type { HTMLAttributes, ReactNode } from 'react';

export type CardVariant = 'glass' | 'frosted' | 'flat';

const CARD_STYLES: Record<CardVariant, React.CSSProperties> = {
  // Dark glass panel — nav bar, modals, bottom sheets
  glass: {
    background: 'var(--tt-surface)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--tt-surface-border)',
    boxShadow: 'var(--tt-shadow-glass)',
  },
  // Semi-transparent white overlay — mission cards, conversation bubbles
  frosted: {
    background: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.20)',
  },
  // Flat surface — no blur, minimal border
  flat: {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
  },
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  children: ReactNode;
}

export function Card({
  variant = 'glass',
  children,
  className = '',
  style,
  ...rest
}: CardProps) {
  return (
    <div
      data-variant={variant}
      className={className}
      style={{
        borderRadius: 'var(--tt-radius-card)',
        ...CARD_STYLES[variant],
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
```

**Step 4: Run tests to confirm pass**
```bash
cd C:/Users/iankt/projects/turtle-talk && npx jest Card.test --no-coverage 2>&1 | tail -5
```
Expected: PASS — 5 tests

**Step 5: Commit**
```bash
cd C:/Users/iankt/projects/turtle-talk && git add app/components/ui/Card.tsx __tests__/components/ui/Card.test.tsx && git commit -m "feat(ui): Card primitive — glass/frosted/flat variants"
```

---

## Task 5: Modal primitive

Replaces the 10+ identical backdrop+centered-div modal pattern used in JournalModal, ChildLoginModal, ChildrenModal, BookCard, AppreciationPage etc.

**Files:**
- Create: `app/components/ui/Modal.tsx`
- Create: `__tests__/components/ui/Modal.test.tsx`

**Step 1: Write failing tests**

```tsx
// __tests__/components/ui/Modal.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '@/app/components/ui/Modal';

describe('Modal', () => {
  it('renders children when open', () => {
    render(<Modal isOpen onClose={() => {}}><p>Content</p></Modal>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<Modal isOpen={false} onClose={() => {}}><p>Hidden</p></Modal>);
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('calls onClose when backdrop clicked', async () => {
    const onClose = jest.fn();
    render(<Modal isOpen onClose={onClose}><p>Content</p></Modal>);
    await userEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onClose when content clicked', async () => {
    const onClose = jest.fn();
    render(<Modal isOpen onClose={onClose}><p>Content</p></Modal>);
    await userEvent.click(screen.getByText('Content'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders title when provided', () => {
    render(<Modal isOpen onClose={() => {}} title="My Title"><p>x</p></Modal>);
    expect(screen.getByText('My Title')).toBeInTheDocument();
  });
});
```

**Step 2: Run to confirm fail**
```bash
cd C:/Users/iankt/projects/turtle-talk && npx jest Modal.test --no-coverage 2>&1 | tail -5
```

**Step 3: Implement Modal**

```tsx
// app/components/ui/Modal.tsx
'use client';

import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  /** Max width of the inner panel. Default: 480px */
  maxWidth?: number | string;
  /** z-index for the backdrop. Default: 200 */
  zIndex?: number;
}

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  maxWidth = 480,
  zIndex = 200,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      data-testid="modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth,
          background: 'var(--tt-surface)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--tt-surface-border)',
          borderRadius: 'var(--tt-radius-card)',
          boxShadow: 'var(--tt-shadow-glass)',
          padding: '24px 20px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {title && (
          <h2
            style={{
              margin: '0 0 16px',
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--tt-text-primary)',
            }}
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
```

**Step 4: Run tests to confirm pass**
```bash
cd C:/Users/iankt/projects/turtle-talk && npx jest Modal.test --no-coverage 2>&1 | tail -5
```
Expected: PASS — 5 tests

**Step 5: Commit**
```bash
cd C:/Users/iankt/projects/turtle-talk && git add app/components/ui/Modal.tsx __tests__/components/ui/Modal.test.tsx && git commit -m "feat(ui): Modal primitive — backdrop + glass panel, click-outside to close"
```

---

## Task 6: Tabs primitive

Replaces the 3 duplicated tab-switcher patterns in missions, DinnerQuestions, and appreciation.

**Files:**
- Create: `app/components/ui/Tabs.tsx`
- Create: `__tests__/components/ui/Tabs.test.tsx`

**Step 1: Write failing tests**

```tsx
// __tests__/components/ui/Tabs.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, Tab } from '@/app/components/ui/Tabs';

describe('Tabs', () => {
  const setup = () =>
    render(
      <Tabs active="a" onChange={() => {}}>
        <Tab id="a">Alpha</Tab>
        <Tab id="b">Beta</Tab>
      </Tabs>
    );

  it('renders all tab labels', () => {
    setup();
    expect(screen.getByRole('tab', { name: /alpha/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /beta/i })).toBeInTheDocument();
  });

  it('marks active tab with aria-selected', () => {
    setup();
    expect(screen.getByRole('tab', { name: /alpha/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /beta/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange with tab id when clicked', async () => {
    const onChange = jest.fn();
    render(
      <Tabs active="a" onChange={onChange}>
        <Tab id="a">Alpha</Tab>
        <Tab id="b">Beta</Tab>
      </Tabs>
    );
    await userEvent.click(screen.getByRole('tab', { name: /beta/i }));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
```

**Step 2: Run to confirm fail**
```bash
cd C:/Users/iankt/projects/turtle-talk && npx jest Tabs.test --no-coverage 2>&1 | tail -5
```

**Step 3: Implement Tabs**

```tsx
// app/components/ui/Tabs.tsx
'use client';

import type { ReactNode } from 'react';

// ── Tab item (declarative child) ──────────────────────────────────────────────
interface TabProps {
  id: string;
  children: ReactNode;
}
/** Declarative Tab child — used only for JSX structure, rendered by <Tabs> */
export function Tab(_props: TabProps) {
  return null; // Tabs component reads props directly
}

// ── Tabs container ────────────────────────────────────────────────────────────
interface TabsProps {
  active: string;
  onChange: (id: string) => void;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Tabs({ active, onChange, children, className = '', style }: TabsProps) {
  // Collect Tab children props
  const tabs = (Array.isArray(children) ? children : [children])
    .filter(Boolean)
    .map((child: any) => ({ id: child.props.id as string, label: child.props.children as ReactNode }));

  return (
    <div
      role="tablist"
      className={className}
      style={{
        display: 'inline-flex',
        gap: 4,
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 'var(--tt-radius-pill)',
        padding: 4,
        ...style,
      }}
    >
      {tabs.map(({ id, label }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(id)}
            className="tt-tap-shake"
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--tt-radius-pill)',
              border: 'none',
              background: isActive ? 'var(--tt-ghost-bg)' : 'transparent',
              color: isActive ? '#ffffff' : 'rgba(255,255,255,0.55)',
              fontSize: '0.9rem',
              fontWeight: isActive ? 700 : 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: `background var(--tt-transition-fast), color var(--tt-transition-fast)`,
              boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
```

**Step 4: Run tests to confirm pass**
```bash
cd C:/Users/iankt/projects/turtle-talk && npx jest Tabs.test --no-coverage 2>&1 | tail -5
```
Expected: PASS — 3 tests

**Step 5: Commit**
```bash
cd C:/Users/iankt/projects/turtle-talk && git add app/components/ui/Tabs.tsx __tests__/components/ui/Tabs.test.tsx && git commit -m "feat(ui): Tabs primitive — pill tab bar, aria-selected, onChange"
```

---

## Task 7: Barrel export

Single import point for all primitives: `import { Button, Card, Modal, Tabs } from '@/app/components/ui'`.

**Files:**
- Create: `app/components/ui/index.ts`

**Step 1: Create the barrel**

```ts
// app/components/ui/index.ts
export { Button } from './Button';
export type { ButtonVariant } from './Button';
export { IconButton } from './IconButton';
export { Card } from './Card';
export type { CardVariant } from './Card';
export { Modal } from './Modal';
export { Tabs, Tab } from './Tabs';
```

**Step 2: Verify clean build and all tests pass**
```bash
cd C:/Users/iankt/projects/turtle-talk && npx next build 2>&1 | tail -5 && npx jest --no-coverage 2>&1 | tail -10
```
Expected: clean build, all tests pass (at least 256+19 = 275 passing).

**Step 3: Commit**
```bash
cd C:/Users/iankt/projects/turtle-talk && git add app/components/ui/index.ts && git commit -m "feat(ui): barrel export for all primitives"
```

---

## Task 8: Extract MissionCard

`MissionCard` is a 200+ line component defined inline in `app/missions/page.tsx`. Extract it to its own file, import it back.

**Files:**
- Create: `app/components/missions/MissionCard.tsx`
- Modify: `app/missions/page.tsx`

**Step 1: Create `app/components/missions/MissionCard.tsx`**

Move the entire `MissionCard` function (lines 41–252 in missions/page.tsx) — including its imports and the `menuItemStyle` constant — to the new file. Add `'use client';` at the top. Export as named export.

The component signature stays exactly the same:
```tsx
'use client';
// (all existing imports that MissionCard needs)

export const menuItemStyle: React.CSSProperties = { /* existing */ };

export function MissionCard({
  mission,
  onComplete,
  onDelete,
}: {
  mission: Mission;
  onComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  // ...exact existing implementation...
}
```

**Step 2: Update missions/page.tsx**

Remove the `MissionCard` function and `menuItemStyle` constant. Add import:
```tsx
import { MissionCard } from '@/app/components/missions/MissionCard';
```

Remove any imports that are now only needed by MissionCard (check: `Trash2`, `Check`, `CheckCircle2`, `MoreVertical`, `Zap` from lucide — if not used elsewhere in the file after extraction, remove them from the page import).

**Step 3: Verify**
```bash
cd C:/Users/iankt/projects/turtle-talk && npx next build 2>&1 | tail -5
```
Expected: clean build.

**Step 4: Commit**
```bash
cd C:/Users/iankt/projects/turtle-talk && git add app/components/missions/MissionCard.tsx app/missions/page.tsx && git commit -m "refactor(missions): extract MissionCard to dedicated component file"
```

---

## Task 9: Extract JournalCard

**Files:**
- Create: `app/components/journals/JournalCard.tsx`
- Modify: `app/journals/page.tsx`

**Step 1: Read journals/page.tsx first to identify the exact inline component boundaries**

Run: read `app/journals/page.tsx` lines 1–140.

**Step 2: Create `app/components/journals/JournalCard.tsx`**

Move the `JournalCard` function (and any constants it needs) to the new file. Add `'use client';`. Export as named export.

**Step 3: Update journals/page.tsx**

Remove the inline `JournalCard` function. Add:
```tsx
import { JournalCard } from '@/app/components/journals/JournalCard';
```

**Step 4: Verify**
```bash
cd C:/Users/iankt/projects/turtle-talk && npx next build 2>&1 | tail -5
```

**Step 5: Commit**
```bash
cd C:/Users/iankt/projects/turtle-talk && git add app/components/journals/JournalCard.tsx app/journals/page.tsx && git commit -m "refactor(journals): extract JournalCard to dedicated component file"
```

---

## Task 10: Extract ConversationView and PullToRetry

**Files:**
- Create: `app/components/talk/ConversationView.tsx`
- Create: `app/components/talk/PullToRetry.tsx`
- Modify: `app/talk/page.tsx`

**Step 1: Create `app/components/talk/PullToRetry.tsx`**

Move the `PullToRetry` function (lines 32–78 of talk/page.tsx) to a new file. Add `'use client';`. Named export.

```tsx
'use client';
// PullToRetry — exact existing implementation
```

**Step 2: Create `app/components/talk/ConversationView.tsx`**

Move the `ConversationView` function (lines 80–273 of talk/page.tsx) to a new file. Add `'use client';`. Named export.

It will need these imports:
```tsx
'use client';
import { useRef, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useVoiceSession } from '@/app/hooks/useVoiceSession';
import { useMissions } from '@/app/hooks/useMissions';
import { usePersonalMemory } from '@/app/hooks/usePersonalMemory';
import { useChildSession } from '@/app/hooks/useChildSession';
import { createVoiceProvider } from '@/lib/speech/voice';
import { getUserFacingMessage } from '@/lib/speech/errors';
import TurtleCharacter from '@/app/components/talk/TurtleCharacter';
import MissionSelectView from '@/app/components/talk/MissionSelectView';
import ConversationSubtitles from '@/app/components/talk/ConversationSubtitles';
import ConversationBubblesCard from '@/app/components/talk/ConversationBubblesCard';
import BottomNav from '@/app/components/BottomNav';
import PullToRetry from '@/app/components/talk/PullToRetry';
import type { MissionSuggestion } from '@/lib/speech/types';
import type { TalkNavProps } from '@/app/components/BottomNav';
```

Export as named export: `export function ConversationView() { ... }`

**Step 3: Simplify talk/page.tsx**

After extraction, `app/talk/page.tsx` should be thin:
```tsx
'use client';
import { useRouter } from 'next/navigation';
import { useMicPermission } from '@/app/hooks/useMicPermission';
import { ConversationView } from '@/app/components/talk/ConversationView';
import MicPermission from '@/app/components/talk/MicPermission';

const STATE_LABELS: Record<string, string> = { /* keep as-is */ };

export default function TalkPage() {
  const { status, requestPermission } = useMicPermission();
  const router = useRouter();

  if (status === 'checking') { /* loading state */ }
  if (status === 'denied' || status === 'prompt') {
    return <MicPermission onGranted={requestPermission} onDenied={() => router.push('/')} />;
  }
  return <ConversationView />;
}
```

**Step 4: Verify**
```bash
cd C:/Users/iankt/projects/turtle-talk && npx next build 2>&1 | tail -5
```

**Step 5: Run full test suite**
```bash
cd C:/Users/iankt/projects/turtle-talk && npx jest --no-coverage 2>&1 | tail -10
```
Expected: all tests pass.

**Step 6: Commit**
```bash
cd C:/Users/iankt/projects/turtle-talk && git add app/components/talk/ConversationView.tsx app/components/talk/PullToRetry.tsx app/talk/page.tsx && git commit -m "refactor(talk): extract ConversationView and PullToRetry to dedicated component files"
```

---

## Task 11: Extract AppreciationPageInner

**Files:**
- Create: `app/components/appreciation/AppreciationPageInner.tsx`
- Modify: `app/appreciation/page.tsx`

**Step 1: Read `app/appreciation/page.tsx` to confirm structure**

Identify the `AppreciationPageInner` function boundaries and its imports.

**Step 2: Create the component file**

Move `AppreciationPageInner` (and all helpers/constants it needs) to the new file. Add `'use client';`. Named export.

**Step 3: Update `app/appreciation/page.tsx`**

Remove the inline component. Import it:
```tsx
import { AppreciationPageInner } from '@/app/components/appreciation/AppreciationPageInner';
```

**Step 4: Verify and commit**
```bash
cd C:/Users/iankt/projects/turtle-talk && npx next build 2>&1 | tail -5
git add app/components/appreciation/AppreciationPageInner.tsx app/appreciation/page.tsx
git commit -m "refactor(appreciation): extract AppreciationPageInner to dedicated component file"
```

---

## Task 12: Final verification and push

**Step 1: Run full build**
```bash
cd C:/Users/iankt/projects/turtle-talk && npx next build 2>&1 | tail -20
```
Expected: clean build, no TypeScript errors.

**Step 2: Run full test suite**
```bash
cd C:/Users/iankt/projects/turtle-talk && npx jest --no-coverage 2>&1 | tail -15
```
Expected: all tests pass (at minimum 275+).

**Step 3: Push branch**
```bash
cd C:/Users/iankt/projects/turtle-talk && git push
```

**Step 4: Confirm directory structure**
```bash
cd C:/Users/iankt/projects/turtle-talk && find app/components -name "*.tsx" -o -name "*.ts" | sort
```
Expected output includes:
```
app/components/appreciation/AppreciationPageInner.tsx
app/components/journals/JournalCard.tsx
app/components/missions/MissionCard.tsx
app/components/talk/ConversationView.tsx
app/components/talk/PullToRetry.tsx
app/components/ui/Button.tsx
app/components/ui/Card.tsx
app/components/ui/IconButton.tsx
app/components/ui/Modal.tsx
app/components/ui/Tabs.tsx
app/components/ui/index.ts
app/components/ui/tokens.css
```
