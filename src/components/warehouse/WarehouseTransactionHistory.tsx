import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Package,
  Search,
  RefreshCw,
  Loader2,
  Calendar,
  Download,
  Filter,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Department } from '@/hooks/useDepartments';

interface StockTransactionRecord {
  id: string;
  inventory_item_id: string;
  department_id: string;
  transaction_type: string;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  // Joined
  item_name?: string;
  item_number?: string;
  user_name?: string;
  department_name?: string;
}

interface WarehouseTransactionHistoryProps {
  departments: Department[];
}

export function WarehouseTransactionHistory({ departments }: WarehouseTransactionHistoryProps) {
  const [transactions, setTransactions] = useState<StockTransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('7days');

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      // Calculate date range
      let fromDate = new Date();
      switch (dateFilter) {
        case '1day':
          fromDate = subDays(new Date(), 1);
          break;
        case '7days':
          fromDate = subDays(new Date(), 7);
          break;
        case '30days':
          fromDate = subDays(new Date(), 30);
          break;
        case '90days':
          fromDate = subDays(new Date(), 90);
          break;
        default:
          fromDate = subDays(new Date(), 7);
      }

      // Build query
      let query = supabase
        .from('stock_transactions')
        .select(`
          *,
          inventory_items!inner(item_name, item_number)
        `)
        .gte('created_at', fromDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(500);

      if (typeFilter !== 'all') {
        query = query.eq('transaction_type', typeFilter);
      }

      if (departmentFilter !== 'all') {
        query = query.eq('department_id', departmentFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching transactions:', error);
        setTransactions([]);
        return;
      }

      // Fetch user profiles for the created_by field
      const userIds = [...new Set((data || []).map((t: any) => t.created_by).filter(Boolean))];
      let profileMap = new Map();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        profileMap = new Map((profiles || []).map(p => [p.id, p]));
      }

      // Format transactions
      const formattedTransactions: StockTransactionRecord[] = (data || []).map((t: any) => {
        const dept = departments.find(d => d.id === t.department_id);
        const profile = profileMap.get(t.created_by);
        return {
          ...t,
          item_name: t.inventory_items?.item_name || 'Unknown Item',
          item_number: t.inventory_items?.item_number || 'N/A',
          user_name: profile?.full_name || profile?.email?.split('@')[0] || 'System',
          department_name: dept?.name || 'Unknown',
        };
      });

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, typeFilter, departmentFilter, departments]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('stock-transactions-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stock_transactions',
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTransactions]);

  // Filter transactions by search
  const filteredTransactions = transactions.filter(t => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      t.item_name?.toLowerCase().includes(query) ||
      t.item_number?.toLowerCase().includes(query) ||
      t.user_name?.toLowerCase().includes(query) ||
      t.notes?.toLowerCase().includes(query)
    );
  });

  // Calculate stats
  const stockInCount = filteredTransactions.filter(t => t.transaction_type === 'in').length;
  const stockOutCount = filteredTransactions.filter(t => t.transaction_type === 'out').length;
  const totalQuantityIn = filteredTransactions
    .filter(t => t.transaction_type === 'in')
    .reduce((sum, t) => sum + t.quantity, 0);
  const totalQuantityOut = filteredTransactions
    .filter(t => t.transaction_type === 'out')
    .reduce((sum, t) => sum + t.quantity, 0);

  const exportToCSV = () => {
    const exportData = filteredTransactions.map((t, index) => ({
      'No.': index + 1,
      'Date': format(new Date(t.created_at), 'yyyy-MM-dd HH:mm:ss'),
      'Type': t.transaction_type === 'in' ? 'Stock In' : 'Stock Out',
      'Item': t.item_name,
      'Item Number': t.item_number,
      'Quantity': t.quantity,
      'Previous': t.previous_quantity,
      'New': t.new_quantity,
      'Department': t.department_name,
      'User': t.user_name,
      'Notes': t.notes || '',
    }));

    const headers = Object.keys(exportData[0] || {}).join(',');
    const rows = exportData.map((row) =>
      Object.values(row).map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `stock_transactions_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-600" />
            Stock Transaction History
          </h3>
          <p className="text-sm text-muted-foreground">
            Track all stock in/out movements across all departments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={filteredTransactions.length === 0}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button variant="outline" size="icon" onClick={fetchTransactions} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stockInCount}</p>
                <p className="text-xs text-muted-foreground">Stock In Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/10 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-orange-600">{stockOutCount}</p>
                <p className="text-xs text-muted-foreground">Stock Out Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">+{totalQuantityIn.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Units Added</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-rose-500/10 border-rose-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-rose-600" />
              <div>
                <p className="text-2xl font-bold text-rose-600">-{totalQuantityOut.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Units Removed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items, users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="in">Stock In</SelectItem>
            <SelectItem value="out">Stock Out</SelectItem>
          </SelectContent>
        </Select>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[140px]">
            <Calendar className="h-4 w-4 mr-1" />
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1day">Last 24 Hours</SelectItem>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="90days">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transaction Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTransactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Transactions Found</h3>
            <p className="text-sm text-muted-foreground">
              No stock transactions match your current filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-500px)] min-h-[300px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="w-[100px]">Quantity</TableHead>
                <TableHead className="w-[120px]">Before → After</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="w-[140px]">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction, index) => (
                <TableRow key={transaction.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        'gap-1',
                        transaction.transaction_type === 'in'
                          ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                          : 'bg-orange-500/15 text-orange-700 border-orange-500/30'
                      )}
                    >
                      {transaction.transaction_type === 'in' ? (
                        <ArrowDownCircle className="h-3 w-3" />
                      ) : (
                        <ArrowUpCircle className="h-3 w-3" />
                      )}
                      {transaction.transaction_type === 'in' ? 'IN' : 'OUT'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{transaction.item_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {transaction.item_number}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'font-bold',
                      transaction.transaction_type === 'in' ? 'text-emerald-600' : 'text-orange-600'
                    )}>
                      {transaction.transaction_type === 'in' ? '+' : '-'}
                      {transaction.quantity}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <span className="text-muted-foreground">{transaction.previous_quantity}</span>
                    <span className="mx-1">→</span>
                    <span className={cn(
                      'font-semibold',
                      transaction.new_quantity <= 0 ? 'text-red-600' :
                      transaction.new_quantity < 10 ? 'text-amber-600' : 'text-foreground'
                    )}>
                      {transaction.new_quantity}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal text-xs">
                      {transaction.department_name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {transaction.user_name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div title={format(new Date(transaction.created_at), 'PPpp')}>
                      {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
    </div>
  );
}
