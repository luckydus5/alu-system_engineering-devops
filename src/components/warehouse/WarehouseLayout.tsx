import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Package,
  PackagePlus,
  PackageMinus,
  Search,
  LayoutDashboard,
  ClipboardList,
  AlertTriangle,
  RefreshCw,
  Plus,
  Home,
  ArrowDownToLine,
  ArrowUpFromLine,
  Box,
  MapPin,
  TrendingUp,
  Check,
  X,
  Loader2,
  Camera,
  Image as ImageIcon,
  Upload,
  Trash2,
  Eye,
  History,
  Clock,
  ArrowLeft,
  Grid3X3,
  List,
  FolderOpen,
} from 'lucide-react';
import { useInventory, InventoryItem } from '@/hooks/useInventory';
import { useStockTransactions } from '@/hooks/useStockTransactions';
import { Department } from '@/hooks/useDepartments';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ExcelInventoryTable } from './ExcelInventoryTable';
import { StockTransaction } from './StockTransactionDialog';
import { WarehouseDashboardView } from './WarehouseDashboardView';
import hqPowerLogo from '@/assets/hq-power-logo.png';

interface WarehouseLayoutProps {
  department: Department;
  canManage: boolean;
}

type TabType = 'stores' | 'dashboard' | 'inventory' | 'stock-in' | 'stock-out' | 'low-stock';
type ViewMode = 'table' | 'grid' | 'list';

export function WarehouseLayout({ department, canManage }: WarehouseLayoutProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('stores');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [stockInOpen, setStockInOpen] = useState(false);
  const [stockOutOpen, setStockOutOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [newItemData, setNewItemData] = useState({ item_number: '', item_name: '', quantity: 0, location: '', image_url: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newItemImage, setNewItemImage] = useState<File | null>(null);
  const [newItemImagePreview, setNewItemImagePreview] = useState<string | null>(null);
  const [stockInImage, setStockInImage] = useState<File | null>(null);
  const [stockInImagePreview, setStockInImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stockInFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { items, loading, stats, createItem, updateItem, deleteItem, refetch } = useInventory(department.id);
  const { stockOutHistory, stockInHistory, loading: transactionsLoading, createTransaction, refetch: refetchTransactions } = useStockTransactions(department.id);

  // If stores tab is active, render the new folder-based view
  if (activeTab === 'stores') {
    return <WarehouseDashboardView department={department} canManage={canManage} />;
  }

  // Handle stock transaction from ExcelInventoryTable
  const handleStockTransaction = async (transaction: StockTransaction): Promise<boolean> => {
    const item = items.find(i => i.id === transaction.item_id);
    if (!item) return false;

    const newQuantity = transaction.type === 'stock_in' 
      ? item.quantity + transaction.quantity 
      : item.quantity - transaction.quantity;

    if (newQuantity < 0) {
      toast({ title: 'Error', description: 'Not enough stock available', variant: 'destructive' });
      return false;
    }

    const success = await updateItem(item.id, { quantity: newQuantity });
    
    if (success) {
      // Record the transaction
      await createTransaction({
        inventory_item_id: item.id,
        department_id: department.id,
        transaction_type: transaction.type === 'stock_in' ? 'in' : 'out',
        quantity: transaction.quantity,
        previous_quantity: item.quantity,
        new_quantity: newQuantity,
        notes: transaction.notes,
      });
      
      // Explicitly refetch both inventory and transactions to ensure UI updates
      await Promise.all([refetch(), refetchTransactions()]);
    }
    
    return success;
  };

  // Filtered items based on search
  const filteredItems = items.filter(
    (item) =>
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.item_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Low stock items
  const lowStockItems = items.filter((i) => i.quantity > 0 && i.quantity < 10);
  const outOfStockItems = items.filter((i) => i.quantity === 0);

  // Upload image to Supabase Storage
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `inventory/${department.id}/${fileName}`;

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

  // Handle new item image selection
  const handleNewItemImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewItemImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItemImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle stock in image selection
  const handleStockInImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStockInImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setStockInImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle add new item
  const handleAddItem = async () => {
    if (!newItemData.item_number || !newItemData.item_name || !newItemData.location) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);

    let imageUrl: string | null = null;
    if (newItemImage) {
      setUploadingImage(true);
      imageUrl = await uploadImage(newItemImage);
      setUploadingImage(false);
    }

    const success = await createItem({ 
      department_id: department.id, 
      item_number: newItemData.item_number,
      item_name: newItemData.item_name,
      quantity: newItemData.quantity,
      location: newItemData.location,
      image_url: imageUrl
    });
    
    if (success) {
      setAddItemOpen(false);
      setNewItemData({ item_number: '', item_name: '', quantity: 0, location: '', image_url: '' });
      setNewItemImage(null);
      setNewItemImagePreview(null);
      toast({ title: 'Success', description: 'Item added successfully' });
    }
    setIsSubmitting(false);
  };

  // Handle stock in
  const handleStockIn = async () => {
    if (!selectedItem || quantity < 1) return;
    setIsSubmitting(true);

    const newQuantity = selectedItem.quantity + quantity;
    const updateData: Partial<InventoryItem> = { quantity: newQuantity };

    // Upload new image if provided
    if (stockInImage) {
      setUploadingImage(true);
      const imageUrl = await uploadImage(stockInImage);
      setUploadingImage(false);
      if (imageUrl) {
        updateData.image_url = imageUrl;
      }
    }

    const success = await updateItem(selectedItem.id, updateData);
    if (success) {
      // Record the transaction
      await createTransaction({
        inventory_item_id: selectedItem.id,
        department_id: department.id,
        transaction_type: 'in',
        quantity: quantity,
        previous_quantity: selectedItem.quantity,
        new_quantity: newQuantity,
      });
      
      toast({ title: 'Stock In Successful', description: `Added ${quantity} units to ${selectedItem.item_name}` });
      setStockInOpen(false);
      setSelectedItem(null);
      setQuantity(0);
      setStockInImage(null);
      setStockInImagePreview(null);
    }
    setIsSubmitting(false);
  };

  // Handle stock out
  const handleStockOut = async () => {
    if (!selectedItem || quantity < 1) return;
    if (quantity > selectedItem.quantity) {
      toast({ title: 'Error', description: 'Not enough stock available', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    
    const newQuantity = selectedItem.quantity - quantity;
    const success = await updateItem(selectedItem.id, { quantity: newQuantity });
    
    if (success) {
      // Record the transaction
      await createTransaction({
        inventory_item_id: selectedItem.id,
        department_id: department.id,
        transaction_type: 'out',
        quantity: quantity,
        previous_quantity: selectedItem.quantity,
        new_quantity: newQuantity,
      });
      
      toast({ title: 'Stock Out Successful', description: `Removed ${quantity} units from ${selectedItem.item_name}` });
      setStockOutOpen(false);
      setSelectedItem(null);
      setQuantity(0);
    }
    setIsSubmitting(false);
  };

  const openStockIn = (item: InventoryItem) => {
    setSelectedItem(item);
    setQuantity(0);
    setStockInImage(null);
    setStockInImagePreview(null);
    setStockInOpen(true);
  };

  const openStockOut = (item: InventoryItem) => {
    setSelectedItem(item);
    setQuantity(0);
    setStockOutOpen(true);
  };

  const openImagePreview = (imageUrl: string) => {
    setPreviewImage(imageUrl);
    setImagePreviewOpen(true);
  };

  // Get status badge
  const getStatusBadge = (qty: number) => {
    if (qty === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (qty < 10) {
      return <Badge variant="outline" className="border-amber-500 text-amber-600">Low Stock</Badge>;
    }
    return <Badge variant="default" className="bg-emerald-500">In Stock</Badge>;
  };

  // Navigation items
  const navItems = [
    { id: 'stores' as TabType, label: 'All Stores', icon: FolderOpen, color: 'text-amber-600' },
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-600' },
    { id: 'inventory' as TabType, label: 'All Items', icon: ClipboardList, color: 'text-emerald-600' },
    { id: 'stock-in' as TabType, label: 'Stock In', icon: ArrowDownToLine, color: 'text-green-600' },
    { id: 'stock-out' as TabType, label: 'Stock Out', icon: ArrowUpFromLine, color: 'text-orange-600' },
    { id: 'low-stock' as TabType, label: 'Low Stock', icon: AlertTriangle, color: 'text-red-600', badge: lowStockItems.length + outOfStockItems.length },
  ];

  // Show loading state while data is being fetched initially
  if (loading && items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Warehouse...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Top Navigation Bar - Warehouse Specific */}
      <div className="bg-white dark:bg-slate-800 border-b shadow-sm sticky top-0 z-40">
        <div className="w-full px-4">
          {/* Header */}
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {/* Company Logo - Large in corner */}
              <div 
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate('/')}
              >
                <img 
                  src={hqPowerLogo} 
                  alt="HQ Power" 
                  className="h-12 w-auto"
                />
              </div>
              
              {/* Separator and Title */}
              <div className="border-l-2 border-amber-500 pl-4">
                <h1 className="text-xl font-bold text-foreground">Warehouse</h1>
                <p className="text-xs text-muted-foreground">Inventory Management</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Back to Home Button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button variant="outline" size="icon" onClick={refetch} disabled={loading}>
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
              {canManage && (
                <Button onClick={() => setAddItemOpen(true)} className="bg-amber-500 hover:bg-amber-600">
                  <Plus className="h-4 w-4 mr-2" />
                  New Item
                </Button>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 pb-2 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                    activeTab === item.id
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                      : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge variant="secondary" className={cn(
                      'ml-1 h-5 min-w-5 px-1.5',
                      activeTab === item.id ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
                    )}>
                      {item.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-2 py-4">
        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl">
                <CardContent className="p-6">
                  <Box className="h-8 w-8 mb-3 opacity-80" />
                  <p className="text-3xl font-bold">{stats.totalItems}</p>
                  <p className="text-blue-100 text-sm">Total Items</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-xl">
                <CardContent className="p-6">
                  <TrendingUp className="h-8 w-8 mb-3 opacity-80" />
                  <p className="text-3xl font-bold">{stats.totalQuantity.toLocaleString()}</p>
                  <p className="text-emerald-100 text-sm">Total Quantity</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl">
                <CardContent className="p-6">
                  <MapPin className="h-8 w-8 mb-3 opacity-80" />
                  <p className="text-3xl font-bold">{stats.uniqueLocations}</p>
                  <p className="text-purple-100 text-sm">Locations</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-xl">
                <CardContent className="p-6">
                  <AlertTriangle className="h-8 w-8 mb-3 opacity-80" />
                  <p className="text-3xl font-bold">{lowStockItems.length + outOfStockItems.length}</p>
                  <p className="text-red-100 text-sm">Need Attention</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Home className="h-5 w-5 text-amber-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button
                    onClick={() => setActiveTab('stock-in')}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 hover:shadow-lg transition-all group"
                  >
                    <div className="p-4 rounded-2xl bg-green-500 text-white group-hover:scale-110 transition-transform">
                      <PackagePlus className="h-8 w-8" />
                    </div>
                    <span className="font-semibold text-green-700 dark:text-green-400">Stock In</span>
                    <span className="text-xs text-muted-foreground">Add items to inventory</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('stock-out')}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 hover:shadow-lg transition-all group"
                  >
                    <div className="p-4 rounded-2xl bg-orange-500 text-white group-hover:scale-110 transition-transform">
                      <PackageMinus className="h-8 w-8" />
                    </div>
                    <span className="font-semibold text-orange-700 dark:text-orange-400">Stock Out</span>
                    <span className="text-xs text-muted-foreground">Remove from inventory</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('inventory')}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 hover:shadow-lg transition-all group"
                  >
                    <div className="p-4 rounded-2xl bg-blue-500 text-white group-hover:scale-110 transition-transform">
                      <ClipboardList className="h-8 w-8" />
                    </div>
                    <span className="font-semibold text-blue-700 dark:text-blue-400">View All</span>
                    <span className="text-xs text-muted-foreground">See all inventory</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('low-stock')}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 hover:shadow-lg transition-all group"
                  >
                    <div className="p-4 rounded-2xl bg-red-500 text-white group-hover:scale-110 transition-transform">
                      <AlertTriangle className="h-8 w-8" />
                    </div>
                    <span className="font-semibold text-red-700 dark:text-red-400">Low Stock</span>
                    <span className="text-xs text-muted-foreground">{lowStockItems.length + outOfStockItems.length} items need attention</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Low Stock Items */}
            {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
              <Card className="shadow-lg border-red-200 dark:border-red-900">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Items Needing Attention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[...outOfStockItems, ...lowStockItems].slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-red-50 dark:bg-red-900/20"
                      >
                        <div className="flex items-center gap-3">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.item_name}
                              className="w-12 h-12 rounded-lg object-cover cursor-pointer hover:opacity-80"
                              onClick={() => openImagePreview(item.image_url!)}
                            />
                          ) : (
                            <div className={cn(
                              'p-2 rounded-lg w-12 h-12 flex items-center justify-center',
                              item.quantity === 0 ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                            )}>
                              <Package className="h-6 w-6" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{item.item_name}</p>
                            <p className="text-xs text-muted-foreground">{item.item_number} • {item.location}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={item.quantity === 0 ? 'destructive' : 'outline'} className="text-lg px-3">
                            {item.quantity}
                          </Badge>
                          {canManage && (
                            <Button size="sm" onClick={() => openStockIn(item)} className="bg-green-500 hover:bg-green-600">
                              <Plus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Inventory View with Grid/List/Table Toggle */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            {/* View Toggle Header */}
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 w-8 p-0"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 w-8 p-0"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="h-8 w-8 p-0"
                >
                  <ClipboardList className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {loading ? (
                  Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
                  ))
                ) : filteredItems.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">No items found</p>
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="group relative rounded-xl overflow-hidden bg-white dark:bg-slate-800 border shadow-sm hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => {
                        setSelectedItem(item);
                        setStockInOpen(true);
                      }}
                    >
                      {/* Image */}
                      <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.item_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-10 w-10 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="p-2">
                        <p className="font-medium text-sm truncate">{item.item_name}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground truncate">{item.item_number}</span>
                          <Badge
                            variant={item.quantity === 0 ? 'destructive' : item.quantity <= 5 ? 'outline' : 'default'}
                            className="text-xs px-1.5 py-0"
                          >
                            {item.quantity}
                          </Badge>
                        </div>
                      </div>
                      {/* Status indicator */}
                      {item.quantity === 0 && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                          Out
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="space-y-2">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                  ))
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">No items found</p>
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-slate-800 border hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedItem(item);
                        setStockInOpen(true);
                      }}
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.item_name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground">{item.item_number} • {item.location}</p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={item.quantity === 0 ? 'destructive' : item.quantity <= 5 ? 'outline' : 'default'}
                        >
                          {item.quantity} in stock
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
              <ExcelInventoryTable
                items={items}
                loading={loading}
                canManage={canManage}
                onUpdate={updateItem}
                onDelete={deleteItem}
                onRefetch={refetch}
                onStockTransaction={handleStockTransaction}
              />
            )}
          </div>
        )}

        {/* Stock In View - Shows only items that have been stocked in */}
        {activeTab === 'stock-in' && (
          <div className="space-y-4">
            <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-white/20 rounded-2xl">
                    <PackagePlus className="h-10 w-10" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Stock In History</h2>
                    <p className="text-green-100">{stockInHistory.length} items have been stocked in</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {transactionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
              </div>
            ) : stockInHistory.length === 0 ? (
              <Card className="shadow-lg">
                <CardContent className="p-12 text-center">
                  <div className="p-4 rounded-full bg-green-100 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <PackagePlus className="h-10 w-10 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Stock In History</h3>
                  <p className="text-muted-foreground">Items that have been added to stock will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {stockInHistory.map((tx) => {
                  const item = items.find(i => i.id === tx.inventory_item_id);
                  return (
                    <Card key={tx.id} className="shadow-sm hover:shadow-md transition-shadow border-green-100 dark:border-green-900/30">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {item?.image_url ? (
                            <img
                              src={item.image_url}
                              alt={tx.item_name}
                              className="w-16 h-16 rounded-xl object-cover cursor-pointer hover:opacity-80"
                              onClick={() => openImagePreview(item.image_url!)}
                            />
                          ) : (
                            <div className="p-3 rounded-xl bg-green-100 text-green-600 w-16 h-16 flex items-center justify-center">
                              <PackagePlus className="h-8 w-8" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-lg truncate">{tx.item_name}</p>
                            <p className="text-sm text-muted-foreground">{tx.item_number}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {new Date(tx.created_at).toLocaleDateString()} at {new Date(tx.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-green-500 text-white text-lg px-3 py-1">
                              +{tx.quantity}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-2">
                              {tx.previous_quantity} → {tx.new_quantity}
                            </p>
                          </div>
                        </div>
                        {tx.notes && (
                          <div className="mt-3 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-sm">
                            <span className="text-muted-foreground">Note:</span> {tx.notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Stock Out View - Shows only out-of-stock items */}
        {activeTab === 'stock-out' && (
          <div className="space-y-4">
            <Card className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-white/20 rounded-2xl">
                    <PackageMinus className="h-10 w-10" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Out of Stock Items</h2>
                    <p className="text-red-100">{outOfStockItems.length} items are out of stock</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
              </div>
            ) : outOfStockItems.length === 0 ? (
              <Card className="shadow-lg">
                <CardContent className="p-12 text-center">
                  <div className="p-4 rounded-full bg-green-100 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Package className="h-10 w-10 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-green-600">All Items In Stock!</h3>
                  <p className="text-muted-foreground">Great job! No items are currently out of stock</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {outOfStockItems.map((item) => (
                  <Card key={item.id} className="shadow-sm hover:shadow-md transition-shadow border-red-100 dark:border-red-900/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.item_name}
                            className="w-16 h-16 rounded-xl object-cover cursor-pointer hover:opacity-80"
                            onClick={() => openImagePreview(item.image_url!)}
                          />
                        ) : (
                          <div className="p-3 rounded-xl bg-red-100 text-red-600 w-16 h-16 flex items-center justify-center">
                            <Package className="h-8 w-8" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-lg truncate">{item.item_name}</p>
                          <p className="text-sm text-muted-foreground">{item.item_number}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {item.location}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant="destructive" className="text-sm px-3 py-1">
                            OUT OF STOCK
                          </Badge>
                          {canManage && (
                            <Button 
                              size="sm" 
                              onClick={() => openStockIn(item)} 
                              className="bg-green-500 hover:bg-green-600"
                            >
                              <PackagePlus className="h-4 w-4 mr-1" />
                              Restock
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Recent Stock Out Activity */}
            {stockOutHistory.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 text-orange-600">
                    <History className="h-5 w-5" />
                    Recent Stock Out Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {stockOutHistory.slice(0, 5).map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-orange-500 text-white">
                            <PackageMinus className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{tx.item_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {tx.item_number} • {tx.previous_quantity} → {tx.new_quantity}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-orange-600 border-orange-300">
                            -{tx.quantity}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {new Date(tx.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Low Stock View */}
        {activeTab === 'low-stock' && (
          <div className="space-y-4">
            <Card className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-white/20 rounded-2xl">
                    <AlertTriangle className="h-10 w-10" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Low Stock Alert</h2>
                    <p className="text-red-100">{lowStockItems.length + outOfStockItems.length} items need restocking</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Out of Stock */}
            {outOfStockItems.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-red-600 flex items-center gap-2">
                  <X className="h-5 w-5" />
                  Out of Stock ({outOfStockItems.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {outOfStockItems.map((item) => (
                    <Card key={item.id} className="border-red-200 bg-red-50 dark:bg-red-900/20">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.item_name}
                              className="w-12 h-12 rounded-lg object-cover cursor-pointer"
                              onClick={() => openImagePreview(item.image_url!)}
                            />
                          ) : (
                            <div className="p-2 rounded-lg bg-red-500 text-white">
                              <Package className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold">{item.item_name}</p>
                            <p className="text-sm text-muted-foreground">{item.item_number} • {item.location}</p>
                          </div>
                        </div>
                        {canManage && (
                          <Button onClick={() => openStockIn(item)} className="bg-green-500 hover:bg-green-600">
                            <PackagePlus className="h-4 w-4 mr-2" />
                            Restock
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Low Stock */}
            {lowStockItems.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-amber-600 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Low Stock ({lowStockItems.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {lowStockItems.map((item) => (
                    <Card key={item.id} className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.item_name}
                              className="w-12 h-12 rounded-lg object-cover cursor-pointer"
                              onClick={() => openImagePreview(item.image_url!)}
                            />
                          ) : (
                            <div className="p-2 rounded-lg bg-amber-500 text-white">
                              <Package className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold">{item.item_name}</p>
                            <p className="text-sm text-muted-foreground">{item.item_number} • {item.location}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-lg px-3 border-amber-500 text-amber-600">
                            {item.quantity}
                          </Badge>
                          {canManage && (
                            <Button size="sm" onClick={() => openStockIn(item)} className="bg-green-500 hover:bg-green-600">
                              <Plus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {lowStockItems.length === 0 && outOfStockItems.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Check className="h-16 w-16 mx-auto text-green-500 mb-4" />
                  <p className="text-lg font-medium">All items are well stocked!</p>
                  <p className="text-muted-foreground">No items need restocking at this time.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Add New Item Dialog */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-amber-500" />
              Add New Item
            </DialogTitle>
            <DialogDescription>Add a new item to inventory with photo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Item Photo</Label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleNewItemImageSelect}
                className="hidden"
              />
              {newItemImagePreview ? (
                <div className="relative">
                  <img
                    src={newItemImagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setNewItemImage(null);
                      setNewItemImagePreview(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to add photo</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Item Number *</Label>
                <Input
                  placeholder="e.g., ITM-001"
                  value={newItemData.item_number}
                  onChange={(e) => setNewItemData({ ...newItemData, item_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Initial Quantity</Label>
                <Input
                  type="number"
                  min={0}
                  value={newItemData.quantity}
                  onChange={(e) => setNewItemData({ ...newItemData, quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Item Name *</Label>
              <Input
                placeholder="e.g., Industrial Pump"
                value={newItemData.item_name}
                onChange={(e) => setNewItemData({ ...newItemData, item_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Location *</Label>
              <Input
                placeholder="e.g., Shelf A1"
                value={newItemData.location}
                onChange={(e) => setNewItemData({ ...newItemData, location: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemOpen(false)}>Cancel</Button>
            <Button onClick={handleAddItem} disabled={isSubmitting || uploadingImage} className="bg-amber-500 hover:bg-amber-600">
              {(isSubmitting || uploadingImage) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {uploadingImage ? 'Uploading...' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock In Dialog */}
      <Dialog open={stockInOpen} onOpenChange={setStockInOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <PackagePlus className="h-5 w-5" />
              Stock In
            </DialogTitle>
            <DialogDescription>Add stock to {selectedItem?.item_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Current item image or placeholder */}
            {selectedItem?.image_url && (
              <img
                src={selectedItem.image_url}
                alt={selectedItem.item_name}
                className="w-full h-32 object-cover rounded-xl"
              />
            )}

            <div className="p-4 bg-muted rounded-xl">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Current Stock:</span>
                <span className="font-bold">{selectedItem?.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">After Stock In:</span>
                <span className="font-bold text-green-600">{(selectedItem?.quantity || 0) + quantity}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Quantity to Add</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="text-center text-2xl h-14"
              />
            </div>

            {/* Optional: Update item photo */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Update Item Photo (Optional)
              </Label>
              <input
                type="file"
                ref={stockInFileInputRef}
                accept="image/*"
                onChange={handleStockInImageSelect}
                className="hidden"
              />
              {stockInImagePreview ? (
                <div className="relative">
                  <img
                    src={stockInImagePreview}
                    alt="New photo"
                    className="w-full h-32 object-cover rounded-xl"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setStockInImage(null);
                      setStockInImagePreview(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => stockInFileInputRef.current?.click()}
                  className="w-full h-20 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Add new photo</span>
                </button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockInOpen(false)}>Cancel</Button>
            <Button onClick={handleStockIn} disabled={isSubmitting || uploadingImage} className="bg-green-500 hover:bg-green-600">
              {(isSubmitting || uploadingImage) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {uploadingImage ? 'Uploading...' : 'Confirm Stock In'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Out Dialog */}
      <Dialog open={stockOutOpen} onOpenChange={setStockOutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <PackageMinus className="h-5 w-5" />
              Stock Out
            </DialogTitle>
            <DialogDescription>Remove stock from {selectedItem?.item_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedItem?.image_url && (
              <img
                src={selectedItem.image_url}
                alt={selectedItem.item_name}
                className="w-full h-32 object-cover rounded-xl"
              />
            )}

            <div className="p-4 bg-muted rounded-xl">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Current Stock:</span>
                <span className="font-bold">{selectedItem?.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">After Stock Out:</span>
                <span className={cn(
                  'font-bold',
                  (selectedItem?.quantity || 0) - quantity < 0 ? 'text-red-600' : 'text-orange-600'
                )}>
                  {Math.max(0, (selectedItem?.quantity || 0) - quantity)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quantity to Remove</Label>
              <Input
                type="number"
                min={1}
                max={selectedItem?.quantity || 1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(selectedItem?.quantity || 1, parseInt(e.target.value) || 1)))}
                className="text-center text-2xl h-14"
              />
            </div>
            {quantity > (selectedItem?.quantity || 0) && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Cannot remove more than available stock
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockOutOpen(false)}>Cancel</Button>
            <Button
              onClick={handleStockOut}
              disabled={isSubmitting || quantity > (selectedItem?.quantity || 0)}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Stock Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
