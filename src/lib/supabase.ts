import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'supabase_creds';

let supabaseInstance: SupabaseClient | null = null;

export interface SupabaseCredentials {
	url: string;
	anonKey: string;
}

export function getCredentials(): SupabaseCredentials | null {
	if (typeof window === 'undefined') return null;
	const stored = localStorage.getItem(STORAGE_KEY);
	if (!stored) return null;
	try {
		return JSON.parse(stored);
	} catch {
		return null;
	}
}

export function setCredentials(url: string, anonKey: string) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, anonKey }));
	supabaseInstance = createClient(url, anonKey);
}

export function clearCredentials() {
	localStorage.removeItem(STORAGE_KEY);
	supabaseInstance = null;
}

export function getSupabase(): SupabaseClient | null {
	if (supabaseInstance) return supabaseInstance;

	const creds = getCredentials();
	if (!creds) return null;

	supabaseInstance = createClient(creds.url, creds.anonKey);
	return supabaseInstance;
}

// Create a temporary client from provided credentials (for join page)
export function createTemporaryClient(url: string, anonKey: string): SupabaseClient {
	return createClient(url, anonKey);
}

export async function createLobby(config: { turnTime: number; phrasesPerPlayer: number }) {
	const supabase = getSupabase();
	if (!supabase) throw new Error('Supabase not configured');

	const { data, error } = await supabase
		.from('lobbies')
		.insert({
			config_turn_time: config.turnTime,
			config_phrases_per_player: config.phrasesPerPlayer
		})
		.select('id')
		.single();

	if (error) throw error;
	return data.id as string;
}

export async function getLobby(lobbyId: string) {
	const supabase = getSupabase();
	if (!supabase) throw new Error('Supabase not configured');

	const { data, error } = await supabase
		.from('lobbies')
		.select('*')
		.eq('id', lobbyId)
		.single();

	if (error) throw error;
	return {
		id: data.id,
		turnTime: data.config_turn_time,
		phrasesPerPlayer: data.config_phrases_per_player
	};
}

export async function submitPlayer(lobbyId: string, name: string, phrases: string[]) {
	const supabase = getSupabase();
	if (!supabase) throw new Error('Supabase not configured');

	const { error } = await supabase
		.from('submissions')
		.insert({
			lobby_id: lobbyId,
			player_name: name,
			phrases
		});

	if (error) throw error;
}

export async function getSubmissions(lobbyId: string) {
	const supabase = getSupabase();
	if (!supabase) throw new Error('Supabase not configured');

	const { data, error } = await supabase
		.from('submissions')
		.select('player_name, phrases')
		.eq('lobby_id', lobbyId);

	if (error) throw error;
	return data as { player_name: string; phrases: string[] }[];
}

export async function deleteLobby(lobbyId: string) {
	const supabase = getSupabase();
	if (!supabase) return;

	await supabase.from('submissions').delete().eq('lobby_id', lobbyId);
	await supabase.from('lobbies').delete().eq('id', lobbyId);
}
