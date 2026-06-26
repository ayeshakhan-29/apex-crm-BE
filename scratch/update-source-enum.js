const { pool } = require('../src/config/database');

async function migrate() {
    console.log('🚀 Starting migration to update Lead source enum...');
    
    try {
        // Update leads table source column
        const updateEnumQuery = `
            ALTER TABLE leads 
            MODIFY COLUMN source ENUM(
                'WhatsApp', 
                'Facebook', 
                'Instagram', 
                'Website', 
                'Referral', 
                'Cold Call', 
                'Email', 
                'Social Media', 
                'Other'
            ) DEFAULT 'WhatsApp'
        `;
        
        await pool.query(updateEnumQuery);
        console.log('✅ Leads table updated successfully (Source enum expanded)');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

migrate();
