(async function(){
  const BASE = 'http://127.0.0.1:5001/api';
  const name = 'E2E Tester';
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

  try {
    console.log('Registering...');
    let r = await request(`${BASE}/auth/register`, { method: 'POST', body: { name, email, password } });
    if (r.status === 409) {
      console.log('User exists — will login');
    } else if (r.status >= 400) {
      throw new Error('Register failed: ' + r.status + ' ' + r.text);
    } else {
      console.log('Registered');
    }

    console.log('Logging in...');
    r = await request(`${BASE}/auth/login`, { method: 'POST', body: { email, password } });
    if (r.status >= 400) throw new Error('Login failed: ' + r.status + ' ' + r.text);
    const loginData = r.data || {};
    const access = loginData.accessToken || loginData.token || loginData.access_token;
    if (!access) throw new Error('No access token returned from login');
    console.log('Login succeeded, token length:', access.length);

    console.log('Creating note...');
    r = await request(`${BASE}/notes`, { method: 'POST', headers: { Authorization: `Bearer ${access}` }, body: { title: 'E2E note ' + Date.now() } });
    if (r.status >= 400) throw new Error('Create note failed: ' + r.status + ' ' + r.text);
    console.log('Create note response:', JSON.stringify(r.data));

    console.log('Fetching notes...');
    r = await request(`${BASE}/notes`, { method: 'GET', headers: { Authorization: `Bearer ${access}` } });
    if (r.status >= 400) throw new Error('Fetch notes failed: ' + r.status + ' ' + r.text);
    const notes = r.data;
    console.log('Notes response:', JSON.stringify(notes));
    console.log('E2E smoke test passed');
  } catch (err) {
    console.error('E2E test error:', err.message);
    process.exitCode = 2;
  }
})();
