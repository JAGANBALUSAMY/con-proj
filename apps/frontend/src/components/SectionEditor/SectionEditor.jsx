import React, { useState } from 'react';
import './SectionEditor.css';

const PRODUCTION_STAGES = [
    'CUTTING',
    'STITCHING',
    'QUALITY_CHECK',
    'LABELING',
    'FOLDING',
    'PACKING'
];

const SectionEditor = ({ currentSections, onSave, onCancel }) => {
    const [selectedSections, setSelectedSections] = useState(currentSections || []);
    const [error, setError] = useState('');

    const handleToggle = (stage) => {
        if (selectedSections.includes(stage)) {
            setSelectedSections(selectedSections.filter(s => s !== stage));
        } else {
            setSelectedSections([...selectedSections, stage]);
        }
        setError('');
    };

    const handleSave = () => {
        if (selectedSections.length === 0) {
            setError('At least one section must be selected');
            return;
        }
        onSave(selectedSections);
    };

    return (
        <div className="section-editor">
            <h4>Edit Section Assignments</h4>
            <p className="section-editor-note">Select at least one production section</p>

            {error && <div className="section-editor-error">{error}</div>}

            <div className="section-checkboxes">
                {PRODUCTION_STAGES.map(stage => (
                    <label key={stage} className="section-checkbox-label">
                        <input
                            type="checkbox"
                            checked={selectedSections.includes(stage)}
                            onChange={() => handleToggle(stage)}
                        />
                        <span>{stage.replace(/_/g, ' ')}</span>
                    </label>
                ))}
            </div>

            <div className="section-editor-actions">
                <button className="btn-cancel" onClick={onCancel}>
                    Cancel
                </button>
                <button className="btn-save" onClick={handleSave}>
                    Save Changes
                </button>
            </div>
        </div>
    );
};

export default SectionEditor;
