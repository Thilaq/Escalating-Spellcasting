/*
Conjuração Escalável PF2e — Workbench-style Spellbook
Versão: 4.7

Esta versão imita o padrão que funciona no Caster's Spellbook do PF2e Workbench:
- usa token.actor.itemTypes.spellcastingEntry
- usa spellcastingEntry.getSheetData()
- usa spellcastingEntry.cast(spell, { consume:false }) para postar a magia sem gastar slot

Fluxo:
1. Selecione exatamente 1 token.
2. Execute a macro.
3. Escolha a entrada de spellcasting.
4. Escolha o rank.
5. Escolha a magia.
6. A macro resolve FM; se a magia manifestar, posta no chat sem consumir slot.

Focus spells:
- São tratadas como PF2e normal e podem consumir Focus Point.
Cantrips:
- Não fazem teste de FM; 2+ ações reduzem -1 FM, 1 ação/reação são neutros.

Falha normal (não crítica): a macro abre três opções, cantrip de reserva (-1 FM),
recuperar uma ação, ou Esforço Forçado (+2 FM extra). Fora de combate há a
conjuração segura, sem teste e sem Tensão, cobrada pela tabela de exploração.
*/

if (canvas.tokens.controlled.length === 0) return ui.notifications.warn("Selecione um token.");
if (canvas.tokens.controlled.length > 1) return ui.notifications.warn("Selecione apenas 1 token.");

const actor = token.actor;
if (!actor?.isSpellcaster) return ui.notifications.warn(`${actor?.name ?? "O ator"} não é um conjurador.`);

const CE = {
  scope: "world",
  fmFlag: "conjuracaoEscalavelFM",
  repsFlag: "conjuracaoEscalavelRepeticoes",
  bonusFlag: "conjuracaoEscalavelBonusExtra",
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
  return ({ 2: "Sucesso Crítico", 1: "Sucesso", 0: "Falha", [-1]: "Falha Crítica" })[degree];
}

function signed(n) {
  n = Number(n || 0);
  return n >= 0 ? `+${n}` : `${n}`;
}

function spellKey(name, rank) {
  return `${String(name || "Magia").trim().toLowerCase()}|${rank}`;
}

function spellActionCount(spell) {
  const raw = String(spell.system?.time?.value ?? "").toLowerCase();
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
  return spellWrap?.spell?.name ?? spellWrap?.name ?? "Magia";
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

function ceCard({ title = "Conjuração Escalável", subtitle = "", color = "#5b3f8c", body = "", footer = "" } = {}) {
  // Chat compacto: se o corpo começa com a div de tags, ela fica visível;
  // os detalhes mecânicos ficam escondidos em um <details> clicável.
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
          <summary style="cursor:pointer;font-weight:700;opacity:.85;list-style-position:inside;">Detalhes</summary>
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
        <div><strong>Resultado atual:</strong> d20(${firstNat}) ${signed(context.bonus)} = <strong>${previewTotal}</strong> vs CD <strong>${context.dc}</strong></div>
        <div><strong>Grau atual:</strong> ${degreeLabel(previewDegree)}</div>
      </div>
    ` : `<p>Rolagem inicial: <strong>d20(${firstNat})</strong></p>`;

  const res = await simpleDialog({
    title: "Usar Ponto Heróico?",
    content: `
      ${previewHtml}
      <p>Pontos Heróicos disponíveis: <strong>${hp}</strong></p>
      <p>Usar 1 Ponto Heróico para rerrolar? O novo resultado será usado.</p>
    `,
    buttons: {
      no: { label: "Manter rolagem" },
      yes: { label: "Usar Ponto Heróico", icon: '<i class="fas fa-star"></i>' },
    },
    defaultButton: "no",
  });

  if (res?.key !== "yes") {
    return { nat: firstNat, originalNat: firstNat, heroUsed: false };
  }

  const spent = await spendHeroPoint();
  if (!spent) {
    ui.notifications.warn("Sem Pontos Heróicos disponíveis.");
    return { nat: firstNat, originalNat: firstNat, heroUsed: false };
  }

  const secondNat = await rollD20(`${flavor} — rerrolagem com Ponto Heróico`);
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

    // Layout mais confortável para listas grandes de magia.
    // O Dialog padrão pode abrir pequeno demais e jogar os últimos botões para fora da tela.
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
    title: "Magia falhou — escolha o que fazer",
    content: `
      <p>A magia falhou (falha normal, não crítica). Escolha como ela se desfaz:</p>
      <ul style="margin:6px 0 6px 18px;line-height:1.5;">
        <li><strong>Cantrip de reserva</strong> — você conjura um cantrip de até 2 ações; a FM que você toma cai em 1.</li>
        <li><strong>Recuperar uma ação</strong> — a magia está perdida, mas você recupera uma das ações gastas; FM cheia.</li>
        <li><strong>Esforço Forçado</strong> — a magia funciona como se você tivesse tido sucesso; +2 FM extra.</li>
      </ul>
    `,
    buttons: {
      cantrip: { label: "Cantrip de reserva (−1 FM)", icon: '<i class="fas fa-wind"></i>' },
      action: { label: "Recuperar uma ação", icon: '<i class="fas fa-undo"></i>' },
      force: { label: "Esforço Forçado (+2 FM)", icon: '<i class="fas fa-fire"></i>' },
    },
    defaultButton: "action",
  });
  if (!res) return "action";
  return res.key;
}

async function chooseEntry() {
  const entries = actor.itemTypes.spellcastingEntry ?? [];
  if (!entries.length) {
    ui.notifications.warn("Nenhuma entrada de spellcasting encontrada.");
    return null;
  }

  const buttons = {};
  for (const entry of entries) {
    buttons[entry.id] = { label: entry.name };
  }
  buttons.utility = { label: "Utilidades / FM", icon: '<i class="fas fa-cog"></i>' };
  buttons.counter = { label: "Counterspell", icon: '<i class="fas fa-ban"></i>' };

  const fm = await getFM();
  const res = await simpleDialog({
    title: "Conjuração Escalável — Spellcasting Entry",
    content: `<p><strong>${actor.name}</strong> — FM atual: <strong>${fm}</strong></p><p>Escolha uma entrada de spellcasting.</p>`,
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

    // Diferente do Workbench, não filtramos slots expended nem uses.value 0,
    // porque neste sistema slots não limitam acesso às magias.
    ranks.push(group);

    const numericRank = group.id === "cantrips" ? 0 : Number(group.id ?? group.number ?? 0);
    preparedByRank[numericRank] = active.map((spa) => spa.spell).filter(Boolean);
  }

  // Conjuradores preparados podem tentar conjurar magias aprendidas, mas não preparadas,
  // com penalidades: sem +2 status e +2 na CD. Para isso, usamos prepList da ficha.
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
        label: `Rank ${rank} — aprendidas não preparadas`,
        unprepared: true,
        active: unprepared.map((spell) => ({ spell, unprepared: true, expended: false })),
      });
    }
  }

  if (!ranks.length) {
    ui.notifications.info("Esta entrada não possui magias disponíveis.");
    return null;
  }

  const buttons = {};
  ranks.forEach((group, i) => {
    const baseLabel = group.id === "cantrips" ? "Cantrips" : (group.label ?? `Rank ${group.id}`);
    const label = group.unprepared ? `${baseLabel} (improvisar)` : baseLabel;
    buttons[String(i)] = { label };
  });

  const res = await simpleDialog({
    title: `${entry.name} — Rank`,
    content: `<p>Escolha o rank/grupo de magia.</p>`,
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

    // Focus spells só aparecem se tiverem FP? Para o sistema, vamos deixar aparecer;
    // o cast normal do PF2e vai bloquear se não houver Focus Point quando consume=true.
    spells.push({ spa, spell, index });
  }

  if (!spells.length) {
    ui.notifications.info("Nenhuma magia neste rank/grupo.");
    return null;
  }

  spells.sort((a, b) => a.spell.name.localeCompare(b.spell.name, game.i18n.lang));

  const buttons = {};
  spells.forEach((s, i) => {
    const tags = [];
    if (s.spell.isCantrip) tags.push("Cantrip");
    if (s.spell.isFocusSpell) tags.push("Focus");
    if (s.spa.unprepared || group.unprepared) tags.push("Não preparada");
    if (s.spa.signature || s.spell.system?.location?.signature) tags.push("Signature");
    if (s.spa.expended) tags.push("expended na ficha");

    buttons[String(i)] = { label: `${s.spell.name}${tags.length ? ` [${tags.join(", ")}]` : ""}` };
  });

  const res = await simpleDialog({
    title: `${entry.name} — Escolha a magia`,
    content: `<p>Os botões listam as magias reais da ficha. Slots já gastos continuam aparecendo, porque slot não é recurso neste sistema.</p>`,
    buttons,
  });
  if (!res) return null;
  return spells[Number(res.key)] ?? null;
}

async function castWithoutSlot(entry, spell, { rank, slotId }) {
  // Esta é a diferença central para o Workbench:
  // Workbench: entry.cast(spell, { slotId, rank, message:true }) -> consume padrão true
  // Aqui: consume:false -> não gasta spell slot/uso da entrada.
  await entry.cast(spell, { slotId, rank, message: true, consume: false });
}

async function castFocusNormally(entry, spell, { rank, slotId }) {
  // Focus Points continuam sendo recurso do PF2e.
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
      title: "Cantrip — Conjuração Escalável",
      subtitle: `${spell.name} • ${actions >= 2 ? "2+ ações" : "1 ação/reação"}`,
      color: actions >= 2 ? "#1f8f4d" : "#555",
      body: `
        ${pill(spell.name, actions >= 2 ? "#1f8f4d" : "#555")}
        ${row("Teste de Conjuração", "não exige")}
        ${row("Efeito em FM", `${fm} ${signed(delta)} → <span style="color:${fmColor(newFM)}">${newFM}</span>`)}
      `,
      footer: actions >= 2 ? "Cantrip de 2+ ações reduz 1 FM automaticamente." : "Cantrip de 1 ação/reação é neutro para FM."
    }));
    await castWithoutSlot(entry, spell, { rank: 0, slotId: slotIndex });
    return;
  }

  // Focus Spells
  if (spell.isFocusSpell) {
    await chat(ceCard({
      title: "Magia de Foco",
      subtitle: spell.name,
      color: "#5b3f8c",
      body: `
        ${pill("Focus", "#5b3f8c")}
        ${row("Interação com FM", "nenhuma")}
        ${row("Recurso", "Focus Point normal")}
      `,
      footer: "Magias de foco seguem a economia normal de Focus Points e não alteram FM."
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
      <p><strong>Magia de ataque detectada.</strong></p>
      <div class="form-group"><label>Alvo para ataque integrado</label><input name="attackTarget" type="text" value="${tgt?.name ?? "Alvo"}" /></div>
      <div class="form-group"><label>CA do alvo</label><input name="attackAC" type="number" value="${tgtAC || 10}" /></div>
      <div class="form-group"><label>Ajuste extra no ataque</label><input name="attackExtra" type="number" value="0" /></div>
      <p style="margin-top:-6px"><small>O ataque usa o mesmo d20 da conjuração. Por padrão, não soma o +2 extra da manifestação.</small></p>
    ` : "";

  const options = await simpleDialog({
    title: `Conjurar ${spell.name}`,
    content: `
      <div class="form-group"><label>Rank de conjuração</label><input name="rank" type="number" min="1" max="10" value="${baseRank}" /></div>
      <div class="form-group"><label>RMax para categoria</label><input name="rmax" type="number" min="1" max="10" value="${defaultRMax()}" /></div>
      <div class="form-group"><label>Bônus extra no Teste</label><input name="bonusExtra" type="number" value="${defaultExtra}" /></div>
      <p style="margin-top:-6px"><small>Use +2 para magia preparada/repertório. Use 0 para arquétipos sem bônus.</small></p>
      <div class="form-group"><label>Ajuste extra na CD</label><input name="dcMod" type="number" value="${defaultDcMod}" /></div>
      ${isUnprepared
        ? `<p style="margin-top:-6px"><small>Magia aprendida não preparada: sem +2 status e +2 na CD. Ela sempre rola, mesmo fora de combate.</small></p>`
        : `<div class="form-group"><label><input type="checkbox" name="outOfCombat" /> Fora de combate (conjuração segura, sem teste)</label></div>
           <p style="margin-top:-6px"><small>Magia preparada ou do repertório fora de combate: automática, sem teste, sem Tensão. FM anda pela tabela de exploração (+2 High, +1 Mid, 0 Low).</small></p>`}
      <div class="form-group"><label><input type="checkbox" name="spontaneousRepeat" ${defaultSpontaneousRepeat ? "checked" : ""}/> Repetição espontânea: 1 repetição sem Tensão</label></div>
      ${actualSignature ? `<p style="margin-top:-6px"><small>Signature Spell detectada: permite conjurar em outros ranks; não adiciona proteção extra no mesmo rank.</small></p>` : ""}
      <div class="form-group"><label><input type="checkbox" name="drainBonded" /> Drain Bonded Item</label></div>
      ${attackBlock}
      <p>FM atual: <strong>${fm}</strong></p>
    `,
    buttons: {
      cast: { label: "Rolar Conjuração", icon: '<i class="fas fa-dice-d20"></i>' },
      cancel: { label: "Cancelar" },
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
  const attackTargetName = String(options.data.attackTarget || tgt?.name || "Alvo");
  const attackAC = Number(options.data.attackAC || 0);
  const attackExtra = Number(options.data.attackExtra || 0);
  await actor.setFlag(CE.scope, CE.bonusFlag, bonusExtra);

  const baseDC = CE.cd[rank];
  const category = categoryForRank(rank, rmax);

  // Conjuração segura fora de combate (só preparada/repertório): sem teste, sem Tensão.
  if (outOfCombat) {
    const safeDelta = { High: 2, Mid: 1, Low: 0 }[category];
    const newFM = clampFM(fm + safeDelta);
    await setFM(newFM);
    await chat(ceCard({
      title: "Conjuração Escalável — Exploração",
      subtitle: `${spell.name} • Rank ${rank} • ${category}`,
      color: "#2f6fb0",
      body: `
        <div style="margin-bottom:6px;">
          ${pill("Conjuração segura", "#2f6fb0")}
          ${pill("Sem teste", "#1f8f4d")}
        </div>
        ${row("Entrada", entry.name)}
        ${row("Rank / Categoria", `Rank ${rank} / ${category}`)}
        ${row("Teste de conjuração", "não necessário")}
        ${row("Tensão", "nenhuma (fora de combate)")}
        ${row("FM", `${fm} ${signed(safeDelta)} → <span style="color:${fmColor(newFM)}">${newFM}</span>`)}
      `,
      footer: "Magia preparada ou do repertório conjurada fora de combate: automática, 10 minutos, sem Tensão. FM anda pela tabela de exploração."
    }));
    await castWithoutSlot(entry, spell, { rank, slotId: slotIndex });
    return;
  }

  const reps = await getReps();
  const key = spellKey(spell.name, rank);
  const previous = Number(reps[key] ?? 0);

  // Proteções contra Tensão:
  // - Prepared: múltiplas instâncias preparadas da mesma magia/rank protegem repetições equivalentes.
  // - Repetição espontânea: magias de repertório podem repetir uma vez no mesmo rank sem Tensão.
  // - Signature Spell mantém seu benefício original: conjurar a magia em outros ranks. Não adiciona proteção extra no mesmo rank.
  const spontaneousRepeatProtection = spontaneousRepeat ? 1 : 0;
  const preparedRepeatProtection = Math.max(0, preparedInstances - 1);
  const protectedRepeats = Math.max(preparedRepeatProtection, spontaneousRepeatProtection);
  const effectiveReps = drainBonded ? 0 : Math.max(0, previous - protectedRepeats);
  const tensionCD = effectiveReps * 2;
  const tensionFM = effectiveReps;

  const dc = baseDC + fm + tensionCD + dcMod;
  const baseMod = getStatisticMod(entry);
  const totalBonus = baseMod + bonusExtra;

  const rollInfo = await rollD20WithHero(`Conjuração Escalável: ${spell.name} Rank ${rank}`, { bonus: totalBonus, dc });
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
  const manifestText = manifests ? "Sim" : "Não";
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
        ? pill(`Ataque: ${degreeLabel(attackDegree)}`, resultColor(attackDegree))
        : pill("Ataque não ocorre", "#777");
      attackRows = `
        <div style="margin-top:7px;padding-top:5px;border-top:1px solid rgba(0,0,0,.15);"></div>
        ${row("Ataque integrado", attackTargetName)}
        ${row("CA do alvo", attackAC)}
        ${row("Bônus de ataque", `${baseMod} spellcasting ${signed(attackExtra)} ajuste = ${signed(attackBonus)}`)}
        ${row("Total do ataque", `d20(${nat}) ${signed(attackBonus)} = ${attackTotal}`)}
        ${row("Resultado do ataque", manifests ? degreeLabel(attackDegree) : "não ocorre")}
      `;
      attackFooter = manifests
        ? "Magia de ataque: use o resultado integrado acima. Evite clicar no botão Attack do card para não rolar outro d20."
        : fallback === "cantrip"
          ? "A magia não manifestou. Cantrip de reserva: conjure um cantrip de até 2 ações (o alívio já está aplicado, não aplique de novo)."
          : fallback === "action"
            ? "A magia não manifestou. Você recupera uma das ações gastas nela."
            : "A magia não manifestou, então o ataque da magia não ocorre.";
    } else {
      attackPills = pill("Ataque sem CA", "#b36b00");
      attackRows = row("Ataque integrado", "CA não informada; resolva manualmente se necessário");
      attackFooter = "Magia de ataque detectada, mas nenhuma CA válida foi informada.";
    }
  }

  const footer = spell.isAttack
    ? attackFooter
    : manifests
      ? "Magia manifestada. O card da magia será postado em seguida."
      : fallback === "cantrip"
        ? "Cantrip de reserva: conjure um cantrip de até 2 ações. O alívio dele já está incluído (−1 FM); não aplique o −1 do cantrip de novo."
        : fallback === "action"
          ? "A magia não manifestou. Você recupera uma das ações gastas nela."
          : "A magia não manifestou. Nenhum efeito da magia é aplicado.";

  await chat(ceCard({
    title: "Conjuração Escalável",
    subtitle: `${spell.name} • Rank ${rank} • ${category}`,
    color,
    body: `
      <div style="margin-bottom:6px;">
        ${pill(degreeLabel(degree), color)}
        ${rollInfo?.heroUsed ? pill("Ponto Heróico", "#d19a22") : ""}
        ${forced ? pill("Esforço Forçado", "#b36b00") : ""}
        ${fallback === "cantrip" ? pill("Cantrip de reserva", "#2f6fb0") : ""}
        ${fallback === "action" ? pill("Ação recuperada", "#2f6fb0") : ""}
        ${signature ? pill("Signature", "#5b3f8c") : ""}
        ${isUnprepared ? pill("Não preparada", "#b36b00") : ""}
        ${drainBonded ? pill("Drain Bonded", "#444") : ""}
        ${manifests ? pill("Manifestou", "#1f8f4d") : pill("Não manifestou", "#a83232")}
        ${attackPills}
      </div>
      ${row("Entrada", entry.name)}
      ${isUnprepared ? row("Magia não preparada", "sem +2 status, +2 CD") : ""}
      ${row("CD", `${baseDC} base + ${fm} FM + ${tensionCD} repetição + ${dcMod} ajuste = ${dc}`)}
      ${row("Bônus", `${baseMod} spellcasting ${signed(bonusExtra)} extra = ${signed(totalBonus)}`)}
      ${row("Rolagem", `d20(${nat}) ${signed(totalBonus)} = ${total}`)}
      ${rollInfo?.heroUsed ? row("Ponto Heróico", `d20(${rollInfo.originalNat}) → d20(${rollInfo.nat})`) : ""}
      ${row("Resultado", `${degreeLabel(degree)}${forced ? " — Esforço Forçado" : ""}`)}
      ${fallback === "cantrip" ? row("Cantrip de reserva", "conjure um cantrip (até 2 ações); custo de FM −1 (já aplicado)") : ""}
      ${fallback === "action" ? row("Recuperar uma ação", "magia perdida; você recupera uma das ações gastas") : ""}
      ${row("Magia manifestou?", manifestText)}
      ${row("Repetições anteriores", previous)}
      ${preparedInstances > 1 ? row("Instâncias preparadas", preparedInstances) : ""}
      ${spontaneousRepeat ? row("Repetição espontânea", "1 repetição sem Tensão") : ""}
      ${protectedRepeats > 0 ? row("Repetições protegidas", protectedRepeats) : ""}
      ${signature ? row("Signature Spell", "permite conjurar em outros ranks") : ""}
      ${effectiveReps > 0 ? row("Repetições efetivas", effectiveReps) : ""}
      ${row("Tensão aplicada", `CD ${signed(tensionCD)}, FM ${signed(tensionFM)}`)}
      ${row("FM", `${fm} ${signed(delta)} → <span style="color:${fmColor(newFM)}">${newFM}</span>`)}
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
    title: "Counterspell — Conjuração Escalável",
    content: `
      <div class="form-group"><label>Rank da magia inimiga</label><input name="rank" type="number" min="1" max="10" value="${defaultRMax()}" /></div>
      <div class="form-group"><label>Bônus base de spellcasting</label><input name="base" type="number" value="${best}" /></div>
      <div class="form-group"><label>Bônus extra</label><input name="extra" type="number" value="${defaultExtra}" /></div>
      <div class="form-group"><label>Ajuste extra na CD</label><input name="dcMod" type="number" value="0" /></div>
      <p>FM atual: <strong>${fm}</strong></p>
    `,
    buttons: { roll: { label: "Rolar" }, cancel: { label: "Cancelar" } },
  });
  if (!res || res.key !== "roll") return;

  const rank = Math.max(1, Math.min(10, Number(res.data.rank || 1)));
  const base = Number(res.data.base || 0);
  const extra = Number(res.data.extra || 0);
  const dcMod = Number(res.data.dcMod || 0);
  await actor.setFlag(CE.scope, CE.bonusFlag, extra);

  const dc = CE.cd[rank] + fm + dcMod;
  const totalBonus = base + extra;
  const rollInfo = await rollD20WithHero(`Counterspell — magia inimiga Rank ${rank}`, { bonus: totalBonus, dc });
  const nat = rollInfo.nat;
  const total = nat + totalBonus;
  const degree = degreeFromTotal(nat, total, dc);
  const delta = CE.counterDelta[degree];
  const newFM = clampFM(fm + delta);
  await setFM(newFM);

  await chat(ceCard({
    title: "Counterspell",
    subtitle: `Magia inimiga • Rank ${rank}`,
    color: resultColor(degree),
    body: `
      <div style="margin-bottom:6px;">
        ${pill(degreeLabel(degree), resultColor(degree))}
        ${rollInfo?.heroUsed ? pill("Ponto Heróico", "#d19a22") : ""}
        ${degree >= 1 ? pill("Counterspell funciona", "#1f8f4d") : pill("Counterspell falha", "#a83232")}
      </div>
      ${row("CD", `${CE.cd[rank]} base + ${fm} FM + ${dcMod} ajuste = ${dc}`)}
      ${row("Bônus", signed(totalBonus))}
      ${row("Rolagem", `d20(${nat}) ${signed(totalBonus)} = ${total}`)}
      ${rollInfo?.heroUsed ? row("Ponto Heróico", `d20(${rollInfo.originalNat}) → d20(${rollInfo.nat})`) : ""}
      ${row("FM", `${fm} ${signed(delta)} → <span style="color:${fmColor(newFM)}">${newFM}</span>`)}
    `,
    footer: "Counterspell usa a tabela própria baseada em Clever Counterspell."
  }));
}

async function utilityFlow() {
  const fm = await getFM();
  const res = await simpleDialog({
    title: "Utilidades — Conjuração Escalável",
    content: `<p><strong>${actor.name}</strong> — FM atual: <strong>${fm}</strong></p>`,
    buttons: {
      refocus: { label: "Refocar/Reorientar: FM 0" },
      overload: { label: "Sobrecarga Vital: FM 4, Drained +2" },
      reset: { label: "Limpar repetições" },
      setfm: { label: "Ajustar FM" },
    },
  });
  if (!res) return;

  if (res.key === "refocus") {
    await setFM(0);
    await chat(`<p><strong>Refocar/Reorientar</strong>: FM ${fm} → <strong>0</strong>. Lembre: 1 vez por hora.</p>`);
  }

  if (res.key === "reset") {
    await setReps({});
    await chat(`<p><strong>Repetições limpas</strong> para ${actor.name}.</p>`);
  }

  if (res.key === "overload") {
    const over = await simpleDialog({
      title: "Sobrecarga Vital",
      content: `
        <p>Reduzir FM para 4 e consumir vitalidade.</p>
        <div class="form-group"><label>Aumentar Drained em</label><input name="drained" type="number" min="1" max="10" value="2" /></div>
        <p><small>Use 2 pela regra atual. Use 3 se quiser testar uma versão mais punitiva.</small></p>
      `,
      buttons: { ok: { label: "Aplicar" }, cancel: { label: "Cancelar" } },
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
      console.warn("Conjuração Escalável | Não foi possível aplicar Drained automaticamente", err);
    }
    await chat(ceCard({
      title: "Sobrecarga Vital",
      subtitle: actor.name,
      color: "#a83232",
      body: `
        ${pill("Vitalidade consumida", "#a83232")}
        ${row("FM", `${fm} → <span style="color:${fmColor(4)}">4</span>`)}
        ${row("Drained", `+${drainedIncrease}`)}
        ${row("Aplicação automática", applied === drainedIncrease ? "sucesso" : `parcial/falhou (${applied}/${drainedIncrease})`)}
      `,
      footer: applied === drainedIncrease ? `Drained +${drainedIncrease} aplicado automaticamente.` : `Aplique Drained +${drainedIncrease} manualmente se necessário.`
    }));
  }

  if (res.key === "setfm") {
    const set = await simpleDialog({
      title: "Ajustar FM",
      content: `<div class="form-group"><label>Nova FM</label><input name="fm" type="number" min="0" max="10" value="${fm}" /></div>`,
      buttons: { ok: { label: "Aplicar" }, cancel: { label: "Cancelar" } },
    });
    if (set?.key === "ok") {
      const newFM = clampFM(Number(set.data.fm || 0));
      await setFM(newFM);
      await chat(`<p><strong>FM ajustada</strong>: ${fm} → <strong>${newFM}</strong>.</p>`);
    }
  }
}

const chosenEntry = await chooseEntry();
if (!chosenEntry) return;
if (chosenEntry.utility) return utilityFlow();
if (chosenEntry.counter) return counterspellFlow();
await runSpellFlow(chosenEntry);
