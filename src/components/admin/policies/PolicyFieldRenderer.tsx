import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface PolicyField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'time' | 'boolean' | 'select';
  icon?: React.ElementType;
  unit?: string;
  options?: { value: string; label: string }[];
  description?: string;
}

export function PolicyFieldRenderer({ 
  field, 
  value, 
  onChange 
}: { 
  field: PolicyField; 
  value: string; 
  onChange: (val: string) => void;
}) {
  const Icon = field.icon;

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted/40 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {Icon && (
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
        {!Icon && <div className="w-9" />}
        <div className="min-w-0">
          <Label className="text-sm font-medium">{field.label}</Label>
          {field.description && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{field.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-4">
        {field.type === 'boolean' ? (
          <Switch 
            checked={value === 'true'} 
            onCheckedChange={(checked) => onChange(checked ? 'true' : 'false')} 
          />
        ) : field.type === 'select' ? (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : field.type === 'time' ? (
          <Input 
            type="time" 
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            className="w-[140px] h-9" 
          />
        ) : (
          <div className="flex items-center gap-1.5">
            <Input 
              type="number" 
              value={value} 
              onChange={(e) => onChange(e.target.value)} 
              className="w-[100px] h-9 text-right" 
              step={field.key.includes('rate') || field.key.includes('max_hours') ? '0.1' : '1'}
            />
            {field.unit && (
              <span className="text-xs text-muted-foreground w-12">{field.unit}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
