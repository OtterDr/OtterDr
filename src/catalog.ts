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
  slot: string;                    // which layer this item occupies (e.g. 'hats', 'backgrounds', 'colors')
  assetPath: string;               // path to the PNG asset relative to the extension root;
                                   // empty string = asset not yet created, item still tracked
  unlockCondition: UnlockCondition;
  cssFilter?: string;              // CSS filter string applied to the otter image (colors slot only)
  swatchColor?: string;            // hex color shown in the wardrobe color picker swatch
  // optional overlay positioning for hats/glasses/accessories — used when the PNG is a cropped
  // standalone asset rather than a same-canvas overlay. All values are valid CSS strings.
  overlayWidth?: string;           // e.g. '50%', '60px' — defaults to 'auto' (full otter width)
  overlayTop?: string;             // e.g. '20%', '10px' — offset from top of otter container
  overlayLeft?: string;            // e.g. '10%', '5px'  — offset from left of otter container
}

// all items in the game — order does not matter, GameManager sorts by threshold at runtime.
// assetPath can reference files that don't exist yet; the sidebar skips rendering empty paths,
// so milestones accumulate correctly before any artwork is finished.
export const ITEM_CATALOG: CosmeticItem[] = [
  {
    id: 'hat_basic',
    label: 'Otter Hat',
    slot: 'hats',
    assetPath: 'assets/hats/hat_basic.png',
    unlockCondition: { type: 'diagnosedCount', threshold: 1 },
  },
  {
    id: 'bg_butterfly_forest',
    label: 'Butterfly Forest',
    slot: 'backgrounds',
    assetPath: 'assets/backgrounds/butterfly_forest.jpg',
    unlockCondition: { type: 'diagnosedCount', threshold: 1 },
  },
  {
    id: 'bg_starry_night',
    label: 'Starry Night',
    slot: 'backgrounds',
    assetPath: 'assets/backgrounds/starry_night.jpg',
    unlockCondition: { type: 'diagnosedCount', threshold: 3 },
  },
  {
    id: 'bg_lake',
    label: 'Lake',
    slot: 'backgrounds',
    assetPath: 'assets/backgrounds/lake.jpg',
    unlockCondition: { type: 'diagnosedCount', threshold: 5 },
  },
  {
    id: 'bg_attic_bedroom',
    label: 'Attic Bedroom',
    slot: 'backgrounds',
    assetPath: 'assets/backgrounds/attic_bedroom.jpg',
    unlockCondition: { type: 'diagnosedCount', threshold: 10 },
  },
  {
    id: 'bg_retrogame',
    label: 'Retro Game',
    slot: 'backgrounds',
    assetPath: 'assets/backgrounds/retrogame.jpg',
    unlockCondition: { type: 'diagnosedCount', threshold: 15 },
  },
  {
    id: 'glasses_round',
    label: 'Round Glasses',
    slot: 'glasses',
    assetPath: 'assets/glasses/round_glasses.png',
    unlockCondition: { type: 'diagnosedCount', threshold: 5 },
    overlayWidth: '55%',
    overlayTop: '30%',
    overlayLeft: '22%',
  },
  {
    id: 'bg_ocean',
    label: 'Ocean Background',
    slot: 'backgrounds',
    assetPath: 'assets/backgrounds/bg_ocean.png',
    unlockCondition: { type: 'diagnosedCount', threshold: 10 },
  },
  {
    id: 'scarf_blue',
    label: 'Blue Scarf',
    slot: 'accessories',
    assetPath: 'assets/accessories/scarf_blue.png',
    unlockCondition: { type: 'diagnosedCount', threshold: 25 },
  },
  {
    id: 'bg_deep',
    label: 'Deep Dive Background',
    slot: 'backgrounds',
    assetPath: 'assets/backgrounds/bg_deep.png',
    unlockCondition: { type: 'diagnosedCount', threshold: 50 },
  },
  {
    id: 'crown_gold',
    label: 'Golden Crown',
    slot: 'hats',
    assetPath: 'assets/hats/crown_gold.png',
    unlockCondition: { type: 'diagnosedCount', threshold: 100 },
  },
  // colors — CSS filter applied directly to the otter image, no art assets needed
  {
    id: 'color_ocean_blue',
    label: 'Ocean Blue',
    slot: 'colors',
    assetPath: '',
    unlockCondition: { type: 'diagnosedCount', threshold: 1 },
    cssFilter: 'hue-rotate(180deg) saturate(1.5)',
    swatchColor: '#3a7fc8',
  },
  {
    id: 'color_purple',
    label: 'Purple',
    slot: 'colors',
    assetPath: '',
    unlockCondition: { type: 'diagnosedCount', threshold: 3 },
    cssFilter: 'hue-rotate(270deg) saturate(1.5)',
    swatchColor: '#7a3cc8',
  },
  {
    id: 'color_pink',
    label: 'Pink',
    slot: 'colors',
    assetPath: '',
    unlockCondition: { type: 'diagnosedCount', threshold: 5 },
    cssFilter: 'hue-rotate(320deg) saturate(2)',
    swatchColor: '#c83a7a',
  },
  {
    id: 'color_dark_grey',
    label: 'Dark Grey',
    slot: 'colors',
    assetPath: '',
    unlockCondition: { type: 'diagnosedCount', threshold: 8 },
    cssFilter: 'grayscale(0.9) brightness(0.55)',
    swatchColor: '#555555',
  },
  {
    id: 'color_forest_green',
    label: 'Forest Green',
    slot: 'colors',
    assetPath: '',
    unlockCondition: { type: 'diagnosedCount', threshold: 10 },
    cssFilter: 'hue-rotate(90deg) saturate(1.5)',
    swatchColor: '#3ac87a',
  },
  {
    id: 'color_midnight',
    label: 'Midnight',
    slot: 'colors',
    assetPath: '',
    unlockCondition: { type: 'diagnosedCount', threshold: 50 },
    cssFilter: 'grayscale(1) brightness(0.25)',
    swatchColor: '#1a1a2e',
  },
];
