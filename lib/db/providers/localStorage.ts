/**
 * LocalStorageDatabaseService
 *
 * Default provider — identical behaviour to the original hooks.
 * Keys are scoped by childId to support multiple children on one device.
 */
import type { DatabaseService, ChildMemory, Journal, Mission, MissionSuggestion } from '../types';

const MAX_MESSAGES = 20;
const MAX_TOPICS = 15;

// "default" childId maps to the original key names for backward compatibility
// with data already stored in localStorage before multi-child support.
const LEGACY_KEYS: Record<string, string> = {
  missions: 'turtle-talk-missions',
  name: 'turtle-talk-child-name',
  messages: 'turtle-talk-messages',
  topics: 'turtle-talk-topics',
  journals: 'turtle-talk-journals',
};

function key(childId: string, suffix: string) {
  if (childId === 'default') return LEGACY_KEYS[suffix] ?? `turtle-talk-${suffix}`;
  return `turtle-talk-${childId}-${suffix}`;
}

function readJSON<T>(k: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(k: string, value: unknown): void {
  try {
    localStorage.setItem(k, JSON.stringify(value));
  } catch {
    // Storage unavailable — silently ignore
  }
}

export class LocalStorageDatabaseService implements DatabaseService {
  getMissionsSync(childId: string): Mission[] | null {
    if (typeof window === 'undefined') return null;
    return readJSON<Mission[]>(key(childId, 'missions'), []);
  }

  async getMissions(childId: string): Promise<Mission[]> {
    return this.getMissionsSync(childId) ?? [];
  }

  async addMission(childId: string, suggestion: MissionSuggestion): Promise<Mission> {
    const mission: Mission = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: suggestion.title,
      description: suggestion.description,
      theme: suggestion.theme,
      difficulty: suggestion.difficulty,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    const current = await this.getMissions(childId);
    writeJSON(key(childId, 'missions'), [mission, ...current]);
    return mission;
  }

  async completeMission(childId: string, missionId: string): Promise<void> {
    const missions = await this.getMissions(childId);
    const updated = missions.map((m) =>
      m.id === missionId
        ? { ...m, status: 'completed' as const, completedAt: new Date().toISOString() }
        : m,
    );
    writeJSON(key(childId, 'missions'), updated);
  }

  async deleteMission(childId: string, missionId: string): Promise<void> {
    const missions = await this.getMissions(childId);
    writeJSON(
      key(childId, 'missions'),
      missions.filter((m) => m.id !== missionId),
    );
  }

  getMemorySync(childId: string): ChildMemory | null {
    if (typeof window === 'undefined') return null;
    return {
      childId,
      childName: localStorage.getItem(key(childId, 'name')),
      messages: readJSON<ChildMemory['messages']>(key(childId, 'messages'), []),
      topics: readJSON<string[]>(key(childId, 'topics'), []),
    };
  }

  async getMemory(childId: string): Promise<ChildMemory> {
    return this.getMemorySync(childId) ?? {
      childId,
      childName: null,
      messages: [],
      topics: [],
    };
  }

  async saveChildName(childId: string, name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      localStorage.setItem(key(childId, 'name'), trimmed);
    } catch { /* ignore */ }
  }

  async saveMessages(childId: string, messages: ChildMemory['messages']): Promise<void> {
    writeJSON(key(childId, 'messages'), messages.slice(-MAX_MESSAGES));
  }

  async addTopic(childId: string, topic: string): Promise<void> {
    const normalised = topic.trim().toLowerCase();
    if (!normalised) return;
    const topics = readJSON<string[]>(key(childId, 'topics'), []);
    const deduped = [normalised, ...topics.filter((t) => t !== normalised)].slice(0, MAX_TOPICS);
    writeJSON(key(childId, 'topics'), deduped);
  }

  async clearMemory(childId: string): Promise<void> {
    ['name', 'messages', 'topics'].forEach((suffix) => {
      try {
        localStorage.removeItem(key(childId, suffix));
      } catch { /* ignore */ }
    });
  }

  async getJournals(childId: string): Promise<Journal[]> {
    return readJSON<Journal[]>(key(childId, 'journals'), []);
  }

  async addJournal(childId: string, audioBase64: string): Promise<Journal> {
    const journal: Journal = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      childId,
      createdAt: new Date().toISOString(),
      audioBase64,
    };
    const current = await this.getJournals(childId);
    writeJSON(key(childId, 'journals'), [journal, ...current]);
    return journal;
  }

  async deleteJournal(childId: string, journalId: string): Promise<void> {
    const journals = await this.getJournals(childId);
    writeJSON(
      key(childId, 'journals'),
      journals.filter((j) => j.id !== journalId),
    );
  }
}
