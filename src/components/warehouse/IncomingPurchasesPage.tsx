import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Department } from '@/hooks/useDepartments';
import { useInventory } from '@/hooks/useInventory';
import { useReceivingRecords, ReceivingRecord, ReceivingRecordItem } from '@/hooks/useReceivingRecords';
import { ReceivingRecordsList } from './ReceivingRecordsList';
import { CreateReceivingDialog } from './CreateReceivingDialog';
import { ViewReceivingDialog } from './ViewReceivingDialog';

interface IncomingPurchasesPageProps {
  department: Department;
  onBack: () => void;
}

export function IncomingPurchasesPage({ department, onBack }: IncomingPurchasesPageProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewRecord, setViewRecord] = useState<ReceivingRecord | null>(null);

  const { items: inventoryItems, loading: inventoryLoading } = useInventory(department.id);
  const { records, loading: recordsLoading, createRecord, deleteRecord } = useReceivingRecords(department.id);

  const handleSaveRecord = async (data: {
    record_name: string;
    receiving_date: Date;
    items: ReceivingRecordItem[];
  }) => {
    await createRecord(data);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Receiving Records</h2>
          <p className="text-sm text-muted-foreground">
            Document incoming purchases with Excel-like records
          </p>
        </div>
      </div>

      {/* Records List */}
      <ReceivingRecordsList
        records={records}
        loading={recordsLoading}
        departmentName={department.name}
        onCreateNew={() => setShowCreateDialog(true)}
        onViewRecord={setViewRecord}
        onDeleteRecord={deleteRecord}
      />

      {/* Create Dialog */}
      <CreateReceivingDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        inventoryItems={inventoryItems}
        inventoryLoading={inventoryLoading}
        departmentName={department.name}
        onSave={handleSaveRecord}
      />

      {/* View Dialog */}
      <ViewReceivingDialog
        open={!!viewRecord}
        onOpenChange={(open) => !open && setViewRecord(null)}
        record={viewRecord}
        departmentName={department.name}
      />
    </div>
  );
}
