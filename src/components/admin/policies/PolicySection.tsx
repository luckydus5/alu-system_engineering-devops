import { Card, CardContent } from '@/components/ui/card';
import { PolicyField, PolicyFieldRenderer } from './PolicyFieldRenderer';

interface PolicySectionProps {
  category: string;
  fields: PolicyField[];
  title: string;
  description: string;
  icon: React.ElementType;
  getLocalValue: (category: string, key: string) => string;
  handleChange: (category: string, key: string, value: string) => void;
}

export function PolicySection({ category, fields, title, description, icon: Icon, getLocalValue, handleChange }: PolicySectionProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Card className="shadow-sm">
        <CardContent className="p-2">
          <div className="divide-y divide-border/50">
            {fields.map(field => (
              <PolicyFieldRenderer
                key={field.key}
                field={field}
                value={getLocalValue(category, field.key)}
                onChange={(val) => handleChange(category, field.key, val)}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
