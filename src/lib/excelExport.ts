import { InventoryItem } from '@/hooks/useInventory';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface LowStockItem {
  item_number: string;
  item_name: string;
  quantity: number;
  status: 'OUT OF STOCK' | 'LOW STOCK';
}

/**
 * Export low stock and out of stock items to Excel
 * Simple format: Item Number, Item Name, Remaining Quantity
 * 
 * Low Stock = quantity > 0 AND quantity <= min_quantity (uses item's actual min_quantity, NOT a default)
 * Out of Stock = quantity === 0
 */
export function exportLowStockToExcel(
  items: InventoryItem[],
  classifications?: { id: string; name: string }[],
  departmentName?: string
) {
  // Filter ONLY items that are truly low stock or out of stock
  // Low stock: quantity > 0 AND quantity <= min_quantity (only if min_quantity is set and > 0)
  // Out of stock: quantity === 0
  const lowStockItems: LowStockItem[] = items
    .filter(item => {
      // Out of stock
      if (item.quantity === 0) return true;
      // Low stock: only if min_quantity is actually set and quantity is at or below it
      if (item.min_quantity && item.min_quantity > 0 && item.quantity <= item.min_quantity) return true;
      return false;
    })
    .map(item => ({
      item_number: item.item_number || 'N/A',
      item_name: item.item_name,
      quantity: item.quantity,
      status: item.quantity === 0 ? 'OUT OF STOCK' as const : 'LOW STOCK' as const,
    }))
    .sort((a, b) => a.quantity - b.quantity); // Sort by quantity ascending (0 first)

  if (lowStockItems.length === 0) {
    return { success: false, message: 'No low stock or out of stock items found' };
  }

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Prepare data for worksheet - Simple format
  const wsData = [
    // Title row
    ['LOW STOCK REQUEST FORM'],
    [`Date: ${format(new Date(), 'dd/MM/yyyy')}`],
    [departmentName ? `Department: ${departmentName}` : ''],
    [], // Empty row
    // Header row
    ['#', 'Item Number', 'Item Name', 'Remaining Qty', 'Status'],
    // Data rows
    ...lowStockItems.map((item, index) => [
      index + 1,
      item.item_number,
      item.item_name,
      item.quantity,
      item.status,
    ]),
    [], // Empty row
    // Summary
    [`Out of Stock: ${lowStockItems.filter(i => i.status === 'OUT OF STOCK').length}`],
    [`Low Stock: ${lowStockItems.filter(i => i.status === 'LOW STOCK').length}`],
    [`Total Items: ${lowStockItems.length}`],
  ];

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 5 },   // #
    { wch: 20 },  // Item Number
    { wch: 40 },  // Item Name
    { wch: 15 },  // Remaining Qty
    { wch: 15 },  // Status
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Low Stock Request');

  // Generate filename
  const filename = `Low_Stock_Request_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

  // Write file and trigger download
  XLSX.writeFile(wb, filename);

  return { 
    success: true, 
    message: `Exported ${lowStockItems.length} items to ${filename}`,
    filename,
    itemCount: lowStockItems.length,
  };
}

/**
 * Export all items to Excel (for general inventory export)
 */
export function exportInventoryToExcel(
  items: InventoryItem[],
  classifications?: { id: string; name: string }[],
  departmentName?: string
) {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Prepare data
  const wsData = [
    ['INVENTORY EXPORT'],
    [`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`],
    [departmentName ? `Department: ${departmentName}` : ''],
    [],
    ['#', 'Item Code', 'Item Name', 'Description', 'Category', 'Quantity', 'Min Qty', 'Location', 'Unit', 'Status'],
    ...items.map((item, index) => {
      const classification = classifications?.find(c => c.id === item.classification_id);
      const status = item.quantity === 0 ? 'OUT OF STOCK' : 
                     item.quantity <= (item.min_quantity || 10) ? 'LOW STOCK' : 'IN STOCK';
      return [
        index + 1,
        item.item_number || 'N/A',
        item.item_name,
        item.description || '',
        classification?.name || 'Uncategorized',
        item.quantity,
        item.min_quantity || 10,
        item.location || 'N/A',
        item.unit || 'pcs',
        status,
      ];
    }),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws['!cols'] = [
    { wch: 5 },
    { wch: 15 },
    { wch: 30 },
    { wch: 40 },
    { wch: 20 },
    { wch: 12 },
    { wch: 10 },
    { wch: 20 },
    { wch: 10 },
    { wch: 15 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Inventory');

  const filename = `Inventory_Export_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.xlsx`;
  XLSX.writeFile(wb, filename);

  return { success: true, message: `Exported ${items.length} items`, filename };
}
