# Escalating Spellcasting: full rules

Unofficial fan content for Pathfinder Second Edition. Not affiliated with or endorsed by Paizo Inc.
The starting idea is the fatigue-based magic of the Brazilian game *Arcana Primária* (Nozes Game
Studio); the engine below is mine and built for PF2e. This document quotes no Paizo rule text and
assumes you already know the base game. [CREDITS.md](../CREDITS.md) explains the licensing choices.

This is the long version. To play, [QUICKSTART.md](./QUICKSTART.md) is enough. The two
things people come back to here for are the fatigue table (section 5) and the conversion
rule (section 19).

Contents: 1 goals · 2 concepts · 3 the check · 4 categories · 5 fatigue · 6 failure & fallbacks ·
7 cantrips · 8 strain · 9 signature and repeats · 10 prepared vs spontaneous · 11 outside combat ·
12 recovery · 13 saturation and vital overload · 14 other interactions · 15 counterspell ·
16 spellstrike · 17 converted features · 18 items · 19 conversion rule · 20 examples ·
21 balance · 22 GM advice · 23 variants

## 1. What this is trying to do

Magic stays available. A wizard with an empty slot column is still a wizard. Access to spells comes
from your class, tradition, spellbook, repertoire, familiar, patron, bloodline, deity or item, never
from a budget that runs out.

The cost is risk instead of subtraction. Casting doesn't cross a number off your sheet, it moves a
number that makes the next spell harder. Big spells are reliable while you are fresh and expensive
once you aren't. Small magic stays relevant because cantrips and low rank spells are the recovery
mechanic, not filler.

The punishment stays inside the system. Critical failures do no damage and don't apply Stupefied by
default, because fatigue is already a currency the table can reason about, and I didn't want every
GM inventing a different extra punishment.

Anything that used to give, regain or spend slots becomes a guarantee, an exception, or a separate
economy, per section 19.

In play the question stops being "how many spells do I have left" and becomes "how risky is the next
one".

## 2. Concepts

**Magic Fatigue (MF).** Instability the caster has accumulated. Starts at 0, floors at 0, capped at
10. Added directly to the Effective Casting DC. Not a penalty on the character: it never affects
attacks, AC, skills or saves.

**Effective Casting DC.**

```text
base DC for the spell's rank + your current MF + Repetition Strain + other adjustments
```

**RMax.** Your highest castable rank, exactly as your class defines it. Nothing here changes how you
gain ranks.

**Access.** No slots does not mean you know everything. You cast what your class, tradition,
spellbook, repertoire or item gives you. That part of the game is untouched. A wizard prepares
the usual number of spells each morning, a spontaneous caster still learns the usual short list,
and both of those lists are what decide your +2 status bonus and how many repeats you get before
strain. What is gone is the number of castings, nothing else.

Base DCs by rank, the standard numbers from the base game, written here as bare values:

| rank | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| DC | 15 | 18 | 20 | 23 | 26 | 28 | 31 | 34 | 36 | 39 |

## 3. The Casting Check

```text
d20 + level + spellcasting proficiency + key ability modifier + items
    +2 status bonus  if the spell was prepared, or comes from your spell repertoire
= total, against the Effective Casting DC
```

Natural 20 improves the degree by one, natural 1 worsens it by one. The modifiers are the ones
already on your sheet; there is nothing new to build.

The +2 is the only mechanical gap between a spell you came ready for and one you're making up. If
your class or archetype wouldn't get that bonus in the base game, cast at +0.

**Improvised prepared casting.** A prepared caster can cast something they learned but did not
prepare, from the book they left at home. Cost: no +2, and +2 to the Effective Casting DC. I added
this after the first session where the wizard prepared for a dungeon and the session was a negotiation
with a ghost. It replaces "I prepared wrong" with a choice made at the moment you need it.

An improvised spell is never safe: even outside combat it uses the normal check (section 11), where
a prepared spell would be automatic.

## 4. Rank categories

| category | ranks |
|---|---|
| High | RMax and RMax-1 |
| Mid | RMax-2 |
| Low | RMax-3 and below |
| cantrip | separate |

At RMax 5: ranks 5 and 4 are High, 3 is Mid, 2 and 1 are Low.

At low levels some categories don't exist, and that's on purpose.

| RMax | High | Mid | Low |
|---:|---|---|---|
| 1 | rank 1 | nothing | nothing |
| 2 | ranks 2, 1 | nothing | nothing |
| 3 | ranks 3, 2 | rank 1 | nothing |
| 4 | ranks 4, 3 | rank 2 | rank 1 |
| 5 | ranks 5, 4 | rank 3 | ranks 2, 1 |

Until Low rank exists, cantrips carry the recovery role.

## 5. Magic Fatigue

The table everyone actually prints:

| | crit success | success | failure | crit failure |
|---|---:|---:|---:|---:|
| High | +0 MF | +2 MF | +3 MF | +5 MF |
| Mid | -1 MF | +1 MF | +2 MF | +4 MF |
| Low | -2 MF | -1 MF | +1 MF | +2 MF |
| cantrip, 2+ actions | -1 MF, automatic | | | |
| cantrip, 1 action or reaction | 0 MF, automatic | | | |

Rough vocabulary for talking about it at the table:

| MF | state |
|---:|---|
| 0-2 | fine |
| 3-4 | pressure |
| 5-6 | risky |
| 7-8 | red |
| 9-10 | about to stop working |

Those bands have no rules attached. They exist so someone can say "I'm at seven, I'm not opening
with a rank 5" and be understood.

The cap of 10 is a mathematical safeguard, not lore. Without it the DC climbs past any useful value
and the caster ends up in a spiral nobody enjoys watching. If something would push you past 10 it
stops at 10 (there's an uncapped variant in section 23, and I do not recommend it for a normal
campaign).

## 6. Failure and fallbacks

A spell of rank 1+ can fail normally, and when it does you don't just stand there holding a broken
pattern. Pick one fallback:

- Cantrip fallback: the spell is lost, but you channel the energy into one cantrip of 2 actions or
  fewer, delivered with the actions you already spent. Take the failure column, minus 1 MF. It is
  one cantrip, not two one-action ones, and the −1 is the same either way.
- Recover an action: the spell is lost, but you regain one of the actions you spent on it. Take
  the full failure column.
- Forced Effort: the spell works as if you had succeeded. Take the failure column, plus 2 MF.

| category | failure | cantrip fallback | recover an action | forced effort |
|---|---:|---:|---:|---:|
| High | +3 | +2 | +3 | +5 |
| Mid | +2 | +1 | +2 | +4 |
| Low | +1 | 0 | +1 | +3 |

Nothing here applies after a critical failure; the pattern already collapsed, and that is the one
outcome that costs you the whole turn with no fallback. Forcing doesn't fix a missed attack roll
and doesn't clear strain. The cantrip fallback and the recovered action only matter when actions
are being tracked, in a fight or a chase; outside that, a failure is simply a failure — the spell
is lost and you take the failure column, unless you pay Forced Effort.

## 7. Cantrips

No check, no strain, ever.

A cantrip of 2 or more actions removes 1 MF, automatically, even if the target resists, even if the
attack misses, even if the cantrip does nothing useful that round. A cantrip of 1 action or a
reaction changes nothing. Two one-action cantrips in the same turn are still two neutral castings:
the recovery ceiling from cantrips is −1 per turn, and only a 2+ action cantrip reaches it. The short
versions already have value in the action economy, so they don't also get to be the recovery tool.

This split is what keeps a tired caster playing instead of passing turns. It also makes "cantrip
forever" boring rather than broken: it's stable and weak, like a full round of Striking should be.

## 8. Repetition Strain

Casting the same spell at the same rank again in the same fight is a caster's worst habit, so the
system charges for it. From the second casting of that spell at that rank onward:

```text
each repeat: +2 to the Effective Casting DC, and +1 extra MF after resolving
```

Cumulative: second +2 DC / +1 MF, third +4 / +2, fourth +6 / +3.

| sequence | a repeat? |
|---|---|
| `Fireball` 5 then `Fireball` 5 | yes |
| `Fireball` 5 then `Fireball` 4 | no |
| `Fireball` 5 then `Lightning Bolt` 5 | no |
| `Heal` 5 then `Heal` 3 | no |
| cantrip then the same cantrip | no, cantrips are immune |

Strain is about this fight and these targets. It clears at the end of the encounter.

## 9. Signature spells and repeats

Two different things, often mixed up.

A spontaneous caster may repeat any repertoire spell once at the same rank for free. First and second
casting are clean, the third starts the strain ladder.

A signature spell may be cast at any rank you have access to, subject to that spell's own heightening
rules. It grants nothing extra at the rank you already have it at.

So a signature spell dodges strain sideways, by moving to a rank where the casting isn't a repeat.
If you insist on the same rank three times, the third one is strained like anyone else's. I keep it
this way because "my best spell is always available" is exactly the hole a fatigue system falls into
if signature spells also refund repeats.

## 10. Prepared vs spontaneous

Removing slots doesn't remove the difference between the two casters, it moves it.

| | prepared | spontaneous |
|---|---|---|
| breadth | large list, chosen at prep | small list |
| status bonus | +2 on prepared | +2 on repertoire |
| free repeats at one rank | one per extra prepared copy | one, always |
| improvise something unprepared | yes, with penalties (section 3) | n/a |
| signature spells | usually none | the flexibility lever |

**Preparing the same spell twice.** Two prepared copies of `Fear` at rank 1 means two clean
castings before strain starts. Preparation buys depth on what you expected to need.

**Knowing the same spell at two ranks** gives you two separate lines in the strain ledger. `Fear`
rank 1 and `Fear` rank 2 never strain each other.

## 11. Outside combat

No pressure, no dice. A spell of rank 1+ takes 10 minutes and works:

| category | time | check | MF |
|---|---:|---|---:|
| High | 10 min | no | +2 |
| Mid | 10 min | no | +1 |
| Low | 10 min | no | 0 |
| cantrip | normal | no | 0 |

Low rank outside combat is safe but not restorative; it doesn't reduce MF. If there is a chase, a
crowd, hostiles nearby, or a ritual going wrong, the GM asks for a normal check instead.

This safe table is for spells you prepared (or that are in your repertoire). An improvised spell —
something a prepared caster learned but did not prepare — is never safe, even here: it always uses
the normal casting check, with the usual unprepared penalties (no +2 status bonus, +2 to the DC).
On a success it works and you pay the table above; on a failure it does not manifest, you pay the
failure column, and Forced Effort is available for +2 (the cantrip and recover-an-action fallbacks
are combat-only, section 6). The check is against base DC + current MF + 2 (the unprepared
penalty); there is no strain outside a fight.

## 12. Recovery

End of combat does nothing. That's the decision that makes the system work or die. If MF reset when
the monsters died, fatigue would only matter inside a single fight and the whole thing would be a tax
on long battles.

- **Refocus**: the game's own 10 minute activity, which brings back Focus Points as often as you like.
  Here it also takes your MF to 0, and that reset is once per hour, on my clock and not the game's.
- **Long rest**: MF to 0.
- **Hero Points** do not recover MF. Spending one rerolls the casting check (and can prevent MF that
  way), but it never changes the number.

The rhythm you get is: fight, spend, back off, refocus between scenes, and decide honestly whether the
next room is worth walking into at MF 5.

Refocus makes a caster consistent across the day rather than weak inside a fight, and that is the goal, not
a hole. Between scenes you always come back. Inside one, nothing here helps you, and the fatigue you carry
into the next room is the point. Do not fix a day that feels too easy by taking Refocus away; if a table
feels too consistent between scenes, that is an encounter spacing problem before it is a rule problem.

## 13. Saturation and Vital Overload

At 10 MF you cannot attempt a rank 1+ spell that needs a check. Cantrips, focus spells, items, and
anything with its own daily economy still work. A 2-action cantrip still takes you from 10 to 9, so
you are never reduced to doing nothing on your turn.

To get more than that:

> **Vital Overload.** Free action, usable at 10 MF, or at the moment a casting would put you at 10.
> MF becomes 4. Your Drained value increases by 2.

Drained gained this way can't be reduced until your next long rest, unless your GM makes an exception
for a ritual or something strong enough to justify it. There is no daily limit; the limit is the
body, since every use permanently cuts your hit points for the day. It doesn't undo the failure you
just had, doesn't clear strain, doesn't convert anything into a success.

This is the answer to "what if I just want to keep casting". You can, and here's the bill.

## 14. Other interactions

**Focus spells** are untouched. They use Focus Points, never roll a casting check, never change MF,
never accumulate strain. Bloodline, order, revelation and hex spells, animist vessel spells, all of
it stays as printed.

**Sustain a Spell** works normally, no extra MF, no extra risk. Feats that improve sustaining are
unaffected.

**Spellshape and metamagic** cost no extra MF. They already cost actions, feats and tactical room.
Only touch a Spellshape if its text mentions slots.

**Spell attacks**: one d20, compared to your Effective Casting DC (does it manifest) and to the
target's AC (does it hit). If the spell doesn't manifest there is no attack. MF follows the casting
result only.

**Save spells**: you make the casting check, and if it manifests the target saves against your usual
spell DC. Their result never changes your MF.

**Summoning and long durations**: resolve normally. Only the casting itself is at risk.

## 15. Counterspell

The base game's Counterspell reaction (Player Core 186) needs one conversion and nothing else: it tells
you to lose a spell slot as if you had cast the triggering spell, and we do not have spell slots.

Here is the whole conversion.

**Pick the prepared spell you expend.** Its rank is your counteract rank, as printed, and it is also what
sets your price: you pay Magic Fatigue exactly as if you had cast that spell, on that row of the category
table, against the enemy's DC for the rank they cast at plus the enemy's own MF. That one sentence is
doing two jobs at once, which is why the rule needs no tuning of mine.

- Spend the same rank they used: cheap-ish, and your check actually matters, because a failure only
  counteracts spells of a lower rank than yours.
- Spend a rank above them: you pay more Fatigue, but you climb the counteract ladder, and at one rank
  above you counter on a failure.

So a caster at MF 0 who wants to shut down one scary spell spends their big prepared copy and eats the
+2. A caster at MF 6 who counters anyway is choosing to make their own next spell worse. Nobody is
deciding this for you and there is no table to consult.

**Degrees of counteract are untouched.** Critical covers up to 3 ranks above you, success up to 1,
failure only lower, critical failure nothing. If their spell is above your best prepared copy, the math
already tells you to roll your reaction away instead of burning a spell on a coin flip.

**Forced Effort does not apply.** You are not manifesting a spell, you are making a check. No option, no
extra MF to buy a result.

**Fatigue on a critical success.** My default is to let the row work normally, which means a High rank
spell you spent to counter gives 0 MF on a crit, and a Low one gives -2. So a wizard who is tired can
honestly prefer countering to casting, and I think that is a good thing to be true: their reaction becomes
a controlled, defensive way to unload, at the cost of a prepared spell they wrote for something else.
If you would rather countering never be a recovery route, one line fixes it: a critical success on a
counteract check does not reduce your MF. Say it out loud at session zero, because it is the kind of
small rule difference that quietly changes what a wizard does on their reaction.

**Clever Counterspell** (Player Core 204) moves the gate and touches nothing else. The triggering spell
only needs to be in your spellbook instead of prepared, and the prepared spell you expend needs to share
a trait that is not concentrate, manipulate, or its tradition. The current version of that feat has no
numeric penalty and I am not adding one; the cost is the spell it eats and the Fatigue you
pay. The rank you spend, the fatigue price, and the check all work exactly as they do for
Counterspell above.

**Identification is free at the base gate and bought at the upgraded one.** If you have the spell prepared,
you know what is being cast, no check, which is what makes Counterspell feel good rather than fussy. The
Clever route wants the feat chain that lets you recognize the spell on sight first, and that is the
prerequisite doing its job rather than a tax I invented.

**Enemy casters.** Run them the same way. They get a Casting Check against the DC your save would roll
against, they pay their own Fatigue, and when you counter them you are making a check against their
fatigued DC, which means a tired enemy caster is genuinely easier to shut down. That symmetry is the
reason this rule took a rewrite instead of a patch: the old version had me tracking a separate MF price
for counters, and separate prices for two actions that should feel like one axis.

## 16. Magus and Spellstrike

The Magus takes no penalty for being a limited caster. Spellstrike is resolved differently from
normal casting, and this is the rule I've changed the most, so read it carefully.

```text
Make one Strike attack roll.
Compare that same total to the target's AC, and to your Effective Casting DC.
```

No separate spellcasting roll inside Spellstrike. The strike's total already carries Strength or
Dexterity, weapon proficiency, potency and property runes, MAP, and item or circumstance bonuses, and
all of that now feeds the arcane half of the class. Outside Spellstrike the Magus casts with the
normal casting check like everyone else.

The reason: at that moment the spell isn't being stabilized by study, it's being channeled through a
weapon into an impact, so the quality of the blow is what holds the matrix together.

| attack | casting | outcome |
|---|---|---|
| hits | passes | both land |
| hits | fails | attack lands, spell lost unless you spend Forced Effort or swap in a cantrip |
| hits | crit fails | attack lands, spell collapses |
| misses | passes | the spell was channeled and goes nowhere |
| misses | fails | both fail |
| crit miss | anything | attack fails badly, spell is lost |

MF applies in every row, because the energy was spent either way. On the row where the attack hits
and the casting fails normally, you get the fallback choice: Forced Effort (the spell manifests,
+2 MF) or a cantrip fallback (the spell is lost, but you channel a cantrip through the weapon with
the same strike, at the failure column minus 1). Recover-an-action does not apply to Spellstrike —
the whole activity already resolved. A cantrip delivered by Spellstrike still removes 1 MF, even on
a miss.

## 17. Converted class features

These are the ones I sat down and wrote out. Everything else goes through section 19.

**Divine Font (Cleric).** Heal and Harm keep their daily uses and the slots on the sheet. Safe,
automatic, no check, no MF movement. Channel Smite and similar feats work as printed.

**Any feature with daily uses.** If it says "spend one of your uses", it is its own economy: no check,
no MF, no strain. The cost is already being paid.

**Arcane Bond and Drain Bonded Item (Wizard).** Once per day, repeat a prepared spell. It ignores
Repetition Strain, and the final MF change of that casting is reduced by 2, so a successful High rank
casting often lands at zero. The bonded item itself doesn't change.

**Spell Substitution (Wizard, arcane thesis).** Works as written. Ten minutes to trade one prepared spell
for another from your spellbook, and that is the whole conversion, because this system never made you pay
for breadth of preparation. Its limit stays the one the book gave it, which is that a fight does not hand
you ten minutes.

**Staff Nexus (Wizard, arcane thesis).** Your makeshift staff is a magical item you start with,
holding one cantrip and one rank 1 spell from your spellbook, and neither of them comes out of
your preparation. The cantrip needs no charge. The staff gains no charges from being prepared,
that is its drawback, so each day you can expend one prepared spell to give it charges equal to
that spell's rank, and they fade after 24 hours.

Charges are the only part of this thesis that touches fatigue, and that needs a rule here which
the book does not need: section 18 says spending a staff charge never moves fatigue. That is
right about a staff you paid gold for, and it is a hole about a staff you fuel with your own
preparation. Burning a prepared spell for charges and then spending them for free is spending a
spell and paying nothing, which is the one thing this document exists to not allow.

So the fuel costs and the fire is free. Feeding a staff a prepared spell costs fatigue as if you
had cast that spell at its own rank. The charges that come out spend normally and never move
fatigue, so what you bought is flexibility, one prepared spell turning into several casts of
whatever that staff knows. At 8th level you can feed two spells to any staff you prepare, at 16th
three, charges equal to the combined ranks, same as the thesis.

During your daily preparations you can merge the makeshift staff into another staff you own,
carrying your two spells with it. That staff is a real one, so it gains its normal charges from
being prepared per section 18, on top of anything you feed it. If it is destroyed, an hour of
work makes a new one with no charges.

Three things worth knowing before you pick it. A free cantrip buys less here than in the book,
because a cantrip already costs nothing, so this one is breadth and not relief. The makeshift
staff is also a flat trade for a while, one rank 1 spell in for one charge out, and the thesis
only starts to pay when you can feed it a spell worth several casts. And the staff never asks for
a check, which means that at 10 MF, when checked spells are closed off, it still works as long as
it has charges. That is deliberate, the same reasoning behind section 13 letting items through at
the cap and section 18 keeping wands and daily uses outside fatigue, and Divine Font works the
same way for the same reason in section 17. If a table finds that too safe, the lever is already
written into section 18, ask for a casting check on staff spells and leave the rest alone.

**Infinite Possibilities (Wizard class feat, level 18; not a thesis).** You cast any spell in your
spellbook, not only what you prepared. Section 3 already lets you do a worse version of that at any level,
an unprepared spell gives up the +2 status bonus and pays +2 to the DC. This feat removes the +2 DC. That is
the entire conversion. It is also the clearest case in this document of a slot feature surviving almost
untouched, because it was never about slots, it was about access, and access is what this system refuses to
touch.

**The two theses not converted.** Improved Familiar Attunement swaps Drain Bonded Item for Drain Familiar,
so it inherits that conversion in section 17 and reads the same way, once per day, one spell back, strain
ignored, the fatigue delta improved by 2. Metamagical Experimentation hands out metamagic feats, and
section 14 already says spellshape and metamagic cost no extra fatigue, so it works as written and there is
nothing to convert.

**Spell Blending (Arcane Thesis, Wizard).** The daily trade survives; the fatigue price is what changes.

> When you make your daily preparations, you can trade two prepared spells of the same rank for one prepared
> spell of a rank up to two higher, among the spells you can normally cast. You can gain only one blended
> spell per rank, and it lasts until your next daily preparations.
>
> A blended spell costs fatigue as the row below its own on the fatigue table: blended High pays like Mid,
> blended Mid pays like Low, and blended Low generates no fatigue on a successful casting, because there is
> no row left below it.
>
> The discount applies to your first casting of that spell, and that casting never counts as a repeat for
> Repetition Strain. After it, the spell is an ordinary prepared spell of its own rank, normal cost and
> normal strain.

Two notes on why it is shaped this way. The discount is one row and not a flat number, because the rows of
the fatigue table sit one point apart in most cells, so "one row below" is already a bounded discount; a
flat -2 would be worth more than the difference between Mid and High and would make blending mandatory
rather than situational. And it is spent on the first casting instead of lasting the day, because the
original feature trades slots, not statistics: once the bonus slot is burned, that day's benefit is gone.

A level 10 wizard who blends two rank 3 spells into a rank 5 *Fireball* pays 1 MF on a success instead of
2 for that casting, strain free, and their other rank 5 spells that day cost what they normally cost. If
they then cast *Fireball* at rank 5 a second time, that one is a repeat like any other: the blend bought one
cheap casting, not a licence to spam the spell.

The feat's third clause, trading a spell slot for two extra cantrips, is not converted. A 2 action cantrip
removes 1 MF here and never accumulates strain, so buying cantrips with prepared magic means buying fatigue
relief, and a wizard who does that every day simply never has the problem the system is about.

**Studious Spells (Magus).** Still worth taking: more prepared instances means more free repeats, plus
the +2. It does nothing directly to MF.

**Summoner.** The current version of the class has slots on the same progression as other spontaneous
casters, so I treat it as a normal spontaneous caster: repertoire +2, one free repeat per rank, and
signature-spell flexibility wherever the class gives it. It spent a while in my notes as "everything
is signature", which was based on an older build of the class and is wrong now.

Eidolon casting (*Magical Understudy* cantrips, *Magical Adept* and *Magical Master* innates, *Share
Eidolon Magic*): the Summoner and the eidolon share one MF pool. The bond is one circuit and spending
through either end loads the same meter. Eidolon cantrips follow the normal cantrip rule against that
shared pool. Innate spells with daily uses are their own economy: no check, no MF.

**Animist.** Two sources, kept apart. Prepared animist spells get +2. Apparition spells get +2 and are
treated as signature spells for rank flexibility, with the normal spontaneous free repeat. Vessel
spells are focus spells so MF never touches them. A spell from one source doesn't count as prepared
or repertoire for the other, and a dispersed apparition costs you its gifts and repertoire until you
re-attune, as printed.

**Sorcerer, Bard, Witch, Druid, Oracle, Psychic.** Guidance, not an audit.
Sorcerer and Bard: full spontaneous, +2 on repertoire, signature as in section 9, composition cantrips
and focus spells untouched. Witch: prepared through the familiar for the +2, hexes and focus spells
untouched, Cackle and sustains normal. Druid and Oracle: prepared and spontaneous respectively, same
+2 logic, order and mystery focus spells never interact with MF. Psychic: +2 on repertoire,
Conscious Mind spells follow whatever access rule the class uses, amped cantrips and focus spells
never use a casting check.

## 18. Items

**Scrolls** are still consumables, and using one never generates MF. The cost is the scroll.

**Wands**: the first activation of a given wand each day generates no MF. Overcharge as printed.

**Staves** use fixed charges instead of a preparation-day slot:

```text
charges = RMax, refreshed each day
```

A staff you prepare gains charges equal to your RMax — exactly the base game's free amount, since
there is no slot to feed it. Charges don't accumulate: they reset to RMax at your daily preparations
and anything unused is lost after 24 hours, as printed. Preparing the staff costs no MF, spending
charges costs no MF, and results never move MF. If your table wants risk there, you can require a
casting check for staff spells while ignoring MF entirely. RMax is the ceiling for a staff you simply
prepare; the only way above it is the Staff Nexus thesis, which burns prepared spells into extra
charges, and that fuel does cost fatigue — see section 17.

**Items with daily uses** are their own economy: no check, no MF.

## 19. The conversion rule

Pathfinder 2e has thousands of options that mention spell slots. Not all of them are converted here
and they never will be by one person. When one comes up at your table:

> If a feat, feature, item or spell interacts with spell slots in a way this document doesn't cover,
> the GM converts it into the equivalent safeguard, keeping what the option was for.

| what it did with slots | what it becomes |
|---|---|
| gave an extra slot | guaranteed access, a safe casting, or its own economy |
| regained a slot | reduce MF, or ignore strain on one repeat |
| spent a slot | pay MF, spend charges, or limit to daily uses |
| flexible prepared slot | counts as prepared for one casting |
| added a repertoire spell | added, with the usual +2 |
| counterspell | use section 15 |
| focus spell interaction | leave it alone, no MF |
| cantrip interaction | use section 7 |

Safeguard intensity, ascending. Use the smallest one that keeps the intent.

| intensity | example |
|---|---|
| light | ignore strain on one repeat |
| moderate | reduce MF by 1 or 2 |
| strong | ignore your current MF when computing one DC |
| very strong | automatic success, no MF |
| own economy | charges or daily uses, separate from MF |

Something that already costs a daily use can sit at the strong end without breaking much.

## 20. Worked examples

Level 10 wizard, RMax 5, +21 to the check, MF 0, casting a rank 5 spell. DC = 26 + 0 = 26. Success:
the spell lands and MF goes to 2. Next round, another rank 5: DC = 26 + 2 = 28. Failure (pick a
fallback): MF 2 to 5. Next round a rank 2 spell, which is Low at RMax 5: DC = 18 + 5 = 23,
success, MF 4. Then a 2-action cantrip, MF 3. Four turns and he can push again.

Same wizard insisting. Second `Fireball` rank 5 of the fight at MF 0: DC = 26 + 0 + 2 = 28. Failure:
+3 MF from the table, +1 from strain, so MF 4. Third casting: DC = 26 + 4 + 4 = 34, and strain now
adds +2 MF. That ladder is the point. Once is fine, three times is a gamble.

Cleric at MF 8 using Divine Font to Heal. No check, spell works, MF stays 8, one daily use gone.
Daily economies sit outside the loop.

Magus at MF 3, Spellstriking a rank 3 spell (RMax 3, so High) into AC 27. Strike total 22: attack
fails against 27, casting fails against DC 23 (20 + 3 MF). Both fail, MF +3 from the casting
comparison, spell lost, and Forced Effort isn't available because the attack missed.

## 21. Why the table has these shapes

Not measured, reasoned. If you want measured, build it and break it at your table and tell me.

**High rank is loud on purpose.** Two successes at your top rank put you at +2 MF, so the third
attempt of the fight costs you a real chance of failure. That is the trade the system is selling: not
"three rank 5 spells per day", but "you can keep trying, and the fourth one is a gamble".

**Low rank pays you back.** Success at Low is -1 MF, crit is -2. Without this, a caster who hits MF 5
has nothing better to do than cantrips and the fight feels like a punishment. With it, dropping to
rank 2 while your RMax is 5 is an actual decision with an upside.

**Cantrips are the only safe channel.** No check, no strain, and 2 actions unloads 1 MF even if the
attack misses or the target resists. This is what keeps a tired caster playing instead of striking
with a weapon they never trained. It is also why a cantrip-focused level 1 character is not
underpowered here, just less swingy.

**Crit failure is fatigue, not pain.** +5 at High ends your night with big magic. It does not hurt
you, and I would rather leave it that way: once crit failures also deal damage, players stop taking
risks entirely and the system turns into a tax.

**Repeating the same spell is the most expensive habit.** +2 DC and +1 MF per repeat, stacking. This
is what stops a Sorcerer with one good spell from being strictly better than a Wizard with ten.

**The one hole I know about.** At levels 1 and 3 the fatigue number runs high, because with an RMax of
1 or 2 every spell you own is High rank and there is no Mid or Low to retreat to. The only unloading
tool at those levels is the 2-action cantrip. My own view is that a four round level 1 fight never
gets bad enough to matter, but I don't have play at level 1 to prove that, and a soft cap of 8 for
levels 1-4 would be an easy fix if it bites you. If you run low levels and it feels wrong, that is
the dial to turn.

## 22. GM advice

Don't try to pre-solve everything; use section 19 and keep playing. When converting, ask what the
option did in the slot system (more uses, more flexibility, more safety, recovery) and match that.
Let daily-use resources be strong. Don't stack extra punishments on top of fatigue unless you want a
specific horror beat.

Watch the red zone: if somebody lives at MF 8-10 and feels useless, push them toward cantrips, Low
rank, focus spells and their class safeguards. If nobody ever crosses MF 3, your fights are short or
nobody is ever tempted.

Say the number out loud. Everyone should know the caster's MF. Tension is only dramatic if you can
see it. A paper token, a tracker, the macro's chat card, anything.

One scope limit worth saying out loud. If a group plays one big fight per day, this system is the weaker
option, and that is not a bug to fix. Plain slots hand the whole day's power to the caster at once with no
chance of failure in the way, and nothing here pays them back for that. What this version buys is staying
useful across a long day of rooms and scenes, so it only pays off when that day exists. Say it to the table
before you commit a campaign to it.

## 23. Variants

**No hard cap.** Let MF pass 10. The DC keeps climbing and failure spirals become real. Good for a
horror or survival game, bad for a casual one.

**Softer crit failure.** High +4, Mid +3, Low +2. Use it if the standard numbers are steeper than
your table can absorb.

**Harsher Vital Overload.** Drained +3 instead of +2, if you want the last resort to feel like one.
I tested +3 and it made people refuse to use it, which defeats its purpose, so default is +2.

**Combat-only fatigue.** Remove the outside-combat table and every spell rolls. More dice, more
tension, slower out of combat.

**No Refocus.** The fatigue benefit comes off the activity, which then does only what the game says it
does, and fatigue accumulates across the day. Try it once before adopting it: everyone ends up living in
Low rank and cantrips.
