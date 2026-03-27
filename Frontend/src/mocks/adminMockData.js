const now = new Date();

const toIsoOffset = (minutes) => new Date(now.getTime() - minutes * 60 * 1000).toISOString();
const toBatchId = (daysAgo, seq) => {
    const d = new Date(now);
    d.setDate(now.getDate() - daysAgo);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `B${yyyy}${mm}${dd}-${String(seq).padStart(3, '0')}`;
};

export const MOCK_ADMIN_TIMELINE_EVENTS = [
    {
        id: 1,
        type: 'BATCH',
        message: `Batch ${toBatchId(0, 12)} created in CUTTING`,
        batchId: toBatchId(0, 12),
        timestamp: '12:01 PM'
    },
    {
        id: 2,
        type: 'STAGE',
        message: `Batch ${toBatchId(1, 84)} moved CUTTING -> STITCHING`,
        batchId: toBatchId(1, 84),
        timestamp: '11:45 AM'
    },
    {
        id: 3,
        type: 'QC',
        message: `Quality check completed for ${toBatchId(1, 77)}`,
        batchId: toBatchId(1, 77),
        timestamp: '11:30 AM',
        meta: 'Inspector: OP_QUA_02'
    },
    {
        id: 4,
        type: 'PROD',
        message: 'Operator OP_STI_03 logged 312 units',
        timestamp: '11:20 AM',
        meta: 'Stage: STITCHING'
    }
];

export const MOCK_ADMIN_STATS = {
    totalUsers: 43,
    managers: 12,
    activeBatches: 5,
    totalHistory: 200,
    activeBatchList: [
        { batchNumber: toBatchId(0, 12), briefTypeName: 'Standard Polo', currentStage: 'CUTTING', totalQuantity: 340, updatedAt: toIsoOffset(10) },
        { batchNumber: toBatchId(0, 17), briefTypeName: 'Executive Shirt', currentStage: 'STITCHING', totalQuantity: 275, updatedAt: toIsoOffset(24) },
        { batchNumber: toBatchId(1, 77), briefTypeName: 'Summer T-Shirt', currentStage: 'QUALITY_CHECK', totalQuantity: 410, updatedAt: toIsoOffset(38) },
        { batchNumber: toBatchId(1, 84), briefTypeName: 'Denim Jacket', currentStage: 'LABELING', totalQuantity: 190, updatedAt: toIsoOffset(56) },
        { batchNumber: toBatchId(1, 91), briefTypeName: 'Cotton Trousers', currentStage: 'FOLDING', totalQuantity: 240, updatedAt: toIsoOffset(74) }
    ],
    batchHistory: [
        { batchNumber: toBatchId(2, 96), briefTypeName: 'Standard Polo', currentStage: 'PACKING', totalQuantity: 320, updatedAt: toIsoOffset(260) },
        { batchNumber: toBatchId(3, 105), briefTypeName: 'Executive Shirt', currentStage: 'PACKING', totalQuantity: 290, updatedAt: toIsoOffset(540) },
        { batchNumber: toBatchId(4, 110), briefTypeName: 'Summer T-Shirt', currentStage: 'PACKING', totalQuantity: 365, updatedAt: toIsoOffset(820) },
        { batchNumber: toBatchId(5, 116), briefTypeName: 'Cotton Trousers', currentStage: 'PACKING', totalQuantity: 280, updatedAt: toIsoOffset(1200) },
        { batchNumber: toBatchId(6, 121), briefTypeName: 'Denim Jacket', currentStage: 'PACKING', totalQuantity: 210, updatedAt: toIsoOffset(1500) },
        { batchNumber: toBatchId(8, 137), briefTypeName: 'Standard Polo', currentStage: 'PACKING', totalQuantity: 334, updatedAt: toIsoOffset(2100) },
        { batchNumber: toBatchId(11, 146), briefTypeName: 'Executive Shirt', currentStage: 'PACKING', totalQuantity: 242, updatedAt: toIsoOffset(3000) },
        { batchNumber: toBatchId(14, 158), briefTypeName: 'Summer T-Shirt', currentStage: 'PACKING', totalQuantity: 406, updatedAt: toIsoOffset(3900) }
    ],
    pagination: {
        total: 200,
        page: 1,
        limit: 10,
        pages: 20
    }
};

export const MOCK_OPERATORS = [
    { id: 101, fullName: 'James Smith', employeeCode: 'OP_CUT_01' },
    { id: 102, fullName: 'Mary Johnson', employeeCode: 'OP_CUT_02' },
    { id: 103, fullName: 'Robert Brown', employeeCode: 'OP_STI_01' },
    { id: 104, fullName: 'Patricia Miller', employeeCode: 'OP_STI_03' },
    { id: 105, fullName: 'David Wilson', employeeCode: 'OP_QUA_02' },
    { id: 106, fullName: 'Linda Martinez', employeeCode: 'OP_LAB_04' },
    { id: 107, fullName: 'Thomas Anderson', employeeCode: 'OP_FOL_01' },
    { id: 108, fullName: 'Jessica Taylor', employeeCode: 'OP_PAC_05' }
];

export const MOCK_AI_REPORT = {
    executive_summary: 'The last 24 hours reflect stable plant throughput with quality leakage under control. STITCHING remains the dominant bottleneck and should be rebalanced before peak shifts.',
    summary: 'Operations are healthy with moderate risk concentration in STITCHING and QUALITY_CHECK.',
    kpis: {
        units_processed: 28740,
        defect_rate: 2.3,
        total_batches: 200,
        top_operator: 'OP_STI_03'
    },
    stage_efficiency: [
        { stage: 'CUTTING', avg_time: 23 },
        { stage: 'STITCHING', avg_time: 41 },
        { stage: 'QUALITY_CHECK', avg_time: 21 },
        { stage: 'LABELING', avg_time: 15 },
        { stage: 'FOLDING', avg_time: 13 },
        { stage: 'PACKING', avg_time: 14 }
    ],
    defect_distribution: [
        { defect: 'STITCH_FRAY', count: 28 },
        { defect: 'FABRIC_TEAR', count: 16 },
        { defect: 'COLOR_BLEED', count: 11 },
        { defect: 'SIZE_MISMATCH', count: 9 },
        { defect: 'BUTTON_MISSING', count: 6 }
    ],
    throughput_trend: [
        { label: 'D-6', value: 3490 },
        { label: 'D-5', value: 3620 },
        { label: 'D-4', value: 3550 },
        { label: 'D-3', value: 3710 },
        { label: 'D-2', value: 3840 },
        { label: 'D-1', value: 3920 },
        { label: 'Today', value: 4050 }
    ],
    bottleneck_heatmap: [
        { stage: 'CUTTING', delay_factor: 0.24 },
        { stage: 'STITCHING', delay_factor: 0.72 },
        { stage: 'QUALITY_CHECK', delay_factor: 0.36 },
        { stage: 'LABELING', delay_factor: 0.18 },
        { stage: 'FOLDING', delay_factor: 0.16 },
        { stage: 'PACKING', delay_factor: 0.21 }
    ],
    operator_efficiency: [
        { name: 'OP_STI_03', score: 96 },
        { name: 'OP_CUT_01', score: 93 },
        { name: 'OP_PAC_05', score: 91 },
        { name: 'OP_QUA_02', score: 89 }
    ],
    defect_root_causes: [
        { cause: 'Machine calibration drift', percentage: 41 },
        { cause: 'Operator handling variance', percentage: 27 },
        { cause: 'Material inconsistency', percentage: 19 },
        { cause: 'Line handoff delay', percentage: 13 }
    ],
    operational_analysis: 'Batch traversal across six stages is stable, but STITCHING cycle time exceeds target and creates queue buildup before QUALITY_CHECK in high-volume windows.',
    risk_assessment: 'Primary risk is throughput spillover from STITCHING to QUALITY_CHECK. Defect trend remains below 3%, but recurrent stitch fray signals preventive maintenance drift.',
    recommendations: 'Shift two operators from LABELING/FOLDING to STITCHING for peak windows, calibrate STI-M-01 and STI-M-02, and enforce hourly in-line checks for stitch integrity.'
};

export const MOCK_LATEST_DAILY_REPORT = {
    id: 9001,
    reportDate: now.toISOString(),
    summary: MOCK_AI_REPORT.executive_summary,
    metrics: MOCK_AI_REPORT,
    generatedAt: now.toISOString()
};

export const isFrontendMockMode = () => import.meta.env.VITE_USE_MOCK_DATA === 'true';
