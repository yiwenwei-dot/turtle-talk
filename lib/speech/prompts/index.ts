export { BASE_SYSTEM_PROMPT } from './tammy-base';
export { GOODBYE_EXCEPTION_SECTION } from './tammy-ending';
export { buildSystemPrompt, type TammyPromptContext } from './tammy-build';
export { getFirstMessageInstruction } from './first-message';
export {
  SHELLY_MODES,
  getModeSystemPromptBlock,
  EXPLICIT_MODE_SIGNALS,
  DEFAULT_MODE,
  type TammyMode,
  type ModeStyleGuide,
} from './tammy-modes';
export {
  getEscalationResponse,
  getTier1Response,
  getTier2Response,
  getTier3Response,
  TIER_1_RESPONSE_TEMPLATES,
  TIER_2_RESPONSE_TEMPLATES,
  TIER_2_MAIN_PHRASE,
  TIER_3_RESPONSE_TEMPLATES,
  buildParentAlertPayload,
  type ParentAlertPayload,
} from './escalation';

