CREATE DATABASE IF NOT EXISTS luodacloud;
USE luodacloud;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,    -- Nombre de usuario para login
    nombre VARCHAR(100) NOT NULL,              -- Nombre completo
    email VARCHAR(150) NOT NULL UNIQUE,        -- Correo electrónico
    password_hash VARCHAR(255) NOT NULL,       -- Contraseña almacenada como hash
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Tabla de servidores de Minecraft
CREATE TABLE IF NOT EXISTS servidores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,                   -- ID del usuario que contrató el servidor
    memoria_ram INT NOT NULL,                  -- Memoria RAM asignada (en MB)
    slots INT NOT NULL,                        -- Número de jugadores (slots)
    estado VARCHAR(50) DEFAULT 'pendiente',-- Estado del servidor (pendiente, activo, etc.)
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- Tabla de pagos
CREATE TABLE IF NOT EXISTS pagos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,                   -- ID del usuario que realiza el pago
    servidor_id INT NOT NULL,                  -- ID del servidor asociado al pago
    monto DECIMAL(10,2) NOT NULL,              -- Monto del pago
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metodo_pago VARCHAR(50),                   -- Método de pago utilizado
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (servidor_id) REFERENCES servidores(id)
) ENGINE=InnoDB;