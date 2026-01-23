import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

interface ReceivedItem {
  id: string;
  item_name: string;
  quantity: number;
  unit: string;
  image_url: string | null;
}

interface PdfOptions {
  date: Date;
  storeName: string;
  items: ReceivedItem[];
}

// Convert image URL to base64 for PDF embedding
async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
}

export async function generateReceivingPdf(options: PdfOptions): Promise<void> {
  const { date, storeName, items } = options;
  
  // A4 size in mm: 210 x 297
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  
  // Header - Date and Store
  const dateStr = format(date, 'M/d/yy');
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  
  // Date label and value
  pdf.text('Date', pageWidth / 2, 20, { align: 'center' });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(dateStr, pageWidth / 2, 28, { align: 'center' });
  
  // Store label and value
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.text('Store', pageWidth / 2, 38, { align: 'center' });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(storeName, pageWidth / 2, 46, { align: 'center' });
  
  // Grid layout: 3 columns
  const cols = 3;
  const cardWidth = (contentWidth - 10) / cols; // ~56mm per card
  const cardInfoHeight = 28; // Height for item info section
  const cardImageHeight = 45; // Height for image section
  const cardHeight = cardInfoHeight + cardImageHeight; // Total card height
  const cardGap = 5;
  
  let startY = 55;
  
  // Pre-load all images in parallel
  const imagePromises = items.map(async (item) => {
    if (item.image_url) {
      return { id: item.id, base64: await imageUrlToBase64(item.image_url) };
    }
    return { id: item.id, base64: null };
  });
  
  const imageResults = await Promise.all(imagePromises);
  const imageMap = new Map(imageResults.map(r => [r.id, r.base64]));
  
  // Calculate items per page
  const availableHeight = pageHeight - startY - margin;
  const rowsPerPage = Math.floor(availableHeight / (cardHeight + cardGap));
  const itemsPerPage = rowsPerPage * cols;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemIndex = i % itemsPerPage;
    
    // Add new page if needed
    if (i > 0 && itemIndex === 0) {
      pdf.addPage();
      startY = 20;
    }
    
    const row = Math.floor(itemIndex / cols);
    const col = itemIndex % cols;
    
    const x = margin + col * (cardWidth + cardGap);
    const y = startY + row * (cardHeight + cardGap);
    
    // Draw card border for info section
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    
    // Item name box
    pdf.rect(x, y, cardWidth, 10);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    
    // Truncate long names
    const maxNameLength = 22;
    const displayName = item.item_name.length > maxNameLength 
      ? item.item_name.substring(0, maxNameLength - 1) + '...'
      : item.item_name;
    pdf.text(displayName, x + cardWidth / 2, y + 7, { align: 'center' });
    
    // Quantity box
    pdf.rect(x, y + 10, cardWidth, 9);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const qtyStr = Number.isInteger(item.quantity) 
      ? item.quantity.toString() + '.00'
      : item.quantity.toFixed(2);
    pdf.text(qtyStr, x + cardWidth / 2, y + 16, { align: 'center' });
    
    // Unit box
    pdf.rect(x, y + 19, cardWidth, 9);
    pdf.setFontSize(9);
    pdf.text(item.unit || 'Pieces', x + cardWidth / 2, y + 25, { align: 'center' });
    
    // Image area (below info)
    const imageY = y + cardInfoHeight;
    const base64Image = imageMap.get(item.id);
    
    if (base64Image) {
      try {
        // Add image with proper aspect ratio
        pdf.addImage(
          base64Image,
          'JPEG',
          x,
          imageY,
          cardWidth,
          cardImageHeight,
          undefined,
          'MEDIUM'
        );
      } catch (error) {
        // If image fails, draw placeholder
        pdf.setFillColor(240, 240, 240);
        pdf.rect(x, imageY, cardWidth, cardImageHeight, 'F');
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text('No image', x + cardWidth / 2, imageY + cardImageHeight / 2, { align: 'center' });
        pdf.setTextColor(0, 0, 0);
      }
    } else {
      // No image placeholder
      pdf.setFillColor(240, 240, 240);
      pdf.rect(x, imageY, cardWidth, cardImageHeight, 'F');
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('No image', x + cardWidth / 2, imageY + cardImageHeight / 2, { align: 'center' });
      pdf.setTextColor(0, 0, 0);
    }
  }
  
  // Save the PDF
  const filename = `Receiving_${storeName.replace(/\s+/g, '_')}_${format(date, 'yyyy-MM-dd')}.pdf`;
  pdf.save(filename);
}
