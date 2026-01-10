// src/lib/pdf.ts - ENHANCED with Analytics Report
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from './utils';
import { AnalyticsService } from './analytics';
import type { Customer, Payment } from '@/types';

export const PDFService = {
    /**
     * Generate payment receipt
     */
    generateReceipt: (customer: Customer, payment: Payment, profileName: string) => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Receipt', 105, 20, { align: 'center' });

        // Profile name
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(profileName, 105, 30, { align: 'center' });

        // Line separator
        doc.setLineWidth(0.5);
        doc.line(20, 35, 190, 35);

        // Customer details
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Customer Information:', 20, 45);
        doc.setFont('helvetica', 'normal');
        doc.text(`Name: ${customer.name}`, 20, 52);
        doc.text(`Phone: ${customer.phone}`, 20, 59);
        if (customer.address) {
            doc.text(`Address: ${customer.address}`, 20, 66);
        }

        // Payment details
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Details:', 20, 80);
        doc.setFont('helvetica', 'normal');
        doc.text(`Receipt Date: ${formatDate(new Date().toISOString())}`, 20, 87);
        doc.text(`Payment Date: ${formatDate(payment.date)}`, 20, 94);
        doc.text(`Amount Paid: ${formatCurrency(payment.amount)}`, 20, 101);

        // Account summary
        const remaining = customer.totalAmount - customer.paidAmount;
        doc.setFont('helvetica', 'bold');
        doc.text('Account Summary:', 20, 115);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Amount: ${formatCurrency(customer.totalAmount)}`, 20, 122);
        doc.text(`Amount Paid: ${formatCurrency(customer.paidAmount)}`, 20, 129);
        doc.text(`Remaining: ${formatCurrency(remaining)}`, 20, 136);

        // Footer
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text('Thank you for your payment!', 105, 270, { align: 'center' });
        doc.text('MA Installment Management System', 105, 275, { align: 'center' });

        // Save
        doc.save(`receipt-${customer.name}-${payment.date}.pdf`);
    },

    /**
     * Generate customer statement
     */
    generateStatement: (customer: Customer, payments: Payment[], profileName: string) => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Customer Statement', 105, 20, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(profileName, 105, 28, { align: 'center' });
        doc.text(`Generated on: ${formatDate(new Date().toISOString())}`, 105, 35, { align: 'center' });

        // Customer info
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Customer Information:', 20, 50);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Name: ${customer.name}`, 20, 57);
        doc.text(`Phone: ${customer.phone}`, 20, 63);
        if (customer.cnic) {
            doc.text(`CNIC: ${customer.cnic}`, 20, 69);
        }

        // Account summary
        const remaining = customer.totalAmount - customer.paidAmount;
        const progress = Math.round((customer.paidAmount / customer.totalAmount) * 100);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Account Summary:', 20, 82);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Total Amount: ${formatCurrency(customer.totalAmount)}`, 20, 89);
        doc.text(`Paid Amount: ${formatCurrency(customer.paidAmount)}`, 20, 95);
        doc.text(`Remaining: ${formatCurrency(remaining)}`, 20, 101);
        doc.text(`Progress: ${progress}%`, 20, 107);
        doc.text(`Installment: ${formatCurrency(customer.installmentAmount)} (${customer.frequency})`, 20, 113);

        // Payment history table
        const tableData = payments.map(p => [
            formatDate(p.date),
            formatCurrency(p.amount),
            '-'
        ]);

        autoTable(doc, {
            startY: 125,
            head: [['Date', 'Amount', 'Notes']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 9 },
        });

        // Footer
        const finalY = (doc as any).lastAutoTable.finalY || 200;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text('MA Installment Management System', 105, finalY + 15, { align: 'center' });

        doc.save(`statement-${customer.name}-${new Date().toISOString().split('T')[0]}.pdf`);
    },

    /**
     * Generate monthly report
     */
    generateMonthlyReport: (
        customers: Customer[],
        payments: Payment[],
        month: string,
        profileName: string
    ) => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Monthly Report', 105, 20, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(profileName, 105, 28, { align: 'center' });
        doc.text(`Period: ${month}`, 105, 35, { align: 'center' });

        // Summary stats
        const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
        const totalExpected = customers.reduce((sum, c) => sum + c.totalAmount, 0);
        const totalPaid = customers.reduce((sum, c) => sum + c.paidAmount, 0);
        const pending = totalExpected - totalPaid;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Summary:', 20, 50);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Total Customers: ${customers.length}`, 20, 57);
        doc.text(`Payments This Month: ${payments.length}`, 20, 63);
        doc.text(`Amount Received: ${formatCurrency(totalReceived)}`, 20, 69);
        doc.text(`Total Outstanding: ${formatCurrency(pending)}`, 20, 75);

        // Payments table
        const tableData = payments.map(p => {
            const customer = customers.find(c => c.id === p.customerId);
            return [
                formatDate(p.date),
                customer?.name || 'Unknown',
                formatCurrency(p.amount),
            ];
        });

        autoTable(doc, {
            startY: 85,
            head: [['Date', 'Customer', 'Amount']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 9 },
            foot: [[
                'Total',
                `${payments.length} payments`,
                formatCurrency(totalReceived)
            ]],
            footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
        });

        // Footer
        const finalY = (doc as any).lastAutoTable.finalY || 200;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text('MA Installment Management System', 105, finalY + 15, { align: 'center' });

        doc.save(`monthly-report-${month}.pdf`);
    },

    /**
     * Generate yearly report
     */
    generateYearlyReport: (
        customers: Customer[],
        allPayments: Payment[],
        year: string,
        profileName: string
    ) => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Yearly Report', 105, 20, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(profileName, 105, 28, { align: 'center' });
        doc.text(`Year: ${year}`, 105, 35, { align: 'center' });

        // Calculate monthly breakdown
        const monthlyData: { [key: string]: number } = {};
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        allPayments.forEach(p => {
            const date = new Date(p.date);
            const monthKey = months[date.getMonth()];
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + p.amount;
        });

        // Summary
        const totalReceived = allPayments.reduce((sum, p) => sum + p.amount, 0);
        const avgMonthly = totalReceived / 12;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Annual Summary:', 20, 50);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Total Customers: ${customers.length}`, 20, 57);
        doc.text(`Total Payments: ${allPayments.length}`, 20, 63);
        doc.text(`Total Received: ${formatCurrency(totalReceived)}`, 20, 69);
        doc.text(`Average Monthly: ${formatCurrency(avgMonthly)}`, 20, 75);

        // Monthly breakdown table
        const tableData = months.map(month => [
            month,
            formatCurrency(monthlyData[month] || 0)
        ]);

        autoTable(doc, {
            startY: 85,
            head: [['Month', 'Amount Received']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 9 },
            foot: [['Total', formatCurrency(totalReceived)]],
            footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
        });

        // Footer
        const finalY = (doc as any).lastAutoTable.finalY || 200;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text('MA Installment Management System', 105, finalY + 15, { align: 'center' });

        doc.save(`yearly-report-${year}.pdf`);
    },

    /**
     * 🆕 Generate Analytics Report (NEW)
     */
    generateAnalyticsReport: (
        customers: Customer[],
        payments: Payment[],
        profileName: string
    ) => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Analytics Report', 105, 20, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(profileName, 105, 28, { align: 'center' });
        doc.text(`Generated: ${formatDate(new Date().toISOString())}`, 105, 35, { align: 'center' });

        doc.setLineWidth(0.5);
        doc.line(20, 40, 190, 40);

        // Key Metrics
        const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
        const collectionRate = AnalyticsService.getCollectionRate(customers);
        const overdueStats = AnalyticsService.getOverdueStats(customers);
        const topCustomers = AnalyticsService.getTopCustomers(customers, 5);

        let yPos = 50;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Key Performance Indicators', 20, yPos);
        yPos += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Revenue: ${formatCurrency(totalRevenue)}`, 20, yPos);
        yPos += 6;
        doc.text(`Total Customers: ${customers.length}`, 20, yPos);
        yPos += 6;
        doc.text(`Active Customers: ${customers.filter(c => c.status === 'active').length}`, 20, yPos);
        yPos += 6;
        doc.text(`Collection Rate: ${collectionRate}%`, 20, yPos);
        yPos += 6;
        doc.text(`Overdue Customers: ${overdueStats.count} (${formatCurrency(overdueStats.amount)})`, 20, yPos);
        yPos += 15;

        // Top Customers Table
        doc.setFont('helvetica', 'bold');
        doc.text('Top 5 Customers', 20, yPos);
        yPos += 5;

        const topCustomersData = topCustomers.map((c, i) => [
            `#${i + 1}`,
            c.name,
            formatCurrency(c.paidAmount),
            `${Math.round((c.paidAmount / c.totalAmount) * 100)}%`
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['Rank', 'Customer', 'Paid Amount', 'Progress']],
            body: topCustomersData,
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 9 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;

        // Payment Frequency Distribution
        const frequencyData = AnalyticsService.getCollectionByFrequency(customers);
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Frequency Distribution', 20, yPos);
        yPos += 5;

        const freqTableData = frequencyData.map(f => [
            f.frequency,
            f.count.toString(),
            formatCurrency(f.amount)
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['Frequency', 'Customers', 'Total Amount']],
            body: freqTableData,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] },
            styles: { fontSize: 9 },
        });

        // Footer
        const finalY = (doc as any).lastAutoTable.finalY || 250;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text('MA Installment Management System - Analytics Report', 105, finalY + 15, { align: 'center' });

        doc.save(`analytics-report-${new Date().toISOString().split('T')[0]}.pdf`);
    }
};