-- =============================================================================
-- UTOPIA — a wave may have at most one public session.
--
-- Two independent sessions on the same wave would mean two unrelated share
-- links both claiming the same physical round — confusing for whoever joins
-- via the "wrong" link. createSession.ts already checks this before
-- inserting; this is the DB-level backstop against a genuine race (two
-- people starting a session on the same wave at the same instant), the same
-- pattern manage_token/share_token already use.
-- =============================================================================

alter table sessions add constraint sessions_wave_id_unique unique (wave_id);
