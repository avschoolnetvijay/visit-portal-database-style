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

        // Two-Pass Calculation for Weighted Performance Score
        const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
        
        let maxAvgCpu = 0, maxAvgMini = 0;
        let maxAcademic = 0, maxSmart = 0;
        let maxMonitoring = 0, maxAvailability = 0;

        let pass1Data = Object.values(ccMap).map(c => {
            const cpuNotUsed = Math.max(0, c.cpuInstalled - c.cpuUsed);
            const miniPcNotUsed = Math.max(0, c.miniPcInstalled - c.miniPcUsed);
            
            const avgCpu = c.cpuInstalled > 0 ? (c.totalCpuHours / days / c.cpuInstalled) : 0;
            const avgMini = c.miniPcInstalled > 0 ? (c.totalMiniPcHours / days / c.miniPcInstalled) : 0;
            const academic = c.totalSchools > 0 ? (c.ictClasses / c.totalSchools) : 0;
            const smart = c.totalSchools > 0 ? (c.smartClasses / c.totalSchools) : 0;
            const monitoring = c.totalSchools > 0 ? ((c.totalIctVisits + c.totalSmartVisits) / c.totalSchools) : 0;
            const availability = c.totalSchools > 0 ? (c.instructorWorking / c.totalSchools) : 0;
            
            const avgClasses = c.totalSchools > 0 ? (c.ictClasses / (days * c.totalSchools)) : 0;
            const avgSmartClasses = c.totalSchools > 0 ? (c.smartClasses / (days * c.totalSchools)) : 0;

            maxAvgCpu = Math.max(maxAvgCpu, avgCpu);
            maxAvgMini = Math.max(maxAvgMini, avgMini);
            maxAcademic = Math.max(maxAcademic, academic);
            maxSmart = Math.max(maxSmart, smart);
            maxMonitoring = Math.max(maxMonitoring, monitoring);
            maxAvailability = Math.max(maxAvailability, availability);

            return {
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
                avgCpuRaw: avgCpu,
                avgMiniRaw: avgMini,
                avgCpu: avgCpu.toFixed(5),
                avgMini: avgMini.toFixed(5),
                ictClasses: c.ictClasses,
                avgClasses: avgClasses.toFixed(5),
                smartClasses: c.smartClasses,
                avgSmartClasses: avgSmartClasses.toFixed(5),
                totalIctVisits: c.totalIctVisits,
                totalSmartVisits: c.totalSmartVisits,
                grandTotal: c.totalIctVisits + c.totalSmartVisits,
                
                academicRaw: academic,
                smartRaw: smart,
                monitoringRaw: monitoring,
                availabilityRaw: availability,
            };
        });

        let finalData = pass1Data.map(c => {
            // 1. Infrastructure Utilization (25 Marks)
            const cpuUtil = c.cpuInstalled > 0 ? (c.cpuUsed / c.cpuInstalled) : 0;
            const miniUtil = c.miniPcInstalled > 0 ? (c.miniPcUsed / c.miniPcInstalled) : 0;
            const infraScore = ((cpuUtil + miniUtil) / 2) * 25;

            // 2. Usage Efficiency (20 Marks)
            const normCpu = maxAvgCpu > 0 ? (c.avgCpuRaw / maxAvgCpu) : 0;
            const normMini = maxAvgMini > 0 ? (c.avgMiniRaw / maxAvgMini) : 0;
            const usageScore = ((normCpu + normMini) / 2) * 20;

            // 3. Academic Delivery (20 Marks)
            const academicScore = maxAcademic > 0 ? (c.academicRaw / maxAcademic) * 20 : 0;

            // 4. Smart Class Delivery (10 Marks)
            const smartScore = maxSmart > 0 ? (c.smartRaw / maxSmart) * 10 : 0;

            // 5. Monitoring & Visit Score (15 Marks)
            const monitoringScore = maxMonitoring > 0 ? (c.monitoringRaw / maxMonitoring) * 15 : 0;

            // 6. Instructor Availability (10 Marks)
            const availabilityScore = maxAvailability > 0 ? (c.availabilityRaw / maxAvailability) * 10 : 0;

            const performanceScore = infraScore + usageScore + academicScore + smartScore + monitoringScore + availabilityScore;

            return {
                ...c,
                performanceScore: parseFloat(performanceScore.toFixed(2))
            };
        });

        // Sort descending by Performance Score
        finalData.sort((a, b) => b.performanceScore - a.performanceScore);
        
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
            'GrandTotal': d.grandTotal,
            'Performance Score': d.performanceScore
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

            {performanceData.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-teal-100 p-4 rounded-xl bg-white shadow-sm">
                    {/* Gold Performer */}
                    {performanceData[0] && (
                        <div className="rounded-xl border shadow-lg bg-gradient-to-br from-amber-50 to-yellow-100 border-yellow-300 p-4 flex flex-col items-center justify-center text-center transform transition-all hover:-translate-y-1 hover:shadow-xl relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-yellow-400 rounded-full opacity-20 blur-xl"></div>
                            <div className="text-4xl mb-2 drop-shadow-md">🏆</div>
                            <div className="font-extrabold text-xs text-yellow-800 uppercase tracking-wider mb-2 opacity-90">Gold Performer</div>
                            <div className="font-bold text-lg text-gray-800 leading-tight">{performanceData[0].ccName}</div>
                            <div className="text-xs text-gray-600 mt-1 font-medium">{performanceData[0].district}</div>
                            <div className="mt-3 bg-white/80 px-5 py-1.5 rounded-full font-extrabold text-sm text-yellow-700 shadow-sm border border-yellow-200">
                                Score: {performanceData[0].performanceScore}
                            </div>
                        </div>
                    )}
                    {/* Silver Performer */}
                    {performanceData[1] && (
                        <div className="rounded-xl border shadow-lg bg-gradient-to-br from-slate-50 to-gray-200 border-gray-300 p-4 flex flex-col items-center justify-center text-center transform transition-all hover:-translate-y-1 hover:shadow-xl relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-gray-400 rounded-full opacity-20 blur-xl"></div>
                            <div className="text-4xl mb-2 drop-shadow-md">🥈</div>
                            <div className="font-extrabold text-xs text-gray-600 uppercase tracking-wider mb-2 opacity-90">Silver Performer</div>
                            <div className="font-bold text-lg text-gray-800 leading-tight">{performanceData[1].ccName}</div>
                            <div className="text-xs text-gray-600 mt-1 font-medium">{performanceData[1].district}</div>
                            <div className="mt-3 bg-white/80 px-5 py-1.5 rounded-full font-extrabold text-sm text-gray-700 shadow-sm border border-gray-300">
                                Score: {performanceData[1].performanceScore}
                            </div>
                        </div>
                    )}
                    {/* Bronze Performer */}
                    {performanceData[2] && (
                        <div className="rounded-xl border shadow-lg bg-gradient-to-br from-orange-50 to-amber-100/80 border-amber-300/60 p-4 flex flex-col items-center justify-center text-center transform transition-all hover:-translate-y-1 hover:shadow-xl relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-600 rounded-full opacity-10 blur-xl"></div>
                            <div className="text-4xl mb-2 drop-shadow-md">🥉</div>
                            <div className="font-extrabold text-xs text-amber-800 uppercase tracking-wider mb-2 opacity-90">Bronze Performer</div>
                            <div className="font-bold text-lg text-gray-800 leading-tight">{performanceData[2].ccName}</div>
                            <div className="text-xs text-gray-600 mt-1 font-medium">{performanceData[2].district}</div>
                            <div className="mt-3 bg-white/80 px-5 py-1.5 rounded-full font-extrabold text-sm text-amber-800 shadow-sm border border-amber-200">
                                Score: {performanceData[2].performanceScore}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex-1 overflow-auto bg-white/90 rounded-xl shadow-inner border border-gray-200">
                <table className="w-full text-left text-xs">
                    <thead className="bg-gradient-to-r from-teal-800 to-teal-700 text-white sticky top-0 z-30 shadow-md">
                        <tr>
                            <th className="p-3 border-r border-teal-600/30 align-top sticky left-0 z-40 bg-teal-800 w-[60px] min-w-[60px] max-w-[60px]">Slno</th>
                            <th className="p-3 border-r border-teal-600/30 align-top sticky left-[60px] z-40 bg-teal-800 w-[120px] min-w-[120px] max-w-[120px]">School_DISTRICT</th>
                            <th className="p-3 border-r border-teal-600/30 align-top sticky left-[180px] z-40 bg-teal-800 w-[200px] min-w-[200px] max-w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">Cluster Coordinator/ DEF Name</th>
                            <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[80px]">No.of Schools</th>
                            <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[90px]">No. of Instructor Working</th>
                            <th className="p-3 border-r border-teal-600/30 text-center align-top bg-blue-900/40 min-w-[90px]">No.Of CPU Installed</th>
                            <th className="p-3 border-r border-teal-600/30 text-center align-top bg-blue-900/40 min-w-[80px]">No.Of CPU Used</th>
                            <th className="p-3 border-r border-teal-600/30 text-center align-top bg-blue-900/40 text-red-200 min-w-[90px]">No. Of CPU Not Used</th>
                            <th className="p-3 border-r border-teal-600/30 text-center align-top bg-purple-900/40 min-w-[90px]">No.Of Mini PC Installed</th>
                            <th className="p-3 border-r border-teal-600/30 text-center align-top bg-purple-900/40 min-w-[80px]">No. Of Mini PC Used</th>
                            <th className="p-3 border-r border-teal-600/30 text-center align-top bg-purple-900/40 text-red-200 min-w-[90px]">No .Of Mini PC Not Used</th>
                            <th className="p-3 border-r border-teal-600/30 text-center align-top bg-orange-900/40 min-w-[100px]">Total Hours Used (CPU)</th>
                            <th className="p-3 border-r border-teal-600/30 text-center align-top bg-orange-900/40 min-w-[100px]">Total Hours Used (Mini PC)</th>
                            <th className="p-3 border-r border-teal-600/30 text-center align-top bg-emerald-900/40 min-w-[100px]">Avg Hrs/Day/Sch/CPU</th>
                            <th className="p-3 border-r border-teal-600/30 text-center align-top bg-emerald-900/40 min-w-[100px]">Avg Hrs/Day/Sch/Mini PC</th>
                            <th className="p-3 border-r border-teal-600/30 text-center align-top bg-pink-900/40 min-w-[80px]">ICT Classes</th>
                            <th className="p-3 border-r border-teal-600/30 text-center align-top bg-pink-900/40 min-w-[100px]">Avg Classes/per school/Day</th>
                            <th className="p-3 border-r border-teal-600/30 text-center align-top bg-yellow-900/40 min-w-[80px]">Smart Classes</th>
                            <th className="p-3 border-r border-teal-600/30 text-center align-top bg-yellow-900/40 min-w-[100px]">Avg Smart Classes/per school/Day</th>
                            <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[80px]">Total ICT Visit</th>
                            <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[80px]">Total Smart Visit</th>
                            <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[90px]">GrandTotal</th>
                            <th className="p-3 text-center align-top bg-gradient-to-b from-indigo-700 to-indigo-800 text-white min-w-[100px] shadow-md border-l border-indigo-600 cursor-help" title="Calculated from utilization, academic delivery, monitoring and efficiency metrics">Performance Score ⓘ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700 whitespace-nowrap">
                        {performanceData.map((row, i) => (
                            <tr key={i} className="hover:bg-teal-50/50 transition-colors group">
                                <td className="p-3 border-r border-gray-100 text-center font-medium sticky left-0 z-20 bg-white group-hover:bg-teal-50/80 w-[60px] min-w-[60px] max-w-[60px] overflow-hidden text-ellipsis">{row.slno}</td>
                                <td className="p-3 border-r border-gray-100 sticky left-[60px] z-20 bg-white group-hover:bg-teal-50/80 w-[120px] min-w-[120px] max-w-[120px] overflow-hidden text-ellipsis">{row.district}</td>
                                <td className="p-3 border-r border-gray-100 font-bold text-teal-800 sticky left-[180px] z-20 bg-white group-hover:bg-teal-50/80 w-[200px] min-w-[200px] max-w-[200px] overflow-hidden text-ellipsis shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] flex items-center gap-2">
                                    {row.slno === 1 && <span className="px-1.5 py-0.5 rounded text-[10px] bg-yellow-500 text-white shadow-sm flex-shrink-0">#1</span>}
                                    {row.slno === 2 && <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-400 text-white shadow-sm flex-shrink-0">#2</span>}
                                    {row.slno === 3 && <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-600 text-white shadow-sm flex-shrink-0">#3</span>}
                                    <span className="truncate">{row.ccName}</span>
                                </td>
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
                                <td className="p-3 border-r border-gray-100 text-center font-extrabold text-teal-800 bg-teal-50/50">{row.grandTotal}</td>
                                <td className="p-3 text-center font-extrabold text-indigo-700 bg-indigo-50 border-l border-indigo-100 text-sm shadow-[inset_1px_0_0_rgba(0,0,0,0.05)]">{row.performanceScore}</td>
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
