// wardrobe.ts — generates the HTML for the OtterDr Wardrobe editor panel.
// All catalog data and asset URIs are baked in at generation time so the webview
// never needs to call back to the extension host just to know what items exist.
// Game state (unlocked items, equipped items, XP) arrives later via GAME_STATE_UPDATE.

import * as vscode from 'vscode';
import { encode } from 'html-entities';
import { ITEM_CATALOG } from './catalog';
import { getNonce } from './utils';

export function renderWardrobeHTML(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const nonce = getNonce();

  // generate webview-safe URIs for all items that declare an asset path.
  // items whose image files don't exist yet fall back to an emoji via onerror.
  const assetUriMap: Record<string, string> = {};
  for (const item of ITEM_CATALOG) {
    if (item.assetPath) {
      assetUriMap[item.id] = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, item.assetPath),
      ).toString();
    }
  }

  // otter image shown in the live avatar preview column on the left
  const otterUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'assets', 'otter', 'default_otter.png'),
  ).toString();

  // group catalog items by slot, preserving first-appearance order for section ordering
  const slotOrder: string[] = [];
  const bySlot: Record<string, typeof ITEM_CATALOG> = {};
  for (const item of ITEM_CATALOG) {
    if (!bySlot[item.slot]) {
      slotOrder.push(item.slot);
      bySlot[item.slot] = [];
    }
    bySlot[item.slot].push(item);
  }

  // label shown on the lock overlay so users know what milestone unlocks the item
  const thresholdLabel = (item: (typeof ITEM_CATALOG)[0]): string => {
    const c = item.unlockCondition;
    if (c.type === 'diagnosedCount') {
      return c.threshold === 1 ? '1 error' : c.threshold + ' errors';
    }
    return 'locked';
  };

  // fallback emoji shown when an item has no art asset yet, or when its image fails to load
  const slotEmoji: Record<string, string> = {
    hats: '🎩', glasses: '👓', accessories: '🧣', backgrounds: '🖼️',
  };

  // thumbnail HTML: real image if an asset URI exists, emoji fallback otherwise.
  // onerror hides the broken img and shows the sibling emoji span instead.
  const thumbHTML = (item: (typeof ITEM_CATALOG)[0]): string => {
    const uri = assetUriMap[item.id];
    const emoji = slotEmoji[item.slot] ?? '✦';
    if (uri) {
      return `<img class="thumb-img" src="${uri}" alt=""` +
             ` onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">` +
             `<span class="thumb-emoji" style="display:none">${emoji}</span>`;
    }
    return `<span class="thumb-emoji">${emoji}</span>`;
  };

  // one section per slot — items start locked; JS adds 'unlocked' and 'equipped' classes via applyState
  const sectionsHTML = slotOrder.map((slot, i) => {
    const items = bySlot[slot];
    // slot names are already plural (e.g. 'backgrounds', 'colors') — just capitalize
    const displayName = slot.charAt(0).toUpperCase() + slot.slice(1);

    let gridClass: string;
    let cardsHTML: string;

    if (slot === 'colors') {
      // color items render as circular swatches with a filtered otter emoji preview inside
      gridClass = 'color-grid';
      cardsHTML = items.map(item => `
        <div class="color-card" data-item-id="${item.id}" data-slot="${slot}" data-css-filter="${item.cssFilter ?? 'none'}">
          <div class="swatch" style="background:${item.swatchColor ?? '#888'}">
            <span class="swatch-otter" style="filter:${item.cssFilter ?? 'none'}">🦦</span>
          </div>
          <div class="color-name">${encode(item.label)}</div>
          <div class="lock-overlay">
            <span>🔒</span>
            <span class="lock-threshold">${thresholdLabel(item)}</span>
          </div>
          <div class="selected-check">✓</div>
        </div>`).join('');
    } else {
      // all other slots use the standard 16:9 thumbnail card
      gridClass = 'item-grid';
      cardsHTML = items.map(item => `
        <div class="item-card" data-item-id="${item.id}" data-slot="${slot}">
          <div class="item-thumb">
            ${thumbHTML(item)}
            <div class="lock-overlay">
              <span>🔒</span>
              <span class="lock-threshold">${thresholdLabel(item)}</span>
            </div>
          </div>
          <div class="item-info">
            <div class="item-name">${encode(item.label)}</div>
            <div class="item-slot-label">${slot}</div>
          </div>
          <div class="selected-check">✓</div>
        </div>`).join('');
    }

    const divider = i < slotOrder.length - 1 ? '<div class="divider"></div>' : '';
    return `
      <div class="category-section">
        <div class="category-header">
          <span class="category-name">${displayName}</span>
          <span class="category-count" data-slot="${slot}"></span>
        </div>
        <div class="${gridClass}">${cardsHTML}</div>
      </div>
      ${divider}`;
  }).join('');

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>OtterDr Wardrobe</title>
    <style>
      :root {
        --bg:#14151f; --surface:#1e1f30; --card:#272840; --border:#363860;
        --accent:#7eb3ff; --accent-dim:#3a5fa8; --gold:#ffd97d;
        --text:#dde1f5; --muted:#7880aa; --lock-bg:rgba(0,0,0,0.6);
      }
      @media (prefers-color-scheme: light) {
        :root {
          --bg:#f0f2fa; --surface:#fff; --card:#eaedf8; --border:#c8cce8;
          --text:#1a1c30; --muted:#6068a0; --lock-bg:rgba(255,255,255,0.65);
        }
      }
      * { box-sizing:border-box; margin:0; padding:0; }
      body { font-family:system-ui,-apple-system,sans-serif; background:var(--bg); color:var(--text); min-height:100vh; display:flex; flex-direction:column; }
      header { display:flex; align-items:center; justify-content:space-between; padding:13px 22px; background:var(--surface); border-bottom:1px solid var(--border); flex-shrink:0; }
      .header-title { display:flex; align-items:center; gap:9px; font-size:14px; font-weight:600; }
      .xp-badge { font-size:11px; font-weight:600; letter-spacing:0.06em; text-transform:uppercase; color:var(--gold); background:rgba(255,217,125,0.12); border:1px solid rgba(255,217,125,0.3); padding:3px 10px; border-radius:20px; font-variant-numeric:tabular-nums; }
      main { display:grid; grid-template-columns:250px 1fr; flex:1; overflow:hidden; }
      /* ── left: avatar preview ── */
      .preview-col { border-right:1px solid var(--border); display:flex; flex-direction:column; align-items:center; padding:22px 18px 18px; gap:13px; }
      .preview-label { font-size:10px; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); font-weight:700; align-self:flex-start; }
      .avatar-frame { width:190px; height:190px; border-radius:13px; border:1px solid var(--border); overflow:hidden; position:relative; display:flex; align-items:flex-end; justify-content:center; background:var(--card); flex-shrink:0; }
      #bg-preview { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:none; }
      #otter-preview { width:80%; height:auto; position:relative; z-index:1; filter:drop-shadow(0 3px 10px rgba(0,0,0,0.4)); }
      .equipped-label { font-size:11px; color:var(--muted); text-align:center; }
      .equipped-label strong { color:var(--text); font-weight:500; }
      .unequip-btn { font-size:11px; color:var(--muted); background:none; border:1px solid var(--border); padding:5px 14px; border-radius:6px; cursor:pointer; transition:border-color 0.15s,color 0.15s; }
      .unequip-btn:hover { border-color:var(--accent); color:var(--accent); }
      /* ── right: cosmetic panels ── */
      .panels-col { overflow-y:auto; padding:22px; display:flex; flex-direction:column; gap:24px; }
      .category-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:11px; }
      .category-name { font-size:10px; text-transform:uppercase; letter-spacing:0.1em; font-weight:700; color:var(--muted); }
      .category-count { font-size:10px; color:var(--muted); opacity:0.7; }
      .item-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(105px,1fr)); gap:9px; }
      /* ── item card ── */
      .item-card { border-radius:9px; border:2px solid var(--border); overflow:hidden; cursor:not-allowed; position:relative; background:var(--card); transition:border-color 0.15s,transform 0.1s; opacity:0.5; }
      .item-card.unlocked { cursor:pointer; opacity:1; }
      .item-card.unlocked:hover { border-color:var(--accent-dim); transform:translateY(-1px); }
      .item-card.equipped { border-color:var(--accent); }
      .item-card.unlocked .lock-overlay { display:none; }
      .item-card.equipped .selected-check { display:flex; }
      .item-thumb { width:100%; aspect-ratio:16/9; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; background:var(--card); }
      .thumb-img { width:100%; height:100%; object-fit:cover; }
      .thumb-emoji { font-size:24px; display:flex; align-items:center; justify-content:center; width:100%; height:100%; }
      .lock-overlay { position:absolute; inset:0; background:var(--lock-bg); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; font-size:13px; }
      .lock-threshold { font-size:9px; font-weight:700; letter-spacing:0.05em; color:var(--gold); text-transform:uppercase; }
      .item-info { padding:7px 9px; }
      .item-name { font-size:11px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .item-slot-label { font-size:10px; color:var(--muted); margin-top:1px; }
      /* checkmark badge on the currently equipped card */
      .selected-check { display:none; position:absolute; top:5px; right:5px; width:17px; height:17px; background:var(--accent); border-radius:50%; align-items:center; justify-content:center; font-size:9px; color:#fff; z-index:3; }
      .divider { height:1px; background:var(--border); margin:0 -22px; }
      /* ── color swatches ── */
      .color-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(80px,1fr)); gap:10px; }
      .color-card { border-radius:9px; border:2px solid var(--border); overflow:hidden; cursor:not-allowed; position:relative; background:var(--card); transition:border-color 0.15s,transform 0.1s; opacity:0.5; display:flex; flex-direction:column; align-items:center; padding:10px 8px 8px; gap:7px; }
      .color-card.unlocked { cursor:pointer; opacity:1; }
      .color-card.unlocked:hover { border-color:var(--accent-dim); transform:translateY(-1px); }
      .color-card.equipped { border-color:var(--accent); }
      .color-card.unlocked .lock-overlay { display:none; }
      .color-card.equipped .selected-check { display:flex; }
      .swatch { width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
      .swatch-otter { font-size:22px; line-height:1; }
      .color-name { font-size:10px; font-weight:600; text-align:center; }
    </style>
  </head>
  <body>
    <header>
      <div class="header-title"><span>🦦</span> OtterDr Wardrobe</div>
      <div class="xp-badge" id="xp-badge">0 errors diagnosed</div>
    </header>
    <main>
      <!-- left panel: live avatar preview — background image layers behind the otter -->
      <aside class="preview-col">
        <span class="preview-label">Preview</span>
        <div class="avatar-frame">
          <img id="bg-preview" src="" alt="Background">
          <img id="otter-preview" src="${otterUri}" alt="OtterDr">
        </div>
        <div class="equipped-label" id="equipped-label">Background: <strong>None</strong></div>
        <button class="unequip-btn" id="unequip-btn" style="display:none" onclick="unequip()">Remove background</button>
      </aside>
      <!-- right panel: one section per cosmetic slot; items unlock as XP milestones are crossed -->
      <section class="panels-col">
        ${sectionsHTML}
      </section>
    </main>
    <script nonce="${nonce}">
      // asset URIs baked in at HTML generation time — maps item ID to its webview-safe image URL
      const ASSET_URIS = ${JSON.stringify(assetUriMap)};

      const vscode = acquireVsCodeApi();

      // apply a full game state snapshot — called on initial load and after every broadcast.
      // toggles 'unlocked' and 'equipped' classes on all cards so CSS handles the visual state.
      function applyState(state) {
        document.getElementById('xp-badge').textContent = state.diagnosedCount + ' errors diagnosed';

        // update unlock and equipped status for all card types (item-card and color-card)
        document.querySelectorAll('[data-item-id]').forEach(function(card) {
          var id = card.dataset.itemId;
          var slot = card.dataset.slot;
          card.classList.toggle('unlocked', state.unlockedItems.includes(id));
          card.classList.toggle('equipped', state.equippedItems[slot] === id);
        });

        // update the "X of Y unlocked" count shown in each section header
        document.querySelectorAll('.category-count').forEach(function(el) {
          var slot = el.dataset.slot;
          var cards = document.querySelectorAll('[data-item-id][data-slot="' + slot + '"]');
          var unlocked = Array.from(cards).filter(function(c) { return c.classList.contains('unlocked'); }).length;
          el.textContent = unlocked + ' of ' + cards.length + ' unlocked';
        });

        // sync the background preview image
        updatePreview(state.equippedItems['backgrounds'] || null);

        // apply the equipped color filter to the otter preview, or clear it
        var equippedColorId = state.equippedItems['colors'];
        var otterEl = document.getElementById('otter-preview');
        if (otterEl) {
          if (equippedColorId) {
            var colorCard = document.querySelector('[data-item-id="' + equippedColorId + '"]');
            otterEl.style.filter = colorCard ? (colorCard.dataset.cssFilter || 'none') : 'none';
          } else {
            otterEl.style.filter = 'none';
          }
        }
      }

      // update the avatar preview to show the equipped background, or hide it when null
      function updatePreview(itemId) {
        var bgEl = document.getElementById('bg-preview');
        var label = document.getElementById('equipped-label');
        var btn = document.getElementById('unequip-btn');
        if (itemId && ASSET_URIS[itemId]) {
          bgEl.src = ASSET_URIS[itemId];
          bgEl.style.display = 'block';
          var card = document.querySelector('.item-card[data-item-id="' + itemId + '"]');
          var name = card && card.querySelector('.item-name') ? card.querySelector('.item-name').textContent : itemId;
          label.innerHTML = 'Background: <strong>' + name + '</strong>';
          btn.style.display = '';
        } else {
          bgEl.src = '';
          bgEl.style.display = 'none';
          label.innerHTML = 'Background: <strong>None</strong>';
          btn.style.display = 'none';
        }
      }

      // equip an item: optimistically update the UI then tell the extension host to persist.
      // clicking an already-equipped item unequips it (toggle behaviour).
      // covers both item-cards and color-cards via the [data-item-id] selector.
      document.querySelectorAll('[data-item-id]').forEach(function(card) {
        card.addEventListener('click', function() {
          if (!card.classList.contains('unlocked')) { return; }
          var id = card.dataset.itemId;
          var slot = card.dataset.slot;
          var isEquipped = card.classList.contains('equipped');

          // remove equipped ring from every card in this slot before re-applying
          document.querySelectorAll('[data-item-id][data-slot="' + slot + '"]').forEach(function(c) {
            c.classList.remove('equipped');
          });

          if (isEquipped) {
            // clicking the equipped item again unequips it (toggle)
            if (slot === 'backgrounds') { updatePreview(null); }
            if (slot === 'colors') { document.getElementById('otter-preview').style.filter = 'none'; }
            vscode.postMessage({ type: 'EQUIP_ITEM', slot: slot, itemId: null });
          } else {
            card.classList.add('equipped');
            if (slot === 'backgrounds') { updatePreview(id); }
            if (slot === 'colors') {
              document.getElementById('otter-preview').style.filter = card.dataset.cssFilter || 'none';
            }
            vscode.postMessage({ type: 'EQUIP_ITEM', slot: slot, itemId: id });
          }
        });
      });

      // unequip the current background via the "Remove background" button
      function unequip() {
        document.querySelectorAll('.item-card[data-slot="backgrounds"]').forEach(function(c) {
          c.classList.remove('equipped');
        });
        updatePreview(null);
        vscode.postMessage({ type: 'EQUIP_ITEM', slot: 'backgrounds', itemId: null });
      }

      // receive state updates from GameManager broadcasts
      window.addEventListener('message', function(event) {
        if (event.data.type === 'GAME_STATE_UPDATE') { applyState(event.data.state); }
      });

      // signal readiness — the extension host responds with the current game state
      vscode.postMessage({ type: 'WEBVIEW_READY' });
    </script>
  </body>
  </html>`;
}
