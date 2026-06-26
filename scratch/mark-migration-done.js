const { pool } = require('../src/config/database');

async function fix() {
    try {
        console.log('Marking migration 009 as executed...');
        await pool.execute(
            'INSERT IGNORE INTO schema_migrations (filename) VALUES (?)',
            ['009_add_google_email_column.sql']
        );
        console.log('✅ Successfully marked migration 009 as executed.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}
fix();
