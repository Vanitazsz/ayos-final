import { describe, expect, it } from 'vitest';
import {
  analyzeContent,
  buildInventoryRecord,
  chunkFiles,
  findCycles,
} from './analyze-repository.js';
import { routeScreenTarget } from './extract-route-screens.js';
import { extractStyleModule } from './extract-screen-styles.js';
import { extractLogicGateway } from './extract-screen-logic.js';
import { migrateApiImports } from './migrate-mobile-api-imports.js';
import { extractMobileScreenController } from './extract-mobile-screen-controllers.js';

describe('analyzeContent', () => {
  it('detects responsibility violations without counting harmless text', () => {
    const result = analyzeContent(`
      import { StyleSheet } from 'react-native';
      import { supabase } from '@/lib/supabase';
      type Unsafe = Record<string, any>;
      const styles = StyleSheet.create({ card: { color: '#ff0000' } });
      export const load = () => supabase.from('bookings').select('*');
    `);

    expect(result).toMatchObject({
      hasDatabaseCall: true,
      hasDirectApiCall: false,
      hasStyleSheet: true,
      hardcodedColorCount: 1,
      anyCount: 1,
      tsIgnoreCount: 0,
      disabledLintCount: 0,
    });
    expect(result.databaseTables).toEqual(['bookings']);
  });
});

describe('buildInventoryRecord', () => {
  it('flags a styled route with raw database access for refactoring', () => {
    const record = buildInventoryRecord(
      'apps/mobile/app/booking/[id].tsx',
      `import { StyleSheet } from 'react-native';\n` +
        `supabase.from('bookings').select('*');\n` +
        `const styles = StyleSheet.create({});\n`,
    );

    expect(record.type).toBe('ROUTE');
    expect(record.feature).toBe('bookings');
    expect(record.risk).toBe('HIGH');
    expect(record.problems).toContain('Raw database access in route');
    expect(record.problems).toContain('Route owns presentation styles');
    expect(record.status).toBe('PENDING');
  });

  it('classifies tests, generated code, configuration, and legacy code safely', () => {
    expect(buildInventoryRecord('apps/mobile/services/auth.test.ts', '').status).toBe('TEST FILE');
    expect(buildInventoryRecord('packages/supabase/src/database.generated.ts', '').status).toBe(
      'GENERATED — DO NOT EDIT',
    );
    expect(buildInventoryRecord('apps/mobile/tsconfig.json', '{}').status).toBe(
      'CONFIGURATION FILE',
    );
    expect(buildInventoryRecord('backend/src/app.ts', '').status).toBe(
      'DEPRECATED — SAFE REMOVAL PROPOSED',
    );
  });
});

describe('findCycles', () => {
  it('returns each import cycle once', () => {
    const cycles = findCycles(
      new Map([
        ['a.ts', ['b.ts']],
        ['b.ts', ['c.ts']],
        ['c.ts', ['a.ts']],
        ['leaf.ts', []],
      ]),
    );

    expect(cycles).toEqual([['a.ts', 'b.ts', 'c.ts', 'a.ts']]);
  });
});

describe('chunkFiles', () => {
  it('creates complete migration sub-batches with no more than fifteen files', () => {
    const files = Array.from({ length: 31 }, (_, index) => `file-${index}.ts`);
    const chunks = chunkFiles(files, 15);

    expect(chunks.map((chunk) => chunk.length)).toEqual([15, 15, 1]);
    expect(chunks.flat()).toEqual(files);
  });
});

describe('routeScreenTarget', () => {
  it('creates collision-free feature screen names from complete route paths', () => {
    expect(routeScreenTarget('apps/mobile/app/(tabs)/profile.tsx', 'account')).toEqual({
      importPath: '@/features/account/screens/TabsProfileScreen',
      targetFile: 'apps/mobile/features/account/screens/TabsProfileScreen.tsx',
    });
    expect(routeScreenTarget('apps/mobile/app/(worker)/profile.tsx', 'worker')).toEqual({
      importPath: '@/features/worker/screens/WorkerProfileScreen',
      targetFile: 'apps/mobile/features/worker/screens/WorkerProfileScreen.tsx',
    });
  });
});

describe('extractStyleModule', () => {
  it('moves StyleSheet.create into an adjacent module with only required dependencies', () => {
    const transformed = extractStyleModule(
      'apps/mobile/features/auth/screens/LoginScreen.tsx',
      `import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
const GAP = theme.spacing.md;
export default function LoginScreen() {
  const [value] = useState('');
  return <View style={styles.root}><Text>{value}</Text></View>;
}
const styles = StyleSheet.create({ root: { gap: GAP } });
`,
    );

    expect(transformed?.screen).not.toContain('StyleSheet.create');
    expect(transformed?.screen).toContain("import { styles } from './LoginScreen.styles';");
    expect(transformed?.styleModule).toContain("import { StyleSheet } from 'react-native';");
    expect(transformed?.styleModule).toContain("import { theme } from '@/constants/theme';");
    expect(transformed?.styleModule).not.toContain('useState');
    expect(transformed?.styleModule).toContain('const GAP = theme.spacing.md;');
    expect(transformed?.styleModule).toContain('export const styles = StyleSheet.create');
  });
});

describe('extractLogicGateway', () => {
  it('moves service and provider dependencies behind a feature logic module', () => {
    const transformed = extractLogicGateway(
      'apps/mobile/features/location/screens/TrackingScreen.tsx',
      `import React from 'react';
import * as Location from 'expo-location';
import { fetchBookingTracking, type WorkerBooking } from '@/services/api';
import { View } from 'react-native';
export default function TrackingScreen() {
  void Location.getCurrentPositionAsync();
  void fetchBookingTracking('id');
  return <View />;
}
`,
    );

    expect(transformed?.screen).not.toContain("from '@/services/api'");
    expect(transformed?.screen).not.toContain("from 'expo-location'");
    expect(transformed?.screen).toContain("from '../logic/TrackingScreenLogic'");
    expect(transformed?.logicModule).toContain("export * as Location from 'expo-location';");
    expect(transformed?.logicModule).toContain(
      "export { fetchBookingTracking, type WorkerBooking } from '@/services/api';",
    );
  });
});

describe('migrateApiImports', () => {
  it('splits compatibility API imports by focused service', () => {
    expect(
      migrateApiImports(
        "import { fetchBookingDetail, type WorkerBooking, reverseGeocode } from '@/services/api';",
      ),
    ).toBe(
      "import { fetchBookingDetail, type WorkerBooking } from '@/services/bookings';\n" +
        "import { reverseGeocode } from '@/services/geocoding';",
    );
  });
});

describe('extractMobileScreenController', () => {
  it('separates stateful coordination from a presentation view', () => {
    const result = extractMobileScreenController(
      'apps/mobile/features/demo/screens/DemoScreen.tsx',
      `import { useState } from 'react';
import { View, Text } from 'react-native';
import { loadValue } from '../logic/DemoScreenLogic';
export default function DemoScreen() {
  const [value, setValue] = useState('');
  const save = () => void loadValue(value);
  return <View><Text onPress={save}>{value}</Text></View>;
}`,
    );
    expect(result?.controller).toContain('export function useDemoScreenController');
    expect(result?.controller).toContain('loadValue');
    expect(result?.view).not.toContain('../logic/DemoScreenLogic');
    expect(result?.screen).toContain('<DemoView model={model} />');
  });
});
