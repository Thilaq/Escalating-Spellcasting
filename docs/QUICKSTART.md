# Escalating Spellcasting — quickstart

Unofficial fan content for Pathfinder Second Edition. Not affiliated with or endorsed by Paizo Inc.
Free. The idea of trading spell slots for fatigue comes from the Brazilian game *Arcana Primária*
(Nozes Game Studio); the engine below is built for PF2e and no text from either game is copied here.
[CREDITS.md](../CREDITS.md) has the licensing details, and [LICENSE.md](../LICENSE.md) the short license.

## The rule

You do not have spell slots. You have a number called **Magic Fatigue** (MF), and every spell of
rank 1 or higher is a check against a DC that includes it.

```
Effective Casting DC = base DC for the spell's rank + your current MF + Repetition Strain + adjustments
```

If the check succeeds, the spell happens. If it fails, it doesn't, and MF goes up. MF never goes
below 0 and never above 10. At 10 you stop being able to attempt checked spells and either back off
or pay with hit points (below).

MF adds to your DC. It does not add to anything else. It is not a condition, it does not touch your
attacks, AC, saves, skills or the spell's damage. A caster at MF 8 is exactly as dangerous as a
caster at MF 0, they are just more likely to fizzle.

## What does not change

Everything about which spells you know, and which ones you have ready today, stays exactly as your class
describes it. A wizard still writes down a number of spells each morning, the same number as before. A
sorcerer or bard still knows a short list and gets the +2 from every spell on it. You keep the spellbook,
the familiar, the divine list, the bloodline, all of it.

The only thing taken away is the count of how many times each spell can go off before you have to stop.
Nothing else about learning spells, preparing them, or what you are allowed to cast is touched here.

## Making the check

```
d20 + level + spellcasting proficiency + key ability modifier + items + 2 (if the spell was prepared, or is in your repertoire)
```

Compare to the Effective Casting DC. Critical on 10 or more above, failure at 10 or more below, as
usual. Natural 20 and natural 1 shift the degree one step.

The +2 is the only mechanical difference between a spell you came ready for and one you are making
up. If your class or archetype would not get that bonus, cast at +0.

Base DCs, unchanged from the base game:

| rank | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| base DC | 15 | 18 | 20 | 23 | 26 | 28 | 31 | 34 | 36 | 39 |

## Categories

Your RMax is the highest rank you can cast, exactly as your class says. Categories are measured
backwards from it, which is what makes one table work at level 1 and level 20.

| category | which ranks |
|---|---|
| High | RMax, RMax-1 |
| Mid | RMax-2 |
| Low | RMax-3 and below |
| cantrip | separate |

RMax 5: ranks 5 and 4 are High, 3 is Mid, 2 and 1 are Low. At low level some categories do not
exist yet (RMax 1 means everything you have is High), and that is fine: cantrips do the job that
Low rank does later.

These do not move during the day, and they only move when you gain a level and get a new top rank. At
RMax 5, rank 3 is Mid this morning and Mid next week. Write the four lines at the top of your sheet once
and you never do that arithmetic in a fight again, the only things worth checking on your turn are your
fatigue number and whether you already cast this spell at this rank.

## What each result costs

| | crit success | success | failure | crit failure |
|---|---:|---:|---:|---:|
| High | +0 MF | +2 MF | +3 MF | +5 MF |
| Mid | -1 MF | +1 MF | +2 MF | +4 MF |
| Low | -2 MF | -1 MF | +1 MF | +2 MF |
| cantrip, 2+ actions | -1 MF, no check | | | |
| cantrip, 1 action or reaction | 0 MF, no check | | | |

The cantrip line: no roll, and the -1 happens even if the target resists, even if you attack and
miss, even if the cantrip is pointless in that moment. It represents one round of controlled, low
risk channeling. That is the whole recovery loop for a tired caster, so take it seriously. A
one-action cantrip is neutral, and two one-action cantrips are still neutral — the cantrip ceiling
is −1 per turn, and only a 2+ action cantrip reaches it.

## Failure: pick a fallback

On a normal failure (not a critical one) you pick one of three:

- **Cantrip fallback**: the spell is lost; you deliver one cantrip of 2 actions or fewer instead,
  and the MF you take is the failure column minus 1. One cantrip — not two one-action ones — and
  the −1 is fixed either way.
- **Recover an action**: the spell is lost; you regain one of the actions you spent, and take the
full failure column. That action cannot be a Cast a Spell for a spell of rank 1 or higher.
Cantrips and focus spells are allowed.
- **Forced Effort**: the spell works like you succeeded; take the failure column plus 2 MF.

| category | failure | cantrip | recover action | forced |
|---|---:|---:|---:|---:|
| High | +3 | +2 | +3 | +5 |
| Mid | +2 | +1 | +2 | +4 |
| Low | +1 | 0 | +1 | +3 |

Nothing after a crit failure. Forcing never fixes a missed attack roll. The first two fallbacks
matter in a fight; outside combat, only Forced Effort (or just letting the spell fail) applies.

## Repetition Strain

Cast the same spell at the same rank again in the same fight, and from that point on each casting of
that spell at that rank gets **+2 DC and +1 extra MF**, cumulatively. Second casting +2/+1, third
+4/+2, fourth +6/+3. Same spell at a different rank is not a repeat. Cantrips are immune. Strain is
per fight; it clears when the fight clears.

Two things protect you from it:

- A spontaneous caster can repeat any repertoire spell **once** at the same rank for free. The third
  casting at that rank starts the ladder.
- A prepared caster can repeat a spell as many extra times as they prepared extra copies of it.
  Two `Fear` at rank 1 in your book means two castings before strain.

Signature spells do not give you another free repeat. Their benefit is the normal one: you may cast
that spell at any rank you can access, and that is how you dodge strain, by moving to a rank where
the casting is not a repeat.

## Prepared casters improvising

You learned `Feather Fall` but you prepared other things today. You can still cast it: no +2 status
bonus, and +2 to the Effective Casting DC. It replaces "I prepared wrong this morning" with a choice
you make at the moment you need it. Improvised casting always rolls, even outside combat — it never
gets the safe 10-minute casting below.

## Outside combat

Nothing chasing you, no dice. A spell of rank 1+ takes 10 minutes and works:

| category | time | check | MF |
|---|---:|---|---:|
| High | 10 min | no | +2 |
| Mid | 10 min | no | +1 |
| Low | 10 min | no | 0 |
| cantrip | normal | no | 0 |

Low rank out of combat is safe, not free of cost, and it does not reduce MF. If there is a chase, a
crowd, a ritual going wrong, or something else with a clock on it, the GM calls for a normal check.
The safe table only covers spells you prepared or that are in your repertoire; an improvised spell
always rolls, with the unprepared penalties above.

## Getting rid of MF

End of combat does nothing. Deliberate: if it reset when the monsters died, fatigue would only
matter inside one fight and the system would be a tax on long battles.

- **Refocus**: the game's activity, 10 minutes, refilling Focus Points as often as you have time
  for. Here it clears your MF too, and only that part is once per hour.
- **Long rest**: MF to 0.
- **Hero Points** reroll the casting check; they don't reduce MF.

## At 10 MF

You cannot attempt any spell of rank 1+ that requires a check. You can still cast cantrips, use
focus spells, activate items, and use anything with its own daily economy. A 2-action cantrip takes
you from 10 to 9, so you are never stuck doing nothing for a round.

To get more than that:

> **Vital Overload**, free action, usable when you are at 10 MF or when a casting would put you at
> 10. Your MF becomes 4 and your Drained value increases by 2.

No daily limit. Each use permanently reduces your hit points for the day, and Drained from this
source can't be reduced until your next long rest unless your GM says otherwise. It does not undo
the failure you just had and it does not clear Strain. It buys stability with your body.

## Attack spells, saves, focus spells

**Spell attack**: one d20. Same total against your Effective Casting DC (does it manifest) and
against the target's AC (does it hit). If the spell doesn't manifest there is no attack. MF follows
the casting result.

**Save spells**: you make the casting check. If it manifests, the target saves against your normal
spell DC. MF follows your check only, never the targets' results.

**Focus spells**: untouched. They use Focus Points, they never roll a casting check, they never
change MF, they never accumulate strain.

**Sustain a Spell** works normally with no extra MF. **Spellshape** and other metamagic cost no extra
MF either. Feats that used to give, regain or spend slots: see the conversion rule in
[docs/RULES.md section 19](./RULES.md#19-the-conversion-rule) .

## Magus, Spellstrike

This is the part I changed the most from my first draft, so read it twice.

```
Make one Strike attack roll.
Compare that same total to the target's AC, and to your Effective Casting DC.
```

No separate spellcasting roll inside Spellstrike. Your martial execution is what holds the spell
together, so Strength or Dexterity, weapon proficiency, potency runes, MAP and any item bonuses all
feed the casting comparison. Outside Spellstrike you cast normally, with the spellcasting modifier.

| attack | casting | what happens |
|---|---|---|
| hits | passes | both land |
| hits | fails | attack lands, spell lost unless you spend Forced Effort or swap in a cantrip |
| hits | crit fails | attack lands, spell collapses |
| misses | passes | the spell was channeled and goes nowhere |
| misses | fails | both fail |
| crit miss | any | attack fails badly, spell is lost |

MF applies in every row, because the energy was spent. On the row where the attack hits and the
casting fails normally you choose: Forced Effort (+2 MF) or a cantrip fallback (the spell is lost,
you channel a cantrip through the weapon with the same strike, failure column minus 1). No recovered
action here — the whole activity already resolved. A cantrip delivered by Spellstrike still gives you
the -1 MF, even on a miss.

## Counterspell

Use the game's reaction as written. One conversion: it tells you to lose a spell slot, so instead you pay
Magic Fatigue as if you had cast the prepared spell you burn. That spell's rank sets both its price and
your counteract rank. Check against the enemy's DC, their fatigue included. Forced Effort does not apply.

The feat that loosens the gate (spell in your spellbook instead of prepared, plus a shared trait that is
not concentrate, manipulate or tradition) changes the requirement and no number.

*Variant: countering is not rest.* A critical success does not reduce your MF, even where the table says it
should.

## What is not covered, and what to do about it

This is one person's supplement, not a database. The core engine, Spellstrike, Counterspell and the
fatigue economy have real play behind them. Only these features were converted one by one:
Divine Font, the Wizard's Arcane Bond and Drain Bonded Item, three arcane theses (Spell
Substitution, Spell Blending, Staff Nexus), the Infinite Possibilities class feat, Studious
Spells, the Summoner's eidolon feats, and the Animist's two spellbooks. Scrolls, wands and
staves are handled. Bard, Druid, Oracle, Sorcerer, Witch and Psychic get a paragraph of
guidance in [docs/RULES.md](./RULES.md) . Domain feats, most dedications, most items: not
audited. This section exists so you find out here, not in round three of a boss fight.

For anything I missed:

> If a feat, feature, item or spell interacts with spell slots in a way this document doesn't cover,
> the GM converts it into the nearest equivalent safeguard, keeping what the option was for.

| what it used to do | convert it into |
|---|---|
| give an extra slot | guaranteed access, a safe casting, or its own economy |
| regain a slot | reduce MF by 1 or 2, or ignore strain on one repeat |
| spend a slot | pay MF, spend charges, or limit to daily uses |
| add a spell to your repertoire | add it, with the usual +2 |
| touch focus spells or cantrips | leave it alone, those already work |

Use the smallest safeguard that keeps the intent. Anything that already costs a daily use can be
generous, even auto-succeed with no MF, because the limit is already in place.
