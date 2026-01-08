import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
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
import {
  Search,
  Plus,
  RefreshCw,
  ArrowLeft,
  Home,
  Warehouse,
  Package,
  AlertTriangle,
  FolderPlus,
  MapPin,
  Loader2,
  X,
} from 'lucide-react';
import { Department } from '@/hooks/useDepartments';
import { useWarehouseClassifications, WarehouseClassification } from '@/hooks/useWarehouseClassifications';
import { useWarehouseLocations, WarehouseLocation } from '@/hooks/useWarehouseLocations';
import { useInventory, InventoryItem } from '@/hooks/useInventory';
import { FolderCard } from './FolderCard';
import { ClassificationDialog } from './ClassificationDialog';
import { LocationDialog } from './LocationDialog';
import { ItemCard } from './ItemCard';
import { AddItemDialog } from './AddItemDialog';
import { cn } from '@/lib/utils';
import hqPowerLogo from '@/assets/hq-power-logo.png';

interface WarehouseDashboardViewProps {
  department: Department;
  canManage: boolean;
}

type ViewLevel = 'classifications' | 'locations' | 'items';

interface NavigationState {
  level: ViewLevel;
  classification?: WarehouseClassification;
  location?: WarehouseLocation;
}

export function WarehouseDashboardView({ department, canManage }: WarehouseDashboardViewProps) {
  const navigate = useNavigate();
  
  // Navigation state
  const [navState, setNavState] = useState<NavigationState>({ level: 'classifications' });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Dialog states
  const [classificationDialogOpen, setClassificationDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingClassification, setEditingClassification] = useState<WarehouseClassification | null>(null);
  const [editingLocation, setEditingLocation] = useState<WarehouseLocation | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'classification' | 'location'; id: string; name: string } | null>(null);

  // Data hooks
  const { 
    classifications, 
    loading: classificationsLoading, 
    refetch: refetchClassifications,
    createClassification,
    updateClassification,
    deleteClassification,
  } = useWarehouseClassifications(department.id);

  const { 
    locations, 
    loading: locationsLoading, 
    refetch: refetchLocations,
    createLocation,
    updateLocation,
    deleteLocation,
  } = useWarehouseLocations(navState.classification?.id, department.id);

  const { 
    items, 
    loading: itemsLoading, 
    stats,
    createItem,
    updateItem,
    deleteItem,
    refetch: refetchItems,
  } = useInventory(department.id);

  // Filter items by location
  const locationItems = useMemo(() => {
    if (navState.level !== 'items' || !navState.location) return [];
    return items.filter(item => item.location_id === navState.location?.id);
  }, [items, navState.level, navState.location]);

  // Global search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !isSearching) return null;
    
    const query = searchQuery.toLowerCase();
    
    const matchedItems = items.filter(item =>
      item.item_name.toLowerCase().includes(query) ||
      item.item_number.toLowerCase().includes(query) ||
      item.location?.toLowerCase().includes(query)
    );

    return matchedItems;
  }, [searchQuery, items, isSearching]);

  // Low stock items across all
  const lowStockItems = useMemo(() => {
    return items.filter(item => item.quantity <= (item.min_quantity || 0) && item.quantity >= 0);
  }, [items]);

  // Navigation handlers
  const goToClassifications = () => {
    setNavState({ level: 'classifications' });
    setSearchQuery('');
    setIsSearching(false);
  };

  const goToLocations = (classification: WarehouseClassification) => {
    setNavState({ level: 'locations', classification });
    setSearchQuery('');
    setIsSearching(false);
  };

  const goToItems = (location: WarehouseLocation) => {
    setNavState({ level: 'items', classification: navState.classification, location });
    setSearchQuery('');
    setIsSearching(false);
  };

  const goBack = () => {
    if (navState.level === 'items') {
      setNavState({ level: 'locations', classification: navState.classification });
    } else if (navState.level === 'locations') {
      setNavState({ level: 'classifications' });
    }
    setSearchQuery('');
    setIsSearching(false);
  };

  // CRUD handlers
  const handleCreateClassification = async (data: { name: string; description?: string; color?: string }) => {
    return await createClassification(data);
  };

  const handleUpdateClassification = async (data: { name: string; description?: string; color?: string }) => {
    if (!editingClassification) return false;
    return await updateClassification(editingClassification.id, data);
  };

  const handleCreateLocation = async (data: { name: string; description?: string; min_items?: number }) => {
    if (!navState.classification) return false;
    return await createLocation({
      ...data,
      classification_id: navState.classification.id,
      department_id: department.id,
    });
  };

  const handleUpdateLocation = async (data: { name: string; description?: string; min_items?: number }) => {
    if (!editingLocation) return false;
    return await updateLocation(editingLocation.id, data);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    
    if (itemToDelete.type === 'classification') {
      await deleteClassification(itemToDelete.id);
    } else {
      await deleteLocation(itemToDelete.id);
    }
    
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  const handleAddItem = async (data: any) => {
    if (!navState.classification || !navState.location) return false;
    
    return await createItem({
      ...data,
      department_id: department.id,
      classification_id: navState.classification.id,
      location_id: navState.location.id,
    });
  };

  // Refresh handler
  const handleRefresh = () => {
    refetchClassifications();
    refetchLocations();
    refetchItems();
  };

  // Search handlers
  const handleSearch = () => {
    if (searchQuery.trim()) {
      setIsSearching(true);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
  };

  const loading = classificationsLoading || locationsLoading || itemsLoading;

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
                <h1 className="text-lg font-bold text-foreground">Warehouse</h1>
                <p className="text-xs text-muted-foreground">All Stores</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/')} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items across all locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={clearSearch}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button onClick={handleSearch} disabled={!searchQuery.trim()}>
              Search
            </Button>
          </div>

          {/* Breadcrumb Navigation */}
          {!isSearching && (
            <div className="mt-3">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink 
                      onClick={goToClassifications}
                      className="cursor-pointer flex items-center gap-1"
                    >
                      <Home className="h-4 w-4" />
                      All Stores
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  
                  {navState.classification && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        {navState.level === 'locations' ? (
                          <BreadcrumbPage>{navState.classification.name}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink 
                            onClick={() => goToLocations(navState.classification!)}
                            className="cursor-pointer"
                          >
                            {navState.classification.name}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </>
                  )}
                  
                  {navState.location && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>{navState.location.name}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Search Results View */}
        {isSearching && searchResults && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Search Results ({searchResults.length} items found)
              </h2>
              <Button variant="outline" size="sm" onClick={clearSearch}>
                <X className="h-4 w-4 mr-2" />
                Clear Search
              </Button>
            </div>
            
            {searchResults.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No items found</h3>
                  <p className="text-muted-foreground">
                    Try searching with different keywords
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {searchResults.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    canManage={canManage}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onStockIn={() => {}}
                    onStockOut={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Low Stock Alert */}
        {!isSearching && navState.level === 'classifications' && lowStockItems.length > 0 && (
          <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Low Stock Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-600 dark:text-amber-500 mb-3">
                {lowStockItems.length} item(s) are below minimum stock level
              </p>
              <div className="flex flex-wrap gap-2">
                {lowStockItems.slice(0, 5).map((item) => (
                  <Badge key={item.id} variant="outline" className="border-amber-500 text-amber-700">
                    {item.item_name} ({item.quantity})
                  </Badge>
                ))}
                {lowStockItems.length > 5 && (
                  <Badge variant="outline" className="border-amber-500 text-amber-700">
                    +{lowStockItems.length - 5} more
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Classifications View */}
        {!isSearching && navState.level === 'classifications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Classifications</h2>
              {canManage && (
                <Button onClick={() => setClassificationDialogOpen(true)} size="sm">
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Add Classification
                </Button>
              )}
            </div>

            {classificationsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : classifications.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Warehouse className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Classifications Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first classification to organize warehouse items
                  </p>
                  {canManage && (
                    <Button onClick={() => setClassificationDialogOpen(true)}>
                      <FolderPlus className="h-4 w-4 mr-2" />
                      Add Classification
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {classifications.map((classification) => (
                  <FolderCard
                    key={classification.id}
                    name={classification.name}
                    itemCount={classification.item_count}
                    totalQuantity={classification.total_quantity}
                    lowStockCount={classification.low_stock_count}
                    color={classification.color}
                    variant="classification"
                    canManage={canManage}
                    onClick={() => goToLocations(classification)}
                    onEdit={() => {
                      setEditingClassification(classification);
                      setClassificationDialogOpen(true);
                    }}
                    onDelete={() => {
                      setItemToDelete({
                        type: 'classification',
                        id: classification.id,
                        name: classification.name,
                      });
                      setDeleteConfirmOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Locations View */}
        {!isSearching && navState.level === 'locations' && navState.classification && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={goBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">{navState.classification.name}</h2>
                <Badge variant="outline">{locations.length} locations</Badge>
              </div>
              {canManage && (
                <Button onClick={() => setLocationDialogOpen(true)} size="sm">
                  <MapPin className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              )}
            </div>

            {locationsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : locations.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Locations Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create locations like 1B02, 2A-2 to store items
                  </p>
                  {canManage && (
                    <Button onClick={() => setLocationDialogOpen(true)}>
                      <MapPin className="h-4 w-4 mr-2" />
                      Add Location
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {locations.map((location) => (
                  <FolderCard
                    key={location.id}
                    name={location.name}
                    itemCount={location.item_count}
                    totalQuantity={location.total_quantity}
                    lowStockCount={location.low_stock_count}
                    minItems={location.min_items}
                    color={navState.classification?.color}
                    variant="location"
                    canManage={canManage}
                    onClick={() => goToItems(location)}
                    onEdit={() => {
                      setEditingLocation(location);
                      setLocationDialogOpen(true);
                    }}
                    onDelete={() => {
                      setItemToDelete({
                        type: 'location',
                        id: location.id,
                        name: location.name,
                      });
                      setDeleteConfirmOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Items View */}
        {!isSearching && navState.level === 'items' && navState.location && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={goBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">{navState.location.name}</h2>
                <Badge variant="outline">{locationItems.length} items</Badge>
              </div>
              {canManage && (
                <Button onClick={() => setItemDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              )}
            </div>

            {itemsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : locationItems.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Items Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add items to this location
                  </p>
                  {canManage && (
                    <Button onClick={() => setItemDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {locationItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    canManage={canManage}
                    onEdit={() => {}}
                    onDelete={() => deleteItem(item.id)}
                    onStockIn={() => {}}
                    onStockOut={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ClassificationDialog
        open={classificationDialogOpen}
        onOpenChange={(open) => {
          setClassificationDialogOpen(open);
          if (!open) setEditingClassification(null);
        }}
        onSubmit={editingClassification ? handleUpdateClassification : handleCreateClassification}
        initialData={editingClassification || undefined}
        mode={editingClassification ? 'edit' : 'create'}
      />

      <LocationDialog
        open={locationDialogOpen}
        onOpenChange={(open) => {
          setLocationDialogOpen(open);
          if (!open) setEditingLocation(null);
        }}
        onSubmit={editingLocation ? handleUpdateLocation : handleCreateLocation}
        initialData={editingLocation || undefined}
        mode={editingLocation ? 'edit' : 'create'}
      />

      <AddItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        onSubmit={handleAddItem}
        departmentId={department.id}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{itemToDelete?.name}" and all its contents.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
