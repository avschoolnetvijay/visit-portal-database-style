import React, { useMemo } from 'react';
import { exportToExcel } from '../utils';
import { Icons } from './Icons';

const FieldTeamPerformance = ({ 
    schools, 
    visits, 
    jhpmsLab, 
    edustat, 
    manpower,
    startDate,
    endDate,
    selProjects,
    selDistricts,
    selBlocks
}) => {
    
    const performanceData = useMemo(() => {
        // 1. Filter schools based on global filters (optional, but requested by standard usage)
        let fSchools = schools;
        if (selProjects && selProjects.length) fSchools = fSchools.filter(s => selProjects.includes(s.project_name));
        if (selDistricts && selDistricts.length) fSchools = fSchools.filter(s => selDistricts.includes(s.district));
        if (selBlocks && selBlocks.length) fSchools = fSchools.filter(s => selBlocks.includes(s.block));

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Map CC names to their aggregated data
        const ccMap = {};

        // Helper to get normalized keys from row
        const getVal = (row, keyMatch) => {
            const key = Object.keys(row).find(k => k.toLowerCase().includes(keyMatch.toLowerCase()));
            return key ? row[key] : null;
        };

        // Initialize CCs
        fSchools.forEach(s => {
            const cc = s.visitor_name || 'Unassigned';
            const district = s.district || '-';
            const ccKey = `${cc}_${district}`;
            
            if (!ccMap[ccKey]) {
                ccMap[ccKey] = {
                    district,
                    ccName: cc,
                    totalSchools: 0,
                    instructorWorking: 0,
                    cpuInstalled: 0,
                    cpuUsed: 0,
                    miniPcInstalled: 0,
                    miniPcUsed: 0,
                    totalCpuHours: 0,
                    totalMiniPcHours: 0,
                    ictClasses: 0,
                    smartClasses: 0,
                    totalIctVisits: 0,
                    totalSmartVisits: 0,
                    udises: new Set()
                };
            }
            ccMap[ccKey].totalSchools++;
            ccMap[ccKey].udises.add(String(s.udise_code || '').trim());
        });

        // 2. Process Manpower (Count working instructors)
        manpower.forEach(m => {
            const udise = String(m.udise || getVal(m, 'udise') || '').trim();
            const status = String(getVal(m, 'status') || '').toUpperCase();
            if (status.includes('WORKING')) {
                // Find which CC owns this UDISE
                Object.values(ccMap).forEach(ccData => {
                    if (ccData.udises.has(udise)) {
                        ccData.instructorWorking++;
                    }
                });
            }
        });

        // Parse HH:MM:SS to hours
        const parseHours = (timeStr) => {
            if (!timeStr) return 0;
            const parts = String(timeStr).split(':');
            if (parts.length >= 2) {
                return parseInt(parts[0], 10) + (parseInt(parts[1], 10) / 60);
            }
            return parseFloat(timeStr) || 0;
        };

        // 3. Process Edustat (CPU / Mini PC usage)
        edustat.forEach(e => {
            const udise = String(e.udise || getVal(e, 'udise') || '').trim();
            const device = String(getVal(e, 'device') || '').toUpperCase();
            const installed = String(getVal(e, 'installed') || '').toUpperCase();
            const hours = parseHours(getVal(e, 'total used hours'));
            
            Object.values(ccMap).forEach(ccData => {
                if (ccData.udises.has(udise)) {
                    if (device.includes('CPU')) {
                        if (installed.includes('YES')) ccData.cpuInstalled++;
                        if (hours > 0) ccData.cpuUsed++;
                        ccData.totalCpuHours += hours;
                    } else if (device.includes('MINI')) {
                        if (installed.includes('YES')) ccData.miniPcInstalled++;
                        if (hours > 0) ccData.miniPcUsed++;
                        ccData.totalMiniPcHours += hours;
                    }
                }
            });
        });

        // 4. Process JHPMS Lab Uses (ICT Classes & Smart Classes)
        jhpmsLab.forEach(l => {
            const udise = String(l.udise || getVal(l, 'udise') || '').trim();
            const labType = String(l.labType || getVal(l, 'lab') || '').toUpperCase();
            const subject = String(l.subject || getVal(l, 'sub') || '').toUpperCase();
            
            // We count all classes matching the UDISE, regardless of date, 
            // since JHPMS files might cover a wider range than visit reports.
            Object.values(ccMap).forEach(ccData => {
                if (ccData.udises.has(udise)) {
                    if (labType.includes('ICT') && subject.includes('COMPUTER')) {
                        ccData.ictClasses++;
                    } else if (labType.includes('SMART')) {
                        ccData.smartClasses++;
                    }
                }
            });
        });

        // 5. Process Visits (Total ICT Visit / Total Smart Visit)
        visits.forEach(v => {
            const udise = String(v.udise_code || '').trim();
            const d = new Date(v.visit_date);
            const type = (v.visit_type || '').toLowerCase();
            
            if (!isNaN(d.getTime()) && d >= start && d <= end) {
                Object.values(ccMap).forEach(ccData => {
                    if (ccData.udises.has(udise)) {
                        if (type.includes('ict')) ccData.totalIctVisits++;
                        if (type.includes('smart')) ccData.totalSmartVisits++;
                    }
                });
            }
        });

        // Final Calculations (Averages)
        const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
        
        let finalData = Object.values(ccMap).map((c, idx) => {
            const cpuNotUsed = Math.max(0, c.cpuInstalled - c.cpuUsed);
            const miniPcNotUsed = Math.max(0, c.miniPcInstalled - c.miniPcUsed);
            
            const avgCpu = c.cpuInstalled > 0 ? (c.totalCpuHours / days / c.cpuInstalled) : 0;
            const avgMini = c.miniPcInstalled > 0 ? (c.totalMiniPcHours / days / c.miniPcInstalled) : 0;
            const avgClasses = c.totalSchools > 0 ? (c.ictClasses / (days * c.totalSchools)) : 0;
            const avgSmartClasses = c.totalSchools > 0 ? (c.smartClasses / (days * c.totalSchools)) : 0;
            
            return {
                slno: idx + 1,
                district: c.district,
                ccName: c.ccName,
                totalSchools: c.totalSchools,
                instructorWorking: c.instructorWorking,
                cpuInstalled: c.cpuInstalled,
                cpuUsed: c.cpuUsed,
                cpuNotUsed,
                miniPcInstalled: c.miniPcInstalled,
                miniPcUsed: c.miniPcUsed,
                miniPcNotUsed,
                totalCpuHours: c.totalCpuHours.toFixed(2),
                totalMiniPcHours: c.totalMiniPcHours.toFixed(2),
                avgCpu: avgCpu.toFixed(5),
                avgMini: avgMini.toFixed(5),
                ictClasses: c.ictClasses,
                avgClasses: avgClasses.toFixed(5),
                smartClasses: c.smartClasses,
                avgSmartClasses: avgSmartClasses.toFixed(5),
                totalIctVisits: c.totalIctVisits,
                totalSmartVisits: c.totalSmartVisits,
                grandTotal: c.totalIctVisits + c.totalSmartVisits
            };
        });

        // Sort descending by Grand Total by default
        finalData.sort((a, b) => b.grandTotal - a.grandTotal);
        
        // Re-assign serial numbers after sort
        finalData.forEach((row, i) => row.slno = i + 1);

        return finalData;

    }, [schools, visits, jhpmsLab, edustat, manpower, startDate, endDate, selProjects, selDistricts, selBlocks]);

    const handleExport = () => {
        const exportFormat = performanceData.map(d => ({
            'Slno': d.slno,
            'School_DISTRICT': d.district,
            'Cluster Coordinator/ DEF Name': d.ccName,
            'No.of Schools': d.totalSchools,
            'No. of Instructor Working': d.instructorWorking,
            'No.Of CPU Installed': d.cpuInstalled,
            'No.Of CPU Used': d.cpuUsed,
            'No. Of CPU Not Used': d.cpuNotUsed,
            'No.Of Mini PC Installed': d.miniPcInstalled,
            'No. Of Mini PC Used': d.miniPcUsed,
            'No .Of Mini PC Not Used': d.miniPcNotUsed,
            'Total Hours Used ( CPU)': d.totalCpuHours,
            'Total Hours Used ( Mini PC)': d.totalMiniPcHours,
            'Average Hours/ Day/ Schools/ CPU': d.avgCpu,
            'Average Hours/ Day/ Schools/ Mini PC': d.avgMini,
            'ICT Classes': d.ictClasses,
            'Avg Classes/per school/Day': d.avgClasses,
            'Smart Classes': d.smartClasses,
            'Avg Smart Classes/per school/Day': d.avgSmartClasses,
            'Total ICT Visit': d.totalIctVisits,
            'Total Smart Visit': d.totalSmartVisits,
            'GrandTotal': d.grandTotal
        }));
        exportToExcel(exportFormat, 'Field_Team_Performance_Report');
    };

    if (!schools.length) {
        return (
            <div className="p-10 text-center text-gray-500 bg-white/80 rounded-2xl m-4 shadow-sm border border-white/40">
                Please go to Setup and upload School Master data first.
            </div>
        );
    }

    if (!manpower.length && !jhpmsLab.length && !edustat.length) {
        return (
            <div className="p-10 text-center text-gray-500 bg-white/80 rounded-2xl m-4 shadow-sm border border-white/40">
                Please upload JHPMS Lab, Edustat, and Instructor Profile data in the Setup tab to view field team performance.
            </div>
        );
    }

    return (
        <div className="p-4 h-full flex flex-col space-y-4 animate-fade-in">
            <div className="flex justify-between items-center bg-white/80 p-4 rounded-xl shadow-sm border border-white/40">
                <div>
                    <h2 className="text-lg font-bold text-teal-900 flex items-center gap-2">
                        <Icons.Performance className="w-5 h-5 text-teal-600" />
                        Field Team Performance Dashboard
                    </h2>
                    <p className="text-xs text-gray-500">
                        Aggregated metrics for CC/DEF based on School Master, Visits, Edustat, and JHPMS Lab Data.
                    </p>
                </div>
                <button
                    onClick={handleExport}
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2 shadow-md shadow-teal-200 transition-all hover:-translate-y-0.5 text-sm font-bold"
                >
                    <Icons.Export className="w-4 h-4" /> Export Excel
                </button>
            </div>

            <div className="flex-1 overflow-auto bg-white/90 rounded-xl shadow-inner border border-gray-200">
                <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-gradient-to-r from-teal-800 to-teal-700 text-white sticky top-0 z-10 shadow-md">
                        <tr>
                            <th className="p-3 border-r border-teal-600/30">Slno</th>
                            <th className="p-3 border-r border-teal-600/30">School_DISTRICT</th>
                            <th className="p-3 border-r border-teal-600/30">Cluster Coordinator/ DEF Name</th>
                            <th className="p-3 border-r border-teal-600/30 text-center">No.of Schools</th>
                            <th className="p-3 border-r border-teal-600/30 text-center">No. of Instructor Working</th>
                            <th className="p-3 border-r border-teal-600/30 text-center bg-blue-900/40">No.Of CPU Installed</th>
                            <th className="p-3 border-r border-teal-600/30 text-center bg-blue-900/40">No.Of CPU Used</th>
                            <th className="p-3 border-r border-teal-600/30 text-center bg-blue-900/40 text-red-200">No. Of CPU Not Used</th>
                            <th className="p-3 border-r border-teal-600/30 text-center bg-purple-900/40">No.Of Mini PC Installed</th>
                            <th className="p-3 border-r border-teal-600/30 text-center bg-purple-900/40">No. Of Mini PC Used</th>
                            <th className="p-3 border-r border-teal-600/30 text-center bg-purple-900/40 text-red-200">No .Of Mini PC Not Used</th>
                            <th className="p-3 border-r border-teal-600/30 text-center bg-orange-900/40">Total Hours Used (CPU)</th>
                            <th className="p-3 border-r border-teal-600/30 text-center bg-orange-900/40">Total Hours Used (Mini PC)</th>
                            <th className="p-3 border-r border-teal-600/30 text-center bg-emerald-900/40">Avg Hrs/Day/Sch/CPU</th>
                            <th className="p-3 border-r border-teal-600/30 text-center bg-emerald-900/40">Avg Hrs/Day/Sch/Mini PC</th>
                            <th className="p-3 border-r border-teal-600/30 text-center bg-pink-900/40">ICT Classes</th>
                            <th className="p-3 border-r border-teal-600/30 text-center bg-pink-900/40">Avg Classes/per school/Day</th>
                            <th className="p-3 border-r border-teal-600/30 text-center bg-yellow-900/40">Smart Classes</th>
                            <th className="p-3 border-r border-teal-600/30 text-center bg-yellow-900/40">Avg Smart Classes/per school/Day</th>
                            <th className="p-3 border-r border-teal-600/30 text-center">Total ICT Visit</th>
                            <th className="p-3 border-r border-teal-600/30 text-center">Total Smart Visit</th>
                            <th className="p-3 text-center bg-teal-900">GrandTotal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                        {performanceData.map((row, i) => (
                            <tr key={i} className="hover:bg-teal-50/50 transition-colors">
                                <td className="p-3 border-r border-gray-100 text-center font-medium">{row.slno}</td>
                                <td className="p-3 border-r border-gray-100">{row.district}</td>
                                <td className="p-3 border-r border-gray-100 font-bold text-teal-800">{row.ccName}</td>
                                <td className="p-3 border-r border-gray-100 text-center">{row.totalSchools}</td>
                                <td className="p-3 border-r border-gray-100 text-center font-medium text-blue-700">{row.instructorWorking}</td>
                                
                                <td className="p-3 border-r border-gray-100 text-center bg-blue-50/30">{row.cpuInstalled}</td>
                                <td className="p-3 border-r border-gray-100 text-center bg-blue-50/30">{row.cpuUsed}</td>
                                <td className={`p-3 border-r border-gray-100 text-center bg-blue-50/30 font-bold ${row.cpuNotUsed > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                    {row.cpuNotUsed}
                                </td>
                                
                                <td className="p-3 border-r border-gray-100 text-center bg-purple-50/30">{row.miniPcInstalled}</td>
                                <td className="p-3 border-r border-gray-100 text-center bg-purple-50/30">{row.miniPcUsed}</td>
                                <td className={`p-3 border-r border-gray-100 text-center bg-purple-50/30 font-bold ${row.miniPcNotUsed > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                    {row.miniPcNotUsed}
                                </td>
                                
                                <td className="p-3 border-r border-gray-100 text-center bg-orange-50/30 font-medium">{row.totalCpuHours}</td>
                                <td className="p-3 border-r border-gray-100 text-center bg-orange-50/30 font-medium">{row.totalMiniPcHours}</td>
                                
                                <td className="p-3 border-r border-gray-100 text-center bg-emerald-50/30 text-emerald-700 font-bold">{row.avgCpu}</td>
                                <td className="p-3 border-r border-gray-100 text-center bg-emerald-50/30 text-emerald-700 font-bold">{row.avgMini}</td>
                                
                                <td className="p-3 border-r border-gray-100 text-center bg-pink-50/30 text-pink-700 font-bold">{row.ictClasses}</td>
                                <td className="p-3 border-r border-gray-100 text-center bg-pink-50/30">{row.avgClasses}</td>
                                
                                <td className="p-3 border-r border-gray-100 text-center bg-yellow-50/30 text-yellow-700 font-bold">{row.smartClasses}</td>
                                <td className="p-3 border-r border-gray-100 text-center bg-yellow-50/30">{row.avgSmartClasses}</td>
                                
                                <td className="p-3 border-r border-gray-100 text-center">{row.totalIctVisits}</td>
                                <td className="p-3 border-r border-gray-100 text-center">{row.totalSmartVisits}</td>
                                <td className="p-3 text-center font-extrabold text-teal-800 bg-teal-50">{row.grandTotal}</td>
                            </tr>
                        ))}
                        {performanceData.length === 0 && (
                            <tr>
                                <td colSpan="20" className="p-10 text-center text-gray-400 italic">No data matches the selected filters.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FieldTeamPerformance;
