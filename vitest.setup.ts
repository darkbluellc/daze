// Hermetic env defaults so modules that read env at import-time don't throw.
process.env.DATABASE_URL ||= "postgresql://localhost:5432/test";
process.env.DAZE_ENCRYPTION_KEY ||=
  "0000000000000000000000000000000000000000000000000000000000000000";
process.env.DAZE_PUSHOVER_APP_TOKEN ||= "test-app-token";
