import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting development server...');

try {
  execSync('npx tsx --version', { stdio: 'ignore' });
} catch (error) {
  console.log('Installing tsx...');
  execSync('npm install --no-save tsx@latest', { stdio: 'inherit' });
}

const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' },
  cwd: __dirname
});

serverProcess.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  process.exit(code);
});