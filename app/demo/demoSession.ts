export type DemoParentPriority =
  | 'weeklySummary'
  | 'dinnerQuestions'
  | 'books'
  | 'wishList';

export type DemoStep =
  | 'introParentSetup'
  | 'tattleCard'
  | 'childWarmupName'
  | 'childLikes'
  | 'childCourageConversation'
  | 'missionsPick'
  | 'missionDo'
  | 'wish'
  | 'parentDashboard'
  | 'survey';

/**
 * Canonical ordering of demo steps for the **child** experience.
 * `introParentSetup` and `parentDashboard` are parent-only and excluded.
 *
 * Each entry is documented below:
 *
 * - **tattleCard** — Child picks a themed tattle card to set the topic for their conversation with Shelly.
 * - **childWarmupName** — Child enters their name, age, favourite book, and fun facts via a playful keyboard.
 * - **childCourageConversation** — Live voice conversation between the child and Shelly.
 * - **missionsPick** — Shelly suggests 2-3 brave missions; child picks one, skips, or talks more.
 * - **missionDo** — Child marks the chosen mission complete or dismisses it.
 * - **wish** — Child chooses how to make a wish (solo / with grown-up / with friend).
 * - **survey** — Quick check-in: rating + QR code for parent view.
 */
export const DEMO_STEP_ORDER: DemoStep[] = [
  'tattleCard',
  'childWarmupName',
  'childCourageConversation',
  'missionsPick',
  'missionDo',
  'wish',
  'survey',
];

/**
 * Return the next step in the child demo flow, skipping any steps in `skip`.
 * Returns `null` when the current step is the last (or not found).
 */
export function getNextStep(
  current: DemoStep,
  skip: ReadonlySet<DemoStep> = new Set(),
): DemoStep | null {
  const idx = DEMO_STEP_ORDER.indexOf(current);
  if (idx === -1) return null;
  for (let i = idx + 1; i < DEMO_STEP_ORDER.length; i++) {
    if (!skip.has(DEMO_STEP_ORDER[i])) return DEMO_STEP_ORDER[i];
  }
  return null;
}

/**
 * Return the previous step in the child demo flow, skipping any steps in `skip`.
 * Returns `null` when the current step is the first (or not found).
 */
export function getPreviousStep(
  current: DemoStep,
  skip: ReadonlySet<DemoStep> = new Set(),
): DemoStep | null {
  const idx = DEMO_STEP_ORDER.indexOf(current);
  if (idx === -1) return null;
  for (let i = idx - 1; i >= 0; i--) {
    if (!skip.has(DEMO_STEP_ORDER[i])) return DEMO_STEP_ORDER[i];
  }
  return null;
}

/**
 * Return the first non-skipped step in the child demo flow.
 * Falls back to `'tattleCard'` if everything is skipped (shouldn't happen).
 */
export function getFirstStep(
  skip: ReadonlySet<DemoStep> = new Set(),
): DemoStep {
  for (const s of DEMO_STEP_ORDER) {
    if (!skip.has(s)) return s;
  }
  return 'tattleCard';
}

export interface DemoSurvey {
  rating: 1 | 2 | 3 | 4 | 5 | null;
}

export interface DemoSession {
  version: 1;
  startedAt: string;
  updatedAt: string;
  step: DemoStep;
  parentPriority: DemoParentPriority;
  childAge: string;
  parentGoal: string;
  selectedMissionId: string | null;
  missionStatus: 'none' | 'active' | 'completed' | 'dismissed';
  survey: DemoSurvey;
  hasSeenOnboarding?: boolean;
  demoTheme?: 'dark' | 'light';
  ageGroup?: '5-7' | '8-10' | '11-13' | '13+' | 'other' | 'unknown';
  hasCompletedOnboarding?: boolean;
  /**
   * Unique ID for this demo session, used to link child + parent views.
   * Created when the child starts the demo and used in QR codes / session IDs.
   */
  demoId?: string;
  /**
   * Which Tattle Card the child picked at the start of the demo.
   */
  tattleCardId?: string | null;
  /**
   * Child's favorite book (optional, freeform).
   */
  favoriteBook?: string;
  /**
   * Short fun facts about the child, chosen from bubbles or typed in.
   */
  funFacts?: string[];
  /**
   * How the child wants to make their wish in the demo.
   */
  wishChoice?: 'solo' | 'withParent' | 'withFriend' | null;
  /**
   * Whether the parent/guardian has acknowledged the privacy notice and
   * consented to data collection for this demo session.
   */
  hasConsented?: boolean;
  /**
   * ISO timestamp of when consent was given.
   */
  consentedAt?: string;
  /**
   * Which sub-step of the child profile wizard the child is on.
   */
  profileSubstep?: 'name' | 'age' | 'book' | 'facts';
}

const STORAGE_KEY = 'turtle-talk-demo-session-v1';

export function createFreshDemoSession(): DemoSession {
  const now = new Date().toISOString();
  return {
    version: 1,
    startedAt: now,
    updatedAt: now,
    step: 'tattleCard',
    parentPriority: 'weeklySummary',
    childAge: '',
    parentGoal: '',
    selectedMissionId: null,
    missionStatus: 'none',
    survey: {
      rating: null,
    },
    demoTheme: 'dark',
    ageGroup: 'unknown',
    hasSeenOnboarding: false,
    hasCompletedOnboarding: false,
    demoId: '',
    tattleCardId: null,
    favoriteBook: '',
    funFacts: [],
    wishChoice: null,
    hasConsented: false,
    consentedAt: undefined,
  };
}

export function loadDemoSession(): DemoSession {
  if (typeof window === 'undefined') return createFreshDemoSession();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createFreshDemoSession();
    const parsed = JSON.parse(raw) as Partial<DemoSession>;
    if (parsed.version !== 1) return createFreshDemoSession();
    return { ...createFreshDemoSession(), ...parsed } as DemoSession;
  } catch {
    return createFreshDemoSession();
  }
}

export function saveDemoSession(session: DemoSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function clearDemoSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
