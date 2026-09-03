/*
 * Escalating Spellcasting for Pathfinder 2e: Spellstrike macro
 * https://github.com/<your-username>/escalating-spellcasting
 *
 * Macro code: MIT licensed (see LICENSE-CODE.txt), use it however you like, keep this header.
 * Rules text: CC BY-NC-SA 4.0 (see LICENSE.md).
 * Unofficial fan content. Not affiliated with or endorsed by Paizo Inc.
 * Mechanical inspiration: the fatigue-based magic of Arcana Primária (Nozes Game Studio).
 */

/*
Escalating Spellcasting for Pathfinder 2e: Spellstrike macro (standalone)
Version: 1.2

Dedicated macro for Magus / Spellstrike under Escalating Spellcasting.

What it does:
- reads the real spellbook from the sheet, using the same API pattern as the PF2e Workbench:
    actor.itemTypes.spellcastingEntry -> entry.getSheetData() -> entry.cast(...)
- never spends a spell slot for normal spells: consume:false
- rolls ONE d20, the strike itself, and compares that same total result against:
    1. the target's AC (does the blow land?)
    2. the Effective Casting DC (does the spell manifest through the weapon?)
- applies Magic Fatigue (MF) according to the casting result, and tracks Repetition Strain
- posts the spell's chat card only when the attack hits AND the spell manifests
- on a casting failure when the attack hits, offers Forced Effort or a cantrip fallback channeled through the same strike
- supports Hero Points: rerolling the strike also rerolls the casting comparison

Installation:
1. Create a Foundry macro of type "Script" (not "chat").
2. Paste this whole file into it.
3. Select exactly one token and target exactly one enemy.

Note: in Spellstrike the martial execution is what stabilizes the spell, so the strike's own
modifier (Strength/Dexterity, weapon proficiency, runes, MAP) is compared against the Casting DC.
Outside of Spellstrike, use the main casting macro instead.
*/

if (canvas.tokens.controlled.length === 0) return ui.notifications.warn("Select a token.");
if (canvas.tokens.controlled.length > 1) return ui.notifications.warn("Select exactly one token.");

const actor = token.actor;
if (!actor?.isSpellcaster) return ui.notifications.warn(`${actor?.name ?? "This actor"} is not a spellcaster.`);
if (game.user.targets.size !== 1) return ui.notifications.warn("Spellstrike needs exactly one targeted token.");

const CE = {
  scope: "world",
  fmFlag: "escalatingSpellcastingMF",
  repsFlag: "escalatingSpellcastingReps",
  bonusFlag: "escalatingSpellcastingBonus",
  strikeBonusFlag: "escalatingSpellstrikeBonus",
  cap: 10,
  cd: { 1: 15, 2: 18, 3: 20, 4: 23, 5: 26, 6: 28, 7: 31, 8: 34, 9: 36, 10: 39 },
  delta: {
    High: { 2: 0, 1: 2, 0: 3, [-1]: 5 },
    Mid: { 2: -1, 1: 1, 0: 2, [-1]: 4 },
    Low: { 2: -2, 1: -1, 0: 1, [-1]: 2 },
  },
};

function actorLevel() {
  return Number(actor.system?.details?.level?.value ?? actor.level ?? 1);
}

function defaultRMax() {
  return Math.min(10, Math.max(1, Math.ceil(actorLevel() / 2)));
}

function clampFM(value) {
  return Math.max(0, Math.min(CE.cap, Number(value || 0)));
}

async function getFM() {
  return Number(actor.getFlag(CE.scope, CE.fmFlag) ?? 0);
}

async function setFM(value) {
  await actor.setFlag(CE.scope, CE.fmFlag, clampFM(value));
}

async function getReps() {
  return foundry.utils.deepClone(actor.getFlag(CE.scope, CE.repsFlag) ?? {});
}

async function setReps(reps) {
  reps = reps ?? {};
  if (Object.keys(reps).length === 0) {
    await actor.unsetFlag(CE.scope, CE.repsFlag);
  } else {
    await actor.setFlag(CE.scope, CE.repsFlag, reps);
  }
}

function categoryForRank(rank, rmax) {
  if (rank >= rmax - 1) return "High";
  if (rank === rmax - 2) return "Mid";
  return "Low";
}

function degreeFromTotal(nat, total, dc) {
  let degree;
  if (total >= dc + 10) degree = 2;
  else if (total >= dc) degree = 1;
  else if (total <= dc - 10) degree = -1;
  else degree = 0;

  if (nat === 20) degree = Math.min(2, degree + 1);
  if (nat === 1) degree = Math.max(-1, degree - 1);
  return degree;
}

function degreeLabel(degree) {
  return ({ 2: "Critical Success", 1: "Success", 0: "Failure", [-1]: "Critical Failure" })[degree];
}

function resultColor(degree) {
  return ({ 2: "#1f8f4d", 1: "#2f6fb0", 0: "#b36b00", [-1]: "#a83232" })[degree] ?? "#555";
}

function fmColor(value) {
  value = Number(value || 0);
  if (value <= 2) return "#1f8f4d";
  if (value <= 4) return "#6d8f1f";
  if (value <= 6) return "#b36b00";
  if (value <= 8) return "#b84a22";
  return "#a83232";
}

function signed(n) {
  n = Number(n || 0);
  return n >= 0 ? `+${n}` : `${n}`;
}

function spellKey(name, rank) {
  return `${String(name || "Spell").trim().toLowerCase()}|${rank}`;
}

function pill(text, color = "#555") {
  return `<span style="display:inline-block;padding:2px 6px;border-radius:999px;background:${color};color:white;font-size:11px;font-weight:700;margin-right:4px;white-space:nowrap;">${text}</span>`;
}

function row(label, value) {
  return `<div style="display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid rgba(0,0,0,.08);padding:3px 0;"><span style="opacity:.78;">${label}</span><strong style="text-align:right;">${value}</strong></div>`;
}

function ceCard({ title = "Escalating Spellcasting", subtitle = "", color = "#5b3f8c", body = "", footer = "" } = {}) {
  // Compact chat: if the body starts with the tag div, that part stays visible;
  // the mechanical details are hidden inside a clickable <details> block.
  const tagMatch = String(body).match(/^\s*<div style="margin-bottom:6px;">([\s\S]*?)<\/div>\s*/);
  const summaryTags = tagMatch ? tagMatch[1] : "";
  const detailsBody = tagMatch ? String(body).slice(tagMatch[0].length) : body;

  return `
    <div style="border:1px solid ${color};border-radius:8px;overflow:hidden;background:rgba(255,255,255,.03);">
      <div style="background:${color};color:white;padding:7px 9px;">
        <div style="font-size:15px;font-weight:800;line-height:1.1;">${title}</div>
        ${subtitle ? `<div style="font-size:12px;opacity:.9;margin-top:2px;">${subtitle}</div>` : ""}
      </div>
      <div style="padding:8px 9px;">
        ${summaryTags ? `<div style="margin-bottom:6px;">${summaryTags}</div>` : ""}
        <details style="margin-top:${summaryTags ? "4px" : "0"};">
          <summary style="cursor:pointer;font-weight:700;opacity:.85;list-style-position:inside;">Details</summary>
          <div style="margin-top:6px;">${detailsBody}</div>
        </details>
      </div>
      ${footer ? `<div style="padding:6px 9px;background:rgba(0,0,0,.06);font-size:12px;">${footer}</div>` : ""}
    </div>
  `;
}

function firstTarget() {
  return Array.from(game.user?.targets ?? [])[0] ?? null;
}

function targetAC(targetToken) {
  return Number(targetToken?.actor?.system?.attributes?.ac?.value ?? targetToken?.document?.actor?.system?.attributes?.ac?.value ?? 0);
}

function getStatisticMod(entry) {
  return Number(entry?.statistic?.mod ?? 0);
}

function sameSpellIdentity(a, b) {
  if (!a || !b) return false;
  const aSlug = a.slug ?? a.system?.slug;
  const bSlug = b.slug ?? b.system?.slug;
  if (aSlug && bSlug) return aSlug === bSlug;
  if (a.id && b.id) return a.id === b.id;
  return String(a.name ?? "").toLowerCase() === String(b.name ?? "").toLowerCase();
}

function preparedInstanceCount(entry, group, spell) {
  if (!entry?.isPrepared || entry?.isFlexible) return 1;
  const active = group?.active ?? [];
  const count = active.filter((spa) => spa?.spell && sameSpellIdentity(spa.spell, spell)).length;
  return Math.max(1, count || 1);
}

function heroPointsValue() {
  return Number(actor.system?.resources?.heroPoints?.value ?? 0);
}

async function spendHeroPoint() {
  const current = heroPointsValue();
  if (current <= 0) return false;
  await actor.update({ "system.resources.heroPoints.value": Math.max(0, current - 1) });
  return true;
}

async function chat(content) {
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
}

function simpleDialog({ title, content = "", buttons, defaultButton }) {
  return new Promise((resolve) => {
    const finalButtons = {};
    const buttonCount = Object.keys(buttons).length;
    const wide = buttonCount >= 10;
    const veryWide = buttonCount >= 18;
    const dialogWidth = veryWide ? 640 : wide ? 540 : 440;
    const dialogHeight = buttonCount >= 10 ? Math.floor(window.innerHeight * 0.82) : "auto";

    for (const [key, data] of Object.entries(buttons)) {
      finalButtons[key] = {
        label: data.label,
        icon: data.icon,
        callback: async (html) => {
          const form = html?.[0]?.querySelector?.("form");
          const formData = form ? Object.fromEntries(new FormData(form).entries()) : {};
          resolve({ key, data: formData });
        },
      };
    }

    const dialog = new Dialog({
      title,
      content: `<form>${content}</form>`,
      buttons: finalButtons,
      default: defaultButton ?? Object.keys(buttons)[0],
      close: () => resolve(null),
    }, { width: dialogWidth, height: dialogHeight });

    dialog.render(true);

    setTimeout(() => {
      const element = dialog.element?.[0] ?? dialog.element;
      if (!element) return;

      element.style.resize = "both";
      element.style.overflow = "hidden";
      element.style.maxHeight = "95vh";
      element.style.minWidth = `${dialogWidth}px`;

      const windowContent = element.querySelector?.(".window-content");
      if (windowContent) {
        windowContent.style.display = "flex";
        windowContent.style.flexDirection = "column";
        windowContent.style.gap = "6px";
        windowContent.style.maxHeight = "90vh";
        windowContent.style.overflow = "hidden";
      }

      const contentEl = element.querySelector?.(".dialog-content");
      if (contentEl) {
        contentEl.style.flex = "0 0 auto";
        contentEl.style.overflowY = "auto";
        contentEl.style.maxHeight = buttonCount >= 10 ? "18vh" : "32vh";
        contentEl.style.paddingBottom = "2px";
      }

      const buttonsEl = element.querySelector?.(".dialog-buttons");
      if (buttonsEl) {
        buttonsEl.style.flex = "1 1 auto";
        buttonsEl.style.overflowY = "auto";
        buttonsEl.style.maxHeight = buttonCount >= 10 ? "72vh" : "auto";
        buttonsEl.style.alignContent = "start";
        buttonsEl.style.gap = "5px";

        if (buttonCount >= 18) {
          buttonsEl.style.display = "grid";
          buttonsEl.style.gridTemplateColumns = "1fr 1fr";
        } else {
          buttonsEl.style.display = "flex";
          buttonsEl.style.flexDirection = "column";
        }

        for (const btn of buttonsEl.querySelectorAll("button")) {
          btn.style.margin = "0";
          btn.style.minHeight = "28px";
          btn.style.lineHeight = "1.15";
          btn.style.whiteSpace = "normal";
        }
      }

      try { dialog.setPosition({ width: dialogWidth, height: dialogHeight }); } catch (_) {}
    }, 50);
  });
}

async function rollD20(flavor) {
  const roll = await new Roll("1d20").evaluate({ async: true });
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor });
  const nat = roll.dice?.[0]?.results?.[0]?.result ?? roll.total;
  return nat;
}

async function rollD20WithHero(flavor, previewFn = null) {
  const firstNat = await rollD20(flavor);
  const hp = heroPointsValue();
  if (hp <= 0 || firstNat === 20) {
    return { nat: firstNat, originalNat: firstNat, heroUsed: false };
  }

  const previewHtml = typeof previewFn === "function"
    ? previewFn(firstNat)
    : `<p>First roll: <strong>d20(${firstNat})</strong></p>`;

  const res = await simpleDialog({
    title: "Use a Hero Point?",
    content: `
      ${previewHtml}
      <p>Hero Points available: <strong>${hp}</strong></p>
      <p>Spend 1 Hero Point to reroll? The new result will be used.</p>
    `,
    buttons: {
      no: { label: "Keep this roll" },
      yes: { label: "Use a Hero Point", icon: '<i class="fas fa-star"></i>' },
    },
    defaultButton: "no",
  });

  if (res?.key !== "yes") {
    return { nat: firstNat, originalNat: firstNat, heroUsed: false };
  }

  const spent = await spendHeroPoint();
  if (!spent) {
    ui.notifications.warn("No Hero Points available.");
    return { nat: firstNat, originalNat: firstNat, heroUsed: false };
  }

  const secondNat = await rollD20(`${flavor} — reroll with a Hero Point`);
  return { nat: secondNat, originalNat: firstNat, heroUsed: true };
}

async function askSpellstrikeFallback() {
  const res = await simpleDialog({
    title: "Spellstrike — casting failed",
    content: `
      <p>The attack landed, but the casting check failed (a normal failure, not critical). Choose:</p>
      <ul style="margin:6px 0 6px 18px;line-height:1.5;">
        <li><strong>Forced Effort</strong> — the spell manifests through the weapon; +2 extra MF.</li>
        <li><strong>Cantrip fallback</strong> — the spell is lost, but you channel a cantrip through the weapon instead; MF cost −1.</li>
        <li><strong>Lose the spell</strong> — the weapon hit stands, the spell is gone; full MF cost.</li>
      </ul>
    `,
    buttons: {
      force: { label: "Forced Effort (+2 MF)", icon: '<i class="fas fa-fire"></i>' },
      cantrip: { label: "Cantrip fallback (−1 MF)", icon: '<i class="fas fa-wind"></i>' },
      lose: { label: "Lose the spell", icon: '<i class="fas fa-times"></i>' },
    },
    defaultButton: "lose",
  });
  if (!res) return "lose";
  return res.key;
}

async function chooseEntry() {
  const entries = actor.itemTypes.spellcastingEntry ?? [];
  if (!entries.length) {
    ui.notifications.warn("No spellcasting entry found on this actor.");
    return null;
  }

  const buttons = {};
  for (const entry of entries) {
    buttons[entry.id] = { label: entry.name };
  }
  buttons.utility = { label: "Utilities / MF", icon: '<i class="fas fa-cog"></i>' };

  const fm = await getFM();
  const res = await simpleDialog({
    title: "Spellstrike — spellcasting entry",
    content: `<p><strong>${actor.name}</strong> — Current MF: <strong>${fm}</strong></p><p>Pick a spellcasting entry.</p>`,
    buttons,
  });

  if (!res) return null;
  if (res.key === "utility") return { utility: true };
  return entries.find((e) => e.id === res.key) ?? null;
}

async function chooseRank(entry, spellData) {
  const ranks = [];
  for (const group of spellData.groups ?? []) {
    const active = (group.active ?? []).filter((spa) => spa !== null);
    if (!active.length) continue;
    ranks.push(group);
  }

  if (!ranks.length) {
    ui.notifications.info("This entry has no spells available.");
    return null;
  }

  const buttons = {};
  for (const group of ranks) {
    const label = group.id === "cantrips" ? "Cantrips" : (group.label ?? `Rank ${group.id}`);
    buttons[String(group.id)] = { label };
  }

  const res = await simpleDialog({
    title: `${entry.name} — rank`,
    content: `<p>Pick the rank group for the Spellstrike.</p>`,
    buttons,
  });
  if (!res) return null;
  return ranks.find((g) => String(g.id) === res.key) ?? null;
}

async function chooseSpell(entry, group, opts = {}) {
  const spells = [];
  for (const [index, spa] of (group.active ?? []).entries()) {
    if (spa === null) continue;
    const spell = spa.spell;
    if (!spell) continue;
    spells.push({ spa, spell, index });
  }

  if (!spells.length) {
    ui.notifications.info("No spells in this rank group.");
    return null;
  }

  spells.sort((a, b) => a.spell.name.localeCompare(b.spell.name, game.i18n.lang));

  const buttons = {};
  spells.forEach((s, i) => {
    const tags = [];
    if (s.spell.isCantrip) tags.push("Cantrip");
    if (s.spell.isFocusSpell) tags.push("Focus");
    if (s.spa.signature || s.spell.system?.location?.signature) tags.push("Signature");
    if (s.spa.expended) tags.push("expended on sheet");
    buttons[String(i)] = { label: `${s.spell.name}${tags.length ? ` [${tags.join(", ")}]` : ""}` };
  });

  const res = await simpleDialog({
    title: opts.title ?? `${entry.name} — Spellstrike spell`,
    content: opts.content ?? `<p>Pick the spell you channel into Spellstrike.</p>`,
    buttons,
  });
  if (!res) return null;
  return spells[Number(res.key)] ?? null;
}


async function chooseFallbackCantrip(entry) {
  const spellData = await entry.getSheetData();
  const group = (spellData.groups ?? []).find((g) => g.id === "cantrips");
  if (!group || !(group.active ?? []).some((spa) => spa?.spell?.isCantrip)) {
    ui.notifications.info("No cantrip available to fall back to.");
    return null;
  }
  return await chooseSpell(entry, group, {
    title: `${entry.name} — cantrip fallback`,
    content: `<p>The attack landed but the spell failed. Channel a cantrip through the weapon instead — it is delivered with the same strike.</p>`,
  });
}

async function chooseStrike() {
  const template = "systems/pf2e/templates/actors/character/partials/strike.hbs";
  const base = await actor.sheet.getData();
  const starlit = actor.itemTypes.feat.some(f => f.slug === "starlit-span");
  const filter = (a) => starlit || a.item?.isMelee || a.altUsages?.some(aa => aa.item?.isMelee);
  const actions = new Map((base.data.actions ?? []).map((a, i) => [i, a]).filter(
    ([, a]) => a.visible && a.type === "strike" && a.item?.isEquipped && filter(a)
  ));

  if (!actions.size) {
    ui.notifications.warn("No equipped, usable strike found.");
    return null;
  }

  const attacksHtml = await Promise.all(Array.from(actions, ([index, action]) => renderTemplate(template, { ...base, index, action })));
  const content = `
    <style>
      .ce-spellstrike .actor.sheet.attack-popout section.window-content { background-image: inherit; }
      .ce-spellstrike .actor.sheet.attack-popout section.window-content .tab.actions { margin: 0; }
      .ce-spellstrike .actor.sheet.attack-popout section.window-content .tab.actions ol.strikes-list li.strike .item-name { align-items: center; }
      .ce-spellstrike .actor.sheet.attack-popout section.window-content .tab.actions ol.strikes-list li.strike div.auxiliary-actions { display: none; }
      .ce-spellstrike .actor.sheet.attack-popout section.window-content .tab.actions ol.strikes-list li.strike button.damage.tag { display: none; }
      .ce-spellstrike .actor.sheet.attack-popout section.window-content .tab.actions ol.strikes-list li.strike button.tag:disabled {
        background-color: var(--color-text-dark-inactive); cursor: not-allowed; pointer-events: initial;
      }
      ${starlit ? "" : `.ce-spellstrike ol.strikes-list li.strike div.alt-usage:has(button[data-alt-usage="thrown"]) { display: none; }`}
    </style>
    <p>Click the attack button (Strike and MAP) you want to use.</p>
    <div class="actor sheet attack-popout"><section class="window-content"><div class="tab actions active">
      <ol class="actions-list item-list directory-list strikes-list" data-strikes>
        ${attacksHtml.join("\n")}
      </ol>
    </div></section></div>
  `;

  return await new Promise(async (resolve) => {
    const dialog = new Dialog({
      title: "Spellstrike — pick the Strike",
      content,
      buttons: { cancel: { label: "Cancel", callback: () => resolve(null) } },
      render: (html) => {
        const strikes = html.find("ol.strikes-list > li.strike.ready[data-strike]:not(.hidden)");
        if (!starlit) {
          actions.forEach((a, i) => {
            if (!a.item?.isMelee) {
              strikes.filter(`[data-action-index=${i}]`).find("div.item-image, button.variant-strike:not([data-alt-usage])")
                .prop("disabled", true).click(e => e.stopImmediatePropagation())
                .attr("data-tooltip", "Ranged strikes not allowed");
            }
          });
        }
        strikes.find("[data-action=strike-attack]").on("click", (event) => {
          const button = $(event.delegateTarget);
          const index = Number(button.parents("[data-action-index]").data("action-index"));
          const variant = Number(button.data("variant-index"));
          const alt = button.data("alt-usage");
          const baseAction = actions.get(index);
          const action = alt ? baseAction.altUsages.find(a => a.item?.altUsageType === alt) : baseAction;
          dialog.close();
          resolve({ action, variant, event: event.originalEvent, alt });
        });
      }
    }, { classes: ["dialog", "ce-spellstrike"], width: 560, height: Math.floor(window.innerHeight * 0.75) });
    await dialog.render(true);
  });
}

function pf2eDegreeToCE(degree) {
  if (degree === 3) return 2;
  if (degree === 2) return 1;
  if (degree === 1) return 0;
  return -1;
}

async function rollStrikeWithHero(strikeChoice, { conjDC } = {}) {
  let strikeMsg = null;
  let strikeRoll = null;

  const roll = await strikeChoice.action.variants[strikeChoice.variant].roll({
    event: strikeChoice.event,
    callback: async (roll, outcome, msg) => {
      strikeRoll = roll;
      strikeMsg = msg;
    }
  });

  strikeRoll ??= roll;
  let nat = strikeRoll?.dice?.[0]?.results?.[0]?.result ?? null;
  let total = Number(strikeRoll?.total ?? 0);
  let attackDegree = pf2eDegreeToCE(strikeRoll?.degreeOfSuccess ?? strikeRoll?.options?.degreeOfSuccess);

  if (nat === null) {
    ui.notifications.warn("Could not read the Strike's d20.");
    return null;
  }

  const hp = heroPointsValue();
  if (hp > 0 && nat !== 20 && strikeMsg) {
    const hasConjPreview = Number.isFinite(Number(conjDC));
    const conjDegree = hasConjPreview ? degreeFromTotal(nat, total, conjDC) : null;
    const res = await simpleDialog({
      title: "Use a Hero Point on this Spellstrike?",
      content: `
        <div style="border:1px solid rgba(0,0,0,.15);border-radius:6px;padding:6px;margin:6px 0;background:rgba(0,0,0,.04);">
          <div><strong>Current attack:</strong> total <strong>${total}</strong> — ${degreeLabel(attackDegree)}</div>
          ${hasConjPreview ? `<div><strong>Current casting:</strong> same strike total <strong>${total}</strong> vs DC <strong>${conjDC}</strong> — ${degreeLabel(conjDegree)}</div>` : ""}
        </div>
        <p>Hero Points available: <strong>${hp}</strong></p>
        <p>Reroll the Strike with a Hero Point? The new strike result is also used for the casting check.</p>
      `,
      buttons: {
        no: { label: "Keep this roll" },
        yes: { label: "Use a Hero Point", icon: '<i class="fas fa-star"></i>' },
      },
      defaultButton: "no",
    });

    if (res?.key === "yes") {
      await game.pf2e.Check.rerollFromMessage(strikeMsg, { heroPoint: true });
      const rerollMsg = game.messages.contents.findLast(m => m.isReroll && m.speaker?.token === strikeMsg.speaker?.token);
      const reroll = rerollMsg?.rolls?.[0];
      if (reroll) {
        return {
          roll: reroll,
          nat: reroll.dice?.[0]?.results?.[0]?.result ?? nat,
          originalNat: nat,
          total: Number(reroll.total ?? total),
          attackDegree: pf2eDegreeToCE(reroll.degreeOfSuccess),
          heroUsed: true,
          strikeName: strikeChoice.action?.label ?? strikeChoice.action?.item?.name ?? "Strike",
        };
      }
    }
  }

  return {
    roll: strikeRoll,
    nat,
    originalNat: nat,
    total,
    attackDegree,
    heroUsed: false,
    strikeName: strikeChoice.action?.label ?? strikeChoice.action?.item?.name ?? "Strike",
  };
}

async function castWithoutSlot(entry, spell, { rank, slotId }) {
  await entry.cast(spell, { slotId, rank, message: true, consume: false });
}

async function castFocusNormally(entry, spell, { rank, slotId }) {
  await entry.cast(spell, { slotId, rank, message: true, consume: true });
}


async function rollStrikeDamage(strikeChoice, attackDegree) {
  if (attackDegree < 1) return false;
  try {
    if (attackDegree === 2 && typeof strikeChoice.action.critical === "function") {
      await strikeChoice.action.critical({ event: strikeChoice.event });
      return true;
    }
    if (typeof strikeChoice.action.damage === "function") {
      await strikeChoice.action.damage({ event: strikeChoice.event });
      return true;
    }
  } catch (err) {
    console.warn("Escalating Spellcasting | Could not roll strike damage automatically", err);
  }
  return false;
}

async function rollSpellDamageIfAny(spell, rank, event) {
  try {
    const spellVariant = spell.loadVariant?.({ castRank: rank }) ?? spell;
    const damage = await spellVariant.getDamage?.();
    if (!damage) return false;
    if (typeof spellVariant.rollDamage === "function") {
      await spellVariant.rollDamage(event);
      return true;
    }
  } catch (err) {
    console.warn("Escalating Spellcasting | Could not roll spell damage automatically", err);
  }
  return false;
}

async function utilityFlow() {
  const fm = await getFM();
  const res = await simpleDialog({
    title: "Utilities — Escalating Spellcasting",
    content: `<p><strong>${actor.name}</strong> — Current MF: <strong>${fm}</strong></p>`,
    buttons: {
      refocus: { label: "Refocus/Reorient: MF 0" },
      overload: { label: "Vital Overload: MF 4, Drained +2/+3" },
      reset: { label: "Clear the repetition log" },
      setfm: { label: "Adjust MF" },
    },
  });
  if (!res) return;

  if (res.key === "refocus") {
    await setFM(0);
    await chat(`<p><strong>Refocus/Reorient</strong>: MF ${fm} → <strong>0</strong>. Remember: once per hour.</p>`);
  }

  if (res.key === "reset") {
    await setReps({});
    await chat(`<p><strong>Repetition log cleared</strong> for ${actor.name}.</p>`);
  }

  if (res.key === "overload") {
    const over = await simpleDialog({
      title: "Vital Overload",
      content: `
        <p>Drop MF to 4 by burning your own vitality.</p>
        <div class="form-group"><label>Increase Drained by</label><input name="drained" type="number" min="1" max="10" value="2" /></div>
      `,
      buttons: { ok: { label: "Apply" }, cancel: { label: "Cancel" } },
    });
    if (!over || over.key !== "ok") return;
    const drainedIncrease = Math.max(1, Number(over.data.drained || 2));
    await setFM(4);
    let applied = 0;
    try {
      if (typeof actor.increaseCondition === "function") {
        for (let i = 0; i < drainedIncrease; i++) {
          await actor.increaseCondition("drained");
          applied++;
        }
      }
    } catch (err) {
      console.warn("Escalating Spellcasting | Could not apply Drained automatically", err);
    }
    await chat(ceCard({
      title: "Vital Overload",
      subtitle: actor.name,
      color: "#a83232",
      body: `
        ${pill("Vitality spent", "#a83232")}
        ${row("FM", `${fm} → <span style=\"color:${fmColor(4)}\">4</span>`)}
        ${row("Drained", `+${drainedIncrease}`)}
        ${row("Automatic application", applied === drainedIncrease ? "ok" : `partial/failed (${applied}/${drainedIncrease})`)}
      `,
      footer: applied === drainedIncrease ? `Drained +${drainedIncrease} applied automatically.` : `Apply Drained +${drainedIncrease} manually if needed.`
    }));
  }

  if (res.key === "setfm") {
    const set = await simpleDialog({
      title: "Adjust MF",
      content: `<div class="form-group"><label>New MF</label><input name="fm" type="number" min="0" max="10" value="${fm}" /></div>`,
      buttons: { ok: { label: "Apply" }, cancel: { label: "Cancel" } },
    });
    if (set?.key === "ok") {
      const newFM = clampFM(Number(set.data.fm || 0));
      await setFM(newFM);
      await chat(`<p><strong>MF adjusted</strong>: ${fm} → <strong>${newFM}</strong>.</p>`);
    }
  }
}

async function resolveSpellstrike(entry, spellChoice, group) {
  const spell = spellChoice.spell;
  const spa = spellChoice.spa;
  const slotIndex = spellChoice.index;

  let rank = group.id === "cantrips" ? 0 : Number(spa.castRank ?? group.id ?? spell.rank ?? spell.baseRank ?? 1);
  if (!Number.isFinite(rank)) rank = Number(spell.rank ?? spell.baseRank ?? 1);
  rank = Math.max(0, Math.min(10, rank));

  const fm = await getFM();
  const tgt = firstTarget();
  const tgtAC = targetAC(tgt);
  const preparedInstances = preparedInstanceCount(entry, group, spell);
  const actualSignature = Boolean(spa.signature || spell.system?.location?.signature);

  const config = await simpleDialog({
    title: `Spellstrike — ${spell.name}`,
    content: `
      <div class="form-group"><label>Spell rank</label><input name="rank" type="number" min="${spell.isCantrip ? 0 : 1}" max="10" value="${rank}" /></div>
      <div class="form-group"><label>RMax used for categories</label><input name="rmax" type="number" min="1" max="10" value="${defaultRMax()}" /></div>
      <hr/>
      <p><strong>Target:</strong> ${tgt?.name ?? "Target"} ${tgtAC ? `(AC ${tgtAC})` : ""}</p>
      <p>The strike's modifier is pulled from the sheet in the next window.</p>
      <hr/>
      <div class="form-group"><label>Extra DC adjustment</label><input name="dcMod" type="number" value="0" /></div>
      <p style="margin-top:-6px"><small>In Spellstrike, the strike's total result is also compared against the Casting DC.</small></p>
      <div class="form-group"><label><input type="checkbox" name="spontaneousRepeat" ${entry?.isSpontaneous ? "checked" : ""}/> Spontaneous repeat: 1 free repeat without Strain</label></div>
      ${actualSignature ? `<p style="margin-top:-6px"><small>Signature Spell detected: it gives you the spell at other ranks; it adds no extra protection at the same rank.</small></p>` : ""}
      <div class="form-group"><label><input type="checkbox" name="drainBonded" /> Drain Bonded Item</label></div>
      <hr/>
      <div class="form-group"><label><input type="checkbox" name="autoStrikeDamage" checked /> Roll strike damage automatically on a hit</label></div>
      <div class="form-group"><label><input type="checkbox" name="autoSpellDamage" /> Roll spell damage automatically if delivered</label></div>
      <p style="margin-top:-6px"><small>If the spell card has its own damage button, leave spell damage off and roll it there.</small></p>
      <p>Current MF: <strong>${fm}</strong></p>
    `,
    buttons: { roll: { label: "Roll Spellstrike", icon: '<i class="fas fa-dice-d20"></i>' }, cancel: { label: "Cancel" } },
  });
  if (!config || config.key !== "roll") return;

  rank = Math.max(spell.isCantrip ? 0 : 1, Math.min(10, Number(config.data.rank || rank)));
  const rmax = Math.max(1, Math.min(10, Number(config.data.rmax || defaultRMax())));
  const targetName = String(config.data.targetName || tgt?.name || "Target");
  const ac = tgtAC || 10;
  const dcMod = Number(config.data.dcMod || 0);
  const spontaneousRepeat = Boolean(config.data.spontaneousRepeat);
  const drainBonded = Boolean(config.data.drainBonded);
  const autoStrikeDamage = Boolean(config.data.autoStrikeDamage);
  const autoSpellDamage = Boolean(config.data.autoSpellDamage);

  // Cantrip Spellstrike: no manifestation check is made.
  // A cantrip is still a controlled channel of magic during a Spellstrike action, so
  // it works as a breather and reduces MF by 1, like a cantrip of 2+ actions.
  if (spell.isCantrip) {
    const strikeChoice = await chooseStrike();
    if (!strikeChoice) return;
    const strike = await rollStrikeWithHero(strikeChoice);
    if (!strike) return;

    const nat = strike.nat;
    const attackTotal = strike.total;
    const attackDegree = strike.attackDegree;
    const attackHits = attackDegree >= 1;
    const cantripDelta = -1;
    const newFM = clampFM(fm + cantripDelta);
    await setFM(newFM);

    if (attackHits) await castWithoutSlot(entry, spell, { rank: 0, slotId: slotIndex });

    await chat(ceCard({
      title: "Spellstrike — Cantrip",
      subtitle: `${spell.name} • ${targetName}`,
      color: resultColor(attackDegree),
      body: `
        <div style="margin-bottom:6px;">
          ${pill(`Attack: ${degreeLabel(attackDegree)}`, resultColor(attackDegree))}
          ${strike.heroUsed ? pill("Hero Point", "#d19a22") : ""}
          ${pill("Cantrip: -1 MF", "#1f8f4d")}
          ${attackHits ? pill("Spell delivered", "#1f8f4d") : pill("Spell lost", "#a83232")}
        </div>
        ${row("Entry", entry.name)}
        ${row("Strike", strike.strikeName)}
        ${row("Target", targetName)}
        ${row("Attack", `d20(${nat}) → total ${attackTotal}`)}
        ${strike.heroUsed ? row("Hero Point", `d20(${strike.originalNat}) → d20(${strike.nat})`) : ""}
        ${row("Spell delivered?", attackHits ? "Yes" : "No")}
        ${row("MF", `${fm} ${signed(cantripDelta)} → <span style=\"color:${fmColor(newFM)}\">${newFM}</span>`)}
      `,
      footer: attackHits ? "Cantrip delivered through Spellstrike. MF reduced by 1." : "The attack missed, so the spell is lost, but the cantrip still reduces MF by 1."
    }));
    if (autoStrikeDamage && attackHits) await rollStrikeDamage(strikeChoice, attackDegree);
    if (autoSpellDamage && attackHits) await rollSpellDamageIfAny(spell, 0, strikeChoice.event);
    return;
  }

  const baseDC = CE.cd[rank];
  const category = categoryForRank(rank, rmax);
  const reps = await getReps();
  const key = spellKey(spell.name, rank);
  const previous = Number(reps[key] ?? 0);
  const preparedRepeatProtection = Math.max(0, preparedInstances - 1);
  const spontaneousRepeatProtection = spontaneousRepeat ? 1 : 0;
  const protectedRepeats = Math.max(preparedRepeatProtection, spontaneousRepeatProtection);
  const effectiveReps = drainBonded ? 0 : Math.max(0, previous - protectedRepeats);
  const tensionCD = effectiveReps * 2;
  const tensionFM = effectiveReps;

  const dc = baseDC + fm + tensionCD + dcMod;
  const strikeChoice = await chooseStrike();
  if (!strikeChoice) return;
  const rollInfo = await rollStrikeWithHero(strikeChoice, { conjDC: dc });
  if (!rollInfo) return;

  const nat = rollInfo.nat;
  const attackTotal = rollInfo.total;
  const attackDegree = rollInfo.attackDegree;
  const attackHits = attackDegree >= 1;

  const conjTotal = attackTotal;
  const conjDegree = degreeFromTotal(nat, conjTotal, dc);
  let delta = CE.delta[category][conjDegree] + tensionFM;
  let forced = false;
  let fallbackCantrip = null;

  if (attackHits && conjDegree === 0) {
    const fallback = await askSpellstrikeFallback();
    if (fallback === "force") {
      forced = true;
      delta += 2;
    } else if (fallback === "cantrip") {
      fallbackCantrip = await chooseFallbackCantrip(entry);
      if (fallbackCantrip) delta -= 1;
    }
  }

  if (drainBonded) delta -= 2;

  const magicManifests = conjDegree >= 1 || forced;
  const delivered = attackHits && magicManifests;
  const cantripDelivered = fallbackCantrip !== null;
  const newFM = clampFM(fm + delta);
  await setFM(newFM);

  reps[key] = previous + 1;
  await setReps(reps);

  const color = delivered ? resultColor(attackDegree) : attackHits ? resultColor(conjDegree) : "#a83232";
  const resultText = delivered
    ? "Attack and spell both land"
    : cantripDelivered
      ? "Attack lands; the spell is lost, a cantrip is channeled through instead"
      : attackHits
        ? "Attack lands; the spell is lost"
        : "Attack misses; the spell is lost";

  await chat(ceCard({
    title: "Spellstrike — Escalating Spellcasting",
    subtitle: `${spell.name} • Rank ${rank} • ${category}`,
    color,
    body: `
      <div style="margin-bottom:6px;">
        ${pill(`Attack: ${degreeLabel(attackDegree)}`, resultColor(attackDegree))}
        ${pill(`Casting: ${degreeLabel(conjDegree)}`, resultColor(conjDegree))}
        ${rollInfo.heroUsed ? pill("Hero Point", "#d19a22") : ""}
        ${forced ? pill("Forced Effort", "#b36b00") : ""}
        ${cantripDelivered ? pill("Cantrip fallback", "#2f6fb0") : ""}
        ${spontaneousRepeat ? pill("Spontaneous", "#5b3f8c") : ""}
        ${actualSignature ? pill("Signature", "#5b3f8c") : ""}
        ${drainBonded ? pill("Drain Bonded", "#444") : ""}
        ${delivered ? pill("Spell delivered", "#1f8f4d") : pill("Spell lost", "#a83232")}
      </div>
      ${row("Result", resultText)}
      ${row("Entry", entry.name)}
      ${row("Target", targetName)}
      ${row("Rank / Category", `Rank ${rank} / ${category}`)}
      ${row("Target AC", ac)}
      ${row("Strike", rollInfo.strikeName)}
      ${row("Attack", `d20(${nat}) → total ${attackTotal}`)}
      ${row("Casting DC", `${baseDC} base + ${fm} MF + ${tensionCD} strain + ${dcMod} adjustment = ${dc}`)}
      ${row("Casting", `same strike total ${conjTotal} vs DC ${dc}`)}
      ${rollInfo.heroUsed ? row("Hero Point", `d20(${rollInfo.originalNat}) → d20(${rollInfo.nat})`) : ""}
      ${row("Attack hit?", attackHits ? "Yes" : "No")}
      ${row("Did the spell manifest?", magicManifests ? "Yes" : "No")}
      ${row("Spell delivered?", delivered ? "Yes" : "No")}
      ${cantripDelivered ? row("Fallback cantrip", `${fallbackCantrip.spell.name} — delivered with the same strike`) : ""}
      ${row("Earlier repeats", previous)}
      ${preparedInstances > 1 ? row("Prepared instances", preparedInstances) : ""}
      ${spontaneousRepeat ? row("Spontaneous repeat", "1 free repeat without Strain") : ""}
      ${actualSignature ? row("Signature Spell", "gives the spell at other ranks") : ""}
      ${protectedRepeats > 0 ? row("Protected repeats", protectedRepeats) : ""}
      ${effectiveReps > 0 ? row("Effective repeats", effectiveReps) : ""}
      ${drainBonded ? row("Drain Bonded Item", "ignores Strain and adjusts MF by -2") : ""}
      ${row("Strain applied", `DC ${signed(tensionCD)}, MF ${signed(tensionFM)}`)}
      ${row("MF", `${fm} ${signed(delta)} → <span style=\"color:${fmColor(newFM)}\">${newFM}</span>`)}
    `,
    footer: delivered
      ? "The spell card is posted next. Use the attack result above; do not roll a second attack from the card."
      : cantripDelivered
        ? "The spell was lost, but the cantrip fallback is delivered with the strike that landed. Its card is posted next."
        : attackHits
          ? "The attack hit, but the spell was not delivered. MF was applied from the casting result."
          : "The attack missed; the spell is lost. MF was applied from the casting result."
  }));

  if (delivered) {
    await castWithoutSlot(entry, spell, { rank, slotId: slotIndex });
  } else if (cantripDelivered) {
    await castWithoutSlot(entry, fallbackCantrip.spell, { rank: 0, slotId: fallbackCantrip.index });
  }
  if (autoStrikeDamage && attackHits) {
    await rollStrikeDamage(strikeChoice, attackDegree);
  }
  if (autoSpellDamage && delivered) {
    await rollSpellDamageIfAny(spell, rank, strikeChoice.event);
  }
}

async function runSpellstrikeFlow(entry) {
  const spellData = await entry.getSheetData();
  const group = await chooseRank(entry, spellData);
  if (!group) return;
  const spellChoice = await chooseSpell(entry, group);
  if (!spellChoice) return;
  await resolveSpellstrike(entry, spellChoice, group);
}

const chosenEntry = await chooseEntry();
if (!chosenEntry) return;
if (chosenEntry.utility) return utilityFlow();
await runSpellstrikeFlow(chosenEntry);
