const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function verUsuarios() {
    try {
        const db = await open({
            filename: './database.sqlite',
            driver: sqlite3.Database
        });
        
        const usuarios = await db.all('SELECT * FROM usuarios');
        console.log('Usuarios en la base de datos:');
        console.table(usuarios);
        
        await db.close();
    } catch (error) {
        console.error('Error:', error);
    }
}

verUsuarios();