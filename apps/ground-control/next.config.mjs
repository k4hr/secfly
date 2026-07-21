const developmentScriptException = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'self' 'unsafe-inline'${developmentScriptException}; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
  },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), usb=()' },
];

export default {
  ...(process.env.SECFLY_STANDALONE_BUILD === 'true' ? { output: 'standalone' } : {}),
  allowedDevOrigins: ['127.0.0.1'],
  poweredByHeader: false,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
