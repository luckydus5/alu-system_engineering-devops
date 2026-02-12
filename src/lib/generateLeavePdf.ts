import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

interface LeaveApprovalPdfData {
  employeeName: string;
  department: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string | null;
  requestDate: string;
  managerName: string | null;
  managerDate: string | null;
  managerComment: string | null;
  hrName: string | null;
  hrDate: string | null;
  hrComment: string | null;
  gmName: string | null;
  gmDate: string | null;
  gmComment: string | null;
  status: string;
}

export function generateLeaveApprovalPdf(data: LeaveApprovalPdfData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('LEAVE APPLICATION FORM', pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Official Leave Approval Document', pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0);
  y += 12;

  // Divider
  doc.setDrawColor(0, 120, 200);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Employee Details Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. EMPLOYEE DETAILS', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const detailsData = [
    ['Employee Name:', data.employeeName],
    ['Department:', data.department],
    ['Date of Request:', data.requestDate],
  ];

  detailsData.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value || 'N/A', margin + 50, y);
    y += 7;
  });
  y += 5;

  // Leave Details Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('2. LEAVE DETAILS', margin, y);
  y += 8;

  doc.setFontSize(10);
  const leaveData = [
    ['Leave Type:', data.leaveType],
    ['Start Date:', data.startDate],
    ['End Date:', data.endDate],
    ['Total Days:', String(data.totalDays)],
    ['Reason:', data.reason || 'Not specified'],
  ];

  leaveData.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 50, y);
    y += 7;
  });
  y += 5;

  // Status
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const statusColor = data.status === 'approved' ? [0, 150, 80] : data.status === 'rejected' ? [200, 50, 50] : [200, 150, 0];
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(`STATUS: ${data.status.toUpperCase()}`, margin, y);
  doc.setTextColor(0);
  y += 12;

  // Approval Workflow Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('3. APPROVAL WORKFLOW', margin, y);
  y += 10;

  // Table header
  const colWidths = [55, 45, 70];
  const colX = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1]];
  
  doc.setFillColor(240, 240, 245);
  doc.rect(margin, y - 5, pageWidth - 2 * margin, 8, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('APPROVER', colX[0] + 2, y);
  doc.text('DATE', colX[1] + 2, y);
  doc.text('SIGNATURE / COMMENT', colX[2] + 2, y);
  y += 10;

  // Approval rows
  const approvalRows = [
    {
      role: 'Department Manager',
      name: data.managerName,
      date: data.managerDate,
      comment: data.managerComment,
    },
    {
      role: 'HR Department',
      name: data.hrName,
      date: data.hrDate,
      comment: data.hrComment,
    },
    {
      role: 'General Manager',
      name: data.gmName,
      date: data.gmDate,
      comment: data.gmComment,
    },
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  approvalRows.forEach((row) => {
    // Role label
    doc.setFont('helvetica', 'bold');
    doc.text(row.role, colX[0] + 2, y);
    doc.setFont('helvetica', 'normal');
    
    if (row.name) {
      doc.text(row.name, colX[0] + 2, y + 5);
      doc.text(row.date || '', colX[1] + 2, y);
      
      // Signature line
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      doc.line(colX[2] + 2, y + 8, colX[2] + 62, y + 8);
      doc.setFontSize(7);
      doc.text('(Signed)', colX[2] + 25, y + 12);
      doc.setFontSize(9);
      
      if (row.comment) {
        doc.setFontSize(8);
        doc.setTextColor(80);
        doc.text(`"${row.comment}"`, colX[2] + 2, y + 3, { maxWidth: 65 });
        doc.setTextColor(0);
        doc.setFontSize(9);
      }
    } else {
      doc.setTextColor(150);
      doc.text('Pending...', colX[1] + 2, y);
      doc.setTextColor(0);
    }

    y += 22;
    doc.setDrawColor(220);
    doc.setLineWidth(0.2);
    doc.line(margin, y - 4, pageWidth - margin, y - 4);
  });

  y += 5;

  // Footer
  doc.setDrawColor(0, 120, 200);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Generated on ${format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}`, margin, y);
  doc.text('This is a system-generated document.', pageWidth - margin, y, { align: 'right' });

  // Save
  doc.save(`Leave_Application_${data.employeeName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}
