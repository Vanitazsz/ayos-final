import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

const forbidden = [
  /Juan Dela Cruz|juan\.delacruz|✓\s*Verified User/g,
  /(?:otp|verificationCode)\s*[:=]\s*['"]123456['"]/gi,
  /setTimeout\s*\([^)]*(?:login|authenticated)/gi,
  /MacBook Pro|iPhone 13|New York, USA|192\.168\.1\.|10\.0\.0\.99/g,
  /Last changed 45 days ago|Enabled via Authenticator/g,
  /\?\?\s*['"](?:Administrator|Customer|Worker|Account|System)['"]/g,
  /bookings\s*:\s*0\b|status\s*:\s*['"]Success['"]/g,
  /having an issue with my recent booking/g,
];
const failures = [];

async function visit(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const target = join(path, entry.name);
    if (entry.isDirectory()) await visit(target);
    else if (['.js', '.jsx', '.ts', '.tsx'].includes(extname(entry.name))) {
      const source = await readFile(target, 'utf8');
      for (const pattern of forbidden) {
        pattern.lastIndex = 0;
        if (pattern.test(source)) failures.push(`${target}: ${pattern.source}`);
      }
    }
  }
}

await visit('src');
if (failures.length) {
  console.error(`Production mock regression check failed:\n${failures.join('\n')}`);
  process.exit(1);
}
console.log('No prohibited administrator profile or business mocks found.');
