import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDepartments } from '@/hooks/useDepartments';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Building2 } from 'lucide-react';

interface DepartmentAccessDialogProps {
  user: {
    id: string;
    full_name: string | null;
    email: string;
    department_id: string | null;
    department_name: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface DepartmentAccess {
  id: string;
  department_id: string;
}

export function DepartmentAccessDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: DepartmentAccessDialogProps) {
  const { departments } = useDepartments();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [additionalAccess, setAdditionalAccess] = useState<string[]>([]);

  // Fetch current additional department access
  useEffect(() => {
    if (user && open) {
      setLoading(true);
      supabase
        .from('user_department_access')
        .select('department_id')
        .eq('user_id', user.id)
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching department access:', error);
          } else {
            setAdditionalAccess((data || []).map((d) => d.department_id));
          }
          setLoading(false);
        });
    }
  }, [user, open]);

  const handleToggleDepartment = (departmentId: string) => {
    setAdditionalAccess((prev) =>
      prev.includes(departmentId)
        ? prev.filter((id) => id !== departmentId)
        : [...prev, departmentId]
    );
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'update_department_access',
          userId: user.id,
          departmentIds: additionalAccess,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: 'Access updated',
        description: `Department access for ${user.full_name || user.email} has been updated.`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Failed to update access',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Filter out the user's primary department from additional access options
  const availableDepartments = departments.filter(
    (dept) => dept.id !== user?.department_id
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Department Access
          </DialogTitle>
          <DialogDescription>
            Grant {user?.full_name || user?.email} access to additional departments
            for cross-department collaboration.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Primary Department */}
            {user?.department_name && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Primary Department</Label>
                <div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {user.department_name}
                  </Badge>
                </div>
              </div>
            )}

            {/* Additional Access */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Additional Access</Label>
              {availableDepartments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No other departments available.
                </p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {availableDepartments.map((dept) => (
                    <div
                      key={dept.id}
                      className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={`dept-${dept.id}`}
                        checked={additionalAccess.includes(dept.id)}
                        onCheckedChange={() => handleToggleDepartment(dept.id)}
                      />
                      <Label
                        htmlFor={`dept-${dept.id}`}
                        className="flex-1 cursor-pointer text-sm font-normal"
                      >
                        {dept.name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {additionalAccess.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">
                  {additionalAccess.length} additional department
                  {additionalAccess.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}