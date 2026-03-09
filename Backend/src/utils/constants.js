/**
 * WebSocket Event Definitions
 */
const SOCKET_EVENTS = {
    BATCH: {
        CREATED: 'batch:created',
        STAGE_UPDATED: 'batch:stage_updated',
        STATUS_UPDATED: 'batch:status_updated',
    },
    APPROVAL: {
        UPDATED: 'approval:updated',
    },
    QUALITY: {
        DEFECT_RECORDED: 'defect:recorded',
    },
    REWORK: {
        COMPLETED: 'rework:completed',
    },
    MACHINE: {
        STATUS_CHANGED: 'machine:status_changed',
    },
    PRODUCTION: {
        ALERT: 'production:alert',
    },
    TRANSFER: {
        SYNC_APPROVAL: 'transfer:sync_approval',
    },
    WORKFORCE: {
        UPDATED: 'workforce:updated',
        ASSIGNMENT_CHANGED: 'batch:assignment_changed',
    }
};

/**
 * Pagination Defaults
 */
const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
};

module.exports = {
    SOCKET_EVENTS,
    PAGINATION,
};
