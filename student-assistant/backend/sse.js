'use strict';

const clients = new Set();

function sseHandler(req, res) {
  // set headers for SSE
  res.writeHead(200, {
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
    'Content-Type': 'text/event-stream',
    'Access-Control-Allow-Origin': '*'
  });
  res.write('\n');
  clients.add(res);

  req.on('close', () => {
    clients.delete(res);
  });
}

function broadcast(event, data) {
  const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
  for (const res of Array.from(clients)) {
    try {
      res.write(payload);
    } catch (err) {
      clients.delete(res);
    }
  }
}

module.exports = { sseHandler, broadcast };
