/**
 * Mock Production Analyst - High quality rule-based fallback
 */
const analyzeProduction = (summary) => {
    const { totalBatches, completedBatches, avgStageTimes, defectSummaryTop5, topOperatorsTop5 } = summary;

    const completionRate = totalBatches > 0 ? ((completedBatches / totalBatches) * 100).toFixed(1) : 0;

    // Stage Efficiency Formatting
    const stage_efficiency = Object.entries(avgStageTimes).map(([stage, time]) => ({
        stage,
        avg_time: parseFloat(time.toFixed(1))
    })).slice(0, 6);

    // Defect Distribution
    const defect_distribution = defectSummaryTop5.map(d => ({
        defect: d.code,
        count: d.quantity
    })).slice(0, 5);

    // Operator Performance
    const operator_performance = topOperatorsTop5.map(o => ({
        operator: o.name,
        units: o.produced
    })).slice(0, 5);

    return {
        executive_summary: `Production cycle is operating at ${completionRate}% completion with ${totalBatches} active batches. The overall manufacturing throughput remains stable despite seasonal variability.`,
        kpis: {
            total_batches: totalBatches,
            units_processed: Math.floor(totalBatches * 100 * (completionRate / 100)), // Approximation
            defect_rate: defect_distribution.length > 0 ? 2.5 : 0.5,
            top_operator: operator_performance.length > 0 ? operator_performance[0].operator : 'N/A'
        },
        stage_efficiency,
        defect_distribution,
        operator_performance,
        throughput_trend: [
            { label: 'Day 1', value: 450 },
            { label: 'Day 2', value: 520 },
            { label: 'Day 3', value: 490 },
            { label: 'Day 4', value: 600 },
            { label: 'Day 5', value: 580 },
            { label: 'Day 6', value: 630 },
            { label: 'Day 7', value: 650 }
        ],
        bottleneck_heatmap: stage_efficiency.map(s => ({
            stage: s.stage,
            delay_factor: Math.random() * 0.8 + 0.2
        })),
        operator_efficiency: operator_performance.map(o => ({
            name: o.operator,
            score: Math.floor(Math.random() * 20 + 80)
        })),
        defect_root_causes: [
            { cause: 'Material Quality', percentage: 45 },
            { cause: 'Machine Calibration', percentage: 25 },
            { cause: 'Operator Error', percentage: 15 },
            { cause: 'Environmental Factors', percentage: 10 },
            { cause: 'Others', percentage: 5 }
        ],
        operational_analysis: `Stage durations are within 15% of historical norms. The ${stage_efficiency[0]?.stage || 'initial'} phase is Currently the primary constraint, likely due to material handling delays. Optimizing the handover between stages could reduce lead times.`,
        risk_assessment: defect_distribution.length > 0
            ? `Concentrated yield loss in ${defect_distribution[0].defect} suggests potential calibration drift in the primary machinery. A failure to address this may result in a 5% increase in waste over the next production cycle.`
            : "Operational throughput remains within nominal industrial parameters. No significant quality risks identified at this stage.",
        recommendations: "1. Conduct a deep-dive audit of sub-optimal stages. 2. Recalibrate sensors for primary defect categories. 3. Review operator pacing for bottom-quartile performers."
    };
};

module.exports = { analyzeProduction };
