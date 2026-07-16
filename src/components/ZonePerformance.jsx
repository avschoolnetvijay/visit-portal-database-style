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
    const [drilldownFilter, setDrilldownFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAuditZone, setSelectedAuditZone] = useState('');

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

    // ============================
    // AUDIT COMPARATIVE DATA
    // ============================
    const auditComparativeData = useMemo(() => {
        if (!zoneData.length) return null;
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const days = Number(workingDays) && Number(workingDays) >= 1
            ? Number(workingDays)
            : Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

        const getKPIs = (z) => {
            const totalInstalled = z.cpuInstalled + z.miniPcInstalled + z.panelInstalled;
            const totalUsed = z.cpuUsed + z.miniPcUsed + z.panelUsed;
            const deviceUtil = totalInstalled > 0 ? (totalUsed / totalInstalled) * 100 : 0;
            const totalHours = z.totalCpuHours + z.totalMiniPcHours + z.totalPanelHours;
            const avgHoursPerDay = z.totalSchools > 0 && days > 0 ? totalHours / days / z.totalSchools : 0;
            const classRate = z.totalSchools > 0 && days > 0 ? (z.ictClasses + z.smartClasses) / (days * z.totalSchools) : 0;
            const smartRate = z.totalSchools > 0 && days > 0 ? z.smartClasses / (days * z.totalSchools) : 0;
            const monitoring = z.totalSchools > 0 ? z.grandTotal / z.totalSchools : 0;
            const instructorRate = z.totalSchools > 0 ? (z.instructorWorking / z.totalSchools) * 100 : 0;
            return { deviceUtil, avgHoursPerDay, classRate, smartRate, monitoring, instructorRate };
        };

        const allKPIs = zoneData.map(getKPIs);
        const n = allKPIs.length;
        const stateAvg = {
            deviceUtil: allKPIs.reduce((a, k) => a + k.deviceUtil, 0) / n,
            avgHoursPerDay: allKPIs.reduce((a, k) => a + k.avgHoursPerDay, 0) / n,
            classRate: allKPIs.reduce((a, k) => a + k.classRate, 0) / n,
            smartRate: allKPIs.reduce((a, k) => a + k.smartRate, 0) / n,
            monitoring: allKPIs.reduce((a, k) => a + k.monitoring, 0) / n,
            instructorRate: allKPIs.reduce((a, k) => a + k.instructorRate, 0) / n,
        };

        const topZoneObj = zoneData[0];
        const topZoneKPIs = allKPIs[0];

        const selZoneName = selectedAuditZone || zoneData[0]?.zoneName || '';
        const selIdx = zoneData.findIndex(z => z.zoneName === selZoneName);
        const resolvedIdx = selIdx >= 0 ? selIdx : 0;
        const selZoneObj = zoneData[resolvedIdx];
        const selZoneKPIs = allKPIs[resolvedIdx];

        return { days, selZoneName: selZoneObj?.zoneName || selZoneName, selZoneObj, selZoneKPIs, topZoneObj, topZoneKPIs, stateAvg };
    }, [zoneData, selectedAuditZone, startDate, endDate, workingDays]);

    // ============================
    // PROJECT BREAKDOWN (within selected zone)
    // ============================
    const projectBreakdownData = useMemo(() => {
        if (!auditComparativeData || !auditComparativeData.selZoneObj) return [];
        const { selZoneObj, days } = auditComparativeData;
        const zoneUdises = selZoneObj.udises;

        const zoneSchools = schools.filter(s => zoneUdises.has(cleanUdise(s.udise_code)));
        if (!zoneSchools.length) return [];

        const projMap = {};
        zoneSchools.forEach(s => {
            const proj = s.project_name || 'Unassigned';
            if (!projMap[proj]) {
                projMap[proj] = {
                    projectName: proj,
                    totalSchools: 0, instructorWorking: 0,
                    cpuInstalled: 0, cpuUsed: 0,
                    miniPcInstalled: 0, miniPcUsed: 0,
                    panelInstalled: 0, panelUsed: 0,
                    totalCpuHours: 0, totalMiniPcHours: 0, totalPanelHours: 0,
                    ictClasses: 0, smartClasses: 0,
                    ictVisits: 0, smartVisits: 0,
                    udises: new Set()
                };
            }
            projMap[proj].totalSchools++;
            projMap[proj].udises.add(cleanUdise(s.udise_code));
        });

        manpower.forEach(m => {
            const udise = cleanUdise(m.udise || getVal(m, 'udise'));
            const status = String(getVal(m, 'status') || '').trim();
            const isWorking = status.toUpperCase().includes('WORKING') || status.toUpperCase().includes('ACTIVE') || status === '';
            if (isWorking) {
                Object.values(projMap).forEach(p => { if (p.udises.has(udise)) p.instructorWorking++; });
            }
        });

        (edustatMaster || []).forEach(m => {
            const udise = String(m.udise).trim();
            const device = String(m.device || '').toUpperCase();
            const installed = String(m.installed || '').toUpperCase();
            if (installed === 'YES') {
                Object.values(projMap).forEach(p => {
                    if (p.udises.has(udise)) {
                        if (device === 'CPU') p.cpuInstalled++;
                        else if (device === 'MINI PC' || device === 'THIN CLIENT') p.miniPcInstalled++;
                        else if (device === 'INTERACTIVE FLAT PANEL') p.panelInstalled++;
                    }
                });
            }
        });

        const serialMapP = {};
        (edustatMaster || []).forEach(m => { if (m.serial) serialMapP[String(m.serial).trim()] = String(m.device || '').toUpperCase(); });

        const filteredEdustatP = edustat.filter(row => {
            const dateStr = formatDateStr(row.date || getVal(row, 'date'));
            return dateStr && dateStr >= startDate && dateStr <= endDate;
        });
        const activeSerialsP = new Set();
        filteredEdustatP.forEach(e => { if (e.hours > 0 && e.serial) activeSerialsP.add(String(e.serial).trim()); });

        filteredEdustatP.forEach(e => {
            const udise = String(e.udise).trim();
            const serial = String(e.serial).trim();
            const hours = Number(e.hours) || 0;
            const deviceType = serialMapP[serial] || 'CPU';
            Object.values(projMap).forEach(p => {
                if (p.udises.has(udise)) {
                    if (deviceType === 'CPU') p.totalCpuHours += hours;
                    else if (deviceType === 'MINI PC' || deviceType === 'THIN CLIENT') p.totalMiniPcHours += hours;
                    else if (deviceType === 'INTERACTIVE FLAT PANEL') p.totalPanelHours += hours;
                }
            });
        });

        (edustatMaster || []).forEach(m => {
            const udise = String(m.udise).trim();
            const serial = String(m.serial).trim();
            const device = String(m.device || '').toUpperCase();
            const installed = String(m.installed || '').toUpperCase();
            if (installed === 'YES' && activeSerialsP.has(serial)) {
                Object.values(projMap).forEach(p => {
                    if (p.udises.has(udise)) {
                        if (device === 'CPU') p.cpuUsed++;
                        else if (device === 'MINI PC' || device === 'THIN CLIENT') p.miniPcUsed++;
                        else if (device === 'INTERACTIVE FLAT PANEL') p.panelUsed++;
                    }
                });
            }
        });

        jhpmsLab.forEach(l => {
            const udise = cleanUdise(l.udise || getVal(l, 'udise'));
            const dateStr = formatDateStr(l.date || getVal(l, 'date'));
            if (dateStr && dateStr >= startDate && dateStr <= endDate) {
                const labType = String(l.labType || getVal(l, 'lab') || '').toUpperCase();
                const subject = String(l.subject || getVal(l, 'sub') || '').toUpperCase();
                Object.values(projMap).forEach(p => {
                    if (p.udises.has(udise)) {
                        if (subject.split(/[^A-Z0-9]+/).includes('MIS')) return;
                        if (labType.includes('ICT') && subject.includes('COMPUTER')) p.ictClasses++;
                        else if (labType.includes('SMART')) p.smartClasses++;
                    }
                });
            }
        });

        visits.forEach(v => {
            const udise = cleanUdise(v.udise_code);
            const dateStr = formatDateStr(v.visit_date || getVal(v, 'date'));
            const type = (v.visit_type || '').toLowerCase();
            if (dateStr && dateStr >= startDate && dateStr <= endDate) {
                Object.values(projMap).forEach(p => {
                    if (p.udises.has(udise)) {
                        if (type.includes('ict')) p.ictVisits++;
                        if (type.includes('smart')) p.smartVisits++;
                    }
                });
            }
        });

        return Object.values(projMap).map(p => {
            const totalInstalled = p.cpuInstalled + p.miniPcInstalled + p.panelInstalled;
            const totalUsed = p.cpuUsed + p.miniPcUsed + p.panelUsed;
            const deviceUtil = totalInstalled > 0 ? ((totalUsed / totalInstalled) * 100).toFixed(1) : '0.0';
            const totalVisits = p.ictVisits + p.smartVisits;
            const classRate = p.totalSchools > 0 && days > 0 ? ((p.ictClasses + p.smartClasses) / (days * p.totalSchools)).toFixed(3) : '0.000';
            const monitoring = p.totalSchools > 0 ? (totalVisits / p.totalSchools).toFixed(2) : '0.00';
            const instRate = p.totalSchools > 0 ? ((p.instructorWorking / p.totalSchools) * 100).toFixed(1) : '0.0';
            return {
                ...p,
                totalHours: parseFloat((p.totalCpuHours + p.totalMiniPcHours + p.totalPanelHours).toFixed(1)),
                totalVisits, deviceUtil, classRate, monitoring, instRate
            };
        }).sort((a, b) => b.totalSchools - a.totalSchools);
    }, [auditComparativeData, schools, manpower, edustatMaster, edustat, jhpmsLab, visits, startDate, endDate]);

    // ============================
    // GAP ANALYSIS & BEST PRACTICES
    // ============================
    const gapAnalysisInsights = useMemo(() => {
        if (!auditComparativeData || !auditComparativeData.selZoneKPIs) return { bestPractices: [], gaps: [] };
        const { selZoneName, selZoneKPIs, stateAvg, topZoneObj } = auditComparativeData;
        const fmt = (v, d = 1) => Number(v).toFixed(d);
        const pct = (v) => `${fmt(v)}%`;
        const THRESHOLD = 0.10;
        const bestPractices = [];
        const gaps = [];

        if (topZoneObj && selZoneName === topZoneObj.zoneName) {
            bestPractices.push(`🏆 ${selZoneName} is the overall Top Performing Zone with a performance score of ${topZoneObj.performanceScore}%.`);
        }

        // Device Utilization
        if (selZoneKPIs.deviceUtil > stateAvg.deviceUtil * (1 + THRESHOLD)) {
            bestPractices.push(`${selZoneName} leads in Device Utilization (${pct(selZoneKPIs.deviceUtil)}) — ${fmt(selZoneKPIs.deviceUtil - stateAvg.deviceUtil)}% above the state average of ${pct(stateAvg.deviceUtil)}.`);
        } else if (stateAvg.deviceUtil > 0 && selZoneKPIs.deviceUtil < stateAvg.deviceUtil * (1 - THRESHOLD)) {
            const def = fmt((stateAvg.deviceUtil - selZoneKPIs.deviceUtil) / stateAvg.deviceUtil * 100);
            gaps.push(`Hardware underutilization: ${selZoneName} has ${pct(selZoneKPIs.deviceUtil)} device utilization, ${def}% below the state average of ${pct(stateAvg.deviceUtil)}. Action: CC must initiate syncing on idle devices and verify EduStat agent status.`);
        }

        // Avg EduStat Hours/Day
        if (selZoneKPIs.avgHoursPerDay > stateAvg.avgHoursPerDay * (1 + THRESHOLD)) {
            bestPractices.push(`${selZoneName} achieves the highest EduStat usage at ${fmt(selZoneKPIs.avgHoursPerDay, 2)} hrs/school/day, exceeding the state average of ${fmt(stateAvg.avgHoursPerDay, 2)} hrs.`);
        } else if (stateAvg.avgHoursPerDay > 0 && selZoneKPIs.avgHoursPerDay < stateAvg.avgHoursPerDay * (1 - THRESHOLD)) {
            const def = fmt((stateAvg.avgHoursPerDay - selZoneKPIs.avgHoursPerDay) / stateAvg.avgHoursPerDay * 100);
            gaps.push(`Low usage hours: ${selZoneName} averages ${fmt(selZoneKPIs.avgHoursPerDay, 2)} hrs/school/day on EduStat, ${def}% below the state average of ${fmt(stateAvg.avgHoursPerDay, 2)} hrs. Action: Mandate minimum daily usage targets per school.`);
        }

        // Class Delivery Rate
        if (selZoneKPIs.classRate > stateAvg.classRate * (1 + THRESHOLD)) {
            bestPractices.push(`${selZoneName} maintains a superior class delivery rate of ${fmt(selZoneKPIs.classRate, 3)} classes/school/day vs state average of ${fmt(stateAvg.classRate, 3)}.`);
        } else if (stateAvg.classRate > 0 && selZoneKPIs.classRate < stateAvg.classRate * (1 - THRESHOLD)) {
            const def = fmt((stateAvg.classRate - selZoneKPIs.classRate) / stateAvg.classRate * 100);
            gaps.push(`Academic delivery deficit: ${selZoneName} conducts ${fmt(selZoneKPIs.classRate, 3)} classes/school/day, ${def}% below the state average of ${fmt(stateAvg.classRate, 3)}. Action: Enforce JHPMS class entry compliance with CCs.`);
        }

        // Smart Class Rate
        if (selZoneKPIs.smartRate > stateAvg.smartRate * (1 + THRESHOLD)) {
            bestPractices.push(`${selZoneName} is leading in Smart Class delivery (${fmt(selZoneKPIs.smartRate, 3)}/school/day) across all zones in the state.`);
        } else if (stateAvg.smartRate > 0 && selZoneKPIs.smartRate < stateAvg.smartRate * (1 - THRESHOLD)) {
            const def = fmt((stateAvg.smartRate - selZoneKPIs.smartRate) / stateAvg.smartRate * 100);
            gaps.push(`Smart Class deficit: ${selZoneName} conducts ${fmt(selZoneKPIs.smartRate, 3)} smart classes/school/day, ${def}% below the state average of ${fmt(stateAvg.smartRate, 3)}. Action: Mandate at least 1 smart class per day per school.`);
        }

        // Monitoring Intensity
        if (selZoneKPIs.monitoring > stateAvg.monitoring * (1 + THRESHOLD)) {
            bestPractices.push(`${selZoneName} demonstrates strong monitoring intensity at ${fmt(selZoneKPIs.monitoring, 2)} visits/school, surpassing the state average of ${fmt(stateAvg.monitoring, 2)}.`);
        } else if (stateAvg.monitoring > 0 && selZoneKPIs.monitoring < stateAvg.monitoring * (1 - THRESHOLD)) {
            const def = fmt((stateAvg.monitoring - selZoneKPIs.monitoring) / stateAvg.monitoring * 100);
            gaps.push(`Monitoring gap: ${selZoneName} averages ${fmt(selZoneKPIs.monitoring, 2)} visits/school, ${def}% below state average of ${fmt(stateAvg.monitoring, 2)}. Action: Increase CC visit frequency and enforce monthly visit targets.`);
        }

        // Instructor Presence
        if (selZoneKPIs.instructorRate > stateAvg.instructorRate * (1 + THRESHOLD)) {
            bestPractices.push(`${selZoneName} leads in Instructor Availability (${pct(selZoneKPIs.instructorRate)}) across the state, ensuring consistent lab operations.`);
        } else if (stateAvg.instructorRate > 0 && selZoneKPIs.instructorRate < stateAvg.instructorRate * (1 - THRESHOLD)) {
            const def = fmt((stateAvg.instructorRate - selZoneKPIs.instructorRate) / stateAvg.instructorRate * 100);
            gaps.push(`Instructor deficit: ${selZoneName} has ${pct(selZoneKPIs.instructorRate)} instructor presence, ${def}% below the state average of ${pct(stateAvg.instructorRate)}. Action: Expedite hiring and deployment of vacant positions.`);
        }

        if (!bestPractices.length && !gaps.length) {
            bestPractices.push(`${selZoneName} is performing in line with the state average across all key metrics. Continue current operational cadence.`);
        }

        return { bestPractices, gaps };
    }, [auditComparativeData]);

    const activeZoneDetailsData = useMemo(() => {
        if (!activeZoneDetail) return null;

        const zoneUdises = activeZoneDetail.udises;
        const zoneCCs = activeZoneDetail.ccNames;

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const days = Number(workingDays) && Number(workingDays) >= 1
            ? Number(workingDays)
            : Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

        let viewType = 'schools';
        if ([
            'cpu_installed', 'mini_installed', 'panel_installed', 'edustat_not_installed',
            'cpu_used', 'mini_used', 'panel_used', 'cpu_not_used', 'mini_not_used', 'panel_not_used'
        ].includes(drilldownFilter)) {
            viewType = 'devices';
        } else if (drilldownFilter === 'working_instructors') {
            viewType = 'instructors';
        } else if (['cpu_hours_logs', 'mini_hours_logs', 'panel_hours_logs'].includes(drilldownFilter)) {
            viewType = 'usage_logs';
        } else if (['ict_classes', 'smart_classes'].includes(drilldownFilter)) {
            viewType = 'classes';
        } else if (['ict_visits', 'smart_visits', 'all_visits'].includes(drilldownFilter)) {
            viewType = 'visits';
        } else if (drilldownFilter === 'coordinators') {
            viewType = 'coordinators';
        }

        if (viewType === 'coordinators') {
            const ccList = Array.from(zoneCCs);

            const ccPerf = ccList.map((cc, i) => {
                const ccSchools = schools.filter(s => (s.visitor_name === cc || ccNameMapping[s.visitor_name] === cc) && zoneUdises.has(cleanUdise(s.udise_code)));
                const ccUdises = new Set(ccSchools.map(s => cleanUdise(s.udise_code)));

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

                manpower.forEach(m => {
                    const udise = cleanUdise(m.udise || getVal(m, 'udise'));
                    if (ccUdises.has(udise)) {
                        const schoolManpower = manpower.filter(mp => cleanUdise(mp.udise || getVal(mp, 'udise') || '') === udise);
                        let instructorRec = schoolManpower.find(mp => {
                            const status = String(getVal(mp, 'status') || '').trim().toUpperCase();
                            return status.includes('WORKING') || status.includes('ACTIVE') || status === '';
                        });
                        if (!instructorRec && schoolManpower.length > 0) {
                            instructorRec = schoolManpower[0];
                        }
                        const rawStatus = instructorRec ? (instructorRec.status || getVal(instructorRec, 'status') || 'Active') : 'N/A';
                        const isWorking = rawStatus.toUpperCase().includes('WORKING') || rawStatus.toUpperCase().includes('ACTIVE') || rawStatus === '';
                        if (isWorking) instructorWorking++;
                    }
                });

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

                const cpuUtil = cpuInstalled > 0 ? (cpuUsed / cpuInstalled) : 0;
                const miniUtil = miniPcInstalled > 0 ? (miniPcUsed / miniPcInstalled) : 0;
                const panelUtil = panelInstalled > 0 ? (panelUsed / panelInstalled) : 0;
                const activeDeviceTypes = [cpuUtil, miniUtil, panelUtil].filter((_, index) => [cpuInstalled, miniPcInstalled, panelInstalled][index] > 0);
                const infraScore = (activeDeviceTypes.length > 0 ? activeDeviceTypes.reduce((a, b) => a + b, 0) / activeDeviceTypes.length : 0) * 25;

                const avgCpu = cpuInstalled > 0 ? (totalCpuHours / days / cpuInstalled) : 0;
                const avgMini = miniPcInstalled > 0 ? (totalMiniPcHours / days / miniPcInstalled) : 0;
                const avgPanel = panelInstalled > 0 ? (totalPanelHours / days / panelInstalled) : 0;

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
                    miniPcInstalled: miniPcInstalled,
                    miniPcUsed: miniPcUsed,
                    panelInstalled: panelInstalled,
                    panelUsed: panelUsed,
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
            
            let filteredCc = ccPerf;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                filteredCc = filteredCc.filter(c => c.ccName.toLowerCase().includes(q));
            }

            return filteredCc.map((row, index) => ({ ...row, slno: index + 1 }));
        }

        if (viewType === 'devices') {
            const masterDevices = (edustatMaster || []).filter(m => zoneUdises.has(cleanUdise(m.udise || getVal(m, 'udise'))));

            const filteredEdustat = edustat.filter(row => {
                const dateStr = formatDateStr(row.date || getVal(row, 'date'));
                return dateStr && dateStr >= startDate && dateStr <= endDate && zoneUdises.has(cleanUdise(row.udise || getVal(row, 'udise')));
            });

            const activeSerials = new Set();
            filteredEdustat.forEach(e => {
                if (Number(e.hours) > 0 && e.serial) {
                    activeSerials.add(String(e.serial).trim());
                }
            });

            let filteredDevices = masterDevices;
            if (drilldownFilter === 'cpu_installed') {
                filteredDevices = filteredDevices.filter(m => String(m.device || '').toUpperCase() === 'CPU' && String(m.installed || '').toUpperCase() === 'YES');
            } else if (drilldownFilter === 'mini_installed') {
                filteredDevices = filteredDevices.filter(m => (String(m.device || '').toUpperCase() === 'MINI PC' || String(m.device || '').toUpperCase() === 'THIN CLIENT') && String(m.installed || '').toUpperCase() === 'YES');
            } else if (drilldownFilter === 'panel_installed') {
                filteredDevices = filteredDevices.filter(m => String(m.device || '').toUpperCase() === 'INTERACTIVE FLAT PANEL' && String(m.installed || '').toUpperCase() === 'YES');
            } else if (drilldownFilter === 'edustat_not_installed') {
                filteredDevices = filteredDevices.filter(m => String(m.installed || '').toUpperCase() === 'NO');
            } else if (drilldownFilter === 'cpu_used') {
                filteredDevices = filteredDevices.filter(m => String(m.device || '').toUpperCase() === 'CPU' && String(m.installed || '').toUpperCase() === 'YES' && activeSerials.has(String(m.serial || '').trim()));
            } else if (drilldownFilter === 'mini_used') {
                filteredDevices = filteredDevices.filter(m => (String(m.device || '').toUpperCase() === 'MINI PC' || String(m.device || '').toUpperCase() === 'THIN CLIENT') && String(m.installed || '').toUpperCase() === 'YES' && activeSerials.has(String(m.serial || '').trim()));
            } else if (drilldownFilter === 'panel_used') {
                filteredDevices = filteredDevices.filter(m => String(m.device || '').toUpperCase() === 'INTERACTIVE FLAT PANEL' && String(m.installed || '').toUpperCase() === 'YES' && activeSerials.has(String(m.serial || '').trim()));
            } else if (drilldownFilter === 'cpu_not_used') {
                filteredDevices = filteredDevices.filter(m => String(m.device || '').toUpperCase() === 'CPU' && String(m.installed || '').toUpperCase() === 'YES' && !activeSerials.has(String(m.serial || '').trim()));
            } else if (drilldownFilter === 'mini_not_used') {
                filteredDevices = filteredDevices.filter(m => (String(m.device || '').toUpperCase() === 'MINI PC' || String(m.device || '').toUpperCase() === 'THIN CLIENT') && String(m.installed || '').toUpperCase() === 'YES' && !activeSerials.has(String(m.serial || '').trim()));
            } else if (drilldownFilter === 'panel_not_used') {
                filteredDevices = filteredDevices.filter(m => String(m.device || '').toUpperCase() === 'INTERACTIVE FLAT PANEL' && String(m.installed || '').toUpperCase() === 'YES' && !activeSerials.has(String(m.serial || '').trim()));
            }

            const list = filteredDevices.map((m, idx) => {
                const udise = cleanUdise(m.udise || getVal(m, 'udise'));
                const schoolRec = schools.find(s => cleanUdise(s.udise_code) === udise);
                
                let status = 'Idle / Not Used';
                if (String(m.installed || '').toUpperCase() === 'NO') status = 'Not Installed';
                else if (activeSerials.has(String(m.serial || '').trim())) status = 'Active / Syncing';

                return {
                    udise,
                    schoolName: schoolRec ? (schoolRec.school_name || schoolRec.school || '-') : '-',
                    block: schoolRec ? (schoolRec.block || '-') : '-',
                    serial: m.serial || 'N/A',
                    deviceType: m.device || 'CPU',
                    status
                };
            });

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const filtered = list.filter(d => d.schoolName.toLowerCase().includes(q) || d.udise.includes(q) || d.serial.toLowerCase().includes(q));
                return filtered.map((item, idx) => ({ ...item, slno: idx + 1 }));
            }
            return list.map((item, idx) => ({ ...item, slno: idx + 1 }));
        }

        if (viewType === 'instructors') {
            const ccManpower = manpower.filter(m => zoneUdises.has(cleanUdise(m.udise || getVal(m, 'udise'))));
            
            const listData = ccManpower.map((m, idx) => {
                const udise = cleanUdise(m.udise || getVal(m, 'udise'));
                const schoolRec = schools.find(s => cleanUdise(s.udise_code) === udise);
                const rawStatus = m.status || getVal(m, 'status') || 'Active';
                
                let instructorStatus = 'N/A';
                if (rawStatus) {
                    const sUpper = String(rawStatus).toUpperCase();
                    if (sUpper.includes('WORKING') || sUpper.includes('ACTIVE')) instructorStatus = 'Active';
                    else if (sUpper.includes('PENDING')) instructorStatus = 'Pending';
                    else if (sUpper.includes('RESIGN') || sUpper.includes('TERMINATE') || sUpper.includes('VACANT')) instructorStatus = 'Vacant';
                }

                return {
                    udise,
                    schoolName: schoolRec ? (schoolRec.school_name || schoolRec.school || '-') : '-',
                    block: schoolRec ? (schoolRec.block || '-') : '-',
                    instructorName: m.instructorName || getVal(m, 'name') || 'N/A',
                    instructorStatus
                };
            });

            const filteredList = listData.filter(ins => ins.instructorStatus === 'Active');

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const filtered = filteredList.filter(ins => ins.schoolName.toLowerCase().includes(q) || ins.udise.includes(q) || ins.instructorName.toLowerCase().includes(q));
                return filtered.map((ins, idx) => ({ ...ins, slno: idx + 1 }));
            }
            return filteredList.map((ins, idx) => ({ ...ins, slno: idx + 1 }));
        }

        if (viewType === 'usage_logs') {
            const filteredEdustat = edustat.filter(row => {
                const dateStr = formatDateStr(row.date || getVal(row, 'date'));
                return dateStr && dateStr >= startDate && dateStr <= endDate && zoneUdises.has(cleanUdise(row.udise || getVal(row, 'udise')));
            });

            const serialMap = {};
            (edustatMaster || []).forEach(m => {
                if (m.serial) {
                    serialMap[String(m.serial).trim()] = String(m.device || '').toUpperCase();
                }
            });

            let logRows = filteredEdustat.map(e => {
                const udise = cleanUdise(e.udise || getVal(e, 'udise') || '');
                const serial = String(e.serial || '').trim();
                const devType = serialMap[serial] || 'CPU';
                const schoolRec = schools.find(s => cleanUdise(s.udise_code) === udise);

                return {
                    date: formatDateClean(e.date || getVal(e, 'date')),
                    dateRaw: formatDateStr(e.date || getVal(e, 'date')),
                    udise,
                    schoolName: schoolRec ? (schoolRec.school_name || schoolRec.school || '-') : '-',
                    block: schoolRec ? (schoolRec.block || '-') : '-',
                    serial,
                    deviceType: devType,
                    hours: Number(e.hours) || 0
                };
            });

            if (drilldownFilter === 'cpu_hours_logs') {
                logRows = logRows.filter(l => l.deviceType === 'CPU');
            } else if (drilldownFilter === 'mini_hours_logs') {
                logRows = logRows.filter(l => l.deviceType === 'MINI PC' || l.deviceType === 'THIN CLIENT');
            } else if (drilldownFilter === 'panel_hours_logs') {
                logRows = logRows.filter(l => l.deviceType === 'INTERACTIVE FLAT PANEL');
            }

            logRows.sort((a, b) => (b.dateRaw || '').localeCompare(a.dateRaw || ''));

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const filtered = logRows.filter(l => l.schoolName.toLowerCase().includes(q) || l.udise.includes(q) || l.serial.toLowerCase().includes(q));
                return filtered.map((l, idx) => ({ ...l, slno: idx + 1 }));
            }
            return logRows.map((l, idx) => ({ ...l, slno: idx + 1 }));
        }

        if (viewType === 'classes') {
            const filteredJhpms = jhpmsLab.filter(l => {
                const udise = cleanUdise(l.udise || getVal(l, 'udise'));
                const dateStr = formatDateStr(l.date || getVal(l, 'date'));
                return dateStr && dateStr >= startDate && dateStr <= endDate && zoneUdises.has(udise);
            });

            let classRows = [];
            filteredJhpms.forEach(l => {
                const udise = cleanUdise(l.udise || getVal(l, 'udise'));
                const labType = String(l.labType || getVal(l, 'lab') || '').toUpperCase();
                
                const teacherKey = Object.keys(l).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes('subjectteacher'));
                const teacher = teacherKey ? String(l[teacherKey] || '').trim() : (getVal(l, 'teacher') || 'N/A');
                
                const subjectKey = Object.keys(l).find(k => k !== teacherKey && k.toLowerCase().replace(/[^a-z0-9]/g, '').includes('sub'));
                const subject = subjectKey ? String(l[subjectKey] || '').trim().toUpperCase() : '';
                
                const remarks = l.remarks || getVal(l, 'remarks') || getVal(l, 'topic') || '-';
                const schoolRec = schools.find(s => cleanUdise(s.udise_code) === udise);

                const isIct = !subject.split(/[^A-Z0-9]+/).includes('MIS') && (labType.includes('ICT') && subject.includes('COMPUTER'));
                const isSmart = !subject.split(/[^A-Z0-9]+/).includes('MIS') && !(labType.includes('ICT') && subject.includes('COMPUTER')) && labType.includes('SMART');

                if ((drilldownFilter === 'ict_classes' && isIct) || (drilldownFilter === 'smart_classes' && isSmart)) {
                    classRows.push({
                        date: formatDateClean(l.date || getVal(l, 'date')),
                        dateRaw: formatDateStr(l.date || getVal(l, 'date')),
                        udise,
                        schoolName: schoolRec ? (schoolRec.school_name || schoolRec.school || '-') : '-',
                        block: schoolRec ? (schoolRec.block || '-') : '-',
                        labType: labType,
                        subject: subject || 'N/A',
                        teacher: teacher,
                        remarks
                    });
                }
            });

            classRows.sort((a, b) => (b.dateRaw || '').localeCompare(a.dateRaw || ''));

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const filtered = classRows.filter(r => r.schoolName.toLowerCase().includes(q) || r.udise.includes(q) || r.teacher.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q));
                return filtered.map((r, idx) => ({ ...r, slno: idx + 1 }));
            }
            return classRows.map((r, idx) => ({ ...r, slno: idx + 1 }));
        }

        if (viewType === 'visits') {
            const ccVisits = visits.filter(v => {
                const dateStr = formatDateStr(v.visit_date || getVal(v, 'date'));
                return dateStr && dateStr >= startDate && dateStr <= endDate && zoneUdises.has(cleanUdise(v.udise_code));
            });

            let visitRows = ccVisits.map(v => {
                const udise = cleanUdise(v.udise_code);
                const schoolRec = schools.find(s => cleanUdise(s.udise_code) === udise);

                return {
                    date: formatDateClean(v.visit_date || getVal(v, 'date')),
                    dateRaw: formatDateStr(v.visit_date || getVal(v, 'date')),
                    udise,
                    schoolName: schoolRec ? (schoolRec.school_name || schoolRec.school || '-') : '-',
                    block: schoolRec ? (schoolRec.block || '-') : '-',
                    visitorName: v.visitor_name || 'N/A',
                    visitType: v.visit_type || 'Visit',
                    remarks: v.remarks || getVal(v, 'remarks') || getVal(v, 'remark') || '-'
                };
            });

            if (drilldownFilter === 'ict_visits') {
                visitRows = visitRows.filter(v => v.visitType.toLowerCase().includes('ict'));
            } else if (drilldownFilter === 'smart_visits') {
                visitRows = visitRows.filter(v => v.visitType.toLowerCase().includes('smart'));
            }

            visitRows.sort((a, b) => (b.dateRaw || '').localeCompare(a.dateRaw || ''));

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const filtered = visitRows.filter(v => v.schoolName.toLowerCase().includes(q) || v.udise.includes(q) || v.visitorName.toLowerCase().includes(q));
                return filtered.map((v, idx) => ({ ...v, slno: idx + 1 }));
            }
            return visitRows.map((v, idx) => ({ ...v, slno: idx + 1 }));
        }

        // Default 'schools' view
        const zoneSchoolsList = schools.filter(s => zoneUdises.has(cleanUdise(s.udise_code)));

        const rangeVisits = visits.filter(v => {
            const dateStr = formatDateStr(v.visit_date);
            return dateStr && dateStr >= startDate && dateStr <= endDate && zoneUdises.has(cleanUdise(v.udise_code));
        });

        const rangeJhpms = jhpmsLab.filter(l => {
            const udise = cleanUdise(l.udise || getVal(l, 'udise') || '');
            const dateStr = formatDateStr(l.date || getVal(l, 'date'));
            return dateStr && dateStr >= startDate && dateStr <= endDate && zoneUdises.has(udise);
        });

        const rangeEdustat = edustat.filter(e => {
            const dateStr = formatDateStr(e.date || getVal(e, 'date'));
            return dateStr && dateStr >= startDate && dateStr <= endDate && zoneUdises.has(cleanUdise(e.udise || getVal(e, 'udise') || ''));
        });

        const schDetailsList = zoneSchoolsList.map((s, idx) => {
            const udise = cleanUdise(s.udise_code);

            const schoolManpower = manpower.filter(m => cleanUdise(m.udise || getVal(m, 'udise') || '') === udise);
            let instructorRec = schoolManpower.find(m => {
                const status = String(getVal(m, 'status') || '').trim().toUpperCase();
                return status.includes('WORKING') || status.includes('ACTIVE') || status === '';
            });
            if (!instructorRec && schoolManpower.length > 0) {
                instructorRec = schoolManpower[0];
            }
            const rawStatus = instructorRec ? (instructorRec.status || getVal(instructorRec, 'status') || 'Active') : 'N/A';
            let instructorStatus = 'N/A';
            if (rawStatus) {
                const sUpper = String(rawStatus).toUpperCase();
                if (sUpper.includes('WORKING') || sUpper.includes('ACTIVE')) instructorStatus = 'Active';
                else if (sUpper.includes('PENDING')) instructorStatus = 'Pending';
                else if (sUpper.includes('RESIGN') || sUpper.includes('TERMINATE') || sUpper.includes('VACANT')) instructorStatus = 'Vacant';
            }

            let cpuInstalled = 0;
            let miniInstalled = 0;
            let panelInstalledSch = 0;
            let edustatNotInstalled = 0;

            (edustatMaster || []).forEach(m => {
                if (cleanUdise(m.udise) === udise) {
                    const device = String(m.device || '').toUpperCase();
                    const installed = String(m.installed || '').toUpperCase();
                    if (installed === 'YES') {
                        if (device === 'CPU') cpuInstalled++;
                        else if (device === 'MINI PC' || device === 'THIN CLIENT') miniInstalled++;
                        else if (device === 'INTERACTIVE FLAT PANEL') panelInstalledSch++;
                    } else if (installed === 'NO') {
                        edustatNotInstalled++;
                    }
                }
            });

            let ictClasses = 0;
            let smartClasses = 0;
            rangeJhpms.forEach(l => {
                const rowUdise = cleanUdise(l.udise || getVal(l, 'udise') || '');
                if (rowUdise !== udise) return;

                const labType = String(l.labType || getVal(l, 'lab') || '').toUpperCase();
                const teacherKey = Object.keys(l).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes('subjectteacher'));
                const teacher = teacherKey ? String(l[teacherKey] || '').trim() : (getVal(l, 'teacher') || '');
                const subjectKey = Object.keys(l).find(k => k !== teacherKey && k.toLowerCase().replace(/[^a-z0-9]/g, '').includes('sub'));
                const subject = subjectKey ? String(l[subjectKey] || '').trim().toUpperCase() : '';

                if (subject.split(/[^A-Z0-9]+/).includes('MIS')) {
                    // Ignore
                } else if (labType.includes('ICT') && subject.includes('COMPUTER')) {
                    ictClasses++;
                } else if (labType.includes('SMART')) {
                    smartClasses++;
                }
            });

            let totalCpuHours = 0;
            let totalMiniPcHours = 0;
            let totalPanelHoursSch = 0;
            
            const serialMap = {};
            (edustatMaster || []).forEach(m => {
                if (m.serial) {
                    serialMap[String(m.serial).trim()] = String(m.device || '').toUpperCase();
                }
            });

            rangeEdustat.forEach(e => {
                const rowUdise = cleanUdise(e.udise || getVal(e, 'udise') || '');
                if (rowUdise !== udise) return;

                const serial = String(e.serial || '').trim();
                const hours = Number(e.hours) || 0;
                const devType = serialMap[serial] || 'CPU';

                if (devType === 'CPU') {
                    totalCpuHours += hours;
                } else if (devType === 'MINI PC' || devType === 'THIN CLIENT') {
                    totalMiniPcHours += hours;
                } else if (devType === 'INTERACTIVE FLAT PANEL') {
                    totalPanelHoursSch += hours;
                }
            });

            let visitsCount = 0;
            let lastVisitDate = '-';
            
            rangeVisits.forEach(v => {
                if (cleanUdise(v.udise_code) === udise) {
                    visitsCount++;
                }
            });

            visits.forEach(v => {
                if (cleanUdise(v.udise_code) !== udise) return;
                const vDateStr = formatDateStr(v.visit_date);
                if (vDateStr) {
                    if (lastVisitDate === '-' || vDateStr > lastVisitDate) {
                        lastVisitDate = vDateStr;
                    }
                }
            });

            let lastVisitClean = '-';
            if (lastVisitDate !== '-') {
                const parts = lastVisitDate.split('-');
                lastVisitClean = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }

            return {
                udise,
                schoolName: s.school_name || s.school || '-',
                block: s.block || '-',
                instructorStatus,
                cpuInstalled,
                totalCpuHours: parseFloat(totalCpuHours.toFixed(2)),
                miniInstalled,
                totalMiniPcHours: parseFloat(totalMiniPcHours.toFixed(2)),
                panelInstalled: panelInstalledSch,
                totalPanelHours: parseFloat(totalPanelHoursSch.toFixed(2)),
                edustatNotInstalled,
                ictClasses,
                smartClasses,
                visitsCount,
                lastVisitDate: lastVisitClean
            };
        });

        let filteredSch = schDetailsList;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filteredSch = filteredSch.filter(s =>
                s.schoolName.toLowerCase().includes(q) ||
                s.udise.includes(q) ||
                s.block.toLowerCase().includes(q)
            );
        }

        return filteredSch.map((sch, index) => ({
            ...sch,
            slno: index + 1
        }));
    }, [activeZoneDetail, drilldownFilter, schools, visits, jhpmsLab, edustat, edustatMaster, manpower, startDate, endDate, workingDays, ccNameMapping, searchQuery]);

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
        
        let viewType = 'schools';
        if ([
            'cpu_installed', 'mini_installed', 'panel_installed', 'edustat_not_installed',
            'cpu_used', 'mini_used', 'panel_used', 'cpu_not_used', 'mini_not_used', 'panel_not_used'
        ].includes(drilldownFilter)) {
            viewType = 'devices';
        } else if (drilldownFilter === 'working_instructors') {
            viewType = 'instructors';
        } else if (['cpu_hours_logs', 'mini_hours_logs', 'panel_hours_logs'].includes(drilldownFilter)) {
            viewType = 'usage_logs';
        } else if (['ict_classes', 'smart_classes'].includes(drilldownFilter)) {
            viewType = 'classes';
        } else if (['ict_visits', 'smart_visits', 'all_visits'].includes(drilldownFilter)) {
            viewType = 'visits';
        } else if (drilldownFilter === 'coordinators') {
            viewType = 'coordinators';
        }

        if (viewType === 'coordinators') {
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
        } else if (viewType === 'devices') {
            exportFormat = activeZoneDetailsData.map(d => ({
                'Slno': d.slno,
                'UDISE Code': d.udise,
                'School Name': d.schoolName,
                'Block': d.block,
                'Serial No of Device': d.serial,
                'Device Type': d.deviceType,
                'Device Status': d.status
            }));
            label = `${activeZoneDetail.zoneName.replace(/\s+/g, '_')}_Devices_Report`;
        } else if (viewType === 'instructors') {
            exportFormat = activeZoneDetailsData.map(ins => ({
                'Slno': ins.slno,
                'UDISE Code': ins.udise,
                'School Name': ins.schoolName,
                'Block': ins.block,
                'Instructor Name': ins.instructorName,
                'Instructor Status': ins.instructorStatus
            }));
            label = `${activeZoneDetail.zoneName.replace(/\s+/g, '_')}_Active_Instructors`;
        } else if (viewType === 'usage_logs') {
            exportFormat = activeZoneDetailsData.map(l => ({
                'Slno': l.slno,
                'Date': l.date,
                'UDISE Code': l.udise,
                'School Name': l.schoolName,
                'Block': l.block,
                'Serial No of Device': l.serial,
                'Device Type': l.deviceType,
                'Hours Used': l.hours
            }));
            label = `${activeZoneDetail.zoneName.replace(/\s+/g, '_')}_Usage_Logs`;
        } else if (viewType === 'classes') {
            exportFormat = activeZoneDetailsData.map(r => ({
                'Slno': r.slno,
                'Date': r.date,
                'UDISE Code': r.udise,
                'School Name': r.schoolName,
                'Block': r.block,
                'Lab Type': r.labType,
                'Subject': r.subject,
                'Subject Teacher': r.teacher,
                'Topic/Remarks': r.remarks
            }));
            label = `${activeZoneDetail.zoneName.replace(/\s+/g, '_')}_Classes_Logs`;
        } else if (viewType === 'visits') {
            exportFormat = activeZoneDetailsData.map(v => ({
                'Slno': v.slno,
                'Date': v.date,
                'UDISE Code': v.udise,
                'School Name': v.schoolName,
                'Block': v.block,
                'Visit Type': v.visitType,
                'Visitor / CC Name': v.visitorName,
                'Remarks / Findings': v.remarks
            }));
            label = `${activeZoneDetail.zoneName.replace(/\s+/g, '_')}_Visits_Report`;
        } else {
            exportFormat = activeZoneDetailsData.map(s => ({
                'Slno': s.slno,
                'School Name': s.schoolName,
                'UDISE Code': s.udise,
                'Block': s.block,
                'Instructor Status': s.instructorStatus,
                'CPU Installed': s.cpuInstalled,
                'CPU Run Hours': s.totalCpuHours,
                'Mini PC Installed': s.miniInstalled,
                'Mini PC Run Hours': s.totalMiniPcHours,
                'Panel Installed': s.panelInstalled,
                'Panel Run Hours': s.totalPanelHours,
                'Device Not Installed': s.edustatNotInstalled,
                'ICT Classes': s.ictClasses,
                'Smart Classes': s.smartClasses,
                'Monitoring Visits': s.visitsCount,
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

    const drilldownViewType = useMemo(() => {
        if ([
            'cpu_installed', 'mini_installed', 'panel_installed', 'edustat_not_installed',
            'cpu_used', 'mini_used', 'panel_used', 'cpu_not_used', 'mini_not_used', 'panel_not_used'
        ].includes(drilldownFilter)) {
            return 'devices';
        } else if (drilldownFilter === 'working_instructors') {
            return 'instructors';
        } else if (['cpu_hours_logs', 'mini_hours_logs', 'panel_hours_logs'].includes(drilldownFilter)) {
            return 'usage_logs';
        } else if (['ict_classes', 'smart_classes'].includes(drilldownFilter)) {
            return 'classes';
        } else if (['ict_visits', 'smart_visits', 'all_visits'].includes(drilldownFilter)) {
            return 'visits';
        } else if (drilldownFilter === 'coordinators') {
            return 'coordinators';
        }
        return 'schools';
    }, [drilldownFilter]);

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

            {/* Zone Performance Podium – Top 3 */}
            {zoneData.length >= 1 && (
                <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/5 shadow-xl p-6">
                    <div className="text-center mb-6">
                        <h2 className="text-lg font-black text-teal-800 dark:text-teal-400 tracking-tight">🏆 Zone Performance Podium</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Top performing zones ranked by weighted performance score</p>
                    </div>
                    <div className="flex items-end justify-center gap-3 md:gap-6 px-2">
                        {/* Silver – Rank 2 */}
                        {zoneData[1] && (
                            <div className="flex-1 max-w-[200px] flex flex-col items-center">
                                <div className="text-3xl mb-2">🥈</div>
                                <div className="w-full bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 rounded-t-2xl p-4 text-center shadow-lg border border-slate-300/50 dark:border-slate-500/40 h-44 flex flex-col justify-between">
                                    <div>
                                        <div className="text-[10px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-300">Rank #2</div>
                                        <div className="text-sm font-black text-slate-800 dark:text-white mt-1 leading-tight">{zoneData[1].zoneName}</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black text-slate-700 dark:text-slate-200">{zoneData[1].performanceScore}%</div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{zoneData[1].totalSchools} Schools</div>
                                        <div className="text-[10px] text-slate-400 dark:text-slate-500">{zoneData[1].grandTotal} Visits</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Gold – Rank 1 */}
                        {zoneData[0] && (
                            <div className="flex-1 max-w-[240px] flex flex-col items-center">
                                <div className="text-4xl mb-2">🥇</div>
                                <div className="w-full bg-gradient-to-b from-yellow-200 to-amber-400 dark:from-yellow-400 dark:to-amber-600 rounded-t-2xl p-5 text-center shadow-2xl border border-yellow-300/60 dark:border-yellow-500/50 h-56 flex flex-col justify-between">
                                    <div>
                                        <div className="text-[10px] uppercase tracking-widest font-black text-amber-700 dark:text-amber-100">Rank #1 — Top Zone</div>
                                        <div className="text-base font-black text-amber-900 dark:text-white mt-1 leading-tight">{zoneData[0].zoneName}</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-black text-amber-800 dark:text-white">{zoneData[0].performanceScore}%</div>
                                        <div className="text-[10px] text-amber-700 dark:text-amber-200 mt-0.5">{zoneData[0].totalSchools} Schools · {zoneData[0].grandTotal} Visits</div>
                                        <div className="text-[10px] text-amber-600 dark:text-amber-300">{zoneData[0].ictClasses + zoneData[0].smartClasses} Classes Conducted</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Bronze – Rank 3 */}
                        {zoneData[2] && (
                            <div className="flex-1 max-w-[200px] flex flex-col items-center">
                                <div className="text-3xl mb-2">🥉</div>
                                <div className="w-full bg-gradient-to-b from-orange-200 to-orange-400 dark:from-orange-700 dark:to-orange-900 rounded-t-2xl p-4 text-center shadow-lg border border-orange-300/50 dark:border-orange-700/40 h-36 flex flex-col justify-between">
                                    <div>
                                        <div className="text-[10px] uppercase tracking-widest font-black text-orange-700 dark:text-orange-200">Rank #3</div>
                                        <div className="text-sm font-black text-orange-900 dark:text-white mt-1 leading-tight">{zoneData[2].zoneName}</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black text-orange-800 dark:text-white">{zoneData[2].performanceScore}%</div>
                                        <div className="text-[10px] text-orange-700 dark:text-orange-300 mt-0.5">{zoneData[2].totalSchools} Schools</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Remaining zones mini-badges */}
                    {zoneData.length > 3 && (
                        <div className="flex flex-wrap justify-center gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-white/5">
                            {zoneData.slice(3).map((z, i) => (
                                <span key={z.zoneName} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800/60 text-gray-600 dark:text-gray-300 rounded-full text-xs font-bold border border-gray-200 dark:border-white/5">
                                    #{i + 4} {z.zoneName} — {z.performanceScore}%
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

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

                <div className="overflow-x-auto overflow-y-auto max-h-[600px] border border-teal-100 dark:border-white/5 rounded-xl shadow-inner bg-slate-50/50">
                    <table className="w-full text-left border-collapse text-xs select-none">
                        <thead className="bg-gradient-to-r from-teal-800 to-teal-700 text-white sticky top-0 z-30 shadow-md">
                            <tr>
                                <th className="p-3 border-r border-teal-600/30 align-top sticky top-0 left-0 z-40 bg-teal-800 w-[60px] min-w-[60px] max-w-[60px]">Slno</th>
                                <th className="p-3 border-r border-teal-600/30 align-top sticky top-0 left-[60px] z-40 bg-teal-800 w-[120px] min-w-[120px] max-w-[120px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">Zone Name</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[70px]">Projects</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[70px]">Districts</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[80px]">Coordinators</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[80px]">No.of Schools</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[90px]">No. of Instructor Working</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-blue-900/40 min-w-[90px]">No.Of CPU Installed</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-red-950/40 text-red-200 min-w-[100px]">EduStat Not Installed</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-blue-900/40 min-w-[80px]">No.Of CPU Used</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-blue-900/40 text-red-200 min-w-[90px]">No. Of CPU Not Used</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-purple-900/40 min-w-[110px]">No.Of Mini PC / Thin Client Installed</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-purple-900/40 min-w-[100px]">No. Of Mini PC / Thin Client Used</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-purple-900/40 text-red-200 min-w-[110px]">No. Of Mini PC / Thin Client Not Used</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-indigo-900/40 min-w-[100px]">No.Of Panel (IFP) Installed</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-indigo-900/40 min-w-[90px]">No. Of Panel (IFP) Used</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-indigo-900/40 text-red-200 min-w-[100px]">No. Of Panel (IFP) Not Used</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-orange-900/40 min-w-[100px]">Total Hours Used (CPU)</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-orange-900/40 min-w-[110px]">Total Hours Used (Mini PC / Thin Client)</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-orange-900/40 min-w-[100px]">Total Hours Used (Panel / IFP)</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-emerald-900/40 min-w-[110px]">
                                    <div className="custom-tooltip-trigger flex items-center justify-center gap-1">
                                        <span>Avg Hrs/Day/Sch/CPU</span>
                                        <span className="text-emerald-300">ⓘ</span>
                                        <div className="custom-tooltip-box text-white font-normal">
                                            <strong className="text-emerald-300 font-bold block mb-1">Avg Hours/Day/School for CPU</strong>
                                            <div className="border-t border-white/10 pt-1.5 mt-1">
                                                <span className="font-mono text-teal-400 text-[10px] block">FORMULA:</span>
                                                <span className="font-mono bg-black/40 px-1 py-0.5 rounded text-[10px] block my-1">Total CPU Hours / (Working Days × CPUs Installed)</span>
                                            </div>
                                            <p className="text-[10px] text-gray-300 mt-1.5">
                                                Shows the average daily usage hours for each active CPU device within the selected period.
                                            </p>
                                        </div>
                                    </div>
                                </th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-emerald-900/40 min-w-[115px]">
                                    <div className="custom-tooltip-trigger flex items-center justify-center gap-1">
                                        <span>Avg Hrs/Day/Sch/Mini PC</span>
                                        <span className="text-emerald-300">ⓘ</span>
                                        <div className="custom-tooltip-box text-white font-normal">
                                            <strong className="text-emerald-300 font-bold block mb-1">Avg Hours/Day/School for Mini PC / Thin Client</strong>
                                            <div className="border-t border-white/10 pt-1.5 mt-1">
                                                <span className="font-mono text-teal-400 text-[10px] block">FORMULA:</span>
                                                <span className="font-mono bg-black/40 px-1 py-0.5 rounded text-[10px] block my-1">Total Mini PC Hours / (Working Days × Mini PCs Installed)</span>
                                            </div>
                                            <p className="text-[10px] text-gray-300 mt-1.5">
                                                Shows the average daily usage hours for each active Mini PC within the selected period.
                                            </p>
                                        </div>
                                    </div>
                                </th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-emerald-900/40 min-w-[110px]">
                                    <div className="custom-tooltip-trigger flex items-center justify-center gap-1">
                                        <span>Avg Hrs/Day/Sch/Panel</span>
                                        <span className="text-emerald-300">ⓘ</span>
                                        <div className="custom-tooltip-box text-white font-normal">
                                            <strong className="text-emerald-300 font-bold block mb-1">Avg Hours/Day/School for Panel (IFP)</strong>
                                            <div className="border-t border-white/10 pt-1.5 mt-1">
                                                <span className="font-mono text-teal-400 text-[10px] block">FORMULA:</span>
                                                <span className="font-mono bg-black/40 px-1 py-0.5 rounded text-[10px] block my-1">Total Panel Hours / (Working Days × Panels Installed)</span>
                                            </div>
                                            <p className="text-[10px] text-gray-300 mt-1.5">
                                                Shows the average daily usage hours for each Interactive Flat Panel (IFP) within the selected period.
                                            </p>
                                        </div>
                                    </div>
                                </th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-pink-900/40 min-w-[80px]">ICT Classes</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-pink-900/40 min-w-[110px]">
                                    <div className="custom-tooltip-trigger flex items-center justify-center gap-1">
                                        <span>Avg Classes/per school/Day</span>
                                        <span className="text-pink-300">ⓘ</span>
                                        <div className="custom-tooltip-box text-white font-normal">
                                            <strong className="text-pink-300 font-bold block mb-1">Average ICT Classes per School per Day</strong>
                                            <div className="border-t border-white/10 pt-1.5 mt-1">
                                                <span className="font-mono text-pink-400 text-[10px] block">FORMULA:</span>
                                                <span className="font-mono bg-black/40 px-1 py-0.5 rounded text-[10px] block my-1">Total Computer Classes / (Working Days × Total Schools)</span>
                                            </div>
                                        </div>
                                    </div>
                                </th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-yellow-900/40 min-w-[80px]">Smart Classes</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-yellow-900/40 min-w-[110px]">
                                    <div className="custom-tooltip-trigger flex items-center justify-center gap-1">
                                        <span>Avg Smart Classes/per school/Day</span>
                                        <span className="text-yellow-300">ⓘ</span>
                                        <div className="custom-tooltip-box text-white font-normal">
                                            <strong className="text-yellow-300 font-bold block mb-1">Average Smart Classes per School per Day</strong>
                                            <div className="border-t border-white/10 pt-1.5 mt-1">
                                                <span className="font-mono text-yellow-400 text-[10px] block">FORMULA:</span>
                                                <span className="font-mono bg-black/40 px-1 py-0.5 rounded text-[10px] block my-1">Total Smart Classes / (Working Days × Total Schools)</span>
                                            </div>
                                        </div>
                                    </div>
                                </th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[80px]">Total ICT Visit</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[80px]">Total Smart Visit</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[90px]">GrandTotal</th>
                                <th className="p-3 text-center align-top bg-gradient-to-b from-indigo-700 to-indigo-800 text-white min-w-[120px] shadow-md border-l border-indigo-600">Performance Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {zoneData.map((row, idx) => (
                                <tr
                                    key={row.zoneName}
                                    className="hover:bg-teal-50/50 transition-all group"
                                >
                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('all'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-medium sticky left-0 z-20 bg-white dark:bg-slate-900 group-hover:bg-teal-50/80 dark:group-hover:bg-slate-800 w-[60px] min-w-[60px] max-w-[60px] overflow-hidden text-ellipsis cursor-pointer hover:text-teal-900 dark:hover:text-teal-400 transition-all"
                                        title="Click to view all zone schools"
                                    >
                                        {idx + 1}
                                    </td>
                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('all'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 sticky left-[60px] z-20 bg-white dark:bg-slate-900 group-hover:bg-teal-50/80 dark:group-hover:bg-slate-800 w-[120px] min-w-[120px] max-w-[120px] overflow-hidden text-ellipsis cursor-pointer hover:text-teal-900 dark:hover:text-teal-400 font-bold text-teal-800 dark:text-teal-500"
                                        title="Click to view all zone schools"
                                    >
                                        {row.zoneName}
                                    </td>
                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('all'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-semibold text-gray-700 dark:text-gray-300 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer transition-all"
                                        title="Click to view all zone schools"
                                    >
                                        {row.totalProjects}
                                    </td>
                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('all'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-semibold text-gray-700 dark:text-gray-300 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer transition-all"
                                        title="Click to view all zone schools"
                                    >
                                        {row.totalDistricts}
                                    </td>
                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('coordinators'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view the ${row.totalCCs} coordinators in this zone`}
                                    >
                                        {row.totalCCs}
                                    </td>
                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('all'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view all ${row.totalSchools} schools in this zone`}
                                    >
                                        {row.totalSchools}
                                    </td>
                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('working_instructors'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view schools with active working instructors (Total: ${row.instructorWorking})`}
                                    >
                                        {row.instructorWorking}
                                    </td>
                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('cpu_installed'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-blue-50/30 dark:bg-blue-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view schools with CPU devices installed (Total: ${row.cpuInstalled})`}
                                    >
                                        {row.cpuInstalled}
                                    </td>
                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('edustat_not_installed'); setSearchQuery(''); }}
                                        className={`p-3 border-r border-gray-100 dark:border-white/5 text-center bg-red-50/20 dark:bg-red-950/10 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all ${row.edustatNotInstalled > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}
                                        title={`Click to view schools where devices are Not Installed (Total: ${row.edustatNotInstalled})`}
                                    >
                                        {row.edustatNotInstalled}
                                    </td>
                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('cpu_used'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-blue-50/30 dark:bg-blue-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view schools with active CPU usage (Total: ${row.cpuUsed})`}
                                    >
                                        {row.cpuUsed}
                                    </td>
                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('cpu_not_used'); setSearchQuery(''); }}
                                        className={`p-3 border-r border-gray-100 dark:border-white/5 text-center bg-blue-50/30 dark:bg-blue-950/10 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all ${row.cpuNotUsed > 0 ? 'text-red-500' : 'text-gray-400'}`}
                                        title={`Click to view schools where CPU devices were installed but Not Used (Total: ${row.cpuNotUsed})`}
                                    >
                                        {row.cpuNotUsed}
                                    </td>
                                    
                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('mini_installed'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-purple-50/30 dark:bg-purple-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view schools with Mini PC installed (Total: ${row.miniPcInstalled})`}
                                    >
                                        {row.miniPcInstalled}
                                    </td>
                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('mini_used'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-purple-50/30 dark:bg-purple-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view schools with active Mini PC usage (Total: ${row.miniPcUsed})`}
                                    >
                                        {row.miniPcUsed}
                                    </td>
                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('mini_not_used'); setSearchQuery(''); }}
                                        className={`p-3 border-r border-gray-100 dark:border-white/5 text-center bg-purple-50/30 dark:bg-purple-950/10 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all ${row.miniPcNotUsed > 0 ? 'text-red-500' : 'text-gray-400'}`}
                                        title={`Click to view schools where Mini PC was installed but Not Used (Total: ${row.miniPcNotUsed})`}
                                    >
                                        {row.miniPcNotUsed}
                                    </td>

                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('panel_installed'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-indigo-50/30 dark:bg-indigo-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view schools with Panel installed (Total: ${row.panelInstalled})`}
                                    >
                                        {row.panelInstalled}
                                    </td>
                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('panel_used'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-indigo-50/30 dark:bg-indigo-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view schools with active Panel usage (Total: ${row.panelUsed})`}
                                    >
                                        {row.panelUsed}
                                    </td>
                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('panel_not_used'); setSearchQuery(''); }}
                                        className={`p-3 border-r border-gray-100 dark:border-white/5 text-center bg-indigo-50/30 dark:bg-indigo-950/10 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all ${row.panelNotUsed > 0 ? 'text-red-500' : 'text-gray-400'}`}
                                        title={`Click to view schools where Panel was installed but Not Used (Total: ${row.panelNotUsed})`}
                                    >
                                        {row.panelNotUsed}
                                    </td>

                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('cpu_hours_logs'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-orange-50/30 dark:bg-orange-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view CPU daily logs list (Total: ${row.totalCpuHours} hrs)`}
                                    >
                                        {row.totalCpuHours}
                                    </td>
                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('mini_hours_logs'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-orange-50/30 dark:bg-orange-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view Mini PC daily logs list (Total: ${row.totalMiniPcHours} hrs)`}
                                    >
                                        {row.totalMiniPcHours}
                                    </td>
                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('panel_hours_logs'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-orange-50/30 dark:bg-orange-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view Panel daily logs list (Total: ${row.totalPanelHours} hrs)`}
                                    >
                                        {row.totalPanelHours}
                                    </td>

                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('cpu_hours_logs'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view CPU daily logs details (Avg: ${row.avgCpu})`}
                                    >
                                        {row.avgCpu}
                                    </td>
                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('mini_hours_logs'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view Mini PC daily logs details (Avg: ${row.avgMini})`}
                                    >
                                        {row.avgMini}
                                    </td>
                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('panel_hours_logs'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view Panel daily logs details (Avg: ${row.avgPanel})`}
                                    >
                                        {row.avgPanel}
                                    </td>

                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('ict_classes'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-pink-50/30 dark:bg-pink-950/10 text-pink-700 dark:text-pink-400 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view ICT classes conducted (Total: ${row.ictClasses})`}
                                    >
                                        {row.ictClasses}
                                    </td>
                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('ict_classes'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-pink-50/30 dark:bg-pink-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view ICT daily class averages (Avg: ${row.avgClasses})`}
                                    >
                                        {row.avgClasses}
                                    </td>

                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('smart_classes'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-yellow-50/30 dark:bg-yellow-950/10 text-yellow-700 dark:text-yellow-400 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view Smart board classes conducted (Total: ${row.smartClasses})`}
                                    >
                                        {row.smartClasses}
                                    </td>
                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('smart_classes'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-yellow-50/30 dark:bg-yellow-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view Smart board class averages (Avg: ${row.avgSmartClasses})`}
                                    >
                                        {row.avgSmartClasses}
                                    </td>

                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('ict_visits'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view ICT visits conducted (Total: ${row.totalIctVisits})`}
                                    >
                                        {row.totalIctVisits}
                                    </td>
                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('smart_visits'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view Smart board visits conducted (Total: ${row.totalSmartVisits})`}
                                    >
                                        {row.totalSmartVisits}
                                    </td>
                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('all_visits'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-extrabold text-teal-800 dark:text-teal-400 bg-teal-50/50 dark:bg-slate-800 hover:bg-teal-100/50 dark:hover:bg-slate-700 cursor-pointer underline decoration-teal-400/30 hover:text-teal-955 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view all visits list (Total: ${row.grandTotal})`}
                                    >
                                        {row.grandTotal}
                                    </td>

                                    <td
                                        onClick={() => { setActiveZoneDetail(row); setDrilldownFilter('all'); setSearchQuery(''); }}
                                        className="p-3 text-center font-extrabold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 border-l border-indigo-100 dark:border-white/5 text-sm shadow-[inset_1px_0_0_rgba(0,0,0,0.05)] cursor-pointer hover:bg-teal-100/50 dark:hover:bg-slate-850 hover:text-indigo-950 dark:hover:text-indigo-300 transition-all"
                                        title={`Click to view details (Score: ${row.performanceScore}%)`}
                                    >
                                        {row.performanceScore}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Deep Audit Comparative Panel */}
            {auditComparativeData && (
                <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/5 shadow-xl overflow-hidden">
                    {/* Panel Header */}
                    <div className="p-5 border-b border-gray-100 dark:border-white/5 bg-gradient-to-r from-teal-50/60 to-indigo-50/60 dark:from-teal-950/20 dark:to-indigo-950/20">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-black text-teal-800 dark:text-teal-400 tracking-tight flex items-center gap-2">
                                    <Icons.Dashboard className="w-5 h-5" /> Zone Comparative &amp; Deep Audit
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Select a zone to compare its KPIs against the state average and the top-performing zone.</p>
                            </div>
                            <select
                                value={selectedAuditZone || auditComparativeData.selZoneName}
                                onChange={(e) => setSelectedAuditZone(e.target.value)}
                                className="bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-teal-800 dark:text-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-[220px] shadow-sm"
                            >
                                {zoneData.map(z => (
                                    <option key={z.zoneName} value={z.zoneName}>{z.zoneName} (Rank #{z.slno} · {z.performanceScore}%)</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* KPI Comparison Grid */}
                    <div className="p-5">
                        <h3 className="text-[10px] uppercase tracking-widest font-black text-gray-500 dark:text-gray-400 mb-4">Comparative KPI Overview — {auditComparativeData.selZoneName}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                            {[
                                {
                                    label: 'Device Utilization',
                                    unit: '%',
                                    selVal: auditComparativeData.selZoneKPIs.deviceUtil.toFixed(1),
                                    avgVal: auditComparativeData.stateAvg.deviceUtil.toFixed(1),
                                    topVal: auditComparativeData.topZoneKPIs.deviceUtil.toFixed(1),
                                    icon: '💻'
                                },
                                {
                                    label: 'Avg EduStat Hrs/Day',
                                    unit: ' hrs',
                                    selVal: auditComparativeData.selZoneKPIs.avgHoursPerDay.toFixed(2),
                                    avgVal: auditComparativeData.stateAvg.avgHoursPerDay.toFixed(2),
                                    topVal: auditComparativeData.topZoneKPIs.avgHoursPerDay.toFixed(2),
                                    icon: '⏱️'
                                },
                                {
                                    label: 'Class Delivery Rate',
                                    unit: '/sch/day',
                                    selVal: auditComparativeData.selZoneKPIs.classRate.toFixed(3),
                                    avgVal: auditComparativeData.stateAvg.classRate.toFixed(3),
                                    topVal: auditComparativeData.topZoneKPIs.classRate.toFixed(3),
                                    icon: '📚'
                                },
                                {
                                    label: 'Monitoring Intensity',
                                    unit: ' v/sch',
                                    selVal: auditComparativeData.selZoneKPIs.monitoring.toFixed(2),
                                    avgVal: auditComparativeData.stateAvg.monitoring.toFixed(2),
                                    topVal: auditComparativeData.topZoneKPIs.monitoring.toFixed(2),
                                    icon: '👁️'
                                },
                                {
                                    label: 'Instructor Presence',
                                    unit: '%',
                                    selVal: auditComparativeData.selZoneKPIs.instructorRate.toFixed(1),
                                    avgVal: auditComparativeData.stateAvg.instructorRate.toFixed(1),
                                    topVal: auditComparativeData.topZoneKPIs.instructorRate.toFixed(1),
                                    icon: '👤'
                                }
                            ].map((kpi) => {
                                const selNum = parseFloat(kpi.selVal);
                                const avgNum = parseFloat(kpi.avgVal);
                                const isAbove = selNum >= avgNum;
                                const diffPct = avgNum > 0 ? Math.abs(((selNum - avgNum) / avgNum) * 100).toFixed(1) : null;
                                return (
                                    <div key={kpi.label} className={`rounded-xl border p-4 flex flex-col gap-3 ${isAbove ? 'border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/10' : 'border-rose-200 dark:border-rose-800/40 bg-rose-50/40 dark:bg-rose-950/10'}`}>
                                        <div className="flex items-start gap-2">
                                            <span className="text-xl leading-none">{kpi.icon}</span>
                                            <div className="text-[10px] uppercase tracking-widest font-black text-gray-500 dark:text-gray-400 leading-tight">{kpi.label}</div>
                                        </div>
                                        <div>
                                            <div className="text-[9px] uppercase font-black text-gray-400 dark:text-gray-500">Selected Zone</div>
                                            <div className={`text-xl font-black ${isAbove ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{kpi.selVal}{kpi.unit}</div>
                                        </div>
                                        <div className="border-t border-gray-200/60 dark:border-white/5 pt-2 flex justify-between">
                                            <div>
                                                <div className="text-[9px] uppercase font-black text-gray-400 dark:text-gray-500">State Avg</div>
                                                <div className="text-sm font-bold text-gray-600 dark:text-gray-300">{kpi.avgVal}{kpi.unit}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[9px] uppercase font-black text-amber-500">Best Zone</div>
                                                <div className="text-sm font-bold text-amber-600 dark:text-amber-400">{kpi.topVal}{kpi.unit}</div>
                                            </div>
                                        </div>
                                        <div className={`text-[9px] font-black uppercase tracking-wide ${isAbove ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {isAbove ? '▲ Above' : '▼ Below'} Avg{diffPct ? ` (${diffPct}%)` : ''}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Project-wise Breakdown within selected zone */}
                    {projectBreakdownData.length > 0 && (
                        <div className="px-5 pb-5">
                            <h3 className="text-[10px] uppercase tracking-widest font-black text-gray-500 dark:text-gray-400 mb-3">
                                Project-wise Breakdown within {auditComparativeData.selZoneName}
                            </h3>
                            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-white/5">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/60 dark:bg-slate-800/30 text-[9px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 border-b border-gray-100 dark:border-white/5">
                                            <th className="p-3">Project</th>
                                            <th className="p-3 text-center">Schools</th>
                                            <th className="p-3 text-center">Instructors</th>
                                            <th className="p-3 text-center">CPU I/U</th>
                                            <th className="p-3 text-center">Mini PC I/U</th>
                                            <th className="p-3 text-center">Panel I/U</th>
                                            <th className="p-3 text-center">Total Hours</th>
                                            <th className="p-3 text-center">Device Util%</th>
                                            <th className="p-3 text-center">ICT Classes</th>
                                            <th className="p-3 text-center">Smart Classes</th>
                                            <th className="p-3 text-center">Class Rate</th>
                                            <th className="p-3 text-center">Visits</th>
                                            <th className="p-3 text-center">Visit/Sch</th>
                                            <th className="p-3 text-center">Instr.%</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                        {projectBreakdownData.map((p) => (
                                            <tr key={p.projectName} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                                <td className="p-3 font-bold text-indigo-700 dark:text-indigo-400">{p.projectName}</td>
                                                <td className="p-3 text-center font-semibold text-gray-700 dark:text-gray-300">{p.totalSchools}</td>
                                                <td className="p-3 text-center font-semibold text-emerald-700 dark:text-emerald-400">{p.instructorWorking}</td>
                                                <td className="p-3 text-center">
                                                    <span className="font-bold text-gray-800 dark:text-gray-200">{p.cpuInstalled}</span>
                                                    <span className="text-gray-400 mx-0.5">/</span>
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{p.cpuUsed}</span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className="font-bold text-gray-800 dark:text-gray-200">{p.miniPcInstalled}</span>
                                                    <span className="text-gray-400 mx-0.5">/</span>
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{p.miniPcUsed}</span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className="font-bold text-gray-800 dark:text-gray-200">{p.panelInstalled}</span>
                                                    <span className="text-gray-400 mx-0.5">/</span>
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{p.panelUsed}</span>
                                                </td>
                                                <td className="p-3 text-center font-bold text-gray-700 dark:text-gray-300">{p.totalHours}h</td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded font-black text-[10px] ${parseFloat(p.deviceUtil) >= 60 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : parseFloat(p.deviceUtil) >= 30 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                                                        {p.deviceUtil}%
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center font-semibold text-indigo-600 dark:text-indigo-400">{p.ictClasses}</td>
                                                <td className="p-3 text-center font-semibold text-purple-600 dark:text-purple-400">{p.smartClasses}</td>
                                                <td className="p-3 text-center font-semibold text-gray-600 dark:text-gray-400">{p.classRate}</td>
                                                <td className="p-3 text-center font-bold text-teal-600 dark:text-teal-400">{p.totalVisits}</td>
                                                <td className="p-3 text-center font-semibold text-gray-600 dark:text-gray-400">{p.monitoring}</td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded font-black text-[10px] ${parseFloat(p.instRate) >= 80 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : parseFloat(p.instRate) >= 50 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                                                        {p.instRate}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Best Practices & Gap Analysis */}
                    <div className="px-5 pb-6">
                        <h3 className="text-[10px] uppercase tracking-widest font-black text-gray-500 dark:text-gray-400 mb-3">Best Practices &amp; Actionable Gap Analysis</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Best Practices */}
                            <div className="bg-emerald-50/60 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-lg">✅</span>
                                    <h4 className="text-xs uppercase font-black tracking-widest text-emerald-700 dark:text-emerald-400">Best Practice Insights</h4>
                                </div>
                                {gapAnalysisInsights.bestPractices.length > 0 ? (
                                    <ul className="space-y-2.5">
                                        {gapAnalysisInsights.bestPractices.map((insight, i) => (
                                            <li key={i} className="flex items-start gap-2 text-[13px] leading-snug text-emerald-900 dark:text-emerald-200">
                                                <span className="text-emerald-500 mt-0.5 shrink-0 font-bold">▶</span>
                                                <span>{insight}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No significant outperformance detected for this zone.</p>
                                )}
                            </div>

                            {/* Gap Analysis */}
                            <div className="bg-rose-50/60 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-800/30 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-lg">🔍</span>
                                    <h4 className="text-xs uppercase font-black tracking-widest text-rose-700 dark:text-rose-400">Gap Analysis &amp; Recommendations</h4>
                                </div>
                                {gapAnalysisInsights.gaps.length > 0 ? (
                                    <ul className="space-y-2.5">
                                        {gapAnalysisInsights.gaps.map((gap, i) => (
                                            <li key={i} className="flex items-start gap-2 text-[13px] leading-snug text-rose-900 dark:text-rose-200">
                                                <span className="text-rose-500 mt-0.5 shrink-0 font-bold">⚠</span>
                                                <span>{gap}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No significant gaps detected. Zone is performing at or above state average on all KPIs.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Drilldown Detailed View Modal Overlay */}
            {activeZoneDetail && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in no-print">
                    <div className="bg-white dark:bg-slate-900 border border-teal-100 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 text-left">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-gray-150 dark:border-white/5 flex items-center justify-between bg-gradient-to-r from-teal-50 to-teal-50/20 dark:from-teal-950/20 dark:to-transparent">
                            <div className="text-left">
                                <h3 className="font-extrabold text-teal-800 dark:text-teal-400 text-base leading-tight">
                                    {drilldownFilter === 'all' && "Zone Schools Performance Breakdown"}
                                    {drilldownFilter === 'coordinators' && "Zone Coordinators Performance Summary"}
                                    {drilldownFilter === 'working_instructors' && "Zone Schools with Active Instructors"}
                                    {drilldownFilter === 'cpu_installed' && "Zone Schools with CPU Devices Installed"}
                                    {drilldownFilter === 'edustat_not_installed' && "Zone Schools with Devices Not Installed (EduStat Master)"}
                                    {drilldownFilter === 'cpu_used' && "Zone Schools with Active CPU Devices"}
                                    {drilldownFilter === 'cpu_not_used' && "Zone Schools with CPU Devices Installed but Not Used"}
                                    {drilldownFilter === 'mini_installed' && "Zone Schools with Mini PC Installed"}
                                    {drilldownFilter === 'mini_used' && "Zone Schools with Active Mini PC Devices"}
                                    {drilldownFilter === 'mini_not_used' && "Zone Schools with Mini PC Installed but Not Used"}
                                    {drilldownFilter === 'panel_installed' && "Zone Schools with Interactive Flat Panel Installed"}
                                    {drilldownFilter === 'panel_used' && "Zone Schools with Active Panel (IFP) Devices"}
                                    {drilldownFilter === 'panel_not_used' && "Zone Schools with Panel (IFP) Installed but Not Used"}
                                    {drilldownFilter === 'cpu_hours_logs' && "CPU Daily Run Hours Detail (Active Logs)"}
                                    {drilldownFilter === 'mini_hours_logs' && "Mini PC Daily Run Hours Detail (Active Logs)"}
                                    {drilldownFilter === 'panel_hours_logs' && "Panel (IFP) Daily Run Hours Detail (Active Logs)"}
                                    {drilldownFilter === 'ict_classes' && "JHPMS Computer Classes Logging Details"}
                                    {drilldownFilter === 'smart_classes' && "JHPMS Smart Board Classes Logging Details"}
                                    {drilldownFilter === 'ict_visits' && "Field ICT Visits Logging Details"}
                                    {drilldownFilter === 'smart_visits' && "Field Smart Board Visits Logging Details"}
                                    {drilldownFilter === 'all_visits' && "Field Team All Visits Logging Details"}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                                    Zone: <span className="font-bold text-gray-800 dark:text-gray-200">{activeZoneDetail.zoneName}</span> — Projects: {activeZoneDetail.totalProjects}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Export to Excel Button */}
                                {(!userPermissions || userPermissions.menu?.['excel-export-zone-performance']?.show !== false) && (
                                    <button
                                        onClick={handleExportDetail}
                                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
                                        title="Export detailed breakdown to Excel"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        <span>Export Excel</span>
                                    </button>
                                )}
                                {/* Close Button */}
                                <button
                                    onClick={() => { setActiveZoneDetail(null); setSearchQuery(''); }}
                                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors cursor-pointer"
                                    title="Close dialog"
                                >
                                    <Icons.Close className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Search and Filters inside the modal */}
                        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/40 border-b border-gray-150 dark:border-white/5 flex items-center justify-between gap-4">
                            <div className="max-w-md w-full relative">
                                <input
                                    type="text"
                                    placeholder={
                                        drilldownViewType === 'coordinators'
                                            ? "Search by CC name..."
                                            : drilldownViewType === 'devices'
                                            ? "Search by school, UDISE, or serial no..."
                                            : drilldownViewType === 'usage_logs'
                                            ? "Search by school, UDISE, or serial..."
                                            : "Search by school name, UDISE code, or block..."
                                    }
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-950/40 border border-gray-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all shadow-sm"
                                />
                                <div className="absolute left-3 top-2.5 text-gray-400">
                                    <Icons.Search className="w-3.5 h-3.5" />
                                </div>
                            </div>
                            <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 px-3 py-1.5 rounded-lg border border-teal-100 dark:border-teal-950">
                                Total: {activeZoneDetailsData.length} records
                            </span>
                        </div>

                        {/* Modal Body / Scrollable Table */}
                        <div className="overflow-auto flex-1 p-4 bg-slate-50/50 dark:bg-slate-900/30">
                            <div className="border border-gray-200 dark:border-white/5 rounded-xl shadow-inner overflow-x-auto bg-white dark:bg-slate-950">
                                <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                                    <thead className="bg-teal-800 dark:bg-teal-950 text-white sticky top-0 z-30 font-bold">
                                        {drilldownViewType === 'coordinators' && (
                                            <tr className="divide-x divide-teal-700/30">
                                                <th className="p-3 text-center w-[50px]">Rank</th>
                                                <th className="p-3">CC/DEF Name</th>
                                                <th className="p-3 text-center">Schools Covered</th>
                                                <th className="p-3 text-center">Active Instructors</th>
                                                <th className="p-3 text-center bg-teal-900/40">CPU Installed/Used</th>
                                                <th className="p-3 text-center bg-purple-900/40">Mini PC Installed/Used</th>
                                                <th className="p-3 text-center bg-indigo-900/40">Panel Installed/Used</th>
                                                <th className="p-3 text-center bg-orange-900/40">CPU Hours</th>
                                                <th className="p-3 text-center bg-orange-900/40">Mini PC Hours</th>
                                                <th className="p-3 text-center bg-orange-900/40">Panel Hours</th>
                                                <th className="p-3 text-center bg-pink-900/40">ICT Classes</th>
                                                <th className="p-3 text-center bg-yellow-900/40">Smart Classes</th>
                                                <th className="p-3 text-center">Visits</th>
                                                <th className="p-3 text-center bg-indigo-900/80">Local Score</th>
                                            </tr>
                                        )}
                                        {drilldownViewType === 'devices' && (
                                            <tr className="divide-x divide-teal-700/30">
                                                <th className="p-3 text-center w-[50px]">S.No</th>
                                                <th className="p-3 text-center">UDISE Code</th>
                                                <th className="p-3 min-w-[220px]">School Name</th>
                                                <th className="p-3 text-center">Block</th>
                                                <th className="p-3 text-center">Serial No of Device</th>
                                                <th className="p-3 text-center">Device Type</th>
                                                <th className="p-3 text-center">Device Status</th>
                                            </tr>
                                        )}
                                        {drilldownViewType === 'instructors' && (
                                            <tr className="divide-x divide-teal-700/30">
                                                <th className="p-3 text-center w-[50px]">S.No</th>
                                                <th className="p-3 text-center">UDISE Code</th>
                                                <th className="p-3 min-w-[220px]">School Name</th>
                                                <th className="p-3 text-center">Block</th>
                                                <th className="p-3 text-center">Instructor Name</th>
                                                <th className="p-3 text-center">Instructor Status</th>
                                            </tr>
                                        )}
                                        {drilldownViewType === 'usage_logs' && (
                                            <tr className="divide-x divide-teal-700/30">
                                                <th className="p-3 text-center w-[50px]">S.No</th>
                                                <th className="p-3 text-center">Date</th>
                                                <th className="p-3 text-center">UDISE Code</th>
                                                <th className="p-3 min-w-[220px]">School Name</th>
                                                <th className="p-3 text-center">Block</th>
                                                <th className="p-3 text-center">Serial No of Device</th>
                                                <th className="p-3 text-center">Device Type</th>
                                                <th className="p-3 text-center bg-teal-950/30">Hours Used</th>
                                            </tr>
                                        )}
                                        {drilldownViewType === 'classes' && (
                                            <tr className="divide-x divide-teal-700/30">
                                                <th className="p-3 text-center w-[50px]">S.No</th>
                                                <th className="p-3 text-center">Date</th>
                                                <th className="p-3 text-center">UDISE Code</th>
                                                <th className="p-3 min-w-[220px]">School Name</th>
                                                <th className="p-3 text-center">Block</th>
                                                <th className="p-3 text-center">Lab Type</th>
                                                <th className="p-3 text-center">Subject</th>
                                                <th className="p-3 text-center">Subject Teacher</th>
                                                <th className="p-3 min-w-[200px]">Topic/Remarks</th>
                                            </tr>
                                        )}
                                        {drilldownViewType === 'visits' && (
                                            <tr className="divide-x divide-teal-700/30">
                                                <th className="p-3 text-center w-[50px]">S.No</th>
                                                <th className="p-3 text-center">Date</th>
                                                <th className="p-3 text-center">UDISE Code</th>
                                                <th className="p-3 min-w-[220px]">School Name</th>
                                                <th className="p-3 text-center">Block</th>
                                                <th className="p-3 text-center">Visit Type</th>
                                                <th className="p-3 text-left pl-4">Visitor / CC Name</th>
                                                <th className="p-3 min-w-[240px]">Remarks / Findings</th>
                                            </tr>
                                        )}
                                        {drilldownViewType === 'schools' && (
                                            <tr className="divide-x divide-teal-700/30">
                                                <th className="p-3 text-center w-[50px]">S.No</th>
                                                <th className="p-3 min-w-[220px]">School Name</th>
                                                <th className="p-3 text-center">UDISE</th>
                                                <th className="p-3 text-center">Block</th>
                                                <th className="p-3 text-center">Instructor Status</th>
                                                <th className="p-3 text-center bg-blue-900/10">CPU Installed</th>
                                                <th className="p-3 text-center bg-blue-900/10">CPU Run Hours</th>
                                                <th className="p-3 text-center bg-purple-900/10">Mini PC Installed</th>
                                                <th className="p-3 text-center bg-purple-900/10">Mini PC Run Hours</th>
                                                <th className="p-3 text-center bg-red-950/10 text-red-600 dark:text-red-300">Device Not Installed</th>
                                                <th className="p-3 text-center bg-pink-900/10">JHPMS ICT Classes</th>
                                                <th className="p-3 text-center bg-yellow-900/10 font-medium">JHPMS Smart Classes</th>
                                                <th className="p-3 text-center">Monitoring Visits</th>
                                                <th className="p-3 text-center">Last Visit Date</th>
                                            </tr>
                                        )}
                                    </thead>
                                    <tbody className="divide-y divide-gray-150 dark:divide-white/5 text-gray-700 dark:text-gray-300">
                                        {drilldownViewType === 'coordinators' && activeZoneDetailsData.map((cc, i) => (
                                            <tr key={cc.ccName} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors divide-x divide-gray-100 dark:divide-white/5">
                                                <td className="p-2.5 text-center font-medium text-gray-500 dark:text-gray-400">{i + 1}</td>
                                                <td className="p-2.5 font-bold text-teal-800 dark:text-teal-400">{cc.ccName}</td>
                                                <td className="p-2.5 text-center font-semibold text-gray-700 dark:text-gray-300">{cc.totalSchools}</td>
                                                <td className="p-2.5 text-center font-semibold text-emerald-700 dark:text-emerald-400">{cc.instructorWorking}</td>
                                                <td className="p-2.5 text-center">
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{cc.cpuInstalled}</span>
                                                    <span className="text-gray-400 mx-1">/</span>
                                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{cc.cpuUsed}</span>
                                                </td>
                                                <td className="p-2.5 text-center">
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{cc.miniPcInstalled}</span>
                                                    <span className="text-gray-400 mx-1">/</span>
                                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{cc.miniPcUsed}</span>
                                                </td>
                                                <td className="p-2.5 text-center">
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{cc.panelInstalled}</span>
                                                    <span className="text-gray-400 mx-1">/</span>
                                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{cc.panelUsed}</span>
                                                </td>
                                                <td className="p-2.5 text-center font-medium text-gray-600 dark:text-gray-400">{cc.totalCpuHours} hrs</td>
                                                <td className="p-2.5 text-center font-medium text-gray-600 dark:text-gray-400">{cc.totalMiniPcHours} hrs</td>
                                                <td className="p-2.5 text-center font-medium text-gray-600 dark:text-gray-400">{cc.totalPanelHours} hrs</td>
                                                <td className="p-2.5 text-center font-semibold text-gray-700 dark:text-gray-300">{cc.ictClasses}</td>
                                                <td className="p-2.5 text-center font-semibold text-gray-700 dark:text-gray-300">{cc.smartClasses}</td>
                                                <td className="p-2.5 text-center font-bold text-teal-600 dark:text-teal-400">{cc.visitsCount}</td>
                                                <td className="p-2.5 text-center">
                                                    <span className={`px-2 py-1 rounded font-bold text-[11px] ${cc.performanceScore >= 75 ? 'bg-emerald-500/10 text-emerald-500' : cc.performanceScore >= 50 ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                        {cc.performanceScore}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {drilldownViewType === 'devices' && activeZoneDetailsData.map((m, sIdx) => (
                                            <tr key={sIdx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors divide-x divide-gray-100 dark:divide-white/5">
                                                <td className="p-2.5 text-center font-medium text-gray-500 dark:text-gray-400">{m.slno}</td>
                                                <td className="p-2.5 text-center font-mono text-xs">{m.udise}</td>
                                                <td className="p-2.5 font-bold text-gray-800 dark:text-gray-200 max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap">{m.schoolName}</td>
                                                <td className="p-2.5 text-center">{m.block}</td>
                                                <td className="p-2.5 text-center font-semibold text-teal-700 dark:text-teal-400">{m.serial}</td>
                                                <td className="p-2.5 text-center font-medium">{m.deviceType}</td>
                                                <td className="p-2.5 text-center">
                                                    {m.status === 'Active / Syncing' && <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 shadow-sm leading-none">Active / Syncing</span>}
                                                    {m.status === 'Idle / Not Used' && <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm leading-none">Idle / Not Used</span>}
                                                    {m.status === 'Not Installed' && <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-sm leading-none">Not Installed</span>}
                                                </td>
                                            </tr>
                                        ))}
                                        {drilldownViewType === 'instructors' && activeZoneDetailsData.map((ins, sIdx) => (
                                            <tr key={sIdx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors divide-x divide-gray-100 dark:divide-white/5">
                                                <td className="p-2.5 text-center font-medium text-gray-500 dark:text-gray-400">{ins.slno}</td>
                                                <td className="p-2.5 text-center font-mono text-xs">{ins.udise}</td>
                                                <td className="p-2.5 font-bold text-gray-800 dark:text-gray-200 max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap">{ins.schoolName}</td>
                                                <td className="p-2.5 text-center">{ins.block}</td>
                                                <td className="p-2.5 text-left pl-4 font-semibold text-slate-800 dark:text-slate-200">{ins.instructorName}</td>
                                                <td className="p-2.5 text-center">
                                                    {ins.instructorStatus === 'Active' && <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 shadow-sm leading-none">Active</span>}
                                                    {ins.instructorStatus === 'Pending' && <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm leading-none">Pending</span>}
                                                    {ins.instructorStatus === 'Vacant' && <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-sm leading-none">Vacant</span>}
                                                </td>
                                            </tr>
                                        ))}
                                        {drilldownViewType === 'usage_logs' && activeZoneDetailsData.map((log, sIdx) => (
                                            <tr key={sIdx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors divide-x divide-gray-100 dark:divide-white/5">
                                                <td className="p-2.5 text-center font-medium text-gray-500 dark:text-gray-400">{log.slno}</td>
                                                <td className="p-2.5 text-center font-semibold text-slate-800 dark:text-slate-200">{log.date}</td>
                                                <td className="p-2.5 text-center font-mono text-xs">{log.udise}</td>
                                                <td className="p-2.5 font-bold text-gray-800 dark:text-gray-200 max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap">{log.schoolName}</td>
                                                <td className="p-2.5 text-center">{log.block}</td>
                                                <td className="p-2.5 text-center font-mono text-teal-700 dark:text-teal-400">{log.serial}</td>
                                                <td className="p-2.5 text-center font-medium">{log.deviceType}</td>
                                                <td className="p-2.5 text-center font-bold bg-teal-50/20 text-teal-800 dark:text-teal-400">{log.hours} hrs</td>
                                            </tr>
                                        ))}
                                        {drilldownViewType === 'classes' && activeZoneDetailsData.map((rowClass, sIdx) => (
                                            <tr key={sIdx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors divide-x divide-gray-100 dark:divide-white/5">
                                                <td className="p-2.5 text-center font-medium text-gray-500 dark:text-gray-400">{rowClass.slno}</td>
                                                <td className="p-2.5 text-center font-semibold text-slate-800 dark:text-slate-200">{rowClass.date}</td>
                                                <td className="p-2.5 text-center font-mono text-xs">{rowClass.udise}</td>
                                                <td className="p-2.5 font-bold text-gray-800 dark:text-gray-200 max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">{rowClass.schoolName}</td>
                                                <td className="p-2.5 text-center">{rowClass.block}</td>
                                                <td className="p-2.5 text-center font-semibold">{rowClass.labType}</td>
                                                <td className="p-2.5 text-center font-medium text-teal-700 dark:text-teal-400">{rowClass.subject}</td>
                                                <td className="p-2.5 text-left pl-3 text-slate-700 dark:text-slate-350">{rowClass.teacher}</td>
                                                <td className="p-2.5 text-left pl-3 max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap text-gray-500 dark:text-gray-400" title={rowClass.remarks}>{rowClass.remarks}</td>
                                            </tr>
                                        ))}
                                        {drilldownViewType === 'visits' && activeZoneDetailsData.map((v, sIdx) => (
                                            <tr key={sIdx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors divide-x divide-gray-100 dark:divide-white/5">
                                                <td className="p-2.5 text-center font-medium text-gray-500 dark:text-gray-400">{v.slno}</td>
                                                <td className="p-2.5 text-center font-semibold text-slate-800 dark:text-slate-200">{v.date}</td>
                                                <td className="p-2.5 text-center font-mono text-xs">{v.udise}</td>
                                                <td className="p-2.5 font-bold text-gray-800 dark:text-gray-200 max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">{v.schoolName}</td>
                                                <td className="p-2.5 text-center">{v.block}</td>
                                                <td className="p-2.5 text-center font-semibold">
                                                    {v.visitType.toLowerCase().includes('ict') ? (
                                                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm leading-none">{v.visitType}</span>
                                                    ) : (
                                                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-sm leading-none">{v.visitType}</span>
                                                    )}
                                                </td>
                                                <td className="p-2.5 text-left pl-4 font-semibold text-slate-700 dark:text-slate-350">{v.visitorName}</td>
                                                <td className="p-2.5 text-left pl-4 max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap text-gray-500 dark:text-gray-400" title={v.remarks}>{v.remarks}</td>
                                            </tr>
                                        ))}
                                        {drilldownViewType === 'schools' && activeZoneDetailsData.map((sch, sIdx) => (
                                            <tr key={sIdx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors divide-x divide-gray-100 dark:divide-white/5">
                                                <td className="p-2.5 text-center font-medium text-gray-500 dark:text-gray-400">{sch.slno}</td>
                                                <td className="p-2.5 font-bold text-gray-800 dark:text-gray-200 max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap">{sch.schoolName}</td>
                                                <td className="p-2.5 text-center font-mono text-xs">{sch.udise}</td>
                                                <td className="p-2.5 text-center">{sch.block}</td>
                                                <td className="p-2.5 text-center">
                                                    {sch.instructorStatus === 'Active' && <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 shadow-sm leading-none">Active</span>}
                                                    {sch.instructorStatus === 'Pending' && <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm leading-none">Pending</span>}
                                                    {sch.instructorStatus === 'Vacant' && <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-sm leading-none">Vacant</span>}
                                                    {sch.instructorStatus === 'N/A' && <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200 leading-none">N/A</span>}
                                                </td>
                                                <td className="p-2.5 text-center bg-blue-50/20 dark:bg-blue-950/10">{sch.cpuInstalled}</td>
                                                <td className="p-2.5 text-center font-bold bg-blue-50/20 dark:bg-blue-950/10 text-blue-700 dark:text-blue-400">{sch.totalCpuHours}</td>
                                                <td className="p-2.5 text-center bg-purple-50/20 dark:bg-purple-950/10">{sch.miniInstalled}</td>
                                                <td className="p-2.5 text-center font-bold bg-purple-50/20 dark:bg-purple-950/10 text-purple-700 dark:text-purple-400">{sch.totalMiniPcHours}</td>
                                                <td className={`p-2.5 text-center bg-red-50/10 dark:bg-red-950/5 font-bold ${sch.edustatNotInstalled > 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-600'}`}>{sch.edustatNotInstalled}</td>
                                                <td className="p-2.5 text-center font-bold bg-pink-50/20 dark:bg-pink-950/10 text-pink-700 dark:text-pink-400">{sch.ictClasses}</td>
                                                <td className="p-2.5 text-center font-bold bg-yellow-50/20 dark:bg-yellow-950/10 text-yellow-700 dark:text-yellow-400">{sch.smartClasses}</td>
                                                <td className="p-2.5 text-center font-semibold text-gray-800 dark:text-gray-200">{sch.visitsCount}</td>
                                                <td className="p-2.5 text-center font-medium text-gray-500 dark:text-gray-400">{sch.lastVisitDate}</td>
                                            </tr>
                                        ))}
                                        {activeZoneDetailsData.length === 0 && (
                                            <tr>
                                                <td colSpan="20" className="p-6 text-center text-gray-400">
                                                    No records found matching the search query or selected filters.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-3.5 border-t border-gray-150 dark:border-white/5 bg-gray-50 dark:bg-slate-900/60 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                            <span>Showing {activeZoneDetailsData.length} records inside {activeZoneDetail.zoneName}</span>
                            <button
                                onClick={() => { setActiveZoneDetail(null); setSearchQuery(''); }}
                                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-white/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-300 rounded-lg font-bold transition-colors cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ZonePerformance;
