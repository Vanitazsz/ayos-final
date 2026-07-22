import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

const roots = ['app', 'services', 'store', 'components'];
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
const forbidden = [
  /Juan Dela Cruz|juan\.delacruz|juan@example\.com|09171234567/g,
  /✓\s*Verified User|Verified User/g,
  /login\s*:\s*\(userData\)|login\(\{\s*id\s*:/g,
  /isAuthenticated\s*:\s*true/g,
  /(?:otp|verificationCode)\s*[:=]\s*['"]123456['"]/gi,
  /A-yos User|A-YOS User|A-YOS Worker/g,
  /Assigned worker|Verified worker(?!s)|Verified service professional/g,
  /\?\?\s*['"](?:Customer|Worker|Booking participant|Service professional)['"]/g,
  /unread\s*:\s*0\b/g,
  /portfolioImages\s*:\s*\[\]/g,
  /Distance calculated at matching|Route ETA on booking|Within service area/g,
  /Switch to (?:Worker|User)|switch_active_role|enable_secondary_role|get_my_role_context/g,
];
const failures = [];

async function visit(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const target = join(path, entry.name);
    if (entry.isDirectory()) await visit(target);
    else if (extensions.has(extname(entry.name))) {
      const source = await readFile(target, 'utf8');
      if (/app[\\/]+\(auth\)[\\/]+login\.[jt]sx?$/.test(target) && /setTimeout\s*\(/.test(source)) {
        failures.push(`${target}: fake authentication delay`);
      }
      if (/app[\\/]+\(tabs\)[\\/]+profile\.[jt]sx?$/.test(target) && /source\s*=\s*['"]https?:\/\//.test(source)) {
        failures.push(`${target}: remote hardcoded profile image`);
      }
      for (const pattern of forbidden) {
        pattern.lastIndex = 0;
        if (pattern.test(source)) failures.push(`${target}: ${pattern.source}`);
      }
    }
  }
}

for (const root of roots) await visit(root);
if (failures.length) {
  console.error(`Production mock regression check failed:\n${failures.join('\n')}`);
  process.exit(1);
}
console.log('No prohibited production identity or aggregate mocks found.');
