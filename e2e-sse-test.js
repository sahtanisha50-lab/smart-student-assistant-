(async function(){
  const BASE = 'http://127.0.0.1:5001/api';
  const email = 'e2e+test@example.test';
  const password = 'Password123!';
  const { URL } = require('url');
  const http = require('http');
  const https = require('https');

  function request(url, opts = {}){
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const lib = u.protocol === 'https:' ? https : http;
      const headers = opts.headers || {};
      const body = opts.body ? JSON.stringify(opts.body) : null;
      if (body) headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      const req = lib.request(u, { method: opts.method || 'GET', headers }, res => {
        let chunks = '';
        res.on('data', c => chunks += c);
        res.on('end', () => {
          const text = chunks || '';
          const contentType = res.headers['content-type'] || '';
          let data = null;
          if (contentType.includes('application/json')) {
            try { data = JSON.parse(text); } catch(e){ data = text; }
          } else data = text;
          resolve({ status: res.statusCode, headers: res.headers, data, text });
        });
      });
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  }

  function connectSSE(url, token, onEvent){
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' }}, res => {
        res.setEncoding('utf8');
        let buf = '';
        res.on('data', chunk => {
          buf += chunk;
          let parts = buf.split('\n\n');
          while (parts.length > 1) {
            const evt = parts.shift();
            buf = parts.join('\n\n');
            const lines = evt.split('\n');
            let event = null, data = '';
            for (const l of lines) {
              if (l.startsWith('event:')) event = l.replace('event:', '').trim();
              else if (l.startsWith('data:')) data += l.replace('data:', '').trim();
            }
            if (event) onEvent(event, data);
          }
        });
        resolve(req);
      });
      req.on('error', reject);
      req.end();
    });
  }

  try{
    // login
    console.log('Logging in');
    let r = await request(`${BASE}/auth/login`, { method: 'POST', body: { email, password } });
    if (r.status >= 400) throw new Error('Login failed ' + r.status + ' ' + r.text);
    const access = r.data.accessToken || r.data.token;
    console.log('Access token length', access && access.length);

    // connect SSE
    console.log('Connecting SSE');
    await connectSSE(`${BASE}/stream`, access, (event, data) => {
      console.log('SSE:', event, data);
    });

    // create client
    console.log('Creating client');
    r = await request(`${BASE}/clients`, { method: 'POST', headers: { Authorization: `Bearer ${access}` }, body: { name: 'Client SSE', email: 'clientsse@example.test', riskScore: 12 } });
    console.log('Create status', r.status);

    // update client to trigger SSE
    const id = r.data && r.data.client && r.data.client._id;
    console.log('Updating client to trigger SSE');
    r = await request(`${BASE}/clients/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${access}` }, body: { riskScore: 88 } });
    console.log('Update status', r.status);

    // wait a bit for SSE events to be received
    await new Promise(r => setTimeout(r, 1200));
    console.log('Done');
  }catch(err){
    console.error('E2E sse error', err.message || err);
    process.exitCode = 2;
  }
})();
