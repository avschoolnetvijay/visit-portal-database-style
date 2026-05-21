import React, { useMemo } from 'react';
import { Icons } from './Icons';
import { exportToExcel } from '../utils';

const PlanView = ({ data }) => {
    const priorities = useMemo(() => {
        const today = new Date();
        return data.schools
            .filter(s => s.uniqueVisits < s.targetVisits)
            .map(s => {
                const gap = s.targetVisits - s.uniqueVisits;
                
                // 1. Calculate baseline completion gap percentage (0 to 100)
                const completionPct = s.uniqueVisits / s.targetVisits;
                let score = Math.round((1 - completionPct) * 100);

                // 2. Add recency penalty to boost priority of schools not visited for a long time
                if (s.uniqueVisits > 0 && s.lastVisit) {
                    const daysSince = Math.floor((today - new Date(s.lastVisit)) / (1000 * 60 * 60 * 24));
                    if (daysSince > 45) score += 15;
                    else if (daysSince > 30) score += 10;
                    else if (daysSince > 15) score += 5;
                    
                    // Cap penalty-boosted score at 99 so that 0-visit schools (100) are always at the top
                    score = Math.min(score, 99);
                }

                // 3. For 0-visit schools, enforce absolute maximum priority score
                if (s.uniqueVisits === 0) {
                    score = 100;
                }

                return { ...s, score, gap };
            })
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return b.gap - a.gap; // Secondary sorting by size of the visit gap
            });
    }, [data]);

    const getPriorityDetails = (score) => {
        if (score >= 85) return { label: 'CRITICAL', color: 'bg-rose-600 shadow-rose-100', action: '🚨 CRITICAL: Visit Immediately' };
        if (score >= 50) return { label: 'HIGH', color: 'bg-amber-600 shadow-amber-100', action: '⚠️ HIGH: Schedule visit soon' };
        return { label: 'MEDIUM', color: 'bg-teal-600 shadow-teal-100', action: 'Plan visit this week' };
    };

    return (
        <div className="p-3 h-full flex flex-col animate-fade-in">
            <div className="portal-card flex-1 bg-white/90 backdrop-blur-md border border-white/60 shadow-xl rounded-2xl overflow-hidden">
                <div className="portal-card-header bg-gradient-to-r from-teal-800 to-cyan-900 flex justify-between items-center text-white py-3.5 px-6 font-semibold shadow-md">
                    <div className="flex items-center gap-2">
                        <Icons.Plan className="w-5 h-5 text-teal-300" />
                        <span>Weighted Priority Visit Plan ({priorities.length} Pending)</span>
                    </div>
                    <button
                        onClick={() => exportToExcel(priorities, 'Priority_Visit_Plan')}
                        className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all duration-200"
                    >
                        <Icons.Export className="w-4 h-4 text-teal-200" /> EXPORT EXCEL LIST
                    </button>
                </div>
                
                <div className="overflow-auto flex-1 p-4">
                    <table className="w-full text-xs text-left portal-table rounded-xl overflow-hidden border border-gray-100">
                        <thead className="sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 bg-gray-50 font-bold text-gray-500 uppercase tracking-wider">Priority Band</th>
                                <th className="px-4 py-3 bg-gray-50 font-bold text-gray-500 uppercase tracking-wider">School Name</th>
                                <th className="px-4 py-3 bg-gray-50 font-bold text-gray-500 uppercase tracking-wider">District / Block</th>
                                <th className="px-4 py-3 bg-gray-50 font-bold text-gray-500 uppercase tracking-wider">Assigned Visitor</th>
                                <th className="px-4 py-3 bg-gray-50 font-bold text-gray-500 uppercase tracking-wider text-center">Visit Gap</th>
                                <th className="px-4 py-3 bg-gray-50 font-bold text-gray-500 uppercase tracking-wider">Recommended Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {priorities.map((s, i) => {
                                const details = getPriorityDetails(s.score);
                                return (
                                    <tr key={i} className="hover:bg-teal-50/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold text-white shadow-sm shrink-0 tracking-wider ${details.color}`}>
                                                    {details.label}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-bold">({s.score} pts)</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-gray-800">
                                            <div>{s.school_name}</div>
                                            <div className="text-[10px] text-gray-400 font-mono">UDISE: {s.udise_code}</div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 font-medium">
                                            <div>{s.district}</div>
                                            <div className="text-[10px] text-gray-400">{s.block}</div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700 font-medium">{s.visitor_name || 'Unassigned'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-block px-2 py-1 rounded bg-rose-50 text-rose-700 font-extrabold">
                                                -{s.gap}
                                            </span>
                                            <div className="text-[9px] text-gray-400 mt-0.5">{s.uniqueVisits} of {s.targetVisits} done</div>
                                        </td>
                                        <td className="px-4 py-3 font-bold text-teal-800">
                                            {details.action}
                                        </td>
                                    </tr>
                                );
                            })}
                            {priorities.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="text-center p-12 text-gray-400 bg-gray-50/50">
                                        <Icons.Compliance className="w-12 h-12 text-teal-500/30 mx-auto mb-3" />
                                        <span className="text-sm font-semibold text-gray-500 block">All targets satisfied</span>
                                        <span className="text-xs text-gray-400 italic mt-1 block">Every single school is fully visited. Outstanding performance!</span>
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
