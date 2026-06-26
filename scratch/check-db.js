const mysql = require('mysql2/promise');
require('dotenv').config();

async function test() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: ''
        });
        const [rows] = await connection.query('SHOW DATABASES');
        console.log('Databases:', rows.map(r => r.Database));
        await connection.end();
    } catch (err) {
        console.error('Error occurred:', err);
    }
}
test();
