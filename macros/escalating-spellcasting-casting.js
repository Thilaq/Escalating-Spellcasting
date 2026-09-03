/*
 * Escalating Spellcasting for Pathfinder 2e: spellcaster macro
 * https://github.com/<your-username>/escalating-spellcasting
 *
 * Macro code: MIT licensed (see LICENSE-CODE.txt), use it however you like, keep this header.
 * Rules text: CC BY-NC-SA 4.0 (see LICENSE.md).
 * Unofficial fan content. Not affiliated with or endorsed by Paizo Inc.
 * Mechanical inspiration: the fatigue-based magic of Arcana Primária (Nozes Game Studio).
 */

/*
Escalating Spellcasting for Pathfinder 2e: spellcaster macro
Version: 1.2

An alternative, slot-free way to cast: a spellcaster can always try to cast, but every
spell of rank 1 or higher is a check against the caster's accumulated Magic Fatigue (MF).

What this macro does:
- reads the real spellbook from the sheet, using the same API pattern the PF2e Workbench
  Caster's Spellbook uses:
    actor.itemTypes.spellcastingEntry -> entry.getSheetData() -> entry.cast(...)
- never spends a spell slot: entry.cast(spell, { consume: false })
- rolls one d20 for the Casting Check and compares it against the Effective Casting DC
- applies Magic Fatigue according to the result, and tracks Repetition Strain
- posts the spell's chat card only when the spell actually manifests
- on a normal failure, offers three fallbacks: cantrip (-1 MF), recover an action, or Forced Effort
- supports Hero Points: it shows the current result before you spend one

Cantrips and focus spells:
- cantrips make no check; a cantrip of 2+ actions reduces MF by 1, a 1 action/reaction
  cantrip is neutral
- focus spells follow the normal PF2e Focus Point economy and never touch MF

Installation:
1. Create a Foundry macro of type "Script" (not "chat").
2. Paste this whole file into it.
3. Select exactly one token, then run the macro.
4. Optional: target a token so its AC is filled in automatically for attack spells.
*/

if (canvas.tokens.controlled.length === 0) return ui.notifications.warn("Select a token.");
if (canvas.tokens.controlled.length > 1) return ui.notifications.warn("Select exactly one token.");

const actor = token.actor;
if (!actor?.isSpellcaster) return ui.notifications.warn(`${actor?.name ?? "This actor"} is not a spellcaster.`);

const CE = {
  scope: "world",
  fmFlag: "escalatingSpellcastingMF",
  repsFlag: "escalatingSpellcastingReps",
  bonusFlag: "escalatingSpellcastingBonus",
  cap: 10,
  cd: { 1: 15, 2: 18, 3: 20, 4: 23, 5: 26, 6: 28, 7: 31, 8: 34, 9: 36, 10: 39 },
  delta: {
    High: { 2: 0, 1: 2, 0: 3, [-1]: 5 },
    Mid: { 2: -1, 1: 1, 0: 2, [-1]: 4 },
    Low: { 2: -2, 1: -1, 0: 1, [-1]: 2 },
  },
  counterDelta: { 2: -1, 1: 0, 0: 1, [-1]: 2 },
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

function signed(n) {
  n = Number(n || 0);
  return n >= 0 ? `+${n}` : `${n}`;
}

function spellKey(name, rank) {
  return `${String(name || "Spell").trim().toLowerCase()}|${rank}`;
}

function spellActionCount(spell) {
  const raw = String(spell.system?.time?.value ?? "").toLowerCase();
  // "reação" is kept so the macro also works on a world using the pt-BR system language.
  if (raw.includes("reaction") || raw.includes("reação")) return 0;
  const numeric = Number(raw.match(/\d+/)?.[0] ?? NaN);
  if (Number.isFinite(numeric)) return numeric;
  if (raw.includes("one")) return 1;
  if (raw.includes("two")) return 2;
  if (raw.includes("three")) return 3;
  return 2;
}

function getStatisticMod(entry) {
  return Number(entry?.statistic?.mod ?? 0);
}

function firstTarget() {
  return Array.from(game.user?.targets ?? [])[0] ?? null;
}

function targetAC(targetToken) {
  return Number(targetToken?.actor?.system?.attributes?.ac?.value ?? targetToken?.document?.actor?.system?.attributes?.ac?.value ?? 0);
}

function getSpellName(spellWrap) {
  return spellWrap?.spell?.name ?? spellWrap?.name ?? "Spell";
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

async function chat(content) {
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
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

function pill(text, color = "#555") {
  return `<span style="display:inline-block;padding:2px 6px;border-radius:999px;background:${color};color:white;font-size:11px;font-weight:700;margin-right:4px;white-space:nowrap;">${text}</span>`;
}

function row(label, value) {
  return `<div style="display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid rgba(0,0,0,.08);padding:3px 0;"><span style="opacity:.78;">${label}</span><strong style="text-align:right;">${value}</strong></div>`;
}

function ceCard({ title = "Escalating Spellcasting", subtitle = "", color = "#5b3f8c", body = "", footer = "" } = {}) {
  // Compact chat output: when the body starts with the tag div, that part stays visible and
  // the mechanical detail is folded into a clickable <details> block.
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

async function rollD20(flavor) {
  const roll = await new Roll("1d20").evaluate({ async: true });
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor });
  const nat = roll.dice?.[0]?.results?.[0]?.result ?? roll.total;
  return nat;
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

async function rollD20WithHero(flavor, context = {}) {
  const firstNat = await rollD20(flavor);
  const hp = heroPointsValue();
  if (hp <= 0 || firstNat === 20) {
    return { nat: firstNat, originalNat: firstNat, heroUsed: false };
  }

  const hasPreview = Number.isFinite(Number(context.bonus)) && Number.isFinite(Number(context.dc));
  const previewTotal = hasPreview ? firstNat + Number(context.bonus) : null;
  const previewDegree = hasPreview ? degreeFromTotal(firstNat, previewTotal, Number(context.dc)) : null;
  const previewHtml = hasPreview ? `
      <div style="border:1px solid rgba(0,0,0,.15);border-radius:6px;padding:6px;margin:6px 0;background:rgba(0,0,0,.04);">
        <div><strong>Current result:</strong> d20(${firstNat}) ${signed(context.bonus)} = <strong>${previewTotal}</strong> vs DC <strong>${context.dc}</strong></div>
        <div><strong>Current degree:</strong> ${degreeLabel(previewDegree)}</div>
      </div>
    ` : `<p>First roll: <strong>d20(${firstNat})</strong></p>`;

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

    // Cosier layout for long spell lists: the stock Dialog can open too small and push the
    // last buttons off screen.
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

      const form = element.querySelector?.("form");
      if (form) {
        form.style.marginBottom = "0";
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

      try {
        dialog.setPosition({ width: dialogWidth, height: dialogHeight });
      } catch (_) {}
    }, 50);
  });
}

async function askFallback() {
  const res = await simpleDialog({
    title: "Spell failed — pick a fallback",
    content: `
      <p>The spell failed (a normal failure, not critical). Choose how it falls apart:</p>
      <ul style="margin:6px 0 6px 18px;line-height:1.5;">
        <li><strong>Cantrip fallback</strong> — deliver a cantrip of 2 actions or fewer; the MF you take is reduced by 1.</li>
        <li><strong>Recover an action</strong> — the spell is lost, but you get one of the actions back; full MF cost.</li>
        <li><strong>Forced Effort</strong> — the spell works as if you had succeeded; +2 extra MF.</li>
      </ul>
    `,
    buttons: {
      cantrip: { label: "Cantrip fallback (−1 MF)", icon: '<i class="fas fa-wind"></i>' },
      action: { label: "Recover an action", icon: '<i class="fas fa-undo"></i>' },
      force: { label: "Forced Effort (+2 MF)", icon: '<i class="fas fa-fire"></i>' },
    },
    defaultButton: "action",
  });
  if (!res) return "action";
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
  buttons.counter = { label: "Counterspell", icon: '<i class="fas fa-ban"></i>' };

  const fm = await getFM();
  const res = await simpleDialog({
    title: "Escalating Spellcasting — spellcasting entry",
    content: `<p><strong>${actor.name}</strong> — Current MF: <strong>${fm}</strong></p><p>Pick a spellcasting entry.</p>`,
    buttons,
  });

  if (!res) return null;
  if (res.key === "utility") return { utility: true };
  if (res.key === "counter") return { counter: true };
  return entries.find((e) => e.id === res.key) ?? null;
}

async function chooseRank(entry, spellData) {
  const ranks = [];
  const preparedByRank = {};

  for (const group of spellData.groups ?? []) {
    const active = (group.active ?? []).filter((spa) => spa !== null);
    if (!active.length) continue;

    // Unlike the Workbench macro we do not filter out expended slots or zero uses, because in
    // this system slots do not gate access to spells.
    ranks.push(group);

    const numericRank = group.id === "cantrips" ? 0 : Number(group.id ?? group.number ?? 0);
    preparedByRank[numericRank] = active.map((spa) => spa.spell).filter(Boolean);
  }

  // A prepared caster may improvise a learned spell they did not prepare, at a cost: no +2
  // status bonus and +2 to the DC. We read prepList from the sheet for that.
  if (entry?.isPrepared && spellData.prepList) {
    for (const [rankKey, prepEntries] of Object.entries(spellData.prepList)) {
      const rank = Number(rankKey);
      if (!rank || !Array.isArray(prepEntries) || !prepEntries.length) continue;

      const alreadyPrepared = preparedByRank[rank] ?? [];
      const unprepared = prepEntries
        .map((pe) => pe?.spell)
        .filter((spell) => spell && !alreadyPrepared.some((p) => sameSpellIdentity(p, spell)));

      if (!unprepared.length) continue;

      ranks.push({
        id: rank,
        number: rank,
        label: `Rank ${rank} — learned, not prepared`,
        unprepared: true,
        active: unprepared.map((spell) => ({ spell, unprepared: true, expended: false })),
      });
    }
  }

  if (!ranks.length) {
    ui.notifications.info("This entry has no spells available.");
    return null;
  }

  const buttons = {};
  ranks.forEach((group, i) => {
    const baseLabel = group.id === "cantrips" ? "Cantrips" : (group.label ?? `Rank ${group.id}`);
    const label = group.unprepared ? `${baseLabel} (improvise)` : baseLabel;
    buttons[String(i)] = { label };
  });

  const res = await simpleDialog({
    title: `${entry.name} — rank`,
    content: `<p>Pick the rank group.</p>`,
    buttons,
  });
  if (!res) return null;
  return ranks[Number(res.key)] ?? null;
}

async function chooseSpell(entry, group) {
  const spells = [];
  for (const [index, spa] of (group.active ?? []).entries()) {
    if (spa === null) continue;
    const spell = spa.spell;
    if (!spell) continue;

    // Should focus spells only show when Focus Points are left? For this system we always show
    // them; the regular PF2e cast blocks them if no Focus Point is left when consume=true.
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
    if (s.spa.unprepared || group.unprepared) tags.push("Unprepared");
    if (s.spa.signature || s.spell.system?.location?.signature) tags.push("Signature");
    if (s.spa.expended) tags.push("expended on sheet");
    buttons[String(i)] = { label: `${s.spell.name}${tags.length ? ` [${tags.join(", ")}]` : ""}` };
  });

  const res = await simpleDialog({
    title: `${entry.name} — pick a spell`,
    content: `<p>The buttons list the real spells on the sheet. Expended slots still show up, because slots are not a resource in this system.</p>`,
    buttons,
  });
  if (!res) return null;
  return spells[Number(res.key)] ?? null;
}

async function castWithoutSlot(entry, spell, { rank, slotId }) {
  // This is the key difference from the Workbench macro:
  //   Workbench: entry.cast(spell, { slotId, rank, message: true }) -> consume defaults to true
  //   Here: consume:false -> no spell slot or item usage is spent.
  await entry.cast(spell, { slotId, rank, message: true, consume: false });
}

async function castFocusNormally(entry, spell, { rank, slotId }) {
  // Focus Points remain a normal PF2e resource.
  await entry.cast(spell, { slotId, rank, message: true, consume: true });
}

async function resolveChosenSpell(entry, spellChoice, group) {
  const spell = spellChoice.spell;
  const spa = spellChoice.spa;
  const slotIndex = spellChoice.index;

  let rank = group.id === "cantrips" ? 0 : Number(spa.castRank ?? group.id ?? spell.rank ?? spell.baseRank ?? 1);
  if (!Number.isFinite(rank)) rank = Number(spell.rank ?? spell.baseRank ?? 1);
  rank = Math.max(0, Math.min(10, rank));

  const fm = await getFM();
  const isUnprepared = Boolean(spa.unprepared || group.unprepared);

  // Cantrips
  if (spell.isCantrip) {
    const actions = spellActionCount(spell);
    const delta = actions >= 2 ? -1 : 0;
    const newFM = clampFM(fm + delta);
    await setFM(newFM);
    await chat(ceCard({
      title: "Cantrip — Escalating Spellcasting",
      subtitle: `${spell.name} • ${actions >= 2 ? "2+ actions" : "1 action/reaction"}`,
      color: actions >= 2 ? "#1f8f4d" : "#555",
      body: `
        ${pill(spell.name, actions >= 2 ? "#1f8f4d" : "#555")}
        ${row("Casting check", "not required")}
        ${row("Effect on MF", `${fm} ${signed(delta)} → <span style="color:${fmColor(newFM)}">${newFM}</span>`)}
      `,
      footer: actions >= 2 ? "A cantrip of 2+ actions reduces MF by 1 automatically." : "A 1 action/reaction cantrip is neutral for MF."
    }));
    await castWithoutSlot(entry, spell, { rank: 0, slotId: slotIndex });
    return;
  }

  // Focus Spells
  if (spell.isFocusSpell) {
    await chat(ceCard({
      title: "Focus Spell",
      subtitle: spell.name,
      color: "#5b3f8c",
      body: `
        ${pill("Focus", "#5b3f8c")}
        ${row("Interaction with MF", "none")}
        ${row("Resource", "regular Focus Point")}
      `,
      footer: "Focus spells use the normal Focus Point economy and never change MF."
    }));
    await castFocusNormally(entry, spell, { rank: rank || defaultRMax(), slotId: slotIndex });
    return;
  }

  const baseRank = Math.max(1, rank);
  const defaultExtra = isUnprepared ? 0 : Number(actor.getFlag(CE.scope, CE.bonusFlag) ?? 2);
  const defaultDcMod = isUnprepared ? 2 : 0;
  const actualSignature = Boolean(spa.signature || spell.system?.location?.signature);
  const defaultSpontaneousRepeat = Boolean(entry?.isSpontaneous);
  const preparedInstances = preparedInstanceCount(entry, group, spell);
  const tgt = firstTarget();
  const tgtAC = targetAC(tgt);
  const attackBlock = spell.isAttack ? `
      <hr/>
      <p><strong>Attack spell detected.</strong></p>
      <div class="form-group"><label>Integrated attack target</label><input name="attackTarget" type="text" value="${tgt?.name ?? "Target"}" /></div>
      <div class="form-group"><label>Target AC</label><input name="attackAC" type="number" value="${tgtAC || 10}" /></div>
      <div class="form-group"><label>Extra attack adjustment</label><input name="attackExtra" type="number" value="0" /></div>
      <p style="margin-top:-6px"><small>The attack uses the same d20 as the casting check. By default it does not add the +2 manifestation bonus.</small></p>
    ` : "";

  const options = await simpleDialog({
    title: `Cast ${spell.name}`,
    content: `
      <div class="form-group"><label>Casting rank</label><input name="rank" type="number" min="1" max="10" value="${baseRank}" /></div>
      <div class="form-group"><label>RMax used for categories</label><input name="rmax" type="number" min="1" max="10" value="${defaultRMax()}" /></div>
      <div class="form-group"><label>Extra check modifier</label><input name="bonusExtra" type="number" value="${defaultExtra}" /></div>
      <p style="margin-top:-6px"><small>Use +2 for a prepared or repertoire spell. Use 0 if the class gives no bonus.</small></p>
      <div class="form-group"><label>Extra DC adjustment</label><input name="dcMod" type="number" value="${defaultDcMod}" /></div>
      ${isUnprepared
        ? `<p style="margin-top:-6px"><small>Learned but unprepared spell: no +2 status bonus and +2 to the DC. It always rolls, even outside combat.</small></p>`
        : `<div class="form-group"><label><input type="checkbox" name="outOfCombat" /> Out of combat (safe casting, no roll)</label></div>
           <p style="margin-top:-6px"><small>Prepared or repertoire spell outside combat: automatic, no check, no strain. MF moves by the exploration table (+2 High, +1 Mid, 0 Low).</small></p>`}
      <div class="form-group"><label><input type="checkbox" name="spontaneousRepeat" ${defaultSpontaneousRepeat ? "checked" : ""}/> Spontaneous repeat: 1 free repeat without Strain</label></div>
      ${actualSignature ? `<p style="margin-top:-6px"><small>Signature Spell detected: it gives you the spell at other ranks; it adds no extra protection at the same rank.</small></p>` : ""}
      <div class="form-group"><label><input type="checkbox" name="drainBonded" /> Drain Bonded Item</label></div>
      ${attackBlock}
      <p>Current MF: <strong>${fm}</strong></p>
    `,
    buttons: {
      cast: { label: "Roll casting check", icon: '<i class="fas fa-dice-d20"></i>' },
      cancel: { label: "Cancel" },
    },
  });
  if (!options || options.key !== "cast") return;

  rank = Math.max(1, Math.min(10, Number(options.data.rank || baseRank)));
  const rmax = Math.max(1, Math.min(10, Number(options.data.rmax || defaultRMax())));
  const bonusExtra = Number(options.data.bonusExtra || 0);
  const dcMod = Number(options.data.dcMod || 0);
  const spontaneousRepeat = Boolean(options.data.spontaneousRepeat);
  const signature = actualSignature;
  const drainBonded = Boolean(options.data.drainBonded);
  const outOfCombat = Boolean(options.data.outOfCombat);
  const attackTargetName = String(options.data.attackTarget || tgt?.name || "Target");
  const attackAC = Number(options.data.attackAC || 0);
  const attackExtra = Number(options.data.attackExtra || 0);
  await actor.setFlag(CE.scope, CE.bonusFlag, bonusExtra);

  const baseDC = CE.cd[rank];
  const category = categoryForRank(rank, rmax);

  // Safe casting outside combat (prepared/repertoire only): no check, no strain.
  if (outOfCombat) {
    const safeDelta = { High: 2, Mid: 1, Low: 0 }[category];
    const newFM = clampFM(fm + safeDelta);
    await setFM(newFM);
    await chat(ceCard({
      title: "Escalating Spellcasting — Exploration",
      subtitle: `${spell.name} • Rank ${rank} • ${category}`,
      color: "#2f6fb0",
      body: `
        <div style="margin-bottom:6px;">
          ${pill("Safe casting", "#2f6fb0")}
          ${pill("No check", "#1f8f4d")}
        </div>
        ${row("Entry", entry.name)}
        ${row("Rank / Category", `Rank ${rank} / ${category}`)}
        ${row("Casting check", "not required")}
        ${row("Strain", "none (outside combat)")}
        ${row("MF", `${fm} ${signed(safeDelta)} → <span style="color:${fmColor(newFM)}">${newFM}</span>`)}
      `,
      footer: "Prepared or repertoire spell cast outside combat: automatic, 10 minutes, no strain. MF moves by the exploration table."
    }));
    await castWithoutSlot(entry, spell, { rank, slotId: slotIndex });
    return;
  }

  const reps = await getReps();
  const key = spellKey(spell.name, rank);
  const previous = Number(reps[key] ?? 0);

  // Protections against Repetition Strain:
  // - Prepared casters: several prepared instances of the same spell at the same rank protect
  //   that many repeats.
  // - Spontaneous casters: a repertoire spell may be repeated once at the same rank for free.
  // - Signature Spells keep their original benefit (the spell at other ranks) and add no extra
  //   protection at the same rank.
  const spontaneousRepeatProtection = spontaneousRepeat ? 1 : 0;
  const preparedRepeatProtection = Math.max(0, preparedInstances - 1);
  const protectedRepeats = Math.max(preparedRepeatProtection, spontaneousRepeatProtection);
  const effectiveReps = drainBonded ? 0 : Math.max(0, previous - protectedRepeats);
  const tensionCD = effectiveReps * 2;
  const tensionFM = effectiveReps;

  const dc = baseDC + fm + tensionCD + dcMod;
  const baseMod = getStatisticMod(entry);
  const totalBonus = baseMod + bonusExtra;

  const rollInfo = await rollD20WithHero(`Escalating Spellcasting: ${spell.name} Rank ${rank}`, { bonus: totalBonus, dc });
  const nat = rollInfo.nat;
  const total = nat + totalBonus;
  const degree = degreeFromTotal(nat, total, dc);

  let delta = CE.delta[category][degree];
  let forced = false;
  let fallback = null;
  if (degree === 0) {
    fallback = await askFallback();
    if (fallback === "force") {
      forced = true;
      delta += 2;
    } else if (fallback === "cantrip") {
      delta -= 1;
    }
  }

  delta += tensionFM;
  if (drainBonded) delta -= 2;

  const manifests = degree >= 1 || forced;
  const newFM = clampFM(fm + delta);
  await setFM(newFM);

  reps[key] = previous + 1;
  await setReps(reps);

  const color = resultColor(degree);
  const manifestText = manifests ? "Yes" : "No";
  let attackRows = "";
  let attackPills = "";
  let attackFooter = "";

  if (spell.isAttack) {
    if (attackAC > 0) {
      const attackBonus = baseMod + attackExtra;
      const attackTotal = nat + attackBonus;
      const attackDegree = manifests ? degreeFromTotal(nat, attackTotal, attackAC) : null;
      const attackWorks = manifests && attackDegree >= 1;
      attackPills = manifests
        ? pill(`Attack: ${degreeLabel(attackDegree)}`, resultColor(attackDegree))
        : pill("Attack does not happen", "#777");
      attackRows = `
        <div style="margin-top:7px;padding-top:5px;border-top:1px solid rgba(0,0,0,.15);"></div>
        ${row("Integrated attack", attackTargetName)}
        ${row("Target AC", attackAC)}
        ${row("Attack modifier", `${baseMod} spellcasting ${signed(attackExtra)} adjustment = ${signed(attackBonus)}`)}
        ${row("Attack total", `d20(${nat}) ${signed(attackBonus)} = ${attackTotal}`)}
        ${row("Attack result", manifests ? degreeLabel(attackDegree) : "does not happen")}
      `;
      attackFooter = manifests
        ? "Attack spell: use the integrated result above. Do not click Attack on the spell card, it would roll a second d20."
        : fallback === "cantrip"
          ? "The spell did not manifest. Cantrip fallback: deliver a cantrip of 2 actions or fewer (its relief is already included, do not apply it again)."
          : fallback === "action"
            ? "The spell did not manifest. You regain one of the actions you spent on it."
            : "The spell did not manifest, so its attack roll never happens.";
    } else {
      attackPills = pill("Attack without AC", "#b36b00");
      attackRows = row("Integrated attack", "no AC provided; resolve it manually if needed");
      attackFooter = "Attack spell detected, but no valid AC was provided.";
    }
  }

  const footer = spell.isAttack
    ? attackFooter
    : manifests
      ? "The spell manifested. Its spell card is posted next."
      : fallback === "cantrip"
        ? "Cantrip fallback: deliver a cantrip of 2 actions or fewer. Its relief is already included (−1 MF); do not apply the cantrip's own −1."
        : fallback === "action"
          ? "The spell did not manifest. You regain one of the actions you spent on it."
          : "The spell did not manifest. No spell effect is applied.";

  await chat(ceCard({
    title: "Escalating Spellcasting",
    subtitle: `${spell.name} • Rank ${rank} • ${category}`,
    color,
    body: `
      <div style="margin-bottom:6px;">
        ${pill(degreeLabel(degree), color)}
        ${rollInfo?.heroUsed ? pill("Hero Point", "#d19a22") : ""}
        ${forced ? pill("Forced Effort", "#b36b00") : ""}
        ${fallback === "cantrip" ? pill("Cantrip fallback", "#2f6fb0") : ""}
        ${fallback === "action" ? pill("Action recovered", "#2f6fb0") : ""}
        ${signature ? pill("Signature", "#5b3f8c") : ""}
        ${isUnprepared ? pill("Unprepared", "#b36b00") : ""}
        ${drainBonded ? pill("Drain Bonded", "#444") : ""}
        ${manifests ? pill("Manifested", "#1f8f4d") : pill("Did not manifest", "#a83232")}
        ${attackPills}
      </div>
      ${row("Entry", entry.name)}
      ${isUnprepared ? row("Unprepared spell", "no +2 status, +2 to the DC") : ""}
      ${row("DC", `${baseDC} base + ${fm} MF + ${tensionCD} strain + ${dcMod} adjustment = ${dc}`)}
      ${row("Modifier", `${baseMod} spellcasting ${signed(bonusExtra)} extra = ${signed(totalBonus)}`)}
      ${row("Roll", `d20(${nat}) ${signed(totalBonus)} = ${total}`)}
      ${rollInfo?.heroUsed ? row("Hero Point", `d20(${rollInfo.originalNat}) → d20(${rollInfo.nat})`) : ""}
      ${row("Result", `${degreeLabel(degree)}${forced ? " — Forced Effort" : ""}`)}
      ${fallback === "cantrip" ? row("Cantrip fallback", "deliver a cantrip (2 actions or fewer); MF cost −1 (already applied)") : ""}
      ${fallback === "action" ? row("Recover an action", "spell lost; you regain one of the actions spent on it") : ""}
      ${row("Did the spell manifest?", manifestText)}
      ${row("Earlier repeats", previous)}
      ${preparedInstances > 1 ? row("Prepared instances", preparedInstances) : ""}
      ${spontaneousRepeat ? row("Spontaneous repeat", "1 free repeat without Strain") : ""}
      ${protectedRepeats > 0 ? row("Protected repeats", protectedRepeats) : ""}
      ${signature ? row("Signature Spell", "gives the spell at other ranks") : ""}
      ${effectiveReps > 0 ? row("Effective repeats", effectiveReps) : ""}
      ${row("Strain applied", `DC ${signed(tensionCD)}, MF ${signed(tensionFM)}`)}
      ${row("MF", `${fm} ${signed(delta)} → <span style="color:${fmColor(newFM)}">${newFM}</span>`)}
      ${attackRows}
    `,
    footer
  }));

  if (manifests) {
    await castWithoutSlot(entry, spell, { rank, slotId: slotIndex });
  }
}

async function runSpellFlow(entry) {
  const spellData = await entry.getSheetData({ prepList: true });
  const group = await chooseRank(entry, spellData);
  if (!group) return;
  const spellChoice = await chooseSpell(entry, group);
  if (!spellChoice) return;
  await resolveChosenSpell(entry, spellChoice, group);
}

async function counterspellFlow() {
  const fm = await getFM();
  const entries = actor.itemTypes.spellcastingEntry ?? [];
  const best = Math.max(0, ...entries.map((e) => getStatisticMod(e)));
  const defaultExtra = Number(actor.getFlag(CE.scope, CE.bonusFlag) ?? 2);

  const res = await simpleDialog({
    title: "Counterspell — Escalating Spellcasting",
    content: `
      <div class="form-group"><label>Rank of the enemy spell</label><input name="rank" type="number" min="1" max="10" value="${defaultRMax()}" /></div>
      <div class="form-group"><label>Spellcasting modifier</label><input name="base" type="number" value="${best}" /></div>
      <div class="form-group"><label>Extra modifier</label><input name="extra" type="number" value="${defaultExtra}" /></div>
      <div class="form-group"><label>Extra DC adjustment</label><input name="dcMod" type="number" value="0" /></div>
      <p>Current MF: <strong>${fm}</strong></p>
    `,
    buttons: { roll: { label: "Roll" }, cancel: { label: "Cancel" } },
  });
  if (!res || res.key !== "roll") return;

  const rank = Math.max(1, Math.min(10, Number(res.data.rank || 1)));
  const base = Number(res.data.base || 0);
  const extra = Number(res.data.extra || 0);
  const dcMod = Number(res.data.dcMod || 0);
  await actor.setFlag(CE.scope, CE.bonusFlag, extra);

  const dc = CE.cd[rank] + fm + dcMod;
  const totalBonus = base + extra;
  const rollInfo = await rollD20WithHero(`Counterspell — enemy spell Rank ${rank}`, { bonus: totalBonus, dc });
  const nat = rollInfo.nat;
  const total = nat + totalBonus;
  const degree = degreeFromTotal(nat, total, dc);
  const delta = CE.counterDelta[degree];
  const newFM = clampFM(fm + delta);
  await setFM(newFM);

  await chat(ceCard({
    title: "Counterspell",
    subtitle: `Enemy spell • Rank ${rank}`,
    color: resultColor(degree),
    body: `
      <div style="margin-bottom:6px;">
        ${pill(degreeLabel(degree), resultColor(degree))}
        ${rollInfo?.heroUsed ? pill("Hero Point", "#d19a22") : ""}
        ${degree >= 1 ? pill("Counterspell works", "#1f8f4d") : pill("Counterspell fails", "#a83232")}
      </div>
      ${row("DC", `${CE.cd[rank]} base + ${fm} MF + ${dcMod} adjustment = ${dc}`)}
      ${row("Modifier", signed(totalBonus))}
      ${row("Roll", `d20(${nat}) ${signed(totalBonus)} = ${total}`)}
      ${rollInfo?.heroUsed ? row("Hero Point", `d20(${rollInfo.originalNat}) → d20(${rollInfo.nat})`) : ""}
      ${row("MF", `${fm} ${signed(delta)} → <span style="color:${fmColor(newFM)}">${newFM}</span>`)}
    `,
    footer: "Counterspell uses its own table, based on Clever Counterspell."
  }));
}

async function utilityFlow() {
  const fm = await getFM();
  const res = await simpleDialog({
    title: "Utilities — Escalating Spellcasting",
    content: `<p><strong>${actor.name}</strong> — Current MF: <strong>${fm}</strong></p>`,
    buttons: {
      refocus: { label: "Refocus/Reorient: MF 0" },
      overload: { label: "Vital Overload: MF 4, Drained +2" },
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
        <p><small>Use 2 for the default rule. Use 3 to try a harsher version.</small></p>
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
        ${row("MF", `${fm} → <span style="color:${fmColor(4)}">4</span>`)}
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

const chosenEntry = await chooseEntry();
if (!chosenEntry) return;
if (chosenEntry.utility) return utilityFlow();
if (chosenEntry.counter) return counterspellFlow();
await runSpellFlow(chosenEntry);
