import { useState, useMemo } from 'react';

/**
 * useTable Hook for Advanced SaaS Table Features
 * Supports: Sorting, Search, and Pagination
 */
export const useTable = (data = [], options = {}) => {
    const {
        initialSort = { key: null, direction: 'asc' },
        initialPageSize = 10,
        searchKeys = []
    } = options;

    const [sortConfig, setSortConfig] = useState(initialSort);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);

    // 1. Filtering (Search)
    const filteredData = useMemo(() => {
        if (!searchTerm || searchKeys.length === 0) return data;

        const lowerSearch = searchTerm.toLowerCase();
        return data.filter(item =>
            searchKeys.some(key => {
                const val = item[key];
                return val && String(val).toLowerCase().includes(lowerSearch);
            })
        );
    }, [data, searchTerm, searchKeys]);

    // 2. Sorting
    const sortedData = useMemo(() => {
        if (!sortConfig.key) return filteredData;

        const sorted = [...filteredData].sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [filteredData, sortConfig]);

    // 3. Pagination
    const totalItems = sortedData.length;
    const totalPages = Math.ceil(totalItems / pageSize);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedData.slice(start, start + pageSize);
    }, [sortedData, currentPage, pageSize]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return {
        data: paginatedData,
        fullData: sortedData,
        sortConfig,
        requestSort,
        searchTerm,
        setSearchTerm,
        currentPage,
        setCurrentPage,
        totalPages,
        pageSize,
        setPageSize,
        totalItems
    };
};
