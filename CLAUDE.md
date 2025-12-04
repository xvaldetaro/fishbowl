# Fishbowl - Implementation Context

## Stack
- SvelteKit with static adapter (GitHub Pages deployment)
- Svelte 5 (runes: `$state`, `$derived`, `$effect`)
- Supabase for distributed phrase collection (optional, works offline)
- TypeScript

## File Structure

```
src/
├── lib/
│   ├── game.ts        # Game state store (Svelte writable store)
│   ├── supabase.ts    # Supabase client, createLobby/getLobby/submitPlayer/getSubmissions
│   └── types.ts       # Player, GameState, LobbyConfig, Segment types, SEGMENT_NAMES/INSTRUCTIONS
├── routes/
│   ├── +page.svelte   # Home: create/join lobby, config inputs
│   ├── +layout.svelte # Global CSS import
│   ├── +layout.ts     # prerender=true, ssr=false
│   ├── lobby/+page.svelte  # Main device: team setup, player list, start game dialog
│   ├── join/+page.svelte   # Other players: submit name + phrases to Supabase
│   └── game/+page.svelte   # Game screens: preTurn, turn, postTurn, segmentEnd
├── app.css            # Global styles, CSS variables
└── app.html
```

## Game State (`src/lib/game.ts`)

Svelte writable store with methods:
- `initGame(lobbyId, config, teamNames, players)` - Initialize game state
- `startTurn()` - Begin turn, start drawing phrases
- `guessed()` - Mark current phrase as guessed, draw next
- `skip()` - Skip phrase (goes to back of deck)
- `confirmTurn(confirmedGuesses[])` - End turn, update scores
- `skipTurn()` - Skip player's turn
- `nextSegment()` - Advance to next round
- `tick()` - Decrement timer (called by setInterval)
- `reset()` - Clear game state

Derived store: `game.currentPlayer` - returns current player based on team/index

## Game Flow

1. **Home** (`/`): Set turnTime, phrasesPerPlayer → Create lobby
2. **Lobby** (`/lobby?id=X`): Set team names, add players (manual or via Supabase refresh), assign teams, start
3. **Game** (`/game`): Cycles through phases:
   - `preTurn`: Show current player, scores, remaining phrases, Start/Skip buttons
   - `turn`: Timer countdown, current phrase, Guessed/Skip buttons
   - `postTurn`: Checkbox list to confirm/unconfirm guesses
   - `segmentEnd`: Show scores, next round instructions or final winner

3 segments: Describe → One Word → Charades (indices 0, 1, 2)

## Key Patterns

### Timer in game/+page.svelte
Uses derived stores to prevent effect re-running on every tick:
```ts
const phase = derived(game, ($g) => $g?.phase);
$effect(() => {
  if ($phase === 'turn') {
    timerInterval = setInterval(() => game.tick(), 1000);
    return () => clearInterval(timerInterval);
  }
});
```

### Offline Mode
When Supabase env vars not set, `supabase` export is `null`. Home page falls back to generating local lobby ID with query params for config.

### Modal Pattern (lobby page)
```svelte
{#if showModal}
  <!-- svelte-ignore a11y comments -->
  <div class="modal-overlay" onclick={close}>
    <div class="modal" onclick={e => e.stopPropagation()} role="dialog" tabindex="-1">
```

## Supabase Schema

```sql
lobbies: id (UUID), config_turn_time, config_phrases_per_player
submissions: id, lobby_id (FK), player_name, phrases (JSONB)
```

RLS disabled for simplicity.

## Build

- `npm run dev` - Development
- `npm run build` - Output to `build/`
- Base path configured for `/fishbowl` in production (svelte.config.js)

## CSS Variables

```css
--bg: #1a1a2e; --surface: #16213e; --primary: #e94560;
--secondary: #0f3460; --text: #eee; --team1: #4ade80; --team2: #60a5fa;
```
