const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const {exec} = require('child_process');
const session = require('express-session');
const path = require('path');
const fs = require('fs');


const app = express();
const PORT = 3000;

// Middleware para parsear JSON y datos de formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));


app.use(session({
  secret: 'tu_secreto_seguo', // Cambia esto por un secreto seguro
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Usa true si tienes HTTPS
}));



// Configuración de la conexión a MySQL
const pool = mysql.createPool({
  connectionLimit: 30,
  host: 'localhost',
  user: 'root',
  password: 'Alemcraft-34',  // Reemplaza 'tu_contraseña' con tu contraseña real
  database: 'luodacloud'
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// Función para crear un servidor de Minecraft usando Docker
// Función para crear un servidor de Minecraft usando Docker
function crearServidorMinecraft(memoria_ram, slots, servidorId, puerto) {
  // Asegurarse de que el puerto es válido
  if (!puerto || isNaN(puerto)) {
    console.error(`Error: puerto no válido: ${puerto}`);
    return;
  }

  // Crear el comando Docker con un puerto válido
  const comando = `docker run -d -e EULA=TRUE -e MAX_PLAYERS=${slots} -e MEMORY=${memoria_ram}M -e SERVER_PORT=${puerto} -p ${puerto}:${puerto} --name minecraft_server_${servidorId} itzg/minecraft-server`;

  exec(comando, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error ejecutando Docker: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
    
    // Cambiar el estado del servidor a 'activo' en la base de datos
    pool.query('UPDATE servidores SET estado = ? , puerto = ? WHERE id = ?', ['activo', puerto , servidorId], (error, results) => {
      if (error) {
        console.error(error);
      } else {
        console.log(`Servidor ${servidorId} activado y desplegado en Docker en el puerto ${puerto}`);
      }
    });
  });
}


// Función para verificar si hay servidores pendientes
function verificarServidoresPendientes() {
  pool.query('SELECT * FROM servidores WHERE estado = "pendiente"', (error, results) => {
    if (error) {
      console.error(error);
      return;
    }

    results.forEach(servidor => {
      // Verificar si el servidor ya está activo antes de crear un nuevo contenedor
      pool.query('SELECT * FROM servidores WHERE id = ? AND estado = "activo"', [servidor.id], (error, activeResults) => {
        if (error) {
          console.error(error);
          return;
        }
        
        if (activeResults.length === 0) {
          // Si el servidor está pendiente y no activo, creamos el contenedor con un puerto dinámico
          const puerto = 25565 + servidor.id; // Asigna un puerto único basado en el servidor_id
          if (puerto && !isNaN(puerto)) {  // Verifica que el puerto sea un número válido
            crearServidorMinecraft(servidor.memoria_ram, servidor.slots, servidor.id, puerto);
          } else {
            console.error(`Error: El puerto para el servidor ${servidor.id} no es válido.`);
          }
        }
      });
    });
  });
}

//function cambiarEstadoServer(){}




setInterval(verificarServidoresPendientes, 10000);
//setInterval(cambiarEstadoServer , 150000);




// Endpoint para registrar un usuario
app.post('/register', (req, res) => {
  const {username, nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  // Nota: En producción, nunca almacenes la contraseña en texto plano. Utiliza hashing (bcrypt, etc.).
  const query = 'INSERT INTO usuarios (username , nombre, email, password_hash) VALUES (?, ?, ?, ?)';
  pool.query(query, [username ,nombre, email, password], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error al registrar el usuario' });
    }
    res.redirect('index.html');
  });
});

// Endpoint para logear un usuario
app.post('/login', (req, res) => {
    const { nombre, password } = req.body;
    
    if (!nombre || !password) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    
    // Consulta en la BBDD para verificar el usuario
    const query = 'SELECT * FROM usuarios WHERE username = ?';
    pool.query(query, [nombre], (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error en el servidor' });
      }
      if (results.length === 0) {
        return res.status(401).json({ error: 'Usuario no encontrado' });
      }
      
      const user = results[0];
      // Aquí deberías comparar el password recibido con el almacenado (usando hash y bcrypt, por ejemplo)
      if (password !== user.password_hash) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
      }

      req.session.userId = user.id;
      
      // Si la verificación es exitosa, redirigir o responder con un mensaje de éxito
      //res.json({ mensaje: 'Inicio de sesión exitoso' });
      res.redirect('/contratar.html');
    });
  });
  

  // Endpoint para contratar un servidor de Minecraft
app.post('/contratar-servidor', (req, res) => {
    const userId = req.session.userId; // Obtener el userId de la sesión
    const { memoria_ram, slots } = req.body;
  
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    if (!memoria_ram || !slots) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
  
    const query = 'INSERT INTO servidores (usuario_id, memoria_ram, slots, estado) VALUES (?, ?, ?, ?)';
    pool.query(query, [userId, memoria_ram, slots, 'pendiente'], (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error al contratar el servidor' });
      }
      res.redirect('/miserver.html');
    });
});

app.get('/miserver.html', (req, res) => {
  const userId = req.session.userId;  // Asegúrate de que el userId esté disponible en la sesión
  if (!userId) {
    return res.redirect('/login');  // Redirige si no hay sesión activa
  }

  // Consulta a la base de datos para obtener los servidores del usuario
  const query = 'SELECT * FROM servidores WHERE usuario_id = ?';
  pool.query(query, [userId], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error al obtener los servidores' });
    }

    res.render('miserver', { servidores: results });
  });
});
// Levantar el servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor en ejecución en http://localhost:${PORT}`);
});
// Función para obtener el rendimiento de Docker
function getDockerStats() {
  return new Promise((resolve, reject) => {
      exec('docker stats --no-stream --format "{{.Name}}: {{.CPUPerc}}, {{.MemUsage}}, {{.MemPerc}}, {{.NetIO}}"', (error, stdout, stderr) => {
          if (error) {
              reject(`Error al obtener stats de Docker: ${error.message}`);
          }
          if (stderr) {
              reject(`stderr: ${stderr}`);
          }
          resolve(stdout);
      });
  });
}

// Función para guardar los datos en un archivo
function saveStatsToFile(stats) {
  const timestamp = new Date().toISOString();
  const dataToSave = `${timestamp}\n${stats}\n`;

  // Verificar si el archivo existe
  fs.exists('docker_stats.txt', (exists) => {
      if (!exists) {
          // Si el archivo no existe, lo crea vacío
          fs.writeFile('docker_stats.txt', '', (err) => {
              if (err) throw err;
              console.log('Archivo docker_stats.txt creado');
          });
      }

      // Leer el archivo actual y agregar nuevo contenido
      fs.readFile('docker_stats.txt', 'utf8', (err, data) => {
          if (err) throw err;

          // Dividir los datos en líneas
          let lines = data.split('\n').filter(line => line.trim() !== '');

          // Agregar el nuevo dato
          lines.push(dataToSave);

          // Limitar a 50 líneas
          if (lines.length > 50) {
              lines.shift();  // Eliminar la línea más antigua
          }

          // Guardar los datos actualizados en el archivo
          fs.writeFile('docker_stats.txt', lines.join('\n'), (err) => {
              if (err) throw err;
              console.log('Datos guardados en docker_stats.txt');
          });
      });
  });
}

// Función principal que obtiene los datos y los guarda cada intervalo
function recordStatsPeriodically(intervalMs) {
  setInterval(async () => {
      try {
          const stats = await getDockerStats();
          saveStatsToFile(stats);
      } catch (error) {
          console.error('Error al obtener los datos de Docker:', error);
      }
  }, intervalMs);
}

// Iniciar la grabación periódica cada 2 segundos (2000 ms)
recordStatsPeriodically(2000);