import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDepartments } from '@/hooks/useDepartments';
import { useUserRole } from '@/hooks/useUserRole';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  DollarSign, 
  Shield, 
  Wrench, 
  Truck, 
  Users, 
  Settings, 
  Briefcase,
  ChevronRight,
  Star,
  Crown
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const departmentIcons: Record<string, React.ReactNode> = {
  'FIN': <DollarSign className="h-8 w-8" />,
  'SAF': <Shield className="h-8 w-8" />,
  'PEAT': <Wrench className="h-8 w-8" />,
  'FLEET': <Truck className="h-8 w-8" />,
  'LOG': <Truck className="h-8 w-8" />,
  'HR': <Users className="h-8 w-8" />,
  'OPS': <Settings className="h-8 w-8" />,
  'IT': <Briefcase className="h-8 w-8" />,
  'WAREHOUSE': <Building2 className="h-8 w-8" />,
};

const departmentGradients: Record<string, string> = {
  'FIN': 'from-emerald-500 to-teal-600',
  'SAF': 'from-amber-500 to-orange-600',
  'PEAT': 'from-blue-500 to-indigo-600',
  'FLEET': 'from-violet-500 to-purple-600',
  'LOG': 'from-violet-500 to-purple-600',
  'HR': 'from-pink-500 to-rose-600',
  'OPS': 'from-cyan-500 to-blue-600',
  'IT': 'from-primary to-primary/80',
  'WAREHOUSE': 'from-indigo-500 to-blue-600',
};

const departmentBgColors: Record<string, string> = {
  'FIN': 'bg-emerald-500/10 border-emerald-500/20',
  'SAF': 'bg-amber-500/10 border-amber-500/20',
  'PEAT': 'bg-blue-500/10 border-blue-500/20',
  'FLEET': 'bg-violet-500/10 border-violet-500/20',
  'LOG': 'bg-violet-500/10 border-violet-500/20',
  'HR': 'bg-pink-500/10 border-pink-500/20',
  'OPS': 'bg-cyan-500/10 border-cyan-500/20',
  'IT': 'bg-primary/10 border-primary/20',
  'WAREHOUSE': 'bg-indigo-500/10 border-indigo-500/20',
};

const departmentIconColors: Record<string, string> = {
  'FIN': 'text-emerald-600 dark:text-emerald-400',
  'SAF': 'text-amber-600 dark:text-amber-400',
  'PEAT': 'text-blue-600 dark:text-blue-400',
  'FLEET': 'text-violet-600 dark:text-violet-400',
  'LOG': 'text-violet-600 dark:text-violet-400',
  'HR': 'text-pink-600 dark:text-pink-400',
  'OPS': 'text-cyan-600 dark:text-cyan-400',
  'IT': 'text-primary',
  'WAREHOUSE': 'text-indigo-600 dark:text-indigo-400',
};

export function DepartmentAccessCards() {
  const { departments, loading: deptLoading } = useDepartments();
  const { roles, grantedDepartmentIds, loading: roleLoading, highestRole } = useUserRole();

  const loading = deptLoading || roleLoading;

  // Get primary department from user roles
  const primaryDeptId = roles[0]?.department_id;
  const primaryDept = departments.find(d => d.id === primaryDeptId);

  // Get granted departments (excluding primary)
  const grantedDepts = departments.filter(
    d => grantedDepartmentIds.includes(d.id) && d.id !== primaryDeptId
  );

  // For admin/director, show all departments
  const isAdminOrDirector = highestRole === 'admin' || highestRole === 'director';
  
  // All accessible departments for the user
  const accessibleDepts = isAdminOrDirector 
    ? departments 
    : [primaryDept, ...grantedDepts].filter(Boolean) as typeof departments;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (accessibleDepts.length === 0) {
    return (
      <Card className="shadow-corporate border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Departments Assigned</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            You don't have access to any departments yet. Contact your administrator to get access.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-premium">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Your Departments</h2>
            <p className="text-sm text-muted-foreground">
              {accessibleDepts.length} department{accessibleDepts.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>
        {isAdminOrDirector && (
          <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground border border-secondary/30">
            <Crown className="h-3 w-3 mr-1" />
            Full Access
          </Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {accessibleDepts.map((dept) => {
          const isPrimary = dept.id === primaryDeptId;
          const gradient = departmentGradients[dept.code] || 'from-primary to-primary/80';
          const bgColor = departmentBgColors[dept.code] || 'bg-primary/10 border-primary/20';
          const iconColor = departmentIconColors[dept.code] || 'text-primary';
          const Icon = departmentIcons[dept.code] || <Building2 className="h-8 w-8" />;

          return (
            <Link 
              key={dept.id} 
              to={`/department/${dept.code.toLowerCase()}`}
              className="group"
            >
              <Card className={`
                relative overflow-hidden transition-all duration-300 
                hover:shadow-premium hover:-translate-y-1 hover:border-primary/30
                cursor-pointer h-full border-2
                ${bgColor}
              `}>
                {/* Gradient accent bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
                
                {/* Primary badge */}
                {isPrimary && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-secondary text-secondary-foreground border-0 shadow-md">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Primary
                    </Badge>
                  </div>
                )}

                <CardContent className="pt-6 pb-5">
                  <div className="flex flex-col h-full">
                    {/* Icon */}
                    <div className={`
                      w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} 
                      flex items-center justify-center mb-4 shadow-lg
                      group-hover:scale-110 transition-transform duration-300
                    `}>
                      <div className="text-white">
                        {Icon}
                      </div>
                    </div>

                    {/* Department info */}
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-foreground mb-1 group-hover:text-primary transition-colors">
                        {dept.name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {dept.description || `Access ${dept.name} department resources and reports`}
                      </p>
                    </div>

                    {/* Action hint */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {dept.code}
                      </span>
                      <div className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        View
                        <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
