const https = require('https');
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlYjMxNGVhMC02ZjgxLTRhNzQtOWU1NC1kZGY2MDg1ZjUxMmEiLCJlbWFpbCI6ImNtakBvdXRvcy5jbiIsInJvbGUiOiJWSUVXRVIiLCJvcmdJZCI6ImRjMGZjYjA2LTUwNjgtNGQ0OC1iMDExLTQ5MDA3OWQzY2M2MCIsInR5cGUiOiJhY2Nlc3MiLCJzdmMiOnRydWUsImV4cCI6MTc3Njc5NTg5MSwiaWF0IjoxNzc0MjAzODkxfQ.9geLY-xl27KNIA-2VugfBMRUhTgQcEv-90AR9QwdL8M';
const options = {
  hostname: 'autos.zhijiucity.com',
  port: 51012,
  path: '/api/playground/sessions',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
};
const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data+=chunk);
  res.on('end', () => console.log(data));
});
req.write(JSON.stringify({title: 'new session'}));
req.end();