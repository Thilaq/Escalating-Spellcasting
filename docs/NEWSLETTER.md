# Escalating Spellcasting — v1.2 update

Unofficial fan content for Pathfinder Second Edition. Not affiliated with or endorsed by Paizo Inc.

A short update post for the tables running this. Three changes to the rules, one fix, and both
Foundry macros bumped to 1.2. Same repo link as before.

## Failure fallbacks

On a normal failure you no longer just lose the spell. You pick one of three:

- **Cantrip fallback** — the spell is lost, but you channel the energy into one cantrip of 2
  actions or fewer, delivered with the actions you already spent. MF cost: the failure column
  minus 1.
- **Recover an action** — the spell is lost, but you get one of the actions back. Full failure
  column.
- **Forced Effort** — unchanged. The spell works, +2 MF.

| category | failure | cantrip | recover action | forced |
|---|---:|---:|---:|---:|
| High | +3 | +2 | +3 | +5 |
| Mid | +2 | +1 | +2 | +4 |
| Low | +1 | 0 | +1 | +3 |

Safe Dissipation is gone — it was strictly worse than recovering an action. A critical failure
still leaves you holding nothing, and that's the wall. The first two fallbacks are combat tools:
in exploration there's no action economy to refund and no round to fill, so there only Forced
Effort (or just letting the spell fail) applies.

Spellstrike gets its own version. On the row where the attack hits and the casting fails normally,
the Magus can force the spell, or swap in a cantrip channeled through the same strike (failure
column minus 1). Recover-an-action doesn't apply there — the whole activity already resolved.

Two clarifications that fell out of this. The cantrip fallback is **one** cantrip, not two
one-action ones, and the −1 is fixed either way. And two one-action cantrips in a normal turn are
still neutral castings — cantrips can't recover more than −1 per turn, and only a 2+ action
cantrip reaches that.

## Improvised casting is never safe

An unprepared spell now always rolls, even outside combat, with the usual penalties (no +2 status
bonus, +2 to the DC). The safe 10-minute exploration casting only covers spells you prepared or
that are in your repertoire. Improvising was never meant to be free during exploration, and now
the doc says so.

## Staves fixed

Charges are now **RMax**, refreshed each day — exactly the base game's free amount, since there's
no slot to feed a staff in this system. No accumulation, unused charges lost after 24 hours, as
printed. The old `RMax + key ability modifier` number is gone; it overshot the base game's fully
fueled staff at low and mid level. RMax is the ceiling, and Staff Nexus is the only way above it.

## Hero Points

Still only reroll the casting check. They never recover MF — the recovery channels stay cantrips,
Refocus, and rest.

## Foundry macros — v1.2

Both macros bumped. The casting macro gets:

- the three-way failure prompt (cantrip / recover an action / forced effort), with the MF math
  applied for you;
- an **"Out of combat (safe casting)"** checkbox on the confirm screen (prepared/repertoire
  spells only) that skips the d20 and applies the exploration table (+2 High, +1 Mid, 0 Low);
- the Spellstrike macro now gets the cantrip fallback: on a casting failure when the attack hits,
  it offers Forced Effort or a cantrip swap, and posts the chosen cantrip's card in the same step.

The cantrip and the recovered action are reminders on the card rather than full automation — the
macro can't know which cantrip you want, or hand an action back to the combat tracker. Install
notes in [FOUNDRY.md](./FOUNDRY.md), same as before: Script macro, not Chat.

As always: this is not for the one-big-fight-per-day table, the crit-failure column is only tuned
against play up to level 10, and anything this doesn't cover goes through the conversion rule.
Feedback welcome — the fallbacks exist because someone pointed out that failing a cast shouldn't
blank your whole turn.
