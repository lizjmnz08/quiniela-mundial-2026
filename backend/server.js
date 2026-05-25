const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'quiniela_secret_key_2026';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

let db;

async function initDB() {
    try {
        db = await open({
            filename: './database.sqlite',
            driver: sqlite3.Database
        });
        console.log('✅ Base de datos conectada');

        await db.exec(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT,
                fullname TEXT,
                email TEXT,
                role TEXT DEFAULT 'user',
                fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS partidos (
                id INTEGER PRIMARY KEY,
                fase TEXT,
                grupo TEXT,
                local TEXT,
                visitante TEXT,
                fecha TEXT,
                hora TEXT,
                nombre TEXT
            );
            
            CREATE TABLE IF NOT EXISTS apuestas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER,
                partido_id INTEGER,
                goles_local INTEGER DEFAULT 0,
                goles_visitante INTEGER DEFAULT 0,
                fecha_apuesta DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS resultados (
                partido_id INTEGER PRIMARY KEY,
                goles_local INTEGER,
                goles_visitante INTEGER,
                actualizado DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS ranking (
                usuario_id INTEGER PRIMARY KEY,
                puntos INTEGER DEFAULT 0,
                ultima_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tablas listas');

        const admin = await db.get('SELECT * FROM usuarios WHERE username = ?', ['admin']);
        if (!admin) {
            const hash = await bcrypt.hash('admin123', 10);
            await db.run(`INSERT INTO usuarios (username, password, fullname, email, role) VALUES (?, ?, ?, ?, ?)`,
                ['admin', hash, 'Administrador', 'admin@quiniela.com', 'admin']);
            console.log('👑 Admin: admin / admin123');
        }

        await initMatches();
        return true;
    } catch (error) {
        console.error('Error:', error);
        return false;
    }
}

// ========== INICIALIZAR PARTIDOS CON FECHAS Y HORAS REALES ==========
async function initMatches() {
    const count = await db.get('SELECT COUNT(*) as total FROM partidos');
    if (count.total > 0) return;

    const partidos = [];
    let id = 1;

    // ==================== FASE DE GRUPOS ====================
    
    // 11 de Junio
    partidos.push({ id: id++, fase: 'grupos', grupo: 'A', local: '🇲🇽 México', visitante: '🇿🇦 Sudáfrica', fecha: '11/06/2026', hora: '15:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'A', local: '🇰🇷 Corea del Sur', visitante: '🇨🇿 Chequia', fecha: '11/06/2026', hora: '22:00' });
    
    // 12 de Junio
    partidos.push({ id: id++, fase: 'grupos', grupo: 'B', local: '🇨🇦 Canadá', visitante: '🇧🇦 Bosnia y Herzegovina', fecha: '12/06/2026', hora: '15:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'D', local: '🇺🇸 Estados Unidos', visitante: '🇵🇾 Paraguay', fecha: '12/06/2026', hora: '21:00' });
    
    // 13 de Junio
    partidos.push({ id: id++, fase: 'grupos', grupo: 'B', local: '🇶🇦 Catar', visitante: '🇨🇭 Suiza', fecha: '13/06/2026', hora: '15:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'C', local: '🇧🇷 Brasil', visitante: '🇲🇦 Marruecos', fecha: '13/06/2026', hora: '18:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'C', local: '🇭🇹 Haití', visitante: '🏴󠁧󠁢󠁳󠁣󠁴󠁿 Escocia', fecha: '13/06/2026', hora: '21:00' });
    
    // 14 de Junio
    partidos.push({ id: id++, fase: 'grupos', grupo: 'D', local: '🇦🇺 Australia', visitante: '🇹🇷 Turquía', fecha: '14/06/2026', hora: '00:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'E', local: '🇩🇪 Alemania', visitante: '🇨🇼 Curazao', fecha: '14/06/2026', hora: '13:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'F', local: '🇳🇱 Países Bajos', visitante: '🇯🇵 Japón', fecha: '14/06/2026', hora: '16:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'E', local: '🇨🇮 Costa de Marfil', visitante: '🇪🇨 Ecuador', fecha: '14/06/2026', hora: '19:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'F', local: '🇸🇪 Suecia', visitante: '🇹🇳 Túnez', fecha: '14/06/2026', hora: '22:00' });
    
    // 15 de Junio
    partidos.push({ id: id++, fase: 'grupos', grupo: 'H', local: '🇪🇸 España', visitante: '🇨🇻 Cabo Verde', fecha: '15/06/2026', hora: '12:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'G', local: '🇧🇪 Bélgica', visitante: '🇪🇬 Egipto', fecha: '15/06/2026', hora: '15:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'H', local: '🇸🇦 Arabia Saudita', visitante: '🇺🇾 Uruguay', fecha: '15/06/2026', hora: '18:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'G', local: '🇮🇷 Irán', visitante: '🇳🇿 Nueva Zelanda', fecha: '15/06/2026', hora: '21:00' });
    
    // 16 de Junio
    partidos.push({ id: id++, fase: 'grupos', grupo: 'I', local: '🇫🇷 Francia', visitante: '🇸🇳 Senegal', fecha: '16/06/2026', hora: '15:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'I', local: '🇮🇶 Irak', visitante: '🇳🇴 Noruega', fecha: '16/06/2026', hora: '18:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'J', local: '🇦🇷 Argentina', visitante: '🇩🇿 Argelia', fecha: '16/06/2026', hora: '21:00' });
    
    // 17 de Junio
    partidos.push({ id: id++, fase: 'grupos', grupo: 'J', local: '🇦🇹 Austria', visitante: '🇯🇴 Jordania', fecha: '17/06/2026', hora: '00:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'K', local: '🇵🇹 Portugal', visitante: '🇨🇩 RD Congo', fecha: '17/06/2026', hora: '13:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'L', local: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra', visitante: '🇭🇷 Croacia', fecha: '17/06/2026', hora: '16:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'L', local: '🇬🇭 Ghana', visitante: '🇵🇦 Panamá', fecha: '17/06/2026', hora: '19:00' });
    partidos.push({ id: id++, fase: 'grupos', grupo: 'K', local: '🇺🇿 Uzbekistán', visitante: '🇨🇴 Colombia', fecha: '17/06/2026', hora: '22:00' });
    
    // 18 de Junio
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
    for (let i = 1; i <= 16; i++) {
        partidos.push({ id: id++, fase: 'eliminatoria32', nombre: 'Eliminatoria de 32', local: 'A definir', visitante: 'A definir', fecha: `${28 + Math.floor((i-1)/4)}/06/2026`, hora: 'Por definir' });
    }
    
    // Octavos de final (8 partidos) - 4/7 al 7/7
    for (let i = 1; i <= 8; i++) {
        partidos.push({ id: id++, fase: 'octavos', nombre: 'Octavos de final', local: 'A definir', visitante: 'A definir', fecha: `${4 + Math.floor((i-1)/2)}/07/2026`, hora: 'Por definir' });
    }
    
    // Cuartos de final (4 partidos) - 9/7 al 11/7
    const fechasCuartos = ['09/07/2026', '10/07/2026', '11/07/2026', '11/07/2026'];
    for (let i = 0; i < 4; i++) {
        partidos.push({ id: id++, fase: 'cuartos', nombre: 'Cuartos de final', local: 'A definir', visitante: 'A definir', fecha: fechasCuartos[i], hora: 'Por definir' });
    }
    
    // Semifinales (2 partidos) - 14/7 y 15/7
    partidos.push({ id: id++, fase: 'semis', nombre: 'Semifinal', local: 'A definir', visitante: 'A definir', fecha: '14/07/2026', hora: '15:00' });
    partidos.push({ id: id++, fase: 'semis', nombre: 'Semifinal', local: 'A definir', visitante: 'A definir', fecha: '15/07/2026', hora: '15:00' });
    
    // Tercer puesto - 18/7
    partidos.push({ id: id++, fase: 'tercero', nombre: 'Tercer Puesto', local: 'A definir', visitante: 'A definir', fecha: '18/07/2026', hora: '17:00' });
    
    // Gran Final - 19/7
    partidos.push({ id: id++, fase: 'final', nombre: '🏆 GRAN FINAL 🏆', local: 'A definir', visitante: 'A definir', fecha: '19/07/2026', hora: '15:00' });

    // Insertar partidos
    for (const p of partidos) {
        await db.run(`INSERT INTO partidos (id, fase, grupo, local, visitante, fecha, hora, nombre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [p.id, p.fase, p.grupo, p.local, p.visitante, p.fecha, p.hora, p.nombre]);
    }
    console.log(`✅ ${partidos.length} partidos inicializados con fechas y horas reales del Mundial 2026`);
}

// ========== FUNCIÓN PARA VERIFICAR TOKEN ==========
function verificarToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }
    
    try {
        const decoded = jwt.verify(token.split(' ')[1], SECRET_KEY);
        req.usuario = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
}

// ========== RUTAS API ==========

app.get('/api/test', (req, res) => res.json({ message: 'API funcionando' }));

app.post('/api/register', async (req, res) => {
    try {
        const { username, password, fullname, email } = req.body;
        const existing = await db.get('SELECT * FROM usuarios WHERE username = ? OR email = ?', [username, email]);
        if (existing) return res.status(400).json({ error: 'Usuario o email ya existe' });
        const hash = await bcrypt.hash(password, 10);
        await db.run(`INSERT INTO usuarios (username, password, fullname, email) VALUES (?, ?, ?, ?)`,
            [username, hash, fullname, email]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('Login:', username);
        const user = await db.get('SELECT * FROM usuarios WHERE username = ?', [username]);
        if (!user) return res.status(401).json({ error: 'Usuario no existe' });
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta' });
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY);
        res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/partidos', async (req, res) => {
    try {
        const partidos = await db.all('SELECT * FROM partidos ORDER BY date(substr(fecha, 7, 4) || "-" || substr(fecha, 4, 2) || "-" || substr(fecha, 1, 2)), hora');
        res.json(partidos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/apuestas', verificarToken, async (req, res) => {
    try {
        const apuestas = await db.all('SELECT * FROM apuestas WHERE usuario_id = ?', [req.usuario.id]);
        res.json(apuestas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/resultados', async (req, res) => {
    try {
        const resultados = await db.all('SELECT * FROM resultados');
        res.json(resultados);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/apuestas/multiple', verificarToken, async (req, res) => {
    try {
        const { apuestas } = req.body;
        for (const a of apuestas) {
            await db.run(`INSERT OR REPLACE INTO apuestas (usuario_id, partido_id, goles_local, goles_visitante) VALUES (?, ?, ?, ?)`,
                [req.usuario.id, a.partidoId, a.golesLocal, a.golesVisitante]);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/ranking', async (req, res) => {
    try {
        const ranking = await db.all(`SELECT u.id, u.username, u.fullname, COALESCE(r.puntos, 0) as puntos 
            FROM usuarios u LEFT JOIN ranking r ON u.id = r.usuario_id ORDER BY puntos DESC`);
        res.json(ranking);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/usuarios', async (req, res) => {
    try {
        const usuarios = await db.all('SELECT id, username, fullname, email, role FROM usuarios');
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== INICIAR SERVIDOR ==========
async function startServer() {
    await initDB();
    app.listen(PORT, () => {
        console.log(`\n🚀 Servidor en http://localhost:${PORT}`);
        console.log(`🔐 Login: http://localhost:${PORT}/login.html`);
        console.log(`📝 Registro: http://localhost:${PORT}/register.html`);
        console.log(`🏆 Quiniela: http://localhost:${PORT}/index.html`);
        console.log(`👑 Admin: http://localhost:${PORT}/admin.html`);
        console.log(`👑 Usuario: admin / admin123\n`);
    });
}
// ========== LIMPIAR APUESTAS DE UN USUARIO (SOLO ADMIN) ==========
app.delete('/api/apuestas/usuario/:usuarioId', verificarToken, async (req, res) => {
    try {
        // Verificar que el usuario es admin
        if (req.usuario.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
        }
        
        const { usuarioId } = req.params;
        
        // Eliminar todas las apuestas del usuario
        const result = await db.run('DELETE FROM apuestas WHERE usuario_id = ?', [usuarioId]);
        
        // Recalcular el ranking del usuario (ahora tendrá 0 puntos)
        await db.run(`INSERT OR REPLACE INTO ranking (usuario_id, puntos, ultima_actualizacion) VALUES (?, 0, CURRENT_TIMESTAMP)`, [usuarioId]);
        
        res.json({ 
            success: true, 
            message: `Apuestas eliminadas para el usuario ID ${usuarioId}`,
            cambios: result.changes || 0
        });
    } catch (error) {
        console.error('Error al limpiar apuestas:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== LIMPIAR MIS PROPIAS APUESTAS ==========
app.delete('/api/apuestas/mis-apuestas', verificarToken, async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        
        // Eliminar todas las apuestas del usuario actual
        const result = await db.run('DELETE FROM apuestas WHERE usuario_id = ?', [usuarioId]);
        
        // Recalcular el ranking del usuario (ahora tendrá 0 puntos)
        await db.run(`INSERT OR REPLACE INTO ranking (usuario_id, puntos, ultima_actualizacion) VALUES (?, 0, CURRENT_TIMESTAMP)`, [usuarioId]);
        
        res.json({ 
            success: true, 
            message: `Tus apuestas han sido eliminadas`,
            cambios: result.changes || 0
        });
    } catch (error) {
        console.error('Error al limpiar apuestas:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== LIMPIAR APUESTAS DE UN USUARIO (ADMIN) ==========
app.delete('/api/apuestas/usuario/:usuarioId', verificarToken, async (req, res) => {
    try {
        if (req.usuario.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
        }
        
        const { usuarioId } = req.params;
        
        const result = await db.run('DELETE FROM apuestas WHERE usuario_id = ?', [usuarioId]);
        await db.run(`INSERT OR REPLACE INTO ranking (usuario_id, puntos, ultima_actualizacion) VALUES (?, 0, CURRENT_TIMESTAMP)`, [usuarioId]);
        
        res.json({ 
            success: true, 
            message: `Apuestas eliminadas para el usuario ID ${usuarioId}`,
            cambios: result.changes || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

startServer();