import JSZip from 'npm:jszip@3.10.1';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';
import { z } from 'npm:zod@4.4.3';
import { adminClient, requireAccount } from '../_shared/auth.ts';
import { json, options } from '../_shared/http.ts';

const reportTables = {
  bookings: 'bookings',
  transactions: 'payments',
  users: 'accounts',
  workers: 'worker_profiles',
} as const;
const requestSchema = z.object({
  reportType: z.enum(['bookings', 'transactions', 'users', 'workers']),
  format: z.enum(['CSV', 'XLSX', 'PDF']).default('CSV'),
  filters: z
    .object({
      from: z.string().datetime({ offset: true }).optional(),
      to: z.string().datetime({ offset: true }).optional(),
      status: z
        .string()
        .trim()
        .regex(/^[A-Z][A-Z_]{1,63}$/)
        .optional(),
    })
    .default({}),
});
type ReportFormat = z.infer<typeof requestSchema>['format'];

function flatRows(rows: Record<string, unknown>[]): Record<string, string | number | boolean>[] {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        value !== null && typeof value === 'object' ? JSON.stringify(value) : (value ?? ''),
      ]),
    ),
  ) as Record<string, string | number | boolean>[];
}

function csv(rows: Record<string, string | number | boolean>[]): string {
  if (!rows.length) return '';
  const columns = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const raw = String(value ?? '');
    const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return [
    columns.map(escape).join(','),
    ...rows.map((row) => columns.map((column) => escape(row[column])).join(',')),
  ].join('\n');
}

async function xlsx(rows: Record<string, string | number | boolean>[]): Promise<Uint8Array> {
  const columns = rows.length ? Object.keys(rows[0]) : ['No records'];
  const xml = (value: unknown) =>
    String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  const columnName = (index: number) => {
    let value = index + 1;
    let result = '';
    while (value) {
      value -= 1;
      result = String.fromCharCode(65 + (value % 26)) + result;
      value = Math.floor(value / 26);
    }
    return result;
  };
  const cell = (value: string | number | boolean, row: number, column: number, style = 0) => {
    const reference = `${columnName(column)}${row}`;
    if (typeof value === 'number' && Number.isFinite(value))
      return `<c r="${reference}" s="${style}"><v>${value}</v></c>`;
    if (typeof value === 'boolean')
      return `<c r="${reference}" s="${style}" t="b"><v>${value ? 1 : 0}</v></c>`;
    const safe = /^[=+\-@]/.test(String(value)) ? `'${String(value)}` : String(value);
    return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(safe)}</t></is></c>`;
  };
  const sheetRows = [
    `<row r="1">${columns.map((value, index) => cell(value, 1, index, 1)).join('')}</row>`,
    ...rows.map(
      (row, index) =>
        `<row r="${index + 2}">${columns.map((column, columnIndex) => cell(row[column] ?? '', index + 2, columnIndex)).join('')}</row>`,
    ),
  ].join('');
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
  );
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  );
  zip.file(
    'xl/workbook.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Report" sheetId="1" r:id="rId1"/></sheets></workbook>',
  );
  zip.file(
    'xl/_rels/workbook.xml.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
  );
  zip.file(
    'xl/styles.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font/><font><b/><color rgb="FFFFFFFF"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF123B64"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>',
  );
  zip.file(
    'xl/worksheets/sheet1.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:${columnName(columns.length - 1)}${Math.max(1, rows.length + 1)}"/></worksheet>`,
  );
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

async function pdf(
  reportType: string,
  rows: Record<string, string | number | boolean>[],
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const columns = rows.length ? Object.keys(rows[0]).slice(0, 6) : [];
  const pageSize: [number, number] = [842, 595];
  let page = document.addPage(pageSize);
  let y = 550;
  const drawHeader = () => {
    page.drawText(`A-YOS ${reportType} report`, {
      x: 36,
      y,
      size: 16,
      font: bold,
      color: rgb(0.07, 0.23, 0.39),
    });
    y -= 24;
    page.drawText(`Generated ${new Date().toISOString()}`, { x: 36, y, size: 8, font: regular });
    y -= 20;
    if (columns.length)
      page.drawText(columns.join(' | ').slice(0, 145), { x: 36, y, size: 8, font: bold });
    y -= 14;
  };
  drawHeader();
  if (!rows.length)
    page.drawText('No records matched the selected filters.', {
      x: 36,
      y,
      size: 10,
      font: regular,
    });
  for (const row of rows) {
    if (y < 36) {
      page = document.addPage(pageSize);
      y = 550;
      drawHeader();
    }
    const line = columns
      .map((column) => String(row[column] ?? '').replaceAll(/\s+/g, ' '))
      .join(' | ');
    page.drawText(line.slice(0, 180), { x: 36, y, size: 7, font: regular });
    y -= 12;
  }
  return document.save();
}

async function render(
  format: ReportFormat,
  reportType: string,
  rows: Record<string, string | number | boolean>[],
): Promise<{ bytes: string | Uint8Array; extension: string; contentType: string }> {
  if (format === 'XLSX')
    return {
      bytes: await xlsx(rows),
      extension: 'xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  if (format === 'PDF')
    return { bytes: await pdf(reportType, rows), extension: 'pdf', contentType: 'application/pdf' };
  return { bytes: csv(rows), extension: 'csv', contentType: 'text/csv; charset=utf-8' };
}

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  if (request.method !== 'POST')
    return json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'POST required.' } }, 405);
  let exportId: string | undefined;
  try {
    const { account } = await requireAccount(request, 'ADMIN', true);
    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || (parsed.data.reportType === 'workers' && parsed.data.filters.status))
      return json(
        { error: { code: 'VALIDATION_FAILED', message: 'Invalid report request.' } },
        400,
      );
    const { reportType, format, filters } = parsed.data;
    if (filters.from && filters.to && new Date(filters.from) > new Date(filters.to))
      return json(
        { error: { code: 'VALIDATION_FAILED', message: 'Invalid report date range.' } },
        400,
      );

    const admin = adminClient();
    const { data: exportRow, error: createError } = await admin
      .from('report_exports')
      .insert({
        report_type: reportType,
        format,
        filters,
        parameters: { reportType, format, filters },
        requested_by: account.id,
        status: 'PROCESSING',
      })
      .select()
      .single();
    if (createError) throw createError;
    exportId = exportRow.id;

    let query = admin
      .from(reportTables[reportType])
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10000);
    if (filters.from) query = query.gte('created_at', filters.from);
    if (filters.to) query = query.lte('created_at', filters.to);
    if (filters.status) query = query.eq('status', filters.status);
    const { data, error } = await query;
    if (error) throw error;

    const output = await render(
      format,
      reportType,
      flatRows((data ?? []) as Record<string, unknown>[]),
    );
    const path = `admin/${account.id}/${exportRow.id}.${output.extension}`;
    const { error: uploadError } = await admin.storage
      .from('report-exports')
      .upload(path, output.bytes, {
        contentType: output.contentType,
        upsert: false,
      });
    if (uploadError) throw uploadError;
    const { error: completionError } = await admin
      .from('report_exports')
      .update({ status: 'COMPLETED', storage_path: path, completed_at: new Date().toISOString() })
      .eq('id', exportRow.id);
    if (completionError) throw completionError;
    return json({ id: exportRow.id, status: 'COMPLETED', storagePath: path, format }, 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INTERNAL_ERROR';
    if (exportId) {
      await adminClient()
        .from('report_exports')
        .update({ status: 'FAILED', failure_reason: 'Report generation failed.' })
        .eq('id', exportId);
    }
    const status =
      code === 'UNAUTHENTICATED'
        ? 401
        : code === 'FORBIDDEN' || code === 'MFA_REQUIRED'
          ? 403
          : 500;
    return json(
      {
        error: {
          code,
          message:
            status === 500
              ? 'Report generation failed.'
              : 'Administrator authorization is required.',
        },
      },
      status,
    );
  }
});
