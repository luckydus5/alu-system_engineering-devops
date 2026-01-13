import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Plus,
  Eye,
  FileText,
  Package,
  User,
  Calendar,
  Download,
  Image as ImageIcon,
  Loader2,
  FileSpreadsheet,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { Department } from '@/hooks/useDepartments';
import { useDepartments } from '@/hooks/useDepartments';
import { useItemRequests, ItemRequest } from '@/hooks/useItemRequests';
import { useInventory } from '@/hooks/useInventory';
import { useWarehouseClassifications } from '@/hooks/useWarehouseClassifications';
import { CreateItemRequestDialog } from './CreateItemRequestDialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { exportLowStockToExcel } from '@/lib/excelExport';
import { useToast } from '@/hooks/use-toast';
import hqPowerLogo from '@/assets/hq-power-logo.png';

interface ItemRequestHistoryPageProps {
  department: Department;
  canManage: boolean;
  onBack: () => void;
}

export function ItemRequestHistoryPage({ department, canManage, onBack }: ItemRequestHistoryPageProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { requests, loading, refetch, deleteRequest } = useItemRequests(department.id);
  const { items, refetch: refetchInventory } = useInventory(department.id);
  const { classifications } = useWarehouseClassifications(department.id);
  const { departments } = useDepartments();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ItemRequest | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this item request? This action cannot be undone.')) {
      return;
    }
    
    const success = await deleteRequest(requestId);
    if (success) {
      refetchInventory();
    }
  };

  const toggleRowExpanded = (requestId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(requestId)) {
        newSet.delete(requestId);
      } else {
        newSet.add(requestId);
      }
      return newSet;
    });
  };

  // Filter requests based on search
  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests;
    
    const query = searchQuery.toLowerCase();
    return requests.filter(r => 
      r.requester_name.toLowerCase().includes(query) ||
      r.item_description.toLowerCase().includes(query) ||
      r.approver_name?.toLowerCase().includes(query) ||
      r.usage_purpose?.toLowerCase().includes(query)
    );
  }, [requests, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    // Low stock: quantity > 0 AND has min_quantity set AND quantity <= min_quantity
    const lowStockItems = items.filter(i => 
      i.quantity > 0 && 
      i.min_quantity && 
      i.min_quantity > 0 && 
      i.quantity <= i.min_quantity
    );
    // Out of stock: quantity === 0
    const outOfStockItems = items.filter(i => i.quantity === 0);
    return {
      totalRequests: requests.length,
      totalQuantity: requests.reduce((sum, r) => sum + r.quantity_requested, 0),
      thisMonth: requests.filter(r => {
        const date = new Date(r.created_at);
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }).length,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
    };
  }, [requests, items]);

  const handleExportLowStock = () => {
    const result = exportLowStockToExcel(
      items,
      classifications.map(c => ({ id: c.id, name: c.name })),
      department.name
    );
    if (result.success) {
      toast({
        title: 'Export Successful',
        description: result.message,
      });
    } else {
      toast({
        title: 'No Data',
        description: result.message,
        variant: 'destructive',
      });
    }
  };

  const openProofDialog = (request: ItemRequest) => {
    setSelectedRequest(request);
    setProofDialogOpen(true);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Requester', 'Item Description', 'Quantity', 'Previous Qty', 'Remaining Qty', 'Usage', 'Approved By'];
    const rows = filteredRequests.map(r => [
      format(new Date(r.created_at), 'yyyy-MM-dd HH:mm'),
      r.requester_name,
      r.item_description,
      r.quantity_requested.toString(),
      r.previous_quantity.toString(),
      r.new_quantity.toString(),
      r.usage_purpose || '',
      r.approver_name || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `item-requests-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo and Title */}
            <div className="flex items-center gap-4">
              <div 
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate('/')}
              >
                <img src={hqPowerLogo} alt="HQ Power" className="h-10 w-auto" />
              </div>
              <div className="border-l-2 border-amber-500 pl-4">
                <h1 className="text-lg font-bold text-foreground">Item Request History</h1>
                <p className="text-xs text-muted-foreground">Track approved item requests</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Warehouse</span>
              </Button>
              <Button variant="outline" size="icon" onClick={refetch} disabled={loading}>
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
              {canManage && (
                <Button 
                  onClick={() => setCreateDialogOpen(true)} 
                  className="bg-amber-500 hover:bg-amber-600 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Request</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 opacity-80" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalRequests}</p>
                  <p className="text-blue-100 text-sm">Total Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 opacity-80" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalQuantity}</p>
                  <p className="text-emerald-100 text-sm">Items Issued</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 opacity-80" />
                <div>
                  <p className="text-2xl font-bold">{stats.thisMonth}</p>
                  <p className="text-purple-100 text-sm">This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 opacity-80" />
                <div>
                  <p className="text-2xl font-bold">{stats.lowStockCount}</p>
                  <p className="text-amber-100 text-sm">Low Stock</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 opacity-80" />
                <div>
                  <p className="text-2xl font-bold">{stats.outOfStockCount}</p>
                  <p className="text-red-100 text-sm">Out of Stock</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Export */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by requester, item, approver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleExportLowStock} 
              className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Low Stock Report
            </Button>
            <Button variant="outline" onClick={exportToCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-500" />
              Request History ({filteredRequests.length} records)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-400px)]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No item requests found</p>
                  {canManage && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setCreateDialogOpen(true)}
                    >
                      Create First Request
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-900 dark:bg-slate-950">
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead className="w-[100px] text-white font-bold">Date</TableHead>
                      <TableHead className="text-white font-bold">Requester</TableHead>
                      <TableHead className="text-white font-bold">Items</TableHead>
                      <TableHead className="text-center text-white font-bold">Total Qty</TableHead>
                      <TableHead className="text-white font-bold">Usage</TableHead>
                      <TableHead className="text-white font-bold">Approved By</TableHead>
                      <TableHead className="text-center text-white font-bold">Proof</TableHead>
                      <TableHead className="text-center text-white font-bold">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => {
                      const hasMultipleItems = request.requested_items && request.requested_items.length > 1;
                      const isExpanded = expandedRows.has(request.id);
                      const itemCount = request.requested_items?.length || 1;
                      const totalQty = request.requested_items
                        ? request.requested_items.reduce((sum, item) => sum + item.quantity, 0)
                        : request.quantity_requested;
                      
                      return (
                        <>
                          <TableRow key={request.id} className="hover:bg-muted/30">
                            <TableCell className="p-2">
                              {hasMultipleItems && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => toggleRowExpanded(request.id)}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(new Date(request.created_at), 'dd/MM/yyyy')}
                              <br />
                              <span className="text-xs opacity-70">
                                {format(new Date(request.created_at), 'HH:mm')}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{request.requester_name}</span>
                              </div>
                              {(request.requester_department_text || request.requester_department_name) && (
                                <span className="text-xs text-muted-foreground">
                                  {request.requester_department_text || request.requester_department_name}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[250px]">
                              {request.requested_items && request.requested_items.length > 0 ? (
                                <div className="space-y-1">
                                  {request.requested_items.slice(0, hasMultipleItems && !isExpanded ? 1 : undefined).map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-300 dark:border-slate-600">
                                      <span className="font-bold text-slate-900 dark:text-white truncate">{item.item_name}</span>
                                      <Badge variant="outline" className="font-mono text-xs shrink-0">
                                        x{item.quantity}
                                      </Badge>
                                    </div>
                                  ))}
                                  {hasMultipleItems && !isExpanded && (
                                    <span className="text-xs text-muted-foreground">+{itemCount - 1} more items</span>
                                  )}
                                </div>
                              ) : (
                                <div className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-300 dark:border-slate-600">
                                  <span className="font-bold text-slate-900 dark:text-white">{request.item_description}</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="font-mono">
                                {totalQty}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[150px]">
                              <p className="text-sm text-muted-foreground truncate">
                                {request.usage_purpose || '-'}
                              </p>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                {request.approver_name || '-'}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {request.approval_proof_url ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openProofDialog(request)}
                                  className="gap-1 text-blue-600 hover:text-blue-700"
                                >
                                  <Eye className="h-4 w-4" />
                                  View
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteRequest(request.id)}
                                className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          
                          {/* Expanded Items Row */}
                          {hasMultipleItems && isExpanded && (
                            <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                              <TableCell colSpan={9} className="p-0">
                                <div className="px-6 py-3 ml-10 border-l-2 border-amber-400">
                                  <div className="text-xs font-medium text-muted-foreground mb-2">
                                    Items in this request:
                                  </div>
                                  <div className="space-y-1">
                                    {request.requested_items?.map((item, idx) => (
                                      <div key={idx} className="flex items-center gap-4 text-sm py-1 px-2 rounded bg-white dark:bg-slate-700/50">
                                        <Package className="h-4 w-4 text-amber-500" />
                                        <span className="flex-1 font-medium">{item.item_name}</span>
                                        <Badge variant="outline" className="font-mono text-xs">
                                          Qty: {item.quantity}
                                        </Badge>
                                        <span className="text-muted-foreground text-xs">
                                          {item.previous_quantity} → {item.new_quantity}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Create Request Dialog */}
      <CreateItemRequestDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        departmentId={department.id}
        items={items}
        departments={departments}
        onSuccess={() => {
          refetch();
          refetchInventory();
        }}
      />

      {/* Proof View Dialog */}
      <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-amber-500" />
              Approval Proof
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Requester:</span>
                  <p className="font-medium">{selectedRequest.requester_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Approved By:</span>
                  <p className="font-medium text-emerald-600">{selectedRequest.approver_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Item:</span>
                  <p className="font-medium">{selectedRequest.item_description}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Quantity:</span>
                  <p className="font-medium">{selectedRequest.quantity_requested}</p>
                </div>
              </div>
              
              {selectedRequest.approval_proof_url && (
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={selectedRequest.approval_proof_url}
                    alt="Approval proof"
                    className="w-full h-auto max-h-[400px] object-contain bg-slate-100 dark:bg-slate-800"
                  />
                </div>
              )}
              
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedRequest.approval_proof_url) {
                      window.open(selectedRequest.approval_proof_url, '_blank');
                    }
                  }}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Image
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
