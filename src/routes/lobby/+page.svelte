<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { getLobby, getSubmissions, getSupabase, getCredentials } from '$lib/supabase';
	import { game } from '$lib/game';
	import type { Player } from '$lib/types';

	const params = $derived($page.url.searchParams);
	const lobbyId = $derived(params.get('id') || '');
	const isOffline = $derived(params.get('offline') === '1');
	const turnTime = $derived(Number(params.get('turnTime')) || 60);
	const phrasesPerPlayer = $derived(Number(params.get('phrases')) || 3);

	let teamNames = $state<[string, string]>(['Team A', 'Team B']);
	let players = $state<Player[]>([]);
	let showAddPlayer = $state(false);
	let showStartDialog = $state(false);
	let loading = $state(false);

	// For add player form
	let newPlayerName = $state('');
	let newPhrases = $state<string[]>([]);

	let config = $state({ turnTime: 60, phrasesPerPlayer: 3 });

	const supabase = $derived(getSupabase());
	const isOnline = $derived(!isOffline && !!supabase);

	$effect(() => {
		if (isOffline) {
			config = { turnTime, phrasesPerPlayer };
			newPhrases = Array(phrasesPerPlayer).fill('');
		} else {
			loadLobbyConfig();
		}
	});

	async function loadLobbyConfig() {
		if (!supabase || !lobbyId) return;
		try {
			const lobby = await getLobby(lobbyId);
			config = { turnTime: lobby.turnTime, phrasesPerPlayer: lobby.phrasesPerPlayer };
			newPhrases = Array(lobby.phrasesPerPlayer).fill('');
		} catch (e) {
			console.error('Failed to load lobby', e);
		}
	}

	async function refreshPlayers() {
		if (!supabase || !lobbyId || isOffline) return;
		loading = true;
		try {
			const submissions = await getSubmissions(lobbyId);
			const remoteNames = new Set(submissions.map((s) => s.player_name));

			// Keep local players not in Supabase
			const localOnly = players.filter((p) => !remoteNames.has(p.name));

			// Add/update from Supabase (preserve team if player existed)
			const fromSupabase = submissions.map((s) => {
				const existing = players.find((p) => p.name === s.player_name);
				return {
					name: s.player_name,
					phrases: s.phrases,
					team: existing?.team ?? 0
				};
			});

			players = [...localOnly, ...fromSupabase];
		} catch (e) {
			console.error('Failed to refresh', e);
		} finally {
			loading = false;
		}
	}

	function addLocalPlayer() {
		if (!newPlayerName.trim() || newPhrases.some((p) => !p.trim())) return;
		players = [
			...players,
			{
				name: newPlayerName.trim(),
				phrases: newPhrases.map((p) => p.trim()),
				team: 0
			}
		];
		newPlayerName = '';
		newPhrases = Array(config.phrasesPerPlayer).fill('');
		showAddPlayer = false;
	}

	function randomizeTeams() {
		const shuffled = [...players].sort(() => Math.random() - 0.5);
		players = shuffled.map((p, i) => ({
			...p,
			team: i % 2
		}));
	}

	function setPlayerTeam(index: number, team: number) {
		players[index].team = team;
	}

	function canStartGame(): boolean {
		const team0 = players.filter((p) => p.team === 0);
		const team1 = players.filter((p) => p.team === 1);
		return team0.length > 0 && team1.length > 0;
	}

	function startGame() {
		game.initGame(lobbyId, config, teamNames, players);
		goto(`${base}/game`);
	}

	// Build share URL with embedded credentials
	const shareUrl = $derived.by(() => {
		if (typeof window === 'undefined') return '';
		const creds = getCredentials();
		if (!creds) return '';
		const params = new URLSearchParams({
			lobby: lobbyId,
			url: creds.url,
			key: creds.anonKey
		});
		return `${window.location.origin}${base}/join?${params.toString()}`;
	});

	let copied = $state(false);

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(shareUrl);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// Fallback: select the text in the link box
			const linkBox = document.querySelector('.link-box') as HTMLElement;
			if (linkBox) {
				const range = document.createRange();
				range.selectNodeContents(linkBox);
				const selection = window.getSelection();
				selection?.removeAllRanges();
				selection?.addRange(range);
			}
		}
	}
</script>

<div class="page">
	<h1>Lobby</h1>

	{#if isOnline}
		<div class="card">
			<h2>Share Link</h2>
			<div class="link-box">{shareUrl}</div>
			<button class="secondary" onclick={copyLink}>{copied ? 'Copied!' : 'Copy Link'}</button>
		</div>
	{/if}

	<div class="card">
		<h2>Teams</h2>
		<label>
			Team 1 Name
			<input type="text" bind:value={teamNames[0]} />
		</label>
		<label>
			Team 2 Name
			<input type="text" bind:value={teamNames[1]} />
		</label>
	</div>

	<div class="card">
		<h2>Players ({players.length})</h2>
		{#if players.length === 0}
			<p class="info">No players yet</p>
		{:else}
			<ul class="player-list">
				{#each players as player}
					<li>
						<span>{player.name}</span>
						<span class="info">{player.phrases.length} phrases</span>
					</li>
				{/each}
			</ul>
		{/if}

		<div class="btn-row" style="margin-top: 0.5rem">
			<button class="secondary" onclick={() => (showAddPlayer = true)}>Add Player</button>
			{#if isOnline}
				<button class="secondary" onclick={refreshPlayers} disabled={loading}>
					{loading ? '...' : 'Refresh'}
				</button>
			{/if}
		</div>
	</div>

	<button
		class="primary"
		onclick={() => (showStartDialog = true)}
		disabled={players.length < 2}
	>
		Start Game
	</button>
</div>

{#if showAddPlayer}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal-overlay" onclick={() => (showAddPlayer = false)} role="presentation">
		<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
			<h2>Add Player</h2>
			<label>
				Name
				<input type="text" bind:value={newPlayerName} />
			</label>
			{#each newPhrases as _, i}
				<label>
					Phrase {i + 1}
					<input type="text" bind:value={newPhrases[i]} />
				</label>
			{/each}
			<div class="btn-row">
				<button class="secondary" onclick={() => (showAddPlayer = false)}>Cancel</button>
				<button
					class="primary"
					onclick={addLocalPlayer}
					disabled={!newPlayerName.trim() || newPhrases.some((p) => !p.trim())}
				>
					Add
				</button>
			</div>
		</div>
	</div>
{/if}

{#if showStartDialog}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal-overlay" onclick={() => (showStartDialog = false)} role="presentation">
		<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
			<h2>Assign Teams</h2>
			<ul class="player-list">
				{#each players as player, i}
					<li>
						<span>{player.name}</span>
						<select
							value={player.team}
							onchange={(e) => setPlayerTeam(i, Number(e.currentTarget.value))}
						>
							<option value={0}>{teamNames[0]}</option>
							<option value={1}>{teamNames[1]}</option>
						</select>
					</li>
				{/each}
			</ul>
			<button class="secondary" onclick={randomizeTeams} style="margin-bottom: 0.5rem">
				Randomize Teams
			</button>
			<div class="btn-row">
				<button class="secondary" onclick={() => (showStartDialog = false)}>Cancel</button>
				<button class="primary" onclick={startGame} disabled={!canStartGame()}>
					Start Game
				</button>
			</div>
			{#if !canStartGame()}
				<p class="info" style="margin-top: 0.5rem">Each team needs at least 1 player</p>
			{/if}
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		z-index: 100;
	}

	.modal {
		background: var(--surface);
		border-radius: 12px;
		padding: 1.5rem;
		width: 100%;
		max-width: 360px;
		max-height: 80vh;
		overflow-y: auto;
	}

	.modal h2 {
		margin-bottom: 1rem;
	}

	.link-box {
		word-break: break-all;
		font-size: 0.85rem;
		padding: 0.5rem;
		background: var(--bg);
		border-radius: 6px;
		margin-bottom: 0.5rem;
		user-select: all;
	}

	.player-list select {
		width: auto;
		margin: 0;
		padding: 0.25rem 0.5rem;
	}
</style>
