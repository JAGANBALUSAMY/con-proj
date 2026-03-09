/**
 * Utility to export data to CSV
 * @param {Array} data - Array of objects
 * @param {Array} columns - Array of { key, label } objects
 * @param {string} fileName - Name of the file
 */
export const exportToCSV = (data, columns, fileName = 'report') => {
    if (!data || !data.length) return;

    const headers = columns.map(col => col.label).join(',');
    const rows = data.map(item => {
        return columns.map(col => {
            let val = item[col.key];
            if (typeof col.render === 'function') {
                // Remove HTML if any
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = col.render(val, item);
                val = tempDiv.textContent || tempDiv.innerText || val;
            }
            // Escape commas and quotes
            const escaped = ('' + val).replace(/"/g, '""');
            return `"${escaped}"`;
        }).join(',');
    });

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
