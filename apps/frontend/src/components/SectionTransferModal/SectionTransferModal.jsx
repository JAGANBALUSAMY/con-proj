import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Users } from 'lucide-react';
import api from '../../utils/api';
import './SectionTransferModal.css';

const SectionTransferModal = ({ isOpen, onClose, onSuccess }) => {
    const [operators, setOperators] = useState([]);
    const [managers, setManagers] = useState([]);
    const [selectedOperator, setSelectedOperator] = useState('');
    const [targetSection, setTargetSection] = useState('');
    const [targetManager, setTargetManager] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const sections = ['CUTTING', 'STITCHING', 'QUALITY_CHECK', 'LABELING', 'FOLDING', 'PACKING'];

    useEffect(() => {
        if (isOpen) {
            fetchOperators();
        }
    }, [isOpen]);

    useEffect(() => {
        if (targetSection) {
            fetchManagersForSection(targetSection);
        } else {
            setManagers([]);
            setTargetManager('');
        }
    }, [targetSection]);

    const fetchOperators = async () => {
        try {
            setError('');
            const response = await api.get('/users/my-operators');
            setOperators(response.data);
            if (response.data.length === 0) {
                console.warn('No operators found for this manager');
            }
        } catch (error) {
            console.error('Failed to fetch operators:', error);
            setError(error.response?.data?.error || 'Failed to load operators. Ensure you are logged in as a Manager.');
        }
    };

    const fetchManagersForSection = async (section) => {
        try {
            const response = await api.get('/users/managers');
            const allManagers = response.data;

            // Filter managers who have the target section
            const filteredManagers = allManagers.filter(manager =>
                manager.sections && manager.sections.includes(section)
            );

            setManagers(filteredManagers);
        } catch (error) {
            console.error('Failed to fetch managers');
            setManagers([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await api.post('/section-transfers', {
                operatorId: parseInt(selectedOperator),
                toSection: targetSection,
                targetManagerId: parseInt(targetManager)
            });

            alert('Section transfer request submitted successfully');
            onSuccess();
            onClose();
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to submit transfer request');
        } finally {
            setLoading(false);
        }
    };

    const getOperatorCurrentSection = (operatorId) => {
        const operator = operators.find(op => op.id === parseInt(operatorId));
        return operator?.sections?.[0] || 'N/A';
    };

    if (!isOpen) return null;

    return (
        <div className="section-transfer-overlay">
            <div className="section-transfer-modal">
                <div className="section-transfer-header">
                    <div className="header-title">
                        <Users size={24} />
                        <h2>Transfer Operator Section</h2>
                    </div>
                    <button className="close-button" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="section-transfer-form">
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label>Select Operator *</label>
                        <select
                            value={selectedOperator}
                            onChange={(e) => setSelectedOperator(e.target.value)}
                            required
                        >
                            <option value="">{operators.length === 0 ? '-- No Operators Available --' : '-- Select Operator --'}</option>
                            {operators.map(operator => (
                                <option key={operator.id} value={operator.id}>
                                    {operator.fullName} ({operator.employeeCode})
                                </option>
                            ))}
                        </select>
                        {operators.length === 0 && (
                            <span className="helper-text error">You can only transfer operators you created. No owned operators found.</span>
                        )}
                    </div>

                    {selectedOperator && (
                        <div className="current-section-info">
                            <span className="label">Current Section:</span>
                            <span className="section-badge current">
                                {getOperatorCurrentSection(selectedOperator)}
                            </span>
                        </div>
                    )}

                    <div className="form-group">
                        <label>Target Section *</label>
                        <select
                            value={targetSection}
                            onChange={(e) => setTargetSection(e.target.value)}
                            required
                            disabled={!selectedOperator}
                        >
                            <option value="">-- Select Target Section --</option>
                            {sections.map(section => (
                                <option
                                    key={section}
                                    value={section}
                                    disabled={section === getOperatorCurrentSection(selectedOperator)}
                                >
                                    {section}
                                </option>
                            ))}
                        </select>
                    </div>

                    {targetSection && (
                        <div className="transfer-arrow">
                            <ArrowRight size={24} className="arrow-icon" />
                            <span className="section-badge target">{targetSection}</span>
                        </div>
                    )}

                    <div className="form-group">
                        <label>Target Manager *</label>
                        <select
                            value={targetManager}
                            onChange={(e) => setTargetManager(e.target.value)}
                            required
                            disabled={!targetSection}
                        >
                            <option value="">-- Select Target Manager --</option>
                            {managers.map(manager => (
                                <option key={manager.id} value={manager.id}>
                                    {manager.fullName} ({manager.employeeCode})
                                </option>
                            ))}
                        </select>
                        {targetSection && managers.length === 0 && (
                            <span className="helper-text">No managers found for this section</span>
                        )}
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="btn-cancel">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-submit"
                            disabled={loading || !selectedOperator || !targetSection || !targetManager}
                        >
                            {loading ? 'Submitting...' : 'Submit Transfer Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SectionTransferModal;
