import { Link } from 'react-router-dom';
import { useDepartments } from '@/hooks/useDepartments';
import { useUserRole } from '@/hooks/useUserRole';
import { Building2, Crown, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

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
  'FIN': 'bg-emerald-50 border-emerald-200',
  'SAF': 'bg-amber-50 border-amber-200',
  'PEAT': 'bg-blue-50 border-blue-200',
  'FLEET': 'bg-violet-50 border-violet-200',
  'LOG': 'bg-violet-50 border-violet-200',
  'HR': 'bg-pink-50 border-pink-200',
  'OPS': 'bg-cyan-50 border-cyan-200',
  'IT': 'bg-blue-50 border-blue-200',
  'WAREHOUSE': 'bg-indigo-50 border-indigo-200',
  'WH': 'bg-indigo-50 border-indigo-200',
};

export function MobileDepartmentGrid() {
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

  // Full access only for super_admin + director
  const hasFullAccess = highestRole === 'super_admin' || highestRole === 'director';
  
  // All accessible departments for the user
  const accessibleDepts = hasFullAccess
    ? departments
    : [primaryDept, ...grantedDepts].filter(Boolean) as typeof departments;

  if (loading) {
    return (
      <div className="px-4 pb-24">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (accessibleDepts.length === 0) {
    return (
      <div className="px-4 pb-24 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Building2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No Departments</h3>
        <p className="text-muted-foreground text-center text-sm">
          Contact your admin for access.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Departments</h2>
            <p className="text-xs text-muted-foreground">{accessibleDepts.length} available</p>
          </div>
        </div>
        {hasFullAccess && (
          <Badge variant="secondary" className="text-xs px-2 py-0.5">
            <Crown className="h-3 w-3 mr-1" />
            Full Access
          </Badge>
        )}
      </div>

      {/* Compact Grid - 3 columns for mobile */}
      <div className="grid grid-cols-3 gap-3">
        {accessibleDepts.map((dept) => {
          const isPrimary = dept.id === primaryDeptId;
          const gradient = departmentGradients[dept.code] || 'from-primary to-primary/80';
          const bgColor = departmentBgColors[dept.code] || 'bg-gray-50 border-gray-200';
          const iconUrl = departmentIconUrls[dept.code];

          return (
            <Link 
              key={dept.id} 
              to={`/department/${dept.code.toLowerCase()}`}
              className="group"
            >
              <div className={`
                relative rounded-xl border p-3 
                flex flex-col items-center text-center
                transition-all duration-200 active:scale-95
                ${bgColor}
              `}>
                {/* Primary indicator */}
                {isPrimary && (
                  <div className="absolute -top-1.5 -right-1.5">
                    <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center shadow-sm">
                      <Star className="h-3 w-3 text-secondary-foreground fill-current" />
                    </div>
                  </div>
                )}

                {/* Icon */}
                <div className={`
                  w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} 
                  flex items-center justify-center mb-2 shadow-md
                `}>
                  {iconUrl ? (
                    <img 
                      src={iconUrl} 
                      alt={dept.name} 
                      className="w-8 h-8 object-contain"
                    />
                  ) : (
                    <Building2 className="h-6 w-6 text-white" />
                  )}
                </div>

                {/* Name - Truncated */}
                <span className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">
                  {dept.name}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}