import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Users,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Shield,
} from 'lucide-react';
import { Department } from '@/hooks/useDepartments';
import { cn } from '@/lib/utils';
import { getDepartmentIcon, getDepartmentColors } from '@/lib/departmentIcons';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ITDashboardProps {
  department: Department;
  canManage: boolean;
}

// Mock data for IT equipment and tickets
interface ITEquipment {
  id: string;
  name: string;
  type: 'laptop' | 'desktop' | 'server' | 'network' | 'printer' | 'other';
  status: 'active' | 'maintenance' | 'retired' | 'assigned';
  assignedTo?: string;
  serialNumber: string;
  location: string;
  lastMaintenance?: string;
}

interface ITTicket {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  category: 'hardware' | 'software' | 'network' | 'security' | 'other';
  assignedTo?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ITProject {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'in_progress' | 'testing' | 'completed' | 'on_hold';
  progress: number;
  startDate: string;
  endDate?: string;
  teamMembers: string[];
}

// Sample data
const sampleEquipment: ITEquipment[] = [
  { id: '1', name: 'Dell Latitude 5520', type: 'laptop', status: 'assigned', assignedTo: 'John Doe', serialNumber: 'DL5520-001', location: 'Office A' },
  { id: '2', name: 'HP ProDesk 400', type: 'desktop', status: 'active', serialNumber: 'HP400-002', location: 'Office B' },
  { id: '3', name: 'Dell PowerEdge R740', type: 'server', status: 'active', serialNumber: 'PE740-001', location: 'Server Room' },
  { id: '4', name: 'Cisco Switch 2960', type: 'network', status: 'active', serialNumber: 'CS2960-001', location: 'Network Closet' },
  { id: '5', name: 'MacBook Pro 14"', type: 'laptop', status: 'maintenance', serialNumber: 'MBP14-003', location: 'IT Office' },
];

const sampleTickets: ITTicket[] = [
  { id: 'TKT-001', title: 'Cannot connect to VPN', description: 'VPN connection fails after password change', priority: 'high', status: 'open', category: 'network', createdBy: 'Jane Smith', createdAt: '2026-01-11T08:00:00Z', updatedAt: '2026-01-11T08:00:00Z' },
  { id: 'TKT-002', title: 'New laptop request', description: 'Need new laptop for new hire', priority: 'medium', status: 'in_progress', category: 'hardware', assignedTo: 'IT Admin', createdBy: 'HR Team', createdAt: '2026-01-10T10:00:00Z', updatedAt: '2026-01-11T09:00:00Z' },
  { id: 'TKT-003', title: 'Software installation', description: 'Install Adobe Creative Suite', priority: 'low', status: 'resolved', category: 'software', assignedTo: 'IT Admin', createdBy: 'Marketing', createdAt: '2026-01-09T14:00:00Z', updatedAt: '2026-01-10T16:00:00Z' },
];

const sampleProjects: ITProject[] = [
  { id: 'PRJ-001', name: 'Network Upgrade', description: 'Upgrade office network infrastructure to 10Gbps', status: 'in_progress', progress: 65, startDate: '2026-01-01', endDate: '2026-03-31', teamMembers: ['IT Admin', 'Network Engineer'] },
  { id: 'PRJ-002', name: 'Security Audit', description: 'Annual security audit and compliance check', status: 'planning', progress: 15, startDate: '2026-02-01', teamMembers: ['Security Lead'] },
  { id: 'PRJ-003', name: 'Cloud Migration', description: 'Migrate on-premise servers to cloud', status: 'testing', progress: 85, startDate: '2025-10-01', endDate: '2026-01-31', teamMembers: ['Cloud Architect', 'DevOps'] },
];

type TabType = 'overview' | 'tickets' | 'equipment' | 'projects';

export function ITDashboard({ department, canManage }: ITDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(false);
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [newEquipmentOpen, setNewEquipmentOpen] = useState(false);
  const { toast } = useToast();

  // Stats
  const stats = {
    totalEquipment: sampleEquipment.length,
    activeEquipment: sampleEquipment.filter(e => e.status === 'active' || e.status === 'assigned').length,
    maintenanceItems: sampleEquipment.filter(e => e.status === 'maintenance').length,
    openTickets: sampleTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
    resolvedTickets: sampleTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
    criticalTickets: sampleTickets.filter(t => t.priority === 'critical' && t.status !== 'closed').length,
    activeProjects: sampleProjects.filter(p => p.status === 'in_progress' || p.status === 'testing').length,
  };

  const deptColors = getDepartmentColors(department.code);
  const DeptIcon = getDepartmentIcon(department.code);

  const getEquipmentIcon = (type: ITEquipment['type']) => {
    switch (type) {
      case 'laptop': return Laptop;
      case 'desktop': return Monitor;
      case 'server': return Server;
      case 'network': return Wifi;
      default: return HardDrive;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'assigned':
      case 'resolved':
      case 'completed':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'in_progress':
      case 'testing':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'maintenance':
      case 'planning':
      case 'on_hold':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'open':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'retired':
      case 'closed':
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

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast({ title: 'Refreshed', description: 'Data has been refreshed' });
    }, 1000);
  };

  const handleCreateTicket = () => {
    toast({ title: 'Ticket Created', description: 'Your support ticket has been submitted' });
    setNewTicketOpen(false);
  };

  const handleAddEquipment = () => {
    toast({ title: 'Equipment Added', description: 'New equipment has been registered' });
    setNewEquipmentOpen(false);
  };

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
            {canManage && (
              <Button 
                onClick={() => setNewTicketOpen(true)}
                className="bg-white text-gray-800 hover:bg-white/90 shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
              <Monitor className="h-4 w-4" />
              Equipment
            </div>
            <p className="text-3xl font-bold">{stats.totalEquipment}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
              <Ticket className="h-4 w-4" />
              Open Tickets
            </div>
            <p className="text-3xl font-bold">{stats.openTickets}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
              <FolderOpen className="h-4 w-4" />
              Projects
            </div>
            <p className="text-3xl font-bold">{stats.activeProjects}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
              <AlertTriangle className="h-4 w-4" />
              Critical
            </div>
            <p className="text-3xl font-bold">{stats.criticalTickets}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { id: 'overview' as TabType, label: 'Overview', icon: LayoutGrid },
          { id: 'tickets' as TabType, label: 'Support Tickets', icon: Ticket },
          { id: 'equipment' as TabType, label: 'Equipment', icon: Monitor },
          { id: 'projects' as TabType, label: 'Projects', icon: FolderOpen },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'outline'}
            className={cn(
              'gap-2',
              activeTab === tab.id && 'bg-primary'
            )}
            onClick={() => setActiveTab(tab.id)}
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
              <div className="space-y-3">
                {sampleTickets.slice(0, 3).map((ticket) => (
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
                        </div>
                        <h4 className="font-medium truncate">{ticket.title}</h4>
                        <p className="text-sm text-muted-foreground truncate">{ticket.description}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {ticket.id} • {format(new Date(ticket.createdAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions & Status */}
          <div className="space-y-6">
            <Card className="shadow-corporate">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {canManage && (
                  <>
                    <Button className="w-full justify-start gap-2" variant="outline" onClick={() => setNewTicketOpen(true)}>
                      <Bug className="h-4 w-4" />
                      Report an Issue
                    </Button>
                    <Button className="w-full justify-start gap-2" variant="outline" onClick={() => setNewEquipmentOpen(true)}>
                      <Package className="h-4 w-4" />
                      Register Equipment
                    </Button>
                    <Button className="w-full justify-start gap-2" variant="outline">
                      <Wrench className="h-4 w-4" />
                      Request Maintenance
                    </Button>
                  </>
                )}
                <Button className="w-full justify-start gap-2" variant="outline">
                  <Shield className="h-4 w-4" />
                  Security Status
                </Button>
              </CardContent>
            </Card>

            {/* Active Projects */}
            <Card className="shadow-corporate">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Active Projects
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sampleProjects.filter(p => p.status === 'in_progress' || p.status === 'testing').slice(0, 2).map((project) => (
                  <div key={project.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{project.name}</span>
                      <Badge variant="outline" className={getStatusColor(project.status)}>
                        {project.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">{project.progress}% complete</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'tickets' && (
        <Card className="shadow-corporate">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>Support Tickets</CardTitle>
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
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sampleTickets.map((ticket) => (
                <div key={ticket.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground">{ticket.id}</span>
                        <Badge className={cn('text-xs', getPriorityColor(ticket.priority))}>
                          {ticket.priority}
                        </Badge>
                        <Badge variant="outline" className={getStatusColor(ticket.status)}>
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="secondary">{ticket.category}</Badge>
                      </div>
                      <h4 className="font-medium">{ticket.title}</h4>
                      <p className="text-sm text-muted-foreground">{ticket.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Created by: {ticket.createdBy}</span>
                        <span>•</span>
                        <span>{format(new Date(ticket.createdAt), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                    </div>
                    {canManage && (
                      <Button variant="outline" size="sm">Manage</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'equipment' && (
        <Card className="shadow-corporate">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                IT Equipment Inventory
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search equipment..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {canManage && (
                  <Button onClick={() => setNewEquipmentOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Equipment
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sampleEquipment.map((item) => {
                const Icon = getEquipmentIcon(item.type);
                return (
                  <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{item.name}</h4>
                          <p className="text-xs text-muted-foreground font-mono">{item.serialNumber}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className={getStatusColor(item.status)}>
                              {item.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            📍 {item.location}
                            {item.assignedTo && ` • 👤 ${item.assignedTo}`}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'projects' && (
        <Card className="shadow-corporate">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              IT Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sampleProjects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{project.name}</h4>
                          <Badge variant="outline" className={getStatusColor(project.status)}>
                            {project.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{project.description}</p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Progress</span>
                            <span className="font-medium">{project.progress}%</span>
                          </div>
                          <Progress value={project.progress} className="h-2" />
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span>Start: {format(new Date(project.startDate), 'MMM d, yyyy')}</span>
                          {project.endDate && (
                            <span>End: {format(new Date(project.endDate), 'MMM d, yyyy')}</span>
                          )}
                          <span>Team: {project.teamMembers.length} members</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Ticket Dialog */}
      <Dialog open={newTicketOpen} onOpenChange={setNewTicketOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>
              Report an issue or request IT assistance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="Brief description of the issue" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select defaultValue="software">
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="network">Network</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select defaultValue="medium">
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Detailed description of the issue..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTicketOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTicket}>Create Ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Equipment Dialog */}
      <Dialog open={newEquipmentOpen} onOpenChange={setNewEquipmentOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Register New Equipment</DialogTitle>
            <DialogDescription>
              Add a new device to the IT inventory
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="equipName">Equipment Name</Label>
              <Input id="equipName" placeholder="e.g., Dell Latitude 5520" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select defaultValue="laptop">
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="laptop">Laptop</SelectItem>
                  <SelectItem value="desktop">Desktop</SelectItem>
                  <SelectItem value="server">Server</SelectItem>
                  <SelectItem value="network">Network Device</SelectItem>
                  <SelectItem value="printer">Printer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="serial">Serial Number</Label>
              <Input id="serial" placeholder="Enter serial number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="e.g., Office A, Server Room" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewEquipmentOpen(false)}>Cancel</Button>
            <Button onClick={handleAddEquipment}>Add Equipment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
