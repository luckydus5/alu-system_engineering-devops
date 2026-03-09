

# Enterprise Leave Management System - Fix and Enhancement Plan

## 1. Fix Build Errors (Immediate)

There are 4 build errors that need to be resolved first:

**HRCommandCenter.tsx** - Lines 57-61 use `loading` but the hooks return `isLoading`:
- `useLeaveRequests` returns `isLoading` (not `loading`)
- `usePositions` returns `isLoading` (not `loading`)  
- `useAttendance` returns `isLoading` (not `loading`)
- Fix: rename destructured properties from `loading` to `isLoading`

**AttendanceTrackingTab.tsx** - Line 25 is missing the `remote` status in `STATUS_CONFIG`:
- `AttendanceStatus` type includes `'remote'` but the config map is missing it
- Fix: add `remote: { color: 'text-teal-600', bgColor: 'bg-teal-500/10', dotColor: 'bg-teal-500' }`

## 2. Enhanced Leave Management Flow

The corrected approval workflow:

```text
Employee submits leave request
        |
        v
Direct Manager reviews (approve/reject)
        |
        v  (if manager approves)
HR receives request, verifies:
  - Employee leave balance
  - Attendance history
  - Days remaining
        |
        v  (HR approves/rejects)
Leave is finalized
  - Balance auto-deducted
  - Status updated
```

The existing database schema and code already supports this flow with statuses: `pending` -> `manager_approved` -> `approved` / `rejected`. The current `LeaveManagementTab` already has this logic.

## 3. Leave Balance Auto-Deduction

Create a database function and scheduled trigger to auto-deduct leave balance daily for active approved leaves:

- Add a SQL migration with a function `deduct_active_leave_balances()` that checks approved leaves where `start_date <= today AND end_date >= today` and increments `used_days` on `leave_balances` by 1 each day
- This can be called via a cron-like edge function or pg_cron

## 4. Employee Leave Dashboard Enhancements

Enhance the `LeaveManagementTab` to include:
- **Employee Balance Overview**: Show each employee's remaining leave balance by type
- **Leave History Panel**: Detailed history per employee with running balance
- **Countdown Display**: For active leaves, show remaining days

## Technical Changes

### Files to Modify:
1. **src/components/hr/HRCommandCenter.tsx** - Fix `loading` -> `isLoading` property names (lines 57-61)
2. **src/components/hr/tabs/AttendanceTrackingTab.tsx** - Add `remote` to STATUS_CONFIG (line 25-31)
3. **src/components/hr/tabs/LeaveManagementTab.tsx** - Add employee balance overview section and leave history panel
4. **src/hooks/useLeaveRequests.tsx** - Add helper to fetch all employee balances for HR view

### Database Migration:
- Create function `deduct_active_leave_balances()` to auto-deduct leave days daily
- Initialize default leave balances (e.g., 21 annual, 10 sick, 5 personal) for employees who don't have balances yet

### New Edge Function (optional):
- `leave-balance-cron` - Scheduled function to call `deduct_active_leave_balances()` daily

This plan fixes the immediate build errors and enhances the leave system to be enterprise-grade with accurate balance tracking, auto-deduction, and a comprehensive HR dashboard view.

