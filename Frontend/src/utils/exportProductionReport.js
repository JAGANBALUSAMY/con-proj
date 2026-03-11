import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

// Diagnostic: Register and verify autoTable
const safeAutoTable = (doc, options) => {
    try {
        // Some versions of jspdf-autotable attach to doc.autoTable, others are standalone
        if (typeof doc.autoTable === 'function') {
            doc.autoTable(options);
        } else {
            autoTable(doc, options);
        }
    } catch (err) {
        console.error('AutoTable failed:', err);
        throw new Error('Table generation failed');
    }
};

/**
 * Capture a Recharts or DOM element as a high-quality base64 image
 */
const captureChart = async (ref) => {
    if (!ref || !ref.current) return null;
    try {
        console.log("Capturing chart...", ref.current);
        const canvas = await html2canvas(ref.current, {
            scale: 2, // Increased scale for premium quality
            useCORS: true,
            logging: false, // Cleaner logs
            backgroundColor: '#ffffff',
            allowTaint: true
        });
        return canvas.toDataURL("image/png");
    } catch (err) {
        console.warn("Failed to capture chart:", err);
        return null;
    }
};

/**
 * Generate a professional industrial production intelligence report
 */
export const generateProductionReportPDF = async (report, chartRefs) => {
    try {
        console.log("PDF Generation Started...");
        // 1. Cooling delay: Allow Recharts animations and layout shifts to stabilize
        await new Promise(resolve => setTimeout(resolve, 1000));

        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let yPos = 25;

        // Helper to add text blocks
        const addSection = (title, text, color = [30, 41, 59]) => {
            if (!text) return;

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(color[0], color[1], color[2]);
            doc.text(title, margin, yPos);
            yPos += 7;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            const lines = doc.splitTextToSize(text, pageWidth - (margin * 2));
            doc.text(lines, margin, yPos);
            yPos += lines.length * 5 + 10;

            if (yPos > 270) {
                doc.addPage();
                yPos = 25;
            }
        };

        // 1. Title
        console.log("Adding report title...");
        doc.setFontSize(24);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text('Production Intelligence Report', margin, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPos);
        yPos += 15;

        // 2. Executive Summary
        addSection('Executive Summary', report.executive_summary || report.metrics?.executive_summary || report.summary);

        // 3. KPI Table
        console.log("Generating KPI table...");
        const kpis = report.kpis || report.metrics?.kpis || {};
        const kpiData = [
            ['Metric', 'Current Value'],
            ['Units Processed', (kpis.units_processed || 0).toLocaleString()],
            ['Global Defect Rate', `${(kpis.defect_rate || 0).toFixed(2)}%`],
            ['Total Batch Volume', (kpis.total_batches || 0).toString()],
            ['Leading Operator', kpis.top_operator || 'N/A']
        ];

        safeAutoTable(doc, {
            startY: yPos,
            head: [kpiData[0]],
            body: kpiData.slice(1),
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] },
            margin: { left: margin, right: margin }
        });
        yPos = doc.lastAutoTable?.finalY || (yPos + 40);

        // 4. Charts - Captured from UI Refs
        const addChartToPDF = async (title, ref) => {
            if (!ref?.current) {
                console.warn(`Ref for ${title} is missing or not rendered.`);
                return;
            }

            console.log(`Capturing chart: ${title}`);
            if (yPos > 210) {
                doc.addPage();
                yPos = 25;
            }

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text(title, margin, yPos);
            yPos += 5;

            const imgData = await captureChart(ref);
            if (imgData) {
                doc.addImage(imgData, 'PNG', margin, yPos, 170, 70);
                yPos += 80;
            } else {
                console.error(`Failed to capture ${title}`);
                doc.setFontSize(10);
                doc.setTextColor(239, 68, 68);
                doc.text(`[${title} capture failed - ensure chart is visible]`, margin, yPos + 10);
                yPos += 20;
            }
        };

        await addChartToPDF('Stage Efficiency (Average Time)', chartRefs.efficiency);
        await addChartToPDF('Defect Distribution', chartRefs.defects);
        await addChartToPDF('7-Day Consumption Velocity', chartRefs.trend);
        
        // V9 Advanced Analytics
        await addChartToPDF('Factory Throughput Trend', chartRefs.throughput);
        await addChartToPDF('Stage Bottleneck Heatmap', chartRefs.bottleneck);
        await addChartToPDF('Operator Efficiency Ranking', chartRefs.efficiencyRanking);
        await addChartToPDF('Defect Root Cause Analysis', chartRefs.rootCause);

        // Ensure we start a new page for long analysis if needed
        if (yPos > 200) {
            doc.addPage();
            yPos = 25;
        }

        // 5. Analytical Sections
        console.log("Adding analytical sections...");
        addSection('Operational Analysis', report.operational_analysis || report.metrics?.operational_analysis);
        addSection('Risk Assessment', report.risk_assessment || report.metrics?.risk_assessment, [239, 68, 68]);
        addSection('Strategic Recommendations', report.recommendations || report.metrics?.recommendations, [16, 185, 129]);

        // Save with timestamped name
        console.log("Saving PDF...");
        const dateStr = new Date().toISOString().split('T')[0];
        doc.save(`Production_Report_${dateStr}.pdf`);
        window.alert('✅ Industrial Report Generated Successfully! Please check your downloads folder.');
    } catch (err) {
        console.error("CRITICAL PDF ERROR:", err);
        window.alert(`PDF Generation Failed: ${err.message}. Check console for details.`);
    }
};
