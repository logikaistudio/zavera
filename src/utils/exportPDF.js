import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate, formatTime, formatDuration } from './formatters';

/**
 * Export receipt for a booking
 */
export const exportReceipt = (booking, service, therapist, branch) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 200] // Thermal printer size
    });

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SPAcity', 40, 10, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(branch.name, 40, 16, { align: 'center' });
    doc.text(branch.location, 40, 21, { align: 'center' });

    // Divider
    doc.setLineWidth(0.5);
    doc.line(5, 25, 75, 25);

    // Receipt details
    doc.setFontSize(9);
    let y = 32;

    doc.text(`Tanggal: ${formatDate(booking.date, 'medium')}`, 5, y);
    y += 5;
    doc.text(`Jam: ${formatTime(booking.time)}`, 5, y);
    y += 5;
    doc.text(`No. Booking: ${booking.id}`, 5, y);
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
    doc.text(service.name, 5, y);
    y += 5;
    doc.text(`Durasi: ${formatDuration(service.durationMinutes)}`, 5, y);
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
    doc.text(formatCurrency(service.price), 75, y, { align: 'right' });

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

    // Save
    doc.save(`struk_${booking.id}_${booking.date}.pdf`);
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

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('SPAcity', 105, 15, { align: 'center' });

    doc.setFontSize(14);
    doc.text('Laporan Pendapatan', 105, 23, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periode: ${formatDate(startDate, 'medium')} - ${formatDate(endDate, 'medium')}`, 105, 30, { align: 'center' });
    doc.text(`Cabang: ${branchName}`, 105, 36, { align: 'center' });

    let yPos = 45;

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

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('SPAcity', 105, 15, { align: 'center' });

    doc.setFontSize(14);
    doc.text('Laporan Inventory', 105, 23, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tanggal: ${formatDate(new Date(), 'long')}`, 105, 30, { align: 'center' });

    let yPos = 40;

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
        format: 'a5'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SPAcity', pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (branch) {
        doc.text(branch.name, pageWidth / 2, 21, { align: 'center' });
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SLIP PENDAPATAN TERAPIS', pageWidth / 2, 30, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(10, 35, pageWidth - 10, 35);

    // Therapist Info
    let yPos = 45;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nama Terapis : ${therapist.name}`, 15, yPos);
    yPos += 6;
    doc.text(`Spesialisasi : ${therapist.specialization}`, 15, yPos);
    yPos += 6;
    doc.text(`Dicetak Pada : ${formatDate(new Date(), 'long')}`, 15, yPos);

    yPos += 10;
    
    // Detailed Services Breakdown
    if (income.serviceDetails && income.serviceDetails.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Rincian Layanan Dikerjakan:', 15, yPos);
        yPos += 8;

        const serviceData = income.serviceDetails.map(item => [
            `${item.serviceName} (x${item.count})`,
            formatCurrency(item.singleIncentive),
            formatCurrency(item.totalIncentive)
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['Layanan', 'Insentif/Item', 'Subtotal']],
            body: serviceData,
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129], fontSize: 9 }, // Emerald green
            styles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 55 },
                1: { cellWidth: 30, halign: 'right' },
                2: { cellWidth: 35, halign: 'right' }
            }
        });

        yPos = doc.lastAutoTable.finalY + 10;
    }
    
    // Income Breakdown
    doc.setFont('helvetica', 'bold');
    doc.text('Ringkasan Pendapatan:', 15, yPos);
    yPos += 8;

    const summaryData = [
        ['Gaji Pokok / Upah Tetap', formatCurrency(income.wage)],
        ['Total Insentif Layanan', formatCurrency(income.totalIncentive)],
        ['Total Bonus Tambahan', formatCurrency(income.totalBonus)],
        ['Total Potongan', `-${formatCurrency(income.totalDeduction)}`]
    ];

    autoTable(doc, {
        startY: yPos,
        head: [['Keterangan', 'Nominal']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241], fontSize: 10 },
        styles: { fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 40, halign: 'right' }
        }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // Total
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL DITERIMA', 15, yPos);
    doc.text(formatCurrency(income.netTotal), 15 + 80 + 40, yPos, { align: 'right' });

    yPos += 5;
    doc.setLineWidth(0.5);
    doc.line(10, yPos, pageWidth - 10, yPos);

    // Footer
    yPos += 20;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Mengetahui,', 30, yPos, { align: 'center' });
    doc.text('Penerima,', pageWidth - 30, yPos, { align: 'center' });

    yPos += 20;
    doc.text('(_________________)', 30, yPos, { align: 'center' });
    doc.text(`(${therapist.name})`, pageWidth - 30, yPos, { align: 'center' });

    return doc.output('bloburl');
};
