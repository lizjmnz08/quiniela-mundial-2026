const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'quiniela_secret_key_2026';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ========== CONEXIÓN A POSTGRESQL ==========
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ========== INICIALIZAR BASE DE DATOS ==========
async function initDB() {
    try {
        console.log('🔄 Conectando a PostgreSQL...');
        
        // ========== TABLA USUARIOS ==========
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                fullname TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                role TEXT DEFAULT 'user',
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabla usuarios verificada');
        
        // 🆕 COLUMNAS DE RECUPERACIÓN DE CONTRASEÑA
        await pool.query(`
            ALTER TABLE usuarios 
            ADD COLUMN IF NOT EXISTS reset_codigo VARCHAR(6)
        `);
        console.log('✅ Columna reset_codigo verificada');
        
        await pool.query(`
            ALTER TABLE usuarios 
            ADD COLUMN IF NOT EXISTS reset_expiracion TIMESTAMP
        `);
        console.log('✅ Columna reset_expiracion verificada');
        
        // ========== TABLA PARTIDOS ==========
        await pool.query(`
            CREATE TABLE IF NOT EXISTS partidos (
                id INTEGER PRIMARY KEY,
                fase TEXT,
                grupo TEXT,
                local TEXT,
                visitante TEXT,
                fecha TEXT,
                hora TEXT,
                nombre TEXT
            )
        `);
        console.log('✅ Tabla partidos verificada');
        
        // ========== TABLA APUESTAS ==========
        await pool.query(`
            CREATE TABLE IF NOT EXISTS apuestas (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id),
                partido_id INTEGER REFERENCES partidos(id),
                goles_local INTEGER DEFAULT 0,
                goles_visitante INTEGER DEFAULT 0,
                fecha_apuesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(usuario_id, partido_id)
            )
        `);
        
        // ========== TABLA RESULTADOS ==========
        await pool.query(`
            CREATE TABLE IF NOT EXISTS resultados (
                partido_id INTEGER PRIMARY KEY REFERENCES partidos(id),
                goles_local INTEGER NOT NULL,
                goles_visitante INTEGER NOT NULL,
                actualizado TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // ========== TABLA RANKING ==========
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ranking (
                usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id),
                puntos INTEGER DEFAULT 0,
                ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✅ Todas las tablas y columnas verificadas');
        
        // Crear admin por defecto...
        const adminCheck = await pool.query('SELECT * FROM usuarios WHERE username = $1', ['admin']);
        if (adminCheck.rows.length === 0) {
            const hash = await bcrypt.hash('admin123', 10);
            await pool.query(
                'INSERT INTO usuarios (username, password, fullname, email, role) VALUES ($1, $2, $3, $4, $5)',
                ['admin', hash, 'Administrador', 'admin@quiniela.com', 'admin']
            );
            console.log('👑 Admin creado: admin / admin123');
        }
        
        await initMatches();
        console.log('✅ Base de datos PostgreSQL lista');
        return true;
    } catch (error) {
        console.error('❌ Error en DB:', error);
        return false;
    }
}


// ========== INICIALIZAR PARTIDOS ==========
async function initMatches() {
    const count = await pool.query('SELECT COUNT(*) FROM partidos');
    if (parseInt(count.rows[0].count) > 0) return;

    const partidos = [];
    let id = 1;

    const grupos = {
        'A': ['🇲🇽 México', '🇿🇦 Sudáfrica', '🇰🇷 Corea del Sur', '🇨🇿 Chequia'],
        'B': ['🇨🇦 Canadá', '🇧🇦 Bosnia y Herzegovina', '🇶🇦 Catar', '🇨🇭 Suiza'],
        'C': ['🇧🇷 Brasil', '🇲🇦 Marruecos', '🇭🇹 Haití', '🏴󠁧󠁢󠁳󠁣󠁴󠁿 Escocia'],
        'D': ['🇺🇸 Estados Unidos', '🇵🇾 Paraguay', '🇦🇺 Australia', '🇹🇷 Turquía'],
        'E': ['🇩🇪 Alemania', '🇨🇼 Curazao', '🇨🇮 Costa de Marfil', '🇪🇨 Ecuador'],
        'F': ['🇳🇱 Países Bajos', '🇯🇵 Japón', '🇸🇪 Suecia', '🇹🇳 Túnez'],
        'G': ['🇧🇪 Bélgica', '🇪🇬 Egipto', '🇮🇷 Irán', '🇳🇿 Nueva Zelanda'],
        'H': ['🇪🇸 España', '🇨🇻 Cabo Verde', '🇸🇦 Arabia Saudita', '🇺🇾 Uruguay'],
        'I': ['🇫🇷 Francia', '🇸🇳 Senegal', '🇮🇶 Irak', '🇳🇴 Noruega'],
        'J': ['🇦🇷 Argentina', '🇩🇿 Argelia', '🇦🇹 Austria', '🇯🇴 Jordania'],
        'K': ['🇵🇹 Portugal', '🇨🇩 RD Congo', '🇺🇿 Uzbekistán', '🇨🇴 Colombia'],
        'L': ['🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra', '🇭🇷 Croacia', '🇬🇭 Ghana', '🇵🇦 Panamá']
    };

    // ==================== FASE DE GRUPOS ====================
    
    // 11 de Junio (Jueves)
    partidos.push({ id: id++, fase: 'grupos', grupo: 'A', local: '🇲🇽 México', visitante: '🇿🇦 Sudáfrica', fecha: '11/06/2026', hora: '15:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'A', local: '🇰🇷 Corea del Sur', visitante: '🇨🇿 Chequia', fecha: '11/06/2026', hora: '22:00' });
    
    // 12 de Junio (Viernes)
    partidos.push({ id: id++, fase: 'grupos', grupo: 'B', local: '🇨🇦 Canadá', visitante: '🇧🇦 Bosnia y Herzegovina', fecha: '12/06/2026', hora: '15:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'D', local: '🇺🇸 Estados Unidos', visitante: '🇵🇾 Paraguay', fecha: '12/06/2026', hora: '21:00' });
    
    // 13 de Junio (Sábado)
    partidos.push({ id: id++, fase: 'grupos', grupo: 'B', local: '🇶🇦 Catar', visitante: '🇨🇭 Suiza', fecha: '13/06/2026', hora: '15:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'C', local: '🇧🇷 Brasil', visitante: '🇲🇦 Marruecos', fecha: '13/06/2026', hora: '18:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'C', local: '🇭🇹 Haití', visitante: '🏴󠁧󠁢󠁳󠁣󠁴󠁿 Escocia', fecha: '13/06/2026', hora: '21:00' });
    
    // 14 de Junio (Domingo)
    partidos.push({ id: id++, fase: 'grupos', grupo: 'D', local: '🇦🇺 Australia', visitante: '🇹🇷 Turquía', fecha: '14/06/2026', hora: '00:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'E', local: '🇩🇪 Alemania', visitante: '🇨🇼 Curazao', fecha: '14/06/2026', hora: '13:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'F', local: '🇳🇱 Países Bajos', visitante: '🇯🇵 Japón', fecha: '14/06/2026', hora: '16:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'E', local: '🇨🇮 Costa de Marfil', visitante: '🇪🇨 Ecuador', fecha: '14/06/2026', hora: '19:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'F', local: '🇸🇪 Suecia', visitante: '🇹🇳 Túnez', fecha: '14/06/2026', hora: '22:00' });
    
    // 15 de Junio (Lunes)
    partidos.push({ id: id++, fase: 'grupos', grupo: 'H', local: '🇪🇸 España', visitante: '🇨🇻 Cabo Verde', fecha: '15/06/2026', hora: '12:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'G', local: '🇧🇪 Bélgica', visitante: '🇪🇬 Egipto', fecha: '15/06/2026', hora: '15:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'H', local: '🇸🇦 Arabia Saudita', visitante: '🇺🇾 Uruguay', fecha: '15/06/2026', hora: '18:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'G', local: '🇮🇷 Irán', visitante: '🇳🇿 Nueva Zelanda', fecha: '15/06/2026', hora: '21:00' });
    
    // 16 de Junio (Martes)
    partidos.push({ id: id++, fase: 'grupos', grupo: 'I', local: '🇫🇷 Francia', visitante: '🇸🇳 Senegal', fecha: '16/06/2026', hora: '15:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'I', local: '🇮🇶 Irak', visitante: '🇳🇴 Noruega', fecha: '16/06/2026', hora: '18:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'J', local: '🇦🇷 Argentina', visitante: '🇩🇿 Argelia', fecha: '16/06/2026', hora: '21:00' });
    
    // 17 de Junio (Miércoles)
    partidos.push({ id: id++, fase: 'grupos', grupo: 'J', local: '🇦🇹 Austria', visitante: '🇯🇴 Jordania', fecha: '17/06/2026', hora: '00:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'K', local: '🇵🇹 Portugal', visitante: '🇨🇩 RD Congo', fecha: '17/06/2026', hora: '13:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'L', local: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra', visitante: '🇭🇷 Croacia', fecha: '17/06/2026', hora: '16:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'L', local: '🇬🇭 Ghana', visitante: '🇵🇦 Panamá', fecha: '17/06/2026', hora: '19:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'K', local: '🇺🇿 Uzbekistán', visitante: '🇨🇴 Colombia', fecha: '17/06/2026', hora: '22:00' });
    
    // 18 de Junio (Jueves)
    partidos.push({ id: id++, fase: 'grupos', grupo: 'A', local: '🇨🇿 Chequia', visitante: '🇿🇦 Sudáfrica', fecha: '18/06/2026', hora: '12:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'B', local: '🇨🇭 Suiza', visitante: '🇧🇦 Bosnia y Herzegovina', fecha: '18/06/2026', hora: '15:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'B', local: '🇨🇦 Canadá', visitante: '🇶🇦 Catar', fecha: '18/06/2026', hora: '18:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'A', local: '🇲🇽 México', visitante: '🇰🇷 Corea del Sur', fecha: '18/06/2026', hora: '21:00' });
    
    // 19 de Junio
    partidos.push({ id: id++, fase: 'grupos', grupo: 'D', local: '🇺🇸 Estados Unidos', visitante: '🇦🇺 Australia', fecha: '19/06/2026', hora: '15:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'C', local: '🏴󠁧󠁢󠁳󠁣󠁴󠁿 Escocia', visitante: '🇲🇦 Marruecos', fecha: '19/06/2026', hora: '18:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'C', local: '🇧🇷 Brasil', visitante: '🇭🇹 Haití', fecha: '19/06/2026', hora: '20:30' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'D', local: '🇹🇷 Turquía', visitante: '🇵🇾 Paraguay', fecha: '19/06/2026', hora: '23:00' });
    
    // 20 de Junio
    partidos.push({ id: id++, fase: 'grupos', grupo: 'F', local: '🇳🇱 Países Bajos', visitante: '🇸🇪 Suecia', fecha: '20/06/2026', hora: '13:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'E', local: '🇩🇪 Alemania', visitante: '🇨🇮 Costa de Marfil', fecha: '20/06/2026', hora: '16:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'E', local: '🇪🇨 Ecuador', visitante: '🇨🇼 Curazao', fecha: '20/06/2026', hora: '20:00' });
    
    // 21 de Junio
    partidos.push({ id: id++, fase: 'grupos', grupo: 'F', local: '🇹🇳 Túnez', visitante: '🇯🇵 Japón', fecha: '21/06/2026', hora: '00:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'H', local: '🇪🇸 España', visitante: '🇸🇦 Arabia Saudita', fecha: '21/06/2026', hora: '12:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'G', local: '🇧🇪 Bélgica', visitante: '🇮🇷 Irán', fecha: '21/06/2026', hora: '15:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'H', local: '🇺🇾 Uruguay', visitante: '🇨🇻 Cabo Verde', fecha: '21/06/2026', hora: '18:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'G', local: '🇳🇿 Nueva Zelanda', visitante: '🇪🇬 Egipto', fecha: '21/06/2026', hora: '21:00' });
    
    // 22 de Junio
    partidos.push({ id: id++, fase: 'grupos', grupo: 'J', local: '🇦🇷 Argentina', visitante: '🇦🇹 Austria', fecha: '22/06/2026', hora: '13:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'I', local: '🇫🇷 Francia', visitante: '🇮🇶 Irak', fecha: '22/06/2026', hora: '17:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'I', local: '🇳🇴 Noruega', visitante: '🇸🇳 Senegal', fecha: '22/06/2026', hora: '20:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'J', local: '🇯🇴 Jordania', visitante: '🇩🇿 Argelia', fecha: '22/06/2026', hora: '23:00' });
    
    // 23 de Junio
    partidos.push({ id: id++, fase: 'grupos', grupo: 'K', local: '🇵🇹 Portugal', visitante: '🇺🇿 Uzbekistán', fecha: '23/06/2026', hora: '13:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'L', local: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra', visitante: '🇬🇭 Ghana', fecha: '23/06/2026', hora: '16:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'L', local: '🇵🇦 Panamá', visitante: '🇭🇷 Croacia', fecha: '23/06/2026', hora: '19:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'K', local: '🇨🇴 Colombia', visitante: '🇨🇩 RD Congo', fecha: '23/06/2026', hora: '22:00' });
    
    // 24 de Junio
    partidos.push({ id: id++, fase: 'grupos', grupo: 'B', local: '🇨🇭 Suiza', visitante: '🇨🇦 Canadá', fecha: '24/06/2026', hora: '15:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'B', local: '🇧🇦 Bosnia y Herzegovina', visitante: '🇶🇦 Catar', fecha: '24/06/2026', hora: '15:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'C', local: '🇲🇦 Marruecos', visitante: '🇭🇹 Haití', fecha: '24/06/2026', hora: '18:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'C', local: '🏴󠁧󠁢󠁳󠁣󠁴󠁿 Escocia', visitante: '🇧🇷 Brasil', fecha: '24/06/2026', hora: '18:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'A', local: '🇿🇦 Sudáfrica', visitante: '🇰🇷 Corea del Sur', fecha: '24/06/2026', hora: '21:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'A', local: '🇨🇿 Chequia', visitante: '🇲🇽 México', fecha: '24/06/2026', hora: '21:00' });
    
    // 25 de Junio
    partidos.push({ id: id++, fase: 'grupos', grupo: 'E', local: '🇨🇼 Curazao', visitante: '🇨🇮 Costa de Marfil', fecha: '25/06/2026', hora: '16:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'E', local: '🇪🇨 Ecuador', visitante: '🇩🇪 Alemania', fecha: '25/06/2026', hora: '16:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'F', local: '🇹🇳 Túnez', visitante: '🇳🇱 Países Bajos', fecha: '25/06/2026', hora: '19:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'F', local: '🇯🇵 Japón', visitante: '🇸🇪 Suecia', fecha: '25/06/2026', hora: '19:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'D', local: '🇹🇷 Turquía', visitante: '🇺🇸 Estados Unidos', fecha: '25/06/2026', hora: '22:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'D', local: '🇵🇾 Paraguay', visitante: '🇦🇺 Australia', fecha: '25/06/2026', hora: '22:00' });
    
    // 26 de Junio
    partidos.push({ id: id++, fase: 'grupos', grupo: 'I', local: '🇳🇴 Noruega', visitante: '🇫🇷 Francia', fecha: '26/06/2026', hora: '15:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'I', local: '🇸🇳 Senegal', visitante: '🇮🇶 Irak', fecha: '26/06/2026', hora: '15:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'H', local: '🇨🇻 Cabo Verde', visitante: '🇸🇦 Arabia Saudita', fecha: '26/06/2026', hora: '20:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'H', local: '🇺🇾 Uruguay', visitante: '🇪🇸 España', fecha: '26/06/2026', hora: '20:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'G', local: '🇳🇿 Nueva Zelanda', visitante: '🇧🇪 Bélgica', fecha: '26/06/2026', hora: '23:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'G', local: '🇪🇬 Egipto', visitante: '🇮🇷 Irán', fecha: '26/06/2026', hora: '23:00' });
    
    // 27 de Junio
    partidos.push({ id: id++, fase: 'grupos', grupo: 'L', local: '🇵🇦 Panamá', visitante: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra', fecha: '27/06/2026', hora: '17:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'L', local: '🇭🇷 Croacia', visitante: '🇬🇭 Ghana', fecha: '27/06/2026', hora: '17:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'K', local: '🇨🇴 Colombia', visitante: '🇵🇹 Portugal', fecha: '27/06/2026', hora: '19:30' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'K', local: '🇨🇩 RD Congo', visitante: '🇺🇿 Uzbekistán', fecha: '27/06/2026', hora: '19:30' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'J', local: '🇩🇿 Argelia', visitante: '🇦🇹 Austria', fecha: '27/06/2026', hora: '22:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'J', local: '🇯🇴 Jordania', visitante: '🇦🇷 Argentina', fecha: '27/06/2026', hora: '22:00' });

    // ==================== ELIMINATORIAS ====================
    
    // Eliminatoria de 32 (16 partidos) - 28/6 al 3/7
    const fechasElim32 = ['28/06/2026', '29/06/2026', '29/06/2026', '29/06/2026', '30/06/2026', '30/06/2026', '30/06/2026', '01/07/2026', '01/07/2026', '01/07/2026', '02/07/2026', '02/07/2026', '02/07/2026', '03/07/2026', '03/07/2026', '03/07/2026'];
    const horasElim32 = ['15:00', '13:00', '16:30', '21:00', '13:00', '17:00', '21:00', '12:00', '16:00', '20:00', '15:00', '19:00', '23:00', '14:00', '18:00', '21:30'];
    
    for (let i = 0; i < 16; i++) {
        partidos.push({ id: id++, fase: 'eliminatoria32', nombre: 'Eliminatoria de 32', local: 'A definir', visitante: 'A definir', fecha: fechasElim32[i], hora: horasElim32[i] });
    }
    
    // Octavos de final (8 partidos) - 4/7 al 7/7
    const fechasOctavos = ['04/07/2026', '04/07/2026', '05/07/2026', '05/07/2026', '06/07/2026', '06/07/2026', '07/07/2026', '07/07/2026'];
    const horasOctavos = ['13:00', '17:00', '16:00', '20:00', '15:00', '20:00', '12:00', '16:00'];
    
    for (let i = 0; i < 8; i++) {
        partidos.push({ id: id++, fase: 'octavos', nombre: 'Octavos de final', local: 'A definir', visitante: 'A definir', fecha: fechasOctavos[i], hora: horasOctavos[i] });
    }
    
    // Cuartos de final (4 partidos) - 9/7 al 11/7
    partidos.push({ id: id++, fase: 'cuartos', nombre: 'Cuartos de final', local: 'A definir', visitante: 'A definir', fecha: '09/07/2026', hora: '16:00' });
    partidos.push({ id: id++, fase: 'cuartos', nombre: 'Cuartos de final', local: 'A definir', visitante: 'A definir', fecha: '10/07/2026', hora: '15:00' });
    partidos.push({ id: id++, fase: 'cuartos', nombre: 'Cuartos de final', local: 'A definir', visitante: 'A definir', fecha: '11/07/2026', hora: '17:00' });
    partidos.push({ id: id++, fase: 'cuartos', nombre: 'Cuartos de final', local: 'A definir', visitante: 'A definir', fecha: '11/07/2026', hora: '21:00' });
    
    // Semifinales (2 partidos) - 14/7 y 15/7
    partidos.push({ id: id++, fase: 'semis', nombre: 'Semifinal', local: 'A definir', visitante: 'A definir', fecha: '14/07/2026', hora: '15:00' });
    partidos.push({ id: id++, fase: 'semis', nombre: 'Semifinal', local: 'A definir', visitante: 'A definir', fecha: '15/07/2026', hora: '15:00' });
    
    // Tercer puesto - 18/7
    partidos.push({ id: id++, fase: 'tercero', nombre: 'Tercer puesto', local: 'A definir', visitante: 'A definir', fecha: '18/07/2026', hora: '17:00' });
    
    // Gran Final - 19/7
    partidos.push({ id: id++, fase: 'final', nombre: '🏆 GRAN FINAL 🏆', local: 'A definir', visitante: 'A definir', fecha: '19/07/2026', hora: '15:00' });

    // Insertar partidos
    for (const p of partidos) {
        await pool.query(
            `INSERT INTO partidos (id, fase, grupo, local, visitante, fecha, hora, nombre) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [p.id, p.fase, p.grupo, p.local, p.visitante, p.fecha, p.hora, p.nombre]
        );
    }
    console.log(`✅ ${partidos.length} partidos inicializados con fechas y horas correctas`);
}
// ========== MIDDLEWARE ==========
function verificarToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'Token no proporcionado' });
    try {
        const decoded = jwt.verify(token.split(' ')[1], SECRET_KEY);
        req.usuario = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
}

// ========== RUTAS API ==========

app.get('/api/test', (req, res) => res.json({ message: 'API funcionando con PostgreSQL', env: process.env.NODE_ENV }));

app.post('/api/register', async (req, res) => {
    try {
        const { username, password, fullname, email } = req.body;
        const existing = await pool.query('SELECT * FROM usuarios WHERE username = $1 OR email = $2', [username, email]);
        if (existing.rows.length > 0) return res.status(400).json({ error: 'Usuario o email ya existe' });
        const hash = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO usuarios (username, password, fullname, email) VALUES ($1, $2, $3, $4)',
            [username, hash, fullname, email]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Usuario no existe' });
        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta' });
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY);
        res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/partidos', async (req, res) => {
    const result = await pool.query('SELECT * FROM partidos ORDER BY id');
    res.json(result.rows);
});

app.get('/api/apuestas', verificarToken, async (req, res) => {
    const result = await pool.query('SELECT * FROM apuestas WHERE usuario_id = $1', [req.usuario.id]);
    res.json(result.rows);
});

app.get('/api/resultados', async (req, res) => {
    const result = await pool.query('SELECT * FROM resultados');
    res.json(result.rows);
});

app.post('/api/apuestas/multiple', verificarToken, async (req, res) => {
    const { apuestas } = req.body;
    for (const a of apuestas) {
        await pool.query(
            `INSERT INTO apuestas (usuario_id, partido_id, goles_local, goles_visitante) 
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (usuario_id, partido_id) 
             DO UPDATE SET goles_local = $3, goles_visitante = $4`,
            [req.usuario.id, a.partidoId, a.golesLocal, a.golesVisitante]
        );
    }
    res.json({ success: true });
});

app.get('/api/ranking', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.username, u.fullname, COALESCE(r.puntos, 0) as puntos
            FROM usuarios u
            LEFT JOIN ranking r ON u.id = r.usuario_id
            WHERE u.role != 'admin'
            ORDER BY puntos DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error en ranking:', error);
        res.status(500).json({ error: 'Error al obtener ranking' });
    }
});

app.get('/api/usuarios', async (req, res) => {
    const result = await pool.query('SELECT id, username, fullname, email, role FROM usuarios');
    res.json(result.rows);
});

app.delete('/api/apuestas/mis-apuestas', verificarToken, async (req, res) => {
    await pool.query('DELETE FROM apuestas WHERE usuario_id = $1', [req.usuario.id]);
    await pool.query('INSERT INTO ranking (usuario_id, puntos) VALUES ($1, 0) ON CONFLICT (usuario_id) DO UPDATE SET puntos = 0', [req.usuario.id]);
    res.json({ success: true });
});
// ==========================================
// 🔑 RECUPERACIÓN DE CONTRASEÑA
// ==========================================

// Endpoint 1: Solicitar código de recuperación
app.post('/api/auth/recuperar-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email es requerido' 
            });
        }
        
        // Buscar usuario por email
        const user = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1', 
            [email]
        );
        
        if (user.rows.length === 0) {
            return res.json({ 
                success: false, 
                error: 'No existe una cuenta con este email' 
            });
        }
        
        // Generar código aleatorio de 6 dígitos
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Guardar código en la base de datos
        await pool.query(
            `UPDATE usuarios 
             SET reset_codigo = $1, 
                 reset_expiracion = NOW() + INTERVAL '15 minutes' 
             WHERE email = $2`,
            [codigo, email]
        );
        
        console.log(`📧 Código para ${email}: ${codigo}`);
        
        res.json({ 
            success: true, 
            message: 'Código enviado a tu email',
            codigo: codigo // ⚠️ Quitar en producción
        });
        
    } catch (error) {
        console.error('Error en recuperar-password:', error);
        res.status(500).json({ success: false, error: 'Error del servidor' });
    }
});

// Endpoint 2: Verificar código
app.post('/api/auth/verificar-codigo', async (req, res) => {
    try {
        const { email, codigo } = req.body;
        
        if (!email || !codigo) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email y código son requeridos' 
            });
        }
        
        const user = await pool.query(
            `SELECT * FROM usuarios 
             WHERE email = $1 
             AND reset_codigo = $2 
             AND reset_expiracion > NOW()`,
            [email, codigo]
        );
        
        if (user.rows.length === 0) {
            return res.json({ 
                success: false, 
                error: 'Código inválido o expirado' 
            });
        }
        
        res.json({ success: true, message: 'Código verificado' });
        
    } catch (error) {
        console.error('Error en verificar-codigo:', error);
        res.status(500).json({ success: false, error: 'Error del servidor' });
    }
});

// Endpoint 3: Cambiar contraseña
app.post('/api/auth/cambiar-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        
        if (!email || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email y nueva contraseña son requeridos' 
            });
        }
        
        if (newPassword.length < 4) {
            return res.status(400).json({ 
                success: false, 
                error: 'La contraseña debe tener al menos 4 caracteres' 
            });
        }
        // ========== GUARDAR RESULTADO OFICIAL ==========
app.post('/api/resultados', verificarToken, async (req, res) => {
    try {
        // Verificar que sea admin
        if (req.usuario.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Solo administradores' });
        }
        
        const { partidoId, golesLocal, golesVisitante } = req.body;
        
        console.log('📊 Guardando resultado:', { partidoId, golesLocal, golesVisitante });
        
        await pool.query(
            `INSERT INTO resultados (partido_id, goles_local, goles_visitante) 
             VALUES ($1, $2, $3)
             ON CONFLICT (partido_id) 
             DO UPDATE SET goles_local = $2, goles_visitante = $3, actualizado = NOW()`,
            [partidoId, golesLocal, golesVisitante]
        );
        
        res.json({ success: true, message: 'Resultado guardado' });
    } catch (error) {
        console.error('Error al guardar resultado:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
        
        // Encriptar contraseña (usando bcryptjs que ya tienes)
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Actualizar en base de datos
        await pool.query(
            `UPDATE usuarios 
             SET password = $1, 
                 reset_codigo = NULL, 
                 reset_expiracion = NULL 
             WHERE email = $2`,
            [hashedPassword, email]
        );
        
        console.log(`🔐 Contraseña actualizada para: ${email}`);
        
        res.json({ 
            success: true, 
            message: 'Contraseña actualizada exitosamente' 
        });
        
    } catch (error) {
        console.error('Error en cambiar-password:', error);
        res.status(500).json({ success: false, error: 'Error del servidor' });
    }
});


// ========== INICIAR SERVIDOR ==========
async function startServer() {
    const dbOk = await initDB();
    if (dbOk) {
        app.listen(PORT, () => {
            console.log(`\n🚀 Servidor en puerto ${PORT}`);
            console.log(`🐘 Base de datos: PostgreSQL`);
            console.log(`🔐 API disponible`);
        });
    }
}

startServer();