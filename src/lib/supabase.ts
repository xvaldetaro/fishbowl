import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = supabaseUrl && supabaseAnonKey
	? createClient(supabaseUrl, supabaseAnonKey)
	: null;

export async function createLobby(config: { turnTime: number; phrasesPerPlayer: number }) {
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
	if (!supabase) throw new Error('Supabase not configured');

	const { data, error } = await supabase
		.from('submissions')
		.select('player_name, phrases')
		.eq('lobby_id', lobbyId);

	if (error) throw error;
	return data as { player_name: string; phrases: string[] }[];
}
