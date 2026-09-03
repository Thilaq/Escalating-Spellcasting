# Escalating Spellcasting: casting without spell slots, for Pathfinder 2e

Unofficial fan content, free. Not affiliated with Paizo. The central
idea is borrowed from the Brazilian game *Arcana Primária* (Nozes Game Studio), which also drops
spell slots for fatigue; everything else here is mine and nothing from their book is reproduced. If
anyone from Nozes reads this and wants different wording, open an issue and I'll fix it the same day.

Cast a spell of rank 1 or higher and you make a check. If you fail, the spell doesn't manifest and
you get more tired — though a normal failure lets you fall back to a cantrip, get one action back,
or force the spell through. The tiredness is a number called Magic Fatigue, and it gets added to
the DC of your own next spells. That is the whole system.

```
Effective Casting DC = base DC for the rank + your current MF + Repetition Strain + adjustments
```

What it changes at the table: nobody ever says "I'm out of slots". Everybody says "I can still
cast, I just might fizzle". A caster who pushes hard gets worse at magic instead of silent.

<img width="800" height="425" alt="GravaodeTela2026-09-01204350-ezgif com-video-to-gif-converter" src="https://github.com/user-attachments/assets/035f83ca-f631-413f-8bf0-f0904945fc81" />

## Files

- [docs/QUICKSTART.md](docs/QUICKSTART.md): the system, a few minutes of reading. Start here.
- [docs/RULES.md](docs/RULES.md): everything, including the edge cases, the class conversions and the variants.
- [docs/FOUNDRY.md](docs/FOUNDRY.md): the two macros, install, where the numbers are stored, what they don't do.
- [macros/](macros/): the macros. Plain `.js`, pasted into a Script macro.
- [CREDITS.md](CREDITS.md): what is whose, and why there is no ORC notice on this.
- [LICENSE.md](LICENSE.md): what my license covers, what it cannot cover, and the Paizo notice.
- [LICENSE-CODE.txt](LICENSE-CODE.txt): MIT, for the code.

## The table

Rank categories follow your highest rank (RMax): High is RMax and RMax-1, Mid is RMax-2, Low is
RMax-3 and below.

| casting check result | High | Mid | Low |
|---|---:|---:|---:|
| critical success | +0 MF | -1 MF | -2 MF |
| success | +2 MF | +1 MF | -1 MF |
| failure | +3 MF | +2 MF | +1 MF |
| critical failure | +5 MF | +4 MF | +2 MF |

A cantrip of 2 or more actions needs no roll and removes 1 MF. A cantrip of 1 action or a reaction
needs no roll and changes nothing. MF sits between 0 and 10.

Low rank spells are how you unload fatigue. Cantrips are how you unload it safely. Big spells are
how you borrow against it. When you hit 10 you can burn your own hit points to keep going (Vital
Overload: MF drops to 4, Drained up 2, no daily limit, the limit is the body).

## Choices, and the one number I want to hear about

The critical failure column. High rank at +5 means a wizard who crit-fails a rank 9 spell is
basically out of rank 9 magic for the fight, and I think that's right, but the table play behind this only goes up to level 10. If you run it higher, tell me what happens.

Refocus is a power gain, deliberately. In addition to its usual benefits, the Refocus activity returns MF
to 0, once per hour, and that hour is mine, not the game's. Casters come back consistent across a day of
scenes instead of running dry, and the price is still paid where it should be paid, inside each fight, in
fatigue.

## Foundry VTT

Two Script macros automate the whole thing: fatigue tracking, the check, strain on repeats, the
failure fallback prompts (cantrip, recover an action, forced effort), the spell card posted without
spending the slot, one d20 used for both the casting check and a spell attack, Hero Point reroll
with a preview of your current result, Counterspell, and a separate Spellstrike macro for the Magus.
Install notes in [docs/FOUNDRY.md](docs/FOUNDRY.md).

## What this is not

A conversion of every feat in the game. Feature i did convert: Divine Font, the
Wizard's bonded item, the three Arcane Theses (Spell Substitution, Infinite Possibilities, Spell Blending),
Studious Spells, Spellstrike, the eidolon magic feats, Animist's twin spellbook, staves, wands and scrolls.
Counterspell is not converted so much as given one line: you pay fatigue for the prepared spell you burn, and
the rest is the game's own rule. Bard, Druid, Oracle, Sorcerer, Witch and
Psychic have a paragraph of guidance each and no per-feat audit. Archetypes are basically untouched.
[docs/RULES.md section 19](docs/RULES.md#19-the-conversion-rule) is the one-line rule my table uses for anything I missed, and it has held
up so far.

It's also not a module, and there is no changelog: I'd rather you read the version notes on the
release tag when there's a second release worth describing.

## Rough edges

The crit failure column is tuned against play up to level 10. I don't know what it feels like across a long campaign at 15+, and a table that has run it there is the only thing that would tell me.

Not every spell slot mechanic in the game has been adapted. Anything I didn't touch is meant to be
adjudicated at the table with the conversion rule in [docs/RULES.md section 19](docs/RULES.md#19-the-conversion-rule).

The macros lean on two calls in the pf2e system, `getSheetData()` and `cast({ consume })`. If an
update renames them, three functions need touching, listed in `docs/FOUNDRY.md`.
