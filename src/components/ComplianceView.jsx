import React, { useState, useEffect, useMemo } from 'react';
import { Icons } from './Icons';
import { formatDate, exportToExcel } from '../utils';

const ComplianceView = ({ data }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const issues = useMemo(() => {
        const map = {};
        // Group visits by Unique School + Date
        data.visits.forEach(v => {
            // Defensive check: robust split on date to prevent crashes on missing/invalid records
            const dateStr = (v.visit_date || '').split('T')[0];
            if (!dateStr) return;

            const key = `${v.udise_code}_${dateStr}`;

            if (!map[key]) {
                map[key] = {
                    key,
                    school_name: v.school_name || v.School_Name,
                    district: v.district,
                    visitor: v.visitor_name,
                    date: v.visit_date,
                    hasSmart: false,
                    hasICT: false
                };
            }

            const type = (v.visit_type || "").toLowerCase();
            if (type.includes('smart')) map[key].hasSmart = true;
            if (type.includes('ict')) map[key].hasICT = true;
        });

        // Filter for gaps: Check if we FAILED to visit BOTH
        return Object.values(map).filter(item => {
            // Strict Rule: Must have BOTH Smart and ICT.
            // If !(Smart AND ICT), it's a compliance issue.
            return !(item.hasSmart && item.hasICT);
        }).map(item => {
            let issue = "Missed Both Facilities";
            if (item.hasSmart) issue = "Missed ICT Lab";
            else if (item.hasICT) issue = "Missed Smart Class";

            return { ...item, issue };
        }).sort((a, b) => {
            const dA = new Date(a.date);
            const dB = new Date(b.date);
            if (isNaN(dA.getTime()) || isNaN(dB.getTime())) return 0;
            return dB - dA;
        });
    }, [data]);

    // Reset pagination to page 1 upon filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [data]);

    const totalPages = rowsPerPage === -1 ? 1 : Math.ceil(issues.length / rowsPerPage);
    const activePage = Math.min(currentPage, totalPages) || 1;
    const startIdx = rowsPerPage === -1 ? 0 : (activePage - 1) * rowsPerPage;

    const paginatedIssues = useMemo(() => {
        if (rowsPerPage === -1) return issues;
        return issues.slice(startIdx, startIdx + rowsPerPage);
    }, [issues, startIdx, rowsPerPage]);

    return (
        <div className="p-3 h-full flex flex-col">
            <div className="portal-card flex-1">
                <div className="portal-card-header bg-gradient-to-r from-rose-600 to-rose-700 flex justify-between items-center text-white shadow-sm">
                    <span className="flex items-center gap-2">
                        <Icons.Compliance className="w-4 h-4 text-white" /> Visit Compliance Gaps (Mandatory: Smart + ICT)
                    </span>
                    <button
                        onClick={() => exportToExcel(issues, 'Compliance_Gaps')}
                        className="bg-white text-rose-800 hover:bg-rose-50 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm"
                    >
                        <Icons.Export className="w-3 h-3" /> EXPORT LIST
                    </button>
                </div>
                <div className="overflow-auto flex-1">
                    <table className="w-full text-xs text-left portal-table">
                        <thead className="sticky top-0 bg-gray-100 z-10">
                            <tr>
                                <th className="px-3 py-2 bg-gray-100 w-24">Date</th>
                                <th className="px-3 py-2 bg-gray-100">School Name</th>
                                <th className="px-3 py-2 bg-gray-100">District</th>
                                <th className="px-3 py-2 bg-gray-100">Visitor</th>
                                <th className="px-3 py-2 bg-gray-100 text-center">Recorded Activity</th>
                                <th className="px-3 py-2 bg-gray-100 text-center">Compliance Gap</th>
                                <th className="px-3 py-2 bg-gray-100">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedIssues.map((row, i) => (
                                <tr key={i} className="hover:bg-rose-50 transition-colors">
                                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400 font-medium">{formatDate(row.date)}</td>
                                    <td className="px-3 py-2 font-medium">{row.school_name}</td>
                                    <td className="px-3 py-2">{row.district}</td>
                                    <td className="px-3 py-2">{row.visitor}</td>
                                    <td className="px-3 py-2 text-center">
                                        {row.hasSmart && !row.hasICT && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white bg-teal-600">Smart Only</span>
                                        )}
                                        {!row.hasSmart && row.hasICT && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white bg-blue-600">ICT Only</span>
                                        )}
                                        {!row.hasSmart && !row.hasICT && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold text-gray-600 bg-gray-200">Other/None</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <span className="text-red-700 font-bold text-[10px] border border-red-200 bg-red-50 px-2 py-0.5 rounded uppercase tracking-tight">
                                            {row.issue}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <span className="text-[10px] font-bold text-rose-700 flex items-center gap-1">
                                            <Icons.Alert className="w-3 h-3" /> Non-Compliant
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {issues.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="text-center p-8 text-gray-400 italic">
                                        Great! No compliance gaps found. All visits covered both facilities.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="px-4 py-3 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 no-print">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <span>Rows per page:</span>
                            <select
                                value={rowsPerPage}
                                onChange={(e) => {
                                    setRowsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded px-2 py-1 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={-1}>All</option>
                            </select>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            {issues.length > 0 ? (
                                `Showing ${startIdx + 1}–${Math.min(startIdx + (rowsPerPage === -1 ? issues.length : rowsPerPage), issues.length)} of ${issues.length}`
                            ) : (
                                'Showing 0–0 of 0'
                            )}
                        </div>
                    </div>
                    
                    {totalPages > 1 && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={activePage === 1}
                                className="p-1 px-2 text-xs border border-gray-200 dark:border-white/10 rounded-md bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold"
                                title="First Page"
                            >
                                «
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={activePage === 1}
                                className="p-1 px-2 text-xs border border-gray-200 dark:border-white/10 rounded-md bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold"
                                title="Previous Page"
                            >
                                ‹
                            </button>
                            <span className="px-3 py-1 text-xs font-bold text-teal-800 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 rounded-md border border-teal-100 dark:border-teal-900/30">
                                Page {activePage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={activePage === totalPages}
                                className="p-1 px-2 text-xs border border-gray-200 dark:border-white/10 rounded-md bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold"
                                title="Next Page"
                            >
                                ›
                            </button>
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={activePage === totalPages}
                                className="p-1 px-2 text-xs border border-gray-200 dark:border-white/10 rounded-md bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold"
                                title="Last Page"
                            >
                                »
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ComplianceView;
