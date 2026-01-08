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
  CheckSquare,
  FolderInput,
  Square,
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
import { EditItemDialog } from './EditItemDialog';
import { MoveItemsDialog } from './MoveItemsDialog';
import { cn } from '@/lib/utils';
import hqPowerLogo from '@/assets/hq-power-logo.png';

interface WarehouseDashboardViewProps {
  department: Department;
  canManage: boolean;
}

type ViewLevel = 'classifications' | 'locations';

interface NavigationState {
  level: ViewLevel;
  classification?: WarehouseClassification;
  currentLocation?: WarehouseLocation; // The folder we're currently inside
  parentLocations?: WarehouseLocation[]; // Stack of parent locations for nested navigation
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
  
  // Selection and move states
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [singleItemToMove, setSingleItemToMove] = useState<InventoryItem | null>(null);
  const [editItemDialogOpen, setEditItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Data hooks
  const { 
    classifications, 
    loading: classificationsLoading, 
    refetch: refetchClassifications,
    createClassification,
    updateClassification,
    deleteClassification,
  } = useWarehouseClassifications(department.id);

  // Get the current parent location for nested folder fetching
  // If we have a currentLocation, fetch its children. Otherwise fetch root level.
  const currentParentId = navState.level === 'locations' 
    ? (navState.currentLocation?.id || null)
    : null;

  const { 
    locations, 
    loading: locationsLoading, 
    refetch: refetchLocations,
    createLocation,
    updateLocation,
    deleteLocation,
  } = useWarehouseLocations(navState.classification?.id, department.id, currentParentId);

  const { 
    items, 
    loading: itemsLoading, 
    stats,
    createItem,
    updateItem,
    deleteItem,
    moveItems,
    refetch: refetchItems,
  } = useInventory(department.id);

  // Compute accurate counts locally from the full inventory list (avoids 1000-row API caps)
  const locationStatsById = useMemo(() => {
    const map = new Map<string, { itemCount: number; totalQuantity: number; lowStockCount: number }>();

    for (const item of items) {
      if (!item.location_id) continue;
      const current = map.get(item.location_id) || { itemCount: 0, totalQuantity: 0, lowStockCount: 0 };
      current.itemCount += 1;
      current.totalQuantity += item.quantity || 0;
      if (item.quantity <= (item.min_quantity || 0)) current.lowStockCount += 1;
      map.set(item.location_id, current);
    }

    return map;
  }, [items]);

  const classificationStatsById = useMemo(() => {
    const map = new Map<string, { itemCount: number; totalQuantity: number; lowStockCount: number }>();

    for (const item of items) {
      if (!item.classification_id) continue;
      const current = map.get(item.classification_id) || { itemCount: 0, totalQuantity: 0, lowStockCount: 0 };
      current.itemCount += 1;
      current.totalQuantity += item.quantity || 0;
      if (item.quantity <= (item.min_quantity || 0)) current.lowStockCount += 1;
      map.set(item.classification_id, current);
    }

    return map;
  }, [items]);

  // Filter items by current location (folder)
  const locationItems = useMemo(() => {
    if (navState.level !== 'locations' || !navState.currentLocation) return [];
    return items.filter(item => item.location_id === navState.currentLocation?.id);
  }, [items, navState.level, navState.currentLocation]);

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

  // Get selected items objects
  const selectedItems = useMemo(() => {
    return items.filter(item => selectedItemIds.has(item.id));
  }, [items, selectedItemIds]);

  // Selection handlers
  const toggleItemSelection = (itemId: string, selected: boolean) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }
      return next;
    });
  };

  const selectAllInLocation = () => {
    const allIds = locationItems.map(item => item.id);
    setSelectedItemIds(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedItemIds(new Set());
    setSelectionMode(false);
  };

  const toggleSelectionMode = () => {
    if (selectionMode) {
      clearSelection();
    } else {
      setSelectionMode(true);
    }
  };

  // Move handlers
  const handleMoveItems = async (classificationId: string, locationId: string) => {
    const itemIds = singleItemToMove ? [singleItemToMove.id] : Array.from(selectedItemIds);
    const success = await moveItems(itemIds, classificationId, locationId);
    
    if (success) {
      clearSelection();
      setSingleItemToMove(null);
      refetchClassifications();
      refetchLocations();
    }
    
    return success;
  };

  const openMoveDialogForSingleItem = (item: InventoryItem) => {
    setSingleItemToMove(item);
    setMoveDialogOpen(true);
  };

  const openMoveDialogForSelection = () => {
    setSingleItemToMove(null);
    setMoveDialogOpen(true);
  };

  // Navigation handlers
  const goToClassifications = () => {
    setNavState({ level: 'classifications' });
    setSearchQuery('');
    setIsSearching(false);
    clearSelection();
  };

  const goToLocations = (classification: WarehouseClassification) => {
    setNavState({ level: 'locations', classification, parentLocations: [], currentLocation: undefined });
    setSearchQuery('');
    setIsSearching(false);
    clearSelection();
  };

  const goIntoFolder = (location: WarehouseLocation) => {
    // Navigate into a folder - add current location to parent stack if exists
    const newParentStack = navState.currentLocation 
      ? [...(navState.parentLocations || []), navState.currentLocation]
      : [...(navState.parentLocations || [])];
    
    setNavState({ 
      level: 'locations', 
      classification: navState.classification,
      parentLocations: newParentStack,
      currentLocation: location
    });
    setSearchQuery('');
    setIsSearching(false);
    clearSelection();
  };

  const goBack = () => {
    if (navState.level === 'locations') {
      if (navState.currentLocation) {
        // We're inside a folder, go back to parent
        if (navState.parentLocations && navState.parentLocations.length > 0) {
          // Go to the last parent folder
          const newParentStack = [...navState.parentLocations];
          const parentFolder = newParentStack.pop();
          setNavState({ 
            level: 'locations', 
            classification: navState.classification,
            parentLocations: newParentStack,
            currentLocation: parentFolder
          });
        } else {
          // Go to root of classification (no current location)
          setNavState({ 
            level: 'locations', 
            classification: navState.classification,
            parentLocations: [],
            currentLocation: undefined
          });
        }
      } else {
        // We're at root of classification, go back to classifications
        setNavState({ level: 'classifications' });
      }
    }
    setSearchQuery('');
    setIsSearching(false);
    clearSelection();
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
    
    // Get the current folder id as parent (if we're inside a folder)
    const parentId = navState.currentLocation?.id || null;
    
    return await createLocation({
      ...data,
      classification_id: navState.classification.id,
      department_id: department.id,
      parent_id: parentId,
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
    if (!navState.classification || !navState.currentLocation) return false;
    
    return await createItem({
      ...data,
      department_id: department.id,
      classification_id: navState.classification.id,
      location_id: navState.currentLocation.id,
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
                        {navState.level === 'locations' && !navState.currentLocation && (!navState.parentLocations || navState.parentLocations.length === 0) ? (
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

                  {/* Parent Locations (nested folders) */}
                  {navState.parentLocations?.map((parentLoc, index) => (
                    <span key={parentLoc.id} className="flex items-center">
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink 
                          onClick={() => {
                            // Navigate to this parent level
                            const newParentStack = navState.parentLocations!.slice(0, index);
                            setNavState({
                              level: 'locations',
                              classification: navState.classification,
                              parentLocations: newParentStack,
                              currentLocation: parentLoc
                            });
                          }}
                          className="cursor-pointer"
                        >
                          {parentLoc.name}
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                    </span>
                  ))}
                  
                  {/* Current Location */}
                  {navState.currentLocation && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>{navState.currentLocation.name}</BreadcrumbPage>
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
                    onEdit={() => {
                      setEditingItem(item);
                      setEditItemDialogOpen(true);
                    }}
                    onDelete={() => deleteItem(item.id)}
                    onStockIn={() => {}}
                    onStockOut={() => {}}
                    onMove={() => openMoveDialogForSingleItem(item)}
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
                {classifications.map((classification) => {
                  const cStats = classificationStatsById.get(classification.id);

                  return (
                    <FolderCard
                      key={classification.id}
                      name={classification.name}
                      itemCount={cStats?.itemCount ?? classification.item_count}
                      totalQuantity={cStats?.totalQuantity ?? classification.total_quantity}
                      lowStockCount={cStats?.lowStockCount ?? classification.low_stock_count}
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
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Locations View - Shows both sub-folders and items */}
        {!isSearching && navState.level === 'locations' && navState.classification && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={goBack} disabled={selectionMode}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">
                  {navState.currentLocation?.name || navState.classification.name}
                </h2>
                {locations.length > 0 && (
                  <Badge variant="outline">{locations.length} folder{locations.length > 1 ? 's' : ''}</Badge>
                )}
                {navState.currentLocation && locationItems.length > 0 && (
                  <Badge variant="outline">{locationItems.length} item{locationItems.length > 1 ? 's' : ''}</Badge>
                )}
              </div>
              
              {canManage && (
                <div className="flex items-center gap-2">
                  {/* Selection Mode Controls - Only show when inside a folder with items */}
                  {navState.currentLocation && locationItems.length > 0 && (
                    <>
                      {selectionMode ? (
                        <>
                          <Badge variant="secondary" className="gap-1">
                            <CheckSquare className="h-3 w-3" />
                            {selectedItemIds.size} selected
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={selectAllInLocation}
                            disabled={selectedItemIds.size === locationItems.length}
                          >
                            Select All
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={openMoveDialogForSelection}
                            disabled={selectedItemIds.size === 0}
                            className="gap-1 bg-amber-500 hover:bg-amber-600"
                          >
                            <FolderInput className="h-4 w-4" />
                            Move
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearSelection}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={toggleSelectionMode}
                          className="gap-1"
                        >
                          <Square className="h-4 w-4" />
                          Select Items
                        </Button>
                      )}
                    </>
                  )}
                  
                  {!selectionMode && (
                    <>
                      <Button onClick={() => setLocationDialogOpen(true)} size="sm" variant="outline">
                        <FolderPlus className="h-4 w-4 mr-2" />
                        Add Folder
                      </Button>
                      {navState.currentLocation && (
                        <Button onClick={() => setItemDialogOpen(true)} size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {(locationsLoading || itemsLoading) ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : locations.length === 0 && locationItems.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  {navState.currentLocation ? (
                    <>
                      <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                      <h3 className="text-lg font-medium mb-2">This Folder is Empty</h3>
                      <p className="text-muted-foreground mb-4">
                        Add items or create sub-folders to organize your inventory
                      </p>
                      {canManage && (
                        <div className="flex flex-col sm:flex-row gap-2 justify-center">
                          <Button onClick={() => setItemDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                          </Button>
                          <Button variant="outline" onClick={() => setLocationDialogOpen(true)}>
                            <FolderPlus className="h-4 w-4 mr-2" />
                            Add Sub-Folder
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <MapPin className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Folders Yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Create folders like Shelf A, Cabinet 1, etc. to organize items
                      </p>
                      {canManage && (
                        <Button onClick={() => setLocationDialogOpen(true)}>
                          <FolderPlus className="h-4 w-4 mr-2" />
                          Add Folder
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Sub-folders Section */}
                {locations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <FolderPlus className="h-4 w-4" />
                      Folders ({locations.length})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {locations.map((location) => {
                        const lStats = locationStatsById.get(location.id);

                        return (
                          <FolderCard
                            key={location.id}
                            name={location.name}
                            itemCount={lStats?.itemCount ?? location.item_count}
                            totalQuantity={lStats?.totalQuantity ?? location.total_quantity}
                            lowStockCount={lStats?.lowStockCount ?? location.low_stock_count}
                            minItems={location.min_items}
                            subFolderCount={location.sub_folder_count}
                            color={navState.classification?.color}
                            variant="location"
                            canManage={canManage && !selectionMode}
                            onClick={() => goIntoFolder(location)}
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
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Items Section - Only show when inside a folder */}
                {navState.currentLocation && locationItems.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Items ({locationItems.length})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {locationItems.map((item) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          canManage={canManage}
                          selectionMode={selectionMode}
                          isSelected={selectedItemIds.has(item.id)}
                          onSelect={(selected) => toggleItemSelection(item.id, selected)}
                          onEdit={() => {
                            setEditingItem(item);
                            setEditItemDialogOpen(true);
                          }}
                          onDelete={() => deleteItem(item.id)}
                          onStockIn={() => {}}
                          onStockOut={() => {}}
                          onMove={() => openMoveDialogForSingleItem(item)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty items message when inside folder with only sub-folders */}
                {navState.currentLocation && locationItems.length === 0 && locations.length > 0 && (
                  <div className="text-center py-6 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      No items directly in this folder
                    </p>
                    {canManage && (
                      <Button variant="outline" size="sm" onClick={() => setItemDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item Here
                      </Button>
                    )}
                  </div>
                )}
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

      {/* Edit Item Dialog */}
      <EditItemDialog
        open={editItemDialogOpen}
        onOpenChange={(open) => {
          setEditItemDialogOpen(open);
          if (!open) setEditingItem(null);
        }}
        item={editingItem}
        onSubmit={updateItem}
        departmentId={department.id}
      />

      {/* Move Items Dialog */}
      <MoveItemsDialog
        open={moveDialogOpen}
        onOpenChange={(open) => {
          setMoveDialogOpen(open);
          if (!open) setSingleItemToMove(null);
        }}
        selectedItems={singleItemToMove ? [singleItemToMove] : selectedItems}
        departmentId={department.id}
        currentClassificationId={navState.classification?.id}
        currentLocationId={navState.currentLocation?.id}
        onMove={handleMoveItems}
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
