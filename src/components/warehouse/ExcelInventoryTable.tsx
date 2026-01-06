import { useState, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Pencil,
  Trash2,
  Check,
  X,
  Search,
  Package,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  PackagePlus,
  PackageMinus,
  Image as ImageIcon,
  Eye,
  Camera,
  Upload,
  Loader2,
} from 'lucide-react';
import { InventoryItem } from '@/hooks/useInventory';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { StockTransactionDialog, StockTransaction } from './StockTransactionDialog';

interface ExcelInventoryTableProps {
  items: InventoryItem[];
  loading: boolean;
  canManage: boolean;
  onUpdate: (id: string, data: Partial<InventoryItem>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onRefetch: () => void;
  onStockTransaction?: (transaction: StockTransaction) => Promise<boolean>;
}

type SortField = 'item_number' | 'item_name' | 'quantity' | 'location';
type SortDirection = 'asc' | 'desc';

// Row colors for alternating Excel-like effect
const rowColors = [
  'bg-blue-50 dark:bg-blue-950/30',
  'bg-green-50 dark:bg-green-950/30',
  'bg-yellow-50 dark:bg-yellow-950/30',
  'bg-purple-50 dark:bg-purple-950/30',
  'bg-pink-50 dark:bg-pink-950/30',
  'bg-cyan-50 dark:bg-cyan-950/30',
  'bg-orange-50 dark:bg-orange-950/30',
  'bg-indigo-50 dark:bg-indigo-950/30',
];

export function ExcelInventoryTable({
  items,
  loading,
  canManage,
  onUpdate,
  onDelete,
  onRefetch,
  onStockTransaction,
}: ExcelInventoryTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<InventoryItem>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('item_number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [stockDialogItem, setStockDialogItem] = useState<InventoryItem | null>(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const itemsPerPage = 15;

  const openImagePreview = (imageUrl: string) => {
    setPreviewImage(imageUrl);
    setImagePreviewOpen(true);
  };

  // Upload image to Supabase Storage
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `inventory/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('inventory-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('inventory-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload Error',
        description: 'Failed to upload image',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Handle image selection for edit
  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditData({
      item_number: item.item_number,
      item_name: item.item_name,
      quantity: item.quantity,
      location: item.location,
    });
    setEditImageFile(null);
    setEditImagePreview(item.image_url || null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
    setEditImageFile(null);
    setEditImagePreview(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    
    let updateData = { ...editData };
    
    // Upload new image if selected
    if (editImageFile) {
      setUploadingImage(true);
      const imageUrl = await uploadImage(editImageFile);
      setUploadingImage(false);
      if (imageUrl) {
        updateData.image_url = imageUrl;
      }
    }
    
    const success = await onUpdate(editingId, updateData);
    if (success) {
      setEditingId(null);
      setEditData({});
      setEditImageFile(null);
      setEditImagePreview(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await onDelete(deleteId);
    setDeleteId(null);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStockStatus = (quantity: number): 'out' | 'low' | 'good' => {
    if (quantity === 0) return 'out';
    if (quantity < 10) return 'low';
    return 'good';
  };

  // Filter and sort items
  const processedItems = useMemo(() => {
    let result = [...items];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.item_number.toLowerCase().includes(term) ||
          item.item_name.toLowerCase().includes(term) ||
          item.location.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((item) => getStockStatus(item.quantity) === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [items, searchTerm, statusFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(processedItems.length / itemsPerPage);
  const paginatedItems = processedItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  const getStatusBadge = (quantity: number) => {
    const status = getStockStatus(quantity);
    if (status === 'out') {
      return (
        <Badge className="bg-red-500 text-white border-0 font-semibold text-[10px] px-1.5 py-0.5 whitespace-nowrap">
          OUT
        </Badge>
      );
    }
    if (status === 'low') {
      return (
        <Badge className="bg-amber-500 text-white border-0 font-semibold text-[10px] px-1.5 py-0.5 whitespace-nowrap">
          LOW
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-500 text-white border-0 font-semibold text-[10px] px-1.5 py-0.5 whitespace-nowrap">
        IN STOCK
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="shadow-corporate">
        <CardContent className="p-8">
          <div className="flex items-center justify-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            <span className="text-muted-foreground">Loading inventory...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-corporate overflow-hidden">
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Package className="h-6 w-6" />
            Inventory Items
            <Badge variant="secondary" className="ml-2 bg-white/20 text-white">
              {processedItems.length} items
            </Badge>
          </CardTitle>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 w-48 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:bg-white/20"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-36 bg-white/10 border-white/20 text-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="good">In Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh */}
            <Button
              variant="secondary"
              size="icon"
              onClick={onRefetch}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No inventory items</h3>
            <p className="text-muted-foreground">Add your first inventory item to get started.</p>
          </div>
        ) : (
          <>
            {/* Excel-like Table - Full Width */}
            <div className="w-full overflow-x-auto">
              <div className="min-w-full">
                {/* Table Header */}
                <div className={cn(
                  "bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-900 dark:border-slate-600 grid",
                  canManage && onStockTransaction 
                    ? "grid-cols-[40px_50px_80px_minmax(120px,2fr)_60px_minmax(80px,1fr)_90px_140px_80px]"
                    : "grid-cols-[40px_50px_80px_minmax(120px,2fr)_60px_minmax(80px,1fr)_90px_80px]"
                )}>
                  <div className="p-2 font-bold text-xs text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-600 text-center">
                    #
                  </div>
                  <div className="p-2 font-bold text-xs text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-600 text-center">
                    PHOTO
                  </div>
                  <button
                    onClick={() => handleSort('item_number')}
                    className="p-2 font-bold text-xs text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-600 text-left flex items-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    NO.
                    <SortIcon field="item_number" />
                  </button>
                  <button
                    onClick={() => handleSort('item_name')}
                    className="p-2 font-bold text-xs text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-600 text-left flex items-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    ITEM NAME
                    <SortIcon field="item_name" />
                  </button>
                  <button
                    onClick={() => handleSort('quantity')}
                    className="p-2 font-bold text-xs text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-600 text-center flex items-center justify-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    QTY
                    <SortIcon field="quantity" />
                  </button>
                  <button
                    onClick={() => handleSort('location')}
                    className="p-2 font-bold text-xs text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-600 text-left flex items-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    LOCATION
                    <SortIcon field="location" />
                  </button>
                  <div className="p-2 font-bold text-xs text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-600 text-center">
                    STATUS
                  </div>
                  {canManage && onStockTransaction && (
                    <div className="p-2 font-bold text-xs text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-600 text-center">
                      STOCK
                    </div>
                  )}
                  {canManage && (
                    <div className="p-2 font-bold text-xs text-slate-700 dark:text-slate-300 text-center">
                      ACTIONS
                    </div>
                  )}
                </div>

                {/* Table Body */}
                <div className="divide-y divide-slate-900 dark:divide-slate-600">
                  {paginatedItems.map((item, index) => {
                    const globalIndex = (currentPage - 1) * itemsPerPage + index;
                    const rowColor = rowColors[globalIndex % rowColors.length];
                    const isEditing = editingId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'grid transition-colors',
                          canManage && onStockTransaction 
                            ? "grid-cols-[40px_50px_80px_minmax(120px,2fr)_60px_minmax(80px,1fr)_90px_140px_80px]"
                            : "grid-cols-[40px_50px_80px_minmax(120px,2fr)_60px_minmax(80px,1fr)_90px_80px]",
                          rowColor,
                          isEditing && 'bg-blue-100 dark:bg-blue-900/50'
                        )}
                      >
                        {/* Row Number */}
                        <div className="p-2 text-center font-mono text-xs border-r border-slate-900 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                          {globalIndex + 1}
                        </div>

                        {/* Photo */}
                        <div className="p-1 border-r border-slate-900 dark:border-slate-600 flex items-center justify-center">
                          {isEditing ? (
                            <div 
                              className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors relative overflow-hidden"
                              onClick={() => editImageInputRef.current?.click()}
                            >
                              {uploadingImage ? (
                                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                              ) : editImagePreview ? (
                                <img
                                  src={editImagePreview}
                                  alt="Preview"
                                  className="w-8 h-8 rounded object-cover"
                                />
                              ) : (
                                <Camera className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                          ) : item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.item_name}
                              className="w-8 h-8 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => openImagePreview(item.image_url!)}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                              <ImageIcon className="h-3 w-3 text-slate-400" />
                            </div>
                          )}
                        </div>

                        {/* Item Number */}
                        <div className="p-2 border-r border-slate-900 dark:border-slate-600">
                          {isEditing ? (
                            <Input
                              value={editData.item_number || ''}
                              onChange={(e) =>
                                setEditData({ ...editData, item_number: e.target.value })
                              }
                              className="h-6 text-xs font-mono"
                            />
                          ) : (
                            <span className="font-mono font-semibold text-xs text-slate-800 dark:text-slate-200">
                              {item.item_number}
                            </span>
                          )}
                        </div>

                        {/* Item Name */}
                        <div className="p-2 border-r border-slate-900 dark:border-slate-600">
                          {isEditing ? (
                            <Input
                              value={editData.item_name || ''}
                              onChange={(e) =>
                                setEditData({ ...editData, item_name: e.target.value })
                              }
                              className="h-6 text-xs"
                            />
                          ) : (
                            <span className="text-sm text-slate-800 dark:text-slate-200">
                              {item.item_name}
                            </span>
                          )}
                        </div>

                        {/* Quantity */}
                        <div className="p-2 border-r border-slate-900 dark:border-slate-600 text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editData.quantity || 0}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  quantity: parseInt(e.target.value) || 0,
                                })
                              }
                              className="h-6 text-xs text-center w-12 mx-auto"
                            />
                          ) : (
                            <span
                              className={cn(
                                'font-bold text-sm',
                                item.quantity === 0 && 'text-red-600',
                                item.quantity > 0 && item.quantity < 10 && 'text-amber-600',
                                item.quantity >= 10 && 'text-emerald-600'
                              )}
                            >
                              {item.quantity}
                            </span>
                          )}
                        </div>

                        {/* Location */}
                        <div className="p-2 border-r border-slate-900 dark:border-slate-600">
                          {isEditing ? (
                            <Input
                              value={editData.location || ''}
                              onChange={(e) =>
                                setEditData({ ...editData, location: e.target.value })
                              }
                              className="h-6 text-xs"
                            />
                          ) : (
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              {item.location}
                            </span>
                          )}
                        </div>

                        {/* Status */}
                        <div className="p-2 border-r border-slate-900 dark:border-slate-600 flex items-center justify-center">
                          {getStatusBadge(item.quantity)}
                        </div>

                        {/* Stock In/Out Actions */}
                        {canManage && onStockTransaction && (
                          <div className="p-1 border-r border-slate-900 dark:border-slate-600 flex items-center justify-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setStockDialogItem(item)}
                              className="h-7 px-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
                              title="Stock In"
                            >
                              <PackagePlus className="h-3 w-3 mr-0.5" />
                              In
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setStockDialogItem(item)}
                              className="h-7 px-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-100"
                              title="Stock Out"
                              disabled={item.quantity === 0}
                            >
                              <PackageMinus className="h-3 w-3 mr-0.5" />
                              Out
                            </Button>
                          </div>
                        )}

                        {/* Actions */}
                        {canManage && (
                          <div className="p-1 flex items-center justify-center gap-0.5">
                            {isEditing ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={saveEdit}
                                  className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={cancelEdit}
                                  className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-100"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => startEdit(item)}
                                  className="h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteId(item.id)}
                                  className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-100"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, processedItems.length)} of{' '}
                  {processedItems.length} items
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stock Transaction Dialog */}
      {onStockTransaction && (
        <StockTransactionDialog
          open={!!stockDialogItem}
          onOpenChange={(open) => !open && setStockDialogItem(null)}
          item={stockDialogItem}
          onSubmit={onStockTransaction}
        />
      )}

      {/* Image Preview Dialog */}
      <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
        <DialogContent className="sm:max-w-2xl p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Item Photo
            </DialogTitle>
          </DialogHeader>
          {previewImage && (
            <img
              src={previewImage}
              alt="Item"
              className="w-full max-h-[70vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden file input for image upload */}
      <input
        type="file"
        ref={editImageInputRef}
        onChange={handleEditImageSelect}
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
      />
    </Card>
  );
}
