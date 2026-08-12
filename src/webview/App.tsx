// App.tsx — the React component that renders inside the OtterDr sidebar WebviewView.
// Receives game state and error counts from the extension host via postMessage,
// and manages the otter's mood, background, color filter, and overlay cosmetics as React state.

import * as React from 'react';
import './styles.css';
import { ITEM_CATALOG } from '../catalog';

// position metadata keyed by item ID — imported directly so webpack HMR picks up
// changes to catalog.ts without needing an extension host recompile
const catalogPositions = Object.fromEntries(
  ITEM_CATALOG
    .filter(item => item.overlayWidth || item.overlayTop || item.overlayEmoteOffsets)
    .map(item => [item.id, {
      width:        item.overlayWidth        ?? 'auto',
      height:       item.overlayHeight       ?? 'auto',
      top:          item.overlayTop          ?? '0',
      left:         item.overlayLeft         ?? '0',
      emoteOffsets: item.overlayEmoteOffsets ?? {},
    }])
);

export interface IAppProps {}

// UPPER_CASE satisfies the project linting rule for variable names;
// React still treats it as a component because it starts with a capital letter.
export const APP: React.FunctionComponent<IAppProps> = ({}: React.PropsWithChildren<IAppProps>) => {
  // errorCount drives the otter's confused/default mood without waiting for a full state broadcast
  const [errorCount, setErrorCount] = React.useState<number>(0);
  // mood controls which otter image is shown; 'happy' is a temporary click reaction
  const [mood, setMood] = React.useState<'default' | 'happy' | 'confused'>('default');
  // errorText is the total lifetime diagnosed count shown beneath the otter
  const [errorText, setErrorText] = React.useState<number>(0);
  // equippedBgId is the catalog item ID for the currently equipped background, or null for none
  const [equippedBgId, setEquippedBgId] = React.useState<string | null>(null);
  // colorFilter is the CSS filter string applied to the otter image for fur color cosmetics
  const [colorFilter, setColorFilter] = React.useState<string>('none');
  // equippedItems holds the full slot→itemId map so overlay cosmetics (hats, glasses, accessories)
  // can be resolved to image URLs and rendered on top of the otter
  const [equippedItems, setEquippedItems] = React.useState<Record<string, string | null>>({});

  React.useEffect(() => {
    // listen for postMessage calls from the extension host (GameManager broadcasts, error count updates)
    const response = (event: MessageEvent) => {
      try {
        const responseData = event.data;
        if (!responseData) { return; }

        // UPDATE_ERROR_COUNT fires whenever VS Code diagnostics change in the active file.
        // drives the confused/default mood independently of the full game state broadcast.
        if (responseData.type === 'UPDATE_ERROR_COUNT') {
          console.log('Error count', responseData.payload);
          setErrorCount(responseData.payload);
        }

        // GAME_STATE_UPDATE fires after every GameManager state change
        // (errors diagnosed, item unlocked, item equipped/unequipped).
        // payload mirrors the GameState interface: diagnosedCount, unlockedItems, equippedItems.
        if (responseData.type === 'GAME_STATE_UPDATE') {
          const state = responseData.payload;
          console.log('Game state update', state);
          setErrorText(state.diagnosedCount);
          setEquippedItems(state.equippedItems ?? {});
          setEquippedBgId(state.equippedItems?.['backgrounds'] ?? null);
          // look up the CSS filter for the equipped color — fall back to 'none' if nothing is equipped
          const colorId: string | undefined = state.equippedItems?.['colors'];
          const filters = window.otterAssets.colorFilters;
          setColorFilter(colorId && filters[colorId] ? filters[colorId] : 'none');
        }
      } catch (error) {
        console.error('Error handling the information', error);
      }
    };

    window.addEventListener('message', response);

    // tell the extension host the React app has mounted and is ready to receive messages.
    // the host responds by sending the current game state so the sidebar is correct on first open.
    window.tsvscode.postMessage({ type: 'renderReady' });

    // cleanup: remove the listener when the component unmounts to prevent memory leaks
    return () => {
      window.removeEventListener('message', response);
    };
  }, []); // empty deps — run once on mount, clean up on unmount

  // keep the otter's mood in sync whenever the active-file error count changes
  React.useEffect(() => {
    setMood(errorCount > 0 ? 'confused' : 'default');
  }, [errorCount]);

  // clicking the otter briefly shows the happy image, then reverts to the current mood after 2s
  const handleOtterClick = () => {
    setMood('happy');
    setTimeout(() => {
      setMood(errorCount > 0 ? 'confused' : 'default');
    }, 2000);
  };

  const assets = window.otterAssets;

  // pick the correct otter image based on the current mood state
  const src = mood === 'happy' ? assets.happyImage
    : mood === 'confused' ? assets.confusedImage
    : assets.defaultImage;

  // resolve the background URL — empty string means no background is equipped
  const bgSrc = equippedBgId && assets.bgUris[equippedBgId] ? assets.bgUris[equippedBgId] : '';

  // collect overlay data for all equipped cosmetics (hats, glasses, accessories).
  // URI comes from window.otterAssets (extension host generates webview-safe URLs);
  // position values come from catalogPositions so webpack HMR picks up catalog edits live.
  const overlaySlots = ['hats', 'glasses', 'accessories'];
  const overlayItems = overlaySlots
    .map(slot => equippedItems[slot])
    .filter((id): id is string => !!id && !!assets.overlayData[id] && !!catalogPositions[id])
    .map(id => ({ uri: assets.overlayData[id].uri, ...catalogPositions[id] }));

  return (
    <div className="app">
      {/* vw-based height scales with the sidebar panel width so the scene
          stays proportional when the user resizes the VS Code window */}
      <div style={{ position: 'relative', width: '100%', height: 'clamp(100px, 42vw, 180px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
        {/* background layer — only rendered when a background cosmetic is equipped */}
        {bgSrc && (
          <img
            src={bgSrc}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'bottom center', borderRadius: '6px' }}
          />
        )}
        {/* inline-block shrinks this div to exactly the otter image's rendered width,
            so overlay top/left percentages are relative to the image, not the sidebar container */}
        <div style={{ position: 'relative', display: 'inline-block', zIndex: 1 }}>
          {/* otter base image — vw height scales with panel width; width:auto preserves aspect ratio */}
          <img
            id="otter"
            src={src}
            style={{ height: 'clamp(75px, 32vw, 140px)', width: 'auto', cursor: 'pointer', filter: colorFilter }}
            onClick={handleOtterClick}
            alt="Otter"
          />
          {/* overlay cosmetics — position uses per-emote offset when defined,
              falling back to the catalog's default top/left values */}
          {overlayItems.map((overlay, i) => {
            const emoteOffset = overlay.emoteOffsets?.[mood];
            const top  = emoteOffset?.top  ?? overlay.top;
            const left = emoteOffset?.left ?? overlay.left;
            return (
              <img
                key={i}
                src={overlay.uri}
                alt=""
                style={{
                  position: 'absolute',
                  top,
                  left,
                  width: overlay.width,
                  height: overlay.height,
                  pointerEvents: 'none',
                }}
              />
            );
          })}
        </div>
      </div>
      {/* XP counter shown beneath the otter — updates on every GAME_STATE_UPDATE */}
      <p style={{ fontSize: '0.75rem', textAlign: 'center', opacity: 0.6, margin: '4px 0 0' }}>
        {errorText} errors diagnosed
      </p>
    </div>
  );
};
