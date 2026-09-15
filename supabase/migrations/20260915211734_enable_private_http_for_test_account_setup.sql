-- Historical compatibility marker, intentionally a no-op for new installations.
-- The hosted test project records this version for a temporary HTTP setup helper.
-- That helper was not part of the application and has now been removed.
-- We do not recreate retired setup tooling in fresh environments.
-- See docs/PROJECT_STATUS.md for the migration-history reconciliation.
select 1;
