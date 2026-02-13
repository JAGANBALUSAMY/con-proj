const prisma = require('../utils/prisma');

// POST /api/section-transfers - Request section transfer
const requestSectionTransfer = async (req, res) => {
    try {
        const managerId = req.user.userId;
        const { operatorId, toSection, targetManagerId } = req.body;

        // Validation
        if (!operatorId || !toSection || !targetManagerId) {
            return res.status(400).json({ error: 'operatorId, toSection, and targetManagerId are required' });
        }

        // 1. Verify requester is MANAGER
        const manager = await prisma.user.findUnique({
            where: { id: managerId },
            include: { sectionAssignments: true }
        });

        if (!manager || manager.role !== 'MANAGER') {
            return res.status(403).json({ error: 'Only managers can request section transfers' });
        }

        // 2. Fetch operator
        const operator = await prisma.user.findUnique({
            where: { id: parseInt(operatorId) },
            include: { sectionAssignments: true }
        });

        if (!operator) {
            return res.status(404).json({ error: 'Operator not found' });
        }

        // 3. Verify ownership
        if (operator.createdByUserId !== managerId) {
            return res.status(403).json({ error: 'You can only transfer operators you created' });
        }

        // 4. Verify operator role
        if (operator.role !== 'OPERATOR') {
            return res.status(400).json({ error: 'Target user must be an OPERATOR' });
        }

        // 5. Get operator's current section
        if (operator.sectionAssignments.length !== 1) {
            return res.status(400).json({ error: 'Operator must have exactly one section assigned' });
        }

        const fromSection = operator.sectionAssignments[0].stage;

        // 6. Verify target section is different
        if (fromSection === toSection) {
            return res.status(400).json({ error: 'Target section must be different from current section' });
        }

        // 7. Verify target manager exists and has target section
        const targetManager = await prisma.user.findUnique({
            where: { id: parseInt(targetManagerId) },
            include: { sectionAssignments: true }
        });

        if (!targetManager || targetManager.role !== 'MANAGER') {
            return res.status(400).json({ error: 'Target manager not found or invalid' });
        }

        const hasTargetSection = targetManager.sectionAssignments.some(
            assignment => assignment.stage === toSection
        );

        if (!hasTargetSection) {
            return res.status(400).json({ error: 'Target manager does not have the target section assigned' });
        }

        // 8. Check for pending transfer
        const pendingTransfer = await prisma.sectionTransferRequest.findFirst({
            where: {
                operatorId: parseInt(operatorId),
                status: 'PENDING'
            }
        });

        if (pendingTransfer) {
            return res.status(400).json({ error: 'Operator already has a pending transfer request' });
        }

        // 9. Create transfer request
        const transferRequest = await prisma.sectionTransferRequest.create({
            data: {
                operatorId: parseInt(operatorId),
                fromSection,
                toSection,
                requestedBy: managerId,
                targetManagerId: parseInt(targetManagerId),
                status: 'PENDING'
            },
            include: {
                operator: { select: { id: true, fullName: true, employeeCode: true } },
                requester: { select: { id: true, fullName: true, employeeCode: true } },
                targetManager: { select: { id: true, fullName: true, employeeCode: true } }
            }
        });

        res.status(201).json(transferRequest);
    } catch (error) {
        console.error('Request section transfer error:', error);
        res.status(500).json({ error: 'Failed to request section transfer' });
    }
};

// PATCH /api/section-transfers/:id/review - Accept or reject transfer
const reviewSectionTransfer = async (req, res) => {
    try {
        const managerId = req.user.userId;
        const { id } = req.params;
        const { action, rejectionReason } = req.body; // action: 'ACCEPT' or 'REJECT'

        // Validation
        if (!action || !['ACCEPT', 'REJECT'].includes(action)) {
            return res.status(400).json({ error: 'action must be ACCEPT or REJECT' });
        }

        // 1. Fetch transfer request
        const transfer = await prisma.sectionTransferRequest.findUnique({
            where: { id: parseInt(id) },
            include: {
                operator: { include: { sectionAssignments: true } }
            }
        });

        if (!transfer) {
            return res.status(404).json({ error: 'Transfer request not found' });
        }

        // 2. Verify status is PENDING
        if (transfer.status !== 'PENDING') {
            return res.status(400).json({ error: 'Transfer request is not pending' });
        }

        // 3. Verify reviewer is target manager
        if (transfer.targetManagerId !== managerId) {
            return res.status(403).json({ error: 'Only the target manager can review this transfer' });
        }

        if (action === 'ACCEPT') {
            // Accept flow: Update section assignment
            await prisma.$transaction(async (tx) => {
                // Delete ALL previous section assignments for this operator (Enforce exactly one)
                await tx.sectionAssignment.deleteMany({
                    where: {
                        userId: transfer.operatorId
                    }
                });

                // Create new section assignment
                await tx.sectionAssignment.create({
                    data: {
                        userId: transfer.operatorId,
                        stage: transfer.toSection
                    }
                });

                // Update transfer status
                await tx.sectionTransferRequest.update({
                    where: { id: parseInt(id) },
                    data: {
                        status: 'ACCEPTED',
                        resolvedAt: new Date(),
                        resolvedBy: managerId
                    }
                });
            });

            const updatedTransfer = await prisma.sectionTransferRequest.findUnique({
                where: { id: parseInt(id) },
                include: {
                    operator: { select: { id: true, fullName: true, employeeCode: true } },
                    requester: { select: { id: true, fullName: true, employeeCode: true } },
                    targetManager: { select: { id: true, fullName: true, employeeCode: true } },
                    resolver: { select: { id: true, fullName: true, employeeCode: true } }
                }
            });

            res.json(updatedTransfer);
        } else {
            // Reject flow: Update status only
            const updatedTransfer = await prisma.sectionTransferRequest.update({
                where: { id: parseInt(id) },
                data: {
                    status: 'REJECTED',
                    resolvedAt: new Date(),
                    resolvedBy: managerId,
                    rejectionReason: rejectionReason || null
                },
                include: {
                    operator: { select: { id: true, fullName: true, employeeCode: true } },
                    requester: { select: { id: true, fullName: true, employeeCode: true } },
                    targetManager: { select: { id: true, fullName: true, employeeCode: true } },
                    resolver: { select: { id: true, fullName: true, employeeCode: true } }
                }
            });

            res.json(updatedTransfer);
        }
    } catch (error) {
        console.error('Review section transfer error:', error);
        res.status(500).json({ error: 'Failed to review section transfer' });
    }
};

// GET /api/section-transfers/pending - Get pending transfers for target manager
const getPendingTransfers = async (req, res) => {
    try {
        const managerId = req.user.userId;

        const transfers = await prisma.sectionTransferRequest.findMany({
            where: {
                targetManagerId: managerId,
                status: 'PENDING'
            },
            include: {
                operator: { select: { id: true, fullName: true, employeeCode: true } },
                requester: { select: { id: true, fullName: true, employeeCode: true } },
                targetManager: { select: { id: true, fullName: true, employeeCode: true } }
            },
            orderBy: { requestedAt: 'desc' }
        });

        res.json(transfers);
    } catch (error) {
        console.error('Get pending transfers error:', error);
        res.status(500).json({ error: 'Failed to fetch pending transfers' });
    }
};

// GET /api/section-transfers/my-requests - Get transfer requests initiated by manager
const getMyTransferRequests = async (req, res) => {
    try {
        const managerId = req.user.userId;

        const transfers = await prisma.sectionTransferRequest.findMany({
            where: {
                requestedBy: managerId
            },
            include: {
                operator: { select: { id: true, fullName: true, employeeCode: true } },
                requester: { select: { id: true, fullName: true, employeeCode: true } },
                targetManager: { select: { id: true, fullName: true, employeeCode: true } },
                resolver: { select: { id: true, fullName: true, employeeCode: true } }
            },
            orderBy: { requestedAt: 'desc' }
        });

        res.json(transfers);
    } catch (error) {
        console.error('Get my transfer requests error:', error);
        res.status(500).json({ error: 'Failed to fetch transfer requests' });
    }
};

// GET /api/section-transfers/history - Get all resolved transfers (requested by or target manager)
const getTransferHistory = async (req, res) => {
    try {
        const managerId = req.user.userId;

        const transfers = await prisma.sectionTransferRequest.findMany({
            where: {
                OR: [
                    { requestedBy: managerId },
                    { targetManagerId: managerId }
                ],
                status: { in: ['ACCEPTED', 'REJECTED'] }
            },
            include: {
                operator: { select: { id: true, fullName: true, employeeCode: true } },
                requester: { select: { id: true, fullName: true, employeeCode: true } },
                targetManager: { select: { id: true, fullName: true, employeeCode: true } },
                resolver: { select: { id: true, fullName: true, employeeCode: true } }
            },
            orderBy: { resolvedAt: 'desc' }
        });

        res.json(transfers);
    } catch (error) {
        console.error('Get transfer history error:', error);
        res.status(500).json({ error: 'Failed to fetch transfer history' });
    }
};

module.exports = {
    requestSectionTransfer,
    reviewSectionTransfer,
    getPendingTransfers,
    getMyTransferRequests,
    getTransferHistory
};
