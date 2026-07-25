# Up and Back — Design

> **Status:** Draft. This document currently covers the **game logic** only.
> UI, networking, and persistence are deliberately out of scope for this pass.
>
> The rules below are **settled** for the standard deck (walked and confirmed). Items
> that depend on features not yet in play (special cards, the Rook deck) are called out
> as **Deferred**.

## Overview

"Up and Back" is a trick-taking, bid-based card game. Play proceeds through a series
of rounds. The number of cards dealt each round climbs from 1 up to a peak, then
descends back down to 1 (hence "up and back"). Each round, players bid how many tricks
they expect to win, then play out the hand; scores reward hitting the bid exactly.

The engine is designed to support multiple deck types (standard 52-card deck first, a
Rook deck later). The rules below assume a **standard deck** unless noted.

---

## 1. Cards & Deck Abstraction

The engine never hard-codes "52 cards" or "four suits." A deck is described by a
**deck definition** that the rest of the engine consumes through a small interface.

### Card model

```
Card = {
  suit: SuitId,        // e.g. "H" | "D" | "C" | "S"
  rank: number,        // numeric rank used for ordering (see below)
  id: string,          // stable unique key, e.g. "10H", "AS"
  special?: boolean,   // true for cards outside the normal suit/rank system (Joker, Rook bird)
}
```

### Deck definition interface

```
DeckDefinition = {
  name: string,
  suits(): SuitId[],
  cards(): Card[],                              // full deck, unshuffled
  // Compare two cards within the context of a trick.
  // Returns >0 if a beats b, <0 if b beats a, 0 if incomparable (neither can win over the other).
  compareInTrick(a, b, ledSuit, trumpSuit): number,
}
```

Keeping trick-comparison inside the deck definition is what lets a Rook deck (with its
bird card and color "suits") drop in later without touching the round/bidding/scoring
engine.

### Standard-deck specifics (defaults)

- **Suits:** Hearts (H), Diamonds (D), Clubs (C), Spades (S). Suits have **no inherent
  rank** — only trump and the led suit matter for winning a trick.
- **Rank order:** 2 (low) → 10 → J → Q → K → **A (high)**.
- **Special cards:** none. Jokers are **excluded**. (The `special` slot exists now so the
  Rook deck's bird card fits later without a model change.)
- Deck size: 52.

**[DECIDE]** Confirm Ace-high and no Jokers.

---

## 2. Round Structure ("Up and Back")

- **Players:** 3–7. (Min 3 keeps trick-taking meaningful; max is bounded by deck size at
  the peak — see below.)
- **Peak (max cards per hand):** `floor((deckSize - 1) / players)`. The `- 1` reserves a
  card to flip for trump every round, including the peak, so there is never a forced
  no-trump round.
  - Example (standard deck, 4 players): `floor(51 / 4) = 12` cards at the peak.
- **Progression:** round 1 deals 1 card, round 2 deals 2, … up to the peak. The **peak
  hand is played twice** (two consecutive rounds at the peak size), then hand size
  descends back down to 1.
  - 4 players → hand sizes: `1,2,3,…,11,12,12,11,…,2,1` (24 rounds total).
- **Dealer:** rotates one seat clockwise each round (including between the two peak
  rounds).

---

## 3. Dealing & Trump

1. Shuffle the full deck.
2. Deal `roundNumber` cards to each player, one at a time, clockwise starting left of the
   dealer.
3. **Trump:** flip the top card of the remaining stock. Its suit is trump for the round.
   The flipped card is not part of anyone's hand.
4. Because the peak is `floor((deckSize - 1) / players)`, there is always at least one
   card left to flip. **No no-trump rounds.**

> **Deferred:** special handling when the flipped trump is a *special* card (a Joker or
> the Rook bird) — e.g. "highest trump" or "no trump this round." Not relevant for the
> standard deck (no special cards); revisit when adding the Rook deck.

---

## 4. Bidding

- **Range:** each player bids an integer from `0` to `cardsThisRound`.
- **Order:** sequential, clockwise, starting with the player left of the dealer; the
  **dealer bids last**.
- **Visibility:** bids are public as they are made; later bidders see earlier bids.
- **Hook rule ("screw the dealer"): DISABLED.** Any bid in range is legal for every
  player, including the dealer. The sum of bids may equal, exceed, or fall short of the
  trick count — so it's possible for every player to make their bid, or for none to.

---

## 5. Trick Play

- **Lead:** the player left of the dealer leads the first trick. Thereafter, the **winner
  of a trick leads** the next one.
- **Following suit:** players must follow the led suit if able. If void in the led suit,
  they may play any card (including trump).
- **Winning a trick:** the highest trump wins; if no trump was played, the highest card
  of the **led** suit wins. (Off-suit, non-trump cards cannot win.)
- A round has `cardsThisRound` tricks; when hands are empty the round ends and scoring
  runs.

---

## 6. Scoring

Applied at the end of each round, accumulated across the game.

- **Made bid exactly:** `10 + bid` points. (So bidding and making 3 scores 13.)
- **Missed bid (over or under):** `0` points for the round. Scores never decrease.
- **Successful zero bid:** scores `10` (i.e. `10 + 0`), following the formula above with
  no special-case bonus.
- **Game winner:** highest cumulative score after the final round.
- **Ties:** all players tied at the top share the win (no tiebreaker).

---

## 7. State Machine & Validation

### Phases

```
lobby → dealing → bidding → playing → round-scoring → (next round | game-over)
```

- **lobby:** players join; game not yet started.
- **dealing:** deck shuffled, hands dealt, trump flipped. (Automatic transition.)
- **bidding:** collect one bid per player in order (dealer last).
- **playing:** collect one card per player per trick until hands are empty.
- **round-scoring:** compute round scores, advance dealer, choose next hand size or end.
- **game-over:** final scores; declare winner(s).

### Authoritative state (per game)

- player list + seating order
- current round number and hand size, and up/down direction
- dealer index
- trump suit
- each player's hand (server-authoritative; never sent to other players)
- each player's bid for the round
- current trick: cards played + whose turn it is
- completed tricks won, per player, this round
- cumulative scores

### Validation rules (reject illegal actions)

- Acting out of turn.
- Bidding outside `0…cardsThisRound`.
- Playing a card not in hand.
- Failing to follow the led suit while holding a card of that suit (revoke).
- Any action in the wrong phase.

---

## 8. Edge Cases & Open Items

- **Final-score ties:** all top-scoring players share the win (no tiebreaker).
- **Player leaves mid-game:** treated as a networking/session concern, **out of scope for
  the game logic** for now. The engine will assume a fixed set of players from deal to
  game-over.
- **Rook deck support:** deferred. The deck abstraction (§1) is the seam that will absorb
  it — bird card via the `special` slot, colors as suits, and Rook-specific
  `compareInTrick`.

---

## Settled Decisions (summary)

| # | Area | Decision |
|---|------|----------|
| §1 | Card ranking | Ace-high; no Jokers; suits have no inherent rank |
| §2 | Players | 3–7 |
| §2 | Peak | `floor((deckSize−1)/players)`; a trump card is reserved every round |
| §2 | Peak repeat | Peak hand played **twice** |
| §4 | Hook rule | **Disabled** — any in-range bid is legal |
| §5 | Trick play | Must follow suit; trump only when void; highest trump else highest led suit wins |
| §6 | Scoring | Exact bid → `10 + bid`; miss → `0`; zero-bid follows the formula |
| §6 | Winner / ties | Highest cumulative score; ties share the win |

## Deferred (revisit with special cards / Rook deck)

- §3 — Behavior when the flipped trump is a special card (Joker / Rook bird).
- §1/§8 — Rook deck definition (colors as suits, bird card, `compareInTrick`).
