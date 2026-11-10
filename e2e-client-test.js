(async function(){
  const BASE = 'http://127.0.0.1:5001/api';
  const email = 'e2e+test@example.test';
  const password = 'Password123!';
  const name = 'E2E Tester';
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

  try{
    // ensure user exists
    console.log('Registering user (if not exists)');
    let r = await request(`${BASE}/auth/register`, { method: 'POST', body: { name, email, password } });
    if (r.status === 201) console.log('User registered');
    else if (r.status === 409) console.log('User exists');
    else console.log('Register response', r.status);

    // login
    console.log('Logging in');
    r = await request(`${BASE}/auth/login`, { method: 'POST', body: { email, password } });
    if (r.status >= 400) throw new Error('Login failed ' + r.status + ' ' + r.text);
    const access = r.data.accessToken || r.data.token;
    console.log('Access token length', access && access.length);

    // create client
    console.log('Creating client');
    r = await request(`${BASE}/clients`, { method: 'POST', headers: { Authorization: `Bearer ${access}` }, body: { name: 'Client A', email: 'clienta@example.test', riskScore: 42 } });
    console.log('Create status', r.status, r.data);

    // list clients
    console.log('Listing clients');
    r = await request(`${BASE}/clients`, { method: 'GET', headers: { Authorization: `Bearer ${access}` } });
    console.log('List status', r.status, 'clients:', Array.isArray(r.data.clients) ? r.data.clients.length : JSON.stringify(r.data));
    console.log('Sample:', r.data.clients && r.data.clients[0]);
  }catch(err){
    console.error('E2E client error', err.message || err);
    process.exitCode = 2;
  }
})();
