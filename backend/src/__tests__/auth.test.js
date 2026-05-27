const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('Auth utilities', () => {
  it('should hash and compare passwords correctly', async () => {
    const password = 'test123';
    const hash = await bcrypt.hash(password, 10);
    const valid = await bcrypt.compare(password, hash);
    expect(valid).toBe(true);
    const invalid = await bcrypt.compare('wrong', hash);
    expect(invalid).toBe(false);
  });

  it('should sign and verify JWT tokens', () => {
    const payload = { id: '1', tenant_id: 't1', role: 'SUPER_ADMIN' };
    const secret = 'test-secret';
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    const decoded = jwt.verify(token, secret);
    expect(decoded.id).toBe('1');
    expect(decoded.tenant_id).toBe('t1');
    expect(decoded.role).toBe('SUPER_ADMIN');
  });
});
