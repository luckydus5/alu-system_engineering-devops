import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ItemRequest } from '@/hooks/useItemRequests';

interface ExportResult {
  success: boolean;
  message: string;
}

/**
 * Exports item requests to Excel with each item on its own row
 * This creates a clean, readable spreadsheet where every requested item
 * appears as a separate line with all the request details
 */
export function exportItemRequestsToExcel(
  requests: ItemRequest[],
  departmentName?: string
): ExportResult {
  if (requests.length === 0) {
    return {
      success: false,
      message: 'No requests to export',
    };
  }

  // Create rows - one row per item
  const rows: any[][] = [];
  
  // Header row
  const headers = [
    'No.',
    'Request Date',
    'Request Time',
    'Requester Name',
    'Requester Department',
    'Item Name',
    'Quantity Issued',
    'Stock Before',
    'Stock After',
    'Usage Purpose',
    'Approved By',
    'Notes',
  ];
  
  rows.push(headers);

  let rowNumber = 1;

  // Process each request
  requests.forEach((request) => {
    const requestDate = format(new Date(request.created_at), 'dd/MM/yyyy');
    const requestTime = format(new Date(request.created_at), 'HH:mm');
    const requesterName = request.requester_name || '';
    const requesterDept = request.requester_department_text || request.requester_department_name || '';
    const usagePurpose = request.usage_purpose || '';
    const approvedBy = request.approver_name || '';
    const notes = request.notes || '';

    // Check if request has multiple items
    if (request.requested_items && request.requested_items.length > 0) {
      // Create a row for each item in the request
      request.requested_items.forEach((item) => {
        rows.push([
          rowNumber++,
          requestDate,
          requestTime,
          requesterName,
          requesterDept,
          item.item_name,
          item.quantity,
          item.previous_quantity,
          item.new_quantity,
          usagePurpose,
          approvedBy,
          notes,
        ]);
      });
    } else {
      // Single item request - use the main request fields
      rows.push([
        rowNumber++,
        requestDate,
        requestTime,
        requesterName,
        requesterDept,
        request.item_description,
        request.quantity_requested,
        request.previous_quantity,
        request.new_quantity,
        usagePurpose,
        approvedBy,
        notes,
      ]);
    }
  });

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths for better readability
  ws['!cols'] = [
    { wch: 5 },   // No.
    { wch: 12 },  // Date
    { wch: 8 },   // Time
    { wch: 20 },  // Requester Name
    { wch: 18 },  // Requester Dept
    { wch: 35 },  // Item Name
    { wch: 10 },  // Qty Issued
    { wch: 10 },  // Stock Before
    { wch: 10 },  // Stock After
    { wch: 30 },  // Usage Purpose
    { wch: 15 },  // Approved By
    { wch: 25 },  // Notes
  ];

  // Add worksheet to workbook
  const sheetName = departmentName ? `${departmentName} Requests` : 'Item Requests';
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31)); // Excel limits sheet names to 31 chars

  // Generate filename
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const deptStr = departmentName ? `-${departmentName.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
  const filename = `Item-Requests${deptStr}-${dateStr}.xlsx`;

  // Write file and trigger download
  XLSX.writeFile(wb, filename);

  return {
    success: true,
    message: `Exported ${rowNumber - 1} items from ${requests.length} requests`,
  };
}

/**
 * Exports filtered item requests with summary statistics
 */
export function exportItemRequestsWithSummary(
  requests: ItemRequest[],
  departmentName?: string,
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    requester?: string;
    approver?: string;
  }
): ExportResult {
  if (requests.length === 0) {
    return {
      success: false,
      message: 'No requests to export',
    };
  }

  // Create rows
  const rows: any[][] = [];

  // Title and filter info
  rows.push([`Item Request Report - ${departmentName || 'All Departments'}`]);
  rows.push([`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`]);
  
  if (filters) {
    if (filters.dateFrom || filters.dateTo) {
      rows.push([`Date Range: ${filters.dateFrom || 'Start'} to ${filters.dateTo || 'Present'}`]);
    }
    if (filters.requester) {
      rows.push([`Requester Filter: ${filters.requester}`]);
    }
    if (filters.approver) {
      rows.push([`Approver Filter: ${filters.approver}`]);
    }
  }
  
  rows.push([]); // Empty row

  // Summary stats
  const totalRequests = requests.length;
  let totalItems = 0;
  let totalQuantity = 0;

  requests.forEach((request) => {
    if (request.requested_items && request.requested_items.length > 0) {
      totalItems += request.requested_items.length;
      totalQuantity += request.requested_items.reduce((sum, item) => sum + item.quantity, 0);
    } else {
      totalItems += 1;
      totalQuantity += request.quantity_requested;
    }
  });

  rows.push(['SUMMARY']);
  rows.push(['Total Requests:', totalRequests]);
  rows.push(['Total Items:', totalItems]);
  rows.push(['Total Quantity Issued:', totalQuantity]);
  rows.push([]); // Empty row

  // Header row
  const headers = [
    'No.',
    'Request Date',
    'Request Time',
    'Requester Name',
    'Requester Department',
    'Item Name',
    'Quantity Issued',
    'Stock Before',
    'Stock After',
    'Usage Purpose',
    'Approved By',
    'Notes',
  ];
  
  rows.push(headers);

  let rowNumber = 1;

  // Process each request
  requests.forEach((request) => {
    const requestDate = format(new Date(request.created_at), 'dd/MM/yyyy');
    const requestTime = format(new Date(request.created_at), 'HH:mm');
    const requesterName = request.requester_name || '';
    const requesterDept = request.requester_department_text || request.requester_department_name || '';
    const usagePurpose = request.usage_purpose || '';
    const approvedBy = request.approver_name || '';
    const notes = request.notes || '';

    if (request.requested_items && request.requested_items.length > 0) {
      request.requested_items.forEach((item) => {
        rows.push([
          rowNumber++,
          requestDate,
          requestTime,
          requesterName,
          requesterDept,
          item.item_name,
          item.quantity,
          item.previous_quantity,
          item.new_quantity,
          usagePurpose,
          approvedBy,
          notes,
        ]);
      });
    } else {
      rows.push([
        rowNumber++,
        requestDate,
        requestTime,
        requesterName,
        requesterDept,
        request.item_description,
        request.quantity_requested,
        request.previous_quantity,
        request.new_quantity,
        usagePurpose,
        approvedBy,
        notes,
      ]);
    }
  });

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  ws['!cols'] = [
    { wch: 5 },   // No.
    { wch: 12 },  // Date
    { wch: 8 },   // Time
    { wch: 20 },  // Requester Name
    { wch: 18 },  // Requester Dept
    { wch: 35 },  // Item Name
    { wch: 10 },  // Qty Issued
    { wch: 10 },  // Stock Before
    { wch: 10 },  // Stock After
    { wch: 30 },  // Usage Purpose
    { wch: 15 },  // Approved By
    { wch: 25 },  // Notes
  ];

  // Add worksheet to workbook
  const sheetName = departmentName ? `${departmentName} Requests` : 'Item Requests';
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

  // Generate filename
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const deptStr = departmentName ? `-${departmentName.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
  const filename = `Item-Requests-Report${deptStr}-${dateStr}.xlsx`;

  // Write file and trigger download
  XLSX.writeFile(wb, filename);

  return {
    success: true,
    message: `Exported ${rowNumber - 1} items from ${requests.length} requests`,
  };
}
