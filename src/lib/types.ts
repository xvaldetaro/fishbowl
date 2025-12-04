export interface Player {
	name: string;
	phrases: string[];
	team: number; // 0 or 1
}

export interface LobbyConfig {
	turnTime: number;
	phrasesPerPlayer: number;
}

export interface Lobby {
	id: string;
	config: LobbyConfig;
	teamNames: [string, string];
}

export type GamePhase = 'preTurn' | 'turn' | 'postTurn' | 'segmentEnd';
export type Segment = 0 | 1 | 2;

export const SEGMENT_NAMES = ['Describe', 'One Word', 'Charades'] as const;
export const SEGMENT_INSTRUCTIONS = [
	'Describe the word using any words except the word itself.',
	'Give only ONE word as a clue.',
	'Act it out! No speaking allowed.'
] as const;

export interface GameState {
	lobbyId: string;
	config: LobbyConfig;
	teamNames: [string, string];
	players: Player[];
	scores: [number, number];
	segment: Segment;
	currentTeam: number;
	currentPlayerIndex: [number, number]; // index for each team
	phase: GamePhase;
	remainingPhrases: string[];
	currentPhrase: string | null;
	guessedThisTurn: string[];
	skippedThisTurn: string[];
	timeLeft: number;
}
