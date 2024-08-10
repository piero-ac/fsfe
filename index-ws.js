const express = require('express');
const server = require('http').createServer();
const app = express();

app.get('/', function(req, res) {
    res.sendFile('index.html', {root: __dirname});
});

server.on('request', app);
server.listen(3000, function() { console.log('server started on port 3000'); });




/** Begin websocket */
const WebSocketServer = require('ws').Server;

const wss = new WebSocketServer({server: server});

process.on('SIGINT', () => {
  console.log('Received SIGINT. Shutting down gracefully...');
  wss.clients.forEach(function each(client) {
      client.close();
  });
  console.log('server shutdown')
  server.close(() => {
      shutdownDB(() => {
          console.log('Server and database shut down.');
          process.exit(0);
      });
  });
});

wss.on('connection', function connection(ws) {
    const numClients = wss.clients.size;
    console.log('Clients connected', numClients);

    wss.broadcast(`Current visitors: ${numClients}`);

    if (ws.readyState === ws.OPEN) {
        ws.send('Welcome to my server');
    }

    db.run(`INSERT INTO visitors (count, time)
        VALUES (${numClients}, datetime('now'))
    `);

    ws.on('close', function close() {
        wss.broadcast(`Current visitors: ${numClients}`);
        console.log('A client has disconnected');
    });

});

wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
        client.send(data);
    });
}

/** end websockets */
/** begin database */
const sqlite = require('sqlite3');
const db = new sqlite.Database(':memory:');

db.serialize(() => {
    db.run(`
        CREATE TABLE visitors (
            count INTEGER,
            time TEXT
        )
    `)
});

function getCounts() {
  return new Promise((resolve, reject) => {
      db.all("SELECT * FROM visitors", (err, rows) => {
          if (err) {
              console.error('Error getting counts:', err);
              reject(err);
          } else {
              console.log(rows);
              resolve(rows);
          }
      });
  });
}

async function shutdownDB(callback) {
  console.log('Shutting down db');
  try {
      await getCounts();
  } catch (err) {
      console.error('Error getting final counts:', err);
  }
  db.close((err) => {
      if (err) {
          console.error('Error closing the database:', err);
      }
      callback();
  });
}