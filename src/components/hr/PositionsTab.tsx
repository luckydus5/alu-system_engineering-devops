import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Plus, Search, Briefcase, Edit2, Trash2, 
  ArrowUpDown, Building, Loader2, CheckCircle, XCircle 
} from 'lucide-react';
import { usePositions, Position } from '@/hooks/usePositions';
import { useDepartments } from '@/hooks/useDepartments';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-slate-500/20 text-slate-600 dark:text-slate-400',
  2: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  3: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
  4: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  5: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
  6: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
  7: 'bg-red-500/20 text-red-600 dark:text-red-400',
};

export function PositionsTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [level, setLevel] = useState(1);
  const [isActive, setIsActive] = useState(true);

  const { positions, isLoading, createPosition, updatePosition, deletePosition } = usePositions();
  const { departments } = useDepartments();

  const filteredPositions = positions.filter(pos =>
    pos.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pos.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreateDialog = () => {
    setEditingPosition(null);
    setName('');
    setDescription('');
    setDepartmentId('');
    setLevel(1);
    setIsActive(true);
    setDialogOpen(true);
  };

  const openEditDialog = (position: Position) => {
    setEditingPosition(position);
    setName(position.name);
    setDescription(position.description || '');
    setDepartmentId(position.department_id || '');
    setLevel(position.level);
    setIsActive(position.is_active);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    const data = {
      name: name.trim(),
      description: description.trim() || null,
      department_id: departmentId || null,
      level,
      is_active: isActive,
    };

    if (editingPosition) {
      await updatePosition.mutateAsync({ id: editingPosition.id, ...data });
    } else {
      await createPosition.mutateAsync(data);
    }

    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this position?')) {
      await deletePosition.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-6 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Position Management
            <Badge variant="secondary" className="ml-2">{positions.length} positions</Badge>
          </CardTitle>
          <Button onClick={openCreateDialog} size="sm" className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Position
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search positions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Positions Grid */}
          <ScrollArea className="h-[500px]">
            <div className="grid gap-3">
              {filteredPositions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No positions found</p>
                </div>
              ) : (
                filteredPositions.map(position => (
                  <div
                    key={position.id}
                    className="p-4 rounded-xl border bg-card hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${LEVEL_COLORS[position.level] || LEVEL_COLORS[1]}`}>
                          <Briefcase className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{position.name}</span>
                            <Badge variant="outline" className="text-xs">
                              Level {position.level}
                            </Badge>
                            {position.is_active ? (
                              <Badge className="bg-emerald-500/20 text-emerald-600 border-0 text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge className="bg-muted text-muted-foreground border-0 text-xs">
                                <XCircle className="h-3 w-3 mr-1" />
                                Inactive
                              </Badge>
                            )}
                          </div>
                          {position.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {position.description}
                            </p>
                          )}
                          {position.department && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Building className="h-3 w-3" />
                              {position.department.name}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(position)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(position.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              {editingPosition ? 'Edit Position' : 'Add New Position'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Position Name *</Label>
              <Input
                placeholder="e.g. Senior Developer"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the position responsibilities..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department (Optional)</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any department</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Level</Label>
                <Select value={String(level)} onValueChange={(v) => setLevel(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7].map(lvl => (
                      <SelectItem key={lvl} value={String(lvl)}>Level {lvl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label>Active Status</Label>
                <p className="text-sm text-muted-foreground">Position is available for assignment</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!name.trim() || createPosition.isPending || updatePosition.isPending}
            >
              {(createPosition.isPending || updatePosition.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingPosition ? 'Update' : 'Create'} Position
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
