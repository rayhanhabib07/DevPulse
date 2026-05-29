/**
 * Migration script: run with `npm run db:migrate`
 * Creates the users and issues tables if they don't already exist.
 * Safe to re-run (uses IF NOT EXISTS).
 */
import pool from './db';

const migrate = async (): Promise<void> => {
  const client = await pool.connect();

  try {
    console.log('🚀 Running database migrations...');

    // ---- users table ----
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL        PRIMARY KEY,
        name        VARCHAR(255)  NOT NULL,
        email       VARCHAR(255)  NOT NULL UNIQUE,
        password    VARCHAR(255)  NOT NULL,
        role        VARCHAR(20)   NOT NULL DEFAULT 'contributor'
                      CHECK (role IN ('contributor', 'maintainer')),
        created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ Table "users" is ready.');

    // ---- issues table ----
    await client.query(`
      CREATE TABLE IF NOT EXISTS issues (
        id           SERIAL        PRIMARY KEY,
        title        VARCHAR(150)  NOT NULL,
        description  TEXT          NOT NULL,
        type         VARCHAR(20)   NOT NULL
                       CHECK (type IN ('bug', 'feature_request')),
        status       VARCHAR(20)   NOT NULL DEFAULT 'open'
                       CHECK (status IN ('open', 'in_progress', 'resolved')),
        reporter_id  INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
    `);

    // Add FK on existing databases that pre-date this constraint
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_issues_reporter'
            AND table_name = 'issues'
        ) THEN
          ALTER TABLE issues
            ADD CONSTRAINT fk_issues_reporter
            FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    console.log('✅ Table "issues" is ready.');

    console.log('🎉 All migrations completed successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
