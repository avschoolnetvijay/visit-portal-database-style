import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell } from 'recharts';
import { Icons } from './Icons';

const PerformanceView = ({ data }) => {
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
                            <Tooltip cursor={{ fill: '#f0f9ff' }} contentStyle={{ borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', zIndex: 100 }} />
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
                            {visitors.map((v, i) => {
                                return (
                                    <tr key={i} className="hover:bg-teal-50 transition-colors">
                                        <td className="px-3 py-2 font-medium text-teal-800">{v.name}</td>
                                        <td className="px-3 py-2">{v.district}</td>
                                        <td className="px-3 py-2 text-center">{v.assigned}</td>
                                        <td className="px-3 py-2 text-center text-green-600 font-bold">{v.schoolsCompleted}</td>
                                        <td className="px-3 py-2 text-center text-red-600 font-bold">{v.schoolsPending}</td>
                                        <td className="px-3 py-2 text-center text-gray-600">{v.unique}</td>
                                        <td className="px-3 py-2 text-center">
                                            <div className="flex items-center gap-2 justify-center">
                                                <div className="w-12 bg-gray-200 h-1.5 rounded-full overflow-hidden">
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
            </div>
        </div>
    );
};

export default PerformanceView;
