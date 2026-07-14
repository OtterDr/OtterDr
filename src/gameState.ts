// gameState.ts — defines the shape of all persisted game data and its default value.
// This file is intentionally types-only: no logic, no imports from other project files.
// Keeping it isolated means any file (extension, manager, webview bridge) can import
// it without risk of circular dependencies.

// equippedItems uses Record<string, string | null> instead of a fixed interface
// so new cosmetic slots (e.g. 'cape', 'badge', 'effect') can be added to the catalog
// without ever changing this type — the slot name is just a new key at runtime
export interface GameState {
  diagnosedCount: number;                       // total errors ever successfully translated
  unlockedItems: string[];                      // item IDs the user has earned via milestones
  equippedItems: Record<string, string | null>; // slot name → equipped item ID (null = nothing worn)
}

// used when a user runs the extension for the first time and no saved state exists
export const DEFAULT_STATE: GameState = {
  diagnosedCount: 0,
  unlockedItems: [],
  equippedItems: {},
};
