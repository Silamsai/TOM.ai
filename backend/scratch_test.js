const jwt = require('jsonwebtoken');
const ADMIN_SECRET = 'replace_with_at_least_32_chars_random_secret_here-admin'; // from env or default
const token = jwt.sign({ role: 'admin', username: 'admin@tomai.com' }, ADMIN_SECRET);

console.log('Generated Admin Token:', token);

fetch('http://localhost:5000/api/admin/ai', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(d => {
  console.log('Backend Response:', JSON.stringify(d, null, 2));
})
.catch(err => {
  console.error('Fetch Error:', err);
});
