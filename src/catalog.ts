// catalog.ts — the single source of truth for all cosmetic items and unlock conditions.
// To add a new item: add one object to ITEM_CATALOG. No other file needs to change.
// To add a new unlock trigger type: add a union member to UnlockCondition and handle
// it in GameManager.checkMilestones — TypeScript will flag the missing case.

// UnlockCondition is a discriminated union so the 'type' field acts as a tag.
// Each variant carries only the data relevant to that trigger.
// Adding a new variant here automatically requires a handler in GameManager (compile-time safety).
export type UnlockCondition =
  | { type: 'diagnosedCount'; threshold: number }  // unlock after diagnosing N total errors
  | { type: 'streakDays';     days: number }        // future: diagnose errors N days in a row
  | { type: 'errorSource';    source: string }      // future: diagnose an error from a specific linter
  | { type: 'manual' };                             // future: granted via easter egg or event

// describes a single cosmetic item available in the wardrobe
export interface CosmeticItem {
  id: string;                      // unique, stable identifier — safe to store in globalState
  label: string;                   // human-readable name shown in unlock notifications and UI
  slot: string;                    // which layer this item occupies (e.g. 'hat', 'background')
  assetPath: string;               // path to the PNG asset relative to the extension root;
                                   // empty string = asset not yet created, item still tracked
  unlockCondition: UnlockCondition;
}

// all items in the game — order does not matter, GameManager sorts by threshold at runtime.
// assetPath can reference files that don't exist yet; the sidebar skips rendering empty paths,
// so milestones accumulate correctly before any artwork is finished.
export const ITEM_CATALOG: CosmeticItem[] = [
  {
    id: 'hat_basic',
    label: 'Otter Hat',
    slot: 'hat',
    assetPath: 'assets/cosmetics/hats/hat_basic.png',
    unlockCondition: { type: 'diagnosedCount', threshold: 1 },
  },
  {
    id: 'glasses_round',
    label: 'Round Glasses',
    slot: 'glasses',
    assetPath: 'assets/cosmetics/glasses/glasses_round.png',
    unlockCondition: { type: 'diagnosedCount', threshold: 5 },
  },
  {
    id: 'bg_ocean',
    label: 'Ocean Background',
    slot: 'background',
    assetPath: 'assets/cosmetics/backgrounds/bg_ocean.png',
    unlockCondition: { type: 'diagnosedCount', threshold: 10 },
  },
  {
    id: 'scarf_blue',
    label: 'Blue Scarf',
    slot: 'accessory',
    assetPath: 'assets/cosmetics/accessories/scarf_blue.png',
    unlockCondition: { type: 'diagnosedCount', threshold: 25 },
  },
  {
    id: 'bg_deep',
    label: 'Deep Dive Background',
    slot: 'background',
    assetPath: 'assets/cosmetics/backgrounds/bg_deep.png',
    unlockCondition: { type: 'diagnosedCount', threshold: 50 },
  },
  {
    id: 'crown_gold',
    label: 'Golden Crown',
    slot: 'hat',
    assetPath: 'assets/cosmetics/hats/crown_gold.png',
    unlockCondition: { type: 'diagnosedCount', threshold: 100 },
  },
];
