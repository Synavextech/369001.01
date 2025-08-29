import { spawn } from 'node:child_process';

const viteProcess = spawn('vite', {
  stdio: 'inherit',
  shell: true,
});

const backendProcess = spawn('tsx', ['server/index.ts'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_ENV: 'development' },
});

viteProcess.on('close', (code) => {
  console.log(`Vite exited with code ${code}`);
  process.exit(code);
});

backendProcess.on('close', (code) => {
  console.log(`Backend exited with code ${code}`);
  process.exit(code);
});