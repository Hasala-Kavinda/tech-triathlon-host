import type { EngineConfig } from "./types.js"

/** Every numeric rule constant lives here (rule summary rules 5, 14, 15, 16). */
export const DEFAULT_CONFIG: EngineConfig = {
  maxTurnsPerDay: 2,
  freshBudgetMin: 270,
  styleTechBudgetMin: 480,
  freshStartMin: 3 * 60 + 30,
  freshDeadlineMin: 8 * 60,
}
