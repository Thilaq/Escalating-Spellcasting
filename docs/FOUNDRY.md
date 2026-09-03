# Foundry VTT macros

Two Script macros run Escalating Spellcasting. They're plain `.js` files. No module to install, no
compendium, no dependency beyond the official pf2e system.

| File | What it's for |
|---|---|
| [../macros/escalating-spellcasting-casting.js](../macros/escalating-spellcasting-casting.js) | The main one: spellbook, casting check, Magic Fatigue, the spell card, Counterspell, utilities |
| [../macros/escalating-spellcasting-spellstrike.js](../macros/escalating-spellcasting-spellstrike.js) | Magus Spellstrike: one strike roll compared against AC and the Casting DC |

## Install

1. Copy the contents of a `.js` file.
2. Foundry, Macros tab, Create Macro.
3. Set Type to Script. If you leave it on Chat nothing happens and you'll spend ten minutes assuming
   the file is broken. It isn't. I made this mistake first.
4. Name it (e.g. `Escalating Spellcasting`), paste, save, drag to the hot bar.
5. Repeat for the Spellstrike macro if you play a Magus.

Select exactly one token before running. Targeting an enemy is optional for the main macro (it
pre-fills the AC for attack spells) and required for Spellstrike, which wants exactly one target.

## What the main macro does, step by step

1. Picks a spellcasting entry from the sheet. The menu also has `Utilities / MF` and `Counterspell`.
2. Picks a rank group. On top of the real ranks, a prepared caster gets a synthetic
   `Rank N — learned, not prepared (improvise)` group built from the sheet's prepList.
3. Picks a spell. Buttons are tagged `Cantrip`, `Focus`, `Signature`, `Unprepared`,
   `expended on sheet`. Expended slots are still listed on purpose; in this system a slot is not a
   resource, so "expended" means nothing to the rules.
4. Asks you to confirm: rank, the RMax used to categorize it, the extra check modifier (starts at +2
   for prepared or repertoire, 0 for an improvised spell), an extra DC adjustment, and checkboxes for
   the spontaneous free repeat, Drain Bonded Item, and — for prepared/repertoire spells — an
   out-of-combat safe casting that skips the roll.
5. Rolls one d20 against the Effective Casting DC. If you have Hero Points it shows your current
   total and degree first, then asks whether to spend one.
6. Resolves. The chat card prints the degree, whether the spell manifested, the DC arithmetic, the MF
   before and after, and the strain bookkeeping. On a normal failure it asks which fallback to take:
   cantrip (−1 MF), recover an action, or Forced Effort (+2 MF).
7. Posts the spell's own card only if the spell manifested, cast with `consume: false`.

Two of the fallbacks are reminders, not automation: the cantrip fallback does not cast a cantrip for
you (its −1 MF is already applied, so deliver the cantrip and don't also apply its normal −1), and
recover-an-action is not applied to the combat tracker. Both are written on the card.

Attack spells get an integrated block: the same d20 is compared to the target's AC using your
spellcasting modifier, and the result is on the card. Don't click Attack on the posted spell card
afterwards, that rolls a second d20. The card reminds you of this because I forgot once mid-fight.

## The Spellstrike macro

Pick the spell, then pick a real Strike from your sheet. It renders your actual attack pane, so the
MAP choice and the weapon's runes come from the sheet rather than from a number you type. It rolls
that strike once and compares the same total to AC and to your Casting DC.

Strike damage rolls automatically on a hit (on by default). Spell damage is off by default so you can
use the card's own damage button instead of getting two rolls. The Hero Point reroll goes through
`game.pf2e.Check.rerollFromMessage`, so the posted attack roll updates rather than leaving a stale
message behind. MF applies from the casting comparison even when the attack misses. Cantrips always
take 1 MF off, hit or miss. On a casting failure when the attack hits, the macro offers Forced Effort
or a cantrip fallback: the cantrip is picked right there and its card is posted in the same step, no
recast needed.

## Utilities

Under `Utilities / MF` on the first screen:

| button | what it does |
|---|---|
| Refocus/Reorient: MF 0 | sets MF to 0 (once per hour, per the rules) |
| Vital Overload: MF 4, Drained +2 | sets MF to 4 and applies Drained through the sheet's own condition API; you can type 3 for the harsher variant |
| Clear the repetition log | forgets what was cast this fight. Run it when the combat boundary was messy |
| Adjust MF | set it by hand, for rituals, odd items, or GM fiat |

## Where the numbers live

On the actor, as world-scoped flags, so they survive a reload and show up in the actor's data:

| flag | contents |
|---|---|
| `escalatingSpellcastingMF` | current Magic Fatigue, integer 0-10 |
| `escalatingSpellcastingReps` | how many times each `spell name\|rank` has been cast this encounter |
| `escalatingSpellcastingBonus` | the last extra check modifier you used, remembered as the default |

Players can read their own value in the console:

```js
game.user.character.getFlag("world", "escalatingSpellcastingMF")
```

There's no sheet widget for it. If you want one, the cheap route is a "Magic Fatigue" item on the
sheet that you keep in sync, or a token status; the macros don't need either.

## Honest limits

This is automation, not a rules engine. RMax, the +2 status bonus and the extra DC adjustment are
editable fields because the macro can't know your class, your archetype, or which feat you're
spending this turn. Read the numbers it prints.

Focus spells are cast through the normal PF2e path and still consume Focus Points. Slot-based daily
features like Divine Font are left to you on purpose: the macro never spends a slot, for any spell,
ever. The macros assume the API pattern used by the PF2e Workbench caster macros, which has been
stable for a while; if a system update renames those internals, the places to look are
`castWithoutSlot()`, `chooseRank()` and `chooseSpell()`.

The out-of-combat safe casting is built in: tick "Out of combat (safe casting)" on the confirm
screen and the macro skips the d20, applies the exploration table (+2 High, +1 Mid, 0 Low), posts
the spell card and never touches strain. The checkbox only appears for prepared or repertoire
spells; improvised (unprepared) spells always roll, matching the rule. Utilities / MF still lets you
set MF by hand — Refocus, Vital Overload, Adjust MF — for anything the macro doesn't model.

## Uninstall

Delete the macros, then run this once in the console to clear the state:

```js
for (const a of game.actors) for (const f of [
  "escalatingSpellcastingMF","escalatingSpellcastingReps","escalatingSpellcastingBonus"])
  await a.unsetFlag("world", f);
```
