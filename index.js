import app from './src/app.js';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createServer } from 'node:http';

dotenv.config();

const PORT = process.env.PORT || 3010;
const server = createServer(app);
const io = new Server(
  server, {
    cors: { 
      origin: "*"
    }
  }
);

app.set('io', io);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📁 Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(`WebSockets (Socket.io) activos.`);
});