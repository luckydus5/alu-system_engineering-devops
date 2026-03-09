# HQ Power System - Architecture Documentation

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React + TypeScript)             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Pages: Dashboard, Reports, Admin, Department, Auth       │ │
│  │  Components: Fleet, Dashboard, Reports, Layout            │ │
│  │  Styling: Tailwind CSS + Shadcn/ui Components            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↓                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  State Management & Data Fetching                         │ │
│  │  - React Query (TanStack Query)                           │ │
│  │  - Custom Hooks (useFleets, useReports, etc.)            │ │
│  │  - React Context (Auth, Theme)                           │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Supabase Client Layer                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Authentication | REST API | Realtime | Storage          │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Supabase Backend (PostgreSQL)                   │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │  Users &     │  Fleet       │  Reports     │  Departments │ │
│  │  Auth        │  Management  │  & Audits    │  & Teams     │ │
│  │              │              │              │              │ │
│  │  - profiles  │  - fleets    │  - reports   │  - depts     │ │
│  │  - roles     │  - issues    │  - audit     │  - members   │ │
│  │  - access    │  - maint.    │              │  - access    │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Row Level Security (RLS) Policies                        │ │
│  │  - Department-based access control                        │ │
│  │  - Role-based filtering                                   │ │
│  │  - User isolation                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Page Layer
Each page component represents a major feature area:

- **Dashboard** (`pages/Dashboard.tsx`)
  - Entry point for authenticated users
  - Displays KPIs, recent reports, department overview
  - Uses: `useUserRole`, `useReportStats`, custom dashboard components

- **Reports** (`pages/Reports.tsx`)
  - Report management interface
  - Create, view, filter, and manage reports
  - Uses: `useReports`, `useReportActions`

- **Admin** (`pages/Admin.tsx`)
  - Administrator controls
  - User management and department access
  - Uses: `useUsers`, `useDepartments`

- **Department** (`pages/Department.tsx`)
  - Department-specific operations
  - Fleet management and team members
  - Uses: `useFleets`, `useDepartmentMembers`

- **Auth** (`pages/Auth.tsx`)
  - Login and authentication UI
  - Password reset flows
  - Uses: `useAuth`

### Component Hierarchy

```
Layout/
├── AppSidebar
│   ├── Navigation
│   └── User Profile
├── TopNavbar
│   ├── Search
│   ├── Notifications
│   └── User Menu
└── Page Content
    ├── Dashboard/
    │   ├── KPICard
    │   ├── RecentReports
    │   ├── DepartmentOverview
    │   └── GrantedDepartments
    ├── Fleet/
    │   ├── FleetMaintenanceDashboard
    │   ├── FleetOverviewTable
    │   ├── FleetKPICards
    │   ├── CurrentMaintenance
    │   ├── UpcomingServices
    │   ├── RecentActivity
    │   ├── AddFleetDialog
    │   ├── AddMaintenanceDialog
    │   └── FleetInlineEdit
    ├── Reports/
    │   ├── ReportsList
    │   ├── CreateReportDialog
    │   ├── ReportDetailDialog
    │   └── ReportsFilter
    └── Admin/
        ├── UserList
        └── DepartmentAccessDialog
```

## Data Flow Architecture

### Authentication Flow
```
User Input (Email/Password)
        ↓
useAuth Hook (Context)
        ↓
Supabase Auth.signIn()
        ↓
Session Created
        ↓
Fetch User Profile
        ↓
Store in Context
        ↓
Redirect to Dashboard
```

### Data Fetching Flow
```
Component Mount
        ↓
useEffect Hook
        ↓
Custom Hook (useFleets, useReports, etc.)
        ↓
React Query Client
        ↓
Supabase.from().select()
        ↓
Apply RLS Policies (Server-side)
        ↓
Return Filtered Data
        ↓
Update Component State
        ↓
Re-render with Data
```

### Real-time Updates Flow
```
Supabase Subscription
        ↓
Listen for INSERT/UPDATE/DELETE
        ↓
Event Received
        ↓
Update React Query Cache
        ↓
Component Re-renders
        ↓
User Sees New Data
```

## Database Schema Architecture

### Entity Relationship Diagram (Conceptual)

```
┌──────────────┐
│   profiles   │◄────────────────┐
│   (users)    │                 │
└──────────────┘                 │
      ▲                          │
      │ one_to_many              │
      │                          │
   ┌──┴─────────────┬────────────┼──────────────┐
   │                │            │              │
┌──┴──┐      ┌──────┴───┐   ┌────┴────┐   ┌────┴─────┐
│roles│      │dept_accs │   │reports  │   │user_roles│
└─────┘      └──────────┘   └─────────┘   └──────────┘
                 ▲                ▲
                 │                │
          ┌──────┴────┐      ┌────┴───────┐
          │            │      │             │
      ┌───┴──┐    ┌────┴──┐  │        ┌────┴───┐
      │depts │    │fleets │  │        │audit   │
      └──────┘    └───┬───┘  │        └────────┘
                      │      │
                  ┌───┴──────┴─────────┐
                  │                    │
            ┌─────┴────┐        ┌──────┴─────┐
            │fleet_iss │        │maint_rec   │
            └──────────┘        └────────────┘
```

### Table Structure Details

**Authentication & Users**
- `profiles`: id (UUID, PK), email, full_name, avatar_url
- `user_roles`: id, user_id (FK), role, assigned_at
- `user_department_access`: id, user_id (FK), department_id (FK), granted_at

**Organizations**
- `departments`: id (UUID, PK), code, name, description, created_at
- `team_members`: id, department_id (FK), user_id (FK), role

**Fleet Management**
- `fleets`: id (UUID, PK), department_id (FK), operator_id (FK), status, condition
- `fleet_issues`: id, fleet_id (FK), description, severity, reported_at
- `maintenance_records`: id, fleet_id (FK), department_id (FK), service_type, maintenance_date, next_service_due

**Reports**
- `reports`: id (UUID, PK), department_id (FK), created_by (FK), type, status, priority, title, description

**Communication**
- `notifications`: id, user_id (FK), type, title, message, read, created_at

## Hook Architecture

### Auth Hook (`useAuth`)
```
AuthProvider (Context Provider)
├── State: user, session, loading
├── Methods: signIn, signUp, signOut
└── Listeners: onAuthStateChange
```

### Data Hooks Pattern
```
useFleets / useReports / useMaintenance
├── Query: useQuery (React Query)
├── State: data, loading, error
├── Methods: create, update, delete, refetch
└── Caching: Automatic with React Query
```

### Example: useFleets
```typescript
const useFleets = (departmentId: string) => {
  // Data fetching with React Query
  const query = useQuery({
    queryKey: ['fleets', departmentId],
    queryFn: () => supabase.from('fleets').select('*'),
  });

  // Create operation with optimistic updates
  const createFleet = (data) => {
    // Server mutation + cache update
  };

  // Stats calculation
  const stats = calculateFleetStats(data);

  return { fleets, loading, stats, createFleet };
};
```

## State Management Strategy

### Global State (Context)
- Authentication state (`AuthContext`)
- User profile and roles
- Theme/UI preferences

### Local State (Component)
- Form inputs
- Dialog/modal visibility
- UI interactions (expand/collapse)

### Server State (React Query)
- Fleet data
- Reports data
- Maintenance records
- Department information
- Cached with automatic invalidation

## Security Architecture

### Authentication
- Supabase Auth handles password hashing and sessions
- JWT tokens stored in localStorage
- Auto-refresh tokens on expiry

### Authorization
- Role-based access control (5 roles: staff → admin)
- Department-level access restrictions
- Row Level Security (RLS) policies enforce data access

### Data Protection
- Encrypted data transmission (HTTPS/TLS)
- RLS policies prevent unauthorized access
- User isolation at database level
- Audit logging for compliance

## Performance Optimization

### Caching Strategy
- React Query handles API response caching
- Automatic cache invalidation after mutations
- Configurable stale times

### Code Splitting
- Page-level code splitting with React Router lazy loading
- Conditional component loading based on user role

### Asset Optimization
- Vite bundle optimization
- Tailwind CSS purging
- Image optimization in public/

## Deployment Architecture

```
Local Development
    ↓
Git Push
    ↓
GitHub Repository
    ↓
Vercel Webhook Trigger
    ↓
Build Environment
    ├── npm install
    ├── npm run build
    └── TypeScript compile check
    ↓
Deploy to CDN
    ↓
Live Application
```

### Vercel Configuration (`vercel.json`)
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables for Supabase

## Error Handling

### Frontend Error Handling
- Try-catch blocks in hooks
- Error boundaries for component crashes
- Toast notifications for user feedback
- Form validation with React Hook Form + Zod

### Server Error Handling
- Supabase error responses parsed
- User-friendly error messages
- Error logging for debugging

## Monitoring & Logging

- Browser console for development debugging
- Supabase Dashboard for database monitoring
- Vercel analytics for deployment metrics
- Network tab for API call inspection

## Future Scalability Considerations

1. **Database Optimization**: Add indexes for frequently queried columns
2. **Caching Layer**: Implement Redis for high-traffic data
3. **Microservices**: Split into separate services if needed
4. **Message Queue**: Add job queue for async operations
5. **CDN**: Static asset distribution
6. **API Rate Limiting**: Implement rate limiting policies
7. **Monitoring**: Add APM and error tracking (Sentry)