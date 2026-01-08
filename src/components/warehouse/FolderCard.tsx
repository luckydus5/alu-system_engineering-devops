import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, MoreVertical, Edit, Trash2, FolderOpen, Package } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface FolderCardProps {
  name: string;
  itemCount?: number;
  totalQuantity?: number;
  lowStockCount?: number;
  minItems?: number;
  subFolderCount?: number;
  color?: string;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onOpenFolder?: () => void;
  onViewItems?: () => void;
  canManage?: boolean;
  className?: string;
  variant?: 'classification' | 'location';
}

export function FolderCard({
  name,
  itemCount = 0,
  totalQuantity = 0,
  lowStockCount = 0,
  minItems = 0,
  subFolderCount = 0,
  color = '#6366F1',
  onClick,
  onEdit,
  onDelete,
  onOpenFolder,
  onViewItems,
  canManage = false,
  className,
  variant = 'classification',
}: FolderCardProps) {
  const hasLowStock = lowStockCount > 0;
  const isBelowMinimum = variant === 'location' && itemCount < minItems;
  const hasSubFolders = subFolderCount > 0;

  return (
    <div
      className={cn(
        'group relative cursor-pointer transition-all duration-200',
        'hover:scale-[1.02] active:scale-[0.98]',
        className
      )}
      onClick={onClick}
    >
      {/* Folder SVG */}
      <div className="relative">
        <svg
          viewBox="0 0 120 100"
          className="w-full h-auto drop-shadow-md"
          style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' }}
        >
          {/* Back of folder */}
          <path
            d="M 5 20 L 5 90 Q 5 95 10 95 L 110 95 Q 115 95 115 90 L 115 25 Q 115 20 110 20 L 50 20 L 45 10 Q 43 5 38 5 L 10 5 Q 5 5 5 10 L 5 20"
            fill={color}
            opacity="0.9"
          />
          {/* Tab */}
          <path
            d="M 5 20 L 50 20 L 45 10 Q 43 5 38 5 L 10 5 Q 5 5 5 10 L 5 20"
            fill={color}
            className="brightness-110"
          />
          {/* Front of folder */}
          <path
            d="M 2 30 L 2 90 Q 2 98 10 98 L 110 98 Q 118 98 118 90 L 118 30 Q 118 25 110 25 L 10 25 Q 2 25 2 30"
            fill={color}
            className="brightness-95"
          />
          {/* Highlight on front */}
          <path
            d="M 10 30 L 110 30 Q 113 30 113 33 L 113 35 Q 113 38 110 38 L 10 38 Q 7 38 7 35 L 7 33 Q 7 30 10 30"
            fill="white"
            opacity="0.3"
          />
        </svg>

        {/* Content inside folder */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-8 px-2">
          {/* Sub-folder indicator */}
          {hasSubFolders && (
            <div className="absolute top-[25%] left-[15%]">
              <div 
                className="bg-white/90 backdrop-blur-sm rounded-lg px-1.5 py-0.5 shadow-sm border border-white/50"
              >
                <span className="text-[10px] font-medium text-slate-600">
                  📁 {subFolderCount}
                </span>
              </div>
            </div>
          )}
          
          {/* Item count badge */}
          {itemCount > 0 && (
            <div className="absolute top-[30%] right-[15%]">
              <div 
                className="bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm border border-white/50"
              >
                <span className="text-xs font-bold" style={{ color }}>
                  {itemCount}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Low stock warning badge */}
        {hasLowStock && (
          <div className="absolute -top-1 -right-1 z-10">
            <Badge 
              variant="destructive" 
              className="h-6 w-6 p-0 flex items-center justify-center rounded-full animate-pulse"
            >
              <AlertTriangle className="h-3 w-3" />
            </Badge>
          </div>
        )}

        {/* Below minimum warning for locations */}
        {isBelowMinimum && !hasLowStock && (
          <div className="absolute -top-1 -right-1 z-10">
            <Badge 
              className="h-6 w-6 p-0 flex items-center justify-center rounded-full bg-amber-500"
            >
              <AlertTriangle className="h-3 w-3" />
            </Badge>
          </div>
        )}

        {/* Edit/Delete menu */}
        {canManage && (onEdit || onDelete || onOpenFolder || onViewItems) && (
          <div 
            className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7 bg-white/90 hover:bg-white shadow-sm"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {onOpenFolder && (
                  <DropdownMenuItem onClick={onOpenFolder}>
                    <FolderOpen className="h-4 w-4 mr-2 text-amber-600" />
                    Open Folder
                  </DropdownMenuItem>
                )}
                {onViewItems && (
                  <DropdownMenuItem onClick={onViewItems}>
                    <Package className="h-4 w-4 mr-2 text-blue-600" />
                    View Items
                  </DropdownMenuItem>
                )}
                {(onOpenFolder || onViewItems) && (onEdit || onDelete) && (
                  <DropdownMenuSeparator />
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Folder label */}
      <div className="mt-2 text-center px-1">
        <p className="font-medium text-sm truncate text-foreground">{name}</p>
        <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
          {hasSubFolders && (
            <span className="text-xs text-muted-foreground">
              {subFolderCount} folder{subFolderCount > 1 ? 's' : ''}
            </span>
          )}
          {hasSubFolders && (itemCount > 0 || totalQuantity > 0) && (
            <span className="text-xs text-muted-foreground">•</span>
          )}
          <span className="text-xs text-muted-foreground">
            {totalQuantity.toLocaleString()} item{totalQuantity !== 1 ? 's' : ''}
          </span>
          {variant === 'location' && minItems > 0 && (
            <>
              <span className="text-xs text-muted-foreground">/</span>
              <span className={cn(
                'text-xs',
                isBelowMinimum ? 'text-amber-500 font-medium' : 'text-muted-foreground'
              )}>
                Min. {minItems}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
