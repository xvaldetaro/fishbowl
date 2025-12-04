<script lang="ts">
	import { onDestroy } from 'svelte';
	import { derived } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { game } from '$lib/game';
	import { SEGMENT_NAMES, SEGMENT_INSTRUCTIONS } from '$lib/types';

	let timerInterval: ReturnType<typeof setInterval> | null = null;
	let confirmedGuesses = $state(new Set<string>());
	let animating = $state<'guessed' | 'skipped' | null>(null);

	const currentPlayer = game.currentPlayer;
	const phase = derived(game, ($g) => $g?.phase);
	const guessedThisTurn = derived(game, ($g) => $g?.guessedThisTurn ?? []);

	// Redirect if no game state
	$effect(() => {
		if (!$game) {
			goto(`${base}/`);
		}
	});

	// Manage timer based on phase - only react to phase changes
	$effect(() => {
		if ($phase === 'turn') {
			timerInterval = setInterval(() => game.tick(), 1000);
			return () => {
				if (timerInterval) {
					clearInterval(timerInterval);
					timerInterval = null;
				}
			};
		}
	});

	// Initialize confirmed guesses when entering post-turn
	$effect(() => {
		if ($phase === 'postTurn') {
			confirmedGuesses = new Set($guessedThisTurn);
		}
	});

	// Cleanup on component destroy
	onDestroy(() => {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
	});

	function handleStart() {
		game.startTurn();
	}

	function handleSkipTurn() {
		game.skipTurn();
	}

	function handleGuessed() {
		animating = 'guessed';
		setTimeout(() => {
			game.guessed();
			animating = null;
		}, 250);
	}

	function handleSkip() {
		animating = 'skipped';
		setTimeout(() => {
			game.skip();
			animating = null;
		}, 250);
	}

	function toggleGuess(phrase: string) {
		if (confirmedGuesses.has(phrase)) {
			confirmedGuesses.delete(phrase);
		} else {
			confirmedGuesses.add(phrase);
		}
		confirmedGuesses = confirmedGuesses;
	}

	function handleConfirmTurn() {
		game.confirmTurn([...confirmedGuesses]);
	}

	function handleNextSegment() {
		game.nextSegment();
	}

	function handleEndGame() {
		game.reset();
		goto(`${base}/`);
	}

	function getTimerClass(timeLeft: number): string {
		if (timeLeft <= 5) return 'danger';
		if (timeLeft <= 15) return 'warning';
		return '';
	}

	function handleKeydown(event: KeyboardEvent) {
		if ($phase === 'preTurn' && event.key === 'Enter') {
			event.preventDefault();
			handleStart();
			return;
		}

		if ($phase !== 'turn' || !$game?.currentPhrase) return;

		if (event.key === 'ArrowRight') {
			event.preventDefault();
			handleGuessed();
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			handleSkip();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if $game}
	<div class="page">
		{#if $game.phase === 'preTurn'}
			<div class="segment-badge">{SEGMENT_NAMES[$game.segment]}</div>
			<h1>Get Ready!</h1>

			<div class="current-player">
				<div class="name">{$currentPlayer?.name}</div>
				<div class="info" style="color: {$game.currentTeam === 0 ? 'var(--team1)' : 'var(--team2)'}">
					{$game.teamNames[$game.currentTeam]}
				</div>
			</div>

			<div class="score-display">
				<div class="team">
					<div class="info">{$game.teamNames[0]}</div>
					<div class="score">{$game.scores[0]}</div>
				</div>
				<div class="team">
					<div class="info">{$game.teamNames[1]}</div>
					<div class="score">{$game.scores[1]}</div>
				</div>
			</div>

			<div class="card">
				<p><strong>Round:</strong> {SEGMENT_NAMES[$game.segment]}</p>
				<p class="info" style="margin-top: 0.5rem">{SEGMENT_INSTRUCTIONS[$game.segment]}</p>
				<p style="margin-top: 0.5rem">
					<strong>{$game.remainingPhrases.length}</strong> phrases remaining
				</p>
				{#if $game.carryoverTime}
					<p class="info" style="color: var(--primary)">{$game.carryoverTime} seconds remaining from last round</p>
				{:else}
					<p class="info">{$game.config.turnTime} seconds per turn</p>
				{/if}
			</div>

			<div class="spacer"></div>

			<div class="btn-row">
				<button class="secondary" onclick={handleSkipTurn}>Skip Turn</button>
				<button class="primary" onclick={handleStart}>Start! ↵</button>
			</div>

		{:else if $game.phase === 'turn'}
			{#if animating}
				<div class="flash-overlay {animating}"></div>
			{/if}

			<div class="segment-badge">{SEGMENT_NAMES[$game.segment]}</div>

			<div class="current-player">
				<div class="name">{$currentPlayer?.name}</div>
				<div class="info" style="color: {$game.currentTeam === 0 ? 'var(--team1)' : 'var(--team2)'}">
					{$game.teamNames[$game.currentTeam]}
				</div>
			</div>

			<div class="timer {getTimerClass($game.timeLeft)}">{$game.timeLeft}</div>

			<div class="phrase-container">
				{#if $game.currentPhrase}
					<div class="phrase {animating ? 'flip-out' : ''}">{$game.currentPhrase}</div>
				{:else}
					<div class="phrase info">No more phrases!</div>
				{/if}
			</div>

			<div class="spacer"></div>

			<div class="btn-row">
				<button
					class="secondary {animating === 'skipped' ? 'btn-pop' : ''}"
					onclick={handleSkip}
					disabled={!$game.currentPhrase || animating !== null}
				>
					← Skip
				</button>
				<button
					class="primary {animating === 'guessed' ? 'btn-pop' : ''}"
					onclick={handleGuessed}
					disabled={!$game.currentPhrase || animating !== null}
				>
					Guessed! →
				</button>
			</div>

		{:else if $game.phase === 'postTurn'}
			<h1>Turn Over!</h1>

			<div class="current-player">
				<div class="name">{$currentPlayer?.name}</div>
				<div class="info">scored {confirmedGuesses.size} points</div>
			</div>

			<div class="card">
				<h2>Confirm Guesses</h2>
				{#if $game.guessedThisTurn.length === 0}
					<p class="info">No phrases guessed this turn</p>
				{:else}
					<ul class="checkbox-list">
						{#each $game.guessedThisTurn as phrase}
							<li>
								<input
									type="checkbox"
									checked={confirmedGuesses.has(phrase)}
									onchange={() => toggleGuess(phrase)}
								/>
								<span>{phrase}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="spacer"></div>

			<button class="primary" onclick={handleConfirmTurn}>Confirm</button>

		{:else if $game.phase === 'segmentEnd'}
			<h1>
				{#if $game.segment >= 2}
					Game Over!
				{:else}
					Round Complete!
				{/if}
			</h1>

			<div class="score-display" style="margin: 2rem 0">
				<div class="team">
					<div class="info">{$game.teamNames[0]}</div>
					<div class="score">{$game.scores[0]}</div>
				</div>
				<div class="team">
					<div class="info">{$game.teamNames[1]}</div>
					<div class="score">{$game.scores[1]}</div>
				</div>
			</div>

			{#if $game.segment >= 2}
				<div class="card">
					{#if $game.scores[0] > $game.scores[1]}
						<h2 style="color: var(--team1)">{$game.teamNames[0]} Wins!</h2>
					{:else if $game.scores[1] > $game.scores[0]}
						<h2 style="color: var(--team2)">{$game.teamNames[1]} Wins!</h2>
					{:else}
						<h2>It's a Tie!</h2>
					{/if}
				</div>
				<div class="spacer"></div>
				<button class="primary" onclick={handleEndGame}>Back to Home</button>
			{:else}
				<div class="card">
					<h2>Next: {SEGMENT_NAMES[$game.segment + 1]}</h2>
					<p class="info">{SEGMENT_INSTRUCTIONS[$game.segment + 1]}</p>
				</div>
				<div class="spacer"></div>
				<button class="primary" onclick={handleNextSegment}>Continue</button>
			{/if}
		{/if}
	</div>
{/if}

<style>
	.flash-overlay {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 100;
		animation: flash 250ms ease-out forwards;
	}

	.flash-overlay.guessed {
		background: var(--team1);
	}

	.flash-overlay.skipped {
		background: var(--primary);
	}

	@keyframes flash {
		0% {
			opacity: 0;
		}
		30% {
			opacity: 0.5;
		}
		100% {
			opacity: 0;
		}
	}

	.phrase-container {
		perspective: 600px;
	}

	.phrase.flip-out {
		animation: flipOut 250ms ease-in forwards;
	}

	@keyframes flipOut {
		0% {
			transform: rotateX(0deg);
			opacity: 1;
		}
		100% {
			transform: rotateX(-90deg);
			opacity: 0;
		}
	}

	.btn-pop {
		animation: pop 200ms ease-out;
	}

	@keyframes pop {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.15);
		}
		100% {
			transform: scale(1);
		}
	}
</style>
