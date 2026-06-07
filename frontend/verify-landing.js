const https = require('https');
const get = (url) => new Promise((resolve, reject) => {
  https.get(url, { headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }, (res) => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
  }).on('error', reject);
});
(async () => {
  const r = await get('https://globalsupply.in/');
  console.log('Status:', r.status, '| Cache:', r.headers['x-vercel-cache']);
  const has = (s) => r.body.includes(s);
  const no = (s) => !r.body.includes(s);
  console.log('--- Landing page checks ---');
  console.log('Sign in button removed (header):', no('>Sign in</a>') || no('class="btn btn-ghost">Sign in'));
  console.log('Has lead form:', has('id="lead-form"'));
  console.log('Has name field:', has('name="name"'));
  console.log('Has email field:', has('name="email"'));
  console.log('Has company field:', has('name="company"'));
  console.log('Has plan select:', has('name="plan"'));
  console.log('Has monthlyOrders:', has('name="monthlyOrders"'));
  console.log('Has Get started navbar:', has('Get started'));
  console.log('Has Get a walkthrough:', has('Get a walkthrough'));
  console.log('Has Customer login in footer:', has('Customer login'));
  console.log('Old Start 14-day CTA removed:', no('Start 14-day free trial'));
  console.log('Old Start free trial CTAs removed:', no('>Start free trial</a>'));
  console.log('Old >Start free</a> removed:', no('>Start free</a>'));
  console.log('Old /app?signup=true removed:', no('/app?signup=true'));
  console.log('Has #contact anchor section:', has('id="contact"'));
  console.log('Has Talk to our team button:', has('Talk to our team'));
  console.log('Has form JS submit handler:', has("'lead_submitted'") || has('lead_submitted'));
  console.log('Has data-lead-source CTAs:', has('data-lead-source'));
  console.log('Footer has Customer login before Privacy:', r.body.indexOf('Customer login') < r.body.indexOf('Privacy') && r.body.indexOf('Customer login') > 0);
})();
