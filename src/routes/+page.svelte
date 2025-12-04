<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { createLobby, getSupabase, getCredentials, setCredentials, clearCredentials } from '$lib/supabase';

	let turnTime = $state(60);
	let phrasesPerPlayer = $state(3);
	let joinCode = $state('');
	let loading = $state(false);
	let error = $state('');

	// Credentials form
	let showCredentialsForm = $state(false);
	let credUrl = $state('');
	let credKey = $state('');

	// Check if configured
	let isConfigured = $state(false);

	$effect(() => {
		isConfigured = !!getCredentials();
	});

	function handleSaveCredentials() {
		if (!credUrl.trim() || !credKey.trim()) return;
		setCredentials(credUrl.trim(), credKey.trim());
		isConfigured = true;
		showCredentialsForm = false;
		credUrl = '';
		credKey = '';
	}

	function handleClearCredentials() {
		clearCredentials();
		isConfigured = false;
	}

	async function handleCreateLobby() {
		error = '';
		loading = true;
		try {
			const supabase = getSupabase();
			if (supabase) {
				const lobbyId = await createLobby({ turnTime, phrasesPerPlayer });
				goto(`${base}/lobby?id=${lobbyId}`);
			} else {
				// Offline mode - generate a random ID (crypto.randomUUID requires secure context)
				const lobbyId = Math.random().toString(36).slice(2, 10);
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
	<h1>Fishbowl</h1>

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

	{#if !isConfigured}
		<p class="info">Running in offline mode (no Supabase configured)</p>
	{/if}

	{#if error}
		<p class="info" style="color: var(--primary)">{error}</p>
	{/if}

	<div class="spacer"></div>

	{#if isConfigured}
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

	<div class="card">
		<h2>Supabase Connection</h2>
		{#if isConfigured}
			<p class="info">Connected</p>
			<button class="secondary" onclick={handleClearCredentials}>Disconnect</button>
		{:else if showCredentialsForm}
			<label>
				Supabase URL
				<input type="text" bind:value={credUrl} placeholder="https://xxx.supabase.co" />
			</label>
			<label>
				Anon Key
				<input type="text" bind:value={credKey} placeholder="eyJ..." />
			</label>
			<div class="btn-row">
				<button class="secondary" onclick={() => (showCredentialsForm = false)}>Cancel</button>
				<button
					class="primary"
					onclick={handleSaveCredentials}
					disabled={!credUrl.trim() || !credKey.trim()}
				>
					Save
				</button>
			</div>
			<a href="{base}/setup" class="setup-link">How do I get these?</a>
		{:else}
			<p class="info">Enable online mode to let players join from their phones</p>
			<button class="secondary" onclick={() => (showCredentialsForm = true)}>
				Configure Supabase
			</button>
		{/if}
	</div>
</div>

<style>
	.setup-link {
		display: block;
		margin-top: 0.75rem;
		color: var(--primary);
		font-size: 0.9rem;
	}
</style>
