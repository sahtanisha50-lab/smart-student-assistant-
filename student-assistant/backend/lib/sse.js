'use strict';

const userStreams = new Map(); // userId -> Set of res

function initStream(req, res) {
  const userId = req.userId || 'anon';
  res.writeHead(200, {
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
    'Content-Type': 'text/event-stream',
    'Access-Control-Allow-Origin': '*'
  });
  res.write('\n');
  if (!userStreams.has(userId)) userStreams.set(userId, new Set());
  const set = userStreams.get(userId);
  set.add(res);

  req.on('close', () => {
    set.delete(res);
    if (set.size === 0) userStreams.delete(userId);
  });
}

function sendToUser(userId, event, data) {
  const set = userStreams.get(userId);
  if (!set) return;
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  for (const res of Array.from(set)) {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${payload}\n\n`);
    } catch (err) {
      // ignore broken streams
      try { res.end(); } catch (_e) {}
      set.delete(res);
    }
  }
}

function broadcast(event, data) {
  for (const [userId, set] of userStreams.entries()) {
    sendToUser(userId, event, data);
  }
}

module.exports = { initStream, sendToUser, broadcast };
