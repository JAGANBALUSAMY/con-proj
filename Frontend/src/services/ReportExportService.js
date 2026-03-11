import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

/**
 * Capture a DOM element as a high-quality base64 image
 */
const captureElement = async (element) => {
    if (!element) return null;
    const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
    });
    return canvas.toDataURL('image/png');
};

/**
 * Generate a professional Production Intelligence PDF
 */
export const exportReportToPDF = async (report, chartRefs) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 20;

    // Safety check for metrics
    const metrics = report.metrics || {};
    const kpis = metrics.kpis || {};

    // 1. Header
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text('Production Intelligence Report', margin, yPos);

    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, yPos);
    doc.text(`Report Date: ${report.reportDate ? new Date(report.reportDate).toLocaleDateString() : 'N/A'}`, pageWidth - margin - 50, yPos);

    yPos += 10;
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.line(margin, yPos, pageWidth - margin, yPos);

    // 2. Executive Summary
    yPos += 15;
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Executive Summary', margin, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // Slate-600
    const summaryText = metrics.summary || report.summary || "No summary available.";
    const summaryLines = doc.splitTextToSize(summaryText, pageWidth - (margin * 2));
    doc.text(summaryLines, margin, yPos);
    yPos += summaryLines.length * 5 + 5;

    // 3. KPIs Table
    const kpiData = [
        ['Metric', 'Value'],
        ['Total Batches', (kpis.total_batches || 0).toString()],
        ['Units Processed', (kpis.units_processed || 0).toString()],
        ['Defect Rate', (kpis.defect_rate || 0).toFixed(1) + '%'],
        ['Top Performer', kpis.top_operator || 'N/A']
    ];

    autoTable(doc, {
        startY: yPos,
        head: [kpiData[0]],
        body: kpiData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }, // Primary-500
        margin: { left: margin, right: margin }
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // 4. Charts - Capture Ref Elements
    const renderChartSection = async (title, ref) => {
        if (!ref || !ref.current) return;

        if (yPos > 220) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text(title, margin, yPos);
        yPos += 5;

        try {
            const imgData = await captureElement(ref.current);
            if (imgData) {
                doc.addImage(imgData, 'PNG', margin, yPos, 180, 70);
                yPos += 75;
            }
        } catch (err) {
            console.error(`Failed to capture chart: ${title}`, err);
            doc.setFontSize(10);
            doc.setTextColor(239, 68, 68);
            doc.text('[Chart Capture Failed]', margin, yPos + 10);
            yPos += 20;
        }
    };

    if (chartRefs.efficiency) await renderChartSection('Stage Efficiency', chartRefs.efficiency);
    if (chartRefs.defects) await renderChartSection('Defect Distribution', chartRefs.defects);
    if (chartRefs.performance) await renderChartSection('Operator Performance', chartRefs.performance);

    // 5. Strategic Insight
    const insightText = metrics.insight || "No specific strategic insight generated for this period.";

    if (yPos > 240) {
        doc.addPage();
        yPos = 20;
    }

    yPos += 10;
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.rect(margin, yPos, pageWidth - (margin * 2), 25, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Strategic Insight:', margin + 5, yPos + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    const insightLines = doc.splitTextToSize(insightText, pageWidth - (margin * 2) - 10);
    doc.text(insightLines, margin + 5, yPos + 15);

    // Save
    doc.save(`Production_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};
