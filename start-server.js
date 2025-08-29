require('esbuild-register/dist/node').register({
  target: 'node20',
  format: 'esm'
});

process.env.NODE_ENV = 'development';

require('./server/index.ts');