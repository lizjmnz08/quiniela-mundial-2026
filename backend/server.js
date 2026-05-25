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
        
        // Crear tablas
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
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS resultados (
                partido_id INTEGER PRIMARY KEY REFERENCES partidos(id),
                goles_local INTEGER NOT NULL,
                goles_visitante INTEGER NOT NULL,
                actualizado TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ranking (
                usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id),
                puntos INTEGER DEFAULT 0,
                ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✅ Tablas creadas/verificadas');
        
        // Crear admin por defecto
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

    // Fase de grupos
    for (let [grupo, equipos] of Object.entries(grupos)) {
        for (let i = 0; i < equipos.length; i++) {
            for (let j = i + 1; j < equipos.length; j++) {
                partidos.push({ id: id++, fase: 'grupos', grupo, local: equipos[i], visitante: equipos[j], fecha: 'Jun 2026', hora: 'Por definir' });
            }
        }
    }

    // Eliminatorias
    for (let i = 1; i <= 16; i++) partidos.push({ id: id++, fase: 'octavos', nombre: 'Octavos', local: 'Clasificado', visitante: 'Clasificado', fecha: 'Jul 2026', hora: 'Por definir' });
    for (let i = 1; i <= 8; i++) partidos.push({ id: id++, fase: 'cuartos', nombre: 'Cuartos', local: 'Clasificado', visitante: 'Clasificado', fecha: 'Jul 2026', hora: 'Por definir' });
    for (let i = 1; i <= 4; i++) partidos.push({ id: id++, fase: 'semis', nombre: 'Semifinal', local: 'Clasificado', visitante: 'Clasificado', fecha: 'Jul 2026', hora: 'Por definir' });
    partidos.push({ id: id++, fase: 'final', nombre: 'FINAL', local: 'Clasificado', visitante: 'Clasificado', fecha: '19/07/2026', hora: '15:00' });
    partidos.push({ id: id++, fase: 'tercero', nombre: '3er Puesto', local: 'Clasificado', visitante: 'Clasificado', fecha: '18/07/2026', hora: '17:00' });

    for (const p of partidos) {
        await pool.query(
            `INSERT INTO partidos (id, fase, grupo, local, visitante, fecha, hora, nombre) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [p.id, p.fase, p.grupo, p.local, p.visitante, p.fecha, p.hora, p.nombre]
        );
    }
    console.log(`✅ ${partidos.length} partidos inicializados`);
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
    const result = await pool.query(`
        SELECT u.id, u.username, u.fullname, COALESCE(r.puntos, 0) as puntos
        FROM usuarios u
        LEFT JOIN ranking r ON u.id = r.usuario_id
        ORDER BY puntos DESC
    `);
    res.json(result.rows);
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