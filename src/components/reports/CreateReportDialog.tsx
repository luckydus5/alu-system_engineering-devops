import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDepartments } from '@/hooks/useDepartments';
import { useReports } from '@/hooks/useReports';
import { useUserRole } from '@/hooks/useUserRole';
import { Loader2, Upload, X, FileText, FileSpreadsheet, File } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type ReportType = Database['public']['Enums']['report_type'];
type ReportPriority = Database['public']['Enums']['report_priority'];
type ReportStatus = Database['public']['Enums']['report_status'];

interface CreateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDepartmentId?: string;
}

const reportTypes: { value: ReportType; label: string }[] = [
  { value: 'incident', label: 'Incident Report' },
  { value: 'general', label: 'General Report' },
  { value: 'maintenance', label: 'Maintenance Report' },
  { value: 'safety', label: 'Safety Report' },
  { value: 'compliance', label: 'Compliance Report' },
];

const priorities: { value: ReportPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const allowedFileTypes = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const getFileIcon = (type: string) => {
  if (type.includes('pdf')) return <FileText className="h-4 w-4 text-destructive" />;
  if (type.includes('sheet') || type.includes('excel')) return <FileSpreadsheet className="h-4 w-4 text-success" />;
  return <File className="h-4 w-4 text-primary" />;
};

export function CreateReportDialog({ open, onOpenChange, defaultDepartmentId }: CreateReportDialogProps) {
  const { departments } = useDepartments();
  const { createReport } = useReports();
  const { profile, hasRole } = useUserRole();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-assign department from user's profile
  const userDepartmentId = profile?.department_id || defaultDepartmentId || '';
  const userDepartment = departments.find(d => d.id === userDepartmentId);
  const isAdmin = hasRole('admin') || hasRole('director');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    report_type: 'general' as ReportType,
    priority: 'medium' as ReportPriority,
    department_id: userDepartmentId,
  });

  // Update department_id when profile loads
  useEffect(() => {
    if (userDepartmentId && !formData.department_id) {
      setFormData(prev => ({ ...prev, department_id: userDepartmentId }));
    }
  }, [userDepartmentId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(file => {
      if (!allowedFileTypes.includes(file.type)) {
        toast.error(`${file.name}: Only PDF, Excel, and Word files are allowed`);
        return false;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name}: File size must be less than 50MB`);
        return false;
      }
      return true;
    });
    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (userId: string): Promise<string[]> => {
    const uploadedPaths: string[] = [];
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('report-attachments')
        .upload(fileName, file);

      if (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
      } else {
        uploadedPaths.push(fileName);
      }
    }
    
    return uploadedPaths;
  };

  const handleSubmit = async (e: React.FormEvent, asDraft: boolean = true) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Please enter a report title');
      return;
    }
    
    if (!formData.department_id) {
      toast.error('Department is required');
      return;
    }

    setIsSubmitting(true);
    setUploading(files.length > 0);

    try {
      // Upload files first
      let attachments: string[] = [];
      if (files.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          attachments = await uploadFiles(user.id);
        }
      }

      const status: ReportStatus = asDraft ? 'draft' : 'submitted';

      const report = await createReport({
        ...formData,
        attachments: attachments.length > 0 ? attachments : null,
        status,
        submitted_at: asDraft ? null : new Date().toISOString(),
      });

      if (report) {
        setFormData({
          title: '',
          description: '',
          report_type: 'general',
          priority: 'medium',
          department_id: userDepartmentId,
        });
        setFiles([]);
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Report</DialogTitle>
          <DialogDescription>
            Upload your monthly report (PDF, Excel, or Word) and fill in the details.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter report title"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              {isAdmin ? (
                <Select
                  value={formData.department_id}
                  onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={userDepartment?.name || 'Not assigned'}
                  disabled
                  className="bg-muted"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Report Type</Label>
              <Select
                value={formData.report_type}
                onValueChange={(value) => setFormData({ ...formData, report_type: value as ReportType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value as ReportPriority })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorities.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Attachments (PDF, Excel, Word)</Label>
            <div 
              className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.xls,.xlsx,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, Excel, Word (max 50MB each)
              </p>
            </div>
            
            {files.length > 0 && (
              <div className="space-y-2 mt-3">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      {getFileIcon(file.type)}
                      <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your report..."
              rows={4}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="secondary"
              disabled={isSubmitting || !formData.title.trim() || !formData.department_id}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {uploading ? 'Uploading...' : 'Save Draft'}
            </Button>
            <Button
              type="button"
              onClick={(e) => handleSubmit(e, false)}
              disabled={isSubmitting || !formData.title.trim() || !formData.department_id}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit for Review
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
