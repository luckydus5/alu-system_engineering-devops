import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  User,
  Calendar,
  Package,
  FileText,
  Download,
  ImageIcon,
  Building2,
  CheckCircle2,
  Edit2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ItemRequest } from '@/hooks/useItemRequests';
import { cn } from '@/lib/utils';

interface ItemRequestDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ItemRequest | null;
  onEdit?: (request: ItemRequest) => void;
  canEdit?: boolean;
}

export function ItemRequestDetailDialog({
  open,
  onOpenChange,
  request,
  onEdit,
  canEdit = false,
}: ItemRequestDetailDialogProps) {
  if (!request) return null;

  const totalQty = request.requested_items
    ? request.requested_items.reduce((sum, item) => sum + item.quantity, 0)
    : request.quantity_requested;

  const remainingQty = request.requested_items && request.requested_items.length > 0
    ? request.requested_items.reduce((sum, item) => sum + (item.new_quantity || 0), 0)
    : request.new_quantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b bg-gradient-to-r from-amber-500 to-amber-600">
          <DialogTitle className="flex items-center gap-2 text-white">
            <FileText className="h-5 w-5" />
            Request Details
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="p-4 space-y-4">
            {/* Date & Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(new Date(request.created_at), 'dd MMM yyyy, HH:mm')}
              </div>
              <Badge 
                variant="secondary" 
                className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            </div>

            {/* Requester Info */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-amber-500" />
                <span className="font-medium">{request.requester_name}</span>
              </div>
              {(request.requester_department_text || request.requester_department_name) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{request.requester_department_text || request.requester_department_name}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-500" />
                Requested Items
              </h4>
              <div className="space-y-2">
                {request.requested_items && request.requested_items.length > 0 ? (
                  request.requested_items.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm">{item.item_name}</span>
                        <Badge variant="outline" className="font-mono shrink-0">
                          x{item.quantity}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>Before: {item.previous_quantity}</span>
                        <span>→</span>
                        <span className={cn(
                          "font-medium",
                          item.new_quantity === 0 && "text-red-500",
                          item.new_quantity > 0 && item.new_quantity <= 10 && "text-amber-500",
                          item.new_quantity > 10 && "text-emerald-500"
                        )}>
                          After: {item.new_quantity}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-sm">{request.item_description}</span>
                      <Badge variant="outline" className="font-mono shrink-0">
                        x{request.quantity_requested}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>Before: {request.previous_quantity}</span>
                      <span>→</span>
                      <span className={cn(
                        "font-medium",
                        request.new_quantity === 0 && "text-red-500",
                        request.new_quantity > 0 && request.new_quantity <= 10 && "text-amber-500",
                        request.new_quantity > 10 && "text-emerald-500"
                      )}>
                        After: {request.new_quantity}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{totalQty}</p>
                <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Total Issued</p>
              </div>
              <div className={cn(
                "p-3 rounded-lg text-center",
                remainingQty === 0 && "bg-red-50 dark:bg-red-900/20",
                remainingQty > 0 && remainingQty <= 10 && "bg-amber-50 dark:bg-amber-900/20",
                remainingQty > 10 && "bg-emerald-50 dark:bg-emerald-900/20"
              )}>
                <p className={cn(
                  "text-xl font-bold",
                  remainingQty === 0 && "text-red-600 dark:text-red-400",
                  remainingQty > 0 && remainingQty <= 10 && "text-amber-600 dark:text-amber-400",
                  remainingQty > 10 && "text-emerald-600 dark:text-emerald-400"
                )}>
                  {remainingQty}
                </p>
                <p className="text-xs opacity-70">Remaining Stock</p>
              </div>
            </div>

            {/* Usage Purpose */}
            {request.usage_purpose && (
              <div className="space-y-1">
                <h4 className="text-sm font-medium">Usage Purpose</h4>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  {request.usage_purpose}
                </p>
              </div>
            )}

            {/* Approver */}
            <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Approved By</p>
                <p className="font-medium text-emerald-600 dark:text-emerald-400">
                  {request.approver_name || '-'}
                </p>
              </div>
              {request.approval_date && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Approval Date</p>
                  <p className="text-sm">
                    {format(new Date(request.approval_date), 'dd/MM/yyyy')}
                  </p>
                </div>
              )}
            </div>

            {/* Proof Image */}
            {request.approval_proof_url && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-amber-500" />
                  Approval Proof
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={request.approval_proof_url}
                    alt="Approval proof"
                    className="w-full h-auto max-h-[200px] object-contain bg-slate-100 dark:bg-slate-800"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(request.approval_proof_url!, '_blank')}
                  className="w-full gap-2"
                >
                  <Download className="h-4 w-4" />
                  View Full Image
                </Button>
              </div>
            )}

            {/* Notes */}
            {request.notes && (
              <div className="space-y-1">
                <h4 className="text-sm font-medium">Notes</h4>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  {request.notes}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-muted/30 flex gap-2">
          {canEdit && onEdit && (
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onEdit(request);
              }}
              className="flex-1 gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit Request
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className={cn(canEdit && onEdit ? "flex-1" : "w-full")}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
