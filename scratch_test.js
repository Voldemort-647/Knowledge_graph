const https = require('https');
require('dotenv').config();

const API_KEY = process.env.OPENROUTER_API_KEY;

const requestBody = JSON.stringify({
  model: 'qwen/qwen3-coder:free',
  messages: [{ role: 'user', content: 'Say hello world' }]
});

const options = {
  hostname: 'openrouter.ai',
  port: 443,
  path: '/api/v1/chat/completions',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'http://localhost:3000',
    'Content-Length': Buffer.byteLength(requestBody)
  }
};

const req = https.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(requestBody);
req.end();
