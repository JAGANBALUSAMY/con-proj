import { useState, useEffect, useCallback } from 'react';
import api from '@frontend/services/api';
import { useAuth } from '@frontend/store/AuthContext';
import { useSocket } from '@frontend/store/SocketContext';

/**
 * Hook for fetching role-aware production statistics
 */
export const useProductionStats = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const socket = useSocket();

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true);
            let endpoint;
            if (user?.role === 'ADMIN') endpoint = '/dashboard/admin';
            else if (user?.role === 'MANAGER') endpoint = '/dashboard/manager';
            else endpoint = '/dashboard/operator';
            
            const response = await api.get(endpoint);
            setStats(response.data.stats || response.data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch production stats:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [user?.role]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        if (!socket) return;
        socket.on('batch:status_updated', fetchStats);
        return () => socket.off('batch:status_updated', fetchStats);
    }, [socket, fetchStats]);

    return { stats, loading, error, refresh: fetchStats };
};

/**
 * Hook for fetching role-aware batch data
 */
export const useBatches = (status = 'ACTIVE') => {
    const { user } = useAuth();
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const socket = useSocket();

    const fetchBatches = useCallback(async () => {
        try {
            setLoading(true);
            // Route each role to its own protected dashboard endpoint
            let endpoint;
            if (user?.role === 'ADMIN') endpoint = '/dashboard/admin';
            else if (user?.role === 'MANAGER') endpoint = '/dashboard/manager';
            else endpoint = '/dashboard/operator'; // OPERATOR must NOT call /manager

            const response = await api.get(endpoint);

            let batchList = [];
            if (user?.role === 'ADMIN') {
                batchList = status === 'ACTIVE' ? response.data.stats.activeBatchList : response.data.stats.batchHistory;
            } else if (user?.role === 'MANAGER') {
                batchList = response.data.activeBatches || [];
            } else if (user?.role === 'OPERATOR') {
                // Operator dashboard returns { batches: [...] }
                batchList = response.data.batches || [];
            }

            setBatches(batchList);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch batches:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [user?.role, user?.sections, status]);

    useEffect(() => {
        fetchBatches();
    }, [fetchBatches]);

    useEffect(() => {
        if (!socket) return;
        socket.on('batch:created', fetchBatches);
        socket.on('batch:status_updated', fetchBatches);
        socket.on('batch:assignment_changed', fetchBatches);
        return () => {
            socket.off('batch:created', fetchBatches);
            socket.off('batch:status_updated', fetchBatches);
            socket.off('batch:assignment_changed', fetchBatches);
        };
    }, [socket, fetchBatches]);

    return { batches, loading, error, refresh: fetchBatches };
};

/**
 * Hook for fetching quality/defect data
 */
export const useDefects = () => {
    const { user } = useAuth();
    const [defects, setDefects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const socket = useSocket();

    const fetchDefects = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/quality-analytics');
            setDefects(response.data.defects || []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch defects:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDefects();
    }, [fetchDefects]);

    useEffect(() => {
        if (!socket) return;
        socket.on('defect:recorded', fetchDefects);
        return () => socket.off('defect:recorded', fetchDefects);
    }, [socket, fetchDefects]);

    return { defects, loading, error, refresh: fetchDefects };
};

/**
 * Hook for fetching operators based on role/section
 */
export const useOperators = () => {
    const { user } = useAuth();
    const [operators, setOperators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const socket = useSocket();

    const fetchOperators = useCallback(async () => {
        try {
            setLoading(true);
            let endpoint = '/dashboard/manager';
            if (user?.role === 'ADMIN') endpoint = '/users';
            else if (user?.role === 'OPERATOR') endpoint = '/dashboard/operator'; // Safeback, operators might not need this hook
            
            const response = await api.get(endpoint);

            const list = user?.role === 'ADMIN'
                ? (Array.isArray(response.data.users) ? response.data.users.filter(u => u.role === 'OPERATOR') : [])
                : user?.role === 'OPERATOR' 
                    ? [] // Operators don't manage other operators
                    : response.data.operators || [];

            setOperators(list);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch operators:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [user?.role]);

    useEffect(() => {
        fetchOperators();
    }, [fetchOperators]);

    useEffect(() => {
        if (!socket) return;
        socket.on('workforce:updated', fetchOperators);
        return () => socket.off('workforce:updated', fetchOperators);
    }, [socket, fetchOperators]);

    return { operators, loading, error, refresh: fetchOperators };
};
