#!/usr/bin/env node
import { spawn } from 'child_process';

function normalizeDatabaseUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    const protocolIdx = rawUrl.indexOf('://');
    if (protocolIdx === -1) return rawUrl;
    const protocol = rawUrl.substring(0, protocolIdx + 3);
    const rest = rawUrl.substring(protocolIdx + 3);
    const atIdx = rest.lastIndexOf('@');
    if (atIdx === -1) return rawUrl;
    const userPass = rest.substring(0, atIdx);
    const hostRest = rest.substring(atIdx + 1);
    const colonIdx = userPass.indexOf(':');
    if (colonIdx === -1) return rawUrl;
    const user = userPass.substring(0, colonIdx);
    const pass = userPass.substring(colonIdx + 1);
    return `${protocol}${encodeURIComponent(decodeURIComponent(user))}:${encodeURIComponent(decodeURIComponent(pass))}@${hostRest}`;
  } catch {
    return rawUrl;
  }
}

const args = process.argv.slice(2);
const env = { ...process.env };
if (env.DATABASE_URL) {
  env.DATABASE_URL = normalizeDatabaseUrl(env.DATABASE_URL);
}

const child = spawn('npx', ['prisma', ...args], {
  stdio: 'inherit',
  env,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
