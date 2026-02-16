import ExcelJS from 'exceljs';
import { format, startOfWeek, endOfWeek, getWeek } from 'date-fns';

interface Employee {
  id: string;
  full_name: string;
  employee_number: string;
  department_id: string | null;
  company_id: string | null;
  employment_status: string;
}

interface Department {
  id: string;
  name: string;
  company_id: string | null;
}

interface Company {
  id: string;
  name: string;
}

interface ExportConfig {
  employees: Employee[];
  departments: Department[];
  companies: Company[];
  isEmployeeOffDuty: (id: string) => boolean;
  currentWeek: Date;
}

// ── Color palette ──
const COLORS = {
  navy: '1B2A4A',
  gold: 'D4941A',
  white: 'FFFFFF',
  lightGray: 'F5F5F5',
  mediumGray: 'E0E0E0',
  darkGray: '333333',
  onDutyBg: 'E8F5E9',
  onDutyText: '2E7D32',
  onDutyBorder: 'A5D6A7',
  offDutyBg: 'FFF3E0',
  offDutyText: 'E65100',
  offDutyBorder: 'FFCC80',
  headerBg: '1B2A4A',
  headerText: 'FFFFFF',
  sectionBg: '37474F',
  sectionText: 'FFFFFF',
  totalBg: 'FFF8E1',
  totalText: '6D4C00',
};

function applyTitleStyle(row: ExcelJS.Row, colCount: number) {
  row.height = 32;
  row.font = { name: 'Calibri', bold: true, size: 16, color: { argb: COLORS.white } };
  row.alignment = { horizontal: 'center', vertical: 'middle' };
  for (let i = 1; i <= colCount; i++) {
    row.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
  }
}

function applySubtitleStyle(row: ExcelJS.Row, colCount: number) {
  row.height = 24;
  row.font = { name: 'Calibri', bold: true, size: 11, color: { argb: COLORS.gold } };
  row.alignment = { horizontal: 'center', vertical: 'middle' };
  for (let i = 1; i <= colCount; i++) {
    row.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
  }
}

function applyHeaderStyle(row: ExcelJS.Row, colCount: number) {
  row.height = 22;
  row.font = { name: 'Calibri', bold: true, size: 10, color: { argb: COLORS.headerText } };
  row.alignment = { horizontal: 'center', vertical: 'middle' };
  for (let i = 1; i <= colCount; i++) {
    const cell = row.getCell(i);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.border = {
      bottom: { style: 'thin', color: { argb: COLORS.gold } },
    };
  }
}

function applySectionHeader(row: ExcelJS.Row, colCount: number) {
  row.height = 22;
  row.font = { name: 'Calibri', bold: true, size: 10, color: { argb: COLORS.sectionText } };
  row.alignment = { vertical: 'middle' };
  for (let i = 1; i <= colCount; i++) {
    const cell = row.getCell(i);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.sectionBg } };
  }
}

function applyStatusCell(cell: ExcelJS.Cell, isOnDuty: boolean) {
  const bg = isOnDuty ? COLORS.onDutyBg : COLORS.offDutyBg;
  const fg = isOnDuty ? COLORS.onDutyText : COLORS.offDutyText;
  const border = isOnDuty ? COLORS.onDutyBorder : COLORS.offDutyBorder;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
  cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: fg } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border = {
    top: { style: 'thin', color: { argb: border } },
    bottom: { style: 'thin', color: { argb: border } },
    left: { style: 'thin', color: { argb: border } },
    right: { style: 'thin', color: { argb: border } },
  };
}

function applyDataRow(row: ExcelJS.Row, colCount: number, isAlternate: boolean) {
  row.height = 20;
  row.font = { name: 'Calibri', size: 10, color: { argb: COLORS.darkGray } };
  row.alignment = { vertical: 'middle' };
  if (isAlternate) {
    for (let i = 1; i <= colCount; i++) {
      row.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightGray } };
    }
  }
  for (let i = 1; i <= colCount; i++) {
    row.getCell(i).border = {
      bottom: { style: 'hair', color: { argb: COLORS.mediumGray } },
    };
  }
}

function applyTotalRow(row: ExcelJS.Row, colCount: number) {
  row.height = 22;
  row.font = { name: 'Calibri', bold: true, size: 10, color: { argb: COLORS.totalText } };
  row.alignment = { vertical: 'middle' };
  for (let i = 1; i <= colCount; i++) {
    const cell = row.getCell(i);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalBg } };
    cell.border = {
      top: { style: 'medium', color: { argb: COLORS.gold } },
      bottom: { style: 'medium', color: { argb: COLORS.gold } },
    };
  }
}

function applyMetaRow(row: ExcelJS.Row) {
  row.font = { name: 'Calibri', size: 10, color: { argb: '666666' } };
  row.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.darkGray } };
}

function groupByDept(employees: Employee[], departments: Department[], companies: Company[]) {
  const groups: Record<string, { deptName: string; companyName: string; emps: Employee[] }> = {};
  employees.forEach(emp => {
    const deptId = emp.department_id || 'unassigned';
    if (!groups[deptId]) {
      const dept = departments.find(d => d.id === deptId);
      const company = companies.find(c => c.id === emp.company_id);
      groups[deptId] = {
        deptName: dept?.name || 'Unassigned',
        companyName: company?.name || 'Unknown',
        emps: [],
      };
    }
    groups[deptId].emps.push(emp);
  });
  return Object.entries(groups).sort(([, a], [, b]) => a.deptName.localeCompare(b.deptName));
}

export async function exportWeekendSchedule(config: ExportConfig) {
  const { employees, departments, companies, isEmployeeOffDuty, currentWeek } = config;
  const allActive = employees.filter(e => e.employment_status === 'active');
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekNumber = getWeek(currentWeek, { weekStartsOn: 1 });
  const dateRange = `${format(weekStart, 'MMMM d')} – ${format(weekEnd, 'MMMM d, yyyy')}`;
  const generated = format(new Date(), 'dd/MM/yyyy HH:mm');

  const wb = new ExcelJS.Workbook();
  wb.creator = 'HQ Power Management Systems';
  wb.created = new Date();

  const sortedDepts = groupByDept(allActive, departments, companies);
  const SUMMARY_COLS = 6;

  // ═══════════════════════════════════════
  // SUMMARY SHEET
  // ═══════════════════════════════════════
  const ws = wb.addWorksheet('Summary', { views: [{ showGridLines: false }] });
  ws.columns = [
    { width: 6 }, { width: 30 }, { width: 22 }, { width: 14 }, { width: 14 }, { width: 14 },
  ];

  // Title
  const r1 = ws.addRow(['HQ POWER MANAGEMENT SYSTEMS', '', '', '', '', '']);
  ws.mergeCells(r1.number, 1, r1.number, SUMMARY_COLS);
  applyTitleStyle(r1, SUMMARY_COLS);

  const r2 = ws.addRow(['WEEKEND DUTY SCHEDULE — SUMMARY REPORT', '', '', '', '', '']);
  ws.mergeCells(r2.number, 1, r2.number, SUMMARY_COLS);
  applySubtitleStyle(r2, SUMMARY_COLS);

  ws.addRow([]);

  // Meta
  const m1 = ws.addRow(['Week:', `Week ${weekNumber}`, '', '', '', '']);
  applyMetaRow(m1);
  const m2 = ws.addRow(['Period:', dateRange, '', '', '', '']);
  applyMetaRow(m2);
  const m3 = ws.addRow(['Generated:', generated, '', '', '', '']);
  applyMetaRow(m3);

  ws.addRow([]);

  // Header
  const hdr = ws.addRow(['#', 'DEPARTMENT', 'COMPANY', 'ON DUTY', 'OFF DUTY', 'TOTAL STAFF']);
  applyHeaderStyle(hdr, SUMMARY_COLS);

  // Data
  let totalOn = 0, totalOff = 0;
  sortedDepts.forEach(([, group], idx) => {
    const on = group.emps.filter(e => !isEmployeeOffDuty(e.id)).length;
    const off = group.emps.filter(e => isEmployeeOffDuty(e.id)).length;
    totalOn += on;
    totalOff += off;
    const row = ws.addRow([idx + 1, group.deptName, group.companyName, on, off, group.emps.length]);
    applyDataRow(row, SUMMARY_COLS, idx % 2 === 1);
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    // Color-code the on/off cells
    applyStatusCell(row.getCell(4), true);
    applyStatusCell(row.getCell(5), false);
  });

  // Total
  ws.addRow([]);
  const totalRow = ws.addRow(['', 'TOTAL', '', totalOn, totalOff, allActive.length]);
  applyTotalRow(totalRow, SUMMARY_COLS);
  totalRow.getCell(4).alignment = { horizontal: 'center' };
  totalRow.getCell(5).alignment = { horizontal: 'center' };
  totalRow.getCell(6).alignment = { horizontal: 'center' };
  applyStatusCell(totalRow.getCell(4), true);
  applyStatusCell(totalRow.getCell(5), false);

  ws.addRow([]);
  ws.addRow([]);
  const sigRow = ws.addRow(['Prepared by: ______________________', '', '', 'Approved by: ______________________', '', '']);
  sigRow.font = { name: 'Calibri', size: 9, italic: true, color: { argb: '888888' } };

  // ═══════════════════════════════════════
  // PER-DEPARTMENT SHEETS
  // ═══════════════════════════════════════
  const DEPT_COLS = 4;

  sortedDepts.forEach(([, group]) => {
    const sheetName = group.deptName.replace(/[\\\/\?\*\[\]:]/g, '').slice(0, 31);
    const ds = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
    ds.columns = [{ width: 6 }, { width: 18 }, { width: 36 }, { width: 16 }];

    const sortedEmps = [...group.emps].sort((a, b) => a.full_name.localeCompare(b.full_name));
    const onList = sortedEmps.filter(e => !isEmployeeOffDuty(e.id));
    const offList = sortedEmps.filter(e => isEmployeeOffDuty(e.id));

    // Title
    const t1 = ds.addRow(['HQ POWER MANAGEMENT SYSTEMS', '', '', '']);
    ds.mergeCells(t1.number, 1, t1.number, DEPT_COLS);
    applyTitleStyle(t1, DEPT_COLS);

    const t2 = ds.addRow([`${group.deptName.toUpperCase()} — WEEKEND SCHEDULE`, '', '', '']);
    ds.mergeCells(t2.number, 1, t2.number, DEPT_COLS);
    applySubtitleStyle(t2, DEPT_COLS);

    ds.addRow([]);

    const dm1 = ds.addRow(['Company:', group.companyName, '', '']);
    applyMetaRow(dm1);
    const dm2 = ds.addRow(['Week:', `Week ${weekNumber} — ${dateRange}`, '', '']);
    applyMetaRow(dm2);
    const dm3 = ds.addRow(['Generated:', generated, '', '']);
    applyMetaRow(dm3);

    ds.addRow([]);

    // ── ON DUTY section ──
    const onSec = ds.addRow([`  ✅  ON DUTY EMPLOYEES (${onList.length})`, '', '', '']);
    ds.mergeCells(onSec.number, 1, onSec.number, DEPT_COLS);
    applySectionHeader(onSec, DEPT_COLS);
    onSec.getCell(1).font = { ...onSec.getCell(1).font!, color: { argb: COLORS.onDutyBorder } };

    const onHdr = ds.addRow(['#', 'EMP NO.', 'FULL NAME', 'STATUS']);
    applyHeaderStyle(onHdr, DEPT_COLS);

    if (onList.length > 0) {
      onList.forEach((emp, idx) => {
        const row = ds.addRow([idx + 1, emp.employee_number, emp.full_name, 'ON DUTY']);
        applyDataRow(row, DEPT_COLS, idx % 2 === 1);
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        applyStatusCell(row.getCell(4), true);
      });
    } else {
      const emptyRow = ds.addRow(['', '', '— No employees on duty —', '']);
      emptyRow.font = { name: 'Calibri', size: 10, italic: true, color: { argb: '999999' } };
      emptyRow.alignment = { horizontal: 'center' };
    }

    const onTotal = ds.addRow(['', '', `Total On Duty: ${onList.length}`, '']);
    applyTotalRow(onTotal, DEPT_COLS);

    ds.addRow([]);

    // ── OFF DUTY section ──
    const offSec = ds.addRow([`  🔴  OFF DUTY EMPLOYEES (${offList.length})`, '', '', '']);
    ds.mergeCells(offSec.number, 1, offSec.number, DEPT_COLS);
    applySectionHeader(offSec, DEPT_COLS);
    offSec.getCell(1).font = { ...offSec.getCell(1).font!, color: { argb: COLORS.offDutyBorder } };

    const offHdr = ds.addRow(['#', 'EMP NO.', 'FULL NAME', 'STATUS']);
    applyHeaderStyle(offHdr, DEPT_COLS);

    if (offList.length > 0) {
      offList.forEach((emp, idx) => {
        const row = ds.addRow([idx + 1, emp.employee_number, emp.full_name, 'OFF DUTY']);
        applyDataRow(row, DEPT_COLS, idx % 2 === 1);
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        applyStatusCell(row.getCell(4), false);
      });
    } else {
      const emptyRow = ds.addRow(['', '', '— No employees off duty —', '']);
      emptyRow.font = { name: 'Calibri', size: 10, italic: true, color: { argb: '999999' } };
      emptyRow.alignment = { horizontal: 'center' };
    }

    const offTotal = ds.addRow(['', '', `Total Off Duty: ${offList.length}`, '']);
    applyTotalRow(offTotal, DEPT_COLS);

    ds.addRow([]);
    ds.addRow([]);

    // Footer summary box
    const sumLabel = ds.addRow(['DEPARTMENT SUMMARY', '', '', '']);
    ds.mergeCells(sumLabel.number, 1, sumLabel.number, DEPT_COLS);
    applySectionHeader(sumLabel, DEPT_COLS);
    sumLabel.getCell(1).font = { name: 'Calibri', bold: true, size: 10, color: { argb: COLORS.gold } };

    const sumRow1 = ds.addRow(['On Duty:', onList.length, 'Off Duty:', offList.length]);
    applyDataRow(sumRow1, DEPT_COLS, false);
    sumRow1.getCell(1).font = { name: 'Calibri', bold: true, size: 10, color: { argb: COLORS.onDutyText } };
    sumRow1.getCell(3).font = { name: 'Calibri', bold: true, size: 10, color: { argb: COLORS.offDutyText } };
    sumRow1.getCell(2).alignment = { horizontal: 'center' };
    sumRow1.getCell(4).alignment = { horizontal: 'center' };

    const sumRow2 = ds.addRow(['Total Staff:', group.emps.length, '', '']);
    applyTotalRow(sumRow2, DEPT_COLS);

    ds.addRow([]);
    ds.addRow([]);
    const sig = ds.addRow(['Prepared by: _____________________', '', 'Approved by: _____________________', '']);
    sig.font = { name: 'Calibri', size: 9, italic: true, color: { argb: '888888' } };
  });

  // ── Write and download ──
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Weekend_Schedule_Week${weekNumber}_${format(weekStart, 'yyyy-MM-dd')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { sheetCount: sortedDepts.length + 1 };
}
