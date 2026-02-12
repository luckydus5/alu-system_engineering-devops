import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Users, Plus, Trash2, Search, Shield, CalendarDays, Edit, Loader2 
} from 'lucide-react';
import { useLeaveManagers } from '@/hooks/useLeaveManagers';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ProfileOption {
  id: string;
  full_name: string | null;
  email: string;
  department_name: string | null;
}

export function LeaveManagersManagement() {
  const { leaveManagers, isLoading, addLeaveManager, removeLeaveManager } = useLeaveManagers();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [canFileForOthers, setCanFileForOthers] = useState(true);
  const [canEditBalances, setCanEditBalances] = useState(false);

  useEffect(() => {
    async function loadProfiles() {
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, department_id')
        .order('full_name');

      if (allProfiles) {
        const deptIds = [...new Set(allProfiles.filter(p => p.department_id).map(p => p.department_id!))];
        const { data: depts } = await supabase
          .from('departments')
          .select('id, name')
          .in('id', deptIds);
        const deptMap = new Map(depts?.map(d => [d.id, d.name]) || []);

        setProfiles(allProfiles.map(p => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          department_name: p.department_id ? deptMap.get(p.department_id) || null : null,
        })));
      }
    }
    if (addDialogOpen) loadProfiles();
  }, [addDialogOpen]);

  const existingManagerIds = new Set(leaveManagers.map(m => m.user_id));

  const filteredProfiles = profiles.filter(p => {
    if (existingManagerIds.has(p.id)) return false;
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (p.full_name?.toLowerCase().includes(s) || p.email.toLowerCase().includes(s));
  }).slice(0, 15);

  const handleAdd = async () => {
    if (!selectedUserId) return;
    await addLeaveManager.mutateAsync({
      user_id: selectedUserId,
      can_file_for_others: canFileForOthers,
      can_edit_balances: canEditBalances,
    });
    setAddDialogOpen(false);
    setSelectedUserId('');
    setSearchTerm('');
    setCanFileForOthers(true);
    setCanEditBalances(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Leave Management Access
            </CardTitle>
            <CardDescription>
              Control who can file leave on behalf of employees and edit leave balances
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Manager
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : leaveManagers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No leave managers configured</p>
            <p className="text-xs mt-1">HR staff always have leave management access by default</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaveManagers.map(manager => (
              <div key={manager.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{manager.profile?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{manager.profile?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {manager.can_file_for_others && (
                    <Badge variant="secondary" className="text-[10px]">File for Others</Badge>
                  )}
                  {manager.can_edit_balances && (
                    <Badge variant="secondary" className="text-[10px]">Edit Balances</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => removeLeaveManager.mutate(manager.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <strong>Note:</strong> HR department users and Super Admins always have full leave management access regardless of this list.
        </div>
      </CardContent>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Leave Manager</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Search User</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <ScrollArea className="max-h-[200px]">
              <div className="space-y-1">
                {filteredProfiles.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedUserId(p.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-sm",
                      selectedUserId === p.id && "bg-primary/10 ring-1 ring-primary"
                    )}
                  >
                    <div className="font-medium">{p.full_name || p.email}</div>
                    <div className="text-xs text-muted-foreground">{p.email} {p.department_name && `• ${p.department_name}`}</div>
                  </button>
                ))}
              </div>
            </ScrollArea>

            <div className="space-y-3 pt-2 border-t">
              <Label className="text-sm font-medium">Permissions</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="can-file"
                  checked={canFileForOthers}
                  onCheckedChange={(c) => setCanFileForOthers(c as boolean)}
                />
                <Label htmlFor="can-file" className="text-sm cursor-pointer">
                  Can file leave requests for other employees
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="can-edit-bal"
                  checked={canEditBalances}
                  onCheckedChange={(c) => setCanEditBalances(c as boolean)}
                />
                <Label htmlFor="can-edit-bal" className="text-sm cursor-pointer">
                  Can edit employee leave balances
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!selectedUserId || addLeaveManager.isPending}>
              {addLeaveManager.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Manager
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
