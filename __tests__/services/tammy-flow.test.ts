import * as fs from 'fs';
import * as path from 'path';

import {
  SHELLY_MODES,
  DEFAULT_MODE,
  getModeSystemPromptBlock,
  getEscalationResponse,
  buildParentAlertPayload,
  TIER_2_MAIN_PHRASE,
} from '@/lib/speech/prompts';
import type { EscalationTier } from '@/lib/tammy-agents';

/**
 * Helper to write a timestamped artifact for each evaluation.
 * Files are written to: logs/tammy-flow/<ISO_TIMESTAMP>-<caseId>.json
 */
function writeEvaluationArtifact(caseId: string, payload: unknown): string {
  const baseDir = path.join(process.cwd(), 'logs', 'tammy-flow');
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}-${caseId}.json`;
  const fullPath = path.join(baseDir, filename);

  const wrapped = {
    caseId,
    timestamp,
    payload,
  };

  fs.writeFileSync(fullPath, JSON.stringify(wrapped, null, 2), 'utf8');
  return fullPath;
}

describe('Tammy conversation & safety flow (artifact evaluations)', () => {
  test('normal listening flow (Tier 0) writes evaluation artifact', () => {
    const mode = DEFAULT_MODE;
    const modeGuide = SHELLY_MODES[mode];
    const systemBlock = getModeSystemPromptBlock(mode);
    const escalationTier: EscalationTier = 0;
    const escalationResponse = getEscalationResponse(escalationTier);

    const artifact = {
      description: 'Normal listening flow, Tier 0 (no escalation override).',
      input: {
        primaryMode: mode,
        escalationTier,
      },
      output: {
        modeLabel: modeGuide.label,
        systemBlock,
        escalationResponse,
      },
    };

    const artifactPath = writeEvaluationArtifact('tier0-listening-normal', artifact);

    expect(escalationResponse).toBeNull();
    expect(systemBlock).toContain('LISTENING');
    expect(fs.existsSync(artifactPath)).toBe(true);
  });

  test('Tier 1 flow (repeated distress → longer empathy) writes evaluation artifact', () => {
    const mode: keyof typeof SHELLY_MODES = 'venting';
    const systemBlock = getModeSystemPromptBlock(mode);
    const escalationTier: EscalationTier = 1;
    const escalationResponse = getEscalationResponse(escalationTier);

    const artifact = {
      description: 'Tier 1: repeated distress, slightly longer empathy.',
      input: {
        primaryMode: mode,
        escalationTier,
        signals: ['repeated_distress'],
      },
      output: {
        systemBlock,
        escalationResponse,
      },
    };

    const artifactPath = writeEvaluationArtifact('tier1-repeated-distress', artifact);

    expect(escalationResponse).not.toBeNull();
    expect(escalationResponse).toContain('hard');
    expect(fs.existsSync(artifactPath)).toBe(true);
  });

  test('Tier 2 flow (pattern over days → suggest grown-up) writes evaluation artifact', () => {
    const mode: keyof typeof SHELLY_MODES = 'listening';
    const systemBlock = getModeSystemPromptBlock(mode);
    const escalationTier: EscalationTier = 2;
    const escalationResponse = getEscalationResponse(escalationTier);
    const parentAlert = buildParentAlertPayload(
      escalationTier,
      'pattern_over_days',
    );

    const artifact = {
      description: 'Tier 2: pattern over days, suggest grown-up.',
      input: {
        primaryMode: mode,
        escalationTier,
        signals: ['pattern_over_days'],
      },
      output: {
        systemBlock,
        escalationResponse,
        parentAlert,
      },
    };

    const artifactPath = writeEvaluationArtifact('tier2-pattern-over-days', artifact);

    expect(escalationResponse).not.toBeNull();
    expect(escalationResponse).toContain(TIER_2_MAIN_PHRASE);
    expect(parentAlert.escalationTier).toBe(2);
    expect(fs.existsSync(artifactPath)).toBe(true);
  });

  test('Tier 3 flow (severe keywords → parent alert quietly) writes evaluation artifact', () => {
    const mode: keyof typeof SHELLY_MODES = 'venting';
    const systemBlock = getModeSystemPromptBlock(mode);
    const escalationTier: EscalationTier = 3;
    const escalationResponse = getEscalationResponse(escalationTier);
    const parentAlert = buildParentAlertPayload(
      escalationTier,
      'severe_safety_keywords',
    );

    const artifact = {
      description:
        'Tier 3: severe keywords, Tammy uses pre-approved template and triggers quiet parent alert.',
      input: {
        primaryMode: mode,
        escalationTier,
        signals: ['severe_safety_keywords'],
      },
      output: {
        systemBlock,
        escalationResponse,
        parentAlert,
      },
    };

    const artifactPath = writeEvaluationArtifact('tier3-severe-keywords', artifact);

    expect(escalationResponse).not.toBeNull();
    expect(parentAlert.escalationTier).toBe(3);
    expect(parentAlert.suggestedParentMessage).toMatch(/serious/i);
    expect(fs.existsSync(artifactPath)).toBe(true);
  });
});

