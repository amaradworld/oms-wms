const axios = require('axios');
(async () => {
  console.log('1. Submit a new lead (should trigger email)...');
  const r = await axios.post('https://oms-wms.onrender.com/api/leads', {
    name: 'Email Test Lead',
    email: 'email-test-' + Date.now() + '@example.com',
    company: 'EmailTest Co',
    phone: '+91 88888 88888',
    monthlyOrders: '5k-25k',
    plan: 'enterprise',
    message: 'This lead was created by the test script to verify email notifications',
    source: 'plan_enterprise'
  }, { headers: { 'Content-Type': 'application/json' } });
  console.log('   Lead created:', r.data.id, r.data.message);

  // Wait a bit for the email to fire (fire-and-forget)
  await new Promise(r => setTimeout(r, 3000));

  console.log('\n2. Login as platform owner and send digest...');
  const login = await axios.post('https://oms-wms.onrender.com/api/auth/login', { email: 'owner@supplyhub.com', password: 'owner123' });
  const token = login.data.token;

  const digest = await axios.post('https://oms-wms.onrender.com/api/leads/digest?hours=168', {}, { headers: { Authorization: 'Bearer ' + token } });
  console.log('   Digest response:', JSON.stringify(digest.data, null, 2));

  console.log('\n3. Try digest as non-platform user (should 403)...');
  const infi = await axios.post('https://oms-wms.onrender.com/api/auth/login', { email: 'admin@infi.com', password: 'admin123', tenantId: 'tenant-1' });
  try {
    await axios.post('https://oms-wms.onrender.com/api/leads/digest', {}, { headers: { Authorization: 'Bearer ' + infi.data.token } });
    console.log('   BAD: infi admin could send digest');
  } catch (e) {
    console.log('   Blocked:', e.response.status, e.response.data.message);
  }
})();
