import React, { useMemo } from 'react';
import { Icons } from './Icons';
import { exportToExcel } from '../utils';

const PlanView = ({ data }) => {
    const priorities = useMemo(() => {
        return data.schools
            .filter(s => s.uniqueVisits < s.targetVisits)
            .map(s => {
                let score = 0;
                if (s.uniqueVisits === 0) score = 100;
                else score = 10;
                return { ...s, score, gap: s.targetVisits - s.uniqueVisits };
            })
            .sort((a, b) => b.score - a.score);
    }, [data]);

    return (
        <div className="p-3 h-full flex flex-col">
            <div className="portal-card flex-1">
                <div className="portal-card-header bg-gradient-to-r from-orange-600 to-orange-700 flex justify-between items-center text-white shadow-sm">
                    <span>Priority Visit Plan (Pending Schools)</span>
                    <button
                        onClick={() => exportToExcel(priorities, 'Priority_Visit_Plan')}
                        className="bg-white text-orange-800 hover:bg-orange-50 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm"
                    >
                        <Icons.Export className="w-3 h-3" /> EXPORT LIST
                    </button>
                </div>
                <div className="overflow-auto flex-1">
                    <table className="w-full text-xs text-left portal-table">
                        <thead className="sticky top-0">
                            <tr>
                                <th className="px-3 py-2 bg-gray-100">Priority</th>
                                <th className="px-3 py-2 bg-gray-100">School Name</th>
                                <th className="px-3 py-2 bg-gray-100">District</th>
                                <th className="px-3 py-2 bg-gray-100">Visitor</th>
                                <th className="px-3 py-2 bg-gray-100 text-center">Visit Gap</th>
                                <th className="px-3 py-2 bg-gray-100">Recommended Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {priorities.map((s, i) => (
                                <tr key={i} className="hover:bg-orange-50 transition-colors">
                                    <td className="px-3 py-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${s.score === 100 ? 'bg-red-600' : 'bg-yellow-600'}`}>
                                            {s.score === 100 ? 'HIGH' : 'MED'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 font-medium">{s.school_name}</td>
                                    <td className="px-3 py-2">{s.district}</td>
                                    <td className="px-3 py-2">{s.visitor_name}</td>
                                    <td className="px-3 py-2 text-center font-bold text-red-600">-{s.gap}</td>
                                    <td className="px-3 py-2 text-teal-700 font-semibold">
                                        {s.score === 100 ? "⚠️ URGENT: Visit Immediately" : "Plan visit this week"}
                                    </td>
                                </tr>
                            ))}
                            {priorities.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="text-center p-8 text-gray-400 italic">
                                        All schools are fully visited! Excellent work.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PlanView;
