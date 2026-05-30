import React, { useEffect, useMemo } from 'react';
import { Icons } from './Icons';
import { formatDate, exportToExcel } from '../utils';

// Maps raw camel_case or snake_case key names to beautiful executive column headers
const mapKeyToHeader = (key) => {
    if (!key) return '';
    const mapped = {
        slno: 'Sl No',
        udise: 'UDISE Code',
        udise_code: 'UDISE Code',
        school_name: 'School Name',
        schoolname: 'School Name',
        block: 'Block',
        district: 'District',
        project_name: 'Project',
        visitor_name: 'CC / DEF Name',
        visit_date: 'Visit Date',
        visit_type: 'Visit Type',
        device: 'Device Type',
        serial: 'Serial Number',
        installed: 'Installed',
        hours: 'EduStat Device Hours',
        status: 'Status',
        subjects: 'Subjects taught',
        instructor_name: 'Instructor Name',
        instructorstatus: 'Manpower Status',
        uniquevisits: 'Visits Count',
        targetvisits: 'Target visits',
        lastvisitdate: 'Last Visit Date',
        combinedscore: 'Score %',
        compositescore: 'Performance Score',
        jhpmsclasses: 'JHPMS Classes',
        ictclasses: 'Total ICT Classes',
        smartclasses: 'Total Smart Classes',
        edustatsync: 'EduStat Sync Status',
        avgclassperday: 'Avg Class/Day',
        avghrsperday: 'Avg Hours/Day',
        gap_reason: 'Gap Cause Details',
        formatteddates: 'Dates Logged',
        label: 'Reference / Group',
        value: 'Value'
    };
    
    const lowerKey = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (mapped[lowerKey]) return mapped[lowerKey];
    if (mapped[key]) return mapped[key];

    // Fallback: capitalize words and replace underscores
    return key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
};

const DrillDownModal = ({ isOpen, onClose, title, data = [] }) => {
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    // Extract dynamic headers based on the first object's keys, omitting unnecessary internal states
    const columns = useMemo(() => {
        if (!data || data.length === 0) return [];
        const ignoredKeys = new Set([
            'visitdates', 'visitdateslist', 'visitdatesset', 'sortkey', 'active', 
            'color', 'drilldata', 'rawdate', 'lastvisit', 'lastvisitdate_obj'
        ]);

        const sample = data[0];
        return Object.keys(sample)
            .filter(key => !ignoredKeys.has(key.toLowerCase()))
            .map(key => ({
                key,
                header: mapKeyToHeader(key)
            }));
    }, [data]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center modal-overlay p-4 backdrop-blur-sm bg-slate-900/60 dark:bg-slate-950/80 transition-all duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col animate-fade-in border border-slate-100 dark:border-slate-800/80">
                
                {/* Premium Teal Header Block */}
                <div className="p-4 flex justify-between items-center bg-gradient-to-r from-teal-800 to-teal-700 dark:from-teal-950 dark:to-teal-900 text-white rounded-t-2xl shadow-md z-10 select-none">
                    <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                        <span className="p-1 bg-white/10 dark:bg-teal-400/10 rounded">
                            <Icons.Analytics className="w-4 h-4 text-white dark:text-teal-300" />
                        </span>{' '}
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="hover:bg-white/10 dark:hover:bg-white/5 p-1.5 rounded-full transition-colors text-white/80 hover:text-white"
                        title="Close (Esc)"
                    >
                        <Icons.Close className="w-5 h-5" />
                    </button>
                </div>

                {/* Sub Bar with Count and Excel Export Option */}
                <div className="p-3 flex justify-between items-center bg-slate-50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-800/60 z-10">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium px-2">
                        Showing <span className="font-extrabold text-slate-800 dark:text-slate-200 bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded">{data.length}</span> records
                    </div>
                    <button
                        onClick={() => exportToExcel(data, `Drilldown_${title.replace(/\s+/g, '_')}`)}
                        className="text-xs flex items-center gap-1.5 text-teal-750 dark:text-teal-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 rounded-lg border border-teal-200 dark:border-slate-800 shadow-sm transition-all hover:shadow"
                    >
                        <Icons.Export className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> Export to Excel
                    </button>
                </div>

                {/* Dynamic Table Scrollable Container */}
                <div className="overflow-auto flex-1 p-0 bg-white dark:bg-slate-900 rounded-b-2xl max-h-[60vh]">
                    {data.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 dark:text-slate-500 italic text-xs font-semibold">
                            No detailed log records are matching this filter selection.
                        </div>
                    ) : (
                        <table className="w-full text-xs text-left border-collapse portal-table">
                            <thead className="bg-slate-50 dark:bg-slate-950 sticky top-0 text-slate-600 dark:text-slate-350 shadow-sm z-10 border-b border-slate-150 dark:border-slate-800">
                                <tr>
                                    {columns.map((col, idx) => (
                                        <th 
                                            key={col.key} 
                                            className={`py-3 px-4 text-[10.5px] font-black uppercase tracking-wider bg-slate-50 dark:bg-slate-950 border-r border-slate-200/50 dark:border-slate-800 last:border-r-0 text-center`}
                                        >
                                            {col.header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {data.map((row, i) => (
                                    <tr 
                                        key={i} 
                                        className="hover:bg-teal-50/15 dark:hover:bg-slate-850/40 transition-colors group"
                                    >
                                        {columns.map((col, cIdx) => {
                                            const rawVal = row[col.key];
                                            const lowerKey = col.key.toLowerCase();
                                            
                                            // Handle special formatted displays
                                            let cellDisplay = '-';
                                            if (rawVal !== null && rawVal !== undefined) {
                                                if (typeof rawVal === 'object') {
                                                    if (Array.isArray(rawVal)) {
                                                        cellDisplay = rawVal.join(', ');
                                                    } else if (rawVal instanceof Set) {
                                                        cellDisplay = Array.from(rawVal).join(', ');
                                                    } else {
                                                        cellDisplay = rawVal.label !== undefined ? String(rawVal.label) :
                                                                      rawVal.name !== undefined ? String(rawVal.name) :
                                                                      JSON.stringify(rawVal);
                                                    }
                                                } else {
                                                    cellDisplay = String(rawVal);
                                                }
                                            }
                                            if (lowerKey.includes('date') && rawVal && typeof rawVal !== 'object') {
                                                const formatted = formatDate(rawVal);
                                                if (formatted !== '-') cellDisplay = formatted;
                                            }

                                            // Highlight formatting for Score / Percent metrics
                                            const isHighlightCol = lowerKey.includes('score') || lowerKey.includes('percent') || lowerKey.includes('combined');
                                            
                                            return (
                                                <td 
                                                    key={col.key} 
                                                    className={`py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200/50 dark:border-slate-800/40 last:border-r-0 text-center
                                                        ${cIdx === 0 ? 'font-extrabold text-slate-900 dark:text-slate-100' : ''}
                                                        ${isHighlightCol ? 'text-teal-650 dark:text-teal-400 font-extrabold bg-teal-500/5 dark:bg-teal-500/10' : ''}
                                                    `}
                                                >
                                                    {cellDisplay}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DrillDownModal;
