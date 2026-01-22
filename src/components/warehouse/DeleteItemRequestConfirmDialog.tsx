import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ItemRequest } from "@/hooks/useItemRequests";
import { format } from "date-fns";

interface DeleteItemRequestConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ItemRequest | null;
  deleting?: boolean;
  onConfirm: () => void;
}

export function DeleteItemRequestConfirmDialog({
  open,
  onOpenChange,
  request,
  deleting = false,
  onConfirm,
}: DeleteItemRequestConfirmDialogProps) {
  const items = request?.requested_items && request.requested_items.length > 0
    ? request.requested_items
    : request
      ? [{
          item_id: request.inventory_item_id ?? "",
          item_name: request.item_description,
          quantity: request.quantity_requested,
          previous_quantity: request.previous_quantity,
          new_quantity: request.new_quantity,
        }]
      : [];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete item request?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. Please confirm you want to delete this request.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {request && (
          <div className="space-y-3">
            <div className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{request.requester_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(request.created_at), "dd MMM yyyy, HH:mm")}
                    {(request.requester_department_text || request.requester_department_name) && (
                      <> • {request.requester_department_text || request.requester_department_name}</>
                    )}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground">Items</p>
                <ul className="mt-1 space-y-1">
                  {items.slice(0, 5).map((it, idx) => (
                    <li key={`${it.item_id || idx}`} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">{it.item_name}</span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">x{it.quantity}</span>
                    </li>
                  ))}
                </ul>
                {items.length > 5 && (
                  <p className="mt-1 text-xs text-muted-foreground">+{items.length - 5} more</p>
                )}
              </div>
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={deleting}>
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant="destructive" onClick={onConfirm} disabled={deleting || !request}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
