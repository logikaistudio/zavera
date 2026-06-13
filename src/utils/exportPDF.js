import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate, formatTime, formatDuration } from './formatters';

const getSystemSettings = () => {
    try {
        return JSON.parse(localStorage.getItem('spacity_system_settings') || '{}');
    } catch (e) {
        return {};
    }
};

const getLogo = () => localStorage.getItem('zavera_logo');

const getLogoFormat = (logoStr) => {
    if (!logoStr) return 'PNG';
    if (logoStr.startsWith('data:image/jpeg') || logoStr.startsWith('data:image/jpg')) return 'JPEG';
    if (logoStr.startsWith('data:image/png')) return 'PNG';
    if (logoStr.startsWith('data:image/webp')) return 'WEBP';
    return 'PNG';
};

/**
 * Export receipt for a booking
 */
export const exportReceipt = (booking, services, therapist, branch) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 200] // Thermal printer size
    });

    const settings = getSystemSettings();
    const logo = getLogo();
    const companyName = settings.companyName || 'Zavera';

    // Header
    let currentY = 10;
    if (logo && logo.startsWith('data:image/')) {
        doc.addImage(logo, getLogoFormat(logo), 30, currentY, 20, 20);
        currentY += 25;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName, 40, currentY, { align: 'center' });
    currentY += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (settings.companyAddress) {
        const splitAddress = doc.splitTextToSize(settings.companyAddress, 70);
        doc.text(splitAddress, 40, currentY, { align: 'center' });
        currentY += (splitAddress.length * 4) + 2;
    }

    doc.text(branch.name, 40, currentY, { align: 'center' });
    currentY += 5;
    doc.text(branch.location, 40, currentY, { align: 'center' });
    currentY += 6;

    // Divider
    doc.setLineWidth(0.5);
    doc.line(5, currentY, 75, currentY);
    currentY += 7;

    // Receipt details
    doc.setFontSize(9);
    let y = currentY;

    doc.text(`Tanggal: ${formatDate(booking.date, 'medium')}`, 5, y);
    y += 5;
    doc.text(`Jam: ${formatTime(booking.time)}`, 5, y);
    y += 5;
    doc.text(`No. Booking: ${booking.id.slice(0,8)}`, 5, y);
    y += 8;

    // Customer
    doc.setFont('helvetica', 'bold');
    doc.text('Customer:', 5, y);
    doc.setFont('helvetica', 'normal');
    y += 5;
    doc.text(booking.customerName, 5, y);
    y += 8;

    // Service details
    doc.setFont('helvetica', 'bold');
    doc.text('Layanan:', 5, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    
    // Array of services
    let totalDuration = 0;
    const servicesArray = Array.isArray(services) ? services : [services];
    servicesArray.forEach(svc => {
        doc.text(svc.name, 5, y);
        doc.text(formatCurrency(svc.price), 75, y, { align: 'right' });
        y += 5;
        totalDuration += svc.durationMinutes || 0;
    });

    if (booking.transport) {
        doc.text('Transport', 5, y);
        doc.text(formatCurrency(booking.transport), 75, y, { align: 'right' });
        y += 5;
    }
    if (booking.extraTransport) {
        doc.text('Extra Transport', 5, y);
        doc.text(formatCurrency(booking.extraTransport), 75, y, { align: 'right' });
        y += 5;
    }
    if (booking.extraCharge) {
        doc.text('Extra Charge', 5, y);
        doc.text(formatCurrency(booking.extraCharge), 75, y, { align: 'right' });
        y += 5;
    }

    doc.text(`Total Durasi: ${formatDuration(booking.durationMinutes || totalDuration)}`, 5, y);
    y += 5;
    doc.text(`Terapis: ${therapist.name}`, 5, y);
    y += 8;

    // Price
    doc.setLineWidth(0.3);
    doc.line(5, y, 75, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Total:', 5, y);
    doc.text(formatCurrency(booking.totalPrice), 75, y, { align: 'right' });

    y += 6;
    doc.setLineWidth(0.5);
    doc.line(5, y, 75, y);

    // Footer
    y += 8;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Terima kasih atas kunjungan Anda', 40, y, { align: 'center' });
    y += 4;
    doc.text('Semoga sehat selalu!', 40, y, { align: 'center' });

    // Auto print for thermal printers
    doc.autoPrint();
    const blob = doc.output('blob');
    const pdfBlobUrl = URL.createObjectURL(blob);
    try {
        window.open(pdfBlobUrl, '_blank');
    } catch (e) {
        console.error("Popup blocked", e);
    }
};

/**
 * Export revenue report to PDF
 */
export const exportRevenueReport = (data, options = {}) => {
    const {
        startDate,
        endDate,
        branchName = 'Semua Cabang',
        includeDetails = true
    } = options;

    const doc = new jsPDF();

    const settings = getSystemSettings();
    const logo = getLogo();
    const companyName = settings.companyName || 'Zavera';

    let currentY = 15;
    if (logo && logo.startsWith('data:image/')) {
        doc.addImage(logo, getLogoFormat(logo), 90, currentY, 30, 30);
        currentY += 35;
    }

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName, 105, currentY, { align: 'center' });
    currentY += 8;

    if (settings.companyAddress) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(settings.companyAddress, 105, currentY, { align: 'center' });
        currentY += 8;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Laporan Pendapatan', 105, currentY, { align: 'center' });
    currentY += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periode: ${formatDate(startDate, 'medium')} - ${formatDate(endDate, 'medium')}`, 105, currentY, { align: 'center' });
    currentY += 6;
    doc.text(`Cabang: ${branchName}`, 105, currentY, { align: 'center' });
    currentY += 9;

    let yPos = currentY;

    // Summary
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Ringkasan', 14, yPos);
    yPos += 8;

    const summaryData = [
        ['Total Booking', data.totalBookings.toString()],
        ['Total Pendapatan', formatCurrency(data.totalRevenue)],
        ['Total Insentif Terapis', formatCurrency(data.totalIncentives)],
        ['Laba Bersih', formatCurrency(data.netProfit)],
        ['Bagian SPA (' + data.profitSharing.spaPercent + '%)', formatCurrency(data.profitSharing.spaAmount)],
        ['Bagian Hotel (' + data.profitSharing.hotelPercent + '%)', formatCurrency(data.profitSharing.hotelAmount)]
    ];

    autoTable(doc, {
        startY: yPos,
        head: [['Keterangan', 'Nilai']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241], fontSize: 10 },
        styles: { fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 80, halign: 'right' }
        }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // Detailed breakdown if included
    if (includeDetails && data.serviceBreakdown && data.serviceBreakdown.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Breakdown per Layanan', 14, yPos);
        yPos += 8;

        const serviceData = data.serviceBreakdown.map(item => [
            item.service.name,
            item.count.toString(),
            formatCurrency(item.revenue)
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['Layanan', 'Jumlah', 'Pendapatan']],
            body: serviceData,
            theme: 'striped',
            headStyles: { fillColor: [99, 102, 241], fontSize: 10 },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 90 },
                1: { cellWidth: 30, halign: 'center' },
                2: { cellWidth: 70, halign: 'right' }
            }
        });

        yPos = doc.lastAutoTable.finalY + 10;
    }

    // Therapist performance if included
    if (includeDetails && data.therapistPerformance && data.therapistPerformance.length > 0) {
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Kinerja Terapis', 14, yPos);
        yPos += 8;

        const therapistData = data.therapistPerformance.map(item => [
            item.therapist.name,
            item.bookingCount.toString(),
            (item.totalMinutes / 60).toFixed(1) + ' jam',
            formatCurrency(item.totalIncentive)
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['Terapis', 'Booking', 'Total Jam', 'Insentif']],
            body: therapistData,
            theme: 'striped',
            headStyles: { fillColor: [99, 102, 241], fontSize: 10 },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 70 },
                1: { cellWidth: 30, halign: 'center' },
                2: { cellWidth: 40, halign: 'center' },
                3: { cellWidth: 50, halign: 'right' }
            }
        });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(
            `Halaman ${i} dari ${pageCount}`,
            105,
            290,
            { align: 'center' }
        );
        doc.text(
            `Dicetak: ${formatDate(new Date(), 'long')}`,
            14,
            290
        );
    }

    // Save
    const filename = `laporan_pendapatan_${startDate}_${endDate}.pdf`;
    doc.save(filename);
};

/**
 * Export inventory report to PDF
 */
export const exportInventoryReport = (inventory, options = {}) => {
    const {
        includeLowStockOnly = false,
        includeValues = true
    } = options;

    const doc = new jsPDF();

    const settings = getSystemSettings();
    const logo = getLogo();
    const companyName = settings.companyName || 'Zavera';

    let currentY = 15;
    if (logo && logo.startsWith('data:image/')) {
        doc.addImage(logo, getLogoFormat(logo), 90, currentY, 30, 30);
        currentY += 35;
    }

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName, 105, currentY, { align: 'center' });
    currentY += 8;

    if (settings.companyAddress) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(settings.companyAddress, 105, currentY, { align: 'center' });
        currentY += 8;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Laporan Inventory', 105, currentY, { align: 'center' });
    currentY += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tanggal: ${formatDate(new Date(), 'long')}`, 105, currentY, { align: 'center' });
    currentY += 10;

    let yPos = currentY;

    // Filter inventory if needed
    let items = includeLowStockOnly
        ? inventory.filter(item => item.currentStock < item.minStock)
        : inventory;

    // Group by category
    const grouped = items.reduce((acc, item) => {
        if (!acc[item.category]) {
            acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
    }, {});

    // Summary
    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => sum + (item.currentStock * item.pricePerUnit), 0);
    const lowStockCount = items.filter(item => item.currentStock < item.minStock).length;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Ringkasan', 14, yPos);
    yPos += 8;

    const summaryData = [
        ['Total Item', totalItems.toString()],
        ['Item Stok Rendah', lowStockCount.toString()],
    ];

    if (includeValues) {
        summaryData.push(['Total Nilai Inventory', formatCurrency(totalValue)]);
    }

    autoTable(doc, {
        startY: yPos,
        head: [['Keterangan', 'Nilai']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241], fontSize: 10 },
        styles: { fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 80, halign: 'right' }
        }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // Items by category
    Object.entries(grouped).forEach(([category, categoryItems]) => {
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(category, 14, yPos);
        yPos += 8;

        const tableData = categoryItems.map(item => {
            const status = item.currentStock < item.minStock ? 'Rendah' : 'Normal';
            const row = [
                item.name,
                `${item.currentStock} ${item.unit}`,
                `${item.minStock} ${item.unit}`,
                status
            ];

            if (includeValues) {
                row.push(formatCurrency(item.pricePerUnit));
                row.push(formatCurrency(item.currentStock * item.pricePerUnit));
            }

            return row;
        });

        const headers = ['Item', 'Stok', 'Min. Stok', 'Status'];
        const columnStyles = {
            0: { cellWidth: 60 },
            1: { cellWidth: 30, halign: 'center' },
            2: { cellWidth: 30, halign: 'center' },
            3: { cellWidth: 25, halign: 'center' }
        };

        if (includeValues) {
            headers.push('Harga/Unit', 'Total Nilai');
            columnStyles[4] = { cellWidth: 30, halign: 'right' };
            columnStyles[5] = { cellWidth: 35, halign: 'right' };
        }

        autoTable(doc, {
            startY: yPos,
            head: [headers],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [99, 102, 241], fontSize: 9 },
            styles: { fontSize: 8 },
            columnStyles,
            didParseCell: (data) => {
                // Highlight low stock rows
                if (data.section === 'body' && data.column.index === 3) {
                    if (data.cell.text[0] === 'Rendah') {
                        data.cell.styles.textColor = [245, 158, 11];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });

        yPos = doc.lastAutoTable.finalY + 10;
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(
            `Halaman ${i} dari ${pageCount}`,
            105,
            290,
            { align: 'center' }
        );
    }

    // Save
    const filename = `laporan_inventory_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
};

/**
 * Generate Therapist Income Slip as a Blob URL for preview
 */
export const generateTherapistSlipPDF = (therapist, income, branch) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const settings = getSystemSettings();
    const logo = getLogo();
    const companyName = settings.companyName || 'Zavera';
    const companyAddress = settings.companyAddress || 'Jl. Raya Malang, Jawa Timur';

    // Header layout
    let currentY = 15;
    
    // Add Logo if exists
    if (logo && logo.startsWith('data:image/')) {
        doc.addImage(logo, getLogoFormat(logo), 20, currentY, 24, 24);
        
        // Company details (right-aligned to the logo)
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(companyName, 48, currentY + 6);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        
        const splitAddress = doc.splitTextToSize(companyAddress, 140);
        doc.text(splitAddress, 48, currentY + 12);
        
        if (branch) {
            doc.text(`${branch.name} - ${branch.location || ''}`, 48, currentY + 12 + (splitAddress.length * 4.5));
        }
        currentY += 28 + (splitAddress.length * 4.5);
    } else {
        // Center aligned header when there is no logo
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(companyName, 105, currentY, { align: 'center' });
        currentY += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        
        const splitAddress = doc.splitTextToSize(companyAddress, 170);
        doc.text(splitAddress, 105, currentY, { align: 'center' });
        currentY += (splitAddress.length * 4.5) + 2;

        if (branch) {
            doc.text(`${branch.name} - ${branch.location || ''}`, 105, currentY, { align: 'center' });
            currentY += 6;
        }
        currentY += 4;
    }

    // Divider Line
    doc.setLineWidth(0.8);
    doc.setDrawColor(31, 41, 55); // Slate 800
    doc.line(20, currentY, 190, currentY);
    currentY += 10;

    // Document Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('SLIP GAJI TERAPIS', 105, currentY, { align: 'center' });
    currentY += 10;

    // Therapist Details Block (Two-column layout)
    doc.setFontSize(10);
    
    // Left column
    doc.setFont('helvetica', 'bold');
    doc.text('Nama Terapis:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(therapist.name, 50, currentY);

    // Right column
    doc.setFont('helvetica', 'bold');
    doc.text('Tanggal Cetak:', 120, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(new Date(), 'medium'), 150, currentY);

    currentY += 6;

    // Left column row 2
    doc.setFont('helvetica', 'bold');
    doc.text('Cabang:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(branch ? branch.name : '-', 50, currentY);

    // Right column row 2
    doc.setFont('helvetica', 'bold');
    doc.text('Jenis Slip:', 120, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text('Harian', 150, currentY);

    currentY += 12;

    // Rincian Layanan Table (if serviceDetails exist)
    if (income.serviceDetails && income.serviceDetails.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Rincian Layanan (Insentif)', 20, currentY);
        currentY += 5;

        const serviceRows = income.serviceDetails.map((item, idx) => [
            (idx + 1).toString(),
            item.serviceName,
            item.count.toString(),
            formatCurrency(item.totalIncentive)
        ]);

        autoTable(doc, {
            startY: currentY,
            margin: { left: 20, right: 20 },
            head: [['No', 'Nama Layanan', 'Jumlah', 'Total Insentif']],
            body: serviceRows,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], fontSize: 10, fontStyle: 'bold', halign: 'left' },
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 85 },
                2: { cellWidth: 25, halign: 'center' },
                3: { cellWidth: 45, halign: 'right' }
            }
        });

        currentY = doc.lastAutoTable.finalY + 10;
    }

    // Summary Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Ringkasan Pendapatan', 20, currentY);
    currentY += 5;

    const summaryData = [
        ['Gaji Pokok / Upah', formatCurrency(income.wage)],
        ['Total Insentif Layanan', formatCurrency(income.totalIncentive || income.incentives || 0)]
    ];

    if (income.totalBonus > 0 || income.bonus > 0) {
        summaryData.push(['Bonus Tambahan', `+${formatCurrency(income.totalBonus || income.bonus)}`]);
    }
    if (income.totalDeduction > 0 || income.deduction > 0) {
        summaryData.push(['Potongan', `-${formatCurrency(income.totalDeduction || income.deduction)}`]);
    }

    // Total Bersih Row
    summaryData.push(['TOTAL BERSIH (Take Home Pay)', formatCurrency(income.netTotal)]);

    autoTable(doc, {
        startY: currentY,
        margin: { left: 20, right: 20 },
        head: [['Komponen Pendapatan', 'Jumlah']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [31, 41, 55], fontSize: 10, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
            0: { cellWidth: 120 },
            1: { cellWidth: 50, halign: 'right' }
        },
        didParseCell: function(data) {
            if (data.row.index === summaryData.length - 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 11;
                data.cell.styles.fillColor = [243, 244, 246];
                data.cell.styles.textColor = [17, 24, 39];
            }
        }
    });

    currentY = doc.lastAutoTable.finalY + 20;

    // Signatures
    if (currentY > 250) {
        doc.addPage();
        currentY = 20;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Tanda Tangan Terapis,', 45, currentY, { align: 'center' });
    doc.text('Manajer / Kasir,', 155, currentY, { align: 'center' });
    
    currentY += 25;
    
    doc.text(`( ${therapist.name} )`, 45, currentY, { align: 'center' });
    doc.text('( _________________ )', 155, currentY, { align: 'center' });

    // Return blob URL
    doc.autoPrint();
    const blob = doc.output('blob');
    const pdfBlobUrl = URL.createObjectURL(blob);
    try {
        window.open(pdfBlobUrl, '_blank');
    } catch (e) {
        console.error("Popup blocked", e);
    }
    return pdfBlobUrl;
};

/**
 * Generate Therapist Period Slip as a Blob URL for preview (Daily, Weekly, Monthly)
 */
export const generateTherapistPeriodSlipPDF = (therapist, periodDetails, branch, periodType, dateRangeStr) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const settings = getSystemSettings();
    const logo = getLogo();
    const companyName = settings.companyName || 'Zavera';
    const companyAddress = settings.companyAddress || 'Jl. Raya Malang, Jawa Timur';

    // Header layout
    let currentY = 15;
    
    // Add Logo if exists
    if (logo && logo.startsWith('data:image/')) {
        doc.addImage(logo, getLogoFormat(logo), 20, currentY, 24, 24);
        
        // Company details (right-aligned to the logo)
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(companyName, 48, currentY + 6);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        
        const splitAddress = doc.splitTextToSize(companyAddress, 140);
        doc.text(splitAddress, 48, currentY + 12);
        
        if (branch) {
            doc.text(`${branch.name} - ${branch.location || ''}`, 48, currentY + 12 + (splitAddress.length * 4.5));
        }
        currentY += 28 + (splitAddress.length * 4.5);
    } else {
        // Center aligned header when there is no logo
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(companyName, 105, currentY, { align: 'center' });
        currentY += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        
        const splitAddress = doc.splitTextToSize(companyAddress, 170);
        doc.text(splitAddress, 105, currentY, { align: 'center' });
        currentY += (splitAddress.length * 4.5) + 2;

        if (branch) {
            doc.text(`${branch.name} - ${branch.location || ''}`, 105, currentY, { align: 'center' });
            currentY += 6;
        }
        currentY += 4;
    }

    // Divider Line
    doc.setLineWidth(0.8);
    doc.setDrawColor(31, 41, 55); // Slate 800
    doc.line(20, currentY, 190, currentY);
    currentY += 10;

    // Document Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const slipTitle = `SLIP GAJI ${periodType.toUpperCase()}`;
    doc.text(slipTitle, 105, currentY, { align: 'center' });
    currentY += 10;

    // Therapist Details Block (Two-column layout)
    doc.setFontSize(10);
    
    // Left column
    doc.setFont('helvetica', 'bold');
    doc.text('Nama Terapis:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(therapist.name, 50, currentY);

    // Right column
    doc.setFont('helvetica', 'bold');
    doc.text('Tanggal Cetak:', 120, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(new Date(), 'medium'), 150, currentY);

    currentY += 6;

    // Left column row 2
    doc.setFont('helvetica', 'bold');
    doc.text('Cabang:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(branch ? branch.name : '-', 50, currentY);

    // Right column row 2
    doc.setFont('helvetica', 'bold');
    doc.text('Periode:', 120, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(dateRangeStr || '-', 150, currentY);

    currentY += 12;

    // Summary Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Rincian Pendapatan', 20, currentY);
    currentY += 5;

    const summaryData = [
        ['Gaji Pokok / Upah', formatCurrency(periodDetails.wage)],
        ['Total Insentif Layanan', formatCurrency(periodDetails.incentives)],
        ['Biaya Transportasi', formatCurrency(periodDetails.transport)]
    ];

    if (periodDetails.bonus > 0) {
        summaryData.push(['Bonus Tambahan', `+${formatCurrency(periodDetails.bonus)}`]);
    }
    if (periodDetails.deduction > 0) {
        summaryData.push(['Potongan', `-${formatCurrency(periodDetails.deduction)}`]);
    }

    // Total Bersih Row
    summaryData.push(['TOTAL BERSIH (Take Home Pay)', formatCurrency(periodDetails.netTotal)]);

    autoTable(doc, {
        startY: currentY,
        margin: { left: 20, right: 20 },
        head: [['Komponen Pendapatan', 'Jumlah']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [31, 41, 55], fontSize: 10, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
            0: { cellWidth: 120 },
            1: { cellWidth: 50, halign: 'right' }
        },
        didParseCell: function(data) {
            if (data.row.index === summaryData.length - 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 11;
                data.cell.styles.fillColor = [243, 244, 246];
                data.cell.styles.textColor = [17, 24, 39];
            }
        }
    });

    currentY = doc.lastAutoTable.finalY + 20;

    // Signatures
    if (currentY > 250) {
        doc.addPage();
        currentY = 20;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Tanda Tangan Terapis,', 45, currentY, { align: 'center' });
    doc.text('Manajer / Kasir,', 155, currentY, { align: 'center' });
    
    currentY += 25;
    
    doc.text(`( ${therapist.name} )`, 45, currentY, { align: 'center' });
    doc.text('( _________________ )', 155, currentY, { align: 'center' });

    // Return blob URL
    doc.autoPrint();
    const blob = doc.output('blob');
    const pdfBlobUrl = URL.createObjectURL(blob);
    try {
        window.open(pdfBlobUrl, '_blank');
    } catch (e) {
        console.error("Popup blocked", e);
    }
    return pdfBlobUrl;
};
