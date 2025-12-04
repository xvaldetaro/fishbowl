<script lang="ts">
	import { base } from '$app/paths';
</script>

<div class="page">
	<h1>Supabase Setup</h1>

	<div class="card">
		<h2>1. Create Account & Project</h2>
		<ol>
			<li>Go to <a href="https://supabase.com/dashboard" target="_blank">supabase.com/dashboard</a></li>
			<li>Sign up or log in</li>
			<li>Click <strong>New Project</strong></li>
			<li>Enter a project name (e.g., "fishbowl")</li>
			<li>Set a database password</li>
			<li>Choose a region close to you</li>
			<li>Click <strong>Create new project</strong> (wait ~2 min)</li>
		</ol>
	</div>

	<div class="card">
		<h2>2. Create Tables</h2>
		<p>Go to <strong>SQL Editor</strong> in the left sidebar, paste this SQL, and click <strong>Run</strong>:</p>
		<pre><code>{`-- Lobbies table
create table lobbies (
  id uuid primary key default gen_random_uuid(),
  config_turn_time integer not null default 60,
  config_phrases_per_player integer not null default 3,
  created_at timestamp with time zone default now()
);

-- Submissions table
create table submissions (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid references lobbies(id) on delete cascade,
  player_name text not null,
  phrases jsonb not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS with open policies
alter table lobbies enable row level security;
alter table submissions enable row level security;
create policy "Allow all on lobbies" on lobbies
  for all using (true) with check (true);
create policy "Allow all on submissions" on submissions
  for all using (true) with check (true);`}</code></pre>
	</div>

	<div class="card">
		<h2>3. Get Your Credentials</h2>
		<ol>
			<li>Click <strong>Project Settings</strong> (gear icon)</li>
			<li>Click <strong>API</strong></li>
			<li>Copy <strong>Project URL</strong> (looks like <code>https://xxx.supabase.co</code>)</li>
			<li>Copy <strong>anon public</strong> key (starts with <code>eyJ...</code>)</li>
		</ol>
	</div>

	<a href="{base}/" class="back-link">← Back to Home</a>
</div>

<style>
	ol {
		margin: 0.5rem 0;
		padding-left: 1.25rem;
	}

	li {
		margin: 0.25rem 0;
	}

	pre {
		background: var(--bg);
		padding: 1rem;
		border-radius: 8px;
		overflow-x: auto;
		font-size: 0.75rem;
		margin-top: 0.5rem;
	}

	code {
		font-family: monospace;
		font-size: 0.8rem;
	}

	p code {
		background: var(--bg);
		padding: 0.1rem 0.3rem;
		border-radius: 4px;
	}

	a {
		color: var(--primary);
	}

	.back-link {
		display: inline-block;
		margin-top: 1rem;
	}
</style>
