const mysql = require('mysql2/promise');
require('dotenv').config();

async function runAlter() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: 'rel'
        });
        
        console.log('🔄 Altering table leads to add Facebook and Instagram to source ENUM...');
        const alterQuery = `
            ALTER TABLE leads 
            MODIFY COLUMN source ENUM('WhatsApp', 'Facebook', 'Instagram', 'Website', 'Referral', 'Cold Call', 'Email', 'Social Media', 'Other') 
            DEFAULT 'WhatsApp'
        `;
        await connection.query(alterQuery);
        console.log('✅ Leads table altered successfully.');
        
        console.log('🔄 Cleaning up and correcting the sources for your simulated leads...');
        await connection.query("UPDATE leads SET source = 'Facebook' WHERE phone = '+923012345678'");
        await connection.query("UPDATE leads SET source = 'Instagram' WHERE phone = '+923098765432'");
        console.log('✅ Existing test leads cleaned up.');

        console.log('\n--- VERIFYING LEADS ---');
        const [leads] = await connection.query('SELECT id, name, phone, source, stage FROM leads ORDER BY id DESC LIMIT 5');
        console.table(leads);

        await connection.end();
    } catch (err) {
        console.error('Error occurred:', err.message);
    }
}
runAlter();
