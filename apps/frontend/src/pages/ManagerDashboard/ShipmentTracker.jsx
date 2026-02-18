import React, { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, Clock } from 'lucide-react';
import api from '../../utils/api';
import { useSocket } from '../../context/SocketContext';
import './ShipmentTracker.css';

const ShipmentTracker = () => {
    const [boxes, setBoxes] = useState([]);
    const [filter, setFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);

    const fetchBoxes = async () => {
        try {
            const response = await api.get('/boxes');
            setBoxes(response.data);
        } catch (error) {
            console.error('Error fetching boxes:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBoxes();
    }, []);

    const socket = useSocket();
    useEffect(() => {
        if (!socket) return;
        const handleBoxUpdate = (updatedBox) => {
            setBoxes(prev => prev.map(box => box.id === updatedBox.id ? { ...box, ...updatedBox } : box));
        };
        socket.on('box:updated', handleBoxUpdate);
        return () => socket.off('box:updated', handleBoxUpdate);
    }, [socket]);

    const updateStatus = async (boxId, newStatus) => {
        try {
            await api.patch(`/boxes/${boxId}/status`, { status: newStatus });
            // Socket will handle UI update
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to update status');
        }
    };

    const filteredBoxes = filter === 'ALL' ? boxes : boxes.filter(b => b.status === filter);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'PACKED': return <Package size={18} />;
            case 'SHIPPED': return <Truck size={18} />;
            case 'DELIVERED': return <CheckCircle size={18} />;
            default: return <Clock size={18} />;
        }
    };

    return (
        <div className="shipment-tracker">
            <div className="tracker-header">
                <h2>Completed Packages</h2>
                <div className="filter-tabs">
                    {['ALL', 'PACKED', 'SHIPPED', 'DELIVERED'].map(status => (
                        <button
                            key={status}
                            className={`filter-tab ${filter === status ? 'active' : ''}`}
                            onClick={() => setFilter(status)}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="tracker-loading">Loading shipments...</div>
            ) : (
                <div className="shipment-list">
                    {filteredBoxes.map(box => (
                        <div key={box.id} className="shipment-card">
                            <div className="shipment-info">
                                <div className="shipment-code">
                                    {getStatusIcon(box.status)}
                                    <span>{box.boxCode}</span>
                                </div>
                                <div className="shipment-details">
                                    <p>Batch: {box.batch.batchNumber}</p>
                                    <p>{box.batch.briefTypeName} • {box.quantity} units</p>
                                </div>
                            </div>

                            <span className={`status-badge ${box.status.toLowerCase()}`}>
                                {box.status}
                            </span>
                        </div>
                    ))}
                    {filteredBoxes.length === 0 && (
                        <div className="empty-tracker">No shipments found.</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ShipmentTracker;
