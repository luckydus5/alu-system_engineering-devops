import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDepartments } from '@/hooks/useDepartments';
import { useUserRole } from '@/hooks/useUserRole';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  ChevronRight,
  Star,
  Crown,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Icons8 Fluency style icon URLs
const departmentIconUrls: Record<string, string> = {
  'FIN': 'https://img.icons8.com/fluency/96/money-bag.png',
  'SAF': 'https://img.icons8.com/fluency/96/policeman-male.png',
  'PEAT': 'https://img.icons8.com/fluency/96/tractor.png',
  'FLEET': 'https://img.icons8.com/fluency/96/car.png',
  'LOG': 'https://img.icons8.com/fluency/96/delivery.png',
  'HR': 'https://img.icons8.com/fluency/96/conference-call.png',
  'OPS': 'https://img.icons8.com/fluency/96/services.png',
  'IT': 'https://img.icons8.com/fluency/96/monitor.png',
  'WAREHOUSE': 'https://img.icons8.com/fluency/96/warehouse-1.png',
  'WH': 'https://img.icons8.com/fluency/96/warehouse-1.png',
  'ENG': 'https://img.icons8.com/fluency/96/maintenance.png',
};

const departmentGradients: Record<string, string> = {
  'FIN': 'from-emerald-500 to-teal-600',
  'SAF': 'from-amber-500 to-orange-600',
  'PEAT': 'from-blue-500 to-indigo-600',
  'FLEET': 'from-violet-500 to-purple-600',
  'LOG': 'from-violet-500 to-purple-600',
  'HR': 'from-pink-500 to-rose-600',
  'OPS': 'from-cyan-500 to-blue-600',
  'IT': 'from-blue-500 to-blue-600',
  'WAREHOUSE': 'from-indigo-500 to-blue-600',
  'WH': 'from-indigo-500 to-blue-600',
};

const departmentBgColors: Record<string, string> = {
  'FIN': 'bg-emerald-500/10 border-emerald-500/20',
  'SAF': 'bg-amber-500/10 border-amber-500/20',
  'PEAT': 'bg-blue-500/10 border-blue-500/20',
  'FLEET': 'bg-violet-500/10 border-violet-500/20',
  'LOG': 'bg-violet-500/10 border-violet-500/20',
  'HR': 'bg-pink-500/10 border-pink-500/20',
  'OPS': 'bg-cyan-500/10 border-cyan-500/20',
  'IT': 'bg-blue-500/10 border-blue-500/20',
  'WAREHOUSE': 'bg-indigo-500/10 border-indigo-500/20',
  'WH': 'bg-indigo-500/10 border-indigo-500/20',
};

export function DepartmentAccessCards() {
  const { departments, loading: deptLoading } = useDepartments();
  const { roles, grantedDepartmentIds, loading: roleLoading, highestRole } = useUserRole();
  const isMobile = useIsMobile();

  const loading = deptLoading || roleLoading;

  const primaryDeptId = roles[0]?.department_id;
  const primaryDept = departments.find(d => d.id === primaryDeptId);

  const grantedDepts = departments.filter(
    d => grantedDepartmentIds.includes(d.id) && d.id !== primaryDeptId
  );

  const hasFullAccess = highestRole === 'super_admin' || highestRole === 'director';
  
  const visibleDeptCodes = ['HR', 'WH', 'FLEET', 'IT', 'OPS'];
  
  const allUserDepts = hasFullAccess
    ? departments
    : [primaryDept, ...grantedDepts].filter(Boolean) as typeof departments;
  
  const accessibleDepts = allUserDepts.filter(d => visibleDeptCodes.includes(d.code));

  if (loading) {
    return (
      <div className="space-y-3 md:space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 md:h-8 w-40 md:w-48" />
          <Skeleton className="h-5 md:h-6 w-20 md:w-24" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-36 md:h-44 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (accessibleDepts.length === 0) {
    return (
      <Card className="shadow-corporate border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 md:py-12 px-4">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-muted flex items-center justify-center mb-3 md:mb-4">
            <Building2 className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base md:text-lg font-semibold text-foreground mb-1.5 md:mb-2">No Departments Assigned</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            You don't have access to any departments yet. Contact your administrator to get access.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 rounded-2xl p-4 md:p-8 bg-card border border-border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-premium shrink-0">
            <Building2 className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg md:text-xl font-bold text-foreground truncate">Your Departments</h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              {accessibleDepts.length} department{accessibleDepts.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>
        {hasFullAccess && (
          <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground border border-secondary/30 shrink-0 text-[10px] md:text-xs">
            <Crown className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">Full Access</span>
            <span className="sm:hidden">Full</span>
          </Badge>
        )}
      </div>

      {/* Department Grid - 2 cols on mobile, scales up on larger screens */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {accessibleDepts.map((dept) => {
          const isPrimary = dept.id === primaryDeptId;
          const gradient = departmentGradients[dept.code] || 'from-primary to-primary/80';
          const bgColor = departmentBgColors[dept.code] || 'bg-primary/10 border-primary/20';
          const iconUrl = departmentIconUrls[dept.code];

          return (
            <Link 
              key={dept.id} 
              to={`/department/${dept.code.toLowerCase()}`}
              className="group active:scale-[0.97] transition-transform"
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
                  <div className="absolute top-2 right-2 md:top-3 md:right-3">
                    <Badge className="bg-secondary text-secondary-foreground border-0 shadow-md text-[9px] md:text-xs px-1.5 md:px-2 py-0.5">
                      <Star className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1 fill-current" />
                      {isMobile ? '★' : 'Primary'}
                    </Badge>
                  </div>
                )}

                <CardContent className="pt-4 pb-3 px-3 md:pt-6 md:pb-5 md:px-6">
                  <div className="flex flex-col h-full">
                    {/* Icon */}
                    <div className={`
                      w-11 h-11 md:w-14 md:h-14 rounded-lg md:rounded-xl bg-gradient-to-br ${gradient} 
                      flex items-center justify-center mb-2.5 md:mb-4 shadow-lg
                      group-hover:scale-110 transition-transform duration-300
                    `}>
                      {iconUrl ? (
                        <img 
                          src={iconUrl} 
                          alt={dept.name} 
                          className="w-7 h-7 md:w-10 md:h-10 object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <Building2 className="h-6 w-6 md:h-8 md:w-8 text-white" />
                      )}
                    </div>

                    {/* Department info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm md:text-lg text-foreground mb-0.5 md:mb-1 group-hover:text-primary transition-colors truncate">
                        {dept.name}
                      </h3>
                      <p className="text-[11px] md:text-sm text-muted-foreground line-clamp-2 leading-snug">
                        {dept.description || `Access ${dept.name} resources`}
                      </p>
                    </div>

                    {/* Action hint */}
                    <div className="flex items-center justify-between mt-2.5 md:mt-4 pt-2 md:pt-3 border-t border-border/50">
                      <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {dept.code}
                      </span>
                      <div className="flex items-center gap-0.5 text-xs md:text-sm font-medium text-primary md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <span className="hidden md:inline">View</span>
                        <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4 md:group-hover:translate-x-1 transition-transform" />
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
