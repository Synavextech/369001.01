import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

console.log('🚀 Starting ProMo-G Development Server...');

// Start backend first
console.log('📡 Starting backend server on port 5000...');
const backendProcess = spawn('tsx', ['server/index.ts'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PORT: '5000',
    USE_DATABASE: 'true'
  },
});

// Wait for backend to start, then start frontend
await setTimeout(3000);

console.log('🎨 Starting frontend server on port 3000...');
const viteProcess = spawn('vite', {
  stdio: 'inherit',
  shell: true,
});

// Handle graceful shutdown
const cleanup = () => {
  console.log('\n🛑 Shutting down servers...');
  backendProcess.kill('SIGTERM');
  viteProcess.kill('SIGTERM');
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

viteProcess.on('close', (code) => {
  console.log(`Vite exited with code ${code}`);
  backendProcess.kill('SIGTERM');
  process.exit(code);
});

backendProcess.on('close', (code) => {
  console.log(`Backend exited with code ${code}`);
  viteProcess.kill('SIGTERM');
  process.exit(code);
});

backendProcess.on('error', (error) => {
  console.error('Backend process error:', error);
  cleanup();
});

viteProcess.on('error', (error) => {
  console.error('Vite process error:', error);
  cleanup();
});

console.log('✅ Development servers starting...');
console.log('📱 Frontend: http://localhost:3000');
console.log('🔧 Backend: http://localhost:5000');