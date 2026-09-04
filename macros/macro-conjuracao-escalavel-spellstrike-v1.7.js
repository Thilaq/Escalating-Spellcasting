/*
Conjuração Escalável PF2e — Spellstrike separado
Versão: 1.7

Macro dedicada para Magus / Spellstrike no sistema de Conjuração Escalável.

O que faz:
- Lê as magias reais do ator usando o padrão do PF2e Workbench:
  actor.itemTypes.spellcastingEntry -> entry.getSheetData() -> entry.cast(...)
- Não gasta spell slots para magias normais: consume:false
- Rola um único d20 para o Spellstrike
- Compara o mesmo d20 contra:
  1. CA do alvo, usando bônus de Strike informado
  2. CD Efetiva de Conjuração, usando bônus de spellcasting + bônus extra
- Aplica FM conforme o resultado da conjuração
- Só posta o card da magia se ataque acertar e a magia manifestar
- Se o ataque acerta e a conjuração falha (falha normal), oferece Esforço Forçado ou cantrip de reserva
  canalizado pela mesma arma
- Suporta Ponto Heróico: mostra resultado atual antes de gastar

Instalação:
1. Criar macro Foundry do tipo Script.
2. Colar este arquivo.
3. Selecionar exatamente 1 token.
4. Opcional: mirar um alvo para preencher CA automaticamente.
*/

if (canvas.tokens.controlled.length === 0) return ui.notifications.warn("Selecione um token.");
if (canvas.tokens.controlled.length > 1) return ui.notifications.warn("Selecione apenas 1 token.");

const actor = token.actor;
if (!actor?.isSpellcaster) return ui.notifications.warn(`${actor?.name ?? "O ator"} não é um conjurador.`);
if (game.user.targets.size !== 1) return ui.notifications.warn("Spellstrike precisa de exatamente 1 alvo marcado.");

const CE = {
  scope: "world",
  fmFlag: "conjuracaoEscalavelFM",
  repsFlag: "conjuracaoEscalavelRepeticoes",
  bonusFlag: "conjuracaoEscalavelBonusExtra",
  strikeBonusFlag: "conjuracaoEscalavelSpellstrikeBonus",
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
  return ({ 2: "Sucesso Crítico", 1: "Sucesso", 0: "Falha", [-1]: "Falha Crítica" })[degree];
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
  return `${String(name || "Magia").trim().toLowerCase()}|${rank}`;
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
    : `<p>Rolagem inicial: <strong>d20(${firstNat})</strong></p>`;

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

async function askSpellstrikeFallback() {
  const res = await simpleDialog({
    title: "Spellstrike — conjuração falhou",
    content: `
      <p>O ataque acertou, mas o teste de conjuração falhou (falha normal, não crítica). Escolha:</p>
      <ul style="margin:6px 0 6px 18px;line-height:1.5;">
        <li><strong>Esforço Forçado</strong> — a magia entra pela arma; +2 FM extra.</li>
        <li><strong>Cantrip de reserva</strong> — a magia está perdida, mas você canaliza um cantrip pela arma; custo de FM −1.</li>
        <li><strong>Perder a magia</strong> — o acerto da arma vale, a magia se foi; FM cheia.</li>
      </ul>
    `,
    buttons: {
      force: { label: "Esforço Forçado (+2 FM)", icon: '<i class="fas fa-fire"></i>' },
      cantrip: { label: "Cantrip de reserva (−1 FM)", icon: '<i class="fas fa-wind"></i>' },
      lose: { label: "Perder a magia", icon: '<i class="fas fa-times"></i>' },
    },
    defaultButton: "lose",
  });
  if (!res) return "lose";
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

  const fm = await getFM();
  const res = await simpleDialog({
    title: "Spellstrike — Entrada de Spellcasting",
    content: `<p><strong>${actor.name}</strong> — FM atual: <strong>${fm}</strong></p><p>Escolha a entrada de spellcasting.</p>`,
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
    ui.notifications.info("Esta entrada não possui magias disponíveis.");
    return null;
  }

  const buttons = {};
  for (const group of ranks) {
    const label = group.id === "cantrips" ? "Cantrips" : (group.label ?? `Rank ${group.id}`);
    buttons[String(group.id)] = { label };
  }

  const res = await simpleDialog({
    title: `${entry.name} — Rank`,
    content: `<p>Escolha o rank/grupo de magia para o Spellstrike.</p>`,
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
    ui.notifications.info("Nenhuma magia neste rank/grupo.");
    return null;
  }

  spells.sort((a, b) => a.spell.name.localeCompare(b.spell.name, game.i18n.lang));

  const buttons = {};
  spells.forEach((s, i) => {
    const tags = [];
    if (s.spell.isCantrip) tags.push("Cantrip");
    if (s.spell.isFocusSpell) tags.push("Focus");
    if (s.spa.signature || s.spell.system?.location?.signature) tags.push("Signature");
    if (s.spa.expended) tags.push("expended na ficha");
    buttons[String(i)] = { label: `${s.spell.name}${tags.length ? ` [${tags.join(", ")}]` : ""}` };
  });

  const res = await simpleDialog({
    title: opts.title ?? `${entry.name} — Magia do Spellstrike`,
    content: opts.content ?? `<p>Escolha a magia canalizada pelo Spellstrike.</p>`,
    buttons,
  });
  if (!res) return null;
  return spells[Number(res.key)] ?? null;
}


// Nova: escolha de cantrip quando o cantrip de reserva é usado no Spellstrike.
async function chooseFallbackCantrip(entry) {
  const spellData = await entry.getSheetData();
  const group = (spellData.groups ?? []).find((g) => g.id === "cantrips");
  if (!group || !(group.active ?? []).some((spa) => spa?.spell?.isCantrip)) {
    ui.notifications.info("Nenhum cantrip disponível para usar como reserva.");
    return null;
  }
  return await chooseSpell(entry, group, {
    title: `${entry.name} — cantrip de reserva`,
    content: `<p>O ataque acertou e a magia falhou. Canalize um cantrip pela arma: ele é entregue com o mesmo golpe.</p>`,
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
    ui.notifications.warn("Nenhum Strike equipado válido encontrado.");
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
    <p>Escolha o Strike e o MAP clicando no botão de ataque desejado.</p>
    <div class="actor sheet attack-popout"><section class="window-content"><div class="tab actions active">
      <ol class="actions-list item-list directory-list strikes-list" data-strikes>
        ${attacksHtml.join("\n")}
      </ol>
    </div></section></div>
  `;

  return await new Promise(async (resolve) => {
    const dialog = new Dialog({
      title: "Spellstrike — Escolha o Strike",
      content,
      buttons: { cancel: { label: "Cancelar", callback: () => resolve(null) } },
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
    ui.notifications.warn("Não foi possível obter o d20 do Strike.");
    return null;
  }

  const hp = heroPointsValue();
  if (hp > 0 && nat !== 20 && strikeMsg) {
    const hasConjPreview = Number.isFinite(Number(conjDC));
    const conjDegree = hasConjPreview ? degreeFromTotal(nat, total, conjDC) : null;
    const res = await simpleDialog({
      title: "Usar Ponto Heróico no Spellstrike?",
      content: `
        <div style="border:1px solid rgba(0,0,0,.15);border-radius:6px;padding:6px;margin:6px 0;background:rgba(0,0,0,.04);">
          <div><strong>Ataque atual:</strong> total <strong>${total}</strong> — ${degreeLabel(attackDegree)}</div>
          ${hasConjPreview ? `<div><strong>Conjuração atual:</strong> mesmo total do Strike <strong>${total}</strong> vs CD <strong>${conjDC}</strong> — ${degreeLabel(conjDegree)}</div>` : ""}
        </div>
        <p>Pontos Heróicos disponíveis: <strong>${hp}</strong></p>
        <p>Rerrolar o Strike com Ponto Heróico? O novo resultado do Strike será usado também para a Conjuração.</p>
      `,
      buttons: {
        no: { label: "Manter rolagem" },
        yes: { label: "Usar Ponto Heróico", icon: '<i class="fas fa-star"></i>' },
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
    console.warn("Conjuração Escalável | Não foi possível rolar dano do Strike automaticamente", err);
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
    console.warn("Conjuração Escalável | Não foi possível rolar dano da magia automaticamente", err);
  }
  return false;
}

async function utilityFlow() {
  const fm = await getFM();
  const res = await simpleDialog({
    title: "Utilidades — Conjuração Escalável",
    content: `<p><strong>${actor.name}</strong> — FM atual: <strong>${fm}</strong></p>`,
    buttons: {
      refocus: { label: "Refocar/Reorientar: FM 0" },
      overload: { label: "Sobrecarga Vital: FM 4, Drained +2/+3" },
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
        ${row("FM", `${fm} → <span style=\"color:${fmColor(4)}\">4</span>`)}
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
      <div class="form-group"><label>Rank da magia</label><input name="rank" type="number" min="${spell.isCantrip ? 0 : 1}" max="10" value="${rank}" /></div>
      <div class="form-group"><label>RMax para categoria</label><input name="rmax" type="number" min="1" max="10" value="${defaultRMax()}" /></div>
      <hr/>
      <p><strong>Alvo:</strong> ${tgt?.name ?? "Alvo"} ${tgtAC ? `(CA ${tgtAC})` : ""}</p>
      <p>O bônus do Strike será puxado da ficha na próxima janela.</p>
      <hr/>
      <div class="form-group"><label>Ajuste extra na CD</label><input name="dcMod" type="number" value="0" /></div>
      <p style="margin-top:-6px"><small>No Spellstrike, o resultado total do Strike é comparado também contra a CD de Conjuração.</small></p>
      <div class="form-group"><label><input type="checkbox" name="spontaneousRepeat" ${entry?.isSpontaneous ? "checked" : ""}/> Repetição espontânea: 1 repetição sem Tensão</label></div>
      ${actualSignature ? `<p style="margin-top:-6px"><small>Signature Spell detectada: permite conjurar em outros ranks; não adiciona proteção extra no mesmo rank.</small></p>` : ""}
      <div class="form-group"><label><input type="checkbox" name="drainBonded" /> Drain Bonded Item</label></div>
      <hr/>
      <div class="form-group"><label><input type="checkbox" name="autoStrikeDamage" checked /> Rolar dano do Strike automaticamente se acertar</label></div>
      <div class="form-group"><label><input type="checkbox" name="autoSpellDamage" /> Rolar dano da magia automaticamente se for entregue</label></div>
      <p style="margin-top:-6px"><small>Se a magia tiver botão de dano no card, você pode deixar dano da magia desmarcado e rolar pelo card.</small></p>
      <p>FM atual: <strong>${fm}</strong></p>
    `,
    buttons: { roll: { label: "Rolar Spellstrike", icon: '<i class="fas fa-dice-d20"></i>' }, cancel: { label: "Cancelar" } },
  });
  if (!config || config.key !== "roll") return;

  rank = Math.max(spell.isCantrip ? 0 : 1, Math.min(10, Number(config.data.rank || rank)));
  const rmax = Math.max(1, Math.min(10, Number(config.data.rmax || defaultRMax())));
  const targetName = String(config.data.targetName || tgt?.name || "Alvo");
  const ac = tgtAC || 10;
  const dcMod = Number(config.data.dcMod || 0);
  const spontaneousRepeat = Boolean(config.data.spontaneousRepeat);
  const drainBonded = Boolean(config.data.drainBonded);
  const autoStrikeDamage = Boolean(config.data.autoStrikeDamage);
  const autoSpellDamage = Boolean(config.data.autoSpellDamage);

  // Cantrip Spellstrike: não faz teste de manifestação por FM.
  // Como o cantrip ainda canaliza magia de forma controlada durante uma ação de Spellstrike,
  // ele também funciona como respiro e reduz 1 FM, igual a um cantrip de 2+ ações.
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
          ${pill(`Ataque: ${degreeLabel(attackDegree)}`, resultColor(attackDegree))}
          ${strike.heroUsed ? pill("Ponto Heróico", "#d19a22") : ""}
          ${pill("Cantrip: -1 FM", "#1f8f4d")}
          ${attackHits ? pill("Magia entregue", "#1f8f4d") : pill("Magia perdida", "#a83232")}
        </div>
        ${row("Entrada", entry.name)}
        ${row("Strike", strike.strikeName)}
        ${row("Alvo", targetName)}
        ${row("Ataque", `d20(${nat}) → total ${attackTotal}`)}
        ${strike.heroUsed ? row("Ponto Heróico", `d20(${strike.originalNat}) → d20(${strike.nat})`) : ""}
        ${row("Magia entregue?", attackHits ? "Sim" : "Não")}
        ${row("FM", `${fm} ${signed(cantripDelta)} → <span style=\"color:${fmColor(newFM)}\">${newFM}</span>`)}
      `,
      footer: attackHits ? "Cantrip entregue pelo Spellstrike. FM reduzida em 1." : "O ataque errou, então a magia se perde, mas o cantrip ainda reduz 1 FM."
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
    ? "Ataque e magia entram"
    : cantripDelivered
      ? "Ataque entra; a magia se perde e um cantrip é canalizado no lugar"
      : attackHits
        ? "Ataque entra; magia não entra"
        : "Ataque erra; magia se perde";

  await chat(ceCard({
    title: "Spellstrike — Conjuração Escalável",
    subtitle: `${spell.name} • Rank ${rank} • ${category}`,
    color,
    body: `
      <div style="margin-bottom:6px;">
        ${pill(`Ataque: ${degreeLabel(attackDegree)}`, resultColor(attackDegree))}
        ${pill(`Conjuração: ${degreeLabel(conjDegree)}`, resultColor(conjDegree))}
        ${rollInfo.heroUsed ? pill("Ponto Heróico", "#d19a22") : ""}
        ${forced ? pill("Esforço Forçado", "#b36b00") : ""}
        ${cantripDelivered ? pill("Cantrip de reserva", "#2f6fb0") : ""}
        ${spontaneousRepeat ? pill("Espontâneo", "#5b3f8c") : ""}
        ${actualSignature ? pill("Signature", "#5b3f8c") : ""}
        ${drainBonded ? pill("Drain Bonded", "#444") : ""}
        ${delivered ? pill("Magia entregue", "#1f8f4d") : pill("Magia perdida", "#a83232")}
      </div>
      ${row("Resultado", resultText)}
      ${row("Entrada", entry.name)}
      ${row("Alvo", targetName)}
      ${row("Rank / Categoria", `Rank ${rank} / ${category}`)}
      ${row("CA do alvo", ac)}
      ${row("Strike", rollInfo.strikeName)}
      ${row("Ataque", `d20(${nat}) → total ${attackTotal}`)}
      ${row("CD de Conjuração", `${baseDC} base + ${fm} FM + ${tensionCD} repetição + ${dcMod} ajuste = ${dc}`)}
      ${row("Conjuração", `mesmo total do Strike ${conjTotal} vs CD ${dc}`)}
      ${rollInfo.heroUsed ? row("Ponto Heróico", `d20(${rollInfo.originalNat}) → d20(${rollInfo.nat})`) : ""}
      ${row("Ataque acertou?", attackHits ? "Sim" : "Não")}
      ${row("Magia manifestou?", magicManifests ? "Sim" : "Não")}
      ${row("Magia entregue?", delivered ? "Sim" : "Não")}
      ${cantripDelivered ? row("Cantrip de reserva", `${fallbackCantrip.spell.name} — entregue com o mesmo golpe`) : ""}
      ${row("Repetições anteriores", previous)}
      ${preparedInstances > 1 ? row("Instâncias preparadas", preparedInstances) : ""}
      ${spontaneousRepeat ? row("Repetição espontânea", "1 repetição sem Tensão") : ""}
      ${actualSignature ? row("Signature Spell", "permite conjurar em outros ranks") : ""}
      ${protectedRepeats > 0 ? row("Repetições protegidas", protectedRepeats) : ""}
      ${effectiveReps > 0 ? row("Repetições efetivas", effectiveReps) : ""}
      ${drainBonded ? row("Drain Bonded Item", "ignora Tensão e ajusta FM em -2") : ""}
      ${row("Tensão aplicada", `CD ${signed(tensionCD)}, FM ${signed(tensionFM)}`)}
      ${row("FM", `${fm} ${signed(delta)} → <span style=\"color:${fmColor(newFM)}\">${newFM}</span>`)}
    `,
    footer: delivered
      ? "O card da magia será postado em seguida. Use o resultado do ataque acima; não role outro ataque pelo card."
      : cantripDelivered
        ? "A magia se perdeu, mas o cantrip de reserva é entregue junto com o golpe que acertou. O card dele vem a seguir."
        : attackHits
          ? "O ataque acertou, mas a magia não foi entregue. A FM foi aplicada pela conjuração."
          : "O ataque errou; a magia se perde. A FM foi aplicada pela conjuração."
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
