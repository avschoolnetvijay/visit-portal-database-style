import React, { useMemo } from 'react';
import { Icons } from './Icons';
import { exportToExcel } from '../utils';

const ReportsView = ({ data }) => {
    const teamReport = useMemo(() => {
        return data.schools.map(s => {
            const isCompleted = s.uniqueVisits >= s.targetVisits;
            return {
                Visitor_Name: s.visitor_name || 'Unassigned',
                District: s.district,
                Block: s.block,
                School_Name: s.school_name,
                UDISE_Code: s.udise_code,
                Total_Target: s.targetVisits,
                Visits_Achieved: s.uniqueVisits,
                Pending_Gap: Math.max(0, s.targetVisits - s.uniqueVisits),
                Completion_Status: isCompleted ? 'Completed' : 'Pending',
                Visit_Dates: s.formattedDates || '-'
            };
        }).sort((a, b) => {
            if (a.Visitor_Name === b.Visitor_Name) {
                return a.Completion_Status === b.Completion_Status ? 0 : a.Completion_Status === 'Pending' ? -1 : 1;
            }
            return a.Visitor_Name.localeCompare(b.Visitor_Name);
        });
    }, [data]);

    return (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
                { t: "Visitor Performance Report", d: "Detailed metrics for all field staff.", f: "Visitor_Report", src: data.schools },
                { t: "School Coverage Report", d: "Status of all assigned schools.", f: "Coverage_Report", src: data.schools },
                { t: "Raw Visit Data Dump", d: "Cleaned list of all individual visit records.", f: "Raw_Visits", src: data.visits }
            ].map((item, i) => (
                <div key={i} className="portal-card h-auto p-4 hover:shadow-md transition">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-teal-50 rounded text-teal-600"><Icons.Reports className="w-6 h-6" /></div>
                        <div className="text-left">
                            <h3 className="font-bold text-gray-700 text-sm">{item.t}</h3>
                            <p className="text-xs text-gray-500">{item.d}</p>
                        </div>
                    </div>
                    <button onClick={() => exportToExcel(item.src, item.f)} className="w-full bg-teal-600 text-white text-xs font-bold py-2 rounded hover:bg-teal-700 transition">
                        DOWNLOAD EXCEL
                    </button>
                </div>
            ))}

            <div className="portal-card h-auto p-4 hover:shadow-md transition">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-50 rounded text-purple-600"><Icons.Users className="w-6 h-6" /></div>
                    <div className="text-left">
                        <h3 className="font-bold text-gray-700 text-sm">Team Wise Target Report</h3>
                        <p className="text-xs text-gray-500">Detailed target vs achievement list per visitor & school.</p>
                    </div>
                </div>
                <button onClick={() => exportToExcel(teamReport, 'Team_Target_Raw_Data')} className="w-full bg-purple-600 text-white text-xs font-bold py-2 rounded hover:bg-purple-700 transition">
                    DOWNLOAD EXCEL
                </button>
            </div>
        </div>
    );
};

export default ReportsView;
