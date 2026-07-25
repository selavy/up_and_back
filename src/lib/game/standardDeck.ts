/**
 * The standard 52-card deck definition (DESIGN.md §1).
 *
 *  - Suits: Hearts (H), Diamonds (D), Clubs (C), Spades (S), with no inherent
 *    rank — only trump and the led suit decide a trick.
 *  - Ranks: 2 (low) → 10 → J → Q → K → A (high).
 *  - No special cards (Jokers excluded).
 *
 * Card `id`s use the same string format as the existing storage layer: rank
 * label followed by suit letter, e.g. "2H", "10S", "AS", "KD".
 */

import type { Card, DeckDefinition, SuitId } from "./types";

/** Suit letters. Order is arbitrary — suits have no inherent rank. */
export const STANDARD_SUITS: readonly SuitId[] = ["H", "D", "C", "S"];

/**
 * Rank labels paired with their ordering value. Ace is high (14). The label is
 * what appears in a card `id`; the value is what `Card.rank` carries.
 */
export const STANDARD_RANKS: readonly { label: string; value: number }[] = [
  { label: "2", value: 2 },
  { label: "3", value: 3 },
  { label: "4", value: 4 },
  { label: "5", value: 5 },
  { label: "6", value: 6 },
  { label: "7", value: 7 },
  { label: "8", value: 8 },
  { label: "9", value: 9 },
  { label: "10", value: 10 },
  { label: "J", value: 11 },
  { label: "Q", value: 12 },
  { label: "K", value: 13 },
  { label: "A", value: 14 },
];

/**
 * Trick "category" of a card, higher wins: trump (2) beats led-suit (1) beats
 * off-suit (0). Off-suit, non-trump cards cannot win a trick.
 */
function trickCategory(
  card: Card,
  ledSuit: SuitId,
  trumpSuit: SuitId | null,
): number {
  if (trumpSuit !== null && card.suit === trumpSuit) return 2;
  if (card.suit === ledSuit) return 1;
  return 0;
}

export function createStandardDeck(): DeckDefinition {
  return {
    name: "standard-52",

    suits() {
      return [...STANDARD_SUITS];
    },

    cards() {
      const deck: Card[] = [];
      for (const suit of STANDARD_SUITS) {
        for (const { label, value } of STANDARD_RANKS) {
          deck.push({ suit, rank: value, id: `${label}${suit}` });
        }
      }
      return deck;
    },

    compareInTrick(a, b, ledSuit, trumpSuit) {
      const catA = trickCategory(a, ledSuit, trumpSuit);
      const catB = trickCategory(b, ledSuit, trumpSuit);

      // Both off-suit and non-trump: neither can win the trick.
      if (catA === 0 && catB === 0) return 0;

      // Different categories: the higher category (trump > led > off) wins.
      if (catA !== catB) return catA - catB;

      // Same category (both trump, or both led suit): higher rank wins.
      return a.rank - b.rank;
    },
  };
}

/** Shared singleton for the standard deck. */
export const standardDeck: DeckDefinition = createStandardDeck();
