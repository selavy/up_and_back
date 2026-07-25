/**
 * Core data model for the "Up and Back" game engine.
 *
 * These types are the in-memory model described in DESIGN.md — §1 (cards & deck
 * abstraction) and §7 (state machine & validation). They are pure type
 * declarations with no runtime dependencies, so they are safe to import from
 * anywhere (server engine, API routes, client views).
 *
 * Persistence is a separate concern (out of scope for this pass). The current
 * SQLite storage keeps cards as strings like "10H" / "AS"; that string is exactly
 * `Card.id`, so serializing to/from the existing schema is a straight `card.id`
 * mapping.
 */

// ───────────────────────────────────────────────────────────────────────────
// §1 — Cards & deck abstraction
// ───────────────────────────────────────────────────────────────────────────

/**
 * Suit identifier. For the standard deck: "H" | "D" | "C" | "S". Kept as a
 * widened string so alternate decks (e.g. Rook colors) can define their own.
 */
export type SuitId = string;

/** A single card. `id` is the stable, human-readable key (e.g. "10H", "AS"). */
export interface Card {
  /** Suit identifier, e.g. "H" | "D" | "C" | "S". */
  suit: SuitId;
  /** Numeric rank used for ordering within a suit; higher beats lower. */
  rank: number;
  /** Stable unique key, e.g. "10H", "AS". Matches the DB string format. */
  id: string;
  /**
   * True for cards outside the normal suit/rank system (Joker, Rook bird).
   * Unused by the standard deck; reserved so special cards fit without a model
   * change. See DESIGN.md §1 / §3 (deferred).
   */
  special?: boolean;
}

/**
 * Describes a deck and how its cards compare inside a trick. Keeping
 * trick-comparison here is the seam that lets a Rook deck drop in later without
 * touching the round/bidding/scoring engine (DESIGN.md §1).
 */
export interface DeckDefinition {
  /** Human-readable name, e.g. "standard-52". */
  readonly name: string;
  /** All suit identifiers in this deck. */
  suits(): SuitId[];
  /** The full deck, unshuffled. */
  cards(): Card[];
  /**
   * Compare two cards within the context of a trick.
   *  - returns  >0 if `a` beats `b`
   *  - returns  <0 if `b` beats `a`
   *  - returns   0 if neither can win over the other (both off-suit non-trump)
   *
   * `ledSuit` is the suit of the first card played in the trick. `trumpSuit` is
   * the round's trump, or null if a no-trump round is ever enabled (the standard
   * deck never produces one — DESIGN.md §3).
   */
  compareInTrick(
    a: Card,
    b: Card,
    ledSuit: SuitId,
    trumpSuit: SuitId | null,
  ): number;
}

// ───────────────────────────────────────────────────────────────────────────
// §7 — Players, phases, and round direction
// ───────────────────────────────────────────────────────────────────────────

/** Stable identifier for a player. */
export type PlayerId = string;

/** A seated player. Seat order is clockwise; index 0 is the first seat. */
export interface Player {
  id: PlayerId;
  /** Display name. Currently unique across the table in the existing schema. */
  name: string;
  /** 0-based seat index in clockwise play order. */
  seat: number;
}

/** Lifecycle phases of a game (DESIGN.md §7). */
export type GamePhase =
  | "lobby" // players joining; not yet started
  | "dealing" // deck shuffled, hands dealt, trump flipped (auto-transition)
  | "bidding" // collecting one bid per player, dealer last
  | "playing" // playing tricks until hands are empty
  | "round-scoring" // computing round scores, advancing dealer
  | "game-over"; // final scores; winner(s) declared

/** Whether hand sizes are still climbing to the peak or descending from it. */
export type RoundDirection = "up" | "down";

// ───────────────────────────────────────────────────────────────────────────
// §5 / §7 — Tricks
// ───────────────────────────────────────────────────────────────────────────

/** One card played into a trick, tagged with who played it. */
export interface PlayedCard {
  playerId: PlayerId;
  card: Card;
}

/** A single trick, in progress or complete. */
export interface Trick {
  /** Cards played so far, in play order. The first entry is the lead. */
  plays: PlayedCard[];
  /** Suit led (suit of the first card played), or null before the lead. */
  ledSuit: SuitId | null;
  /** Whose turn it is to play into this trick, or null once complete. */
  turn: PlayerId | null;
  /** Winner once complete; null while in progress. */
  winner: PlayerId | null;
}

// ───────────────────────────────────────────────────────────────────────────
// §7 — Authoritative state
// ───────────────────────────────────────────────────────────────────────────

/**
 * State for the round currently in play. Recreated each deal.
 *
 * `hands` is server-authoritative and must never be sent whole to clients — each
 * client sees only its own hand (see `PlayerView`). DESIGN.md §7.
 */
export interface RoundState {
  /** 1-based round number across the whole game. */
  number: number;
  /** Cards dealt to each player this round == number of tricks available. */
  handSize: number;
  /** Whether hand sizes are climbing or descending (peak is played twice). */
  direction: RoundDirection;
  /** Trump suit for the round; null only if no-trump rounds are ever enabled. */
  trumpSuit: SuitId | null;
  /** The flipped trump card (informational); its suit sets `trumpSuit`. */
  trumpCard: Card | null;
  /** Each player's current hand. Server-authoritative; never broadcast whole. */
  hands: Record<PlayerId, Card[]>;
  /** Each player's bid this round; a player's key is absent until they bid. */
  bids: Record<PlayerId, number>;
  /** Tricks won so far this round, per player. */
  tricksWon: Record<PlayerId, number>;
  /** The trick currently in progress, or null between tricks / phases. */
  currentTrick: Trick | null;
  /** Player who leads the current/next trick. */
  leader: PlayerId | null;
}

/** Full, server-side game state (DESIGN.md §7). */
export interface GameState {
  phase: GamePhase;
  /** Players in seating order (array index == seat, clockwise). */
  players: Player[];
  /** Seat index of the current dealer; rotates one seat clockwise each round. */
  dealerIndex: number;
  /**
   * Deck in use. This is configuration rather than serialized state — a
   * persistence layer stores it by `deck.name` and rehydrates the definition.
   */
  deck: DeckDefinition;
  /** Largest hand size for this game: floor((deckSize - 1) / players). */
  peakHandSize: number;
  /** Current round; null while in `lobby` before the first deal. */
  round: RoundState | null;
  /** Cumulative scores across the game, per player. */
  scores: Record<PlayerId, number>;
}

/**
 * The redacted view of the game sent to a single client. Identical to
 * `GameState` except the caller sees only their own hand, satisfying the
 * "hands never sent to other players" requirement (DESIGN.md §7). Other players'
 * hands are represented by their card counts.
 */
export interface PlayerView {
  self: PlayerId;
  phase: GamePhase;
  players: Player[];
  dealerIndex: number;
  deckName: string;
  peakHandSize: number;
  round: {
    number: number;
    handSize: number;
    direction: RoundDirection;
    trumpSuit: SuitId | null;
    trumpCard: Card | null;
    /** Only this player's hand is revealed. */
    hand: Card[];
    /** Number of cards remaining in every player's hand, keyed by id. */
    handCounts: Record<PlayerId, number>;
    bids: Record<PlayerId, number>;
    tricksWon: Record<PlayerId, number>;
    currentTrick: Trick | null;
    leader: PlayerId | null;
  } | null;
  scores: Record<PlayerId, number>;
}

// ───────────────────────────────────────────────────────────────────────────
// §7 — Actions & validation
// ───────────────────────────────────────────────────────────────────────────

/** A request from a player/host to mutate game state. */
export type GameAction =
  | { type: "join"; name: string }
  | { type: "start" }
  | { type: "bid"; playerId: PlayerId; bid: number }
  | { type: "play"; playerId: PlayerId; cardId: string };

/**
 * Reasons an action can be rejected, mapping 1:1 to the validation rules in
 * DESIGN.md §7. (No hook-rule error: the hook rule is disabled.)
 */
export type ValidationError =
  | "wrong-phase" // action attempted in the wrong phase
  | "not-your-turn" // acting out of turn
  | "bid-out-of-range" // bid not in 0…handSize
  | "card-not-in-hand" // playing a card the player doesn't hold
  | "must-follow-suit" // holding the led suit but playing off it (revoke)
  | "unknown-player" // action references a player not in the game
  | "game-full" // joining after the game has started
  | "duplicate-bid"; // bidding when the player has already bid this round

/** Result of validating an action before it is applied. */
export type ValidationResult =
  | { ok: true }
  | { ok: false; error: ValidationError; message: string };
