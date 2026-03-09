import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Database, Search, Filter, FileSpreadsheet, 
  UserCheck, UserX, AlertTriangle, Clock,
  CheckCircle2, XCircle, RefreshCw
} from 'lucide-react';
import { useRawAttendanceScans, useRawScansSummary } from '@/hooks/useRawAttendanceScans';
import { format } from 'date-fns';

export function RawScansReviewDialog() {
  const [open, setOpen] = useState(false);
  const [nameFilter, setNameFilter] = useState('');
  const [matchFilter, setMatchFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const { data: summary, isLoading: summaryLoading } = useRawScansSummary();
  const { data: scans, isLoading: scansLoading, refetch } = useRawAttendanceScans({
    employeeName: nameFilter || undefined,
    isMatched: matchFilter === 'all' ? undefined : matchFilter === 'matched',
    sourceFile: sourceFilter === 'all' ? undefined : sourceFilter,
    limit: 200,
  });

  const totalScans = summary?.reduce((acc, s) => acc + s.totalScans, 0) || 0;
  const totalMatched = summary?.reduce((acc, s) => acc + s.matched, 0) || 0;
  const totalUnmatched = summary?.reduce((acc, s) => acc + s.unmatched, 0) || 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Database className="h-4 w-4" />
          Raw Scan Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Raw Attendance Scan Records
          </DialogTitle>
        </DialogHeader>

        {/* Summary KPIs */}
        <div className="grid grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Total Scans</p>
                <p className="text-lg font-bold">{totalScans.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">Matched</p>
                <p className="text-lg font-bold text-emerald-600">{totalMatched.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Unmatched</p>
                <p className="text-lg font-bold text-red-600">{totalUnmatched.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Source Files</p>
                <p className="text-lg font-bold">{summary?.length || 0}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* File summary */}
        {summary && summary.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Import Sources:</p>
            <div className="flex flex-wrap gap-2">
              {summary.map(s => (
                <Badge key={s.sourceFile} variant="outline" className="gap-1 text-xs">
                  {s.sourceFile}: {s.matched}✅ {s.unmatched}❌ {s.wrongMonth}⏭ ({s.dateRange.from} → {s.dateRange.to})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by employee name..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={matchFilter} onValueChange={setMatchFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Records</SelectItem>
              <SelectItem value="matched">Matched Only</SelectItem>
              <SelectItem value="unmatched">Unmatched Only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Files</SelectItem>
              {summary?.map(s => (
                <SelectItem key={s.sourceFile} value={s.sourceFile}>{s.sourceFile}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Table */}
        <ScrollArea className="flex-1 border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead>Bio Name</TableHead>
                <TableHead>FP</TableHead>
                <TableHead>Dept</TableHead>
                <TableHead>Date/Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Matched To</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scansLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Loading raw scan records...
                  </TableCell>
                </TableRow>
              ) : !scans?.length ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No raw scan records found. Import attendance data to populate this view.
                  </TableCell>
                </TableRow>
              ) : (
                scans.map((scan) => (
                  <TableRow key={scan.id} className={!scan.is_matched ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                    <TableCell className="text-xs text-muted-foreground">{scan.row_number}</TableCell>
                    <TableCell className="font-medium text-sm">{scan.employee_name}</TableCell>
                    <TableCell className="text-xs">{scan.fingerprint_number || '—'}</TableCell>
                    <TableCell className="text-xs">{scan.department_text || '—'}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(scan.scan_datetime), 'dd MMM HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{scan.scan_status}</Badge>
                    </TableCell>
                    <TableCell>
                      {scan.is_matched ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {scan.matched_employee_name || (
                        <span className="text-red-500 font-medium">
                          {scan.skip_reason === 'unmatched' ? 'NOT FOUND' : scan.skip_reason || '—'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {scan.match_score ? (
                        <Badge variant={scan.match_score >= 80 ? 'default' : 'secondary'} className="text-[10px]">
                          {scan.match_score}%
                        </Badge>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        <p className="text-xs text-muted-foreground">
          Showing {scans?.length || 0} of {totalScans} records. Use filters to narrow results.
        </p>
      </DialogContent>
    </Dialog>
  );
}
