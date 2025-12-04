<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { game } from '$lib/game';
	import { onMount } from 'svelte';

	const mockPlayers = [
		{
			name: 'Alice',
			phrases: ['Eiffel Tower', 'Pizza', 'Michael Jackson'],
			team: 0
		},
		{
			name: 'Bob',
			phrases: ['Batman', 'Surfing', 'Mona Lisa'],
			team: 0
		},
		{
			name: 'Charlie',
			phrases: ['Elephant', 'Disco', 'Mount Everest'],
			team: 1
		},
		{
			name: 'Diana',
			phrases: ['Spaghetti', 'Moonwalk', 'Titanic'],
			team: 1
		}
	];

	const config = {
		turnTime: 15, // Short for testing
		phrasesPerPlayer: 3
	};

	onMount(() => {
		game.initGame('debug-lobby', config, ['Red Team', 'Blue Team'], mockPlayers);
		goto(`${base}/game`);
	});
</script>

<div class="page">
	<p>Loading debug game...</p>
</div>
