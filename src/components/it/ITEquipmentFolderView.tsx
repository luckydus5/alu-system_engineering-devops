import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  FolderOpen,
  Folder,
  ChevronRight,
  ArrowLeft,
  Package,
  Laptop,
  Monitor,
  Server,
  Wifi,
  HardDrive,
  Printer,
  Cable,
  Smartphone,
  Battery,
  Keyboard,
  Mouse,
  Headphones,
  MapPin,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  List,
} from 'lucide-react';
import { ITEquipmentItem, ITEquipmentFolder } from '@/hooks/useITEquipment';
import { cn } from '@/lib/utils';

interface ITEquipmentFolderViewProps {
  folders: ITEquipmentFolder[];
  onViewItem: (item: ITEquipmentItem) => void;
}

// Get folder icon based on folder name
const getFolderIcon = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('laptop') || lowerName.includes('notebook')) return Laptop;
  if (lowerName.includes('monitor') || lowerName.includes('display')) return Monitor;
  if (lowerName.includes('server')) return Server;
  if (lowerName.includes('router') || lowerName.includes('wifi') || lowerName.includes('switch') || lowerName.includes('network')) return Wifi;
  if (lowerName.includes('printer') || lowerName.includes('print')) return Printer;
  if (lowerName.includes('cable') || lowerName.includes('adapter')) return Cable;
  if (lowerName.includes('phone') || lowerName.includes('mobile')) return Smartphone;
  if (lowerName.includes('battery') || lowerName.includes('power')) return Battery;
  if (lowerName.includes('keyboard')) return Keyboard;
  if (lowerName.includes('mouse')) return Mouse;
  if (lowerName.includes('headphone') || lowerName.includes('headset') || lowerName.includes('audio')) return Headphones;
  return Folder;
};

// Get item icon based on item name
const getItemIcon = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('laptop') || lowerName.includes('notebook')) return Laptop;
  if (lowerName.includes('monitor') || lowerName.includes('display') || lowerName.includes('screen')) return Monitor;
  if (lowerName.includes('server')) return Server;
  if (lowerName.includes('router') || lowerName.includes('wifi') || lowerName.includes('switch')) return Wifi;
  if (lowerName.includes('printer') || lowerName.includes('print')) return Printer;
  if (lowerName.includes('cable') || lowerName.includes('adapter') || lowerName.includes('charger')) return Cable;
  if (lowerName.includes('phone') || lowerName.includes('mobile')) return Smartphone;
  if (lowerName.includes('battery') || lowerName.includes('power') || lowerName.includes('ups')) return Battery;
  if (lowerName.includes('keyboard')) return Keyboard;
  if (lowerName.includes('mouse')) return Mouse;
  if (lowerName.includes('headphone') || lowerName.includes('headset')) return Headphones;
  return HardDrive;
};

// Folder colors based on category
const getFolderColor = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('laptop')) return 'from-blue-500 to-blue-600';
  if (lowerName.includes('monitor')) return 'from-purple-500 to-purple-600';
  if (lowerName.includes('printer')) return 'from-green-500 to-green-600';
  if (lowerName.includes('cable') || lowerName.includes('adapter')) return 'from-amber-500 to-amber-600';
  if (lowerName.includes('router') || lowerName.includes('network')) return 'from-cyan-500 to-cyan-600';
  if (lowerName.includes('server')) return 'from-slate-500 to-slate-600';
  if (lowerName.includes('phone')) return 'from-pink-500 to-pink-600';
  if (lowerName.includes('battery') || lowerName.includes('power')) return 'from-orange-500 to-orange-600';
  return 'from-indigo-500 to-indigo-600';
};

export function ITEquipmentFolderView({ folders, onViewItem }: ITEquipmentFolderViewProps) {
  const [selectedFolder, setSelectedFolder] = useState<ITEquipmentFolder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter items in selected folder
  const filteredItems = useMemo(() => {
    if (!selectedFolder) return [];
    
    return selectedFolder.items.filter(item => {
      const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.item_number.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (statusFilter === 'all') return matchesSearch;
      if (statusFilter === 'low_stock') return matchesSearch && item.quantity <= (item.min_quantity || 0) && item.quantity > 0;
      if (statusFilter === 'out_of_stock') return matchesSearch && item.quantity === 0;
      if (statusFilter === 'in_stock') return matchesSearch && item.quantity > (item.min_quantity || 0);
      return matchesSearch;
    });
  }, [selectedFolder, searchQuery, statusFilter]);

  // Filter folders based on search (when not in a folder)
  const filteredFolders = useMemo(() => {
    if (!searchQuery || selectedFolder) return folders;
    return folders.filter(f => 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.items.some(item => 
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.item_number.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [folders, searchQuery, selectedFolder]);

  const getStockBadge = (item: ITEquipmentItem) => {
    if (item.quantity === 0) {
      return <Badge variant="destructive" className="text-xs gap-1"><XCircle className="h-3 w-3" /> Out of Stock</Badge>;
    }
    if (item.quantity <= (item.min_quantity || 0)) {
      return <Badge className="bg-amber-500 text-xs gap-1"><AlertTriangle className="h-3 w-3" /> Low Stock</Badge>;
    }
    return <Badge className="bg-emerald-500 text-xs gap-1"><CheckCircle2 className="h-3 w-3" /> In Stock</Badge>;
  };

  const handleBackToFolders = () => {
    setSelectedFolder(null);
    setSearchQuery('');
    setStatusFilter('all');
  };

  // Folder view
  if (!selectedFolder) {
    return (
      <div className="space-y-4">
        {/* Search bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search folders or equipment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {folders.length} Categories
          </Badge>
        </div>

        {/* Folder Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFolders.map((folder) => {
            const FolderIcon = getFolderIcon(folder.name);
            const colorClass = getFolderColor(folder.name);
            const hasIssues = folder.outOfStockCount > 0 || folder.lowStockCount > 0;
            
            return (
              <Card 
                key={folder.id}
                className={cn(
                  "cursor-pointer group overflow-hidden transition-all duration-300",
                  "hover:shadow-lg hover:-translate-y-1 border-2",
                  hasIssues ? "border-amber-200 dark:border-amber-800" : "border-transparent hover:border-primary/30"
                )}
                onClick={() => setSelectedFolder(folder)}
              >
                <div className={cn(
                  "h-2 bg-gradient-to-r",
                  colorClass
                )} />
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-3 rounded-xl bg-gradient-to-br shadow-md group-hover:scale-110 transition-transform",
                      colorClass
                    )}>
                      <FolderIcon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{folder.name}</h3>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {folder.itemCount} items • {folder.totalQuantity} units
                      </p>
                    </div>
                  </div>
                  
                  {/* Status indicators */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-muted-foreground">{folder.inStockCount}</span>
                    </div>
                    {folder.lowStockCount > 0 && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-amber-600 dark:text-amber-400 font-medium">{folder.lowStockCount}</span>
                      </div>
                    )}
                    {folder.outOfStockCount > 0 && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-red-600 dark:text-red-400 font-medium">{folder.outOfStockCount}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredFolders.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>No categories found</p>
          </div>
        )}
      </div>
    );
  }

  // Items view (inside a folder)
  const FolderIcon = getFolderIcon(selectedFolder.name);
  const colorClass = getFolderColor(selectedFolder.name);

  return (
    <div className="space-y-4">
      {/* Breadcrumb & Controls */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToFolders}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            All Categories
          </Button>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded-lg bg-gradient-to-br",
              colorClass
            )}>
              <FolderIcon className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold">{selectedFolder.name}</span>
            <Badge variant="secondary">{selectedFolder.itemCount} items</Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search in folder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="in_stock">In Stock</SelectItem>
              <SelectItem value="low_stock">Low Stock</SelectItem>
              <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="rounded-r-none"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="rounded-l-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Items Grid/List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p>No equipment found</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const ItemIcon = getItemIcon(item.item_name);
            return (
              <Card
                key={item.id}
                className="cursor-pointer group hover:shadow-md transition-all border-2 border-transparent hover:border-primary/20"
                onClick={() => onViewItem(item)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2.5 rounded-lg bg-gradient-to-br shadow-sm group-hover:scale-105 transition-transform",
                      colorClass
                    )}>
                      <ItemIcon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate group-hover:text-primary transition-colors">
                        {item.item_name}
                      </h4>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.item_number}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Quantity</span>
                      <span className="font-semibold">{item.quantity} {item.unit || 'pcs'}</span>
                    </div>
                    {getStockBadge(item)}
                  </div>
                  
                  {item.last_transaction && (
                    <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                      <p className="truncate">
                        Last: {item.last_transaction.transaction_type}
                        {item.last_transaction.handed_to_user_name && ` → ${item.last_transaction.handed_to_user_name}`}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {filteredItems.map((item) => {
              const ItemIcon = getItemIcon(item.item_name);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => onViewItem(item)}
                >
                  <div className={cn(
                    "p-2 rounded-lg bg-gradient-to-br",
                    colorClass
                  )}>
                    <ItemIcon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{item.item_name}</h4>
                    <p className="text-sm text-muted-foreground font-mono">{item.item_number}</p>
                  </div>
                  {item.last_transaction?.handed_to_user_name && (
                    <div className="text-xs text-muted-foreground max-w-[120px] truncate">
                      → {item.last_transaction.handed_to_user_name}
                    </div>
                  )}
                  {getStockBadge(item)}
                  <div className="text-right min-w-[60px]">
                    <span className="font-semibold">{item.quantity}</span>
                    <span className="text-xs text-muted-foreground ml-1">{item.unit || 'pcs'}</span>
                  </div>
                  <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}