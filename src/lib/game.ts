import { writable, derived } from 'svelte/store';
import type { GameState, Player, LobbyConfig, Segment } from './types';

function shuffle<T>(array: T[]): T[] {
	const arr = [...array];
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}

function createGameStore() {
	const state = writable<GameState | null>(null);

	function initGame(
		lobbyId: string,
		config: LobbyConfig,
		teamNames: [string, string],
		players: Player[]
	) {
		const allPhrases = players.flatMap((p) => p.phrases);
		state.set({
			lobbyId,
			config,
			teamNames,
			players,
			scores: [0, 0],
			segment: 0,
			currentTeam: 0,
			currentPlayerIndex: [0, 0],
			phase: 'preTurn',
			remainingPhrases: shuffle(allPhrases),
			currentPhrase: null,
			guessedThisTurn: [],
			skippedThisTurn: [],
			timeLeft: config.turnTime
		});
	}

	const currentPlayer = derived(state, ($state) => {
		if (!$state) return null;
		const teamPlayers = $state.players.filter((p) => p.team === $state.currentTeam);
		if (teamPlayers.length === 0) return null;
		return teamPlayers[$state.currentPlayerIndex[$state.currentTeam] % teamPlayers.length];
	});

	function startTurn() {
		state.update((s) => {
			if (!s) return s;
			const remainingPhrases = [...s.remainingPhrases];
			const currentPhrase = remainingPhrases.length > 0 ? remainingPhrases.shift()! : null;
			return {
				...s,
				phase: 'turn' as const,
				timeLeft: s.config.turnTime,
				guessedThisTurn: [],
				skippedThisTurn: [],
				currentPhrase,
				remainingPhrases
			};
		});
	}

	function guessed() {
		state.update((s) => {
			if (!s || !s.currentPhrase) return s;
			const guessedThisTurn = [...s.guessedThisTurn, s.currentPhrase];
			if (s.remainingPhrases.length === 0) {
				return {
					...s,
					guessedThisTurn,
					currentPhrase: null,
					phase: 'postTurn' as const
				};
			}
			const remainingPhrases = [...s.remainingPhrases];
			const currentPhrase = remainingPhrases.shift()!;
			return {
				...s,
				guessedThisTurn,
				currentPhrase,
				remainingPhrases
			};
		});
	}

	function skip() {
		state.update((s) => {
			if (!s || !s.currentPhrase) return s;
			const skippedThisTurn = [...s.skippedThisTurn, s.currentPhrase];
			const remainingPhrases = [...s.remainingPhrases, s.currentPhrase];
			const currentPhrase = remainingPhrases.shift()!;
			return {
				...s,
				skippedThisTurn,
				currentPhrase,
				remainingPhrases
			};
		});
	}

	function endTurn() {
		state.update((s) => {
			if (!s) return s;
			const remainingPhrases = s.currentPhrase
				? [s.currentPhrase, ...s.remainingPhrases]
				: [...s.remainingPhrases];
			return {
				...s,
				remainingPhrases,
				currentPhrase: null,
				phase: 'postTurn' as const
			};
		});
	}

	function confirmTurn(confirmedGuesses: string[]) {
		state.update((s) => {
			if (!s) return s;
			const scores: [number, number] = [...s.scores] as [number, number];
			scores[s.currentTeam] += confirmedGuesses.length;

			const unconfirmed = s.guessedThisTurn.filter((g) => !confirmedGuesses.includes(g));
			const remainingPhrases = [...unconfirmed, ...s.remainingPhrases];

			if (remainingPhrases.length === 0) {
				return {
					...s,
					scores,
					remainingPhrases,
					phase: 'segmentEnd' as const,
					guessedThisTurn: [],
					skippedThisTurn: []
				};
			}

			const currentPlayerIndex: [number, number] = [...s.currentPlayerIndex] as [number, number];
			currentPlayerIndex[s.currentTeam]++;
			return {
				...s,
				scores,
				remainingPhrases,
				currentPlayerIndex,
				currentTeam: s.currentTeam === 0 ? 1 : 0,
				phase: 'preTurn' as const,
				guessedThisTurn: [],
				skippedThisTurn: []
			};
		});
	}

	function skipTurn() {
		state.update((s) => {
			if (!s) return s;
			const currentPlayerIndex: [number, number] = [...s.currentPlayerIndex] as [number, number];
			currentPlayerIndex[s.currentTeam]++;
			return {
				...s,
				currentPlayerIndex,
				currentTeam: s.currentTeam === 0 ? 1 : 0
			};
		});
	}

	function nextSegment() {
		state.update((s) => {
			if (!s || s.segment >= 2) return s;
			const allPhrases = s.players.flatMap((p) => p.phrases);
			return {
				...s,
				segment: (s.segment + 1) as Segment,
				remainingPhrases: shuffle(allPhrases),
				phase: 'preTurn' as const
			};
		});
	}

	function tick() {
		state.update((s) => {
			if (!s || s.phase !== 'turn') return s;
			const timeLeft = s.timeLeft - 1;
			if (timeLeft <= 0) {
				const remainingPhrases = s.currentPhrase
					? [s.currentPhrase, ...s.remainingPhrases]
					: [...s.remainingPhrases];
				return {
					...s,
					timeLeft: 0,
					remainingPhrases,
					currentPhrase: null,
					phase: 'postTurn' as const
				};
			}
			return { ...s, timeLeft };
		});
	}

	function reset() {
		state.set(null);
	}

	return {
		subscribe: state.subscribe,
		currentPlayer,
		initGame,
		startTurn,
		guessed,
		skip,
		endTurn,
		confirmTurn,
		skipTurn,
		nextSegment,
		tick,
		reset
	};
}

export const game = createGameStore();
