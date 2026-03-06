-- 010: all RLS policies (runs after all tables exist)

-- ============================================================
-- competitions
-- ============================================================
create policy "Authenticated users can read competitions"
  on competitions for select
  to authenticated
  using (true);

create policy "Admins can insert competitions"
  on competitions for insert
  to authenticated
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "Admins can update competitions"
  on competitions for update
  to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ============================================================
-- profiles
-- ============================================================
create policy "Anyone can read profiles"
  on profiles for select
  to authenticated
  using (true);

create policy "Users can insert own profile"
  on profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "Users can update own profile"
  on profiles for update
  to authenticated
  using (id = auth.uid());

-- ============================================================
-- competition_members
-- ============================================================
create policy "Users can read own memberships"
  on competition_members for select
  to authenticated
  using (user_id = auth.uid());

-- TODO: add cross-member read policy via security-definer function
-- (self-referencing policies on the same table cause query hangs)

create policy "Users can join competitions"
  on competition_members for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Admins can delete members"
  on competition_members for delete
  to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ============================================================
-- races
-- ============================================================
create policy "Anyone can read races"
  on races for select
  to authenticated
  using (true);

create policy "Admins can insert races"
  on races for insert
  to authenticated
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "Admins can update races"
  on races for update
  to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ============================================================
-- drivers
-- ============================================================
create policy "Anyone can read drivers"
  on drivers for select
  to authenticated
  using (true);

create policy "Admins can insert drivers"
  on drivers for insert
  to authenticated
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "Admins can update drivers"
  on drivers for update
  to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ============================================================
-- driver_assignments
-- ============================================================
create policy "Members can read driver assignments"
  on driver_assignments for select
  to authenticated
  using (
    competition_id in (
      select competition_id from competition_members
      where user_id = auth.uid()
    )
  );

create policy "Admins can insert driver assignments"
  on driver_assignments for insert
  to authenticated
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "Admins can update driver assignments"
  on driver_assignments for update
  to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "Admins can delete driver assignments"
  on driver_assignments for delete
  to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ============================================================
-- predictions
-- ============================================================
create policy "Users can read own predictions"
  on predictions for select
  to authenticated
  using (user_id = auth.uid());

create policy "Members can read locked predictions"
  on predictions for select
  to authenticated
  using (
    is_locked = true
    and competition_id in (
      select competition_id from competition_members
      where user_id = auth.uid()
    )
  );

create policy "Users can insert own predictions"
  on predictions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own unlocked predictions"
  on predictions for update
  to authenticated
  using (user_id = auth.uid() and is_locked = false);

create policy "Admins can update any prediction"
  on predictions for update
  to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ============================================================
-- results
-- ============================================================
create policy "Anyone can read results"
  on results for select
  to authenticated
  using (true);

create policy "Admins can insert results"
  on results for insert
  to authenticated
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "Admins can update results"
  on results for update
  to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ============================================================
-- scores
-- ============================================================
create policy "Members can read scores"
  on scores for select
  to authenticated
  using (
    competition_id in (
      select competition_id from competition_members
      where user_id = auth.uid()
    )
  );

create policy "Admins can insert scores"
  on scores for insert
  to authenticated
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "Admins can update scores"
  on scores for update
  to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );
