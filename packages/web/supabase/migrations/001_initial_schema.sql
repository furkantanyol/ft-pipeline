-- aitelier initial schema
-- Tables: projects, project_members, examples, training_runs, evaluations

-- =============================================================================
-- TABLES
-- =============================================================================

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  system_prompt text,
  provider text not null default 'together',
  base_model text not null,
  provider_config jsonb not null default '{}',
  training_config jsonb not null default '{
    "epochs": 3,
    "batch_size": 4,
    "learning_rate": 1e-5,
    "lora_r": 16,
    "lora_alpha": 32,
    "lora_dropout": 0.05
  }',
  quality_threshold int not null default 8,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists project_members (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'trainer', 'rater')),
  invited_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists examples (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  input text not null,
  output text not null,
  rewrite text,
  rating int check (rating >= 1 and rating <= 10),
  rated_by uuid references auth.users(id),
  split text check (split in ('train', 'val')),
  metadata jsonb not null default '{}',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  rated_at timestamptz
);

create index if not exists examples_project_id_idx on examples(project_id);
create index if not exists examples_project_split_idx on examples(project_id, split);
create index if not exists examples_project_rating_idx on examples(project_id, rating);

create table if not exists training_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  provider text not null,
  provider_job_id text,
  model_id text,
  base_model text not null,
  status text not null default 'pending'
    check (status in ('pending', 'uploading', 'queued', 'training', 'completed', 'failed', 'cancelled')),
  config jsonb not null default '{}',
  example_count int not null default 0,
  train_count int not null default 0,
  val_count int not null default 0,
  cost_estimate numeric,
  cost_actual numeric,
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists training_runs_project_id_idx on training_runs(project_id);

create table if not exists evaluations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  training_run_id uuid not null references training_runs(id) on delete cascade,
  example_id uuid not null references examples(id) on delete cascade,
  model_output text,
  baseline_output text,
  model_score int check (model_score >= 1 and model_score <= 10),
  baseline_score int check (baseline_score >= 1 and baseline_score <= 10),
  preferred text check (preferred in ('model', 'baseline', 'tie')),
  scored_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists evaluations_project_id_idx on evaluations(project_id);
create index if not exists evaluations_training_run_id_idx on evaluations(training_run_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table projects enable row level security;
alter table project_members enable row level security;
alter table examples enable row level security;
alter table training_runs enable row level security;
alter table evaluations enable row level security;

-- Helper: check if a user is a member of a project
create or replace function is_project_member(p_project_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = p_user_id
  );
$$ language sql security definer stable;

-- Helper: get a user's role in a project
create or replace function get_project_role(p_project_id uuid, p_user_id uuid)
returns text as $$
  select role from project_members
  where project_id = p_project_id and user_id = p_user_id;
$$ language sql security definer stable;

-- PROJECTS --
drop policy if exists "Members can view their projects" on projects;
drop policy if exists "Owners can update their projects" on projects;
drop policy if exists "Authenticated users can create projects" on projects;
drop policy if exists "Owners can delete their projects" on projects;

create policy "Authenticated users can create projects"
  on projects for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "Members can view their projects"
  on projects for select to authenticated
  using (
    is_project_member(id, (select auth.uid()))
    or created_by = (select auth.uid())
  );

create policy "Owners can update their projects"
  on projects for update to authenticated
  using (get_project_role(id, (select auth.uid())) = 'owner');

create policy "Owners can delete their projects"
  on projects for delete to authenticated
  using (get_project_role(id, (select auth.uid())) = 'owner');

-- PROJECT_MEMBERS --
drop policy if exists "Members can view project membership" on project_members;
drop policy if exists "Owners can manage members" on project_members;
drop policy if exists "Owners can update member roles" on project_members;
drop policy if exists "Owners can remove members" on project_members;
drop policy if exists "Creator can add themselves as owner" on project_members;

create policy "Members can view project membership"
  on project_members for select to authenticated
  using (is_project_member(project_id, (select auth.uid())));

create policy "Owners can manage members"
  on project_members for insert to authenticated
  with check (get_project_role(project_id, (select auth.uid())) = 'owner');

create policy "Creator can add themselves as owner"
  on project_members for insert to authenticated
  with check (user_id = (select auth.uid()) and role = 'owner');

create policy "Owners can update member roles"
  on project_members for update to authenticated
  using (get_project_role(project_id, (select auth.uid())) = 'owner');

create policy "Owners can remove members"
  on project_members for delete to authenticated
  using (get_project_role(project_id, (select auth.uid())) = 'owner');

-- EXAMPLES --
drop policy if exists "Members can view project examples" on examples;
drop policy if exists "Trainers and owners can add examples" on examples;
drop policy if exists "Raters can rate examples" on examples;
drop policy if exists "Owners can delete examples" on examples;

create policy "Members can view project examples"
  on examples for select to authenticated
  using (is_project_member(project_id, (select auth.uid())));

create policy "Trainers and owners can add examples"
  on examples for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and get_project_role(project_id, (select auth.uid())) in ('owner', 'trainer')
  );

create policy "Raters can rate examples"
  on examples for update to authenticated
  using (is_project_member(project_id, (select auth.uid())));

create policy "Owners can delete examples"
  on examples for delete to authenticated
  using (get_project_role(project_id, (select auth.uid())) = 'owner');

-- TRAINING_RUNS --
drop policy if exists "Members can view training runs" on training_runs;
drop policy if exists "Trainers and owners can create training runs" on training_runs;
drop policy if exists "Trainers and owners can update training runs" on training_runs;
drop policy if exists "Owners can delete training runs" on training_runs;

create policy "Members can view training runs"
  on training_runs for select to authenticated
  using (is_project_member(project_id, (select auth.uid())));

create policy "Trainers and owners can create training runs"
  on training_runs for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and get_project_role(project_id, (select auth.uid())) in ('owner', 'trainer')
  );

create policy "Trainers and owners can update training runs"
  on training_runs for update to authenticated
  using (get_project_role(project_id, (select auth.uid())) in ('owner', 'trainer'));

create policy "Owners can delete training runs"
  on training_runs for delete to authenticated
  using (get_project_role(project_id, (select auth.uid())) = 'owner');

-- EVALUATIONS --
drop policy if exists "Members can view evaluations" on evaluations;
drop policy if exists "Members can create evaluations" on evaluations;
drop policy if exists "Members can score evaluations" on evaluations;
drop policy if exists "Owners can delete evaluations" on evaluations;

create policy "Members can view evaluations"
  on evaluations for select to authenticated
  using (is_project_member(project_id, (select auth.uid())));

create policy "Members can create evaluations"
  on evaluations for insert to authenticated
  with check (is_project_member(project_id, (select auth.uid())));

create policy "Members can score evaluations"
  on evaluations for update to authenticated
  using (is_project_member(project_id, (select auth.uid())));

create policy "Owners can delete evaluations"
  on evaluations for delete to authenticated
  using (get_project_role(project_id, (select auth.uid())) = 'owner');
