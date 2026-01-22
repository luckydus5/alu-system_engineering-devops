import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  Loader2,
  FileSpreadsheet,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit2,
  Filter,
  X,
} from 'lucide-react';
import { Department } from '@/hooks/useDepartments';
import { useDepartments } from '@/hooks/useDepartments';
import { useItemRequests, useItemRequestApprovers, ItemRequest } from '@/hooks/useItemRequests';
import { useInventory } from '@/hooks/useInventory';
import { useWarehouseClassifications } from '@/hooks/useWarehouseClassifications';
import { useUserRole } from '@/hooks/useUserRole';
import { CreateItemRequestDialog } from './CreateItemRequestDialog';
import { ItemRequestDetailDialog } from './ItemRequestDetailDialog';
import { EditItemRequestDialog } from './EditItemRequestDialog';
import { MobileRequestCard } from './MobileRequestCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { exportLowStockToExcel } from '@/lib/excelExport';
import { exportItemRequestsWithSummary } from '@/lib/exportItemRequests';
import { useToast } from '@/hooks/use-toast';
import hqPowerLogo from '@/assets/hq-power-logo.png';
import { DeleteItemRequestConfirmDialog } from './DeleteItemRequestConfirmDialog';

interface ItemRequestHistoryPageProps {
  department: Department;
  canManage: boolean;
  onBack: () => void;
}

export function ItemRequestHistoryPage({ department, canManage, onBack }: ItemRequestHistoryPageProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { highestRole } = useUserRole();
  const { requests, loading, refetch, deleteRequest } = useItemRequests(department.id);
  const { items, refetch: refetchInventory } = useInventory(department.id);
  const { classifications } = useWarehouseClassifications(department.id);
  const { departments } = useDepartments();
  const { approvers } = useItemRequestApprovers(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ItemRequest | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<ItemRequest | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Filter states
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [requesterFilter, setRequesterFilter] = useState('');
  const [approverFilter, setApproverFilter] = useState('');

  // Check if user can add items to requests (admin or super_admin)
  const canAddItemsToRequest = highestRole === 'admin' || highestRole === 'super_admin';

  // Get unique requesters and approvers for filter dropdowns
  const uniqueRequesters = useMemo(() => {
    const names = new Set(requests.map(r => r.requester_name).filter(Boolean));
    return Array.from(names).sort();
  }, [requests]);

  const uniqueApprovers = useMemo(() => {
    const names = new Set(requests.map(r => r.approver_name).filter(Boolean));
    return Array.from(names).sort();
  }, [requests]);

  const openDeleteDialog = (request: ItemRequest) => {
    setRequestToDelete(request);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!requestToDelete) return;
    try {
      setDeleting(true);
      const success = await deleteRequest(requestToDelete.id);
      if (success) {
        refetchInventory();
      }
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setRequestToDelete(null);
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

  const handleViewRequest = (request: ItemRequest) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  const handleEditRequest = (request: ItemRequest) => {
    setSelectedRequest(request);
    setEditDialogOpen(true);
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setRequesterFilter('');
    setApproverFilter('');
  };

  const hasActiveFilters = dateFrom || dateTo || requesterFilter || approverFilter;

  // Filter requests based on search and filters
  const filteredRequests = useMemo(() => {
    let filtered = requests;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.requester_name.toLowerCase().includes(query) ||
        r.item_description.toLowerCase().includes(query) ||
        r.approver_name?.toLowerCase().includes(query) ||
        r.usage_purpose?.toLowerCase().includes(query)
      );
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filtered = filtered.filter(r => {
        const requestDate = new Date(r.created_at);
        
        if (dateFrom && dateTo) {
          return isWithinInterval(requestDate, {
            start: startOfDay(parseISO(dateFrom)),
            end: endOfDay(parseISO(dateTo)),
          });
        } else if (dateFrom) {
          return requestDate >= startOfDay(parseISO(dateFrom));
        } else if (dateTo) {
          return requestDate <= endOfDay(parseISO(dateTo));
        }
        return true;
      });
    }

    // Requester filter
    if (requesterFilter) {
      filtered = filtered.filter(r => r.requester_name === requesterFilter);
    }

    // Approver filter
    if (approverFilter) {
      filtered = filtered.filter(r => r.approver_name === approverFilter);
    }

    return filtered;
  }, [requests, searchQuery, dateFrom, dateTo, requesterFilter, approverFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const lowStockItems = items.filter(i => 
      i.quantity > 0 && 
      i.min_quantity && 
      i.min_quantity > 0 && 
      i.quantity <= i.min_quantity
    );
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

  const handleExportRequests = () => {
    const result = exportItemRequestsWithSummary(
      filteredRequests,
      department.name,
      {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        requester: requesterFilter || undefined,
        approver: approverFilter || undefined,
      }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b shadow-sm sticky top-0 z-40">
        <div className="px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Logo and Title */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <div 
                className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate('/')}
              >
                <img src={hqPowerLogo} alt="HQ Power" className="h-8 sm:h-10 w-auto" />
              </div>
              <div className="border-l-2 border-amber-500 pl-2 sm:pl-4 min-w-0">
                <h1 className="text-sm sm:text-lg font-bold text-foreground truncate">Item Requests</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground hidden xs:block">Track approved requests</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={onBack} className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <Button variant="outline" size="icon" onClick={refetch} disabled={loading} className="h-8 w-8 sm:h-9 sm:w-9">
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
              {canManage && (
                <Button 
                  onClick={() => setCreateDialogOpen(true)} 
                  className="bg-amber-500 hover:bg-amber-600 gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-2 sm:p-4 space-y-3 sm:space-y-4 pb-24 md:pb-4">
        {/* Stats Cards - More compact on mobile */}
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-2 sm:p-4">
              <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-center sm:text-left">
                <FileText className="h-4 w-4 sm:h-8 sm:w-8 opacity-80 hidden sm:block" />
                <div className="min-w-0">
                  <p className="text-base sm:text-2xl font-bold">{stats.totalRequests}</p>
                  <p className="text-blue-100 text-[9px] sm:text-sm truncate">Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
            <CardContent className="p-2 sm:p-4">
              <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-center sm:text-left">
                <Package className="h-4 w-4 sm:h-8 sm:w-8 opacity-80 hidden sm:block" />
                <div className="min-w-0">
                  <p className="text-base sm:text-2xl font-bold">{stats.totalQuantity}</p>
                  <p className="text-emerald-100 text-[9px] sm:text-sm truncate">Issued</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-2 sm:p-4">
              <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-center sm:text-left">
                <Calendar className="h-4 w-4 sm:h-8 sm:w-8 opacity-80 hidden sm:block" />
                <div className="min-w-0">
                  <p className="text-base sm:text-2xl font-bold">{stats.thisMonth}</p>
                  <p className="text-purple-100 text-[9px] sm:text-sm truncate">This Mo.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 hidden lg:block">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 opacity-80 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-2xl font-bold">{stats.lowStockCount}</p>
                  <p className="text-amber-100 text-sm truncate">Low Stock</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 hidden lg:block">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 opacity-80 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-2xl font-bold">{stats.outOfStockCount}</p>
                  <p className="text-red-100 text-sm truncate">Out of Stock</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search, Filters and Export */}
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 sm:items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            
            {/* Filter Popover */}
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={cn(
                    "gap-1 h-9",
                    hasActiveFilters && "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                  )}
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filter</span>
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                      !
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Filters</h4>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                        <X className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                  
                  {/* Date Range */}
                  <div className="space-y-2">
                    <Label className="text-xs">Date Range</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="h-8 text-xs"
                        placeholder="From"
                      />
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="h-8 text-xs"
                        placeholder="To"
                      />
                    </div>
                  </div>

                  {/* Requester Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs">Requester</Label>
                    <Select value={requesterFilter} onValueChange={setRequesterFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All requesters" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All requesters</SelectItem>
                        {uniqueRequesters.map((name) => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Approver Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs">Approver</Label>
                    <Select value={approverFilter} onValueChange={setApproverFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All approvers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All approvers</SelectItem>
                        {uniqueApprovers.map((name) => (
                          <SelectItem key={name} value={name as string}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    size="sm" 
                    className="w-full" 
                    onClick={() => setFilterOpen(false)}
                  >
                    Apply Filters
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExportLowStock} 
              className="gap-1 sm:gap-2 border-red-300 text-red-600 hover:bg-red-50 text-xs h-8 sm:h-9 px-2 sm:px-3 flex-1 sm:flex-none"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Low Stock
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportRequests} 
              className="gap-1 sm:gap-2 text-xs h-8 sm:h-9 px-2 sm:px-3 flex-1 sm:flex-none"
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Active filters:</span>
            {dateFrom && (
              <Badge variant="secondary" className="text-xs gap-1">
                From: {dateFrom}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setDateFrom('')} />
              </Badge>
            )}
            {dateTo && (
              <Badge variant="secondary" className="text-xs gap-1">
                To: {dateTo}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setDateTo('')} />
              </Badge>
            )}
            {requesterFilter && (
              <Badge variant="secondary" className="text-xs gap-1">
                Requester: {requesterFilter}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setRequesterFilter('')} />
              </Badge>
            )}
            {approverFilter && (
              <Badge variant="secondary" className="text-xs gap-1">
                Approver: {approverFilter}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setApproverFilter('')} />
              </Badge>
            )}
          </div>
        )}

        {/* Content - Mobile Cards or Desktop Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No item requests found</p>
              {hasActiveFilters && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              )}
              {canManage && !hasActiveFilters && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Create First Request
                </Button>
              )}
            </CardContent>
          </Card>
        ) : isMobile ? (
          /* Mobile Card View */
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground px-1">
              {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
              {hasActiveFilters && ' (filtered)'}
            </p>
            {filteredRequests.map((request) => (
              <MobileRequestCard
                key={request.id}
                request={request}
                onView={handleViewRequest}
                onEdit={canManage ? handleEditRequest : undefined}
                onDelete={canManage ? (_requestId: string) => openDeleteDialog(request) : undefined}
                canManage={canManage}
              />
            ))}
          </div>
        ) : (
          /* Desktop Table View */
          <Card className="overflow-hidden">
            <CardHeader className="py-2 sm:py-3 px-3 sm:px-6">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                Request History ({filteredRequests.length} records{hasActiveFilters ? ' filtered' : ''})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <ScrollArea className="h-[calc(100vh-450px)] min-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-900 dark:bg-slate-950">
                      <TableHead className="w-[30px] px-1"></TableHead>
                      <TableHead className="w-[90px] text-white font-bold text-xs px-2">Date</TableHead>
                      <TableHead className="text-white font-bold text-xs px-2">Requester</TableHead>
                      <TableHead className="text-white font-bold text-xs px-2">Items</TableHead>
                      <TableHead className="text-center text-white font-bold text-xs px-1 w-[60px]">Qty</TableHead>
                      <TableHead className="text-center text-white font-bold text-xs px-1 w-[70px]">Stock</TableHead>
                      <TableHead className="text-white font-bold text-xs px-2">Usage</TableHead>
                      <TableHead className="text-white font-bold text-xs px-2">Approved By</TableHead>
                      <TableHead className="text-center text-white font-bold text-xs px-1 w-[100px]">Actions</TableHead>
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
                      
                      const remainingQty = request.requested_items && request.requested_items.length > 0
                        ? request.requested_items.reduce((sum, item) => sum + (item.new_quantity || 0), 0)
                        : request.new_quantity;
                      
                      return (
                        <React.Fragment key={request.id}>
                          <TableRow className="hover:bg-muted/30">
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
                            <TableCell className="text-center px-1">
                              <Badge variant="outline" className="font-mono text-xs">
                                {totalQty}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center px-1">
                              <Badge 
                                variant="secondary" 
                                className={cn(
                                  "font-mono text-xs",
                                  remainingQty === 0 && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                  remainingQty > 0 && remainingQty <= 10 && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                                  remainingQty > 10 && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                )}
                              >
                                {remainingQty}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[120px] px-2">
                              <p className="text-xs text-muted-foreground truncate">
                                {request.usage_purpose || '-'}
                              </p>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                {request.approver_name || '-'}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewRequest(request)}
                                  className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700"
                                  title="View details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {canManage && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditRequest(request)}
                                      className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700"
                                      title="Edit request"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openDeleteDialog(request)}
                                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                      title="Delete request"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          
                          {/* Expanded Items Row */}
                          {hasMultipleItems && isExpanded && (
                            <TableRow key={`${request.id}-expanded`} className="bg-slate-50 dark:bg-slate-800/50">
                              <TableCell colSpan={9} className="p-0">
                                <div className="px-4 py-3 ml-6 border-l-2 border-amber-400">
                                  <div className="text-xs font-medium text-muted-foreground mb-2">
                                    Items in this request:
                                  </div>
                                  <div className="space-y-1">
                                    {request.requested_items?.map((item, idx) => (
                                      <div key={idx} className="flex flex-wrap items-center gap-2 text-xs py-1 px-2 rounded bg-white dark:bg-slate-700/50">
                                        <Package className="h-3 w-3 text-amber-500 shrink-0" />
                                        <span className="font-medium truncate max-w-[150px]">{item.item_name}</span>
                                        <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                                          Qty: {item.quantity}
                                        </Badge>
                                        <span className="text-muted-foreground text-[10px] shrink-0">
                                          Stock: {item.previous_quantity} → {item.new_quantity}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
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

      {/* Detail View Dialog */}
      <ItemRequestDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        request={selectedRequest}
        onEdit={canManage ? handleEditRequest : undefined}
        canEdit={canManage}
      />

      {/* Edit Request Dialog - with Add Items tab for admins */}
      <EditItemRequestDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        request={selectedRequest}
        approvers={approvers}
        departments={departments}
        inventoryItems={items}
        canAddItems={canAddItemsToRequest}
        onSuccess={() => {
          refetch();
          refetchInventory();
          setEditDialogOpen(false);
        }}
      />

      <DeleteItemRequestConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setRequestToDelete(null);
        }}
        request={requestToDelete}
        deleting={deleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
