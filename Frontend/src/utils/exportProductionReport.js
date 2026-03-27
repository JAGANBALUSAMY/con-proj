import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

const safeAutoTable = (doc, options) => {
    try {
        // Some versions of jspdf-autotable attach to doc.autoTable, others are standalone
        if (typeof doc.autoTable === 'function') {
            doc.autoTable(options);
        } else {
            autoTable(doc, options);
        }
        return true;
    } catch (err) {
        console.warn('AutoTable failed, falling back to plain text table:', err);
        return false;
    }
};

/**
 * Capture a Recharts or DOM element as a high-quality base64 image
 */
const captureChart = async (ref) => {
    if (!ref || !ref.current) return null;
    try {
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
        // Allow chart layouts to settle before screenshot capture.
        await new Promise(resolve => setTimeout(resolve, 350));

        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);
        let yPos = 25;

        const ensureSpace = (requiredHeight = 12) => {
            if (yPos + requiredHeight > 280) {
                doc.addPage();
                yPos = 25;
            }
        };

        const normalizeSeries = (arr, labelKey, valueKey) => {
            if (!Array.isArray(arr)) return [];
            return arr
                .map((item) => ({
                    label: String(item?.[labelKey] ?? 'N/A'),
                    value: Number(item?.[valueKey] ?? 0)
                }))
                .filter((item) => Number.isFinite(item.value) && item.value >= 0)
                .slice(0, 6);
        };

        const drawBarChartFallback = (series, color = [59, 130, 246]) => {
            ensureSpace(80);

            if (!series.length) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(148, 163, 184);
                doc.text('No chart data available for this section.', margin, yPos);
                yPos += 12;
                return;
            }

            const chartX = margin;
            const chartY = yPos;
            const chartW = contentWidth;
            const maxValue = Math.max(...series.map((s) => s.value), 1);
            const rowHeight = 10;

            series.forEach((point, index) => {
                const rowY = chartY + (index * rowHeight);
                const barX = chartX + 42;
                const barW = ((chartW - 65) * point.value) / maxValue;

                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(71, 85, 105);
                doc.text(point.label.slice(0, 16), chartX, rowY + 6);

                doc.setFillColor(241, 245, 249);
                doc.rect(barX, rowY + 1.8, chartW - 65, 4.8, 'F');

                doc.setFillColor(color[0], color[1], color[2]);
                doc.rect(barX, rowY + 1.8, Math.max(barW, 1), 4.8, 'F');

                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(30, 41, 59);
                doc.text(String(Math.round(point.value * 100) / 100), chartX + chartW - 20, rowY + 6);
            });

            yPos += (series.length * rowHeight) + 10;
        };

        // Helper to add text blocks
        const addSection = (title, text, color = [30, 41, 59]) => {
            if (!text) return;

            const lines = doc.splitTextToSize(text, contentWidth);
            const estimatedHeight = 7 + (lines.length * 5) + 10;
            ensureSpace(estimatedHeight + 4);

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(color[0], color[1], color[2]);
            doc.text(title, margin, yPos);
            yPos += 7;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(lines, margin, yPos);
            yPos += lines.length * 5 + 10;
        };

        // 1. Title
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
        const kpis = report.kpis || report.metrics?.kpis || {};
        const kpiData = [
            ['Metric', 'Current Value'],
            ['Units Processed', (kpis.units_processed || 0).toLocaleString()],
            ['Global Defect Rate', `${(kpis.defect_rate || 0).toFixed(2)}%`],
            ['Total Batch Volume', (kpis.total_batches || 0).toString()],
            ['Leading Operator', kpis.top_operator || 'N/A']
        ];

        ensureSpace(40);

        const usedAutoTable = safeAutoTable(doc, {
            startY: yPos,
            head: [kpiData[0]],
            body: kpiData.slice(1),
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] },
            margin: { left: margin, right: margin }
        });

        if (usedAutoTable) {
            yPos = (doc.lastAutoTable?.finalY || (yPos + 40)) + 8;
        } else {
            // Plain-text fallback ensures export still succeeds when table plugin mismatches.
            doc.setFontSize(11);
            doc.setTextColor(30, 41, 59);
            doc.setFont('helvetica', 'bold');
            doc.text('KPI Snapshot', margin, yPos);
            yPos += 7;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            kpiData.slice(1).forEach(([label, value]) => {
                doc.text(`${label}: ${value}`, margin, yPos);
                yPos += 6;
            });
            yPos += 8;
        }

        // 4. Charts - Captured from UI Refs
        const addChartToPDF = async (title, ref, fallbackSeries, labelKey, valueKey, color) => {
            ensureSpace(88);

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text(title, margin, yPos);
            yPos += 5;

            const imgData = await captureChart(ref);
            if (imgData) {
                doc.addImage(imgData, 'PNG', margin, yPos, contentWidth, 70);
                yPos += 80;
            } else {
                const normalized = normalizeSeries(fallbackSeries, labelKey, valueKey);
                drawBarChartFallback(normalized, color);
            }
        };

        await addChartToPDF(
            'Stage Efficiency (Average Time)',
            chartRefs.efficiency,
            report.stage_efficiency || report.metrics?.stage_efficiency,
            'stage',
            'avg_time',
            [59, 130, 246]
        );
        await addChartToPDF(
            'Defect Distribution',
            chartRefs.defects,
            report.defect_distribution || report.metrics?.defect_distribution,
            'defect',
            'count',
            [245, 158, 11]
        );
        await addChartToPDF(
            '7-Day Consumption Velocity',
            chartRefs.trend,
            report.throughput_trend || report.metrics?.throughput_trend,
            'label',
            'value',
            [16, 185, 129]
        );
        
        // V9 Advanced Analytics
        await addChartToPDF(
            'Factory Throughput Trend',
            chartRefs.throughput,
            report.throughput_trend || report.metrics?.throughput_trend,
            'label',
            'value',
            [37, 99, 235]
        );
        await addChartToPDF(
            'Stage Bottleneck Heatmap',
            chartRefs.bottleneck,
            report.bottleneck_heatmap || report.metrics?.bottleneck_heatmap,
            'stage',
            'delay_factor',
            [239, 68, 68]
        );
        await addChartToPDF(
            'Operator Efficiency Ranking',
            chartRefs.efficiencyRanking,
            report.operator_efficiency || report.metrics?.operator_efficiency,
            'name',
            'score',
            [16, 185, 129]
        );
        await addChartToPDF(
            'Defect Root Cause Analysis',
            chartRefs.rootCause,
            report.defect_root_causes || report.metrics?.defect_root_causes,
            'cause',
            'percentage',
            [124, 58, 237]
        );

        // Ensure we start a new page for long analysis if needed
        ensureSpace(40);

        // 5. Analytical Sections
        addSection('Operational Analysis', report.operational_analysis || report.metrics?.operational_analysis);
        addSection('Risk Assessment', report.risk_assessment || report.metrics?.risk_assessment, [239, 68, 68]);
        addSection('Strategic Recommendations', report.recommendations || report.metrics?.recommendations, [16, 185, 129]);

        // Save with timestamped name
        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `Production_Report_${dateStr}.pdf`;

        try {
            const blob = doc.output('blob');
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 3000);
        } catch (downloadError) {
            console.warn('Blob download failed, falling back to doc.save():', downloadError);
            doc.save(fileName);
        }

        return true;
    } catch (err) {
        console.error("CRITICAL PDF ERROR:", err);
        throw err;
    }
};
