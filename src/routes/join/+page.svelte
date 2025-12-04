<script lang="ts">
	import { page } from '$app/stores';
	import { getLobby, submitPlayer, supabase } from '$lib/supabase';

	const params = $derived($page.url.searchParams);
	const lobbyId = $derived(params.get('lobby') || '');

	let playerName = $state('');
	let phrases = $state<string[]>([]);
	let loading = $state(true);
	let submitting = $state(false);
	let submitted = $state(false);
	let error = $state('');
	let phrasesPerPlayer = $state(3);

	$effect(() => {
		if (lobbyId && supabase) {
			loadLobby();
		} else {
			loading = false;
			if (!supabase) {
				error = 'Supabase not configured';
			}
		}
	});

	async function loadLobby() {
		loading = true;
		try {
			const lobby = await getLobby(lobbyId);
			phrasesPerPlayer = lobby.phrasesPerPlayer;
			phrases = Array(lobby.phrasesPerPlayer).fill('');
		} catch (e) {
			error = 'Lobby not found';
			console.error(e);
		} finally {
			loading = false;
		}
	}

	async function handleSubmit() {
		if (!playerName.trim() || phrases.some((p) => !p.trim())) return;
		submitting = true;
		error = '';
		try {
			await submitPlayer(
				lobbyId,
				playerName.trim(),
				phrases.map((p) => p.trim())
			);
			submitted = true;
		} catch (e) {
			error = 'Failed to submit';
			console.error(e);
		} finally {
			submitting = false;
		}
	}

	function canSubmit(): boolean {
		return playerName.trim().length > 0 && phrases.every((p) => p.trim().length > 0);
	}
</script>

<div class="page">
	<h1>🐟 Join Game</h1>

	{#if loading}
		<p class="info">Loading...</p>
	{:else if error}
		<div class="card">
			<p style="color: var(--primary)">{error}</p>
		</div>
	{:else if submitted}
		<div class="success-msg">
			<h2>You're in!</h2>
			<p>Head to the main device to play.</p>
			<p class="info" style="margin-top: 1rem">You can close this page now.</p>
		</div>
	{:else}
		<div class="card">
			<label>
				Your Name
				<input type="text" bind:value={playerName} placeholder="Enter your name" />
			</label>

			<h2 style="margin-top: 1rem">Your Phrases</h2>
			<p class="info" style="margin-bottom: 0.5rem">
				Enter {phrasesPerPlayer} words or phrases for others to guess
			</p>

			{#each phrases as _, i}
				<label>
					Phrase {i + 1}
					<input type="text" bind:value={phrases[i]} placeholder="Enter a word or phrase" />
				</label>
			{/each}
		</div>

		<button class="primary" onclick={handleSubmit} disabled={!canSubmit() || submitting}>
			{submitting ? 'Submitting...' : 'Join Game'}
		</button>
	{/if}
</div>
