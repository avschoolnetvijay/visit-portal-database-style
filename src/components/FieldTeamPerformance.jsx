import React, { useMemo, useEffect, useState, useRef } from 'react';
import { exportToExcel, parseDateRobust } from '../utils';
import { Icons } from './Icons';

const FieldTeamPerformance = ({ 
    schools, 
    visits, 
    jhpmsLab, 
    edustat, 
    edustatMaster = [],
    manpower,
    startDate,
    endDate,
    selProjects,
    selDistricts,
    selBlocks,
    selCCs = [],
    ccNameMapping = {},
    workingDays,
    onRegisterExport,
    userPermissions = null
}) => {
    
    const [activeCCDetail, setActiveCCDetail] = useState(null);
    const [drilldownFilter, setDrilldownFilter] = useState('all');
    const fileInputRef = useRef(null);
    
    const performanceData = useMemo(() => {
        // 1. Filter schools based on global filters (optional, but requested by standard usage)
        let fSchools = schools;
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

        // 3. Process Edustat (Dual-Layer Logic with Master Baseline & Daily utilisation logs)
        // Helper to format date cleanly as YYYY-MM-DD using local timezone parts to avoid timezone shifting
        const formatDateStr = (dateInput) => {
            if (!dateInput) return null;
            const d = parseDateRobust(dateInput);
            if (!d || isNaN(d.getTime())) return null;
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };

        const filteredEdustat = edustat.filter(row => {
            const dateStr = formatDateStr(row.date || getVal(row, 'date'));
            return dateStr && dateStr >= startDate && dateStr <= endDate;
        });

        // Create serial-to-device mapping from Master List
        const serialMap = {};
        (edustatMaster || []).forEach(m => {
            if (m.serial) {
                serialMap[String(m.serial).trim()] = {
                    device: String(m.device || '').toUpperCase(),
                    installed: String(m.installed || '').toUpperCase()
                };
            }
        });

        // Initialize installation counts from the Master baseline
        (edustatMaster || []).forEach(m => {
            const udise = String(m.udise).trim();
            const device = String(m.device || '').toUpperCase();
            const installed = String(m.installed || '').toUpperCase();
            
            if (installed === 'YES') {
                Object.values(ccMap).forEach(ccData => {
                    if (ccData.udises.has(udise)) {
                        if (device === 'CPU') {
                            ccData.cpuInstalled++;
                        } else if (device === 'MINI PC' || device === 'THIN CLIENT') {
                            ccData.miniPcInstalled++;
                        } else if (device === 'INTERACTIVE FLAT PANEL') {
                            ccData.panelInstalled++;
                        }
                    }
                });
            } else if (installed === 'NO') {
                Object.values(ccMap).forEach(ccData => {
                    if (ccData.udises.has(udise)) {
                        ccData.edustatNotInstalled++;
                    }
                });
            }
        });

        // Track active/syncing serial numbers in this range
        const activeSerials = new Set();
        filteredEdustat.forEach(e => {
            if (e.hours > 0 && e.serial) {
                activeSerials.add(String(e.serial).trim());
            }
        });

        // Accumulate active run hours
        filteredEdustat.forEach(e => {
            const udise = String(e.udise).trim();
            const serial = String(e.serial).trim();
            const hours = Number(e.hours) || 0;
            
            const devInfo = serialMap[serial] || { device: 'CPU' };
            const deviceType = devInfo.device;
            
            Object.values(ccMap).forEach(ccData => {
                if (ccData.udises.has(udise)) {
                    if (deviceType === 'CPU') {
                        ccData.totalCpuHours += hours;
                    } else if (deviceType === 'MINI PC' || deviceType === 'THIN CLIENT') {
                        ccData.totalMiniPcHours += hours;
                    } else if (deviceType === 'INTERACTIVE FLAT PANEL') {
                        ccData.totalPanelHours += hours;
                    }
                }
            });
        });

        // Calculate cpuUsed and miniPcUsed counts
        (edustatMaster || []).forEach(m => {
            const udise = String(m.udise).trim();
            const serial = String(m.serial).trim();
            const device = String(m.device || '').toUpperCase();
            const installed = String(m.installed || '').toUpperCase();

            if (installed === 'YES' && activeSerials.has(serial)) {
                Object.values(ccMap).forEach(ccData => {
                    if (ccData.udises.has(udise)) {
                        if (device === 'CPU') {
                            ccData.cpuUsed++;
                        } else if (device === 'MINI PC' || device === 'THIN CLIENT') {
                            ccData.miniPcUsed++;
                        } else if (device === 'INTERACTIVE FLAT PANEL') {
                            ccData.panelUsed++;
                        }
                    }
                });
            }
        });

        // 4. Process JHPMS Lab Uses (ICT Classes & Smart Classes)
        jhpmsLab.forEach(l => {
            const udise = String(l.udise || getVal(l, 'udise') || '').trim();
            const labType = String(l.labType || getVal(l, 'lab') || '').toUpperCase();
            const subject = String(l.subject || getVal(l, 'sub') || '').toUpperCase();
            
            // Parse date and filter by range to ensure dynamically updated ICT / Smart Class counts
            const dateStr = formatDateStr(l.date || getVal(l, 'date'));
            
            if (dateStr) {
                if (dateStr >= startDate && dateStr <= endDate) {
                    Object.values(ccMap).forEach(ccData => {
                        if (ccData.udises.has(udise)) {
                            if (subject.split(/[^A-Z0-9]+/).includes('MIS')) {
                                // Ignore MIS
                            } else if (labType.includes('ICT') && subject.includes('COMPUTER')) {
                                ccData.ictClasses++;
                            } else if (labType.includes('SMART')) {
                                ccData.smartClasses++;
                            }
                        }
                    });
                }
            } else {
                // Fallback: If date is invalid or missing, count it by default
                Object.values(ccMap).forEach(ccData => {
                    if (ccData.udises.has(udise)) {
                        if (subject.split(/[^A-Z0-9]+/).includes('MIS')) {
                            // Ignore MIS
                        } else if (labType.includes('ICT') && subject.includes('COMPUTER')) {
                            ccData.ictClasses++;
                        } else if (labType.includes('SMART')) {
                            ccData.smartClasses++;
                        }
                    }
                });
            }
        });

        // 5. Process Visits (Total ICT Visit / Total Smart Visit)
        visits.forEach(v => {
            const udise = String(v.udise_code || '').trim();
            const dateStr = formatDateStr(v.visit_date || getVal(v, 'date'));
            const type = (v.visit_type || '').toLowerCase();
            
            if (dateStr) {
                if (dateStr >= startDate && dateStr <= endDate) {
                    Object.values(ccMap).forEach(ccData => {
                        if (ccData.udises.has(udise)) {
                            if (type.includes('ict')) ccData.totalIctVisits++;
                            if (type.includes('smart')) ccData.totalSmartVisits++;
                        }
                    });
                }
            }
        });

        // Two-Pass Calculation for Weighted Performance Score using dynamic Working Days prop
        const days = Number(workingDays) && Number(workingDays) >= 1
            ? Number(workingDays)
            : Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
        
        let maxAvgCpu = 0, maxAvgMini = 0, maxAvgPanel = 0;
        let maxAcademic = 0, maxSmart = 0;
        let maxMonitoring = 0, maxAvailability = 0;

        let pass1Data = Object.values(ccMap).map(c => {
            const cpuNotUsed = Math.max(0, c.cpuInstalled - c.cpuUsed);
            const miniPcNotUsed = Math.max(0, c.miniPcInstalled - c.miniPcUsed);
            const panelNotUsed = Math.max(0, c.panelInstalled - c.panelUsed);
            
            const avgCpu = c.cpuInstalled > 0 ? (c.totalCpuHours / days / c.cpuInstalled) : 0;
            const avgMini = c.miniPcInstalled > 0 ? (c.totalMiniPcHours / days / c.miniPcInstalled) : 0;
            const avgPanel = c.panelInstalled > 0 ? (c.totalPanelHours / days / c.panelInstalled) : 0;
            const academic = c.totalSchools > 0 ? (c.ictClasses / c.totalSchools) : 0;
            const smart = c.totalSchools > 0 ? (c.smartClasses / c.totalSchools) : 0;
            const monitoring = c.totalSchools > 0 ? ((c.totalIctVisits + c.totalSmartVisits) / c.totalSchools) : 0;
            const availability = c.totalSchools > 0 ? (c.instructorWorking / c.totalSchools) : 0;
            
            const avgClasses = c.totalSchools > 0 ? (c.ictClasses / (days * c.totalSchools)) : 0;
            const avgSmartClasses = c.totalSchools > 0 ? (c.smartClasses / (days * c.totalSchools)) : 0;

            maxAvgCpu = Math.max(maxAvgCpu, avgCpu);
            maxAvgMini = Math.max(maxAvgMini, avgMini);
            maxAvgPanel = Math.max(maxAvgPanel, avgPanel);
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
                edustatNotInstalled: c.edustatNotInstalled,
                cpuUsed: c.cpuUsed,
                cpuNotUsed,
                miniPcInstalled: c.miniPcInstalled,
                miniPcUsed: c.miniPcUsed,
                miniPcNotUsed,
                panelInstalled: c.panelInstalled,
                panelUsed: c.panelUsed,
                panelNotUsed,
                totalCpuHours: c.totalCpuHours.toFixed(2),
                totalMiniPcHours: c.totalMiniPcHours.toFixed(2),
                totalPanelHours: c.totalPanelHours.toFixed(2),
                avgCpuRaw: avgCpu,
                avgMiniRaw: avgMini,
                avgPanelRaw: avgPanel,
                avgCpu: avgCpu.toFixed(5),
                avgMini: avgMini.toFixed(5),
                avgPanel: avgPanel.toFixed(5),
                ictClasses: c.ictClasses,
                avgClasses: avgClasses.toFixed(5),
                smartClasses: c.smartClasses,
                avgSmartClasses: avgSmartClasses.toFixed(5),
                totalIctVisits: c.totalIctVisits,
                totalSmartVisits: c.totalSmartVisits,
                grandTotal: c.totalIctVisits + c.totalSmartVisits,
                udises: c.udises,
                
                academicRaw: academic,
                smartRaw: smart,
                monitoringRaw: monitoring,
                availabilityRaw: availability,
            };
        });

        let finalData = pass1Data.map(c => {
            // 1. Infrastructure Utilization (25 Marks) — now includes Panel
            const cpuUtil = c.cpuInstalled > 0 ? (c.cpuUsed / c.cpuInstalled) : 0;
            const miniUtil = c.miniPcInstalled > 0 ? (c.miniPcUsed / c.miniPcInstalled) : 0;
            const panelUtil = c.panelInstalled > 0 ? (c.panelUsed / c.panelInstalled) : 0;
            const activeDeviceTypes = [cpuUtil, miniUtil, panelUtil].filter((_, i) => [c.cpuInstalled, c.miniPcInstalled, c.panelInstalled][i] > 0);
            const infraScore = (activeDeviceTypes.length > 0 ? activeDeviceTypes.reduce((a, b) => a + b, 0) / activeDeviceTypes.length : 0) * 25;

            // 2. Usage Efficiency (20 Marks)
            const normCpu = maxAvgCpu > 0 ? (c.avgCpuRaw / maxAvgCpu) : 0;
            const normMini = maxAvgMini > 0 ? (c.avgMiniRaw / maxAvgMini) : 0;
            const normPanel = maxAvgPanel > 0 ? (c.avgPanelRaw / maxAvgPanel) : 0;
            const activeUsageTypes = [normCpu, normMini, normPanel].filter((_, i) => [c.cpuInstalled, c.miniPcInstalled, c.panelInstalled][i] > 0);
            const usageScore = (activeUsageTypes.length > 0 ? activeUsageTypes.reduce((a, b) => a + b, 0) / activeUsageTypes.length : 0) * 20;

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

    }, [schools, visits, jhpmsLab, edustat, edustatMaster, manpower, startDate, endDate, selProjects, selDistricts, selBlocks, selCCs, ccNameMapping, workingDays]);

    const activeCCDetailSchools = useMemo(() => {
        if (!activeCCDetail) return [];

        const ccName = activeCCDetail.ccName;
        const ccUdises = activeCCDetail.udises; // Set of UDISE strings

        // Helper to parse and format dates
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

        // Helper to get normalized keys from row
        const getVal = (row, keyMatch) => {
            const key = Object.keys(row).find(k => k.toLowerCase().includes(keyMatch.toLowerCase()));
            return key ? row[key] : null;
        };

        // Resolve viewType based on drilldownFilter
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
        }

        // Generate data based on viewType
        if (viewType === 'devices') {
            // Find all master devices for this CC's UDISE codes
            const masterDevices = (edustatMaster || []).filter(m => ccUdises.has(String(m.udise || '').trim()));

            // Find active serial numbers in date range
            const filteredEdustat = edustat.filter(row => {
                const dateStr = formatDateStr(row.date || getVal(row, 'date'));
                return dateStr && dateStr >= startDate && dateStr <= endDate && ccUdises.has(String(row.udise || '').trim());
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

            return filteredDevices.map((m, idx) => {
                const udise = String(m.udise || '').trim();
                const schoolRec = schools.find(s => String(s.udise_code || '').trim() === udise);
                
                let status = 'Idle / Not Used';
                if (String(m.installed || '').toUpperCase() === 'NO') status = 'Not Installed';
                else if (activeSerials.has(String(m.serial || '').trim())) status = 'Active / Syncing';

                return {
                    slno: idx + 1,
                    udise,
                    schoolName: schoolRec ? (schoolRec.school_name || schoolRec.school || '-') : '-',
                    block: schoolRec ? (schoolRec.block || '-') : '-',
                    serial: m.serial || 'N/A',
                    deviceType: m.device || 'CPU',
                    status
                };
            });
        }

        if (viewType === 'instructors') {
            const ccManpower = manpower.filter(m => ccUdises.has(String(m.udise || getVal(m, 'udise') || '').trim()));
            
            const listData = ccManpower.map((m, idx) => {
                const udise = String(m.udise || getVal(m, 'udise') || '').trim();
                const schoolRec = schools.find(s => String(s.udise_code || '').trim() === udise);
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

            // Filter to show active working instructors
            const filteredList = listData.filter(ins => ins.instructorStatus === 'Active');

            return filteredList.map((ins, idx) => ({
                ...ins,
                slno: idx + 1
            }));
        }

        if (viewType === 'usage_logs') {
            const filteredEdustat = edustat.filter(row => {
                const dateStr = formatDateStr(row.date || getVal(row, 'date'));
                return dateStr && dateStr >= startDate && dateStr <= endDate && ccUdises.has(String(row.udise || '').trim());
            });

            // Map serial to device type from Master
            const serialMap = {};
            (edustatMaster || []).forEach(m => {
                if (m.serial) {
                    serialMap[String(m.serial).trim()] = String(m.device || '').toUpperCase();
                }
            });

            let logRows = filteredEdustat.map(e => {
                const udise = String(e.udise || '').trim();
                const serial = String(e.serial || '').trim();
                const devType = serialMap[serial] || 'CPU';
                const schoolRec = schools.find(s => String(s.udise_code || '').trim() === udise);

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

            // Sort by raw date descending
            logRows.sort((a, b) => (b.dateRaw || '').localeCompare(a.dateRaw || ''));

            return logRows.map((l, idx) => ({
                ...l,
                slno: idx + 1
            }));
        }

        if (viewType === 'classes') {
            const filteredJhpms = jhpmsLab.filter(l => {
                const udise = String(l.udise || getVal(l, 'udise') || '').trim();
                const dateStr = formatDateStr(l.date || getVal(l, 'date'));
                return dateStr && dateStr >= startDate && dateStr <= endDate && ccUdises.has(udise);
            });

            let classRows = [];
            filteredJhpms.forEach(l => {
                const udise = String(l.udise || getVal(l, 'udise') || '').trim();
                const labType = String(l.labType || getVal(l, 'lab') || '').toUpperCase();
                
                const teacherKey = Object.keys(l).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes('subjectteacher'));
                const teacher = teacherKey ? String(l[teacherKey] || '').trim() : (getVal(l, 'teacher') || 'N/A');
                
                const subjectKey = Object.keys(l).find(k => k !== teacherKey && k.toLowerCase().replace(/[^a-z0-9]/g, '').includes('sub'));
                const subject = subjectKey ? String(l[subjectKey] || '').trim().toUpperCase() : '';
                
                const remarks = l.remarks || getVal(l, 'remarks') || getVal(l, 'topic') || '-';
                const schoolRec = schools.find(s => String(s.udise_code || '').trim() === udise);

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

            // Sort descending by date
            classRows.sort((a, b) => (b.dateRaw || '').localeCompare(a.dateRaw || ''));

            return classRows.map((r, idx) => ({
                ...r,
                slno: idx + 1
            }));
        }

        if (viewType === 'visits') {
            const ccVisits = visits.filter(v => {
                const dateStr = formatDateStr(v.visit_date || getVal(v, 'date'));
                return dateStr && dateStr >= startDate && dateStr <= endDate && ccUdises.has(String(v.udise_code || '').trim());
            });

            let visitRows = ccVisits.map(v => {
                const udise = String(v.udise_code || '').trim();
                const schoolRec = schools.find(s => String(s.udise_code || '').trim() === udise);

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

            // Sort by date descending
            visitRows.sort((a, b) => (b.dateRaw || '').localeCompare(a.dateRaw || ''));

            return visitRows.map((v, idx) => ({
                ...v,
                slno: idx + 1
            }));
        }

        // Default viewType === 'schools'
        const ccSchoolsList = schools.filter(s => ccUdises.has(String(s.udise_code || '').trim()));

        // Filtered datasets for the active date range
        const rangeVisits = visits.filter(v => {
            const dateStr = formatDateStr(v.visit_date);
            return dateStr && dateStr >= startDate && dateStr <= endDate && ccUdises.has(String(v.udise_code || '').trim());
        });

        const rangeJhpms = jhpmsLab.filter(l => {
            const udise = String(l.udise || getVal(l, 'udise') || '').trim();
            const dateStr = formatDateStr(l.date || getVal(l, 'date'));
            return dateStr && dateStr >= startDate && dateStr <= endDate && ccUdises.has(udise);
        });

        const rangeEdustat = edustat.filter(e => {
            const dateStr = formatDateStr(e.date || getVal(e, 'date'));
            return dateStr && dateStr >= startDate && dateStr <= endDate && ccUdises.has(String(e.udise || '').trim());
        });

        const schDetailsList = ccSchoolsList.map((s, idx) => {
            const udise = String(s.udise_code || '').trim();

            // 1. Instructor Status
            const instructorRec = manpower.find(m => String(m.udise || getVal(m, 'udise') || '').trim() === udise);
            const rawStatus = instructorRec ? (instructorRec.status || getVal(instructorRec, 'status') || 'Active') : 'N/A';
            let instructorStatus = 'N/A';
            if (rawStatus) {
                const sUpper = String(rawStatus).toUpperCase();
                if (sUpper.includes('WORKING') || sUpper.includes('ACTIVE')) instructorStatus = 'Active';
                else if (sUpper.includes('PENDING')) instructorStatus = 'Pending';
                else if (sUpper.includes('RESIGN') || sUpper.includes('TERMINATE') || sUpper.includes('VACANT')) instructorStatus = 'Vacant';
            }

            // 2. Edustat master device info
            let cpuInstalled = 0;
            let miniInstalled = 0;
            let panelInstalledSch = 0;
            let edustatNotInstalled = 0;

            (edustatMaster || []).forEach(m => {
                if (String(m.udise || '').trim() === udise) {
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

            // 3. JHPMS Classes count
            let ictClasses = 0;
            let smartClasses = 0;
            rangeJhpms.forEach(l => {
                const rowUdise = String(l.udise || getVal(l, 'udise') || '').trim();
                if (rowUdise !== udise) return;

                const labType = String(l.labType || getVal(l, 'lab') || '').toUpperCase();
                const teacherKey = Object.keys(l).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes('subjectteacher'));
                const teacher = teacherKey ? String(l[teacherKey] || '').trim() : (getVal(l, 'teacher') || '');
                const subjectKey = Object.keys(l).find(k => k !== teacherKey && k.toLowerCase().replace(/[^a-z0-9]/g, '').includes('sub'));
                const subject = subjectKey ? String(l[subjectKey] || '').trim().toUpperCase() : '';

                if (subject.split(/[^A-Z0-9]+/).includes('MIS')) {
                    // Ignore MIS
                } else if (labType.includes('ICT') && subject.includes('COMPUTER')) {
                    ictClasses++;
                } else if (labType.includes('SMART')) {
                    smartClasses++;
                }
            });

            // 4. Edustat Hours count
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
                const rowUdise = String(e.udise || '').trim();
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

            // 5. Visits count
            let visitsCount = 0;
            let lastVisitDate = '-';
            rangeVisits.forEach(v => {
                if (String(v.udise_code || '').trim() !== udise) return;
                visitsCount++;
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

        let filteredSchools = schDetailsList;
        if (drilldownFilter === 'ict_visits' || drilldownFilter === 'smart_visits') {
            filteredSchools = filteredSchools.filter(sch => sch.visitsCount > 0);
        }

        return filteredSchools.map((sch, i) => ({
            ...sch,
            slno: i + 1
        }));

    }, [activeCCDetail, schools, visits, jhpmsLab, edustat, edustatMaster, manpower, startDate, endDate, drilldownFilter]);

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
        }
        return 'schools';
    }, [drilldownFilter]);

    const handleExportDetails = () => {
        if (!activeCCDetail || !activeCCDetailSchools.length) return;
        
        let exportFormat = [];
        if (drilldownViewType === 'devices') {
            exportFormat = activeCCDetailSchools.map(d => ({
                'Slno': d.slno,
                'UDISE Code': d.udise,
                'School Name': d.schoolName,
                'Block': d.block,
                'Serial No of Device': d.serial,
                'Device (CPU, Mini PC/Thin Client, Panel)': d.deviceType,
                'Status': d.status
            }));
        } else if (drilldownViewType === 'instructors') {
            exportFormat = activeCCDetailSchools.map(d => ({
                'Slno': d.slno,
                'UDISE Code': d.udise,
                'School Name': d.schoolName,
                'Block': d.block,
                'Instructor Name': d.instructorName,
                'Instructor Status': d.instructorStatus
            }));
        } else if (drilldownViewType === 'usage_logs') {
            exportFormat = activeCCDetailSchools.map(d => ({
                'Slno': d.slno,
                'Date': d.date,
                'UDISE Code': d.udise,
                'School Name': d.schoolName,
                'Block': d.block,
                'Serial No of Device': d.serial,
                'Device (CPU, Mini PC, Thin Client, Panel)': d.deviceType,
                'Hours Used': d.hours
            }));
        } else if (drilldownViewType === 'classes') {
            exportFormat = activeCCDetailSchools.map(d => ({
                'Slno': d.slno,
                'Date': d.date,
                'UDISE Code': d.udise,
                'School Name': d.schoolName,
                'Block': d.block,
                'Lab Type': d.labType,
                'Subject': d.subject,
                'Subject Teacher': d.teacher,
                'Remarks/Topic': d.remarks
            }));
        } else if (drilldownViewType === 'visits') {
            exportFormat = activeCCDetailSchools.map(d => ({
                'Slno': d.slno,
                'Date': d.date,
                'UDISE Code': d.udise,
                'School Name': d.schoolName,
                'Block': d.block,
                'Visit Type': d.visitType,
                'Visitor Name': d.visitorName,
                'Remarks/Findings': d.remarks
            }));
        } else {
            exportFormat = activeCCDetailSchools.map(d => ({
                'Slno': d.slno,
                'School Name': d.schoolName,
                'UDISE Code': d.udise,
                'Block': d.block,
                'Instructor Status': d.instructorStatus,
                'CPU Installed': d.cpuInstalled,
                'CPU Run Hours': d.totalCpuHours,
                'Mini PC/Thin Client Installed': d.miniInstalled,
                'Mini PC/Thin Client Run Hours': d.totalMiniPcHours,
                'Panel (IFP) Installed': d.panelInstalled,
                'Panel (IFP) Run Hours': d.totalPanelHours,
                'Devices Not Installed': d.edustatNotInstalled,
                'JHPMS ICT Classes': d.ictClasses,
                'JHPMS Smart Classes': d.smartClasses,
                'Visits Done': d.visitsCount,
                'Last Visit Date': d.lastVisitDate
            }));
        }
        
        const fileLabel = `${activeCCDetail.ccName.replace(/\s+/g, '_')}_${drilldownFilter.toUpperCase()}_Detailed_Report`;
        exportToExcel(exportFormat, fileLabel);
    };

    const handleExport = () => {
        const exportFormat = performanceData.map(d => ({
            'Slno': d.slno,
            'School_DISTRICT': d.district,
            'CC/DEF Name': d.ccName,
            'No.of Schools': d.totalSchools,
            'No. of Instructor Working': d.instructorWorking,
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
            'Average Hours/ Day/ Schools/ CPU': d.avgCpu,
            'Average Hours/ Day/ Schools/ Mini PC / Thin Client': d.avgMini,
            'Average Hours/ Day/ Schools/ Panel (IFP)': d.avgPanel,
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
        <div className="space-y-4 animate-fade-in">
            <style>{`
                .custom-tooltip-trigger {
                    position: relative;
                    cursor: help;
                }
                .custom-tooltip-box {
                    visibility: hidden;
                    opacity: 0;
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    margin-top: 8px;
                    width: 250px;
                    padding: 12px;
                    background: rgba(15, 23, 42, 0.95);
                    color: #ffffff;
                    font-size: 11px;
                    font-weight: normal;
                    line-height: 1.4;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
                    backdrop-filter: blur(8px);
                    z-index: 9999;
                    white-space: normal;
                    text-align: left;
                    transition: opacity 0.2s, visibility 0.2s;
                }
                .custom-tooltip-trigger:hover .custom-tooltip-box {
                    visibility: visible;
                    opacity: 1;
                }
            `}</style>

            {performanceData.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border border-teal-100 p-2 rounded-xl bg-white shadow-sm shrink-0">
                    {/* Gold Performer */}
                    {performanceData[0] && (
                        <div className="rounded-lg border shadow-sm bg-gradient-to-br from-amber-50 to-yellow-100 border-yellow-300 p-2.5 flex items-center gap-3 relative overflow-hidden transition-all hover:shadow-md">
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-yellow-400 rounded-full opacity-20 blur-xl"></div>
                            <div className="text-3xl drop-shadow-md flex-shrink-0">🏆</div>
                            <div className="flex-1 text-left min-w-0">
                                <div className="font-extrabold text-[10px] text-yellow-800 uppercase tracking-wider opacity-90">Gold Performer</div>
                                <div className="font-bold text-sm text-gray-800 leading-tight truncate">{performanceData[0].ccName}</div>
                                <div className="text-[10px] text-gray-600 font-medium truncate">{performanceData[0].district}</div>
                            </div>
                            <div className="bg-white/80 px-2.5 py-1 rounded-md font-extrabold text-xs text-yellow-700 shadow-sm border border-yellow-200 whitespace-nowrap">
                                {performanceData[0].performanceScore}%
                            </div>
                        </div>
                    )}
                    {/* Silver Performer */}
                    {performanceData[1] && (
                        <div className="rounded-lg border shadow-sm bg-gradient-to-br from-slate-50 to-gray-200 border-gray-300 p-2.5 flex items-center gap-3 relative overflow-hidden transition-all hover:shadow-md">
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-gray-400 rounded-full opacity-20 blur-xl"></div>
                            <div className="text-3xl drop-shadow-md flex-shrink-0">🥈</div>
                            <div className="flex-1 text-left min-w-0">
                                <div className="font-extrabold text-[10px] text-gray-600 uppercase tracking-wider opacity-90">Silver Performer</div>
                                <div className="font-bold text-sm text-gray-800 leading-tight truncate">{performanceData[1].ccName}</div>
                                <div className="text-[10px] text-gray-600 font-medium truncate">{performanceData[1].district}</div>
                            </div>
                            <div className="bg-white/80 px-2.5 py-1 rounded-md font-extrabold text-xs text-gray-700 shadow-sm border border-gray-300 whitespace-nowrap">
                                {performanceData[1].performanceScore}%
                            </div>
                        </div>
                    )}
                    {/* Bronze Performer */}
                    {performanceData[2] && (
                        <div className="rounded-lg border shadow-sm bg-gradient-to-br from-orange-50 to-amber-100/80 border-amber-300/60 p-2.5 flex items-center gap-3 relative overflow-hidden transition-all hover:shadow-md">
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-600 rounded-full opacity-10 blur-xl"></div>
                            <div className="text-3xl drop-shadow-md flex-shrink-0">🥉</div>
                            <div className="flex-1 text-left min-w-0">
                                <div className="font-extrabold text-[10px] text-amber-800 uppercase tracking-wider opacity-90">Bronze Performer</div>
                                <div className="font-bold text-sm text-gray-800 leading-tight truncate">{performanceData[2].ccName}</div>
                                <div className="text-[10px] text-gray-600 font-medium truncate">{performanceData[2].district}</div>
                            </div>
                            <div className="bg-white/80 px-2.5 py-1 rounded-md font-extrabold text-xs text-amber-800 shadow-sm border border-amber-200 whitespace-nowrap">
                                {performanceData[2].performanceScore}%
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="max-h-[68vh] overflow-auto bg-white/90 rounded-xl shadow-inner border border-gray-200">
                <table className="w-full text-left text-xs">
                    <thead className="bg-gradient-to-r from-teal-800 to-teal-700 text-white sticky top-0 z-30 shadow-md">
                        <tr>
                            <th className="p-3 border-r border-teal-600/30 align-top sticky top-0 left-0 z-40 bg-teal-800 w-[60px] min-w-[60px] max-w-[60px]">Slno</th>
                            <th className="p-3 border-r border-teal-600/30 align-top sticky top-0 left-[60px] z-40 bg-teal-800 w-[120px] min-w-[120px] max-w-[120px]">School_DISTRICT</th>
                            <th className="p-3 border-r border-teal-600/30 align-top sticky top-0 left-[180px] z-40 bg-teal-800 w-[200px] min-w-[200px] max-w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">CC/DEF Name</th>
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
                                        <div className="mt-1.5 pt-1.5 border-t border-white/5 text-[9px] text-gray-400">
                                            <strong>Example:</strong> 5 CPUs used for 150 hours total over 30 working days = 1.00 hr/working day/school.
                                        </div>
                                    </div>
                                </div>
                            </th>
                            <th className="p-3 border-r border-teal-600/30 text-center align-top bg-emerald-900/40 min-w-[115px]">
                                <div className="custom-tooltip-trigger flex items-center justify-center gap-1">
                                    <span>Avg Hrs/Day/Sch/Mini PC / Thin Client</span>
                                    <span className="text-emerald-300">ⓘ</span>
                                    <div className="custom-tooltip-box text-white font-normal">
                                        <strong className="text-emerald-300 font-bold block mb-1">Avg Hours/Day/School for Mini PC / Thin Client</strong>
                                        <div className="border-t border-white/10 pt-1.5 mt-1">
                                            <span className="font-mono text-teal-400 text-[10px] block">FORMULA:</span>
                                            <span className="font-mono bg-black/40 px-1 py-0.5 rounded text-[10px] block my-1">Total Mini PC / Thin Client Hours / (Working Days × Mini PC / Thin Clients Installed)</span>
                                        </div>
                                        <p className="text-[10px] text-gray-300 mt-1.5">
                                            Shows the average daily usage hours for each active Mini PC / Thin Client device within the selected period.
                                        </p>
                                        <div className="mt-1.5 pt-1.5 border-t border-white/5 text-[9px] text-gray-400">
                                            <strong>Example:</strong> 10 Mini PC / Thin Clients used for 300 hours total over 30 working days = 1.00 hr/working day/school.
                                        </div>
                                    </div>
                                </div>
                            </th>
                            <th className="p-3 border-r border-teal-600/30 text-center align-top bg-emerald-900/40 min-w-[110px]">
                                <div className="custom-tooltip-trigger flex items-center justify-center gap-1">
                                    <span>Avg Hrs/Day/Sch/Panel (IFP)</span>
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
                                        <div className="mt-1.5 pt-1.5 border-t border-white/5 text-[9px] text-gray-400">
                                            <strong>Example:</strong> 5 Panels used for 150 hours total over 30 working days = 1.00 hr/working day/school.
                                        </div>
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
                                        <p className="text-[10px] text-gray-300 mt-1.5">
                                            Shows the average number of computer classes conducted per school per day during the selected period.
                                        </p>
                                        <div className="mt-1.5 pt-1.5 border-t border-white/5 text-[9px] text-gray-400">
                                            <strong>Example:</strong> 10 schools conducting 300 classes over 30 working days = 1.00 class/school/working day.
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
                                        <p className="text-[10px] text-gray-300 mt-1.5">
                                            Shows the average number of smart board/TV classes conducted per school per day during the selected period.
                                        </p>
                                        <div className="mt-1.5 pt-1.5 border-t border-white/5 text-[9px] text-gray-400">
                                            <strong>Example:</strong> 10 schools conducting 150 smart classes over 30 working days = 0.50 class/school/working day.
                                        </div>
                                    </div>
                                </div>
                            </th>
                            <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[80px]">Total ICT Visit</th>
                            <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[80px]">Total Smart Visit</th>
                            <th className="p-3 border-r border-teal-600/30 text-center align-top min-w-[90px]">GrandTotal</th>
                            <th className="p-3 text-center align-top bg-gradient-to-b from-indigo-700 to-indigo-800 text-white min-w-[120px] shadow-md border-l border-indigo-600">
                                <div className="custom-tooltip-trigger flex items-center justify-center gap-1">
                                    <span>Performance Score</span>
                                    <span className="text-indigo-300">ⓘ</span>
                                    <div className="custom-tooltip-box text-white font-normal" style={{ width: '280px', transform: 'translateX(-85%)' }}>
                                        <strong className="text-indigo-300 font-bold block mb-1">Performance Score (Max 100%)</strong>
                                        <div className="border-t border-white/10 pt-1.5 mt-1 text-[9px] space-y-1">
                                            <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-gray-300">1. Infrastructure Util</span><span className="font-bold text-teal-400">25%</span></div>
                                            <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-gray-300">2. Usage Efficiency</span><span className="font-bold text-teal-400">20%</span></div>
                                            <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-gray-300">3. Academic Delivery (ICT)</span><span className="font-bold text-teal-400">20%</span></div>
                                            <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-gray-300">4. Smart Class Delivery</span><span className="font-bold text-teal-400">10%</span></div>
                                            <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-gray-300">5. Monitoring Visits</span><span className="font-bold text-teal-400">15%</span></div>
                                            <div className="flex justify-between pb-1"><span className="text-gray-300">6. Instructor Availability</span><span className="font-bold text-teal-400">10%</span></div>
                                        </div>
                                        <p className="text-[9px] text-gray-400 mt-2 leading-tight">
                                            Weighted benchmark score calculating resource utilization, class efficiency, monitoring coverage, and teacher availability.
                                        </p>
                                    </div>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700 whitespace-nowrap">
                        {performanceData.map((row, i) => (
                             <tr 
                                 key={i} 
                                 className="hover:bg-teal-50/50 transition-all group"
                             >
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('all'); }}
                                    className="p-3 border-r border-gray-100 text-center font-medium sticky left-0 z-20 bg-white group-hover:bg-teal-50/80 w-[60px] min-w-[60px] max-w-[60px] overflow-hidden text-ellipsis cursor-pointer hover:text-teal-900 transition-all"
                                    title="Click to view all allotted schools"
                                >
                                    {row.slno}
                                </td>
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('all'); }}
                                    className="p-3 border-r border-gray-100 sticky left-[60px] z-20 bg-white group-hover:bg-teal-50/80 w-[120px] min-w-[120px] max-w-[120px] overflow-hidden text-ellipsis cursor-pointer hover:text-teal-900 transition-all"
                                    title="Click to view all allotted schools"
                                >
                                    {row.district}
                                </td>
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('all'); }}
                                    className="p-0 border-r border-gray-100 font-bold text-teal-800 sticky left-[180px] z-20 bg-white group-hover:bg-teal-50/80 w-[200px] min-w-[200px] max-w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] cursor-pointer hover:text-teal-955 transition-all"
                                    title="Click to view all allotted schools"
                                >
                                    <div className="p-3 flex items-center gap-1.5 w-full h-full overflow-hidden whitespace-nowrap">
                                        {row.slno === 1 && <span className="px-1 py-0.5 rounded text-[9px] bg-yellow-500 text-white shadow-sm flex-shrink-0 leading-none">#1</span>}
                                        {row.slno === 2 && <span className="px-1 py-0.5 rounded text-[9px] bg-gray-400 text-white shadow-sm flex-shrink-0 leading-none">#2</span>}
                                        {row.slno === 3 && <span className="px-1 py-0.5 rounded text-[9px] bg-amber-600 text-white shadow-sm flex-shrink-0 leading-none">#3</span>}
                                        <span className="truncate block w-full">{row.ccName}</span>
                                    </div>
                                </td>
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('all'); }}
                                    className="p-3 border-r border-gray-100 text-center font-bold text-teal-700 hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 transition-all"
                                    title={`Click to view all ${row.totalSchools} allotted schools`}
                                >
                                    {row.totalSchools}
                                </td>
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('working_instructors'); }}
                                    className="p-3 border-r border-gray-100 text-center font-bold text-teal-700 hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 transition-all"
                                    title={`Click to view the ${row.instructorWorking} schools with Active Instructors`}
                                >
                                    {row.instructorWorking}
                                </td>
                                
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('cpu_installed'); }}
                                    className="p-3 border-r border-gray-100 text-center bg-blue-50/30 font-bold text-teal-700 hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 transition-all"
                                    title={`Click to view schools with CPU devices installed (Total: ${row.cpuInstalled})`}
                                >
                                    {row.cpuInstalled}
                                </td>
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('edustat_not_installed'); }}
                                    className={`p-3 border-r border-gray-100 text-center bg-red-50/20 font-bold text-teal-700 hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 transition-all ${row.edustatNotInstalled > 0 ? 'text-red-600' : 'text-gray-400'}`}
                                    title={`Click to view the ${row.edustatNotInstalled} schools where devices are Not Installed`}
                                >
                                    {row.edustatNotInstalled}
                                </td>
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('cpu_used'); }}
                                    className="p-3 border-r border-gray-100 text-center bg-blue-50/30 font-bold text-teal-700 hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 transition-all"
                                    title={`Click to view schools with active CPU usage (Total used: ${row.cpuUsed})`}
                                >
                                    {row.cpuUsed}
                                </td>
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('cpu_not_used'); }}
                                    className={`p-3 border-r border-gray-100 text-center bg-blue-50/30 font-bold text-teal-700 hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 transition-all ${row.cpuNotUsed > 0 ? 'text-red-500' : 'text-gray-400'}`}
                                    title={`Click to view the ${row.cpuNotUsed} schools where CPU devices were Not Used`}
                                >
                                    {row.cpuNotUsed}
                                </td>
                                
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('mini_installed'); }}
                                    className="p-3 border-r border-gray-100 text-center bg-purple-50/30 font-bold text-teal-700 hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 transition-all"
                                    title={`Click to view schools with Mini PC / Thin Client installed (Total: ${row.miniPcInstalled})`}
                                >
                                    {row.miniPcInstalled}
                                </td>
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('mini_used'); }}
                                    className="p-3 border-r border-gray-100 text-center bg-purple-50/30 font-bold text-teal-700 hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 transition-all"
                                    title={`Click to view schools with active Mini PC usage (Total used: ${row.miniPcUsed})`}
                                >
                                    {row.miniPcUsed}
                                </td>
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('mini_not_used'); }}
                                    className={`p-3 border-r border-gray-100 text-center bg-purple-50/30 font-bold text-teal-700 hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 transition-all ${row.miniPcNotUsed > 0 ? 'text-red-500' : 'text-gray-400'}`}
                                    title={`Click to view the ${row.miniPcNotUsed} schools where Mini PC devices were Not Used`}
                                >
                                    {row.miniPcNotUsed}
                                </td>
                                
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('panel_installed'); }}
                                    className="p-3 border-r border-gray-100 text-center bg-indigo-50/30 font-bold text-teal-700 hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 transition-all"
                                    title={`Click to view schools with Panel (IFP) installed (Total: ${row.panelInstalled})`}
                                >
                                    {row.panelInstalled}
                                </td>
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('panel_used'); }}
                                    className="p-3 border-r border-gray-100 text-center bg-indigo-50/30 font-bold text-teal-700 hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 transition-all"
                                    title={`Click to view schools with active Panel (IFP) usage (Total used: ${row.panelUsed})`}
                                >
                                    {row.panelUsed}
                                </td>
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('panel_not_used'); }}
                                    className={`p-3 border-r border-gray-100 text-center bg-indigo-50/30 font-bold text-teal-700 hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 transition-all ${row.panelNotUsed > 0 ? 'text-red-500' : 'text-gray-400'}`}
                                    title={`Click to view the ${row.panelNotUsed} schools where Panel (IFP) was Not Used`}
                                >
                                    {row.panelNotUsed}
                                </td>
                                
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('cpu_hours_logs'); }}
                                    className="p-3 border-r border-gray-100 text-center bg-orange-50/30 font-bold text-teal-700 hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 transition-all"
                                    title={`Click to view CPU daily logs list (Total: ${row.totalCpuHours} hrs)`}
                                >
                                    {row.totalCpuHours}
                                </td>
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('mini_hours_logs'); }}
                                    className="p-3 border-r border-gray-100 text-center bg-orange-50/30 font-bold text-teal-700 hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 transition-all"
                                    title={`Click to view Mini PC / Thin Client daily logs list (Total: ${row.totalMiniPcHours} hrs)`}
                                >
                                    {row.totalMiniPcHours}
                                </td>
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('panel_hours_logs'); }}
                                    className="p-3 border-r border-gray-100 text-center bg-orange-50/30 font-bold text-teal-700 hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 transition-all"
                                    title={`Click to view Panel (IFP) daily logs list (Total: ${row.totalPanelHours} hrs)`}
                                >
                                    {row.totalPanelHours}
                                </td>
                                
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('cpu_hours_logs'); }}
                                    className="p-3 border-r border-gray-100 text-center bg-emerald-50/30 text-emerald-700 font-bold hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 transition-all"
                                    title={`Click to view CPU daily logs details (Avg: ${row.avgCpu})`}
                                >
                                    {row.avgCpu}
                                </td>
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('mini_hours_logs'); }}
                                    className="p-3 border-r border-gray-100 text-center bg-emerald-50/30 text-emerald-700 font-bold hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 transition-all"
                                    title={`Click to view Mini PC daily logs details (Avg: ${row.avgMini})`}
                                >
                                    {row.avgMini}
                                </td>
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('panel_hours_logs'); }}
                                    className="p-3 border-r border-gray-100 text-center bg-emerald-50/30 text-emerald-700 font-bold hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 transition-all"
                                    title={`Click to view Panel (IFP) daily logs details (Avg: ${row.avgPanel})`}
                                >
                                    {row.avgPanel}
                                </td>
                                
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('ict_classes'); }}
                                    className="p-3 border-r border-gray-100 text-center bg-pink-50/30 text-pink-700 font-bold hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 transition-all"
                                    title={`Click to view ICT classes conducted (Total: ${row.ictClasses})`}
                                >
                                    {row.ictClasses}
                                </td>
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('ict_classes'); }}
                                    className="p-3 border-r border-gray-100 text-center bg-pink-50/30 font-bold text-teal-700 hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 transition-all"
                                    title={`Click to view ICT daily class averages (Avg: ${row.avgClasses})`}
                                >
                                    {row.avgClasses}
                                </td>
                                
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('smart_classes'); }}
                                    className="p-3 border-r border-gray-100 text-center bg-yellow-50/30 text-yellow-700 font-bold hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 transition-all"
                                    title={`Click to view Smart board classes conducted (Total: ${row.smartClasses})`}
                                >
                                    {row.smartClasses}
                                </td>
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('smart_classes'); }}
                                    className="p-3 border-r border-gray-100 text-center bg-yellow-50/30 font-bold text-teal-700 hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 transition-all"
                                    title={`Click to view Smart board class averages (Avg: ${row.avgSmartClasses})`}
                                >
                                    {row.avgSmartClasses}
                                </td>
                                
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('ict_visits'); }}
                                    className="p-3 border-r border-gray-100 text-center font-bold text-teal-700 hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 transition-all"
                                    title={`Click to view ICT visits conducted (Total: ${row.totalIctVisits})`}
                                >
                                    {row.totalIctVisits}
                                </td>
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('smart_visits'); }}
                                    className="p-3 border-r border-gray-100 text-center font-bold text-teal-700 hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-900 transition-all"
                                    title={`Click to view Smart class visits conducted (Total: ${row.totalSmartVisits})`}
                                >
                                    {row.totalSmartVisits}
                                </td>
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('all_visits'); }}
                                    className="p-3 border-r border-gray-100 text-center font-extrabold text-teal-800 bg-teal-50/50 hover:bg-teal-100/50 cursor-pointer underline decoration-teal-400/30 hover:text-teal-955 transition-all"
                                    title={`Click to view JHPMS visits list (Total: ${row.grandTotal})`}
                                >
                                    {row.grandTotal}
                                </td>
                                <td 
                                    onClick={() => { setActiveCCDetail(row); setDrilldownFilter('all'); }}
                                    className="p-3 text-center font-extrabold text-indigo-700 bg-indigo-50 border-l border-indigo-100 text-sm shadow-[inset_1px_0_0_rgba(0,0,0,0.05)] cursor-pointer hover:bg-teal-100/50 hover:text-indigo-950 transition-all"
                                    title={`Click to view full allotted school performance sheet (Score: ${row.performanceScore}%)`}
                                >
                                    {row.performanceScore}%
                                </td>
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

            {/* Detailed School Breakdown Modal Overlay */}
            {activeCCDetail && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in no-print">
                    <div className="bg-white dark:bg-slate-900 border border-teal-100 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-gray-150 dark:border-white/5 flex items-center justify-between bg-gradient-to-r from-teal-50 to-teal-50/20 dark:from-teal-950/20 dark:to-transparent">
                            <div className="text-left">
                                <h3 className="font-extrabold text-teal-800 dark:text-teal-400 text-base leading-tight">
                                    {drilldownFilter === 'all' && "Allotted Schools Performance Breakdown"}
                                    {drilldownFilter === 'working_instructors' && "Allotted Schools with Active Instructors"}
                                    {drilldownFilter === 'cpu_installed' && "Schools with CPU Devices Installed"}
                                    {drilldownFilter === 'edustat_not_installed' && "Schools with Devices Not Installed (EduStat Master)"}
                                    {drilldownFilter === 'cpu_used' && "Schools with Active CPU Devices"}
                                    {drilldownFilter === 'cpu_not_used' && "Schools with CPU Devices Installed but Not Used"}
                                    {drilldownFilter === 'mini_installed' && "Schools with Mini PC / Thin Client Installed"}
                                    {drilldownFilter === 'mini_used' && "Schools with Active Mini PC / Thin Client Devices"}
                                    {drilldownFilter === 'mini_not_used' && "Schools with Mini PC / Thin Client Installed but Not Used"}
                                    {drilldownFilter === 'cpu_hours_logs' && "CPU Daily Run Hours Detail (Active Logs)"}
                                    {drilldownFilter === 'mini_hours_logs' && "Mini PC / Thin Client Daily Run Hours Detail (Active Logs)"}
                                    {drilldownFilter === 'ict_classes' && "JHPMS Computer Classes Logging Details"}
                                    {drilldownFilter === 'smart_classes' && "JHPMS Smart Board Classes Logging Details"}
                                    {drilldownFilter === 'ict_visits' && "Field ICT Visits Logging Details"}
                                    {drilldownFilter === 'smart_visits' && "Field Smart Board Visits Logging Details"}
                                    {drilldownFilter === 'all_visits' && "Field Team All Visits Logging Details"}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                                    Coordinator: <span className="font-bold text-gray-800 dark:text-gray-200">{activeCCDetail.ccName}</span> ({activeCCDetail.district})
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Export to Excel Button */}
                                {(!userPermissions || userPermissions.menu?.['excel-export-team-performance']?.show !== false) && (
                                    <button
                                        onClick={handleExportDetails}
                                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
                                        title="Export detailed breakdown to Excel"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        <span>Export Schools</span>
                                    </button>
                                )}
                                {/* Close Button */}
                                <button
                                    onClick={() => setActiveCCDetail(null)}
                                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors cursor-pointer"
                                    title="Close dialog"
                                >
                                    <Icons.Close className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body / Scrollable Table */}
                        <div className="overflow-auto flex-1 p-4 bg-slate-50/50 dark:bg-slate-900/30">
                            <div className="border border-gray-200 dark:border-white/5 rounded-xl shadow-inner overflow-hidden bg-white dark:bg-slate-950">
                                <table className="w-full text-left text-xs whitespace-nowrap">
                                    <thead className="bg-teal-800 dark:bg-teal-905 text-white sticky top-0 z-30 font-bold">
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
                                        {drilldownViewType === 'devices' && activeCCDetailSchools.map((m, sIdx) => (
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
                                        {drilldownViewType === 'instructors' && activeCCDetailSchools.map((ins, sIdx) => (
                                            <tr key={sIdx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors divide-x divide-gray-100 dark:divide-white/5">
                                                <td className="p-2.5 text-center font-medium text-gray-500 dark:text-gray-400">{ins.slno}</td>
                                                <td className="p-2.5 text-center font-mono text-xs">{ins.udise}</td>
                                                <td className="p-2.5 font-bold text-gray-800 dark:text-gray-200 max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap">{ins.schoolName}</td>
                                                <td className="p-2.5 text-center">{ins.block}</td>
                                                <td className="p-2.5 text-left pl-4 font-semibold text-slate-800 dark:text-slate-200">{ins.instructorName}</td>
                                                <td className="p-2.5 text-center">
                                                    {ins.instructorStatus === 'Active' && <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 shadow-sm leading-none">Active / Working</span>}
                                                    {ins.instructorStatus === 'Pending' && <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm leading-none">Pending</span>}
                                                    {ins.instructorStatus === 'Vacant' && <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-sm leading-none">Vacant</span>}
                                                </td>
                                            </tr>
                                        ))}
                                        {drilldownViewType === 'usage_logs' && activeCCDetailSchools.map((log, sIdx) => (
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
                                        {drilldownViewType === 'classes' && activeCCDetailSchools.map((rowClass, sIdx) => (
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
                                        {drilldownViewType === 'visits' && activeCCDetailSchools.map((v, sIdx) => (
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
                                        {drilldownViewType === 'schools' && activeCCDetailSchools.map((sch, sIdx) => (
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
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-3.5 border-t border-gray-150 dark:border-white/5 bg-gray-50 dark:bg-slate-900/60 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                            <span>Showing {activeCCDetailSchools.length} {drilldownViewType === 'usage_logs' ? 'daily active log records' : drilldownViewType === 'classes' ? 'JHPMS class records' : drilldownViewType === 'devices' ? 'individual master device units' : 'allotted schools'} for {activeCCDetail.ccName}</span>
                            <button
                                onClick={() => setActiveCCDetail(null)}
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

export default React.memo(FieldTeamPerformance);
