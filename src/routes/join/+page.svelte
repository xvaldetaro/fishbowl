<script lang="ts">
	import { page } from '$app/stores';
	import { createTemporaryClient } from '$lib/supabase';
	import type { SupabaseClient } from '@supabase/supabase-js';

	const params = $derived($page.url.searchParams);
	const lobbyId = $derived(params.get('lobby') || '');
	const supabaseUrl = $derived(params.get('url') || '');
	const supabaseKey = $derived(params.get('key') || '');

	let playerName = $state('');
	let phrases = $state<string[]>([]);
	let loading = $state(true);
	let submitting = $state(false);
	let submitted = $state(false);
	let error = $state('');
	let phrasesPerPlayer = $state(3);

	// Client created once and cached
	let supabase: SupabaseClient | null = null;
	let initialized = false;

	$effect(() => {
		// Read reactive deps
		const url = supabaseUrl;
		const key = supabaseKey;
		const lobby = lobbyId;

		// Only initialize once
		if (initialized) return;
		initialized = true;

		if (url && key && lobby) {
			supabase = createTemporaryClient(url, key);
			loadLobby(lobby);
		} else {
			loading = false;
			error = 'Invalid join link (missing credentials)';
		}
	});

	async function loadLobby(lobby: string) {
		if (!supabase) return;
		loading = true;
		try {
			const { data, error: fetchError } = await supabase
				.from('lobbies')
				.select('*')
				.eq('id', lobby)
				.single();

			if (fetchError) throw fetchError;

			phrasesPerPlayer = data.config_phrases_per_player;
			phrases = Array(phrasesPerPlayer).fill('');
		} catch (e) {
			error = 'Lobby not found';
			console.error(e);
		} finally {
			loading = false;
		}
	}

	async function handleSubmit() {
		if (!supabase || !playerName.trim() || phrases.some((p) => !p.trim())) return;
		submitting = true;
		error = '';
		try {
			const { error: submitError } = await supabase
				.from('submissions')
				.insert({
					lobby_id: lobbyId,
					player_name: playerName.trim(),
					phrases: phrases.map((p) => p.trim())
				});

			if (submitError) throw submitError;
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
	<h1>Join Game</h1>

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
