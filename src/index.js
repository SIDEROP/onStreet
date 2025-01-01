import app from './app.js';
import { dbConnect } from './db/dbConnect.js';
import {createServer} from 'http';
import { Server } from 'socket.io';
import rtcConnection from './socket/rtcConnection.js';

// socket initialization
let server = createServer(app);
let io = new Server(server);

// server run
let serverOn = () => {
  dbConnect().then(() => {
    server
      .listen(process.env.PORT || LocalPort, () => {
        console.log(`Server is running on port ${process.env.PORT || LocalPort}`);
        socketOn();
      })
      .on('error', (error) => {
        console.error('Error starting server:', error);
        process.exit(1);
      });
  })
};
serverOn();

// socket connection
let socketOn = () => {
  io.on('connection', (socket) => {
    rtcConnection(socket,io);
  });
};

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal. Starting graceful shutdown...');
  server.close(() => {
    console.log('Server closed. Exiting process...');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT signal. Starting graceful shutdown...');
  server.close(() => {
    console.log('Server closed. Exiting process...');
    process.exit(0);
  });
});