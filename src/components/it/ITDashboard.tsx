import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  RefreshCw,
  Monitor,
  Laptop,
  Server,
  Wifi,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  Ticket,
  Package,
  FolderOpen,
  Settings,
  Bug,
  Wrench,
  Shield,
  Sparkles,
  MapPin,
  Eye,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Department } from '@/hooks/useDepartments';
import { cn } from '@/lib/utils';
import { getDepartmentIcon, getDepartmentColors } from '@/lib/departmentIcons';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { useITEquipment, ITEquipmentItem } from '@/hooks/useITEquipment';
import { ITEquipmentDetailDialog } from './ITEquipmentDetailDialog';
import { ITEquipmentFolderView } from './ITEquipmentFolderView';

interface ITDashboardProps {
  department: Department;
  canManage: boolean;
}

type TabType = 'overview' | 'tickets' | 'equipment';

export function ITDashboard({ department, canManage }: ITDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedEquipment, setSelectedEquipment] = useState<ITEquipmentItem | null>(null);
  const [equipmentDetailOpen, setEquipmentDetailOpen] = useState(false);
  const { toast } = useToast();

  // Fetch real data
  const { tickets, loading: ticketsLoading, stats: ticketStats, updateTicket, refetch: refetchTickets } = useSupportTickets({
    isITDepartment: true,
    showAllTickets: true,
  });

  const { equipment, folders, loading: equipmentLoading, stats: equipmentStats, refetch: refetchEquipment } = useITEquipment();

  const deptColors = getDepartmentColors(department.code);
  const DeptIcon = getDepartmentIcon(department.code);

  const getEquipmentIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('laptop') || lowerName.includes('notebook')) return Laptop;
    if (lowerName.includes('server')) return Server;
    if (lowerName.includes('switch') || lowerName.includes('router') || lowerName.includes('wifi')) return Wifi;
    if (lowerName.includes('monitor') || lowerName.includes('desktop')) return Monitor;
    return HardDrive;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'open':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStockBadge = (item: ITEquipmentItem) => {
    if (item.quantity === 0) {
      return <Badge variant="destructive" className="text-xs">Out of Stock</Badge>;
    }
    if (item.quantity <= (item.min_quantity || 0)) {
      return <Badge className="bg-amber-500 text-xs">Low Stock</Badge>;
    }
    return <Badge className="bg-emerald-500 text-xs">In Stock</Badge>;
  };

  const handleRefresh = () => {
    refetchTickets();
    refetchEquipment();
    toast({ title: 'Refreshed', description: 'Data has been refreshed' });
  };

  const handleViewEquipment = (item: ITEquipmentItem) => {
    setSelectedEquipment(item);
    setEquipmentDetailOpen(true);
  };

  // Filter equipment
  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.item_number.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'low_stock') return matchesSearch && item.quantity <= (item.min_quantity || 0) && item.quantity > 0;
    if (statusFilter === 'out_of_stock') return matchesSearch && item.quantity === 0;
    if (statusFilter === 'in_stock') return matchesSearch && item.quantity > (item.min_quantity || 0);
    return matchesSearch;
  });

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.department_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && ticket.status === statusFilter;
  });

  const isLoading = ticketsLoading || equipmentLoading;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Header */}
      <div className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 md:p-8 text-white",
        deptColors.gradient
      )}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <DeptIcon className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl md:text-3xl font-bold">{department.name}</h2>
                <Badge className="bg-white/20 text-white border-none">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Technology
                </Badge>
              </div>
              <p className="text-white/80 mt-1">
                {department.description || 'IT Support, Equipment & Infrastructure'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="secondary" 
              size="icon" 
              onClick={handleRefresh} 
              disabled={isLoading}
              className="bg-white/20 hover:bg-white/30 text-white border-none"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
              <Monitor className="h-4 w-4" />
              Equipment
            </div>
            <p className="text-3xl font-bold">{equipmentStats.total}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
              <Ticket className="h-4 w-4" />
              Open Tickets
            </div>
            <p className="text-3xl font-bold">{ticketStats.open + ticketStats.inProgress}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
              <AlertTriangle className="h-4 w-4" />
              Critical
            </div>
            <p className="text-3xl font-bold">{ticketStats.critical}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
              <CheckCircle2 className="h-4 w-4" />
              Resolved
            </div>
            <p className="text-3xl font-bold">{ticketStats.resolved}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { id: 'overview' as TabType, label: 'Overview', icon: LayoutGrid },
          { id: 'tickets' as TabType, label: 'Support Tickets', icon: Ticket },
          { id: 'equipment' as TabType, label: 'IT Equipment', icon: Monitor },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'outline'}
            className={cn(
              'gap-2',
              activeTab === tab.id && 'bg-primary'
            )}
            onClick={() => {
              setActiveTab(tab.id);
              setSearchQuery('');
              setStatusFilter('all');
            }}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Main Content */}
      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Tickets */}
          <Card className="shadow-corporate lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                Recent Support Tickets
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('tickets')}>
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {ticketsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Ticket className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No support tickets yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.slice(0, 5).map((ticket) => (
                    <div key={ticket.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={cn('text-xs', getPriorityColor(ticket.priority))}>
                              {ticket.priority}
                            </Badge>
                            <Badge variant="outline" className={getStatusColor(ticket.status)}>
                              {ticket.status.replace('_', ' ')}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {ticket.department_name}
                            </Badge>
                          </div>
                          <h4 className="font-medium truncate">{ticket.title}</h4>
                          <p className="text-sm text-muted-foreground truncate">{ticket.description}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {ticket.ticket_number} • {ticket.requester_name} • {format(new Date(ticket.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        {canManage && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                          <Select
                            value={ticket.status}
                            onValueChange={(value) => updateTicket(ticket.id, { status: value as any })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Equipment Summary & Quick Actions */}
          <div className="space-y-6">
            <Card className="shadow-corporate">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Equipment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
                    <p className="text-2xl font-bold text-emerald-600">{equipmentStats.inStock}</p>
                    <p className="text-xs text-muted-foreground">In Stock</p>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                    <p className="text-2xl font-bold text-amber-600">{equipmentStats.lowStock}</p>
                    <p className="text-xs text-muted-foreground">Low Stock</p>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-600">{equipmentStats.outOfStock}</p>
                    <p className="text-xs text-muted-foreground">Out of Stock</p>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">{equipmentStats.totalQuantity}</p>
                    <p className="text-xs text-muted-foreground">Total Units</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={() => setActiveTab('equipment')}>
                  <Eye className="h-4 w-4 mr-2" />
                  View All Equipment
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-corporate">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  Ticket Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Open</span>
                  <Badge variant="outline">{ticketStats.open}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">In Progress</span>
                  <Badge variant="outline">{ticketStats.inProgress}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <Badge variant="outline">{ticketStats.pending}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">High Priority</span>
                  <Badge className="bg-orange-500">{ticketStats.high}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Critical</span>
                  <Badge variant="destructive">{ticketStats.critical}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'tickets' && (
        <Card className="shadow-corporate">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>All Support Tickets</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tickets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {ticketsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Ticket className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>No tickets found</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {filteredTickets.map((ticket) => (
                    <div key={ticket.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge className={cn('text-xs', getPriorityColor(ticket.priority))}>
                              {ticket.priority}
                            </Badge>
                            <Badge variant="outline" className={getStatusColor(ticket.status)}>
                              {ticket.status.replace('_', ' ')}
                            </Badge>
                            <Badge variant="secondary" className="text-xs gap-1">
                              <FolderOpen className="h-3 w-3" />
                              {ticket.department_name}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {ticket.category.replace('_', ' ')}
                            </Badge>
                          </div>
                          <h4 className="font-medium">{ticket.title}</h4>
                          {ticket.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                            <span className="font-mono">{ticket.ticket_number}</span>
                            <span>By: {ticket.requester_name}</span>
                            <span>{format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}</span>
                          </div>
                        </div>
                        {canManage && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                          <Select
                            value={ticket.status}
                            onValueChange={(value) => updateTicket(ticket.id, { status: value as any })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'equipment' && (
        <Card className="shadow-corporate">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-primary" />
                IT Equipment Inventory
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{equipmentStats.inStock} In Stock</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>{equipmentStats.lowStock} Low</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span>{equipmentStats.outOfStock} Out</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {equipmentLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ITEquipmentFolderView
                folders={folders}
                onViewItem={handleViewEquipment}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Equipment Detail Dialog */}
      <ITEquipmentDetailDialog
        open={equipmentDetailOpen}
        onOpenChange={setEquipmentDetailOpen}
        item={selectedEquipment}
      />
    </div>
  );
}
