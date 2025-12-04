Fishbowl is a three-round party game where teams compete to guess words or phrases written on slips of paper, which are placed in a bowl. Each round uses the same set of papers but with different rules: the first round involves describing the word, the second round uses only a one-word clue, and the final round requires acting out the word without speaking (charades). The team with the highest total score from all three rounds wins.

Generate a Svelte web app for playing fishbowl. The webpage should use a mobile first layout (no need to adjust to wider desktop screens). All the playing will happen from the "main" client, but when we create the game, we should have an option for players to join from their devices to just input their names and their phrases. Then everyone would take turns using the main device. This should make the implementation simpler.

The app should be extremely simple. No auth, no security. The screens:
1. Home:
  - "create lobby" and "join lobby" buttons
  - input fields with configs: Turn time, number of phrases per player
2. Lobby:
  - Input fields: Name of each of the 2 teams
  - button: Add player and phrases
  - List of current players (dynamically updated when adding a player)
  - "Start game" button.
4. Start game Dialog:
  - Player names with combo boxes to select team
  - Button to "randomize teams"
3. Add Player and Phrases:
  - Input fields for player name and each phrase
  - button to confirm
5. Pre Turn screen:
  - Current Player and team name
  - Current score of each team
  - CUrrent segment of the game
  - Current remaining words for this segment of the game (there are 3 segments)
  - Instruction with the countdown time
  - "Start" button
  - "Skip" button
6. Turn screen:
  - Current Player and team name
  - Countdown timer
  - Buttons: "Guessed" and "Skip"
7. Post Turn Screen
  - List of each guessed word with a checkbox (already checked) so players can uncheck for reverting accidental clicks on "Guessed"
  - "Confirm" button to go back to pre turn (segment concluded )
8. Segment concluded (accessed when the turn ends all phrases and we need to go to next segment of end game)
  - Show teams and scores
  - Instructions for next segment, or game ended
  - Confirm button (back to Home if last segment, or to pre-turn if not)

The distributed part of the game is really just one screen with several input fields so the players can put their names and phrases. Then the whole game happens offline in the main client. So the main client can connect to Supabase, get some token or an anon database access and send links to the players. This would allow me to host the page in gh pages and just add a simple login screen to whatever service can create the database.

This is ChatGPTs solution to do that. See if it makes sense to you:

Yeah, you can totally bolt on a “distributed phrase collection” bit without building a whole backend or moving off GitHub Pages. Think of it as:

* **Phase 1 (online)**: everyone opens a simple URL, types their name + phrases → stored in some shared place
* **Phase 2 (offline on main device)**: main device loads that data once → everything else happens locally

Let’s walk through the most realistic options and I’ll tell you which one I’d actually pick for this project.

---

## Key constraints you mentioned

* Host the app on **GitHub Pages** (static).
* No serious **auth** / security (it’s a party game).
* Only **one distributed part**: collecting *players + phrases* remotely.
* Main device can be online just long enough to:

  * Create a “lobby” in some backend
  * Generate a **share link** (with lobby token)
  * Later **pull** all submissions and then run the whole game locally.

So we just need a tiny, almost throwaway backend for one table: `submissions(lobbyId, playerName, phrase1..N, createdAt)`.

---

## Option A – Supabase (my top recommendation)

**Why it fits:**

* Free tier is more than enough.
* Works great from a pure static frontend (GitHub Pages).
* You can use the **public anon key** from the browser, and loosen Row Level Security for this one table since you don’t care about auth.
* You get a Postgres DB, simple REST/JS client, and can keep schema super basic.

**How it would work:**

1. **Set up Supabase project** (once, in their dashboard).
2. Create a table `lobbies` with columns like:

   * `id` (UUID)
   * `created_at`
   * `config_turn_time`
   * `config_phrases_per_player`
3. Create a table `submissions`:

   * `id` (UUID)
   * `lobby_id` (UUID, FK → `lobbies.id`)
   * `player_name` (text)
   * `phrase_1`, `phrase_2`, ..., or just `phrases` as `jsonb`
4. In Supabase auth policies (RLS):

   * Either **disable RLS** for `lobbies` and `submissions`, or
   * Add a silly simple policy: “anyone can insert/select” (since this is not sensitive).
5. In your Svelte app:

   * Add Supabase JS client with your **anon key** and **project URL** (safe for frontend).
   * When main client taps **“Create lobby”**:

     * Create a row in `lobbies`.
     * Grab `lobby.id` and generate a URL like:

       ```text
       https://your-gh-pages-domain/fishbowl/#/join?lobby=abcd-efgh
       ```
   * On the **“Join lobby”** screen:

     * Read `lobby` from the query/hash.
     * User inputs name + phrases.
     * `supabase.from('submissions').insert(...)`.
   * When main client hits **“Start game”**:

     * `select` all `submissions` for that `lobby_id`.
     * Store that in local state (even `localStorage` if you want).
     * From that point on, **no more Supabase** calls needed.

**Pros:**

* Purpose-built for this sort of thing.
* Very simple JS API.
* No server-side code or Cloud Functions.
* You can later expand (real-time updates, etc.) if you want fancier features.

**Cons:**

* You have to set up Supabase & tweak RLS once (minor overhead).

High-level flow:

1. **Main device:**

   * Opens Home → chooses turn time, phrases per player → “Create Lobby”.
   * App calls Supabase: `insert` into `lobbies`, gets `lobbyId`.
   * Shows a “Share Link”:
     `https://your-gh-pages-domain/#/join?lobby=<lobbyId>`

2. **Other players:**

   * Tap the link on their phones.
   * Land on **Join Lobby** screen:

     * See `lobbyId` (maybe also show team names if you later store them).
     * Enter **Name** + N phrases.
     * On submit: `supabase.from('submissions').insert({ lobby_id, player_name, phrases: [...] })`.
     * Show “Thanks! You can now put your phone away.”

3. **Back to main device (Lobby screen):**

   * Poll or use a “Refresh players” button:

     * `select` from `submissions` where `lobby_id = currentLobbyId`.
   * Display the list of players dynamically as they submit.
   * When you’re ready, hit **Start Game**:

     * Load all `submissions`.
     * Build the phrase deck in local state and never talk to Supabase again.

4. **Game screens (main device only):**

   * All the Pre-Turn, Turn, Post-Turn, Segment Finished logic is **fully local**.

---

## Minimal mental model

You can think of it like:

* **Supabase** is just:

  * `createLobby(config) → lobbyId`
  * `submitPlayer(lobbyId, name, phrases)`
  * `getSubmissions(lobbyId) → [{ name, phrases }, ...]`

That’s it. No auth, no complex schema, no server.
