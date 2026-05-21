import React from 'react';
import { Icons } from './Icons';
import { formatDate, exportToExcel } from '../utils';

const DrillDownModal = ({ isOpen, onClose, title, data }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center modal-overlay p-4 backdrop-blur-sm bg-slate-900/40">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col animate-fade-in ring-1 ring-white/20">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-teal-800 to-teal-700 text-white rounded-t-2xl shadow-md z-10">
                    <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                        <span className="p-1 bg-white/10 rounded">
                            <Icons.Analytics className="w-4 h-4 text-white" />
                        </span>{' '}
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="hover:bg-white/10 p-1 rounded-full transition-colors text-white/80 hover:text-white"
                    >
                        <Icons.Close className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-3 flex justify-between items-center bg-gray-50 border-b border-gray-200">
                    <div className="text-xs text-gray-500 font-medium px-2">
                        Showing <span className="font-bold text-gray-800">{data.length}</span> records
                    </div>
                    <button
                        onClick={() => exportToExcel(data, `Drilldown_${title}`)}
                        className="text-xs flex items-center gap-1.5 text-teal-700 font-bold hover:bg-white bg-white px-3 py-1.5 rounded-lg border border-teal-200 shadow-sm transition hover:shadow"
                    >
                        <Icons.Export className="w-3.5 h-3.5" /> Export to Excel
                    </button>
                </div>
                <div className="overflow-auto flex-1 p-0 bg-white rounded-b-2xl">
                    <table className="w-full text-xs text-left portal-table">
                        <thead className="bg-gray-50 sticky top-0 text-gray-500 shadow-sm z-10">
                            <tr>
                                <th className="py-3 pl-4 bg-gray-100">School / Reference</th>
                                <th className="py-3 bg-gray-100">District</th>
                                <th className="py-3 bg-gray-100">Details / Reason</th>
                                <th className="py-3 text-center bg-gray-100">Value</th>
                                <th className="py-3 text-center bg-gray-100">Date Log</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {data.map((row, i) => (
                                <tr key={i} className="hover:bg-teal-50/50 transition-colors group">
                                    <td className="py-2.5 pl-4 font-bold text-gray-700 group-hover:text-teal-800">
                                        {row.school_name || row.label || 'N/A'}
                                    </td>
                                    <td className="py-2.5 text-gray-500">{row.district || 'N/A'}</td>
                                    <td className="py-2.5 font-medium text-gray-600">
                                        {row.visitor_name || row.visit_type || row.gap_reason || 'N/A'}
                                    </td>
                                    <td className="py-2.5 text-center font-bold text-teal-600 bg-teal-50/30">
                                        {row.uniqueVisits !== undefined ? row.uniqueVisits : 1}
                                    </td>
                                    <td className="py-2.5 text-center text-gray-400 text-[10px] font-mono">
                                        {row.visit_date ? formatDate(row.visit_date) : row.formattedDates || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DrillDownModal;
