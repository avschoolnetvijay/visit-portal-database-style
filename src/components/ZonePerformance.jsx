import React, { useMemo, useState, useEffect } from 'react';
import { exportToExcel, parseDateRobust } from '../utils';
import { Icons } from './Icons';

const cleanUdise = (u) => {
    if (!u) return '';
    let s = String(u).trim();
    if (s.endsWith('.0')) {
        s = s.substring(0, s.length - 2);
    }
    return s;
};

const ZonePerformance = ({
    schools,
    visits,
    jhpmsLab,
    edustat,
    edustatMaster = [],
    manpower,
    startDate,
    endDate,
    selZones = [],
    selProjects,
    selDistricts,
    selBlocks,
    selCCs = [],
    ccNameMapping = {},
    workingDays,
    onRegisterExport,
    userPermissions = null
}) => {
    const [activeZoneDetail, setActiveZoneDetail] = useState(null);
    const [detailTab, setDetailTab] = useState('cc'); // 'cc' or 'schools'
    const [searchQuery, setSearchQuery] = useState('');

    // helper to format date
    const formatDateStr = (dateInput) => {
        if (!dateInput) return null;
        const d = parseDateRobust(dateInput);
        if (!d || isNaN(d.getTime())) return null;
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const formatDateClean = (dateInput) => {
        if (!dateInput) return '-';
        const d = parseDateRobust(dateInput);
        if (!d || isNaN(d.getTime())) return '-';
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}-${mm}-${yyyy}`;
    };

    const getVal = (row, keyMatch) => {
        const key = Object.keys(row).find(k => k.toLowerCase().includes(keyMatch.toLowerCase()));
        return key ? row[key] : null;
    };

    // Calculate Zone-wise Performance Data
    const zoneData = useMemo(() => {
        // Filter schools based on global filters
        let fSchools = schools;
        if (selZones && selZones.length) fSchools = fSchools.filter(s => selZones.includes(s.zone));
        if (selProjects && selProjects.length) fSchools = fSchools.filter(s => selProjects.includes(s.project_name));
        if (selDistricts && selDistricts.length) fSchools = fSchools.filter(s => selDistricts.includes(s.district));
        if (selBlocks && selBlocks.length) fSchools = fSchools.filter(s => selBlocks.includes(s.block));
        if (selCCs && selCCs.length) {
            fSchools = fSchools.filter(s => {
                const name = s.visitor_name || '';
                const resolved = ccNameMapping[name] || name;
                return selCCs.includes(resolved) || selCCs.includes(name);
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Group into Zones
        const zoneMap = {};

        fSchools.forEach(s => {
            const zone = s.zone || 'Unassigned Zone';
            if (!zoneMap[zone]) {
                zoneMap[zone] = {
                    zoneName: zone,
                    totalSchools: 0,
                    projects: new Set(),
                    districts: new Set(),
                    ccNames: new Set(),
                    instructorWorking: 0,
                    cpuInstalled: 0,
                    cpuUsed: 0,
                    miniPcInstalled: 0,
                    miniPcUsed: 0,
                    panelInstalled: 0,
                    panelUsed: 0,
                    edustatNotInstalled: 0,
                    totalCpuHours: 0,
                    totalMiniPcHours: 0,
                    totalPanelHours: 0,
                    ictClasses: 0,
                    smartClasses: 0,
                    totalIctVisits: 0,
                    totalSmartVisits: 0,
                    udises: new Set()
                };
            }
            zoneMap[zone].totalSchools++;
            if (s.project_name) zoneMap[zone].projects.add(s.project_name);
            if (s.district) zoneMap[zone].districts.add(s.district);
            if (s.visitor_name) zoneMap[zone].ccNames.add(s.visitor_name);
            zoneMap[zone].udises.add(cleanUdise(s.udise_code));
        });

        // Add Manpower
        manpower.forEach(m => {
            const udise = cleanUdise(m.udise || getVal(m, 'udise'));
            const status = String(getVal(m, 'status') || '').trim();
            const sUpper = status.toUpperCase();
            const isWorking = sUpper.includes('WORKING') || sUpper.includes('ACTIVE') || status === '';

            if (isWorking) {
                Object.values(zoneMap).forEach(zData => {
                    if (zData.udises.has(udise)) {
                        zData.instructorWorking++;
                    }
                });
            }
        });

        // Add Edustat Master Baseline
        (edustatMaster || []).forEach(m => {
            const udise = String(m.udise).trim();
            const device = String(m.device || '').toUpperCase();
            const installed = String(m.installed || '').toUpperCase();

            if (installed === 'YES') {
                Object.values(zoneMap).forEach(zData => {
                    if (zData.udises.has(udise)) {
                        if (device === 'CPU') {
                            zData.cpuInstalled++;
                        } else if (device === 'MINI PC' || device === 'THIN CLIENT') {
                            zData.miniPcInstalled++;
                        } else if (device === 'INTERACTIVE FLAT PANEL') {
                            zData.panelInstalled++;
                        }
                    }
                });
            } else if (installed === 'NO') {
                Object.values(zoneMap).forEach(zData => {
                    if (zData.udises.has(udise)) {
                        zData.edustatNotInstalled++;
                    }
                });
            }
        });

        // Active Serials in range
        const filteredEdustat = edustat.filter(row => {
            const dateStr = formatDateStr(row.date || getVal(row, 'date'));
            return dateStr && dateStr >= startDate && dateStr <= endDate;
        });

        const activeSerials = new Set();
        filteredEdustat.forEach(e => {
            if (e.hours > 0 && e.serial) {
                activeSerials.add(String(e.serial).trim());
            }
        });

        const serialMap = {};
        (edustatMaster || []).forEach(m => {
            if (m.serial) {
                serialMap[String(m.serial).trim()] = String(m.device || '').toUpperCase();
            }
        });

        // Accumulate active run hours
        filteredEdustat.forEach(e => {
            const udise = String(e.udise).trim();
            const serial = String(e.serial).trim();
            const hours = Number(e.hours) || 0;
            const deviceType = serialMap[serial] || 'CPU';

            Object.values(zoneMap).forEach(zData => {
                if (zData.udises.has(udise)) {
                    if (deviceType === 'CPU') {
                        zData.totalCpuHours += hours;
                    } else if (deviceType === 'MINI PC' || deviceType === 'THIN CLIENT') {
                        zData.totalMiniPcHours += hours;
                    } else if (deviceType === 'INTERACTIVE FLAT PANEL') {
                        zData.totalPanelHours += hours;
                    }
                }
            });
        });

        // Calculate Used counts
        (edustatMaster || []).forEach(m => {
            const udise = String(m.udise).trim();
            const serial = String(m.serial).trim();
            const device = String(m.device || '').toUpperCase();
            const installed = String(m.installed || '').toUpperCase();

            if (installed === 'YES' && activeSerials.has(serial)) {
                Object.values(zoneMap).forEach(zData => {
                    if (zData.udises.has(udise)) {
                        if (device === 'CPU') {
                            zData.cpuUsed++;
                        } else if (device === 'MINI PC' || device === 'THIN CLIENT') {
                            zData.miniPcUsed++;
                        } else if (device === 'INTERACTIVE FLAT PANEL') {
                            zData.panelUsed++;
                        }
                    }
                });
            }
        });

        // JHPMS classes in range
        jhpmsLab.forEach(l => {
            const udise = String(l.udise || getVal(l, 'udise') || '').trim();
            const labType = String(l.labType || getVal(l, 'lab') || '').toUpperCase();
            const subject = String(l.subject || getVal(l, 'sub') || '').toUpperCase();
            const dateStr = formatDateStr(l.date || getVal(l, 'date'));

            if (dateStr && dateStr >= startDate && dateStr <= endDate) {
                Object.values(zoneMap).forEach(zData => {
                    if (zData.udises.has(udise)) {
                        if (subject.split(/[^A-Z0-9]+/).includes('MIS')) {
                            // Ignore MIS
                        } else if (labType.includes('ICT') && subject.includes('COMPUTER')) {
                            zData.ictClasses++;
                        } else if (labType.includes('SMART')) {
                            zData.smartClasses++;
                        }
                    }
                });
            }
        });

        // Visits in range
        visits.forEach(v => {
            const udise = String(v.udise_code || '').trim();
            const dateStr = formatDateStr(v.visit_date || getVal(v, 'date'));
            const type = (v.visit_type || '').toLowerCase();

            if (dateStr && dateStr >= startDate && dateStr <= endDate) {
                Object.values(zoneMap).forEach(zData => {
                    if (zData.udises.has(udise)) {
                        if (type.includes('ict')) zData.totalIctVisits++;
                        if (type.includes('smart')) zData.totalSmartVisits++;
                    }
                });
            }
        });

        // Days calculation
        const days = Number(workingDays) && Number(workingDays) >= 1
            ? Number(workingDays)
            : Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

        let maxAvgCpu = 0, maxAvgMini = 0, maxAvgPanel = 0;
        let maxAcademic = 0, maxSmart = 0;
        let maxMonitoring = 0, maxAvailability = 0;

        let pass1Data = Object.values(zoneMap).map(z => {
            const cpuNotUsed = Math.max(0, z.cpuInstalled - z.cpuUsed);
            const miniPcNotUsed = Math.max(0, z.miniPcInstalled - z.miniPcUsed);
            const panelNotUsed = Math.max(0, z.panelInstalled - z.panelUsed);

            const avgCpu = z.cpuInstalled > 0 ? (z.totalCpuHours / days / z.cpuInstalled) : 0;
            const avgMini = z.miniPcInstalled > 0 ? (z.totalMiniPcHours / days / z.miniPcInstalled) : 0;
            const avgPanel = z.panelInstalled > 0 ? (z.totalPanelHours / days / z.panelInstalled) : 0;
            const academic = z.totalSchools > 0 ? (z.ictClasses / z.totalSchools) : 0;
            const smart = z.totalSchools > 0 ? (z.smartClasses / z.totalSchools) : 0;
            const monitoring = z.totalSchools > 0 ? ((z.totalIctVisits + z.totalSmartVisits) / z.totalSchools) : 0;
            const availability = z.totalSchools > 0 ? (z.instructorWorking / z.totalSchools) : 0;

            const avgClasses = z.totalSchools > 0 ? (z.ictClasses / (days * z.totalSchools)) : 0;
            const avgSmartClasses = z.totalSchools > 0 ? (z.smartClasses / (days * z.totalSchools)) : 0;

            maxAvgCpu = Math.max(maxAvgCpu, avgCpu);
            maxAvgMini = Math.max(maxAvgMini, avgMini);
            maxAvgPanel = Math.max(maxAvgPanel, avgPanel);
            maxAcademic = Math.max(maxAcademic, academic);
            maxSmart = Math.max(maxSmart, smart);
            maxMonitoring = Math.max(maxMonitoring, monitoring);
            maxAvailability = Math.max(maxAvailability, availability);

            return {
                zoneName: z.zoneName,
                totalSchools: z.totalSchools,
                totalProjects: z.projects.size,
                totalDistricts: z.districts.size,
                totalCCs: z.ccNames.size,
                instructorWorking: z.instructorWorking,
                cpuInstalled: z.cpuInstalled,
                cpuUsed: z.cpuUsed,
                cpuNotUsed,
                miniPcInstalled: z.miniPcInstalled,
                miniPcUsed: z.miniPcUsed,
                miniPcNotUsed,
                panelInstalled: z.panelInstalled,
                panelUsed: z.panelUsed,
                panelNotUsed,
                edustatNotInstalled: z.edustatNotInstalled,
                totalCpuHours: parseFloat(z.totalCpuHours.toFixed(2)),
                totalMiniPcHours: parseFloat(z.totalMiniPcHours.toFixed(2)),
                totalPanelHours: parseFloat(z.totalPanelHours.toFixed(2)),
                avgCpuRaw: avgCpu,
                avgMiniRaw: avgMini,
                avgPanelRaw: avgPanel,
                avgCpu: avgCpu.toFixed(5),
                avgMini: avgMini.toFixed(5),
                avgPanel: avgPanel.toFixed(5),
                ictClasses: z.ictClasses,
                avgClasses: avgClasses.toFixed(5),
                smartClasses: z.smartClasses,
                avgSmartClasses: avgSmartClasses.toFixed(5),
                totalIctVisits: z.totalIctVisits,
                totalSmartVisits: z.totalSmartVisits,
                grandTotal: z.totalIctVisits + z.totalSmartVisits,
                udises: z.udises,
                ccNames: z.ccNames,
                academicRaw: academic,
                smartRaw: smart,
                monitoringRaw: monitoring,
                availabilityRaw: availability
            };
        });

        let finalData = pass1Data.map(z => {
            const cpuUtil = z.cpuInstalled > 0 ? (z.cpuUsed / z.cpuInstalled) : 0;
            const miniUtil = z.miniPcInstalled > 0 ? (z.miniPcUsed / z.miniPcInstalled) : 0;
            const panelUtil = z.panelInstalled > 0 ? (z.panelUsed / z.panelInstalled) : 0;
            const activeDeviceTypes = [cpuUtil, miniUtil, panelUtil].filter((_, i) => [z.cpuInstalled, z.miniPcInstalled, z.panelInstalled][i] > 0);
            const infraScore = (activeDeviceTypes.length > 0 ? activeDeviceTypes.reduce((a, b) => a + b, 0) / activeDeviceTypes.length : 0) * 25;

            const normCpu = maxAvgCpu > 0 ? (z.avgCpuRaw / maxAvgCpu) : 0;
            const normMini = maxAvgMini > 0 ? (z.avgMiniRaw / maxAvgMini) : 0;
            const normPanel = maxAvgPanel > 0 ? (z.avgPanelRaw / maxAvgPanel) : 0;
            const activeUsageTypes = [normCpu, normMini, normPanel].filter((_, i) => [z.cpuInstalled, z.miniPcInstalled, z.panelInstalled][i] > 0);
            const usageScore = (activeUsageTypes.length > 0 ? activeUsageTypes.reduce((a, b) => a + b, 0) / activeUsageTypes.length : 0) * 20;

            const academicScore = maxAcademic > 0 ? (z.academicRaw / maxAcademic) * 20 : 0;
            const smartScore = maxSmart > 0 ? (z.smartRaw / maxSmart) * 10 : 0;
            const monitoringScore = maxMonitoring > 0 ? (z.monitoringRaw / maxMonitoring) * 15 : 0;
            const availabilityScore = maxAvailability > 0 ? (z.availabilityRaw / maxAvailability) * 10 : 0;

            const performanceScore = infraScore + usageScore + academicScore + smartScore + monitoringScore + availabilityScore;

            return {
                ...z,
                performanceScore: parseFloat(performanceScore.toFixed(2))
            };
        });

        finalData.sort((a, b) => b.performanceScore - a.performanceScore);
        finalData.forEach((row, idx) => row.slno = idx + 1);

        return finalData;

    }, [schools, visits, jhpmsLab, edustat, edustatMaster, manpower, startDate, endDate, selZones, selProjects, selDistricts, selBlocks, selCCs, ccNameMapping, workingDays]);

    // Active drill down detailed view contents
    const activeZoneDetailsData = useMemo(() => {
        if (!activeZoneDetail) return null;

        const zoneUdises = activeZoneDetail.udises;
        const zoneCCs = activeZoneDetail.ccNames;

        if (detailTab === 'cc') {
            // Find all CCs operating in this zone
            // We can map over the CC names in this zone, and calculate their performance score
            // We'll extract only the schools for this CC *within* this zone
            const ccList = Array.from(zoneCCs);

            const ccPerf = ccList.map((cc, i) => {
                const ccSchools = schools.filter(s => (s.visitor_name === cc || ccNameMapping[s.visitor_name] === cc) && zoneUdises.has(cleanUdise(s.udise_code)));
                const ccUdises = new Set(ccSchools.map(s => cleanUdise(s.udise_code)));

                // Count metrics for this CC in this Zone
                let totalSchools = ccSchools.length;
                let instructorWorking = 0;
                let cpuInstalled = 0;
                let cpuUsed = 0;
                let miniPcInstalled = 0;
                let miniPcUsed = 0;
                let panelInstalled = 0;
                let panelUsed = 0;
                let edustatNotInstalled = 0;
                let totalCpuHours = 0;
                let totalMiniPcHours = 0;
                let totalPanelHours = 0;
                let ictClasses = 0;
                let smartClasses = 0;
                let totalIctVisits = 0;
                let totalSmartVisits = 0;

                // manpower
                manpower.forEach(m => {
                    const udise = cleanUdise(m.udise || getVal(m, 'udise'));
                    if (ccUdises.has(udise)) {
                        const status = String(getVal(m, 'status') || '').trim();
                        const isWorking = status.toUpperCase().includes('WORKING') || status.toUpperCase().includes('ACTIVE') || status === '';
                        if (isWorking) instructorWorking++;
                    }
                });

                // edustatMaster
                (edustatMaster || []).forEach(m => {
                    const udise = String(m.udise).trim();
                    if (ccUdises.has(udise)) {
                        const device = String(m.device || '').toUpperCase();
                        const installed = String(m.installed || '').toUpperCase();
                        if (installed === 'YES') {
                            if (device === 'CPU') cpuInstalled++;
                            else if (device === 'MINI PC' || device === 'THIN CLIENT') miniPcInstalled++;
                            else if (device === 'INTERACTIVE FLAT PANEL') panelInstalled++;
                        } else if (installed === 'NO') {
                            edustatNotInstalled++;
                        }
                    }
                });

                // Edustat run logs
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                const days = Number(workingDays) && Number(workingDays) >= 1
                    ? Number(workingDays)
                    : Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

                const filteredEdustat = edustat.filter(row => {
                    const dateStr = formatDateStr(row.date || getVal(row, 'date'));
                    const udise = cleanUdise(row.udise || getVal(row, 'udise'));
                    return dateStr && dateStr >= startDate && dateStr <= endDate && ccUdises.has(udise);
                });

                const activeSerials = new Set();
                filteredEdustat.forEach(e => {
                    if (e.hours > 0 && e.serial) {
                        activeSerials.add(String(e.serial).trim());
                    }
                });

                const serialMap = {};
                (edustatMaster || []).forEach(m => {
                    if (m.serial) {
                        serialMap[String(m.serial).trim()] = String(m.device || '').toUpperCase();
                    }
                });

                filteredEdustat.forEach(e => {
                    const serial = String(e.serial).trim();
                    const hours = Number(e.hours) || 0;
                    const deviceType = serialMap[serial] || 'CPU';

                    if (deviceType === 'CPU') totalCpuHours += hours;
                    else if (deviceType === 'MINI PC' || deviceType === 'THIN CLIENT') totalMiniPcHours += hours;
                    else if (deviceType === 'INTERACTIVE FLAT PANEL') totalPanelHours += hours;
                });

                (edustatMaster || []).forEach(m => {
                    const udise = String(m.udise).trim();
                    const serial = String(m.serial).trim();
                    const device = String(m.device || '').toUpperCase();
                    const installed = String(m.installed || '').toUpperCase();

                    if (ccUdises.has(udise) && installed === 'YES' && activeSerials.has(serial)) {
                        if (device === 'CPU') cpuUsed++;
                        else if (device === 'MINI PC' || device === 'THIN CLIENT') miniPcUsed++;
                        else if (device === 'INTERACTIVE FLAT PANEL') panelUsed++;
                    }
                });

                // JHPMS
                jhpmsLab.forEach(l => {
                    const udise = cleanUdise(l.udise || getVal(l, 'udise'));
                    if (ccUdises.has(udise)) {
                        const labType = String(l.labType || getVal(l, 'lab') || '').toUpperCase();
                        const subject = String(l.subject || getVal(l, 'sub') || '').toUpperCase();
                        const dateStr = formatDateStr(l.date || getVal(l, 'date'));

                        if (dateStr && dateStr >= startDate && dateStr <= endDate) {
                            if (subject.split(/[^A-Z0-9]+/).includes('MIS')) {
                                // Ignore
                            } else if (labType.includes('ICT') && subject.includes('COMPUTER')) {
                                ictClasses++;
                            } else if (labType.includes('SMART')) {
                                smartClasses++;
                            }
                        }
                    }
                });

                // Visits
                visits.forEach(v => {
                    const udise = cleanUdise(v.udise_code);
                    if (ccUdises.has(udise)) {
                        const dateStr = formatDateStr(v.visit_date || getVal(v, 'date'));
                        const type = (v.visit_type || '').toLowerCase();
                        if (dateStr && dateStr >= startDate && dateStr <= endDate) {
                            if (type.includes('ict')) totalIctVisits++;
                            if (type.includes('smart')) totalSmartVisits++;
                        }
                    }
                });

                // Compute cc local scores
                const cpuUtil = cpuInstalled > 0 ? (cpuUsed / cpuInstalled) : 0;
                const miniUtil = miniPcInstalled > 0 ? (miniPcUsed / miniPcInstalled) : 0;
                const panelUtil = panelInstalled > 0 ? (panelUsed / panelInstalled) : 0;
                const activeDeviceTypes = [cpuUtil, miniUtil, panelUtil].filter((_, index) => [cpuInstalled, miniPcInstalled, panelInstalled][index] > 0);
                const infraScore = (activeDeviceTypes.length > 0 ? activeDeviceTypes.reduce((a, b) => a + b, 0) / activeDeviceTypes.length : 0) * 25;

                const avgCpu = cpuInstalled > 0 ? (totalCpuHours / days / cpuInstalled) : 0;
                const avgMini = miniPcInstalled > 0 ? (totalMiniPcHours / days / miniPcInstalled) : 0;
                const avgPanel = panelInstalled > 0 ? (totalPanelHours / days / panelInstalled) : 0;

                // Simple local normalized scores (can just use raw average or local percentiles)
                const academic = totalSchools > 0 ? (ictClasses / totalSchools) : 0;
                const smart = totalSchools > 0 ? (smartClasses / totalSchools) : 0;
                const monitoring = totalSchools > 0 ? ((totalIctVisits + totalSmartVisits) / totalSchools) : 0;
                const availability = totalSchools > 0 ? (instructorWorking / totalSchools) : 0;

                return {
                    slno: i + 1,
                    ccName: cc,
                    totalSchools,
                    instructorWorking,
                    cpuInstalled,
                    cpuUsed,
                    miniPcInstalled,
                    miniPcUsed,
                    panelInstalled,
                    panelUsed,
                    totalCpuHours: parseFloat(totalCpuHours.toFixed(1)),
                    totalMiniPcHours: parseFloat(totalMiniPcHours.toFixed(1)),
                    totalPanelHours: parseFloat(totalPanelHours.toFixed(1)),
                    ictClasses,
                    smartClasses,
                    visitsCount: totalIctVisits + totalSmartVisits,
                    performanceScore: parseFloat((infraScore + (avgCpu * 5) + (academic * 20) + (smart * 10) + (monitoring * 15) + (availability * 10)).toFixed(1))
                };
            });

            ccPerf.sort((a, b) => b.performanceScore - a.performanceScore);
            ccPerf.forEach((row, index) => row.slno = index + 1);
            return ccPerf;
        } else {
            // Schools view
            const zoneSchools = schools.filter(s => zoneUdises.has(cleanUdise(s.udise_code)));

            const schList = zoneSchools.map((s, i) => {
                const udise = cleanUdise(s.udise_code);

                let instructorStatus = 'Vacant';
                const instructorRec = manpower.find(m => cleanUdise(m.udise || getVal(m, 'udise') || '') === udise);
                if (instructorRec) {
                    const status = String(getVal(instructorRec, 'status') || '').trim();
                    if (status.toUpperCase().includes('WORKING') || status.toUpperCase().includes('ACTIVE') || status === '') {
                        instructorStatus = 'Active';
                    } else if (status.toUpperCase().includes('PENDING')) {
                        instructorStatus = 'Pending';
                    }
                }

                // Installed devices
                let cpuInstalled = 0;
                let miniInstalled = 0;
                let panelInstalled = 0;
                (edustatMaster || []).forEach(m => {
                    if (cleanUdise(m.udise) === udise && String(m.installed || '').toUpperCase() === 'YES') {
                        const device = String(m.device || '').toUpperCase();
                        if (device === 'CPU') cpuInstalled++;
                        else if (device === 'MINI PC' || device === 'THIN CLIENT') miniInstalled++;
                        else if (device === 'INTERACTIVE FLAT PANEL') panelInstalled++;
                    }
                });

                // Utilization hours
                let totalCpuHours = 0;
                let totalMiniPcHours = 0;
                let totalPanelHours = 0;

                const serialMap = {};
                (edustatMaster || []).forEach(m => {
                    if (m.serial) {
                        serialMap[String(m.serial).trim()] = String(m.device || '').toUpperCase();
                    }
                });

                const schEdustat = edustat.filter(e => cleanUdise(e.udise || getVal(e, 'udise')) === udise && formatDateStr(e.date || getVal(e, 'date')) >= startDate && formatDateStr(e.date || getVal(e, 'date')) <= endDate);

                schEdustat.forEach(e => {
                    const serial = String(e.serial).trim();
                    const hours = Number(e.hours) || 0;
                    const deviceType = serialMap[serial] || 'CPU';

                    if (deviceType === 'CPU') totalCpuHours += hours;
                    else if (deviceType === 'MINI PC' || deviceType === 'THIN CLIENT') totalMiniPcHours += hours;
                    else if (deviceType === 'INTERACTIVE FLAT PANEL') totalPanelHours += hours;
                });

                // Classes
                let ictClasses = 0;
                let smartClasses = 0;
                jhpmsLab.forEach(l => {
                    if (cleanUdise(l.udise || getVal(l, 'udise')) === udise) {
                        const dateStr = formatDateStr(l.date || getVal(l, 'date'));
                        if (dateStr && dateStr >= startDate && dateStr <= endDate) {
                            const labType = String(l.labType || getVal(l, 'lab') || '').toUpperCase();
                            const subject = String(l.subject || getVal(l, 'sub') || '').toUpperCase();
                            if (subject.split(/[^A-Z0-9]+/).includes('MIS')) {
                                // Ignore
                            } else if (labType.includes('ICT') && subject.includes('COMPUTER')) {
                                ictClasses++;
                            } else if (labType.includes('SMART')) {
                                smartClasses++;
                            }
                        }
                    }
                });

                // Visits
                let visitsCount = 0;
                let lastVisitDate = '-';
                visits.forEach(v => {
                    if (cleanUdise(v.udise_code) === udise) {
                        const dateStr = formatDateStr(v.visit_date);
                        if (dateStr && dateStr >= startDate && dateStr <= endDate) {
                            visitsCount++;
                        }
                        if (dateStr) {
                            if (lastVisitDate === '-' || dateStr > lastVisitDate) {
                                lastVisitDate = dateStr;
                            }
                        }
                    }
                });

                return {
                    udise,
                    schoolName: s.school_name || s.school || '-',
                    project: s.project_name || '-',
                    district: s.district || '-',
                    block: s.block || '-',
                    ccName: s.visitor_name || 'Unassigned',
                    instructorStatus,
                    cpuInstalled,
                    totalCpuHours: parseFloat(totalCpuHours.toFixed(1)),
                    miniInstalled,
                    totalMiniPcHours: parseFloat(totalMiniPcHours.toFixed(1)),
                    panelInstalled,
                    totalPanelHours: parseFloat(totalPanelHours.toFixed(1)),
                    ictClasses,
                    smartClasses,
                    visitsCount,
                    lastVisitDate: lastVisitDate !== '-' ? formatDateClean(lastVisitDate) : '-'
                };
            });

            // Filter by search query if any
            let filteredSch = schList;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                filteredSch = filteredSch.filter(s =>
                    s.schoolName.toLowerCase().includes(q) ||
                    s.udise.includes(q) ||
                    s.block.toLowerCase().includes(q) ||
                    s.ccName.toLowerCase().includes(q)
                );
            }

            return filteredSch.map((sch, index) => ({
                ...sch,
                slno: index + 1
            }));
        }
    }, [activeZoneDetail, detailTab, schools, visits, jhpmsLab, edustat, edustatMaster, manpower, startDate, endDate, workingDays, ccNameMapping, searchQuery]);

    // Handle Exporting main zone performance data
    const handleExport = () => {
        const exportFormat = zoneData.map(z => ({
            'Slno': z.slno,
            'Zone Name': z.zoneName,
            'Projects': z.totalProjects,
            'Districts': z.totalDistricts,
            'Schools': z.totalSchools,
            'Active Coordinators': z.totalCCs,
            'Active Instructors': z.instructorWorking,
            'CPU Installed': z.cpuInstalled,
            'CPU Used': z.cpuUsed,
            'Mini PC Installed': z.miniPcInstalled,
            'Mini PC Used': z.miniPcUsed,
            'Panel Installed': z.panelInstalled,
            'Panel Used': z.panelUsed,
            'Not Installed (EduStat)': z.edustatNotInstalled,
            'CPU Total Hours': z.totalCpuHours,
            'Mini PC Total Hours': z.totalMiniPcHours,
            'Panel Total Hours': z.totalPanelHours,
            'ICT Classes Conducted': z.ictClasses,
            'Smart Classes Conducted': z.smartClasses,
            'ICT Visits Done': z.totalIctVisits,
            'Smart Visits Done': z.totalSmartVisits,
            'Grand Total Visits': z.grandTotal,
            'Performance Score': z.performanceScore
        }));
        exportToExcel(exportFormat, 'Zone_Performance_Report');
    };

    // Handle Detail Export
    const handleExportDetail = () => {
        if (!activeZoneDetail || !activeZoneDetailsData.length) return;

        let exportFormat = [];
        let label = '';
        if (detailTab === 'cc') {
            exportFormat = activeZoneDetailsData.map(c => ({
                'Slno': c.slno,
                'CC/DEF Name': c.ccName,
                'Schools Count': c.totalSchools,
                'Instructors Working': c.instructorWorking,
                'CPU Installed': c.cpuInstalled,
                'CPU Used': c.cpuUsed,
                'Mini PC Installed': c.miniPcInstalled,
                'Mini PC Used': c.miniPcUsed,
                'Panel Installed': c.panelInstalled,
                'Panel Used': c.panelUsed,
                'CPU Run Hours': c.totalCpuHours,
                'Mini PC Run Hours': c.totalMiniPcHours,
                'Panel Run Hours': c.totalPanelHours,
                'ICT Classes Conducted': c.ictClasses,
                'Smart Classes Conducted': c.smartClasses,
                'Total Visits': c.visitsCount,
                'Local Performance Score': c.performanceScore
            }));
            label = `${activeZoneDetail.zoneName.replace(/\s+/g, '_')}_Coordinators_Performance`;
        } else {
            exportFormat = activeZoneDetailsData.map(s => ({
                'Slno': s.slno,
                'UDISE Code': s.udise,
                'School Name': s.schoolName,
                'Project': s.project,
                'District': s.district,
                'Block': s.block,
                'Coordinator': s.ccName,
                'Instructor Status': s.instructorStatus,
                'CPU Installed': s.cpuInstalled,
                'CPU Run Hours': s.totalCpuHours,
                'Mini PC Installed': s.miniInstalled,
                'Mini PC Run Hours': s.totalMiniPcHours,
                'Panel Installed': s.panelInstalled,
                'Panel Run Hours': s.totalPanelHours,
                'ICT Classes': s.ictClasses,
                'Smart Classes': s.smartClasses,
                'Visits Done': s.visitsCount,
                'Last Visit Date': s.lastVisitDate
            }));
            label = `${activeZoneDetail.zoneName.replace(/\s+/g, '_')}_Schools_Detailed_Report`;
        }

        exportToExcel(exportFormat, label);
    };

    // Register export triggers for the action bar
    useEffect(() => {
        if (onRegisterExport) {
            onRegisterExport(() => handleExport);
        }
        return () => {
            if (onRegisterExport) onRegisterExport(null);
        };
    }, [handleExport, onRegisterExport]);

    if (!schools.length) {
        return (
            <div className="p-10 text-center text-gray-500 bg-white/80 dark:bg-slate-900/40 rounded-2xl m-4 shadow-sm border border-white/40 dark:border-white/5">
                Please upload School Master data in Setup to view Zone Performance.
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 w-full space-y-6 overflow-y-auto h-[calc(100vh-64px)] scrollbar-thin scrollbar-thumb-teal-600/30">
            {/* Top Stats Cards Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
                <div className="bg-gradient-to-r from-teal-800 to-teal-700 text-white rounded-2xl p-5 shadow-lg border border-teal-600/20 flex items-center justify-between">
                    <div>
                        <div className="text-[10px] uppercase tracking-widest font-black text-teal-200/80 mb-1">Total Zones</div>
                        <div className="text-3xl font-black">{zoneData.length}</div>
                    </div>
                    <div className="p-3.5 bg-white/10 rounded-xl">
                        <Icons.Dashboard className="w-6 h-6 text-white" />
                    </div>
                </div>

                <div className="bg-gradient-to-r from-indigo-800 to-indigo-700 text-white rounded-2xl p-5 shadow-lg border border-indigo-600/20 flex items-center justify-between">
                    <div>
                        <div className="text-[10px] uppercase tracking-widest font-black text-indigo-200/80 mb-1">Total Schools Listed</div>
                        <div className="text-3xl font-black">
                            {zoneData.reduce((acc, z) => acc + z.totalSchools, 0)}
                        </div>
                    </div>
                    <div className="p-3.5 bg-white/10 rounded-xl">
                        <Icons.School className="w-6 h-6 text-white" />
                    </div>
                </div>

                <div className="bg-gradient-to-r from-purple-800 to-purple-700 text-white rounded-2xl p-5 shadow-lg border border-purple-600/20 flex items-center justify-between">
                    <div>
                        <div className="text-[10px] uppercase tracking-widest font-black text-purple-200/80 mb-1">Classes Conducted</div>
                        <div className="text-3xl font-black">
                            {zoneData.reduce((acc, z) => acc + z.ictClasses + z.smartClasses, 0)}
                        </div>
                    </div>
                    <div className="p-3.5 bg-white/10 rounded-xl">
                        <Icons.ClassConducted className="w-6 h-6 text-white" />
                    </div>
                </div>

                <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 text-white rounded-2xl p-5 shadow-lg border border-emerald-600/20 flex items-center justify-between">
                    <div>
                        <div className="text-[10px] uppercase tracking-widest font-black text-emerald-200/80 mb-1">Coordinators Visit Count</div>
                        <div className="text-3xl font-black">
                            {zoneData.reduce((acc, z) => acc + z.grandTotal, 0)}
                        </div>
                    </div>
                    <div className="p-3.5 bg-white/10 rounded-xl">
                        <Icons.Visit className="w-6 h-6 text-white" />
                    </div>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/5 shadow-xl overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-black text-teal-800 dark:text-teal-400 tracking-tight">Zone-Wise Aggregated Performance Matrix</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Aggregated statistics calculated across 5 standard zones of operations.</p>
                    </div>
                    <button
                        onClick={handleExport}
                        className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider px-5 py-3 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                    >
                        <Icons.Export className="w-4 h-4 text-white" /> Export Zone Summary
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 border-b border-gray-200 dark:border-white/5">
                                <th className="p-4 w-12 text-center">Rank</th>
                                <th className="p-4">Zone Name</th>
                                <th className="p-4 text-center">Projects</th>
                                <th className="p-4 text-center">Districts</th>
                                <th className="p-4 text-center">Schools</th>
                                <th className="p-4 text-center">Coordinators</th>
                                <th className="p-4 text-center">Instructors</th>
                                <th className="p-4 text-center">CPU Installed / Used</th>
                                <th className="p-4 text-center">Mini PC Installed / Used</th>
                                <th className="p-4 text-center">Panel Installed / Used</th>
                                <th className="p-4 text-center">Total Hours</th>
                                <th className="p-4 text-center">Visits Done</th>
                                <th className="p-4 text-center">Performance Score</th>
                                <th className="p-4 text-center w-28">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {zoneData.map((row, idx) => (
                                <tr
                                    key={row.zoneName}
                                    className={`hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors duration-150 ${activeZoneDetail?.zoneName === row.zoneName ? 'bg-teal-50/30 dark:bg-teal-950/10' : ''}`}
                                >
                                    <td className="p-4 text-center font-bold text-gray-500 dark:text-gray-400">{idx + 1}</td>
                                    <td className="p-4 font-black text-teal-800 dark:text-teal-400">{row.zoneName}</td>
                                    <td className="p-4 text-center font-semibold text-gray-700 dark:text-gray-300">{row.totalProjects}</td>
                                    <td className="p-4 text-center font-semibold text-gray-700 dark:text-gray-300">{row.totalDistricts}</td>
                                    <td className="p-4 text-center font-bold text-indigo-700 dark:text-indigo-400">{row.totalSchools}</td>
                                    <td className="p-4 text-center font-semibold text-gray-700 dark:text-gray-300">{row.totalCCs}</td>
                                    <td className="p-4 text-center font-semibold text-emerald-700 dark:text-emerald-400">{row.instructorWorking}</td>
                                    <td className="p-4 text-center">
                                        <span className="font-bold text-gray-800 dark:text-gray-200">{row.cpuInstalled}</span>
                                        <span className="text-gray-400 mx-1">/</span>
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{row.cpuUsed}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="font-bold text-gray-800 dark:text-gray-200">{row.miniPcInstalled}</span>
                                        <span className="text-gray-400 mx-1">/</span>
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{row.miniPcUsed}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="font-bold text-gray-800 dark:text-gray-200">{row.panelInstalled}</span>
                                        <span className="text-gray-400 mx-1">/</span>
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{row.panelUsed}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="font-black text-gray-800 dark:text-gray-200">
                                            {(row.totalCpuHours + row.totalMiniPcHours + row.totalPanelHours).toFixed(1)} hrs
                                        </div>
                                    </td>
                                    <td className="p-4 text-center font-extrabold text-teal-600 dark:text-teal-400">{row.grandTotal}</td>
                                    <td className="p-4 text-center">
                                        <span className={`px-3 py-1.5 rounded-full font-black text-xs ${row.performanceScore >= 75 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : row.performanceScore >= 50 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                                            {row.performanceScore}%
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => {
                                                setActiveZoneDetail(activeZoneDetail?.zoneName === row.zoneName ? null : row);
                                                setSearchQuery('');
                                            }}
                                            className="bg-slate-100 hover:bg-teal-50 hover:text-teal-600 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 dark:hover:text-teal-400 text-gray-600 dark:text-gray-300 font-extrabold text-xs px-3.5 py-2 rounded-lg transition-all"
                                        >
                                            {activeZoneDetail?.zoneName === row.zoneName ? 'Close Details' : 'View Details'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Drilldown Detailed View Section */}
            {activeZoneDetail && (
                <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/5 shadow-xl overflow-hidden transition-all duration-300 animate-fade-in no-print">
                    <div className="p-5 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 bg-teal-50/10 dark:bg-slate-950/20">
                        <div className="flex items-center gap-3">
                            <div className="bg-teal-500/20 text-teal-500 p-2.5 rounded-xl border border-teal-500/30">
                                <Icons.ICTLab className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-teal-800 dark:text-teal-400 tracking-tight">
                                    Zone Details: {activeZoneDetail.zoneName}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Viewing aggregated operational activities inside {activeZoneDetail.zoneName}.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Inner Tab Switches */}
                            <div className="flex bg-slate-100 dark:bg-slate-850 p-1.5 rounded-xl border border-gray-200/40 dark:border-white/5">
                                <button
                                    onClick={() => setDetailTab('cc')}
                                    className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${detailTab === 'cc' ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 shadow-md' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'}`}
                                >
                                    Field Coordinators ({activeZoneDetail.totalCCs})
                                </button>
                                <button
                                    onClick={() => setDetailTab('schools')}
                                    className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${detailTab === 'schools' ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 shadow-md' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'}`}
                                >
                                    Schools ({activeZoneDetail.totalSchools})
                                </button>
                            </div>

                            <button
                                onClick={handleExportDetail}
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-extrabold text-xs uppercase tracking-wider px-5 py-3 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                            >
                                <Icons.Export className="w-4 h-4 text-white" /> Export Details
                            </button>
                        </div>
                    </div>

                    {/* Drilldown Search and Table */}
                    <div className="p-5">
                        {detailTab === 'schools' && (
                            <div className="mb-4 max-w-md relative">
                                <input
                                    type="text"
                                    placeholder="Search by school, UDISE code, block, or coordinator..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950/40 border border-gray-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                                />
                                <div className="absolute left-3 top-3.5 text-gray-400">
                                    <Icons.Search className="w-4 h-4" />
                                </div>
                            </div>
                        )}

                        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-white/5">
                            {detailTab === 'cc' ? (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-[9px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 border-b border-gray-100 dark:border-white/5">
                                            <th className="p-3 w-12 text-center">Rank</th>
                                            <th className="p-3">CC/DEF Name</th>
                                            <th className="p-3 text-center">Schools Covered</th>
                                            <th className="p-3 text-center">Active Instructors</th>
                                            <th className="p-3 text-center">CPU Installed/Used</th>
                                            <th className="p-3 text-center">Mini PC Installed/Used</th>
                                            <th className="p-3 text-center">Panel Installed/Used</th>
                                            <th className="p-3 text-center">CPU Hours</th>
                                            <th className="p-3 text-center">Mini PC Hours</th>
                                            <th className="p-3 text-center">Panel Hours</th>
                                            <th className="p-3 text-center">ICT Classes</th>
                                            <th className="p-3 text-center">Smart Classes</th>
                                            <th className="p-3 text-center">Visits</th>
                                            <th className="p-3 text-center">Performance Score</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-150 dark:divide-white/5">
                                        {activeZoneDetailsData.map((cc, i) => (
                                            <tr key={cc.ccName} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                                                <td className="p-3 text-center font-bold text-gray-500">{i + 1}</td>
                                                <td className="p-3 font-bold text-teal-800 dark:text-teal-400">{cc.ccName}</td>
                                                <td className="p-3 text-center font-semibold text-gray-700 dark:text-gray-300">{cc.totalSchools}</td>
                                                <td className="p-3 text-center font-semibold text-emerald-700 dark:text-emerald-400">{cc.instructorWorking}</td>
                                                <td className="p-3 text-center">
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{cc.cpuInstalled}</span>
                                                    <span className="text-gray-400 mx-1">/</span>
                                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{cc.cpuUsed}</span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{cc.miniPcInstalled}</span>
                                                    <span className="text-gray-400 mx-1">/</span>
                                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{cc.miniPcUsed}</span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{cc.panelInstalled}</span>
                                                    <span className="text-gray-400 mx-1">/</span>
                                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{cc.panelUsed}</span>
                                                </td>
                                                <td className="p-3 text-center font-medium text-gray-600 dark:text-gray-400">{cc.totalCpuHours} hrs</td>
                                                <td className="p-3 text-center font-medium text-gray-600 dark:text-gray-400">{cc.totalMiniPcHours} hrs</td>
                                                <td className="p-3 text-center font-medium text-gray-600 dark:text-gray-400">{cc.totalPanelHours} hrs</td>
                                                <td className="p-3 text-center font-semibold text-gray-700 dark:text-gray-300">{cc.ictClasses}</td>
                                                <td className="p-3 text-center font-semibold text-gray-700 dark:text-gray-300">{cc.smartClasses}</td>
                                                <td className="p-3 text-center font-bold text-teal-600 dark:text-teal-400">{cc.visitsCount}</td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2 py-1 rounded font-bold text-[11px] ${cc.performanceScore >= 75 ? 'bg-emerald-500/10 text-emerald-500' : cc.performanceScore >= 50 ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                        {cc.performanceScore}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-[9px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 border-b border-gray-100 dark:border-white/5">
                                            <th className="p-3 w-12 text-center">Slno</th>
                                            <th className="p-3">UDISE</th>
                                            <th className="p-3">School Name</th>
                                            <th className="p-3">Project</th>
                                            <th className="p-3">District</th>
                                            <th className="p-3">Block</th>
                                            <th className="p-3">Coordinator</th>
                                            <th className="p-3 text-center">Instructor Status</th>
                                            <th className="p-3 text-center">CPU Installed/Hours</th>
                                            <th className="p-3 text-center">Mini PC Installed/Hours</th>
                                            <th className="p-3 text-center">Panel Installed/Hours</th>
                                            <th className="p-3 text-center">Classes Done</th>
                                            <th className="p-3 text-center">Visits</th>
                                            <th className="p-3 text-center font-bold">Last Visit</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-150 dark:divide-white/5">
                                        {activeZoneDetailsData.map((sch, i) => (
                                            <tr key={sch.udise} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                                                <td className="p-3 text-center font-semibold text-gray-500">{i + 1}</td>
                                                <td className="p-3 font-mono text-[11px] text-gray-600 dark:text-gray-400">{sch.udise}</td>
                                                <td className="p-3 font-black text-gray-800 dark:text-gray-200">{sch.schoolName}</td>
                                                <td className="p-3 font-medium text-gray-600 dark:text-gray-400">{sch.project}</td>
                                                <td className="p-3 font-medium text-gray-600 dark:text-gray-400">{sch.district}</td>
                                                <td className="p-3 font-medium text-gray-600 dark:text-gray-400">{sch.block}</td>
                                                <td className="p-3 font-semibold text-teal-800 dark:text-teal-400">{sch.ccName}</td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sch.instructorStatus === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : sch.instructorStatus === 'Pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                        {sch.instructorStatus}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className="font-semibold text-gray-700 dark:text-gray-300">{sch.cpuInstalled}</span>
                                                    <span className="text-gray-400 mx-1">|</span>
                                                    <span className="text-gray-500 text-[11px]">{sch.totalCpuHours}h</span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className="font-semibold text-gray-700 dark:text-gray-300">{sch.miniInstalled}</span>
                                                    <span className="text-gray-400 mx-1">|</span>
                                                    <span className="text-gray-500 text-[11px]">{sch.totalMiniPcHours}h</span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className="font-semibold text-gray-700 dark:text-gray-300">{sch.panelInstalled}</span>
                                                    <span className="text-gray-400 mx-1">|</span>
                                                    <span className="text-gray-500 text-[11px]">{sch.totalPanelHours}h</span>
                                                </td>
                                                <td className="p-3 text-center font-medium">
                                                    <span className="text-indigo-600 dark:text-indigo-400 font-bold" title="ICT Classes">{sch.ictClasses}</span>
                                                    <span className="text-gray-300 mx-1">/</span>
                                                    <span className="text-purple-600 dark:text-purple-400 font-bold" title="Smart Classes">{sch.smartClasses}</span>
                                                </td>
                                                <td className="p-3 text-center font-bold text-teal-600 dark:text-teal-400">{sch.visitsCount}</td>
                                                <td className="p-3 text-center font-semibold text-gray-500">{sch.lastVisitDate}</td>
                                            </tr>
                                        ))}
                                        {activeZoneDetailsData.length === 0 && (
                                            <tr>
                                                <td colSpan="14" className="p-6 text-center text-gray-400">
                                                    No schools found matching the search query.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ZonePerformance;
