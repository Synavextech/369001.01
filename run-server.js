
const { execSync } = require('child_process');
try {
  execSync('npm list tsx', { stdio: 'ignore' });
} catch {
  console.log('Installing tsx...');
  execSync('npm install tsx', { stdio: 'inherit' });
}

const { spawn } = require('child_process');
const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

server.on('close', (code) => {
  process.exit(code);
});