import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================================');
console.log('Starting CivicConnect (Backend API + Vite Frontend)...');
console.log('========================================================');

const serverProc = spawn('node', ['server/server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

const clientProc = spawn('npm', ['--prefix', 'client', 'run', 'dev'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

function cleanup() {
  console.log('\nShutting down CivicConnect processes...');
  try { serverProc.kill(); } catch (e) {}
  try { clientProc.kill(); } catch (e) {}
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
