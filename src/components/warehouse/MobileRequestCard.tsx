import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  User,
  Calendar,
  Package,
  Eye,
  Edit2,
  Trash2,
  ChevronRight,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ItemRequest } from '@/hooks/useItemRequests';
import { cn } from '@/lib/utils';

interface MobileRequestCardProps {
  request: ItemRequest;
  onView: (request: ItemRequest) => void;
  onEdit?: (request: ItemRequest) => void;
  onDelete?: (requestId: string) => void;
  canManage: boolean;
}

export function MobileRequestCard({
  request,
  onView,
  onEdit,
  onDelete,
  canManage,
}: MobileRequestCardProps) {
  const totalQty = request.requested_items
    ? request.requested_items.reduce((sum, item) => sum + item.quantity, 0)
    : request.quantity_requested;

  const remainingQty = request.requested_items && request.requested_items.length > 0
    ? request.requested_items.reduce((sum, item) => sum + (item.new_quantity || 0), 0)
    : request.new_quantity;

  const itemCount = request.requested_items?.length || 1;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        {/* Header */}
        <div 
          className="p-3 cursor-pointer"
          onClick={() => onView(request)}
        >
          {/* Date and Status Row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(request.created_at), 'dd MMM yyyy, HH:mm')}
            </div>
            <Badge 
              variant="secondary" 
              className="text-[10px] h-5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            >
              <CheckCircle2 className="h-3 w-3 mr-0.5" />
              Done
            </Badge>
          </div>

          {/* Requester Info */}
          <div className="flex items-start gap-2 mb-3">
            <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{request.requester_name}</p>
              {(request.requester_department_text || request.requester_department_name) && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                  <Building2 className="h-3 w-3 flex-shrink-0" />
                  {request.requester_department_text || request.requester_department_name}
                </p>
              )}
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          </div>

          {/* Items Preview */}
          <div className="space-y-1.5 mb-3">
            {request.requested_items && request.requested_items.length > 0 ? (
              <>
                {request.requested_items.slice(0, 2).map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 px-2 py-1.5 rounded text-xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <Package className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                      <span className="truncate font-medium">{item.item_name}</span>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px] ml-2 shrink-0">
                      x{item.quantity}
                    </Badge>
                  </div>
                ))}
                {itemCount > 2 && (
                  <p className="text-xs text-muted-foreground pl-2">
                    +{itemCount - 2} more items
                  </p>
                )}
              </>
            ) : (
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 px-2 py-1.5 rounded text-xs">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <Package className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                  <span className="truncate font-medium">{request.item_description}</span>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] ml-2 shrink-0">
                  x{request.quantity_requested}
                </Badge>
              </div>
            )}
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-1.5">
              <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{totalQty}</p>
              <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70">Issued</p>
            </div>
            <div className={cn(
              "rounded p-1.5",
              remainingQty === 0 && "bg-red-50 dark:bg-red-900/20",
              remainingQty > 0 && remainingQty <= 10 && "bg-amber-50 dark:bg-amber-900/20",
              remainingQty > 10 && "bg-emerald-50 dark:bg-emerald-900/20"
            )}>
              <p className={cn(
                "text-sm font-bold",
                remainingQty === 0 && "text-red-600 dark:text-red-400",
                remainingQty > 0 && remainingQty <= 10 && "text-amber-600 dark:text-amber-400",
                remainingQty > 10 && "text-emerald-600 dark:text-emerald-400"
              )}>
                {remainingQty}
              </p>
              <p className="text-[10px] opacity-70">Remaining</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded p-1.5">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 truncate">
                {request.approver_name || '-'}
              </p>
              <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">Approver</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        {canManage && (
          <div className="border-t flex">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(request)}
              className="flex-1 rounded-none h-10 gap-1.5 text-xs"
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </Button>
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(request)}
                className="flex-1 rounded-none h-10 gap-1.5 text-xs border-l text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(request.id)}
                className="flex-1 rounded-none h-10 gap-1.5 text-xs border-l text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
