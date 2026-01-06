import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Check, X, Search, Package } from 'lucide-react';
import { InventoryItem } from '@/hooks/useInventory';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface InventoryTableProps {
  items: InventoryItem[];
  loading: boolean;
  canManage: boolean;
  onUpdate: (id: string, data: Partial<InventoryItem>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onRefetch: () => void;
}

export function InventoryTable({
  items,
  loading,
  canManage,
  onUpdate,
  onDelete,
}: InventoryTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<InventoryItem>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditData({
      item_number: item.item_number,
      item_name: item.item_name,
      quantity: item.quantity,
      location: item.location,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const success = await onUpdate(editingId, editData);
    if (success) {
      setEditingId(null);
      setEditData({});
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await onDelete(deleteId);
    setDeleteId(null);
  };

  const filteredItems = items.filter(
    item =>
      item.item_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockBadge = (quantity: number) => {
    if (quantity === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (quantity < 10) {
      return <Badge variant="outline" className="border-amber-500 text-amber-500">Low Stock</Badge>;
    }
    return <Badge variant="outline" className="border-green-500 text-green-500">In Stock</Badge>;
  };

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Inventory Items
        </CardTitle>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No inventory items</h3>
            <p className="text-muted-foreground">Add your first inventory item to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Item Number</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="w-[100px] text-center">Quantity</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  {canManage && <TableHead className="w-[100px] text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono font-medium">
                      {editingId === item.id ? (
                        <Input
                          value={editData.item_number || ''}
                          onChange={(e) => setEditData({ ...editData, item_number: e.target.value })}
                          className="h-8"
                        />
                      ) : (
                        item.item_number
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === item.id ? (
                        <Input
                          value={editData.item_name || ''}
                          onChange={(e) => setEditData({ ...editData, item_name: e.target.value })}
                          className="h-8"
                        />
                      ) : (
                        item.item_name
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {editingId === item.id ? (
                        <Input
                          type="number"
                          value={editData.quantity || 0}
                          onChange={(e) => setEditData({ ...editData, quantity: parseInt(e.target.value) || 0 })}
                          className="h-8 w-20 mx-auto text-center"
                        />
                      ) : (
                        <span className="font-semibold">{item.quantity}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === item.id ? (
                        <Input
                          value={editData.location || ''}
                          onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                          className="h-8"
                        />
                      ) : (
                        <span className="text-muted-foreground">{item.location}</span>
                      )}
                    </TableCell>
                    <TableCell>{getStockBadge(item.quantity)}</TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        {editingId === item.id ? (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={saveEdit}>
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={cancelEdit}>
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => startEdit(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this inventory item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
