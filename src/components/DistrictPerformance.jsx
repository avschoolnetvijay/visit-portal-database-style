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

const DistrictPerformance = ({
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
    const [activeDistrictDetail, setActiveDistrictDetail] = useState(null);
    const [drilldownFilter, setDrilldownFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAuditDistrict, setSelectedAuditDistrict] = useState('');

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

    const keyCache = {};
    const getVal = (row, keyMatch) => {
        if (!row) return null;
        if (keyCache[keyMatch] !== undefined) {
            const cachedKey = keyCache[keyMatch];
            return cachedKey ? row[cachedKey] : null;
        }
        const key = Object.keys(row).find(k => k.toLowerCase().includes(keyMatch.toLowerCase()));
        keyCache[keyMatch] = key || null;
        return key ? row[key] : null;
    };

    // Calculate District-wise Performance Data
    const districtData = useMemo(() => {
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

        // Group into Districts
        const districtMap = {};

        fSchools.forEach(s => {
            const district = s.district || 'Unassigned District';
            if (!districtMap[district]) {
                districtMap[district] = {
                    districtName: district,
                    totalSchools: 0,
                    projects: new Set(),
                    zones: new Set(),
                    blocks: new Set(),
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
            districtMap[district].totalSchools++;
            if (s.project_name) districtMap[district].projects.add(s.project_name);
            if (s.zone) districtMap[district].zones.add(s.zone);
            if (s.block) districtMap[district].blocks.add(s.block);
            if (s.visitor_name) districtMap[district].ccNames.add(s.visitor_name);
            districtMap[district].udises.add(cleanUdise(s.udise_code));
        });

        // Build reverse index map of UDISE to districtKey for O(1) lookups
        const udiseToDistrictKey = {};
        Object.entries(districtMap).forEach(([key, data]) => {
            data.udises.forEach(u => {
                udiseToDistrictKey[u] = key;
            });
        });

        // Add Manpower
        manpower.forEach(m => {
            const udise = cleanUdise(m.udise || getVal(m, 'udise'));
            const status = String(getVal(m, 'status') || '').trim();
            const sUpper = status.toUpperCase();
            const isWorking = sUpper.includes('WORKING') || sUpper.includes('ACTIVE') || status === '';

            if (isWorking) {
                const distKey = udiseToDistrictKey[udise];
                if (distKey) {
                    districtMap[distKey].instructorWorking++;
                }
            }
        });

        // Add Edustat Master Baseline
        (edustatMaster || []).forEach(m => {
            const udise = String(m.udise).trim();
            const device = String(m.device || '').toUpperCase();
            const installed = String(m.installed || '').toUpperCase();

            const distKey = udiseToDistrictKey[udise];
            if (distKey) {
                if (installed === 'YES') {
                    if (device === 'CPU') {
                        districtMap[distKey].cpuInstalled++;
                    } else if (device === 'MINI PC' || device === 'THIN CLIENT') {
                        districtMap[distKey].miniPcInstalled++;
                    } else if (device === 'INTERACTIVE FLAT PANEL') {
                        districtMap[distKey].panelInstalled++;
                    }
                } else if (installed === 'NO') {
                    districtMap[distKey].edustatNotInstalled++;
                }
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

            const distKey = udiseToDistrictKey[udise];
            if (distKey) {
                if (deviceType === 'CPU') {
                    districtMap[distKey].totalCpuHours += hours;
                } else if (deviceType === 'MINI PC' || deviceType === 'THIN CLIENT') {
                    districtMap[distKey].totalMiniPcHours += hours;
                } else if (deviceType === 'INTERACTIVE FLAT PANEL') {
                    districtMap[distKey].totalPanelHours += hours;
                }
            }
        });

        // Calculate Used counts
        (edustatMaster || []).forEach(m => {
            const udise = String(m.udise).trim();
            const serial = String(m.serial).trim();
            const device = String(m.device || '').toUpperCase();
            const installed = String(m.installed || '').toUpperCase();

            if (installed === 'YES' && activeSerials.has(serial)) {
                const distKey = udiseToDistrictKey[udise];
                if (distKey) {
                    if (device === 'CPU') {
                        districtMap[distKey].cpuUsed++;
                    } else if (device === 'MINI PC' || device === 'THIN CLIENT') {
                        districtMap[distKey].miniPcUsed++;
                    } else if (device === 'INTERACTIVE FLAT PANEL') {
                        districtMap[distKey].panelUsed++;
                    }
                }
            }
        });

        // JHPMS classes in range
        jhpmsLab.forEach(l => {
            const udise = String(l.udise || getVal(l, 'udise') || '').trim();
            const labType = String(l.labType || getVal(l, 'lab') || '').toUpperCase();
            const subject = String(l.subject || getVal(l, 'sub') || '').toUpperCase();
            const dateStr = formatDateStr(l.date || getVal(l, 'date'));

            if (dateStr && dateStr >= startDate && dateStr <= endDate) {
                const distKey = udiseToDistrictKey[udise];
                if (distKey) {
                    if (subject.split(/[^A-Z0-9]+/).includes('MIS')) {
                        // Ignore MIS
                    } else if (labType.includes('ICT') && subject.includes('COMPUTER')) {
                        districtMap[distKey].ictClasses++;
                    } else if (labType.includes('SMART')) {
                        districtMap[distKey].smartClasses++;
                    }
                }
            }
        });

        // Visits in range
        visits.forEach(v => {
            const udise = String(v.udise_code || '').trim();
            const dateStr = formatDateStr(v.visit_date || getVal(v, 'date'));
            const type = (v.visit_type || '').toLowerCase();

            if (dateStr && dateStr >= startDate && dateStr <= endDate) {
                const distKey = udiseToDistrictKey[udise];
                if (distKey) {
                    if (type.includes('ict')) districtMap[distKey].totalIctVisits++;
                    if (type.includes('smart')) districtMap[distKey].totalSmartVisits++;
                }
            }
        });

        // Days calculation
        const days = Number(workingDays) && Number(workingDays) >= 1
            ? Number(workingDays)
            : Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

        let maxAvgCpu = 0, maxAvgMini = 0, maxAvgPanel = 0;
        let maxAcademic = 0, maxSmart = 0;
        let maxMonitoring = 0, maxAvailability = 0;

        let pass1Data = Object.values(districtMap).map(d => {
            const cpuNotUsed = Math.max(0, d.cpuInstalled - d.cpuUsed);
            const miniPcNotUsed = Math.max(0, d.miniPcInstalled - d.miniPcUsed);
            const panelNotUsed = Math.max(0, d.panelInstalled - d.panelUsed);

            const avgCpu = d.cpuInstalled > 0 ? (d.totalCpuHours / days / d.cpuInstalled) : 0;
            const avgMini = d.miniPcInstalled > 0 ? (d.totalMiniPcHours / days / d.miniPcInstalled) : 0;
            const avgPanel = d.panelInstalled > 0 ? (d.totalPanelHours / days / d.panelInstalled) : 0;
            const academic = d.totalSchools > 0 ? (d.ictClasses / d.totalSchools) : 0;
            const smart = d.totalSchools > 0 ? (d.smartClasses / d.totalSchools) : 0;
            const monitoring = d.totalSchools > 0 ? ((d.totalIctVisits + d.totalSmartVisits) / d.totalSchools) : 0;
            const availability = d.totalSchools > 0 ? (d.instructorWorking / d.totalSchools) : 0;

            const avgClasses = d.totalSchools > 0 ? (d.ictClasses / (days * d.totalSchools)) : 0;
            const avgSmartClasses = d.totalSchools > 0 ? (d.smartClasses / (days * d.totalSchools)) : 0;

            maxAvgCpu = Math.max(maxAvgCpu, avgCpu);
            maxAvgMini = Math.max(maxAvgMini, avgMini);
            maxAvgPanel = Math.max(maxAvgPanel, avgPanel);
            maxAcademic = Math.max(maxAcademic, academic);
            maxSmart = Math.max(maxSmart, smart);
            maxMonitoring = Math.max(maxMonitoring, monitoring);
            maxAvailability = Math.max(maxAvailability, availability);

            return {
                districtName: d.districtName,
                totalSchools: d.totalSchools,
                totalProjects: d.projects.size,
                totalZones: d.zones.size,
                totalBlocks: d.blocks.size,
                totalCCs: d.ccNames.size,
                instructorWorking: d.instructorWorking,
                cpuInstalled: d.cpuInstalled,
                cpuUsed: d.cpuUsed,
                cpuNotUsed,
                miniPcInstalled: d.miniPcInstalled,
                miniPcUsed: d.miniPcUsed,
                miniPcNotUsed,
                panelInstalled: d.panelInstalled,
                panelUsed: d.panelUsed,
                panelNotUsed,
                edustatNotInstalled: d.edustatNotInstalled,
                totalCpuHours: parseFloat(d.totalCpuHours.toFixed(2)),
                totalMiniPcHours: parseFloat(d.totalMiniPcHours.toFixed(2)),
                totalPanelHours: parseFloat(d.totalPanelHours.toFixed(2)),
                avgCpuRaw: avgCpu,
                avgMiniRaw: avgMini,
                avgPanelRaw: avgPanel,
                avgCpu: avgCpu.toFixed(5),
                avgMini: avgMini.toFixed(5),
                avgPanel: avgPanel.toFixed(5),
                ictClasses: d.ictClasses,
                avgClasses: avgClasses.toFixed(5),
                smartClasses: d.smartClasses,
                avgSmartClasses: avgSmartClasses.toFixed(5),
                totalIctVisits: d.totalIctVisits,
                totalSmartVisits: d.totalSmartVisits,
                grandTotal: d.totalIctVisits + d.totalSmartVisits,
                udises: d.udises,
                ccNames: d.ccNames,
                academicRaw: academic,
                smartRaw: smart,
                monitoringRaw: monitoring,
                availabilityRaw: availability
            };
        });

        let finalData = pass1Data.map(d => {
            const cpuUtil = d.cpuInstalled > 0 ? (d.cpuUsed / d.cpuInstalled) : 0;
            const miniUtil = d.miniPcInstalled > 0 ? (d.miniPcUsed / d.miniPcInstalled) : 0;
            const panelUtil = d.panelInstalled > 0 ? (d.panelUsed / d.panelInstalled) : 0;
            const activeDeviceTypes = [cpuUtil, miniUtil, panelUtil].filter((_, i) => [d.cpuInstalled, d.miniPcInstalled, d.panelInstalled][i] > 0);
            const infraScore = (activeDeviceTypes.length > 0 ? activeDeviceTypes.reduce((a, b) => a + b, 0) / activeDeviceTypes.length : 0) * 25;

            const normCpu = maxAvgCpu > 0 ? (d.avgCpuRaw / maxAvgCpu) : 0;
            const normMini = maxAvgMini > 0 ? (d.avgMiniRaw / maxAvgMini) : 0;
            const normPanel = maxAvgPanel > 0 ? (d.avgPanelRaw / maxAvgPanel) : 0;
            const activeUsageTypes = [normCpu, normMini, normPanel].filter((_, i) => [d.cpuInstalled, d.miniPcInstalled, d.panelInstalled][i] > 0);
            const usageScore = (activeUsageTypes.length > 0 ? activeUsageTypes.reduce((a, b) => a + b, 0) / activeUsageTypes.length : 0) * 20;

            const academicScore = maxAcademic > 0 ? (d.academicRaw / maxAcademic) * 20 : 0;
            const smartScore = maxSmart > 0 ? (d.smartRaw / maxSmart) * 10 : 0;
            const monitoringScore = maxMonitoring > 0 ? (d.monitoringRaw / maxMonitoring) * 15 : 0;
            const availabilityScore = maxAvailability > 0 ? (d.availabilityRaw / maxAvailability) * 10 : 0;

            const performanceScore = infraScore + usageScore + academicScore + smartScore + monitoringScore + availabilityScore;

            return {
                ...d,
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
        if (!districtData.length) return null;
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const days = Number(workingDays) && Number(workingDays) >= 1
            ? Number(workingDays)
            : Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

        const getKPIs = (d) => {
            const totalInstalled = d.cpuInstalled + d.miniPcInstalled + d.panelInstalled;
            const totalUsed = d.cpuUsed + d.miniPcUsed + d.panelUsed;
            const deviceUtil = totalInstalled > 0 ? (totalUsed / totalInstalled) * 100 : 0;
            const totalHours = d.totalCpuHours + d.totalMiniPcHours + d.totalPanelHours;
            const avgHoursPerDay = d.totalSchools > 0 && days > 0 ? totalHours / days / d.totalSchools : 0;
            const classRate = d.totalSchools > 0 && days > 0 ? (d.ictClasses + d.smartClasses) / (days * d.totalSchools) : 0;
            const smartRate = d.totalSchools > 0 && days > 0 ? d.smartClasses / (days * d.totalSchools) : 0;
            const monitoring = d.totalSchools > 0 ? d.grandTotal / d.totalSchools : 0;
            const instructorRate = d.totalSchools > 0 ? (d.instructorWorking / d.totalSchools) * 100 : 0;
            return { deviceUtil, avgHoursPerDay, classRate, smartRate, monitoring, instructorRate };
        };

        const allKPIs = districtData.map(getKPIs);
        const n = allKPIs.length;
        const stateAvg = {
            deviceUtil: allKPIs.reduce((a, k) => a + k.deviceUtil, 0) / n,
            avgHoursPerDay: allKPIs.reduce((a, k) => a + k.avgHoursPerDay, 0) / n,
            classRate: allKPIs.reduce((a, k) => a + k.classRate, 0) / n,
            smartRate: allKPIs.reduce((a, k) => a + k.smartRate, 0) / n,
            monitoring: allKPIs.reduce((a, k) => a + k.monitoring, 0) / n,
            instructorRate: allKPIs.reduce((a, k) => a + k.instructorRate, 0) / n,
        };

        const topDistrictObj = districtData[0];
        const topDistrictKPIs = allKPIs[0];

        const selDistrictName = selectedAuditDistrict || districtData[0]?.districtName || '';
        const selIdx = districtData.findIndex(d => d.districtName === selDistrictName);
        const resolvedIdx = selIdx >= 0 ? selIdx : 0;
        const selDistrictObj = districtData[resolvedIdx];
        const selDistrictKPIs = allKPIs[resolvedIdx];

        return { days, selDistrictName: selDistrictObj?.districtName || selDistrictName, selDistrictObj, selDistrictKPIs, topDistrictObj, topDistrictKPIs, stateAvg };
    }, [districtData, selectedAuditDistrict, startDate, endDate, workingDays]);

    // ============================
    // BLOCK BREAKDOWN (within selected district)
    // ============================
    const blockBreakdownData = useMemo(() => {
        if (!auditComparativeData || !auditComparativeData.selDistrictObj) return [];
        const { selDistrictObj, days } = auditComparativeData;
        const districtUdises = selDistrictObj.udises;

        const districtSchools = schools.filter(s => districtUdises.has(cleanUdise(s.udise_code)));
        if (!districtSchools.length) return [];

        const blockMap = {};
        districtSchools.forEach(s => {
            const block = s.block || 'Unassigned Block';
            if (!blockMap[block]) {
                blockMap[block] = {
                    blockName: block,
                    totalSchools: 0,
                    instructorWorking: 0,
                    cpuInstalled: 0, cpuUsed: 0,
                    miniPcInstalled: 0, miniPcUsed: 0,
                    panelInstalled: 0, panelUsed: 0,
                    totalCpuHours: 0, totalMiniPcHours: 0, totalPanelHours: 0,
                    ictClasses: 0, smartClasses: 0,
                    ictVisits: 0, smartVisits: 0,
                    edustatNotInstalled: 0,
                    udises: new Set(),
                    projects: new Set(),
                    ccNames: new Set()
                };
            }
            blockMap[block].totalSchools++;
            blockMap[block].udises.add(cleanUdise(s.udise_code));
            if (s.project_name) blockMap[block].projects.add(s.project_name);
            if (s.visitor_name) blockMap[block].ccNames.add(s.visitor_name);
        });

        manpower.forEach(m => {
            const udise = cleanUdise(m.udise || getVal(m, 'udise'));
            const status = String(getVal(m, 'status') || '').trim();
            const isWorking = status.toUpperCase().includes('WORKING') || status.toUpperCase().includes('ACTIVE') || status === '';
            if (isWorking) {
                Object.values(blockMap).forEach(b => { if (b.udises.has(udise)) b.instructorWorking++; });
            }
        });

        (edustatMaster || []).forEach(m => {
            const udise = String(m.udise).trim();
            const device = String(m.device || '').toUpperCase();
            const installed = String(m.installed || '').toUpperCase();
            if (installed === 'YES') {
                Object.values(blockMap).forEach(b => {
                    if (b.udises.has(udise)) {
                        if (device === 'CPU') b.cpuInstalled++;
                        else if (device === 'MINI PC' || device === 'THIN CLIENT') b.miniPcInstalled++;
                        else if (device === 'INTERACTIVE FLAT PANEL') b.panelInstalled++;
                    }
                });
            } else if (installed === 'NO') {
                Object.values(blockMap).forEach(b => {
                    if (b.udises.has(udise)) {
                        b.edustatNotInstalled++;
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

        (edustatMaster || []).forEach(m => {
            const udise = String(m.udise).trim();
            const serial = String(m.serial).trim();
            const device = String(m.device || '').toUpperCase();
            const installed = String(m.installed || '').toUpperCase();
            if (districtUdises.has(udise) && installed === 'YES' && activeSerialsP.has(serial)) {
                Object.values(blockMap).forEach(b => {
                    if (b.udises.has(udise)) {
                        if (device === 'CPU') b.cpuUsed++;
                        else if (device === 'MINI PC' || device === 'THIN CLIENT') b.miniPcUsed++;
                        else if (device === 'INTERACTIVE FLAT PANEL') b.panelUsed++;
                    }
                });
            }
        });

        filteredEdustatP.forEach(e => {
            const udise = String(e.udise).trim();
            const serial = String(e.serial).trim();
            const hours = Number(e.hours) || 0;
            const deviceType = serialMapP[serial] || 'CPU';

            Object.values(blockMap).forEach(b => {
                if (b.udises.has(udise)) {
                    if (deviceType === 'CPU') b.totalCpuHours += hours;
                    else if (deviceType === 'MINI PC' || deviceType === 'THIN CLIENT') b.totalMiniPcHours += hours;
                    else if (deviceType === 'INTERACTIVE FLAT PANEL') b.totalPanelHours += hours;
                }
            });
        });

        jhpmsLab.forEach(l => {
            const udise = String(l.udise || getVal(l, 'udise') || '').trim();
            const labType = String(l.labType || getVal(l, 'lab') || '').toUpperCase();
            const subject = String(l.subject || getVal(l, 'sub') || '').toUpperCase();
            const dateStr = formatDateStr(l.date || getVal(l, 'date'));

            if (dateStr && dateStr >= startDate && dateStr <= endDate && districtUdises.has(udise)) {
                Object.values(blockMap).forEach(b => {
                    if (b.udises.has(udise)) {
                        if (subject.split(/[^A-Z0-9]+/).includes('MIS')) {
                            // Ignore
                        } else if (labType.includes('ICT') && subject.includes('COMPUTER')) {
                            b.ictClasses++;
                        } else if (labType.includes('SMART')) {
                            b.smartClasses++;
                        }
                    }
                });
            }
        });

        visits.forEach(v => {
            const udise = String(v.udise_code || '').trim();
            const dateStr = formatDateStr(v.visit_date || getVal(v, 'date'));
            const type = (v.visit_type || '').toLowerCase();

            if (dateStr && dateStr >= startDate && dateStr <= endDate && districtUdises.has(udise)) {
                Object.values(blockMap).forEach(b => {
                    if (b.udises.has(udise)) {
                        if (type.includes('ict')) b.ictVisits++;
                        if (type.includes('smart')) b.smartVisits++;
                    }
                });
            }
        });

        const bList = Object.values(blockMap).map(b => {
            const totalInstalled = b.cpuInstalled + b.miniPcInstalled + b.panelInstalled;
            const totalUsed = b.cpuUsed + b.miniPcUsed + b.panelUsed;
            const totalVisits = b.ictVisits + b.smartVisits;
            const cpuNotUsed = Math.max(0, b.cpuInstalled - b.cpuUsed);
            const miniPcNotUsed = Math.max(0, b.miniPcInstalled - b.miniPcUsed);
            const panelNotUsed = Math.max(0, b.panelInstalled - b.panelUsed);

            const avgCpu = b.cpuInstalled > 0 ? (b.totalCpuHours / days / b.cpuInstalled) : 0;
            const avgMini = b.miniPcInstalled > 0 ? (b.totalMiniPcHours / days / b.miniPcInstalled) : 0;
            const avgPanel = b.panelInstalled > 0 ? (b.totalPanelHours / days / b.panelInstalled) : 0;
            const avgClasses = b.totalSchools > 0 ? (b.ictClasses / (days * b.totalSchools)) : 0;
            const avgSmartClasses = b.totalSchools > 0 ? (b.smartClasses / (days * b.totalSchools)) : 0;

            return {
                blockName: b.blockName,
                totalSchools: b.totalSchools,
                totalProjects: b.projects.size,
                totalCCs: b.ccNames.size,
                instructorWorking: b.instructorWorking,
                cpuInstalled: b.cpuInstalled,
                cpuUsed: b.cpuUsed,
                cpuNotUsed,
                miniPcInstalled: b.miniPcInstalled,
                miniPcUsed: b.miniPcUsed,
                miniPcNotUsed,
                panelInstalled: b.panelInstalled,
                panelUsed: b.panelUsed,
                panelNotUsed,
                edustatNotInstalled: b.edustatNotInstalled,
                totalCpuHours: parseFloat(b.totalCpuHours.toFixed(1)),
                totalMiniPcHours: parseFloat(b.totalMiniPcHours.toFixed(1)),
                totalPanelHours: parseFloat(b.totalPanelHours.toFixed(1)),
                totalHours: parseFloat((b.totalCpuHours + b.totalMiniPcHours + b.totalPanelHours).toFixed(1)),
                avgCpu: avgCpu.toFixed(2),
                avgMini: avgMini.toFixed(2),
                avgPanel: avgPanel.toFixed(2),
                ictClasses: b.ictClasses,
                avgClasses: avgClasses.toFixed(2),
                smartClasses: b.smartClasses,
                avgSmartClasses: avgSmartClasses.toFixed(2),
                totalIctVisits: b.ictVisits,
                totalSmartVisits: b.smartVisits,
                visitsCount: totalVisits,
                grandTotal: totalVisits,
                performanceScore: parseFloat((
                    ((totalInstalled > 0 ? totalUsed / totalInstalled : 0) * 25) +
                    ((b.totalSchools > 0 ? (b.totalCpuHours / days / b.totalSchools) : 0) * 5) +
                    ((b.totalSchools > 0 ? b.ictClasses / b.totalSchools : 0) * 20) +
                    ((b.totalSchools > 0 ? b.smartClasses / b.totalSchools : 0) * 10) +
                    ((b.totalSchools > 0 ? totalVisits / b.totalSchools : 0) * 15) +
                    ((b.totalSchools > 0 ? b.instructorWorking / b.totalSchools : 0) * 10)
                ).toFixed(1)),
                udises: b.udises
            };
        }).sort((a, b) => b.totalSchools - a.totalSchools);

        let filteredBlocks = bList;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filteredBlocks = filteredBlocks.filter(b => b.blockName.toLowerCase().includes(q));
        }
        return filteredBlocks.map((item, idx) => ({ ...item, slno: idx + 1 }));

    }, [auditComparativeData, schools, visits, jhpmsLab, edustat, edustatMaster, manpower, startDate, endDate, searchQuery, workingDays]);

    // ============================
    // DRILLDOWN / DETAILED LOOKUPS
    // ============================
    const activeDistrictDetailsData = useMemo(() => {
        if (!activeDistrictDetail) return [];

        const districtUdises = activeDistrictDetail.udises;
        const viewType = drilldownFilter;

        // Index helpers
        const schoolsMap = {};
        schools.forEach(s => { schoolsMap[cleanUdise(s.udise_code)] = s; });

        const manpowerMap = {};
        manpower.forEach(m => {
            const u = cleanUdise(m.udise || getVal(m, 'udise') || '');
            if (!manpowerMap[u]) manpowerMap[u] = [];
            manpowerMap[u].push(m);
        });

        const edustatMasterMap = {};
        (edustatMaster || []).forEach(m => {
            const u = cleanUdise(m.udise || getVal(m, 'udise') || '');
            if (!edustatMasterMap[u]) edustatMasterMap[u] = [];
            edustatMasterMap[u].push(m);
        });

        const rangeJhpms = jhpmsLab.filter(l => {
            const dateStr = formatDateStr(l.date || getVal(l, 'date'));
            return dateStr && dateStr >= startDate && dateStr <= endDate && districtUdises.has(cleanUdise(l.udise || getVal(l, 'udise') || ''));
        });

        const jhpmsMap = {};
        rangeJhpms.forEach(l => {
            const udise = cleanUdise(l.udise || getVal(l, 'udise') || '');
            if (!jhpmsMap[udise]) jhpmsMap[udise] = [];
            jhpmsMap[udise].push(l);
        });

        const rangeEdustat = edustat.filter(e => {
            const dateStr = formatDateStr(e.date || getVal(e, 'date'));
            return dateStr && dateStr >= startDate && dateStr <= endDate && districtUdises.has(cleanUdise(e.udise || getVal(e, 'udise') || ''));
        });

        const edustatMap = {};
        rangeEdustat.forEach(e => {
            const udise = cleanUdise(e.udise || getVal(e, 'udise') || '');
            if (!edustatMap[udise]) edustatMap[udise] = [];
            edustatMap[udise].push(e);
        });

        const rangeVisits = visits.filter(v => {
            const dateStr = formatDateStr(v.visit_date);
            return dateStr && dateStr >= startDate && dateStr <= endDate && districtUdises.has(cleanUdise(v.udise_code));
        });

        const rangeVisitsMap = {};
        rangeVisits.forEach(v => {
            const udise = cleanUdise(v.udise_code);
            if (!rangeVisitsMap[udise]) rangeVisitsMap[udise] = [];
            rangeVisitsMap[udise].push(v);
        });

        const allVisitsMap = {};
        visits.forEach(v => {
            const udise = cleanUdise(v.udise_code);
            if (!allVisitsMap[udise]) allVisitsMap[udise] = [];
            allVisitsMap[udise].push(v);
        });

        const serialMap = {};
        (edustatMaster || []).forEach(m => {
            if (m.serial) {
                serialMap[String(m.serial).trim()] = String(m.device || '').toUpperCase();
            }
        });

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const days = Number(workingDays) && Number(workingDays) >= 1
            ? Number(workingDays)
            : Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

        const districtSchoolsList = schools.filter(s => districtUdises.has(cleanUdise(s.udise_code)));

        if (viewType === 'coordinators') {
            const districtCCs = new Set();
            districtSchoolsList.forEach(s => {
                if (s.visitor_name) {
                    const resolved = ccNameMapping[s.visitor_name] || s.visitor_name;
                    districtCCs.add(resolved);
                }
            });
            const ccList = Array.from(districtCCs);

            const ccPerf = ccList.map((cc, i) => {
                const ccSchools = schools.filter(s => (s.visitor_name === cc || ccNameMapping[s.visitor_name] === cc) && districtUdises.has(cleanUdise(s.udise_code)));
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

                const activeSerials = new Set();
                ccSchools.forEach(s => {
                    const udise = cleanUdise(s.udise_code);
                    const schoolEdustat = edustatMap[udise] || [];
                    schoolEdustat.forEach(e => {
                        if (e.hours > 0 && e.serial) {
                            activeSerials.add(String(e.serial).trim());
                        }
                    });
                });

                ccSchools.forEach(s => {
                    const udise = cleanUdise(s.udise_code);
                    const schoolManpower = manpowerMap[udise] || [];
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

                    const schoolDevices = edustatMasterMap[udise] || [];
                    schoolDevices.forEach(m => {
                        const device = String(m.device || '').toUpperCase();
                        const installed = String(m.installed || '').toUpperCase();
                        if (installed === 'YES') {
                            if (device === 'CPU') cpuInstalled++;
                            else if (device === 'MINI PC' || device === 'THIN CLIENT') miniPcInstalled++;
                            else if (device === 'INTERACTIVE FLAT PANEL') panelInstalled++;
                        } else if (installed === 'NO') {
                            edustatNotInstalled++;
                        }
                    });

                    const schoolEdustat = edustatMap[udise] || [];
                    schoolEdustat.forEach(e => {
                        const serial = String(e.serial).trim();
                        const hours = Number(e.hours) || 0;
                        const deviceType = serialMap[serial] || 'CPU';

                        if (deviceType === 'CPU') totalCpuHours += hours;
                        else if (deviceType === 'MINI PC' || deviceType === 'THIN CLIENT') totalMiniPcHours += hours;
                        else if (deviceType === 'INTERACTIVE FLAT PANEL') totalPanelHours += hours;
                    });

                    const schoolClasses = jhpmsMap[udise] || [];
                    schoolClasses.forEach(l => {
                        const labType = String(l.labType || getVal(l, 'lab') || '').toUpperCase();
                        const subject = String(l.subject || getVal(l, 'sub') || '').toUpperCase();
                        if (subject.split(/[^A-Z0-9]+/).includes('MIS')) {
                            // Ignore
                        } else if (labType.includes('ICT') && subject.includes('COMPUTER')) {
                            ictClasses++;
                        } else if (labType.includes('SMART')) {
                            smartClasses++;
                        }
                    });

                    const schoolVisits = rangeVisitsMap[udise] || [];
                    schoolVisits.forEach(v => {
                        const type = (v.visit_type || '').toLowerCase();
                        if (type.includes('ict')) totalIctVisits++;
                        if (type.includes('smart')) totalSmartVisits++;
                    });
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

                const cpuUtil = cpuInstalled > 0 ? (cpuUsed / cpuInstalled) : 0;
                const miniUtil = miniPcInstalled > 0 ? (miniPcUsed / miniPcInstalled) : 0;
                const panelUtil = panelInstalled > 0 ? (panelUsed / panelInstalled) : 0;
                const activeDeviceTypes = [cpuUtil, miniUtil, panelUtil].filter((_, index) => [cpuInstalled, miniPcInstalled, panelInstalled][index] > 0);
                const infraScore = (activeDeviceTypes.length > 0 ? activeDeviceTypes.reduce((a, b) => a + b, 0) / activeDeviceTypes.length : 0) * 25;

                const avgCpu = cpuInstalled > 0 ? (totalCpuHours / days / cpuInstalled) : 0;
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

            let filteredCc = ccPerf;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                filteredCc = filteredCc.filter(c => c.ccName.toLowerCase().includes(q));
            }

            return filteredCc.map((row, index) => ({ ...row, slno: index + 1 }));
        }

        if (viewType === 'projects') {
            const projMap = {};
            districtSchoolsList.forEach(s => {
                const proj = s.project_name || 'Unassigned';
                if (!projMap[proj]) {
                    projMap[proj] = {
                        projectName: proj,
                        totalSchools: 0,
                        instructorWorking: 0,
                        cpuInstalled: 0, cpuUsed: 0,
                        miniPcInstalled: 0, miniPcUsed: 0,
                        panelInstalled: 0, panelUsed: 0,
                        totalCpuHours: 0, totalMiniPcHours: 0, totalPanelHours: 0,
                        ictClasses: 0, smartClasses: 0,
                        ictVisits: 0, smartVisits: 0,
                        edustatNotInstalled: 0,
                        udises: new Set()
                    };
                }
                projMap[proj].totalSchools++;
                projMap[proj].udises.add(cleanUdise(s.udise_code));
            });

            districtSchoolsList.forEach(s => {
                const udise = cleanUdise(s.udise_code);
                const proj = s.project_name || 'Unassigned';
                const p = projMap[proj];
                if (!p) return;

                const schoolManpower = manpowerMap[udise] || [];
                let instructorRec = schoolManpower.find(mp => {
                    const status = String(getVal(mp, 'status') || '').trim().toUpperCase();
                    return status.includes('WORKING') || status.includes('ACTIVE') || status === '';
                });
                if (!instructorRec && schoolManpower.length > 0) {
                    instructorRec = schoolManpower[0];
                }
                const rawStatus = instructorRec ? (instructorRec.status || getVal(instructorRec, 'status') || 'Active') : 'N/A';
                const isWorking = rawStatus.toUpperCase().includes('WORKING') || rawStatus.toUpperCase().includes('ACTIVE') || rawStatus === '';
                if (isWorking) p.instructorWorking++;

                const schoolDevices = edustatMasterMap[udise] || [];
                schoolDevices.forEach(m => {
                    const device = String(m.device || '').toUpperCase();
                    const installed = String(m.installed || '').toUpperCase();
                    if (installed === 'YES') {
                        if (device === 'CPU') p.cpuInstalled++;
                        else if (device === 'MINI PC' || device === 'THIN CLIENT') p.miniPcInstalled++;
                        else if (device === 'INTERACTIVE FLAT PANEL') p.panelInstalled++;
                    }
                });

                const schoolEdustat = edustatMap[udise] || [];
                schoolEdustat.forEach(e => {
                    const serial = String(e.serial).trim();
                    const hours = Number(e.hours) || 0;
                    const deviceType = serialMap[serial] || 'CPU';

                    if (deviceType === 'CPU') p.totalCpuHours += hours;
                    else if (deviceType === 'MINI PC' || deviceType === 'THIN CLIENT') p.totalMiniPcHours += hours;
                    else if (deviceType === 'INTERACTIVE FLAT PANEL') p.totalPanelHours += hours;
                });

                const schoolClasses = jhpmsMap[udise] || [];
                schoolClasses.forEach(l => {
                    const labType = String(l.labType || getVal(l, 'lab') || '').toUpperCase();
                    const subject = String(l.subject || getVal(l, 'sub') || '').toUpperCase();
                    if (subject.split(/[^A-Z0-9]+/).includes('MIS')) {
                        // Ignore
                    } else if (labType.includes('ICT') && subject.includes('COMPUTER')) {
                        p.ictClasses++;
                    } else if (labType.includes('SMART')) {
                        p.smartClasses++;
                    }
                });

                const schoolVisits = rangeVisitsMap[udise] || [];
                schoolVisits.forEach(v => {
                    const type = (v.visit_type || '').toLowerCase();
                    if (type.includes('ict')) p.ictVisits++;
                    if (type.includes('smart')) p.smartVisits++;
                });
            });

            const activeSerialsP = new Set();
            rangeEdustat.forEach(e => { if (e.hours > 0 && e.serial) activeSerialsP.add(String(e.serial).trim()); });

            (edustatMaster || []).forEach(m => {
                const udise = String(m.udise).trim();
                const serial = String(m.serial).trim();
                const device = String(m.device || '').toUpperCase();
                const installed = String(m.installed || '').toUpperCase();
                if (districtUdises.has(udise) && installed === 'YES' && activeSerialsP.has(serial)) {
                    Object.values(projMap).forEach(p => {
                        if (p.udises.has(udise)) {
                            if (device === 'CPU') p.cpuUsed++;
                            else if (device === 'MINI PC' || device === 'THIN CLIENT') p.miniPcUsed++;
                            else if (device === 'INTERACTIVE FLAT PANEL') p.panelUsed++;
                        }
                    });
                }
            });

            const projList = Object.values(projMap).map(p => {
                const totalInstalled = p.cpuInstalled + p.miniPcInstalled + p.panelInstalled;
                const totalUsed = p.cpuUsed + p.miniPcUsed + p.panelUsed;
                const totalVisits = p.ictVisits + p.smartVisits;

                return {
                    projectName: p.projectName,
                    totalSchools: p.totalSchools,
                    instructorWorking: p.instructorWorking,
                    cpuInstalled: p.cpuInstalled,
                    cpuUsed: p.cpuUsed,
                    miniPcInstalled: p.miniPcInstalled,
                    miniPcUsed: p.miniPcUsed,
                    panelInstalled: p.panelInstalled,
                    panelUsed: p.panelUsed,
                    totalCpuHours: parseFloat(p.totalCpuHours.toFixed(1)),
                    totalMiniPcHours: parseFloat(p.totalMiniPcHours.toFixed(1)),
                    totalPanelHours: parseFloat(p.totalPanelHours.toFixed(1)),
                    totalHours: parseFloat((p.totalCpuHours + p.totalMiniPcHours + p.totalPanelHours).toFixed(1)),
                    ictClasses: p.ictClasses,
                    smartClasses: p.smartClasses,
                    visitsCount: totalVisits,
                    performanceScore: parseFloat((
                        ((totalInstalled > 0 ? totalUsed / totalInstalled : 0) * 25) +
                        ((p.totalSchools > 0 ? (p.totalCpuHours / days / p.totalSchools) : 0) * 5) +
                        ((p.totalSchools > 0 ? p.ictClasses / p.totalSchools : 0) * 20) +
                        ((p.totalSchools > 0 ? p.smartClasses / p.totalSchools : 0) * 10) +
                        ((p.totalSchools > 0 ? totalVisits / p.totalSchools : 0) * 15) +
                        ((p.totalSchools > 0 ? p.instructorWorking / p.totalSchools : 0) * 10)
                    ).toFixed(1))
                };
            }).sort((a, b) => b.totalSchools - a.totalSchools);

            let filteredProj = projList;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                filteredProj = filteredProj.filter(p => p.projectName.toLowerCase().includes(q));
            }
            return filteredProj.map((item, idx) => ({ ...item, slno: idx + 1 }));
        }

        if (viewType === 'devices') {
            const masterDevices = (edustatMaster || []).filter(m => districtUdises.has(cleanUdise(m.udise || getVal(m, 'udise'))));

            const activeSerials = new Set();
            districtSchoolsList.forEach(s => {
                const udise = cleanUdise(s.udise_code);
                const schoolEdustat = edustatMap[udise] || [];
                schoolEdustat.forEach(e => {
                    if (Number(e.hours) > 0 && e.serial) {
                        activeSerials.add(String(e.serial).trim());
                    }
                });
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

            const list = filteredDevices.map(m => {
                const udise = cleanUdise(m.udise || getVal(m, 'udise'));
                const schoolRec = schoolsMap[udise];
                
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
            const ccManpower = [];
            districtSchoolsList.forEach(s => {
                const udise = cleanUdise(s.udise_code);
                const schoolManpower = manpowerMap[udise] || [];
                schoolManpower.forEach(m => ccManpower.push(m));
            });
            
            const listData = ccManpower.map(m => {
                const udise = cleanUdise(m.udise || getVal(m, 'udise'));
                const schoolRec = schoolsMap[udise];
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

        if (viewType === 'vacant_instructors') {
            const vacantSchools = districtSchoolsList.filter(s => {
                const udise = cleanUdise(s.udise_code);
                const schoolManpower = manpowerMap[udise] || [];
                let instructorRec = schoolManpower.find(mp => {
                    const status = String(getVal(mp, 'status') || '').trim().toUpperCase();
                    return status.includes('WORKING') || status.includes('ACTIVE') || status === '';
                });
                return !instructorRec;
            });

            const listData = vacantSchools.map(s => {
                const udise = cleanUdise(s.udise_code);
                const schoolManpower = manpowerMap[udise] || [];
                
                let lastInstructorName = 'N/A';
                let lastWorkingDate = 'N/A';

                const inactiveRecords = schoolManpower.filter(mp => {
                    const status = String(getVal(mp, 'status') || '').trim().toUpperCase();
                    return !(status.includes('WORKING') || status.includes('ACTIVE') || status === '');
                });

                const sortedHistory = [...inactiveRecords].sort((a, b) => {
                    const da = new Date(a.statusDate || getVal(a, 'statusDate') || 0);
                    const db = new Date(b.statusDate || getVal(b, 'statusDate') || 0);
                    return db - da;
                });

                const lastRec = sortedHistory[0] || schoolManpower[0];
                if (lastRec) {
                    lastInstructorName = lastRec.instructorName || getVal(lastRec, 'name') || 'N/A';
                    const rawDate = lastRec.statusDate || getVal(lastRec, 'statusDate');
                    if (rawDate) {
                        const d = new Date(rawDate);
                        if (!isNaN(d.getTime())) {
                            lastWorkingDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
                        } else {
                            lastWorkingDate = String(rawDate);
                        }
                    }
                }

                return {
                    udise,
                    schoolName: s.school_name || s.school || '-',
                    block: s.block || '-',
                    lastInstructorName,
                    lastWorkingDate
                };
            });

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const filtered = listData.filter(ins => ins.schoolName.toLowerCase().includes(q) || ins.udise.includes(q) || ins.lastInstructorName.toLowerCase().includes(q));
                return filtered.map((ins, idx) => ({ ...ins, slno: idx + 1 }));
            }
            return listData.map((ins, idx) => ({ ...ins, slno: idx + 1 }));
        }

        if (viewType === 'usage_logs') {
            let logRows = [];
            districtSchoolsList.forEach(s => {
                const udise = cleanUdise(s.udise_code);
                const schoolEdustat = edustatMap[udise] || [];
                schoolEdustat.forEach(e => {
                    const serial = String(e.serial || '').trim();
                    const devType = serialMap[serial] || 'CPU';
                    logRows.push({
                        date: formatDateClean(e.date || getVal(e, 'date')),
                        dateRaw: formatDateStr(e.date || getVal(e, 'date')),
                        udise,
                        schoolName: s.school_name || s.school || '-',
                        block: s.block || '-',
                        serial,
                        deviceType: devType,
                        hours: Number(e.hours) || 0
                    });
                });
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
            let classRows = [];
            districtSchoolsList.forEach(s => {
                const udise = cleanUdise(s.udise_code);
                const schoolClasses = jhpmsMap[udise] || [];
                schoolClasses.forEach(l => {
                    const labType = String(l.labType || getVal(l, 'lab') || '').toUpperCase();
                    const teacherKey = Object.keys(l).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes('subjectteacher'));
                    const teacher = teacherKey ? String(l[teacherKey] || '').trim() : (getVal(l, 'teacher') || 'N/A');
                    const subjectKey = Object.keys(l).find(k => k !== teacherKey && k.toLowerCase().replace(/[^a-z0-9]/g, '').includes('sub'));
                    const subject = subjectKey ? String(l[subjectKey] || '').trim().toUpperCase() : '';
                    const remarks = l.remarks || getVal(l, 'remarks') || getVal(l, 'topic') || '-';

                    const isIct = !subject.split(/[^A-Z0-9]+/).includes('MIS') && (labType.includes('ICT') && subject.includes('COMPUTER'));
                    const isSmart = !subject.split(/[^A-Z0-9]+/).includes('MIS') && !(labType.includes('ICT') && subject.includes('COMPUTER')) && labType.includes('SMART');

                    if ((drilldownFilter === 'ict_classes' && isIct) || (drilldownFilter === 'smart_classes' && isSmart)) {
                        classRows.push({
                            date: formatDateClean(l.date || getVal(l, 'date')),
                            dateRaw: formatDateStr(l.date || getVal(l, 'date')),
                            udise,
                            schoolName: s.school_name || s.school || '-',
                            block: s.block || '-',
                            labType: labType,
                            subject: subject || 'N/A',
                            teacher,
                            remarks
                        });
                    }
                });
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
            let visitRows = [];
            districtSchoolsList.forEach(s => {
                const udise = cleanUdise(s.udise_code);
                const schoolVisits = rangeVisitsMap[udise] || [];
                schoolVisits.forEach(v => {
                    const type = (v.visit_type || '').toLowerCase();
                    const isTarget = (drilldownFilter === 'all_visits') ||
                                     (drilldownFilter === 'ict_visits' && type.includes('ict')) ||
                                     (drilldownFilter === 'smart_visits' && type.includes('smart'));
                    if (isTarget) {
                        visitRows.push({
                            date: formatDateClean(v.visit_date || getVal(v, 'date')),
                            dateRaw: formatDateStr(v.visit_date || getVal(v, 'date')),
                            udise,
                            schoolName: s.school_name || s.school || '-',
                            block: s.block || '-',
                            visitorName: v.visitor_name || 'N/A',
                            visitType: v.visit_type || 'Visit',
                            remarks: v.remarks || getVal(v, 'remarks') || getVal(v, 'remark') || '-'
                        });
                    }
                });
            });

            visitRows.sort((a, b) => (b.dateRaw || '').localeCompare(a.dateRaw || ''));

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const filtered = visitRows.filter(v => v.schoolName.toLowerCase().includes(q) || v.udise.includes(q) || v.visitorName.toLowerCase().includes(q));
                return filtered.map((v, idx) => ({ ...v, slno: idx + 1 }));
            }
            return visitRows.map((v, idx) => ({ ...v, slno: idx + 1 }));
        }

        // Default 'schools' view
        const schDetailsList = districtSchoolsList.map(s => {
            const udise = cleanUdise(s.udise_code);
            const schoolManpower = manpowerMap[udise] || [];
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

            const schoolDevices = edustatMasterMap[udise] || [];
            schoolDevices.forEach(m => {
                const device = String(m.device || '').toUpperCase();
                const installed = String(m.installed || '').toUpperCase();
                if (installed === 'YES') {
                    if (device === 'CPU') cpuInstalled++;
                    else if (device === 'MINI PC' || device === 'THIN CLIENT') miniInstalled++;
                    else if (device === 'INTERACTIVE FLAT PANEL') panelInstalledSch++;
                } else if (installed === 'NO') {
                    edustatNotInstalled++;
                }
            });

            let ictClasses = 0;
            let smartClasses = 0;
            const schoolClasses = jhpmsMap[udise] || [];
            schoolClasses.forEach(l => {
                const labType = String(l.labType || getVal(l, 'lab') || '').toUpperCase();
                const subject = String(l.subject || getVal(l, 'sub') || '').toUpperCase();

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
            
            const schoolEdustat = edustatMap[udise] || [];
            schoolEdustat.forEach(e => {
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

            const visitsCount = (rangeVisitsMap[udise] || []).length;
            
            let lastVisitDate = '-';
            const schoolAllVisits = allVisitsMap[udise] || [];
            schoolAllVisits.forEach(v => {
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
    }, [activeDistrictDetail, drilldownFilter, schools, visits, jhpmsLab, edustat, edustatMaster, manpower, startDate, endDate, workingDays, ccNameMapping, searchQuery]);

    // Handle Exporting main district performance data
    const handleExport = () => {
        const exportFormat = districtData.map(d => ({
            'Slno': d.slno,
            'District Name': d.districtName,
            'Projects': d.totalProjects,
            'Zones': d.totalZones,
            'Blocks': d.totalBlocks,
            'Coordinators': d.totalCCs,
            'No.of Schools': d.totalSchools,
            'No. of Instructor Working': d.instructorWorking,
            'Vacant Instructor': d.totalSchools - d.instructorWorking,
            'No.Of CPU Installed': d.cpuInstalled,
            'EduStat Not Installed': d.edustatNotInstalled,
            'No.Of CPU Used': d.cpuUsed,
            'No. Of CPU Not Used': d.cpuNotUsed,
            'No.Of Mini PC / Thin Client Installed': d.miniPcInstalled,
            'No. Of Mini PC / Thin Client Used': d.miniPcUsed,
            'No. Of Mini PC / Thin Client Not Used': d.miniPcNotUsed,
            'No.Of Panel (IFP) Installed': d.panelInstalled,
            'No. Of Panel (IFP) Used': d.panelUsed,
            'No. Of Panel (IFP) Not Used': d.panelNotUsed,
            'Total Hours Used (CPU)': d.totalCpuHours,
            'Total Hours Used (Mini PC / Thin Client)': d.totalMiniPcHours,
            'Total Hours Used (Panel / IFP)': d.totalPanelHours,
            'Avg Hrs/Day/Sch/CPU': Number(d.avgCpu) || 0,
            'Avg Hrs/Day/Sch/Mini PC': Number(d.avgMini) || 0,
            'Avg Hrs/Day/Sch/Panel': Number(d.avgPanel) || 0,
            'ICT Classes': d.ictClasses,
            'Avg Classes/per school/Day': Number(d.avgClasses) || 0,
            'Smart Classes': d.smartClasses,
            'Avg Smart Classes/per school/Day': Number(d.avgSmartClasses) || 0,
            'Total ICT Visit': d.totalIctVisits,
            'Total Smart Visit': d.totalSmartVisits,
            'GrandTotal': d.grandTotal,
            'Performance Score': d.performanceScore + '%'
        }));
        exportToExcel(exportFormat, 'District_Performance_Report');
    };

    // Handle Exporting block breakdown performance data
    const handleExportBlockSummary = () => {
        if (!blockBreakdownData || !blockBreakdownData.length) return;
        const exportFormat = blockBreakdownData.map(b => ({
            'Slno': b.slno,
            'Block Name': b.blockName,
            'Projects': b.totalProjects,
            'Coordinators': b.totalCCs,
            'No.of Schools': b.totalSchools,
            'No. of Instructor Working': b.instructorWorking,
            'Vacant Instructor': b.totalSchools - b.instructorWorking,
            'No.Of CPU Installed': b.cpuInstalled,
            'EduStat Not Installed': b.edustatNotInstalled,
            'No.Of CPU Used': b.cpuUsed,
            'No. Of CPU Not Used': b.cpuNotUsed,
            'No.Of Mini PC / Thin Client Installed': b.miniPcInstalled,
            'No. Of Mini PC / Thin Client Used': b.miniPcUsed,
            'No. Of Mini PC / Thin Client Not Used': b.miniPcNotUsed,
            'No.Of Panel (IFP) Installed': b.panelInstalled,
            'No. Of Panel (IFP) Used': b.panelUsed,
            'No. Of Panel (IFP) Not Used': b.panelNotUsed,
            'Total Hours Used (CPU)': b.totalCpuHours,
            'Total Hours Used (Mini PC / Thin Client)': b.totalMiniPcHours,
            'Total Hours Used (Panel / IFP)': b.totalPanelHours,
            'Avg Hrs/Day/Sch/CPU': Number(b.avgCpu) || 0,
            'Avg Hrs/Day/Sch/Mini PC': Number(b.avgMini) || 0,
            'Avg Hrs/Day/Sch/Panel': Number(b.avgPanel) || 0,
            'ICT Classes': b.ictClasses,
            'Avg Classes/per school/Day': Number(b.avgClasses) || 0,
            'Smart Classes': b.smartClasses,
            'Avg Smart Classes/per school/Day': Number(b.avgSmartClasses) || 0,
            'Total ICT Visit': b.totalIctVisits,
            'Total Smart Visit': b.totalSmartVisits,
            'GrandTotal': b.grandTotal,
            'Performance Score': b.performanceScore + '%'
        }));
        const label = auditComparativeData?.selDistrictName
            ? `${auditComparativeData.selDistrictName.replace(/\s+/g, '_')}_Block_Performance_Report`
            : 'Block_Performance_Report';
        exportToExcel(exportFormat, label);
    };

    // Handle Detail Export
    const handleExportDetail = () => {
        if (!activeDistrictDetail || !activeDistrictDetailsData.length) return;

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
        } else if (drilldownFilter === 'vacant_instructors') {
            viewType = 'vacant_instructors';
        } else if (['cpu_hours_logs', 'mini_hours_logs', 'panel_hours_logs'].includes(drilldownFilter)) {
            viewType = 'usage_logs';
        } else if (['ict_classes', 'smart_classes'].includes(drilldownFilter)) {
            viewType = 'classes';
        } else if (['ict_visits', 'smart_visits', 'all_visits'].includes(drilldownFilter)) {
            viewType = 'visits';
        } else if (drilldownFilter === 'coordinators') {
            viewType = 'coordinators';
        } else if (drilldownFilter === 'projects') {
            viewType = 'projects';
        }

        const entityName = activeDistrictDetail.blockName || activeDistrictDetail.districtName || 'Report';
        const safeName = entityName.replace(/\s+/g, '_');

        if (viewType === 'coordinators') {
            exportFormat = activeDistrictDetailsData.map(c => ({
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
            label = `${safeName}_Coordinators_Performance`;
        } else if (viewType === 'projects') {
            exportFormat = activeDistrictDetailsData.map(p => ({
                'Slno': p.slno,
                'Project Name': p.projectName,
                'Schools Count': p.totalSchools,
                'Instructors Working': p.instructorWorking,
                'CPU Installed': p.cpuInstalled,
                'CPU Used': p.cpuUsed,
                'Mini PC Installed': p.miniPcInstalled,
                'Mini PC Used': p.miniPcUsed,
                'Panel Installed': p.panelInstalled,
                'Panel Used': p.panelUsed,
                'CPU Run Hours': p.totalCpuHours,
                'Mini PC Run Hours': p.totalMiniPcHours,
                'Panel Run Hours': p.totalPanelHours,
                'ICT Classes Conducted': p.ictClasses,
                'Smart Classes Conducted': p.smartClasses,
                'Total Visits': p.visitsCount,
                'Local Performance Score': p.performanceScore
            }));
            label = `${safeName}_Projects_Performance`;
        } else if (viewType === 'devices') {
            exportFormat = activeDistrictDetailsData.map(d => ({
                'Slno': d.slno,
                'UDISE Code': d.udise,
                'School Name': d.schoolName,
                'Block': d.block,
                'Serial No of Device': d.serial,
                'Device Type': d.deviceType,
                'Device Status': d.status
            }));
            label = `${safeName}_Devices_Report`;
        } else if (viewType === 'instructors') {
            exportFormat = activeDistrictDetailsData.map(ins => ({
                'Slno': ins.slno,
                'UDISE Code': ins.udise,
                'School Name': ins.schoolName,
                'Block': ins.block,
                'Instructor Name': ins.instructorName,
                'Instructor Status': ins.instructorStatus
            }));
            label = `${safeName}_Active_Instructors`;
        } else if (viewType === 'vacant_instructors') {
            exportFormat = activeDistrictDetailsData.map(ins => ({
                'Slno': ins.slno,
                'UDISE Code': ins.udise,
                'School Name': ins.schoolName,
                'Block': ins.block,
                'Last Working Instructor Name': ins.lastInstructorName,
                'Last Working Date': ins.lastWorkingDate
            }));
            label = `${safeName}_Vacant_Schools_Report`;
        } else if (viewType === 'usage_logs') {
            exportFormat = activeDistrictDetailsData.map(l => ({
                'Slno': l.slno,
                'Date': l.date,
                'UDISE Code': l.udise,
                'School Name': l.schoolName,
                'Block': l.block,
                'Serial No of Device': l.serial,
                'Device Type': l.deviceType,
                'Hours Used': l.hours
            }));
            label = `${safeName}_Usage_Logs`;
        } else if (viewType === 'classes') {
            exportFormat = activeDistrictDetailsData.map(r => ({
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
            label = `${safeName}_Classes_Logs`;
        } else if (viewType === 'visits') {
            exportFormat = activeDistrictDetailsData.map(v => ({
                'Slno': v.slno,
                'Date': v.date,
                'UDISE Code': v.udise,
                'School Name': v.schoolName,
                'Block': v.block,
                'Visit Type': v.visitType,
                'Visitor / CC Name': v.visitorName,
                'Remarks / Findings': v.remarks
            }));
            label = `${safeName}_Visits_Report`;
        } else {
            exportFormat = activeDistrictDetailsData.map(s => ({
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
            label = `${safeName}_Schools_Detailed_Report`;
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
        } else if (drilldownFilter === 'vacant_instructors') {
            return 'vacant_instructors';
        } else if (['cpu_hours_logs', 'mini_hours_logs', 'panel_hours_logs'].includes(drilldownFilter)) {
            return 'usage_logs';
        } else if (['ict_classes', 'smart_classes'].includes(drilldownFilter)) {
            return 'classes';
        } else if (['ict_visits', 'smart_visits', 'all_visits'].includes(drilldownFilter)) {
            return 'visits';
        } else if (drilldownFilter === 'coordinators') {
            return 'coordinators';
        } else if (drilldownFilter === 'projects') {
            return 'projects';
        }
        return 'schools';
    }, [drilldownFilter]);

    if (!schools.length) {
        return (
            <div className="p-10 text-center text-gray-500 bg-white/80 dark:bg-slate-900/40 rounded-2xl m-4 shadow-sm border border-white/40 dark:border-white/5">
                Please upload School Master data in Setup to view District Performance.
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 w-full space-y-6 overflow-y-auto h-[calc(100vh-64px)] scrollbar-thin scrollbar-thumb-teal-600/30">
            {/* Top Stats Cards Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
                <div className="bg-gradient-to-r from-teal-800 to-teal-700 text-white rounded-2xl p-5 shadow-lg border border-teal-600/20 flex items-center justify-between">
                    <div>
                        <div className="text-[10px] uppercase tracking-widest font-black text-teal-200/80 mb-1">Total Districts</div>
                        <div className="text-3xl font-black">{districtData.length}</div>
                    </div>
                    <div className="p-3.5 bg-white/10 rounded-xl">
                        <Icons.Dashboard className="w-6 h-6 text-white" />
                    </div>
                </div>

                <div className="bg-gradient-to-r from-indigo-800 to-indigo-700 text-white rounded-2xl p-5 shadow-lg border border-indigo-600/20 flex items-center justify-between">
                    <div>
                        <div className="text-[10px] uppercase tracking-widest font-black text-indigo-200/80 mb-1">Total Schools Listed</div>
                        <div className="text-3xl font-black">
                            {districtData.reduce((acc, d) => acc + d.totalSchools, 0)}
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
                            {districtData.reduce((acc, d) => acc + d.ictClasses + d.smartClasses, 0)}
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
                            {districtData.reduce((acc, d) => acc + d.grandTotal, 0)}
                        </div>
                    </div>
                    <div className="p-3.5 bg-white/10 rounded-xl">
                        <Icons.Visit className="w-6 h-6 text-white" />
                    </div>
                </div>
            </div>

            {/* District Performance Podium – Top 3 */}
            {districtData.length >= 1 && (
                <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/5 shadow-xl p-6">
                    <div className="text-center mb-6">
                        <h2 className="text-lg font-black text-teal-800 dark:text-teal-400 tracking-tight">🏆 District Performance Podium</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Top performing districts ranked by weighted performance score</p>
                    </div>
                    <div className="flex items-end justify-center gap-3 md:gap-6 px-2">
                        {/* Silver – Rank 2 */}
                        {districtData[1] && (
                            <div className="flex-1 max-w-[200px] flex flex-col items-center">
                                <div className="text-3xl mb-2">🥈</div>
                                <div className="w-full bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 rounded-t-2xl p-4 text-center shadow-lg border border-slate-300/50 dark:border-slate-500/40 h-44 flex flex-col justify-between">
                                    <div>
                                        <div className="text-[10px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-300">Rank #2</div>
                                        <div className="text-sm font-black text-slate-800 dark:text-white mt-1 leading-tight">{districtData[1].districtName}</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black text-slate-700 dark:text-slate-200">{districtData[1].performanceScore}%</div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{districtData[1].totalSchools} Schools</div>
                                        <div className="text-[10px] text-slate-400 dark:text-slate-500">{districtData[1].grandTotal} Visits</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Gold – Rank 1 */}
                        {districtData[0] && (
                            <div className="flex-1 max-w-[240px] flex flex-col items-center">
                                <div className="text-4xl mb-2">🥇</div>
                                <div className="w-full bg-gradient-to-b from-yellow-200 to-amber-400 dark:from-yellow-400 dark:to-amber-600 rounded-t-2xl p-5 text-center shadow-2xl border border-yellow-300/60 dark:border-yellow-500/50 h-56 flex flex-col justify-between">
                                    <div>
                                        <div className="text-[10px] uppercase tracking-widest font-black text-amber-700 dark:text-amber-100">Rank #1 — Top District</div>
                                        <div className="text-base font-black text-amber-900 dark:text-white mt-1 leading-tight">{districtData[0].districtName}</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-black text-amber-800 dark:text-white">{districtData[0].performanceScore}%</div>
                                        <div className="text-[10px] text-amber-700 dark:text-amber-200 mt-0.5">{districtData[0].totalSchools} Schools · {districtData[0].grandTotal} Visits</div>
                                        <div className="text-[10px] text-amber-600 dark:text-amber-300">{districtData[0].ictClasses + districtData[0].smartClasses} Classes Conducted</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Bronze – Rank 3 */}
                        {districtData[2] && (
                            <div className="flex-1 max-w-[200px] flex flex-col items-center">
                                <div className="text-3xl mb-2">🥉</div>
                                <div className="w-full bg-gradient-to-b from-orange-200 to-orange-400 dark:from-orange-700 dark:to-orange-900 rounded-t-2xl p-4 text-center shadow-lg border border-orange-300/50 dark:border-orange-700/40 h-36 flex flex-col justify-between">
                                    <div>
                                        <div className="text-[10px] uppercase tracking-widest font-black text-orange-700 dark:text-orange-200">Rank #3</div>
                                        <div className="text-sm font-black text-orange-900 dark:text-white mt-1 leading-tight">{districtData[2].districtName}</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black text-orange-800 dark:text-white">{districtData[2].performanceScore}%</div>
                                        <div className="text-[10px] text-orange-700 dark:text-orange-300 mt-0.5">{districtData[2].totalSchools} Schools</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Remaining districts mini-badges */}
                    {districtData.length > 3 && (
                        <div className="flex flex-wrap justify-center gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-white/5">
                            {districtData.slice(3).map((d, i) => (
                                <span key={d.districtName} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800/60 text-gray-600 dark:text-gray-300 rounded-full text-xs font-bold border border-gray-200 dark:border-white/5">
                                    #{i + 4} {d.districtName} — {d.performanceScore}%
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
                        <h2 className="text-lg font-black text-teal-800 dark:text-teal-400 tracking-tight">District-Wise Aggregated Performance Matrix</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Aggregated statistics calculated across operating districts.</p>
                    </div>
                    <button
                        onClick={handleExport}
                        className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider px-5 py-3 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                    >
                        <Icons.Export className="w-4 h-4 text-white" /> Export District Summary
                    </button>
                </div>

                <div className="overflow-x-auto overflow-y-auto max-h-[600px] border border-teal-100 dark:border-white/5 rounded-xl shadow-inner bg-slate-50/50">
                    <table className="w-full text-left border-collapse text-xs select-none">
                        <thead className="bg-gradient-to-r from-teal-800 to-teal-700 text-white sticky top-0 z-30 shadow-md">
                            <tr>
                                <th className="p-3 border-r border-teal-600/30 align-top sticky top-0 left-0 z-40 bg-teal-800 w-[60px] min-w-[60px] max-w-[60px]">Slno</th>
                                <th className="p-3 border-r border-teal-600/30 align-top sticky top-0 left-[60px] z-40 bg-teal-800 w-[120px] min-w-[120px] max-w-[120px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">District Name</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[70px]">Projects</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[70px]">Zones</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[70px]">Blocks</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[80px]">Coordinators</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[80px]">No.of Schools</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[90px]">No. of Instructor Working</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-red-950/40 text-red-200 min-w-[90px]">Vacant Instructor</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-blue-900/40 min-w-[90px]">No.Of CPU Installed</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-red-950/40 text-red-200 min-w-[100px]">EduStat Not Installed</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-blue-900/40 min-w-[80px]">No.Of CPU Used</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-blue-900/40 text-red-200 min-w-[90px]">No. Of CPU Not Used</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-purple-900/40 min-w-[110px]">No.Of Mini PC Installed</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-purple-900/40 min-w-[100px]">No. Of Mini PC Used</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-purple-900/40 text-red-200 min-w-[110px]">No. Of Mini PC Not Used</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-indigo-900/40 min-w-[100px]">No.Of Panel Installed</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-indigo-900/40 min-w-[90px]">No. Of Panel Used</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-indigo-900/40 text-red-200 min-w-[100px]">No. Of Panel Not Used</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-orange-900/40 min-w-[100px]">Total Hours Used (CPU)</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-orange-900/40 min-w-[110px]">Total Hours Used (Mini PC)</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-orange-900/40 min-w-[100px]">Total Hours Used (Panel)</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-emerald-900/40 min-w-[110px]">Avg Hrs/Day/Sch/CPU</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-emerald-900/40 min-w-[115px]">Avg Hrs/Day/Sch/Mini PC</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-emerald-900/40 min-w-[110px]">Avg Hrs/Day/Sch/Panel</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-pink-900/40 min-w-[80px]">ICT Classes</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-pink-900/40 min-w-[110px]">Avg Classes/per school/Day</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-yellow-900/40 min-w-[80px]">Smart Classes</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top bg-yellow-900/40 min-w-[110px]">Avg Smart Classes/per school/Day</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[80px]">Total ICT Visit</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[80px]">Total Smart Visit</th>
                                <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[90px]">GrandTotal</th>
                                <th className="p-3 text-center align-top bg-gradient-to-b from-indigo-700 to-indigo-800 text-white min-w-[120px] shadow-md border-l border-indigo-600">Performance Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {districtData.map((row, idx) => (
                                <tr key={row.districtName} className="hover:bg-teal-50/50 transition-all group">
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('all'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-medium sticky left-0 z-20 bg-white dark:bg-slate-900 group-hover:bg-teal-50/80 dark:group-hover:bg-slate-800 w-[60px] min-w-[60px] max-w-[60px] overflow-hidden text-ellipsis cursor-pointer hover:text-teal-900 dark:hover:text-teal-400 transition-all"
                                        title="Click to view all district schools"
                                    >
                                        {idx + 1}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('all'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 sticky left-[60px] z-20 bg-white dark:bg-slate-900 group-hover:bg-teal-50/80 dark:group-hover:bg-slate-800 w-[120px] min-w-[120px] max-w-[120px] overflow-hidden text-ellipsis cursor-pointer hover:text-teal-900 dark:hover:text-teal-400 font-bold text-teal-800 dark:text-teal-500"
                                        title="Click to view all district schools"
                                    >
                                        {row.districtName}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('projects'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view the projects in this district`}
                                    >
                                        {row.totalProjects}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('all'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-semibold text-gray-700 dark:text-gray-300 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer transition-all"
                                    >
                                        {row.totalZones}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('all'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-semibold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer transition-all"
                                        title="Click to view all blocks in this district"
                                    >
                                        {row.totalBlocks}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('coordinators'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view the coordinators in this district`}
                                    >
                                        {row.totalCCs}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('all'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view all schools in this district`}
                                    >
                                        {row.totalSchools}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('working_instructors'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                        title={`Click to view schools with active working instructors`}
                                    >
                                        {row.instructorWorking}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('vacant_instructors'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-red-50/20 dark:bg-red-950/10 font-bold text-red-650 dark:text-red-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-red-900 dark:hover:text-red-300 transition-all"
                                        title={`Click to view schools with vacant instructors`}
                                    >
                                        {row.totalSchools - row.instructorWorking}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('cpu_installed'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-blue-50/30 dark:bg-blue-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                    >
                                        {row.cpuInstalled}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('edustat_not_installed'); setSearchQuery(''); }}
                                        className={`p-3 border-r border-gray-100 dark:border-white/5 text-center bg-red-50/20 dark:bg-red-950/10 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all ${row.edustatNotInstalled > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}
                                    >
                                        {row.edustatNotInstalled}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('cpu_used'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-blue-50/30 dark:bg-blue-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                    >
                                        {row.cpuUsed}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('cpu_not_used'); setSearchQuery(''); }}
                                        className={`p-3 border-r border-gray-100 dark:border-white/5 text-center bg-blue-50/30 dark:bg-blue-950/10 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all ${row.cpuNotUsed > 0 ? 'text-red-500' : 'text-gray-400'}`}
                                    >
                                        {row.cpuNotUsed}
                                    </td>
                                    
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('mini_installed'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-purple-50/30 dark:bg-purple-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                    >
                                        {row.miniPcInstalled}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('mini_used'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-purple-50/30 dark:bg-purple-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                    >
                                        {row.miniPcUsed}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('mini_not_used'); setSearchQuery(''); }}
                                        className={`p-3 border-r border-gray-100 dark:border-white/5 text-center bg-purple-50/30 dark:bg-purple-950/10 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all ${row.miniPcNotUsed > 0 ? 'text-red-500' : 'text-gray-400'}`}
                                    >
                                        {row.miniPcNotUsed}
                                    </td>

                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('panel_installed'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-indigo-50/30 dark:bg-indigo-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                    >
                                        {row.panelInstalled}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('panel_used'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-indigo-50/30 dark:bg-indigo-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                    >
                                        {row.panelUsed}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('panel_not_used'); setSearchQuery(''); }}
                                        className={`p-3 border-r border-gray-100 dark:border-white/5 text-center bg-indigo-50/30 dark:bg-indigo-950/10 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all ${row.panelNotUsed > 0 ? 'text-red-500' : 'text-gray-400'}`}
                                    >
                                        {row.panelNotUsed}
                                    </td>

                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('cpu_hours_logs'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-orange-50/30 dark:bg-orange-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                    >
                                        {row.totalCpuHours}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('mini_hours_logs'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-orange-50/30 dark:bg-orange-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                    >
                                        {row.totalMiniPcHours}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('panel_hours_logs'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-orange-50/30 dark:bg-orange-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                    >
                                        {row.totalPanelHours}
                                    </td>

                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('cpu_hours_logs'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                    >
                                        {row.avgCpu}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('mini_hours_logs'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                    >
                                        {row.avgMini}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('panel_hours_logs'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                    >
                                        {row.avgPanel}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('ict_classes'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-pink-50/30 dark:bg-pink-950/10 text-pink-700 dark:text-pink-400 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                    >
                                        {row.ictClasses}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('ict_classes'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-pink-50/30 dark:bg-pink-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                    >
                                        {row.avgClasses}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('smart_classes'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-yellow-50/30 dark:bg-yellow-950/10 text-yellow-700 dark:text-yellow-400 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                    >
                                        {row.smartClasses}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('smart_classes'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-yellow-50/30 dark:bg-yellow-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                    >
                                        {row.avgSmartClasses}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('ict_visits'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                    >
                                        {row.totalIctVisits}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('smart_visits'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                    >
                                        {row.totalSmartVisits}
                                    </td>
                                    <td
                                        onClick={() => { setActiveDistrictDetail(row); setDrilldownFilter('all_visits'); setSearchQuery(''); }}
                                        className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                    >
                                        {row.grandTotal}
                                    </td>
                                    <td className="p-3 text-center bg-indigo-50/50 dark:bg-indigo-950/20 font-black text-indigo-700 dark:text-indigo-400 border-l border-indigo-200 dark:border-indigo-900">
                                        {row.performanceScore}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Audit & Block Section */}
            {auditComparativeData && (
                <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/5 shadow-xl overflow-hidden">
                    <div className="p-5 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-black text-teal-800 dark:text-teal-400 tracking-tight">Audit & Block Performance Drilldown</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Deep analysis comparing selected district performance with best district and state averages.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <label className="text-xs font-black uppercase text-gray-500 dark:text-gray-400">Select Audit District:</label>
                            <select
                                value={auditComparativeData.selDistrictName}
                                onChange={(e) => {
                                    setSelectedAuditDistrict(e.target.value);
                                    setActiveDistrictDetail(null);
                                }}
                                className="bg-slate-50 dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-xs font-bold outline-none cursor-pointer focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                            >
                                {districtData.map(d => (
                                    <option key={d.districtName} value={d.districtName}>{d.districtName}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* KPI Comparison Grid */}
                    <div className="p-5">
                        <h3 className="text-[10px] uppercase tracking-widest font-black text-gray-500 dark:text-gray-400 mb-4">Comparative KPI Overview — {auditComparativeData.selDistrictName}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                            {[
                                {
                                    label: 'Device Utilization',
                                    unit: '%',
                                    selVal: auditComparativeData.selDistrictKPIs.deviceUtil.toFixed(1),
                                    avgVal: auditComparativeData.stateAvg.deviceUtil.toFixed(1),
                                    topVal: auditComparativeData.topDistrictKPIs.deviceUtil.toFixed(1),
                                    icon: '💻'
                                },
                                {
                                    label: 'Avg EduStat Hrs/Day',
                                    unit: ' hrs',
                                    selVal: auditComparativeData.selDistrictKPIs.avgHoursPerDay.toFixed(2),
                                    avgVal: auditComparativeData.stateAvg.avgHoursPerDay.toFixed(2),
                                    topVal: auditComparativeData.topDistrictKPIs.avgHoursPerDay.toFixed(2),
                                    icon: '⏱️'
                                },
                                {
                                    label: 'Class Delivery Rate',
                                    unit: '/sch/day',
                                    selVal: auditComparativeData.selDistrictKPIs.classRate.toFixed(3),
                                    avgVal: auditComparativeData.stateAvg.classRate.toFixed(3),
                                    topVal: auditComparativeData.topDistrictKPIs.classRate.toFixed(3),
                                    icon: '📚'
                                },
                                {
                                    label: 'Monitoring Intensity',
                                    unit: ' v/sch',
                                    selVal: auditComparativeData.selDistrictKPIs.monitoring.toFixed(2),
                                    avgVal: auditComparativeData.stateAvg.monitoring.toFixed(2),
                                    topVal: auditComparativeData.topDistrictKPIs.monitoring.toFixed(2),
                                    icon: '👁️'
                                },
                                {
                                    label: 'Instructor Presence',
                                    unit: '%',
                                    selVal: auditComparativeData.selDistrictKPIs.instructorRate.toFixed(1),
                                    avgVal: auditComparativeData.stateAvg.instructorRate.toFixed(1),
                                    topVal: auditComparativeData.topDistrictKPIs.instructorRate.toFixed(1),
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
                                            <div className="text-[9px] uppercase font-black text-gray-400 dark:text-gray-500">Selected District</div>
                                            <div className={`text-xl font-black ${isAbove ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{kpi.selVal}{kpi.unit}</div>
                                        </div>
                                        <div className="border-t border-gray-200/60 dark:border-white/5 pt-2 flex justify-between">
                                            <div>
                                                <div className="text-[9px] uppercase font-black text-gray-400 dark:text-gray-500">State Avg</div>
                                                <div className="text-sm font-bold text-gray-600 dark:text-gray-300">{kpi.avgVal}{kpi.unit}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[9px] uppercase font-black text-amber-500">Best District</div>
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

                    {/* Block Breakdown */}
                    {blockBreakdownData.length > 0 && (
                        <div className="px-5 pb-5">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-3">
                                <h3 className="text-[10px] uppercase tracking-widest font-black text-gray-500 dark:text-gray-400">
                                    Block-wise Breakdown within {auditComparativeData.selDistrictName}
                                </h3>
                                <button
                                    onClick={handleExportBlockSummary}
                                    className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
                                >
                                    <Icons.Export className="w-3.5 h-3.5 text-white" /> Export Block Summary
                                </button>
                            </div>
                            <div className="overflow-x-auto overflow-y-auto max-h-[400px] rounded-xl border border-gray-200 dark:border-white/10 shadow-md bg-slate-50/50">
                                <table className="w-full text-left border-collapse border border-gray-200 dark:border-white/10 text-xs select-none">
                                    <thead className="bg-teal-800 dark:bg-teal-950 text-white text-[10px] uppercase tracking-wider font-bold divide-x divide-teal-700/30 sticky top-0 z-30 shadow-md">
                                        <tr>
                                            <th className="p-3 align-top sticky top-0 left-0 z-40 bg-teal-800 w-[60px] min-w-[60px] max-w-[60px]">Slno</th>
                                            <th className="p-3 align-top sticky top-0 left-[60px] z-40 bg-teal-800 w-[120px] min-w-[120px] max-w-[120px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">Block Name</th>
                                            <th className="p-3 text-center align-top min-w-[70px]">Projects</th>
                                            <th className="p-3 text-center align-top min-w-[80px]">Coordinators</th>
                                            <th className="p-3 text-center align-top min-w-[80px]">No.of Schools</th>
                                            <th className="p-3 text-center align-top min-w-[90px]">No. of Instructor Working</th>
                                            <th className="p-3 text-center align-top bg-red-950/40 text-red-200 min-w-[90px]">Vacant Instructor</th>
                                            <th className="p-3 text-center align-top bg-blue-900/40 min-w-[90px]">No.Of CPU Installed</th>
                                            <th className="p-3 text-center align-top bg-red-950/40 text-red-200 min-w-[100px]">EduStat Not Installed</th>
                                            <th className="p-3 text-center align-top bg-blue-900/40 min-w-[80px]">No.Of CPU Used</th>
                                            <th className="p-3 text-center align-top bg-blue-900/40 text-red-200 min-w-[90px]">No. Of CPU Not Used</th>
                                            <th className="p-3 text-center align-top bg-purple-900/40 min-w-[110px]">No.Of Mini PC Installed</th>
                                            <th className="p-3 text-center align-top bg-purple-900/40 min-w-[100px]">No. Of Mini PC Used</th>
                                            <th className="p-3 text-center align-top bg-purple-900/40 text-red-200 min-w-[110px]">No. Of Mini PC Not Used</th>
                                            <th className="p-3 text-center align-top bg-indigo-900/40 min-w-[100px]">No.Of Panel Installed</th>
                                            <th className="p-3 text-center align-top bg-indigo-900/40 min-w-[90px]">No. Of Panel Used</th>
                                            <th className="p-3 text-center align-top bg-indigo-900/40 text-red-200 min-w-[100px]">No. Of Panel Not Used</th>
                                            <th className="p-3 text-center align-top bg-orange-900/40 min-w-[100px]">Total Hours Used (CPU)</th>
                                            <th className="p-3 text-center align-top bg-orange-900/40 min-w-[110px]">Total Hours Used (Mini PC)</th>
                                            <th className="p-3 text-center align-top bg-orange-900/40 min-w-[100px]">Total Hours Used (Panel)</th>
                                            <th className="p-3 text-center align-top bg-emerald-900/40 min-w-[110px]">Avg Hrs/Day/Sch/CPU</th>
                                            <th className="p-3 text-center align-top bg-emerald-900/40 min-w-[115px]">Avg Hrs/Day/Sch/Mini PC</th>
                                            <th className="p-3 text-center align-top bg-emerald-900/40 min-w-[110px]">Avg Hrs/Day/Sch/Panel</th>
                                            <th className="p-3 text-center align-top bg-pink-900/40 min-w-[80px]">ICT Classes</th>
                                            <th className="p-3 text-center align-top bg-pink-900/40 min-w-[110px]">Avg Classes/per school/Day</th>
                                            <th className="p-3 text-center align-top bg-yellow-900/40 min-w-[80px]">Smart Classes</th>
                                            <th className="p-3 text-center align-top bg-yellow-900/40 min-w-[110px]">Avg Smart Classes/per school/Day</th>
                                            <th className="p-3 text-center align-top min-w-[80px]">Total ICT Visit</th>
                                            <th className="p-3 text-center align-top min-w-[80px]">Total Smart Visit</th>
                                            <th className="p-3 text-center align-top min-w-[90px]">GrandTotal</th>
                                            <th className="p-3 text-center align-top bg-gradient-to-b from-indigo-700 to-indigo-800 text-white min-w-[120px] shadow-md border-l border-indigo-600">Performance Score</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                        {blockBreakdownData.map((b, idx) => (
                                            <tr key={b.blockName} className="hover:bg-teal-50/50 transition-all group">
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('all'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-medium sticky left-0 z-20 bg-white dark:bg-slate-900 group-hover:bg-teal-50/80 dark:group-hover:bg-slate-800 w-[60px] min-w-[60px] max-w-[60px] overflow-hidden text-ellipsis cursor-pointer hover:text-teal-900 dark:hover:text-teal-400 transition-all"
                                                >
                                                    {idx + 1}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('all'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 sticky left-[60px] z-20 bg-white dark:bg-slate-900 group-hover:bg-teal-50/80 dark:group-hover:bg-slate-800 w-[120px] min-w-[120px] max-w-[120px] overflow-hidden text-ellipsis font-bold text-teal-800 dark:text-teal-500 cursor-pointer hover:text-teal-900 dark:hover:text-teal-400 transition-all"
                                                >
                                                    {b.blockName}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('all'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-semibold text-gray-700 dark:text-gray-300 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer transition-all"
                                                >
                                                    {b.totalProjects}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('coordinators'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                                >
                                                    {b.totalCCs}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('all'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                                >
                                                    {b.totalSchools}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('working_instructors'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                                >
                                                    {b.instructorWorking}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('vacant_instructors'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-red-50/20 dark:bg-red-950/10 font-bold text-red-650 dark:text-red-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-red-900 dark:hover:text-red-300 transition-all"
                                                >
                                                    {b.totalSchools - b.instructorWorking}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('cpu_installed'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-blue-50/30 dark:bg-blue-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                                >
                                                    {b.cpuInstalled}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('edustat_not_installed'); setSearchQuery(''); }}
                                                    className={`p-3 border-r border-gray-100 dark:border-white/5 text-center bg-red-50/20 dark:bg-red-950/10 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all ${b.edustatNotInstalled > 0 ? 'text-red-650 dark:text-red-400' : 'text-gray-400'}`}
                                                >
                                                    {b.edustatNotInstalled}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('cpu_used'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-blue-50/30 dark:bg-blue-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                                >
                                                    {b.cpuUsed}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('cpu_not_used'); setSearchQuery(''); }}
                                                    className={`p-3 border-r border-gray-100 dark:border-white/5 text-center bg-blue-50/30 dark:bg-blue-950/10 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all ${b.cpuNotUsed > 0 ? 'text-red-500' : 'text-gray-400'}`}
                                                >
                                                    {b.cpuNotUsed}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('mini_installed'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-purple-50/30 dark:bg-purple-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                                >
                                                    {b.miniPcInstalled}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('mini_used'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-purple-50/30 dark:bg-purple-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                                >
                                                    {b.miniPcUsed}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('mini_not_used'); setSearchQuery(''); }}
                                                    className={`p-3 border-r border-gray-100 dark:border-white/5 text-center bg-purple-50/30 dark:bg-purple-950/10 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all ${b.miniPcNotUsed > 0 ? 'text-red-500' : 'text-gray-400'}`}
                                                >
                                                    {b.miniPcNotUsed}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('panel_installed'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-indigo-50/30 dark:bg-indigo-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                                >
                                                    {b.panelInstalled}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('panel_used'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-indigo-50/30 dark:bg-indigo-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                                >
                                                    {b.panelUsed}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('panel_not_used'); setSearchQuery(''); }}
                                                    className={`p-3 border-r border-gray-100 dark:border-white/5 text-center bg-indigo-50/30 dark:bg-indigo-950/10 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all ${b.panelNotUsed > 0 ? 'text-red-500' : 'text-gray-400'}`}
                                                >
                                                    {b.panelNotUsed}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('cpu_hours_logs'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-orange-50/30 dark:bg-orange-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                                >
                                                    {b.totalCpuHours}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('mini_hours_logs'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-orange-50/30 dark:bg-orange-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                                >
                                                    {b.totalMiniPcHours}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('panel_hours_logs'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-orange-50/30 dark:bg-orange-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                                >
                                                    {b.totalPanelHours}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('cpu_hours_logs'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                                >
                                                    {b.avgCpu}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('mini_hours_logs'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                                >
                                                    {b.avgMini}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('panel_hours_logs'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                                >
                                                    {b.avgPanel}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('ict_classes'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-pink-50/30 dark:bg-pink-950/10 text-pink-700 dark:text-pink-400 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                                >
                                                    {b.ictClasses}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('ict_classes'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-pink-50/30 dark:bg-pink-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                                >
                                                    {b.avgClasses}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('smart_classes'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-yellow-50/30 dark:bg-yellow-950/10 text-yellow-700 dark:text-yellow-400 font-bold hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                                >
                                                    {b.smartClasses}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('smart_classes'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center bg-yellow-50/30 dark:bg-yellow-950/10 font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                                >
                                                    {b.avgSmartClasses}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('ict_visits'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                                >
                                                    {b.totalIctVisits}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('smart_visits'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                                >
                                                    {b.totalSmartVisits}
                                                </td>
                                                <td
                                                    onClick={() => { setActiveDistrictDetail(b); setDrilldownFilter('all_visits'); setSearchQuery(''); }}
                                                    className="p-3 border-r border-gray-100 dark:border-white/5 text-center font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100/50 dark:hover:bg-slate-800 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 dark:hover:text-teal-300 transition-all"
                                                >
                                                    {b.grandTotal}
                                                </td>
                                                <td className="p-3 text-center bg-indigo-50/50 dark:bg-indigo-950/20 font-black text-indigo-700 dark:text-indigo-400 border-l border-indigo-200 dark:border-indigo-900">
                                                    {b.performanceScore}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Drilldown modal/section */}
            {activeDistrictDetail && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-teal-200 dark:border-teal-900 shadow-xl overflow-hidden no-print">
                    <div className="p-5 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 bg-teal-850 dark:bg-teal-950 text-white">
                        <div>
                            <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                                <span>🔍 Detailed Metrics Listing</span>
                                <span className="px-2 py-0.5 bg-teal-700/50 rounded-full text-xs font-semibold">
                                    {activeDistrictDetail.blockName || activeDistrictDetail.districtName}
                                </span>
                            </h3>
                            <p className="text-[10px] text-teal-100 mt-1 uppercase tracking-wider font-bold">
                                Current View: {drilldownFilter.replace(/_/g, ' ')} ({activeDistrictDetailsData.length} records found)
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExportDetail}
                                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-lg shadow-md transition-all flex items-center gap-1.5"
                            >
                                <Icons.Export className="w-3.5 h-3.5 text-white" /> Export Detailed View
                            </button>
                            <button
                                onClick={() => setActiveDistrictDetail(null)}
                                className="bg-white/10 hover:bg-white/20 text-white font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-lg transition-all"
                            >
                                Close Drilldown
                            </button>
                        </div>
                    </div>

                    {/* Drilldown Category Tabs Selector */}
                    <div className="flex flex-wrap gap-2 p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-gray-100 dark:border-white/5">
                        {[
                            { id: 'all', label: 'All Schools' },
                            { id: 'working_instructors', label: 'Active Instructors' },
                            { id: 'vacant_instructors', label: 'Vacant Schools' },
                            { id: 'cpu_installed', label: 'CPU Installed' },
                            { id: 'cpu_used', label: 'CPU Active' },
                            { id: 'mini_installed', label: 'Mini PC Installed' },
                            { id: 'mini_used', label: 'Mini PC Active' },
                            { id: 'panel_installed', label: 'Panel Installed' },
                            { id: 'panel_used', label: 'Panel Active' },
                            { id: 'cpu_hours_logs', label: 'CPU Logs' },
                            { id: 'mini_hours_logs', label: 'Mini PC Logs' },
                            { id: 'panel_hours_logs', label: 'Panel Logs' },
                            { id: 'ict_classes', label: 'ICT Classes Conducted' },
                            { id: 'smart_classes', label: 'Smart Classes Conducted' },
                            { id: 'all_visits', label: 'Field Audits Done' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setDrilldownFilter(tab.id); setSearchQuery(''); }}
                                className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold transition-all border ${drilldownFilter === tab.id ? 'bg-teal-800 dark:bg-teal-700 text-white border-teal-800 dark:border-teal-700 shadow-md' : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search Field */}
                    <div className="p-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-white/5">
                        <div className="relative max-w-md">
                            <input
                                type="text"
                                placeholder="Search by School Name, UDISE code, or Serial No..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 text-xs text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-white/10 rounded-xl outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-medium"
                            />
                            <div className="absolute left-3 top-2.5 text-gray-400">
                                <Icons.GlobalSearch className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    {/* Detailed Data Table */}
                    <div className="overflow-x-auto max-h-[500px]">
                        {drilldownViewType === 'devices' && (
                            <table className="w-full text-left border-collapse text-xs select-none">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-white/5 sticky top-0 z-20">
                                    <tr>
                                        <th className="p-3">Slno</th>
                                        <th className="p-3">UDISE Code</th>
                                        <th className="p-3">School Name</th>
                                        <th className="p-3">Block</th>
                                        <th className="p-3">Serial No</th>
                                        <th className="p-3">Device Type</th>
                                        <th className="p-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                    {activeDistrictDetailsData.map((d, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50">
                                            <td className="p-3">{d.slno}</td>
                                            <td className="p-3 font-semibold text-teal-700 dark:text-teal-500">{d.udise}</td>
                                            <td className="p-3 font-bold max-w-[200px] truncate">{d.schoolName}</td>
                                            <td className="p-3">{d.block}</td>
                                            <td className="p-3 font-semibold">{d.serial}</td>
                                            <td className="p-3 font-semibold">{d.deviceType}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full ${d.status.includes('Active') ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : d.status.includes('Not Installed') ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'}`}>
                                                    {d.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {drilldownViewType === 'instructors' && (
                            <table className="w-full text-left border-collapse text-xs select-none">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-white/5 sticky top-0 z-20">
                                    <tr>
                                        <th className="p-3">Slno</th>
                                        <th className="p-3">UDISE Code</th>
                                        <th className="p-3">School Name</th>
                                        <th className="p-3">Block</th>
                                        <th className="p-3">Instructor Name</th>
                                        <th className="p-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                    {activeDistrictDetailsData.map((d, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50">
                                            <td className="p-3">{d.slno}</td>
                                            <td className="p-3 font-semibold text-teal-700 dark:text-teal-500">{d.udise}</td>
                                            <td className="p-3 font-bold max-w-[200px] truncate">{d.schoolName}</td>
                                            <td className="p-3">{d.block}</td>
                                            <td className="p-3 font-bold">{d.instructorName}</td>
                                            <td className="p-3">
                                                <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                                                    {d.instructorStatus}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {drilldownViewType === 'vacant_instructors' && (
                            <table className="w-full text-left border-collapse text-xs select-none">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-white/5 sticky top-0 z-20">
                                    <tr>
                                        <th className="p-3">Slno</th>
                                        <th className="p-3">UDISE Code</th>
                                        <th className="p-3">School Name</th>
                                        <th className="p-3">Block</th>
                                        <th className="p-3">Last Working Instructor</th>
                                        <th className="p-3">Vacancy From Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                    {activeDistrictDetailsData.map((d, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50">
                                            <td className="p-3">{d.slno}</td>
                                            <td className="p-3 font-semibold text-teal-700 dark:text-teal-500">{d.udise}</td>
                                            <td className="p-3 font-bold max-w-[200px] truncate">{d.schoolName}</td>
                                            <td className="p-3">{d.block}</td>
                                            <td className="p-3 font-bold text-red-500">{d.lastInstructorName}</td>
                                            <td className="p-3 font-semibold">{d.lastWorkingDate}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {drilldownViewType === 'usage_logs' && (
                            <table className="w-full text-left border-collapse text-xs select-none">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-white/5 sticky top-0 z-20">
                                    <tr>
                                        <th className="p-3">Slno</th>
                                        <th className="p-3">Date</th>
                                        <th className="p-3">UDISE Code</th>
                                        <th className="p-3">School Name</th>
                                        <th className="p-3">Block</th>
                                        <th className="p-3">Serial No</th>
                                        <th className="p-3">Device Type</th>
                                        <th className="p-3">Run Hours</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                    {activeDistrictDetailsData.map((d, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50">
                                            <td className="p-3">{d.slno}</td>
                                            <td className="p-3 font-semibold">{d.date}</td>
                                            <td className="p-3 font-semibold text-teal-700 dark:text-teal-500">{d.udise}</td>
                                            <td className="p-3 font-bold max-w-[200px] truncate">{d.schoolName}</td>
                                            <td className="p-3">{d.block}</td>
                                            <td className="p-3 font-semibold">{d.serial}</td>
                                            <td className="p-3 font-semibold">{d.deviceType}</td>
                                            <td className="p-3 font-black text-teal-800 dark:text-teal-400">{d.hours} hrs</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {drilldownViewType === 'classes' && (
                            <table className="w-full text-left border-collapse text-xs select-none">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-white/5 sticky top-0 z-20">
                                    <tr>
                                        <th className="p-3">Slno</th>
                                        <th className="p-3">Date</th>
                                        <th className="p-3">UDISE Code</th>
                                        <th className="p-3">School Name</th>
                                        <th className="p-3">Block</th>
                                        <th className="p-3">Lab Type</th>
                                        <th className="p-3">Subject</th>
                                        <th className="p-3">Subject Teacher</th>
                                        <th className="p-3">Topic / Remarks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-700 dark:text-gray-300">
                                    {activeDistrictDetailsData.map((d, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 align-top">
                                            <td className="p-3 whitespace-nowrap">{d.slno}</td>
                                            <td className="p-3 whitespace-nowrap font-semibold">{d.date}</td>
                                            <td className="p-3 whitespace-nowrap font-semibold text-teal-700 dark:text-teal-500">{d.udise}</td>
                                            <td className="p-3 whitespace-nowrap font-bold max-w-[200px] truncate">{d.schoolName}</td>
                                            <td className="p-3 whitespace-nowrap">{d.block}</td>
                                            <td className="p-3 whitespace-nowrap font-semibold text-teal-800 dark:text-teal-400">{d.labType}</td>
                                            <td className="p-3 whitespace-nowrap font-semibold">{d.subject}</td>
                                            <td className="p-3 whitespace-nowrap font-bold">{d.teacher}</td>
                                            <td className="p-3 font-semibold text-gray-600 dark:text-gray-400 text-xs min-w-[240px] leading-relaxed max-w-sm border-l border-indigo-200 dark:border-indigo-900 bg-slate-50/40 dark:bg-slate-800/10">
                                                {d.remarks}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {drilldownViewType === 'visits' && (
                            <table className="w-full text-left border-collapse text-xs select-none">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-white/5 sticky top-0 z-20">
                                    <tr>
                                        <th className="p-3">Slno</th>
                                        <th className="p-3">Date</th>
                                        <th className="p-3">UDISE Code</th>
                                        <th className="p-3">School Name</th>
                                        <th className="p-3">Block</th>
                                        <th className="p-3">Visit Type</th>
                                        <th className="p-3">Visitor Name</th>
                                        <th className="p-3">Remarks / Findings</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-700 dark:text-gray-300">
                                    {activeDistrictDetailsData.map((d, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 align-top">
                                            <td className="p-3 whitespace-nowrap">{d.slno}</td>
                                            <td className="p-3 whitespace-nowrap font-semibold">{d.date}</td>
                                            <td className="p-3 whitespace-nowrap font-semibold text-teal-700 dark:text-teal-500">{d.udise}</td>
                                            <td className="p-3 whitespace-nowrap font-bold max-w-[200px] truncate">{d.schoolName}</td>
                                            <td className="p-3 whitespace-nowrap">{d.block}</td>
                                            <td className="p-3 whitespace-nowrap font-bold">{d.visitType}</td>
                                            <td className="p-3 whitespace-nowrap font-semibold text-indigo-700 dark:text-indigo-400">{d.visitorName}</td>
                                            <td className="p-3 font-semibold text-gray-600 dark:text-gray-400 text-xs min-w-[240px] leading-relaxed max-w-sm border-l border-indigo-200 dark:border-indigo-900 bg-slate-50/40 dark:bg-slate-800/10">
                                                {d.remarks}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {drilldownViewType === 'schools' && (
                            <table className="w-full text-left border-collapse text-xs select-none">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-white/5 sticky top-0 z-20">
                                    <tr>
                                        <th className="p-3">Slno</th>
                                        <th className="p-3">School Name</th>
                                        <th className="p-3">UDISE Code</th>
                                        <th className="p-3">Block</th>
                                        <th className="p-3">Instructor</th>
                                        <th className="p-3">CPU (Hrs)</th>
                                        <th className="p-3">Mini PC (Hrs)</th>
                                        <th className="p-3">Panel (Hrs)</th>
                                        <th className="p-3">Not Installed</th>
                                        <th className="p-3">ICT Class</th>
                                        <th className="p-3">Smart Class</th>
                                        <th className="p-3">Visits</th>
                                        <th className="p-3">Last Visit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                    {activeDistrictDetailsData.map((s, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50">
                                            <td className="p-3">{s.slno}</td>
                                            <td className="p-3 font-bold max-w-[200px] truncate" title={s.schoolName}>{s.schoolName}</td>
                                            <td className="p-3 font-semibold text-teal-700 dark:text-teal-500">{s.udise}</td>
                                            <td className="p-3">{s.block}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full ${s.instructorStatus === 'Active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : s.instructorStatus === 'Vacant' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}>
                                                    {s.instructorStatus}
                                                </span>
                                            </td>
                                            <td className="p-3 font-semibold text-slate-800 dark:text-slate-350">{s.cpuInstalled} ({s.totalCpuHours})</td>
                                            <td className="p-3 font-semibold text-slate-800 dark:text-slate-350">{s.miniInstalled} ({s.totalMiniPcHours})</td>
                                            <td className="p-3 font-semibold text-slate-800 dark:text-slate-350">{s.panelInstalled} ({s.totalPanelHours})</td>
                                            <td className={`p-3 font-semibold ${s.edustatNotInstalled > 0 ? 'text-red-500' : 'text-gray-400'}`}>{s.edustatNotInstalled}</td>
                                            <td className="p-3 font-semibold text-indigo-700 dark:text-indigo-400">{s.ictClasses}</td>
                                            <td className="p-3 font-semibold text-amber-700 dark:text-amber-400">{s.smartClasses}</td>
                                            <td className="p-3 font-bold text-teal-700 dark:text-teal-400">{s.visitsCount}</td>
                                            <td className="p-3 font-semibold text-gray-500 dark:text-gray-400">{s.lastVisitDate}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DistrictPerformance;
