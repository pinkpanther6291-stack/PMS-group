const http = require('http');
const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/import-scored/Resume_harshita.pdf',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', res.headers);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('BODY:', data);
  });
});

req.on('error', (e) => {
  console.error('REQUEST ERROR:', e.message);
});

req.end();
