import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const domainByExport: Record<string, string> = {
  activateSubscription: 'subscriptions',
  cancelBookingAsAdmin: 'bookings',
  cancelSubscription: 'subscriptions',
  createCampaign: 'notifications',
  deleteCampaign: 'notifications',
  downloadReport: 'reports',
  extendSubscription: 'subscriptions',
  generateReport: 'reports',
  loadAnalytics: 'analytics',
  loadBookings: 'bookings',
  loadCatalog: 'catalog',
  loadCustomerVerifications: 'users',
  loadDashboard: 'dashboard',
  loadMostBookedService: 'catalog',
  loadNotifications: 'notifications',
  loadPayments: 'payments',
  loadReports: 'reports',
  loadReviews: 'reviews',
  loadSafetyCases: 'support',
  loadSettings: 'settings',
  loadSubdivisions: 'subdivisions',
  loadSubscriptions: 'subscriptions',
  loadSupport: 'support',
  loadTrash: 'trash',
  loadUsers: 'users',
  loadWorkerEarnings: 'analytics',
  loadWorkers: 'workers',
  moderateReview: 'reviews',
  permanentlyDeleteTrash: 'trash',
  publishCampaign: 'notifications',
  reassignBookingAsAdmin: 'bookings',
  restoreTrash: 'trash',
  reviewCustomerVerification: 'users',
  reviewWorker: 'workers',
  saveCategory: 'catalog',
  saveService: 'catalog',
  saveSetting: 'settings',
  saveSubdivision: 'subdivisions',
  saveSubscriptionPlan: 'subscriptions',
  sendSupportReply: 'support',
  setAccountStatus: 'accounts',
  setWorkerAvailability: 'workers',
  softDeleteAccount: 'accounts',
  subscribe: 'realtime',
  updateSupport: 'support',
  updateUser: 'users',
};

export function adminDomainForExport(name: string): string {
  const domain = domainByExport[name];
  if (!domain) throw new Error(`No Admin domain mapping for ${name}`);
  return domain;
}

function declarationName(statement: ts.Statement): string | null {
  if (ts.isFunctionDeclaration(statement)) return statement.name?.text ?? null;
  if (ts.isVariableStatement(statement)) {
    const declaration = statement.declarationList.declarations[0];
    return declaration && ts.isIdentifier(declaration.name) ? declaration.name.text : null;
  }
  return null;
}

function isExported(statement: ts.Statement): boolean {
  return Boolean(
    statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword),
  );
}

export function splitAdminData(root: string): number {
  const relative = 'apps/admin/src/services/adminData.js';
  const absolute = path.join(root, relative);
  const content = readFileSync(absolute, 'utf8');
  const source = ts.createSourceFile(
    relative,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const grouped = new Map<string, string[]>();
  for (const statement of source.statements) {
    if (!isExported(statement)) continue;
    const name = declarationName(statement);
    if (!name) continue;
    const domain = adminDomainForExport(name);
    const declarations = grouped.get(domain) ?? [];
    declarations.push(statement.getText(source));
    grouped.set(domain, declarations);
  }

  const serviceRoot = path.dirname(absolute);
  for (const [domain, declarations] of grouped) {
    const target = path.join(serviceRoot, `${domain}.js`);
    const existing = ['accounts', 'auditLogs'].includes(domain)
      ? `${readFileSync(target, 'utf8')
          .replace(/^import .*?;\s*/gm, '')
          .trim()}\n\n`
      : '';
    const body = declarations.join('\n\n');
    const dependencies = ['supabase', 'money', 'status', 'identity', 'accountName']
      .filter((name) => new RegExp(`\\b${name}\\b`).test(body))
      .join(', ');
    const imports = dependencies ? `import { ${dependencies} } from './adminShared';\n\n` : '';
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, `${imports}${existing}${body}\n`);
  }

  writeFileSync(
    path.join(serviceRoot, 'adminShared.js'),
    `import { supabase } from '../lib/supabase';

export { supabase };
export const money = (value) =>
  \`₱\${Number(value ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`;
export const status = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\\b\\w/g, (letter) => letter.toUpperCase());
export const identity = (value, context) => {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(\`\${context} profile is incomplete\`);
  return value.trim();
};
export const accountName = (account) =>
  account?.user_profiles?.display_name ??
  account?.worker_profiles?.display_name ??
  account?.admin_profiles?.display_name ??
  null;
`,
  );

  const compatibilityDomains = [...new Set([...grouped.keys(), 'auditLogs'])].sort();
  writeFileSync(
    absolute,
    `${compatibilityDomains.map((domain) => `export * from './${domain}';`).join('\n')}\n`,
  );
  return grouped.size;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
  }).trim();
  console.info(`Split Admin data into ${splitAdminData(root)} domain service(s).`);
}
