<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { createLobby, supabase } from '$lib/supabase';

	let turnTime = $state(60);
	let phrasesPerPlayer = $state(3);
	let joinCode = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleCreateLobby() {
		error = '';
		loading = true;
		try {
			if (supabase) {
				const lobbyId = await createLobby({ turnTime, phrasesPerPlayer });
				goto(`${base}/lobby?id=${lobbyId}`);
			} else {
				// Offline mode - generate a random ID
				const lobbyId = crypto.randomUUID().slice(0, 8);
				goto(`${base}/lobby?id=${lobbyId}&turnTime=${turnTime}&phrases=${phrasesPerPlayer}&offline=1`);
			}
		} catch (e) {
			error = 'Failed to create lobby';
			console.error(e);
		} finally {
			loading = false;
		}
	}

	function handleJoinLobby() {
		if (!joinCode.trim()) return;
		goto(`${base}/join?lobby=${joinCode.trim()}`);
	}
</script>

<div class="page">
	<h1>🐟 Fishbowl</h1>

	<div class="card">
		<h2>Game Settings</h2>
		<label>
			Turn time (seconds)
			<input type="number" bind:value={turnTime} min="30" max="180" />
		</label>
		<label>
			Phrases per player
			<input type="number" bind:value={phrasesPerPlayer} min="1" max="10" />
		</label>
	</div>

	<button class="primary" onclick={handleCreateLobby} disabled={loading}>
		{loading ? 'Creating...' : 'Create Lobby'}
	</button>

	{#if !supabase}
		<p class="info">Running in offline mode (no Supabase configured)</p>
	{/if}

	{#if error}
		<p class="info" style="color: var(--primary)">{error}</p>
	{/if}

	<div class="spacer"></div>

	{#if supabase}
		<div class="card">
			<h2>Join Existing Lobby</h2>
			<label>
				Lobby code
				<input type="text" bind:value={joinCode} placeholder="Enter lobby code" />
			</label>
			<button class="secondary" onclick={handleJoinLobby} disabled={!joinCode.trim()}>
				Join Lobby
			</button>
		</div>
	{/if}
</div>
