import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyzeContent } from './analyze-repository.js';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();

function tracked(pattern: string): string[] {
  return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', pattern], {
    cwd: root,
    encoding: 'utf8',
  })
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((file) => existsSync(path.join(root, file)));
}

function source(file: string): string {
  return readFileSync(path.join(root, file), 'utf8');
}

describe('logic and presentation boundaries', () => {
  it('keeps Expo route files as thin adapters without data access or styles', () => {
    const violations = tracked('apps/mobile/app')
      .filter((file) => file.endsWith('.tsx'))
      .map((file) => ({ file, analysis: analyzeContent(source(file)) }))
      .filter(
        ({ analysis }) =>
          analysis.lineCount > 20 ||
          analysis.hasDatabaseCall ||
          analysis.hasDirectApiCall ||
          analysis.hasStyleSheet,
      )
      .map(({ file, analysis }) => ({
        file,
        lines: analysis.lineCount,
        database: analysis.hasDatabaseCall,
        api: analysis.hasDirectApiCall,
        styles: analysis.hasStyleSheet,
      }));

    expect(violations).toEqual([]);
  });

  it('keeps Admin route pages as thin adapters without data access', () => {
    const violations = tracked('apps/admin/src/pages/**/*.jsx')
      .map((file) => ({ file, analysis: analyzeContent(source(file)) }))
      .filter(
        ({ analysis }) =>
          analysis.lineCount > 50 || analysis.hasDatabaseCall || analysis.hasDirectApiCall,
      )
      .map(({ file, analysis }) => ({
        file,
        lines: analysis.lineCount,
        database: analysis.hasDatabaseCall,
        api: analysis.hasDirectApiCall,
      }));

    expect(violations).toEqual([]);
  });

  it('keeps feature-screen styles in adjacent style modules', () => {
    const violations = tracked('apps/mobile/features')
      .filter((file) => /\/screens\/.*\.tsx$/.test(file))
      .filter((file) => analyzeContent(source(file)).hasStyleSheet);

    expect(violations).toEqual([]);
  });

  it('keeps mobile screens and Admin pages as controller/view adapters', () => {
    const mobileViolations = tracked('apps/mobile/features')
      .filter((file) => /\/screens\/.*Screen\.tsx$/.test(file))
      .filter(
        (file) =>
          analyzeContent(source(file)).lineCount > 20 ||
          /\buse(?:State|Effect|Memo|Callback|Ref)\b/.test(source(file)),
      );
    const adminViolations = tracked('apps/admin/src/features')
      .filter((file) => /\/pages\/.*Page\.jsx$/.test(file))
      .filter(
        (file) =>
          analyzeContent(source(file)).lineCount > 10 ||
          /\buse(?:State|Effect|Memo|Callback|Ref)\b/.test(source(file)),
      );

    expect([...mobileViolations, ...adminViolations]).toEqual([]);
  });

  it('keeps data and integration modules out of presentation views', () => {
    const views = [
      ...tracked('apps/mobile/features').filter((file) => file.endsWith('.view.tsx')),
      ...tracked('apps/admin/src/features').filter((file) => file.endsWith('.view.jsx')),
    ];
    const violations = views.filter((file) =>
      /(?:@\/services\/|@\/repositories\/|@\/lib\/supabase|\/services\/|\/lib\/supabase)/.test(
        source(file),
      ),
    );

    expect(violations).toEqual([]);
  });

  it('keeps mobile feature controllers free of rendered JSX', () => {
    const violations = tracked('apps/mobile/features')
      .filter((file) => /\/hooks\/use.*Controller\.tsx$/.test(file))
      .concat(
        tracked('apps/mobile/features')
          .filter((file) => /\/hooks\/use.*Controller\.ts$/.test(file))
          .filter((file) => /(?:Screen\.styles|\.view)|return\s*\(\s*</.test(source(file))),
      );

    expect(violations).toEqual([]);
  });

  it('prevents presentation components from importing data clients', () => {
    const violations = [
      ...tracked('apps/mobile/components/**/*.tsx'),
      ...tracked('apps/mobile/features/**/*.tsx'),
      ...tracked('apps/admin/src/components/**/*.jsx'),
      ...tracked('apps/admin/src/features/**/*.jsx'),
    ].filter((file) =>
      /(?:lib\/supabase|authenticatedFunctions|services\/api|services\/adminData)/.test(
        source(file),
      ),
    );

    expect(violations).toEqual([]);
  });

  it('uses one request-state source and one mobile button/input family', () => {
    const allMobileSources = tracked('apps/mobile')
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .map((file) => source(file))
      .join('\n');

    expect(allMobileSources).not.toContain('@/context/RequestContext');
    expect(allMobileSources).not.toContain('@/components/buttons/Button');
    expect(allMobileSources).not.toContain('@/components/inputs/TextInput');
  });
});
