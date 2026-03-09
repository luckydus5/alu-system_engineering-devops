import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, Pencil } from 'lucide-react';

interface FleetInlineEditProps {
  value: string | number | null;
  onSave: (value: string) => Promise<void>;
  type?: 'text' | 'number' | 'select';
  options?: { value: string; label: string }[];
  className?: string;
  placeholder?: string;
}

export function FleetInlineEdit({
  value,
  onSave,
  type = 'text',
  options = [],
  className = '',
  placeholder = '-'
}: FleetInlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value || ''));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(String(value || ''));
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {type === 'select' ? (
          <Select value={editValue} onValueChange={setEditValue}>
            <SelectTrigger className="h-7 text-xs w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-7 text-xs w-[100px]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
          />
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-emerald-600 hover:text-emerald-700"
          onClick={handleSave}
          disabled={saving}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
          onClick={handleCancel}
          disabled={saving}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-1 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 ${className}`}
      onClick={() => setIsEditing(true)}
    >
      <span className={value ? '' : 'text-muted-foreground'}>
        {type === 'select' 
          ? options.find(o => o.value === String(value))?.label || placeholder
          : value?.toLocaleString() || placeholder
        }
      </span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
