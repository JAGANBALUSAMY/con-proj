const prisma = require('../utils/prisma');
const socketUtil = require('../utils/socket');

/**
 * Create Rework Log (Operator only, REWORK section)
 *
 * Constraints enforced:
 * - Constraint 14: Rework applies ONLY to defectiveQuantity
 * - Constraint 14: Rework stage must be CUTTING or STITCHING
 * - Constraint 14: Batch stage must NOT change
 * - Constraint 12: Approval required (status = PENDING)
 * - Constraint 4:  Quantity integrity (cured + scrapped = total reworked)
 *
 * CRITICAL:
 * - This function does NOT mutate batch quantities.
 * - Mutation happens ONLY on approval.
 */
const createReworkLog = async (req, res) => {
    try {
        const operatorId = req.user.userId;
        const {
            batchId,
            reworkStage,    // CUTTING or STITCHING
            quantity,       // Total units reworked
            curedQuantity,
            scrappedQuantity,
            startTime,
            endTime
        } = req.body;

        // ── 1. Validate required fields ──────────────────────────────────────
        if (!batchId || !reworkStage || quantity == null || curedQuantity == null || scrappedQuantity == null) {
            return res.status(400).json({
                error: 'batchId, reworkStage, quantity, curedQuantity, and scrappedQuantity are required'
            });
        }

        const qty = parseInt(quantity);
        const cured = parseInt(curedQuantity);
        const scrapped = parseInt(scrappedQuantity);

        if (qty <= 0) {
            return res.status(400).json({ error: 'Rework quantity must be greater than 0' });
        }

        // ── 2. Validate Rework Logic ─────────────────────────────────────────
        if (cured + scrapped !== qty) {
            return res.status(400).json({
                error: `Sum of cured (${cured}) and scrapped (${scrapped}) must equal total reworked quantity (${qty})`
            });
        }

        const validReworkStages = ['CUTTING', 'STITCHING'];
        if (!validReworkStages.includes(reworkStage)) {
            return res.status(400).json({
                error: `Invalid reworkStage: ${reworkStage}. Must be CUTTING or STITCHING.`
            });
        }

        if (new Date(endTime) < new Date(startTime)) {
            return res.status(400).json({ error: 'endTime must be greater than or equal to startTime' });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        // Operator Overlap Check (ProductionLogs)
        const prodOverlap = await prisma.productionLog.findFirst({
            where: {
                operatorUserId: operatorId,
                AND: [
                    { startTime: { lt: end } },
                    { endTime: { gt: start } }
                ]
            }
        });
        if (prodOverlap) {
            return res.status(400).json({ error: `Operator overlap: You have a production log (#${prodOverlap.id}) during this time period.` });
        }

        // Operator Overlap Check (ReworkRecords)
        const reworkOverlap = await prisma.reworkRecord.findFirst({
            where: {
                operatorUserId: operatorId,
                AND: [
                    { startTime: { lt: end } },
                    { endTime: { gt: start } }
                ]
            }
        });
        if (reworkOverlap) {
            return res.status(400).json({ error: `Operator overlap: You have a rework log (#${reworkOverlap.id}) during this time period.` });
        }

        // ── 3. Fetch Operator & Verify ───────────────────────────────────────
        const operator = await prisma.user.findUnique({
            where: { id: operatorId },
            include: { sectionAssignments: true }
        });

        if (operator.role !== 'OPERATOR' || operator.verificationStatus !== 'VERIFIED') {
            return res.status(403).json({ error: 'Only VERIFIED operators can log rework' });
        }

        const operatorSections = operator.sectionAssignments.map(sa => sa.stage);
        if (!operatorSections.includes(reworkStage)) {
            return res.status(403).json({
                error: `Access denied: You are not assigned to the ${reworkStage} section. Rework must be performed by the origin section.`,
                yourSections: operatorSections
            });
        }

        // ── 4. Fetch Batch & Validate ────────────────────────────────────────
        const batch = await prisma.batch.findUnique({
            where: { id: parseInt(batchId) },
            include: {
                defectRecords: {
                    where: { stage: reworkStage }
                },
                reworkRecords: {
                    where: {
                        reworkStage: reworkStage,
                        approvalStatus: 'PENDING'
                    }
                }
            }
        });

        if (!batch) return res.status(404).json({ error: 'Batch not found' });

        if (batch.status === 'COMPLETED' || batch.status === 'CANCELLED') {
            return res.status(400).json({ error: `Cannot log rework for a ${batch.status} batch.` });
        }

        // Logic Hole #1 Fix: Defect Origin Consistency
        // Sum total defects recorded for this reworkStage
        const totalDefectsForStage = batch.defectRecords.reduce((sum, d) => sum + d.quantity, 0);

        if (totalDefectsForStage < qty) {
            return res.status(400).json({
                error: `Defect Origin Mismatch: Only ${totalDefectsForStage} defects were recorded for ${reworkStage}. Cannot rework ${qty} units.`,
                recordedDefects: totalDefectsForStage
            });
        }

        // Logic Hole #2 Fix: Double Rework Guard (Pending Overlap)
        const pendingReworkForStage = batch.reworkRecords.reduce((sum, r) => sum + r.quantity, 0);
        const availableDefectiveForStage = totalDefectsForStage - pendingReworkForStage;

        if (qty > availableDefectiveForStage) {
            return res.status(400).json({
                error: `Double Rework Guard: ${qty} units requested, but only ${availableDefectiveForStage} units are available for rework after accounting for pending logs.`,
                availableForRework: availableDefectiveForStage,
                pendingAlready: pendingReworkForStage
            });
        }

        // ── 5. Create ReworkRecord (NO BATCH MUTATION) ───────────────────────
        // We need to fetch a manager to assign as 'managedByUserId'.
        // Rework is managed by the section manager of the *reworkStage* (target).
        // For now, let's leave managedByUserId as the operator's owner or null?
        // Schema says `managedByUserId` is required.
        // Let's use the operator's creator for now, as they are the owning manager.
        // The approval logic will verify the *approver's* section assignment.

        const reworkRecord = await prisma.reworkRecord.create({
            data: {
                batchId: parseInt(batchId),
                operatorUserId: operatorId,
                managedByUserId: operator.createdByUserId, // Default to owner
                reworkStage: reworkStage,
                quantity: qty,
                curedQuantity: cured,
                scrappedQuantity: scrapped,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                status: 'PENDING',
                approvalStatus: 'PENDING'
            },
            include: {
                batch: { select: { batchNumber: true } },
                operator: { select: { fullName: true } }
            }
        });

        // ── 6. Emit Event ────────────────────────────────────────────────────
        socketUtil.emitEvent('approval:updated', reworkRecord);

        return res.status(201).json({
            message: 'Rework log created successfully. Awaiting manager approval.',
            rework: reworkRecord
        });

    } catch (error) {
        console.error('Create rework log error:', error);
        return res.status(500).json({ error: 'Failed to create rework log' });
    }
};

module.exports = { createReworkLog };
