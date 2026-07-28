// gameManager.ts — owns all game logic: reading/writing persisted state, checking
// milestones, and broadcasting updates to the sidebar webview.
//
// Nothing outside this file should read or write globalState directly.
// extension.ts calls the public methods here; the sidebar receives state via postMessage.

import * as vscode from 'vscode';
import { GameState, DEFAULT_STATE } from './gameState';
import { CosmeticItem, ITEM_CATALOG } from './catalog';

// key used to store game state in VS Code's globalState (persists across sessions)
const STORAGE_KEY = 'otterDr.gameState';

export class GameManager {

  // in-memory mirror of globalState — kept in sync on every save so reads
  // never need to be async (globalState.get is sync but we avoid repeated calls)
  private state: GameState;

  // onBroadcast is a callback provided by extension.ts that forwards state to
  // the sidebar webview. Using a callback instead of importing OtterViewProvider
  // directly prevents a circular dependency between extension.ts and gameManager.ts.
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly onBroadcast: (state: GameState) => void,
  ) {
    // load any previously saved state; fall back to defaults on first run
    this.state = context.globalState.get<GameState>(STORAGE_KEY) ?? { ...DEFAULT_STATE };

    // opt this key into VS Code Settings Sync so the user's progress
    // follows them across machines when they have sync enabled
    context.globalState.setKeysForSync([STORAGE_KEY]);

    // backfill any catalog items that should already be unlocked based on the
    // current diagnosedCount but are missing from unlockedItems. This handles the
    // case where new items are added to the catalog after the user has already
    // earned enough XP to unlock them — without this, they would never unlock
    // because checkMilestones only fires when a threshold is actively crossed.
    this.backfillUnlocks();
  }

  // called by extension.ts immediately after activation to push the current
  // state into the sidebar so it renders correctly on first open
  sendInitialState(): void {
    this.onBroadcast(this.state);
  }

  // called after each successful AI translation.
  // count = number of NEW (uncached) errors just sent to the AI —
  // cached errors are excluded because they didn't require a new call
  async onErrorsDiagnosed(count: number): Promise<void> {
    const oldCount = this.state.diagnosedCount;
    const newCount = oldCount + count;

    // find items whose threshold was crossed for the first time in this batch
    const newlyUnlocked = this.checkMilestones(oldCount, newCount);

    // update state with the new count and any newly earned items
    this.state = {
      ...this.state,
      diagnosedCount: newCount,
      unlockedItems: [
        ...this.state.unlockedItems,
        ...newlyUnlocked.map(item => item.id),
      ],
    };

    await this.save();
    this.onBroadcast(this.state);

    // notify the user in VS Code's notification area for each new unlock
    for (const item of newlyUnlocked) {
      vscode.window.showInformationMessage(`🦦 OtterDr unlocked: ${item.label}!`);
    }
  }

  // called when the user selects an item in the wardrobe UI.
  // slot = category (e.g. 'hat'), itemId = the item to equip, or null to unequip
  async equipItem(slot: string, itemId: string | null): Promise<void> {
    this.state = {
      ...this.state,
      // spread existing slots so other categories are unaffected
      equippedItems: { ...this.state.equippedItems, [slot]: itemId },
    };

    await this.save();
    this.onBroadcast(this.state);
  }

  // scans ITEM_CATALOG for items whose diagnosedCount threshold falls between
  // the old and new count (exclusive/inclusive) and haven't been unlocked yet.
  // Only handles 'diagnosedCount' conditions for now; other condition types
  // are safely ignored until their handlers are added here.
  private checkMilestones(oldCount: number, newCount: number): CosmeticItem[] {
    return ITEM_CATALOG.filter(item => {
      const cond = item.unlockCondition;

      if (cond.type !== 'diagnosedCount') {
        // non-diagnosedCount conditions are not yet implemented — skip silently
        return false;
      }

      // threshold must be crossed in this batch and not already owned
      return (
        cond.threshold > oldCount &&
        cond.threshold <= newCount &&
        !this.state.unlockedItems.includes(item.id)
      );
    });
  }

  // silently unlocks any catalog items whose threshold is already met but missing
  // from unlockedItems — runs once in the constructor, synchronously, so the
  // corrected state is available before sendInitialState() broadcasts it.
  // No notifications are shown since these items were earned in a previous session.
  private backfillUnlocks(): void {
    const count = this.state.diagnosedCount;
    const missing = ITEM_CATALOG.filter(item => {
      const cond = item.unlockCondition;
      return (
        cond.type === 'diagnosedCount' &&
        cond.threshold <= count &&
        !this.state.unlockedItems.includes(item.id)
      );
    });

    if (missing.length === 0) { return; }

    // update state synchronously — save happens async but state is immediately usable
    this.state = {
      ...this.state,
      unlockedItems: [...this.state.unlockedItems, ...missing.map(i => i.id)],
    };

    // persist in the background; failure here is non-critical since the next
    // diagnosed error will trigger another save with the correct state
    this.save().catch(err => console.error('OtterDr: backfill save failed', err));
  }

  // writes the current in-memory state to VS Code's persistent globalState storage
  private async save(): Promise<void> {
    await this.context.globalState.update(STORAGE_KEY, this.state);
  }
}
