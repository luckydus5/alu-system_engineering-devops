import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';
import { useDepartments } from '@/hooks/useDepartments';
import { useUserRole } from '@/hooks/useUserRole';
import { Link } from 'react-router-dom';

export function GrantedDepartments() {
  const { departments } = useDepartments();
  const { roles, grantedDepartmentIds } = useUserRole();

  // Get primary department from user roles
  const primaryDeptId = roles[0]?.department_id;
  const primaryDept = departments.find(d => d.id === primaryDeptId);

  // Get granted departments (excluding primary)
  const grantedDepts = departments.filter(
    d => grantedDepartmentIds.includes(d.id) && d.id !== primaryDeptId
  );

  if (!primaryDept && grantedDepts.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-corporate">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-primary" />
          Your Departments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {primaryDept && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Primary Department</p>
            <Link to={`/department/${primaryDept.code.toLowerCase()}`}>
              <Badge 
                variant="default" 
                className="cursor-pointer hover:opacity-80 transition-opacity"
              >
                {primaryDept.name}
              </Badge>
            </Link>
          </div>
        )}

        {grantedDepts.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Additional Access Granted</p>
            <div className="flex flex-wrap gap-2">
              {grantedDepts.map(dept => (
                <Link key={dept.id} to={`/department/${dept.code.toLowerCase()}`}>
                  <Badge 
                    variant="secondary"
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    {dept.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!primaryDept && grantedDepts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No departments assigned. Contact an administrator.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
