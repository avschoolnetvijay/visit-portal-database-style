import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell } from 'recharts';
import { Icons } from './Icons';

const PremiumChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const title = label || payload[0]?.payload?.name || "";
  return (
    <div className="bg-[#111827] text-white p-3 rounded-xl shadow-2xl border border-[#374151] text-xs font-sans min-w-[180px] pointer-events-none select-none z-50">
      {title && (
        <p className="font-extrabold text-[#f3f4f6] text-sm mb-2 border-b border-[#374151] pb-1.5">
          {title}
        </p>
      )}
      <div className="space-y-1.5">
        {payload.map((p, idx) => {
          const bulletColor = p.color || '#0d9488';
          return (
            <div key={idx} className="flex items-center justify-between gap-4 font-bold py-0.5">
              <div className="flex items-center gap-1.5 text-[#d1d5db]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: bulletColor }} />
                <span>{p.name}:</span>
              </div>
              <span className="font-black text-white">
                {typeof p.value === 'number' ? p.value.toFixed(1) + '%' : p.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PerformanceView = ({ data }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const visitors = useMemo(() => {
        const map = {};
        data.schools.forEach(s => {
            if (!map[s.visitor_name]) map[s.visitor_name] = {
                name: s.visitor_name,
                district: s.district,
                assigned: 0,
                schoolsCompleted: 0,
                schoolsPending: 0,
                target: 0,
                unique: 0,
                smart: 0,
                ict: 0
            };
            const v = map[s.visitor_name];
            v.assigned++;

            const isCompleted = s.uniqueVisits >= s.targetVisits;
            if (isCompleted) {
                v.schoolsCompleted++;
            } else {
                v.schoolsPending++;
            }

            v.target += s.targetVisits;
            v.unique += s.uniqueVisits;
            v.smart += s.smartRecords;
            v.ict += s.ictRecords;
        });
        return Object.values(map).map(v => ({
            ...v,
            // Performance is based on Schools Completed / Assigned
            performancePct: v.assigned > 0 ? (v.schoolsCompleted / v.assigned) * 100 : 0
        })).sort((a, b) => b.performancePct - a.performancePct);
    }, [data]);

    // Reset pagination to page 1 upon filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [data]);

    const totalPages = rowsPerPage === -1 ? 1 : Math.ceil(visitors.length / rowsPerPage);
    const activePage = Math.min(currentPage, totalPages) || 1;
    const startIdx = rowsPerPage === -1 ? 0 : (activePage - 1) * rowsPerPage;

    const paginatedVisitors = useMemo(() => {
        if (rowsPerPage === -1) return visitors;
        return visitors.slice(startIdx, startIdx + rowsPerPage);
    }, [visitors, startIdx, rowsPerPage]);

    return (
        <div className="p-3 h-full flex flex-col lg:flex-row gap-3">
            {/* Performance Graph Section - Side-by-Side on Desktop */}
            <div className="portal-card lg:w-1/3 h-96 lg:h-full shrink-0 p-4 flex flex-col">
                <div className="flex justify-between items-center mb-2 shrink-0">
                    <h3 className="text-xs font-bold text-teal-700 uppercase flex items-center gap-2">
                        <Icons.Analytics className="w-4 h-4" /> Completion Rates
                    </h3>
                </div>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={visitors} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }} barSize={20}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                width={100}
                                interval={0}
                            />
                            <Tooltip cursor={{ fill: 'rgba(13, 148, 136, 0.08)' }} content={<PremiumChartTooltip />} />
                            <Bar dataKey="performancePct" name="Completion %" radius={[0, 4, 4, 0]}>
                                {visitors.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.performancePct >= 100 ? '#22c55e' : entry.performancePct >= 50 ? '#eab308' : '#ef4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Table Section - Takes remaining width and full height */}
            <div className="portal-card flex-1 min-h-0 flex flex-col h-full">
                <div className="portal-card-header shrink-0 bg-gradient-to-r from-teal-700 to-teal-800 text-white shadow-sm">Visitor Performance Matrix (School Coverage)</div>
                <div className="overflow-auto flex-1 h-full w-full">
                    <table className="w-full text-xs text-left portal-table">
                        <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm">
                            <tr>
                                <th className="px-3 py-2 bg-gray-100">Visitor Name</th>
                                <th className="px-3 py-2 bg-gray-100">District</th>
                                <th className="px-3 py-2 bg-gray-100 text-center">Assigned</th>
                                <th className="px-3 py-2 bg-gray-100 text-center">Done</th>
                                <th className="px-3 py-2 bg-gray-100 text-center">Pending</th>
                                <th className="px-3 py-2 bg-gray-100 text-center">Visits</th>
                                <th className="px-3 py-2 bg-gray-100 text-center">Perf %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedVisitors.map((v, i) => {
                                return (
                                    <tr key={i} className="hover:bg-teal-50 transition-colors">
                                        <td className="px-3 py-2 font-medium text-teal-800 dark:text-teal-400">{v.name}</td>
                                        <td className="px-3 py-2">{v.district}</td>
                                        <td className="px-3 py-2 text-center">{v.assigned}</td>
                                        <td className="px-3 py-2 text-center text-green-600 dark:text-green-400 font-bold">{v.schoolsCompleted}</td>
                                        <td className="px-3 py-2 text-center text-red-600 dark:text-red-400 font-bold">{v.schoolsPending}</td>
                                        <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400">{v.unique}</td>
                                        <td className="px-3 py-2 text-center">
                                            <div className="flex items-center gap-2 justify-center">
                                                <div className="w-12 bg-gray-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                                    <div className={`h-full ${v.performancePct >= 100 ? 'bg-green-500' : v.performancePct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(v.performancePct, 100)}%` }}></div>
                                                </div>
                                                <span className="text-[9px] w-6 text-right font-bold">{Math.round(v.performancePct)}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
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
                            {visitors.length > 0 ? (
                                `Showing ${startIdx + 1}–${Math.min(startIdx + (rowsPerPage === -1 ? visitors.length : rowsPerPage), visitors.length)} of ${visitors.length}`
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

export default PerformanceView;
