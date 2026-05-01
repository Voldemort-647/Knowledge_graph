const https = require('https');

https.get('https://openrouter.ai/api/v1/models', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const models = JSON.parse(data).data;
    const freeModels = models.filter(m => m.pricing && m.pricing.prompt === '0' && m.pricing.completion === '0');
    console.log(freeModels.map(m => m.id).join('\n'));
  });
});
