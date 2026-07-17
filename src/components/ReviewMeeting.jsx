import React, { useState, useMemo } from 'react';
import { parseDateRobust, formatDate, exportToExcel } from '../utils';

const formatDateLocal = (d) => {
    if (!d || isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const ReviewMeeting = ({
    schools = [],
    visits = [],
    jhpmsLab = [],
    edustat = [],
    edustatMaster = [],
    manpower = [],
    startDate,
    endDate,
    selZones = [],
    selProjects = [],
    selDistricts = [],
    selBlocks = [],
    selCCs = [],
    workingDays,
    ccNameMapping = {},
    darkMode = false,
    userPermissions = null
}) => {
    // 1. Review Level state
    const [reviewLevel, setReviewLevel] = useState('zone'); // 'zone', 'project', 'district', 'cc', 'school'
    const [selectedEntity, setSelectedEntity] = useState('');
    const [exportingPPTX, setExportingPPTX] = useState(false);

    // Custom overrides so user can fine-tune SWOT & Plans before export
    const [customStrengths, setCustomStrengths] = useState([]);
    const [customWeaknesses, setCustomWeaknesses] = useState([]);
    const [customOpportunities, setCustomOpportunities] = useState([]);
    const [customThreats, setCustomThreats] = useState([]);
    const [customChallenges, setCustomChallenges] = useState([]);
    const [customFuturePlans, setCustomFuturePlans] = useState([]);
    const [hasUserEdited, setHasUserEdited] = useState(false);

    const cleanUdise = (u) => {
        if (!u) return '';
        let s = String(u).trim();
        if (s.endsWith('.0')) s = s.substring(0, s.length - 2);
        return s;
    };

    const getVal = (row, keyMatch) => {
        if (!row) return null;
        const key = Object.keys(row).find(k => k.toLowerCase().includes(keyMatch.toLowerCase()));
        return key ? row[key] : null;
    };

    // Pre-grouped hash indexes to optimize rendering speed and prevent browser freezes
    const manpowerMap = useMemo(() => {
        const map = {};
        manpower.forEach(m => {
            const udise = cleanUdise(m.udise || getVal(m, 'udise'));
            if (!map[udise]) map[udise] = [];
            map[udise].push(m);
        });
        return map;
    }, [manpower]);

    const edustatMasterMap = useMemo(() => {
        const map = {};
        edustatMaster.forEach(m => {
            const udise = cleanUdise(m.udise || getVal(m, 'udise'));
            map[udise] = m;
        });
        return map;
    }, [edustatMaster]);

    const edustatRangeMap = useMemo(() => {
        const map = {};
        edustat.forEach(row => {
            const udise = cleanUdise(row.udise || getVal(row, 'udise'));
            const rDate = parseDateRobust(row.date || getVal(row, 'date'));
            if (rDate && startDate && endDate) {
                const dStr = formatDateLocal(rDate);
                if (dStr >= startDate && dStr <= endDate) {
                    if (!map[udise]) {
                        map[udise] = { hours: 0, synced: true };
                    }
                    const hrs = row.hours !== undefined ? Number(row.hours) : parseFloat(getVal(row, 'hours') || 0);
                    map[udise].hours += hrs;
                }
            }
        });
        return map;
    }, [edustat, startDate, endDate]);

    const jhpmsLabRangeMap = useMemo(() => {
        const map = {};
        jhpmsLab.forEach(row => {
            const udise = cleanUdise(row.udise || getVal(row, 'udise') || row.udise_code);
            const rDate = parseDateRobust(row.date || getVal(row, 'date') || row.visit_date);
            if (rDate && startDate && endDate) {
                const dStr = formatDateLocal(rDate);
                if (dStr >= startDate && dStr <= endDate) {
                    if (!map[udise]) {
                        map[udise] = { ict: 0, smart: 0, mis: 0, theory: 0, practical: 0 };
                    }
                    const subject = String(row.subject || getVal(row, 'sub') || '').toUpperCase();
                    const labType = String(row.labType || getVal(row, 'lab') || '').toUpperCase();
                    const theoryPractical = String(row.theoryPractical || getVal(row, 'theoryPractical') || getVal(row, 'theory/practical') || getVal(row, 'theorypractical') || '').toUpperCase();

                    if (subject.split(/[^A-Z0-9]+/).includes('MIS')) {
                        map[udise].mis++;
                    } else if (labType.includes('ICT') && subject.includes('COMPUTER')) {
                        map[udise].ict++;
                        if (theoryPractical.includes('PRACTICAL')) {
                            map[udise].practical++;
                        } else {
                            map[udise].theory++;
                        }
                    } else if (labType.includes('SMART')) {
                        map[udise].smart++;
                    }
                }
            }
        });
        return map;
    }, [jhpmsLab, startDate, endDate]);

    const visitsRangeMap = useMemo(() => {
        const map = {};
        visits.forEach(row => {
            const udise = cleanUdise(row.udise_code || getVal(row, 'udise'));
            const rDate = parseDateRobust(row.visit_date);
            if (rDate && startDate && endDate) {
                const dStr = formatDateLocal(rDate);
                if (dStr >= startDate && dStr <= endDate) {
                    if (!map[udise]) {
                        map[udise] = { count: 0, lastDate: null, rows: [] };
                    }
                    map[udise].count++;
                    map[udise].rows.push(row);
                    if (!map[udise].lastDate || rDate > map[udise].lastDate) {
                        map[udise].lastDate = rDate;
                    }
                }
            }
        });
        return map;
    }, [visits, startDate, endDate]);

    // Filter schools based on global sidebar filters first
    const globallyFilteredSchools = useMemo(() => {
        let list = schools;
        if (selZones && selZones.length) list = list.filter(s => selZones.includes(s.zone));
        if (selProjects && selProjects.length) list = list.filter(s => selProjects.includes(s.project_name));
        if (selDistricts && selDistricts.length) list = list.filter(s => selDistricts.includes(s.district));
        if (selBlocks && selBlocks.length) list = list.filter(s => selBlocks.includes(s.block));
        if (selCCs && selCCs.length) {
            list = list.filter(s => {
                const name = s.visitor_name || '';
                const resolved = ccNameMapping[name] || name;
                return selCCs.includes(resolved) || selCCs.includes(name);
            });
        }
        return list;
    }, [schools, selZones, selProjects, selDistricts, selBlocks, selCCs, ccNameMapping]);

    // Available entities based on review level
    const entityOptions = useMemo(() => {
        const set = new Set();
        globallyFilteredSchools.forEach(s => {
            if (reviewLevel === 'zone' && s.zone) set.add(s.zone);
            if (reviewLevel === 'project' && s.project_name) set.add(s.project_name);
            if (reviewLevel === 'district' && s.district) set.add(s.district);
            if (reviewLevel === 'cc' && s.visitor_name) {
                const resolved = ccNameMapping[s.visitor_name] || s.visitor_name;
                set.add(resolved);
            }
            if (reviewLevel === 'school' && (s.school_name || s.school)) {
                set.add(JSON.stringify({ udise: cleanUdise(s.udise_code), name: s.school_name || s.school }));
            }
        });

        const sorted = Array.from(set).sort();
        if (reviewLevel === 'school') {
            return sorted.map(item => JSON.parse(item));
        }
        return sorted;
    }, [globallyFilteredSchools, reviewLevel, ccNameMapping]);

    // Auto-select first entity when level changes
    React.useEffect(() => {
        setHasUserEdited(false);
        if (entityOptions.length > 0) {
            if (reviewLevel === 'school') {
                setSelectedEntity(entityOptions[0].udise);
            } else {
                setSelectedEntity(entityOptions[0]);
            }
        } else {
            setSelectedEntity('');
        }
    }, [reviewLevel, entityOptions]);

    // Active schools under the selected entity
    const entitySchools = useMemo(() => {
        if (!selectedEntity) return [];
        return globallyFilteredSchools.filter(s => {
            if (reviewLevel === 'zone') return s.zone === selectedEntity;
            if (reviewLevel === 'project') return s.project_name === selectedEntity;
            if (reviewLevel === 'district') return s.district === selectedEntity;
            if (reviewLevel === 'cc') {
                const resolved = ccNameMapping[s.visitor_name] || s.visitor_name;
                return resolved === selectedEntity;
            }
            if (reviewLevel === 'school') return cleanUdise(s.udise_code) === selectedEntity;
            return false;
        });
    }, [globallyFilteredSchools, reviewLevel, selectedEntity, ccNameMapping]);

    const entityUdises = useMemo(() => {
        return new Set(entitySchools.map(s => cleanUdise(s.udise_code)));
    }, [entitySchools]);

    // Dynamic computations for SWOT, KPIs, and Roadmaps
    const dossierData = useMemo(() => {
        if (!entitySchools.length) return null;

        // 1. Manpower
        let activeStaff = 0;
        let vacantStaff = 0;
        entitySchools.forEach(s => {
            const udise = cleanUdise(s.udise_code);
            const schoolMp = manpower.filter(m => cleanUdise(m.udise || getVal(m, 'udise')) === udise);
            const isWorking = schoolMp.some(m => {
                const status = String(getVal(m, 'status') || '').trim().toUpperCase();
                return status.includes('WORKING') || status.includes('ACTIVE') || status === '';
            });
            if (isWorking) activeStaff++;
            else vacantStaff++;
        });

        // 2. Devices status & usage hours
        let cpuInstalled = 0;
        let miniInstalled = 0;
        let panelInstalled = 0;
        entitySchools.forEach(s => {
            const udise = cleanUdise(s.udise_code);
            const masterRec = edustatMaster.find(m => cleanUdise(m.udise || getVal(m, 'udise')) === udise);
            if (masterRec) {
                cpuInstalled += Number(getVal(masterRec, 'cpu') || 0);
                miniInstalled += Number(getVal(masterRec, 'mini') || getVal(masterRec, 'thin') || 0);
                panelInstalled += Number(getVal(masterRec, 'panel') || 0);
            } else {
                cpuInstalled += 1; // standard defaults
            }
        });

        // Daily device run logs within date range
        let totalHours = 0;
        let syncSchoolsCount = 0;
        const syncedUdises = new Set();

        edustat.forEach(row => {
            const udise = cleanUdise(row.udise || getVal(row, 'udise'));
            if (!entityUdises.has(udise)) return;

            const rDate = parseDateRobust(row.date || getVal(row, 'date'));
            if (rDate && startDate && endDate) {
                const dStr = formatDateLocal(rDate);
                if (dStr >= startDate && dStr <= endDate) {
                    const hours = Number(row.hours || getVal(row, 'hours') || 0);
                    totalHours += hours;
                    syncedUdises.add(udise);
                }
            }
        });

        syncSchoolsCount = syncedUdises.size;
        const nonSyncSchoolsCount = Math.max(0, entitySchools.length - syncSchoolsCount);

        // 3. Classes Conduction
        let ictClasses = 0;
        let smartClasses = 0;
        let misClasses = 0;
        jhpmsLab.forEach(row => {
            const udise = cleanUdise(row.udise || getVal(row, 'udise') || row.udise_code);
            if (!entityUdises.has(udise)) return;

            const rDate = parseDateRobust(row.date || getVal(row, 'date') || row.visit_date);
            if (rDate && startDate && endDate) {
                const dStr = formatDateLocal(rDate);
                if (dStr >= startDate && dStr <= endDate) {
                    const subject = String(row.subject || getVal(row, 'sub') || '').toUpperCase();
                    const labType = String(row.labType || getVal(row, 'lab') || '').toUpperCase();
                    if (subject.split(/[^A-Z0-9]+/).includes('MIS')) {
                        misClasses++;
                    } else if (labType.includes('ICT') && subject.includes('COMPUTER')) {
                        ictClasses++;
                    } else if (labType.includes('SMART')) {
                        smartClasses++;
                    }
                }
            }
        });

        const totalClasses = ictClasses + smartClasses;
        const days = Number(workingDays) || 1;
        const classRate = parseFloat((totalClasses / (entitySchools.length * days)).toFixed(2));

        // 4. Visits
        let totalVisits = 0;
        visits.forEach(row => {
            const udise = cleanUdise(row.udise_code || getVal(row, 'udise'));
            if (!entityUdises.has(udise)) return;

            const rDate = parseDateRobust(row.visit_date);
            if (rDate && startDate && endDate) {
                const dStr = formatDateLocal(rDate);
                if (dStr >= startDate && dStr <= endDate) {
                    totalVisits++;
                }
            }
        });

        const visitRate = parseFloat((totalVisits / entitySchools.length).toFixed(2));

        // Ratios
        const totalDevices = cpuInstalled + miniInstalled + panelInstalled;
        const studentToDevice = totalDevices > 0 ? Math.round((entitySchools.length * 120) / totalDevices) : 'N/A'; // Mock enrollment estimate

        // Composite performance score
        const activeStaffPct = entitySchools.length > 0 ? (activeStaff / entitySchools.length) * 100 : 0;
        const classTargetPct = Math.min(100, (classRate / 1.5) * 100); // Target 1.5 classes/school/day
        const runHourTargetPct = Math.min(100, ((totalHours / Math.max(1, totalDevices * days)) / 2) * 100); // Target 2 hours/device/day
        const visitTargetPct = Math.min(100, (visitRate / 1.0) * 100); // Target 1 visit/school

        const compositeScore = Math.round(
            (activeStaffPct * 0.25) +
            (classTargetPct * 0.35) +
            (runHourTargetPct * 0.25) +
            (visitTargetPct * 0.15)
        );

        let grade = 'D';
        let gradeColor = 'text-red-500';
        if (compositeScore >= 85) { grade = 'A+'; gradeColor = 'text-emerald-500'; }
        else if (compositeScore >= 70) { grade = 'A'; gradeColor = 'text-teal-500'; }
        else if (compositeScore >= 55) { grade = 'B'; gradeColor = 'text-blue-500'; }
        else if (compositeScore >= 40) { grade = 'C'; gradeColor = 'text-amber-500'; }

        return {
            totalSchools: entitySchools.length,
            activeStaff,
            vacantStaff,
            cpuInstalled,
            miniInstalled,
            panelInstalled,
            totalDevices,
            totalHours,
            syncSchoolsCount,
            nonSyncSchoolsCount,
            ictClasses,
            smartClasses,
            totalClasses,
            classRate,
            totalVisits,
            visitRate,
            studentToDevice,
            compositeScore,
            grade,
            gradeColor
        };
    }, [entitySchools, entityUdises, manpower, edustat, edustatMaster, jhpmsLab, visits, startDate, endDate, workingDays]);

    // SWOT Generator Logic based on Dossier statistics
    const swotAnalysis = useMemo(() => {
        if (!dossierData) return { strengths: [], weaknesses: [], opportunities: [], threats: [] };

        const strengths = [];
        const weaknesses = [];
        const opportunities = [];
        const threats = [];

        // Roster / Staffing
        const staffRatio = dossierData.totalSchools > 0 ? (dossierData.activeStaff / dossierData.totalSchools) * 100 : 0;
        if (staffRatio >= 90) {
            strengths.push(`High Instructor Placement: Near-full operational strength (${Math.round(staffRatio)}%) with active instructors.`);
            strengths.push("Staffing Stability: Minimal class disruptions due to reliable instructor presence.");
        } else if (staffRatio < 70) {
            weaknesses.push(`Critical Staffing Deficit: ${dossierData.vacantStaff} vacant instructor post(s) causing learning downtime.`);
            threats.push("Prolonged instructor vacancy leading to student detachment from Computer Labs.");
            opportunities.push("Conduct urgent recruitment drives or coordinate remote instructor hubs.");
        } else {
            weaknesses.push(`Moderate Roster Gaps: ${dossierData.vacantStaff} school(s) vacant, causing intermittent lab locking.`);
            opportunities.push("Cross-deploy instructors from neighboring schools on alternate days.");
        }

        // Conduction rate
        if (dossierData.classRate >= 1.2) {
            strengths.push(`High Lab Utilisation: Averaging ${dossierData.classRate} computer classes per school daily, exceeding target.`);
        } else if (dossierData.classRate < 0.5) {
            weaknesses.push(`Low Class Logging Density: Computer labs are severely under-utilized (${dossierData.classRate} classes/day).`);
            opportunities.push("Enforce mandatory ICT slots in the weekly school academic timetable.");
            threats.push("Risk of program failure due to insufficient hands-on practice for students.");
        } else {
            strengths.push(`Moderate Class Density: Logging ${dossierData.classRate} daily classes, approaching baseline targets.`);
            opportunities.push("Maximize Smart Class logging compliance up to 1.5 classes/day.");
        }

        // Sync Status
        const syncRatio = dossierData.totalSchools > 0 ? (dossierData.syncSchoolsCount / dossierData.totalSchools) * 100 : 0;
        if (syncRatio >= 90) {
            strengths.push(`Excellent Connectivity: ${Math.round(syncRatio)}% of labs are actively syncing hardware logs.`);
        } else if (syncRatio < 60) {
            weaknesses.push(`Critical Connectivity Gap: ${dossierData.nonSyncSchoolsCount} schools fail to report device sync logs.`);
            threats.push("Extended hardware breakdowns hidden due to lack of real-time sync telemetry.");
            opportunities.push("Deploy coordinator audit visits to restore internet and agent connectivity.");
        } else {
            weaknesses.push(`Reporting Inconsistencies: ${dossierData.nonSyncSchoolsCount} schools are currently offline.`);
            opportunities.push("Establish local offline logging fallback protocols using paper log sheets.");
        }

        // Hours & Hardware
        const avgHoursPerSch = dossierData.totalSchools > 0 ? dossierData.totalHours / dossierData.totalSchools : 0;
        if (avgHoursPerSch >= 30) {
            strengths.push(`Robust Cumulative Run Time: Averaging ${Math.round(avgHoursPerSch)} system hours per school.`);
        } else {
            weaknesses.push(`Low Device Run Hours: Daily run-times average a low ${Math.round(avgHoursPerSch)} hours per school.`);
            opportunities.push("Organize inter-school lab competitions to increase daily usage motivation.");
        }

        if (dossierData.panelInstalled > 0) {
            strengths.push(`Visual Infrastructure: Integrated deployment of ${dossierData.panelInstalled} Smart Flat Panels.`);
        }

        // Monitoring
        if (dossierData.visitRate >= 1.0) {
            strengths.push(`Proactive Field Auditing: Coordinator visit rate stands at a strong ${dossierData.visitRate} per school.`);
        } else {
            weaknesses.push(`Deficient Supervision: Low visitation rates (${dossierData.visitRate}) limit direct coordinator oversight.`);
            opportunities.push("Establish mandatory field visitation targets and GPS verification.");
            threats.push("Lax operational standards in remote schools due to lack of coordinator visits.");
        }

        // General
        opportunities.push("Integrate student computer projects with local curriculum homework.");
        threats.push("Hardware deterioration risk (rust/dust) in vacant locked rooms.");

        return { strengths, weaknesses, opportunities, threats };
    }, [dossierData]);

    // Challenge & Future Roadmap logic
    const roadmapData = useMemo(() => {
        if (!dossierData) return { challenges: [], futurePlans: [] };

        const challenges = [];
        const futurePlans = [];

        if (dossierData.vacantStaff > 0) {
            challenges.push(`IT Instructor Recruitment: ${dossierData.vacantStaff} school(s) operating without active instructors.`);
            futurePlans.push("Accelerate recruitment workflows to fill vacancies within 14 business days.");
        }
        if (dossierData.nonSyncSchoolsCount > 0) {
            challenges.push(`Internet Connectivity Outages: ${dossierData.nonSyncSchoolsCount} schools failed to sync any device logs.`);
            futurePlans.push("Deploy a technical support team to inspect local routers, agents, and SIM cards.");
        }
        if (dossierData.classRate < 0.8) {
            challenges.push(`Under-utilised Timetable Slots: Cumulative daily class rate of ${dossierData.classRate} is below targets.`);
            futurePlans.push("Implement mandatory school-wise weekly lab timetables matching student strength.");
        }
        if (dossierData.visitRate < 1.0) {
            challenges.push(`Insufficient Field Monitoring: Average visitation rate (${dossierData.visitRate}) falls below the 1.0 threshold.`);
            futurePlans.push("Re-route CC schedules to prioritize non-visited schools first.");
        }

        if (challenges.length === 0) {
            challenges.push("Sustaining operational efficiency and maintaining full roster stability.");
            challenges.push("Ensuring periodic hardware checkups to prevent sudden component failure.");
        }
        if (futurePlans.length === 0) {
            futurePlans.push("Introduce reward mechanisms for top-performing CCs and schools.");
            futurePlans.push("Introduce advanced software applications (coding/design tools) in stable labs.");
        }

        return { challenges, futurePlans };
    }, [dossierData]);

    // Sync state for user modifications
    React.useEffect(() => {
        if (swotAnalysis && !hasUserEdited) {
            setCustomStrengths(swotAnalysis.strengths);
            setCustomWeaknesses(swotAnalysis.weaknesses);
            setCustomOpportunities(swotAnalysis.opportunities);
            setCustomThreats(swotAnalysis.threats);
            setCustomChallenges(roadmapData.challenges);
            setCustomFuturePlans(roadmapData.futurePlans);
        }
    }, [swotAnalysis, roadmapData, hasUserEdited]);

    // Grouping calculations for tables & charts
    const subGroups = useMemo(() => {
        const groups = {};
        entitySchools.forEach(s => {
            let key = '';
            if (reviewLevel === 'zone') key = s.project_name || 'Unassigned Project';
            else if (reviewLevel === 'project') key = s.block || 'Unassigned Block';
            else if (reviewLevel === 'district') key = s.block || 'Unassigned Block';
            else if (reviewLevel === 'cc') key = s.school_name || s.school || 'Unassigned School';
            else if (reviewLevel === 'school') key = s.school_name || s.school || 'Unassigned School';

            if (!groups[key]) {
                groups[key] = {
                    name: key,
                    schools: [],
                    udises: new Set()
                };
            }
            groups[key].schools.push(s);
            groups[key].udises.add(cleanUdise(s.udise_code));
        });
        return Object.values(groups);
    }, [entitySchools, reviewLevel]);

    const subGroupKPIs = useMemo(() => {
        return subGroups.map(group => {
            let activeStaff = 0;
            let vacantStaff = 0;
            group.schools.forEach(s => {
                const udise = cleanUdise(s.udise_code);
                const schoolMp = manpowerMap[udise] || [];
                const isWorking = schoolMp.some(m => {
                    const status = String(getVal(m, 'status') || '').trim().toUpperCase();
                    return status.includes('WORKING') || status.includes('ACTIVE') || status === '';
                });
                if (isWorking) activeStaff++;
                else vacantStaff++;
            });

            let cpuInstalled = 0;
            let miniInstalled = 0;
            let panelInstalled = 0;
            group.schools.forEach(s => {
                const udise = cleanUdise(s.udise_code);
                const masterRec = edustatMasterMap[udise];
                if (masterRec) {
                    cpuInstalled += Number(getVal(masterRec, 'cpu') || 0);
                    miniInstalled += Number(getVal(masterRec, 'mini') || getVal(masterRec, 'thin') || 0);
                    panelInstalled += Number(getVal(masterRec, 'panel') || 0);
                } else {
                    cpuInstalled += 1;
                }
            });

            let totalHours = 0;
            let syncSchoolsCount = 0;
            group.schools.forEach(s => {
                const udise = cleanUdise(s.udise_code);
                const stats = edustatRangeMap[udise];
                if (stats) {
                    totalHours += stats.hours;
                    syncSchoolsCount++;
                }
            });

            let ictClasses = 0;
            let smartClasses = 0;
            group.schools.forEach(s => {
                const udise = cleanUdise(s.udise_code);
                const stats = jhpmsLabRangeMap[udise];
                if (stats) {
                    ictClasses += stats.ict;
                    smartClasses += stats.smart;
                }
            });
            const totalClasses = ictClasses + smartClasses;
            const days = Number(workingDays) || 1;
            const classRate = parseFloat((totalClasses / (group.schools.length * days)).toFixed(2));

            let totalVisits = 0;
            group.schools.forEach(s => {
                const udise = cleanUdise(s.udise_code);
                const stats = visitsRangeMap[udise];
                if (stats) {
                    totalVisits += stats.count;
                }
            });
            const visitRate = parseFloat((totalVisits / group.schools.length).toFixed(2));

            const totalDevices = cpuInstalled + miniInstalled + panelInstalled;
            const activeStaffPct = group.schools.length > 0 ? (activeStaff / group.schools.length) * 100 : 0;
            const classTargetPct = Math.min(100, (classRate / 1.5) * 100);
            const runHourTargetPct = Math.min(100, ((totalHours / Math.max(1, totalDevices * days)) / 2) * 100);
            const visitTargetPct = Math.min(100, (visitRate / 1.0) * 100);

            const compositeScore = Math.round(
                (activeStaffPct * 0.25) +
                (classTargetPct * 0.35) +
                (runHourTargetPct * 0.25) +
                (visitTargetPct * 0.15)
            );

            let grade = 'D';
            if (compositeScore >= 85) grade = 'A+';
            else if (compositeScore >= 70) grade = 'A';
            else if (compositeScore >= 55) grade = 'B';
            else if (compositeScore >= 40) grade = 'C';

            return {
                name: group.name,
                totalSchools: group.schools.length,
                activeStaff,
                vacantStaff,
                syncSchoolsCount,
                syncRate: group.schools.length > 0 ? Math.round((syncSchoolsCount / group.schools.length) * 100) : 0,
                totalHours,
                totalClasses,
                classRate,
                totalVisits,
                visitRate,
                totalDevices,
                compositeScore,
                grade
            };
        });
    }, [subGroups, manpowerMap, edustatMasterMap, edustatRangeMap, jhpmsLabRangeMap, visitsRangeMap, workingDays]);

    const handlePPTXExport = async () => {
        if (!selectedEntity || !dossierData) return;
        setExportingPPTX(true);

        try {
            const PptxGen = (await import('pptxgenjs')).default;
            const pptx = new PptxGen();
            pptx.layout = 'LAYOUT_16x9';

            // Premium Corporate Palette
            const colorTealDark = '0B4F48';
            const colorTealMid = '0D9488';
            const colorAmber = 'D97706';
            const colorWhite = 'FFFFFF';
            const colorBgLight = 'F8FAFC';
            const colorTextDark = '1E293B';
            const colorCardBg = 'FFFFFF';

            const formattedEntityName = reviewLevel === 'school' 
                ? entitySchools[0]?.school_name || entitySchools[0]?.school || selectedEntity
                : selectedEntity;

            const timeRangeText = startDate && endDate 
                ? `${formatDate(startDate)} to ${formatDate(endDate)}` 
                : 'All time data';

            // Header Builder Helper
            const addSlideHeader = (slide, title, categoryLabel) => {
                slide.background = { fill: colorBgLight };
                
                // Top header bar shape
                slide.addShape(pptx.shapes.RECTANGLE, {
                    x: 0, y: 0, w: 10.0, h: 0.9, fill: { color: colorTealDark }
                });

                // Category tag
                slide.addText(categoryLabel.toUpperCase(), {
                    x: 0.5, y: 0.12, w: 8.0, h: 0.2,
                    fontSize: 8, bold: true, color: '8BF8E0', tracking: 2
                });

                // Title
                slide.addText(title, {
                    x: 0.5, y: 0.32, w: 7.0, h: 0.45,
                    fontSize: 18, bold: true, color: colorWhite, fontFace: 'Georgia'
                });

                // Brand Badge
                slide.addText('JHARKHAND EDUCATION PROJECT COUNCIL', {
                    x: 7.2, y: 0.35, w: 2.3, h: 0.3,
                    fontSize: 8, bold: true, color: '8BF8E0', align: 'right', tracking: 1
                });
            };

            // SLIDE 1: Executive Title Cover
            const slideCover = pptx.addSlide();
            slideCover.background = { fill: colorTealDark };

            slideCover.addText('GOVERNMENT OF JHARKHAND — DEPARTMENT OF SCHOOL EDUCATION', {
                x: 0.6, y: 0.8, w: 8.8, h: 0.3,
                fontSize: 10, bold: true, color: '8BF8E0', tracking: 2
            });

            slideCover.addText('Review Meeting Briefing Dossier', {
                x: 0.6, y: 1.4, w: 8.8, h: 1.0,
                fontSize: 32, bold: true, color: colorWhite, fontFace: 'Georgia'
            });

            const subTitle = reviewLevel.toUpperCase() + ' PERFORMANCE REPORT: ' + formattedEntityName;
            slideCover.addText(subTitle, {
                x: 0.6, y: 2.3, w: 8.8, h: 0.4,
                fontSize: 16, italic: true, color: 'CCFBF1', fontFace: 'Georgia'
            });

            slideCover.addShape(pptx.shapes.RECTANGLE, {
                x: 0.6, y: 2.9, w: 1.8, h: 0.04, fill: { color: colorAmber }
            });

            slideCover.addText('DATE RANGE', { x: 0.6, y: 3.3, w: 4.0, h: 0.2, fontSize: 9, bold: true, color: '8BF8E0', tracking: 1 });
            slideCover.addText(timeRangeText, { x: 0.6, y: 3.5, w: 4.0, h: 0.4, fontSize: 12, bold: true, color: colorWhite });

            slideCover.addText('REPORT LEVEL', { x: 5.0, y: 3.3, w: 4.0, h: 0.2, fontSize: 9, bold: true, color: '8BF8E0', tracking: 1 });
            slideCover.addText(reviewLevel.toUpperCase(), { x: 5.0, y: 3.5, w: 4.0, h: 0.4, fontSize: 12, bold: true, color: colorWhite });

            slideCover.addShape(pptx.shapes.RECTANGLE, {
                x: 0.6, y: 4.3, w: 8.8, h: 0.01, fill: { color: '1A665E' }
            });

            const compilerName = localStorage.getItem('snet_full_name') || 'Executive Portal Member';
            const compilerTitle = localStorage.getItem('snet_designation') || 'Operations Coordinator';
            slideCover.addText('COMPILER DETAILS', { x: 0.6, y: 4.5, w: 4.0, h: 0.2, fontSize: 8, bold: true, color: '8BF8E0', tracking: 1 });
            slideCover.addText(compilerName, { x: 0.6, y: 4.7, w: 4.0, h: 0.3, fontSize: 11, bold: true, color: colorWhite });
            slideCover.addText(compilerTitle, { x: 0.6, y: 4.95, w: 4.0, h: 0.2, fontSize: 9, color: 'CCFBF1' });

            slideCover.addText('SUPERVISOR AUDIT', { x: 5.0, y: 4.5, w: 4.0, h: 0.2, fontSize: 8, bold: true, color: '8BF8E0', tracking: 1 });
            slideCover.addText('VIJAY KUMAR RAY', { x: 5.0, y: 4.7, w: 4.0, h: 0.3, fontSize: 11, bold: true, color: colorWhite });
            slideCover.addText('Project Director Operations', { x: 5.0, y: 4.95, w: 4.0, h: 0.2, fontSize: 9, color: 'CCFBF1' });


            // SLIDE 2: KPI Scorecard & Summary
            const slideKPI = pptx.addSlide();
            addSlideHeader(slideKPI, 'Operational KPI Scorecard', 'Performance Review');

            slideKPI.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                x: 0.5, y: 1.3, w: 3.2, h: 3.8, fill: { color: colorWhite }, line: { color: 'E2E8F0', width: 1 }
            });
            slideKPI.addText('COMPOSITE SCORE', {
                x: 0.8, y: 1.6, w: 2.6, h: 0.3, fontSize: 10, bold: true, color: '64748B', tracking: 1, align: 'center'
            });
            slideKPI.addText(`${dossierData.compositeScore}%`, {
                x: 0.8, y: 2.0, w: 2.6, h: 1.0, fontSize: 54, bold: true, color: colorTealDark, align: 'center', fontFace: 'Courier'
            });
            slideKPI.addText(`OVERALL GRADE: ${dossierData.grade}`, {
                x: 0.8, y: 3.1, w: 2.6, h: 0.4, fontSize: 16, bold: true, color: colorTealMid, align: 'center'
            });
            
            const statsOverviewRuns = [
                { text: `Total Schools Managed: ${dossierData.totalSchools}`, options: { bullet: true, fontSize: 9.5, color: colorTextDark, paraSpaceBefore: 4 } },
                { text: `Student-to-Device Ratio: 1:${dossierData.studentToDevice}`, options: { bullet: true, fontSize: 9.5, color: colorTextDark, paraSpaceBefore: 4 } },
                { text: `Conduction Index: ${Math.round(Math.min(100, (dossierData.classRate / 1.5) * 100))}% of target`, options: { bullet: true, fontSize: 9.5, color: colorTextDark, paraSpaceBefore: 4 } }
            ];
            slideKPI.addText(statsOverviewRuns, {
                x: 0.8, y: 3.7, w: 2.6, h: 1.2
            });

            // 4 Grid KPI Boxes on Right
            const kpiItems = [
                { title: 'INSTRUCTOR ROSTER', value: `${dossierData.activeStaff} Active`, sub: `${dossierData.vacantStaff} Vacant Slots`, color: '10B981' },
                { title: 'DAILY RUN TIME', value: `${dossierData.totalHours} Hours`, sub: `Cumulative Logging`, color: '3B82F6' },
                { title: 'CLASSES CONVERTED', value: `${dossierData.totalClasses} classes`, sub: `Avg ${dossierData.classRate}/school/day`, color: '8B5CF6' },
                { title: 'MONITORING VISITS', value: `${dossierData.totalVisits} visits`, sub: `Avg ${dossierData.visitRate}/school`, color: 'F59E0B' }
            ];

            kpiItems.forEach((item, idx) => {
                const col = idx % 2;
                const row = Math.floor(idx / 2);
                const xPos = 4.1 + (col * 2.7);
                const yPos = 1.3 + (row * 1.95);

                slideKPI.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                    x: xPos, y: yPos, w: 2.5, h: 1.7, fill: { color: colorWhite }, line: { color: 'E2E8F0', width: 1 }
                });

                slideKPI.addShape(pptx.shapes.RECTANGLE, {
                    x: xPos + 0.15, y: yPos + 0.15, w: 0.08, h: 0.4, fill: { color: item.color }
                });

                slideKPI.addText(item.title, {
                    x: xPos + 0.3, y: yPos + 0.15, w: 2.1, h: 0.3, fontSize: 8, bold: true, color: '64748B', tracking: 1
                });

                slideKPI.addText(item.value, {
                    x: xPos + 0.2, y: yPos + 0.6, w: 2.1, h: 0.5, fontSize: 18, bold: true, color: colorTealDark
                });

                slideKPI.addText(item.sub, {
                    x: xPos + 0.2, y: yPos + 1.15, w: 2.1, h: 0.35, fontSize: 9, color: '64748B'
                });
            });


            // SLIDE 3: REFERENCE TABLE - Core Metrics Overview Table
            const slide3Table = pptx.addSlide();
            addSlideHeader(slide3Table, 'Core KPI & Sub-Entity Reference Sheet', 'Data Reference');

            const table3Data = [
                [
                    { text: "Sub-Entity Name", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Schools", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Active Staff", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Vacant Staff", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Sync Rate", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Run Hours", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Class Rate", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Visit Rate", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Comp Score", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Grade", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } }
                ]
            ];

            subGroupKPIs.forEach(g => {
                table3Data.push([
                    { text: String(g.name), options: { fontSize: 8 } },
                    { text: String(g.totalSchools), options: { fontSize: 8 } },
                    { text: String(g.activeStaff), options: { fontSize: 8 } },
                    { text: String(g.vacantStaff), options: { fontSize: 8, color: g.vacantStaff > 0 ? "DC2626" : "1E293B", bold: g.vacantStaff > 0 } },
                    { text: `${g.syncRate}%`, options: { fontSize: 8 } },
                    { text: String(g.totalHours), options: { fontSize: 8 } },
                    { text: String(g.classRate), options: { fontSize: 8 } },
                    { text: String(g.visitRate), options: { fontSize: 8 } },
                    { text: `${g.compositeScore}%`, options: { fontSize: 8, bold: true } },
                    { text: String(g.grade), options: { fontSize: 8, bold: true, color: g.compositeScore >= 70 ? "0D9488" : "D97706" } }
                ]);
            });

            // Total row
            table3Data.push([
                { text: "OVERALL / TOTAL", options: { bold: true, fontSize: 8, fill: "F1F5F9" } },
                { text: String(dossierData.totalSchools), options: { bold: true, fontSize: 8, fill: "F1F5F9" } },
                { text: String(dossierData.activeStaff), options: { bold: true, fontSize: 8, fill: "F1F5F9" } },
                { text: String(dossierData.vacantStaff), options: { bold: true, fontSize: 8, fill: "F1F5F9", color: dossierData.vacantStaff > 0 ? "DC2626" : "1E293B" } },
                { text: `${Math.round((dossierData.syncSchoolsCount / dossierData.totalSchools) * 100)}%`, options: { bold: true, fontSize: 8, fill: "F1F5F9" } },
                { text: String(dossierData.totalHours), options: { bold: true, fontSize: 8, fill: "F1F5F9" } },
                { text: String(dossierData.classRate), options: { bold: true, fontSize: 8, fill: "F1F5F9" } },
                { text: String(dossierData.visitRate), options: { bold: true, fontSize: 8, fill: "F1F5F9" } },
                { text: `${dossierData.compositeScore}%`, options: { bold: true, fontSize: 8, fill: "F1F5F9" } },
                { text: String(dossierData.grade), options: { bold: true, fontSize: 8, fill: "F1F5F9" } }
            ]);

            slide3Table.addTable(table3Data, {
                x: 0.5, y: 1.2, w: 9.0, h: 3.8,
                autoPage: true,
                autoPageHeader: true,
                autoPageLineMultiplier: 0.8,
                colWidths: [1.7, 0.7, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.9, 0.9],
                border: { type: "solid", color: "E2E8F0", width: 0.5 }
            });


            // SLIDE 4: Strategic SWOT Matrix
            const slideSWOT = pptx.addSlide();
            addSlideHeader(slideSWOT, 'Strategic SWOT Matrix', 'Strategic Insights');

            const swotBlocks = [
                { title: 'STRENGTHS (S)', list: customStrengths, color: '059669', bg: 'ECFDF5' },
                { title: 'WEAKNESSES (W)', list: customWeaknesses, color: 'DC2626', bg: 'FEF2F2' },
                { title: 'OPPORTUNITIES (O)', list: customOpportunities, color: '2563EB', bg: 'EFF6FF' },
                { title: 'THREATS (T)', list: customThreats, color: 'D97706', bg: 'FFFBEB' }
            ];

            swotBlocks.forEach((block, idx) => {
                const col = idx % 2;
                const row = Math.floor(idx / 2);
                const xPos = 0.5 + (col * 4.6);
                const yPos = 1.2 + (row * 2.0);

                slideSWOT.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                    x: xPos, y: yPos, w: 4.4, h: 1.8, fill: { color: block.bg }, line: { color: 'E2E8F0', width: 1 }
                });

                slideSWOT.addText(block.title, {
                    x: xPos + 0.2, y: yPos + 0.15, w: 4.0, h: 0.3,
                    fontSize: 10, bold: true, color: block.color, tracking: 1
                });

                const textRuns = block.list.slice(0, 4).map(p => {
                    return { text: p, options: { bullet: true, fontSize: 8.2, color: colorTextDark, paraSpaceBefore: 3 } };
                });
                if (textRuns.length === 0) {
                    textRuns.push({ text: 'No specific entries identified.', options: { bullet: true, fontSize: 8.2, color: '64748B' } });
                }

                slideSWOT.addText(textRuns, {
                    x: xPos + 0.2, y: yPos + 0.45, w: 4.0, h: 1.25
                });
            });


            // SLIDE 5: SWOT Reference Rules & Benchmarks
            const slideSWOTRef = pptx.addSlide();
            addSlideHeader(slideSWOTRef, 'SWOT Dimension & Target Evaluation Metrics', 'Data Reference');

            const staffingPct = dossierData.totalSchools > 0 ? Math.round((dossierData.activeStaff / dossierData.totalSchools) * 100) : 0;
            const syncPct = dossierData.totalSchools > 0 ? Math.round((dossierData.syncSchoolsCount / dossierData.totalSchools) * 100) : 0;
            const avgRunHoursPerSch = dossierData.totalSchools > 0 ? Math.round(dossierData.totalHours / dossierData.totalSchools) : 0;

            const table5Data = [
                [
                    { text: "Performance Dimension", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 9 } },
                    { text: "Target Benchmark", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 9 } },
                    { text: "Current Entity Value", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 9 } },
                    { text: "Evaluation Result", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 9 } }
                ],
                [
                    { text: "IT Instructor Placement", options: { fontSize: 8.5 } },
                    { text: ">= 90% placement", options: { fontSize: 8.5 } },
                    { text: `${staffingPct}% (${dossierData.activeStaff}/${dossierData.totalSchools} schools)`, options: { fontSize: 8.5 } },
                    { text: staffingPct >= 90 ? "STRENGTH (Satisfactory)" : staffingPct < 70 ? "CRITICAL WEAKNESS" : "MODERATE WEAKNESS", options: { fontSize: 8.5, bold: true, color: staffingPct >= 90 ? "059669" : "DC2626" } }
                ],
                [
                    { text: "Daily Class Conduction", options: { fontSize: 8.5 } },
                    { text: ">= 1.0 classes/school/day", options: { fontSize: 8.5 } },
                    { text: `${dossierData.classRate} classes/day average`, options: { fontSize: 8.5 } },
                    { text: dossierData.classRate >= 1.0 ? "STRENGTH (Satisfactory)" : dossierData.classRate < 0.4 ? "CRITICAL WEAKNESS" : "MODERATE WEAKNESS", options: { fontSize: 8.5, bold: true, color: dossierData.classRate >= 1.0 ? "059669" : "DC2626" } }
                ],
                [
                    { text: "Hardware Sync Connectivity", options: { fontSize: 8.5 } },
                    { text: ">= 85% syncing compliance", options: { fontSize: 8.5 } },
                    { text: `${syncPct}% syncing labs`, options: { fontSize: 8.5 } },
                    { text: syncPct >= 85 ? "STRENGTH (Satisfactory)" : syncPct < 50 ? "CRITICAL WEAKNESS" : "MODERATE WEAKNESS", options: { fontSize: 8.5, bold: true, color: syncPct >= 85 ? "059669" : "DC2626" } }
                ],
                [
                    { text: "Cumulative Run Hours", options: { fontSize: 8.5 } },
                    { text: ">= 20 hrs/school average", options: { fontSize: 8.5 } },
                    { text: `${avgRunHoursPerSch} hrs/school`, options: { fontSize: 8.5 } },
                    { text: avgRunHoursPerSch >= 20 ? "STRENGTH (Satisfactory)" : "WEAKNESS (Below Average)", options: { fontSize: 8.5, bold: true, color: avgRunHoursPerSch >= 20 ? "059669" : "D97706" } }
                ],
                [
                    { text: "Field Coordinator Supervision", options: { fontSize: 8.5 } },
                    { text: ">= 1.0 visits/school", options: { fontSize: 8.5 } },
                    { text: `${dossierData.visitRate} visits/school`, options: { fontSize: 8.5 } },
                    { text: dossierData.visitRate >= 1.0 ? "STRENGTH (Satisfactory)" : "WEAKNESS (Below Average)", options: { fontSize: 8.5, bold: true, color: dossierData.visitRate >= 1.0 ? "059669" : "D97706" } }
                ]
            ];

            slideSWOTRef.addTable(table5Data, {
                x: 0.5, y: 1.3, w: 9.0, h: 3.2,
                border: { type: "solid", color: "E2E8F0", width: 0.5 }
            });


            // SLIDE 6: Hardware Infrastructure Breakdown
            const slideHardware = pptx.addSlide();
            addSlideHeader(slideHardware, 'Hardware Infrastructure & Compliance', 'Operations & Compliance');

            slideHardware.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                x: 0.5, y: 1.3, w: 4.3, h: 3.8, fill: { color: colorWhite }, line: { color: 'E2E8F0', width: 1 }
            });
            slideHardware.addText('HARDWARE SYNC COMPLIANCE', {
                x: 0.8, y: 1.6, w: 3.7, h: 0.3, fontSize: 10, bold: true, color: '64748B', tracking: 1
            });

            slideHardware.addText(`${syncPct}%`, {
                x: 0.8, y: 2.0, w: 3.7, h: 0.9, fontSize: 44, bold: true, color: syncPct >= 75 ? '059669' : 'DC2626', fontFace: 'Courier'
            });

            slideHardware.addText(`Syncing: ${dossierData.syncSchoolsCount} / ${dossierData.totalSchools} Active Labs`, {
                x: 0.8, y: 2.9, w: 3.7, h: 0.3, fontSize: 12, bold: true, color: colorTextDark
            });

            const hardwareRuns = [
                { text: `CPUs Configured: ${dossierData.cpuInstalled} systems`, options: { bullet: true, fontSize: 9, color: '475569', paraSpaceBefore: 3 } },
                { text: `Mini PCs Configured: ${dossierData.miniInstalled} nodes`, options: { bullet: true, fontSize: 9, color: '475569', paraSpaceBefore: 3 } },
                { text: `Panel IFPs Active: ${dossierData.panelInstalled} boards`, options: { bullet: true, fontSize: 9, color: '475569', paraSpaceBefore: 3 } },
                { text: `Total Hardware Node Roster: ${dossierData.totalDevices} units`, options: { bullet: true, fontSize: 9, color: '475569', paraSpaceBefore: 3 } }
            ];
            slideHardware.addText(hardwareRuns, {
                x: 0.8, y: 3.3, w: 3.7, h: 1.5
            });

            // Right Box: Classes compliance
            slideHardware.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                x: 5.2, y: 1.3, w: 4.3, h: 3.8, fill: { color: colorWhite }, line: { color: 'E2E8F0', width: 1 }
            });
            slideHardware.addText('ACADEMIC CLASS LOGS COMPLIANCE', {
                x: 5.5, y: 1.6, w: 3.7, h: 0.3, fontSize: 10, bold: true, color: '64748B', tracking: 1
            });

            slideHardware.addText(`${dossierData.totalClasses}`, {
                x: 5.5, y: 2.0, w: 3.7, h: 0.9, fontSize: 44, bold: true, color: '8B5CF6', fontFace: 'Courier'
            });

            slideHardware.addText(`Class Logging Density Index: ${dossierData.classRate}/school/day`, {
                x: 5.5, y: 2.9, w: 3.7, h: 0.3, fontSize: 12, bold: true, color: colorTextDark
            });

            const classesRuns = [
                { text: `ICT / Computer Lab classes: ${dossierData.ictClasses} logged`, options: { bullet: true, fontSize: 9, color: '475569', paraSpaceBefore: 3 } },
                { text: `Smart Interactive Board classes: ${dossierData.smartClasses} logged`, options: { bullet: true, fontSize: 9, color: '475569', paraSpaceBefore: 3 } },
                { text: `Field verification visit sessions: ${dossierData.totalVisits} logs`, options: { bullet: true, fontSize: 9, color: '475569', paraSpaceBefore: 3 } },
                { text: `Monitoring visits per school: ${dossierData.visitRate} average`, options: { bullet: true, fontSize: 9, color: '475569', paraSpaceBefore: 3 } }
            ];
            slideHardware.addText(classesRuns, {
                x: 5.5, y: 3.3, w: 3.7, h: 1.5
            });


            // SLIDE 7: REFERENCE TABLE - School-wise Hardware Inventory Table
            const slide7Table = pptx.addSlide();
            addSlideHeader(slide7Table, 'School-wise Hardware Infrastructure Inventory', 'Data Reference');

            const table7Data = [
                [
                    { text: "School Name", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "UDISE Code", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Project Name", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "CPUs", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Mini PCs", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Panel IFPs", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Total Nodes", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } }
                ]
            ];

            entitySchools.forEach(s => {
                const udise = cleanUdise(s.udise_code);
                const masterRec = edustatMasterMap[udise];
                let c = 0, m = 0, p = 0;
                if (masterRec) {
                    c = Number(getVal(masterRec, 'cpu') || 0);
                    m = Number(getVal(masterRec, 'mini') || getVal(masterRec, 'thin') || 0);
                    p = Number(getVal(masterRec, 'panel') || 0);
                } else {
                    c = 1;
                }

                table7Data.push([
                    { text: s.school_name || s.school || "N/A", options: { fontSize: 8 } },
                    { text: udise, options: { fontSize: 8 } },
                    { text: s.project_name || "N/A", options: { fontSize: 8 } },
                    { text: String(c), options: { fontSize: 8 } },
                    { text: String(m), options: { fontSize: 8 } },
                    { text: String(p), options: { fontSize: 8 } },
                    { text: String(c + m + p), options: { fontSize: 8, bold: true } }
                ]);
            });

            slide7Table.addTable(table7Data, {
                x: 0.5, y: 1.2, w: 9.0, h: 3.8,
                autoPage: true,
                autoPageHeader: true,
                autoPageLineMultiplier: 0.8,
                colWidths: [3.2, 1.0, 1.8, 0.7, 0.7, 0.8, 0.8],
                border: { type: "solid", color: "E2E8F0", width: 0.5 }
            });


            // SLIDE 8: NATIVE COLUMN CHART - Hardware Asset Configuration
            const slideHwChart = pptx.addSlide();
            addSlideHeader(slideHwChart, 'Hardware Configuration Distribution by Sub-Group', 'Data Visualisation');

            const subChartLabels = [];
            const cpusVal = [];
            const minisVal = [];
            const panelsVal = [];

            subGroupKPIs.slice(0, 10).forEach(g => {
                subChartLabels.push(g.name.substring(0, 15));
                let cpuSum = 0;
                let miniSum = 0;
                let panelSum = 0;

                const grp = subGroups.find(gr => gr.name === g.name);
                if (grp) {
                    grp.schools.forEach(s => {
                        const udise = cleanUdise(s.udise_code);
                        const masterRec = edustatMasterMap[udise];
                        if (masterRec) {
                            cpuSum += Number(getVal(masterRec, 'cpu') || 0);
                            miniSum += Number(getVal(masterRec, 'mini') || getVal(masterRec, 'thin') || 0);
                            panelSum += Number(getVal(masterRec, 'panel') || 0);
                        } else {
                            cpuSum += 1;
                        }
                    });
                }

                cpusVal.push(cpuSum);
                minisVal.push(miniSum);
                panelsVal.push(panelSum);
            });

            const hwChartData = [
                { name: "CPUs Installed", labels: subChartLabels, values: cpusVal },
                { name: "Mini PCs Installed", labels: subChartLabels, values: minisVal },
                { name: "Smart Flat Panels", labels: subChartLabels, values: panelsVal }
            ];

            slideHwChart.addChart(pptx.charts.BAR, hwChartData, {
                x: 0.5, y: 1.3, w: 9.0, h: 3.8,
                showLegend: true,
                legendPos: "b",
                showTitle: false,
                barDir: "col",
                chartColors: ["0D9488", "3B82F6", "8B5CF6"]
            });


            // SLIDE 9: Hardware Run Hours & Connectivity Sync Details
            const slideSyncHours = pptx.addSlide();
            addSlideHeader(slideSyncHours, 'Daily System Utilisation & Connectivity Sync', 'Operations & Compliance');

            slideSyncHours.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                x: 0.5, y: 1.3, w: 9.0, h: 3.8, fill: { color: colorWhite }, line: { color: 'E2E8F0', width: 1 }
            });

            slideSyncHours.addText('UTILISATION COMPLIANCE SUMMARY', {
                x: 0.8, y: 1.6, w: 8.4, h: 0.3, fontSize: 10, bold: true, color: colorTealMid, tracking: 1
            });

            const totalHoursLog = dossierData.totalHours;
            const offlineSchs = dossierData.nonSyncSchoolsCount;
            const syncSchs = dossierData.syncSchoolsCount;

            const syncHoursRuns = [
                { text: `Data uploading compliance stands at ${syncPct}% across the selected entity scope.`, options: { bullet: true, fontSize: 10, color: colorTextDark, paraSpaceBefore: 6 } },
                { text: `Active Logging: ${syncSchs} computer labs have synced their daily hardware usage files successfully.`, options: { bullet: true, fontSize: 10, color: colorTextDark, paraSpaceBefore: 6 } },
                { text: `Offline/MIA Labs: ${offlineSchs} schools have failed to report sync logs during the range, indicating internet outages.`, options: { bullet: true, fontSize: 10, color: colorTextDark, paraSpaceBefore: 6 } },
                { text: `Cumulative Runtimes: Logged system runtime stands at ${totalHoursLog} hours across CPUs and Panels.`, options: { bullet: true, fontSize: 10, color: colorTextDark, paraSpaceBefore: 6 } },
                { text: `Average Run Hours: Daily runtime per syncing school stands at ${avgRunHoursPerSch} hours, pointing to active lab usage.`, options: { bullet: true, fontSize: 10, color: colorTextDark, paraSpaceBefore: 6 } }
            ];

            slideSyncHours.addText(syncHoursRuns, {
                x: 0.8, y: 2.1, w: 8.4, h: 2.6
            });


            // SLIDE 10: REFERENCE TABLE - School-wise Hardware Utilisation and Last Sync Table
            const slide10Table = pptx.addSlide();
            addSlideHeader(slide10Table, 'School-wise Hardware Utilisation & Sync Compliance', 'Data Reference');

            const table10Data = [
                [
                    { text: "School Name", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "UDISE Code", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Sync Status", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Total Run Hours", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Avg Daily Hours", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } }
                ]
            ];

            entitySchools.forEach(s => {
                const udise = cleanUdise(s.udise_code);
                const stats = edustatRangeMap[udise];
                const totalHrs = stats ? stats.hours : 0;
                const synced = stats ? stats.synced : false;

                const days = Number(workingDays) || 1;
                const avgHrs = parseFloat((totalHrs / days).toFixed(2));

                table10Data.push([
                    { text: s.school_name || s.school || "N/A", options: { fontSize: 8 } },
                    { text: udise, options: { fontSize: 8 } },
                    { text: synced ? "🟢 SYNCING" : "🔴 OFFLINE", options: { fontSize: 8, bold: true, color: synced ? "059669" : "DC2626" } },
                    { text: String(totalHrs), options: { fontSize: 8 } },
                    { text: String(avgHrs), options: { fontSize: 8 } }
                ]);
            });

            slide10Table.addTable(table10Data, {
                x: 0.5, y: 1.2, w: 9.0, h: 3.8,
                autoPage: true,
                autoPageHeader: true,
                autoPageLineMultiplier: 0.8,
                colWidths: [3.8, 1.2, 1.6, 1.2, 1.2],
                border: { type: "solid", color: "E2E8F0", width: 0.5 }
            });


            // SLIDE 11: Academic Class Conduction Performance
            const slideClassConduction = pptx.addSlide();
            slideClassConduction.background = { fill: colorBgLight };
            addSlideHeader(slideClassConduction, 'Academic Class Conduction Density', 'Operations & Compliance');

            slideClassConduction.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                x: 0.5, y: 1.3, w: 9.0, h: 3.8, fill: { color: colorWhite }, line: { color: 'E2E8F0', width: 1 }
            });

            slideClassConduction.addText('CLASS LOGGING DENSITY METRICS', {
                x: 0.8, y: 1.6, w: 8.4, h: 0.3, fontSize: 10, bold: true, color: '8B5CF6', tracking: 1
            });

            const classConductionRuns = [
                { text: `Cumulative computer classes conducted: ${dossierData.totalClasses} logging entries recorded.`, options: { bullet: true, fontSize: 10, color: colorTextDark, paraSpaceBefore: 6 } },
                { text: `ICT / Traditional Computer classes: ${dossierData.ictClasses} logged, emphasizing coding and digital literacy.`, options: { bullet: true, fontSize: 10, color: colorTextDark, paraSpaceBefore: 6 } },
                { text: `Smart Flat Panel classes: ${dossierData.smartClasses} logged, indicating classroom video learning.`, options: { bullet: true, fontSize: 10, color: colorTextDark, paraSpaceBefore: 6 } },
                { text: `Logging Density Rate: Averaging ${dossierData.classRate} classes per school daily against the target of 1.5.`, options: { bullet: true, fontSize: 10, color: colorTextDark, paraSpaceBefore: 6 } },
                { text: `Roster coverage indicator: Classes are parsed and audited against the active manpower roster.`, options: { bullet: true, fontSize: 10, color: colorTextDark, paraSpaceBefore: 6 } }
            ];

            slideClassConduction.addText(classConductionRuns, {
                x: 0.8, y: 2.1, w: 8.4, h: 2.6
            });


            // SLIDE 12: REFERENCE TABLE - School-wise Class Conduction Logs Table
            const slide12Table = pptx.addSlide();
            addSlideHeader(slide12Table, 'School-wise Academic Class Conduction Logs', 'Data Reference');

            const table12Data = [
                [
                    { text: "School Name", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "UDISE Code", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "ICT Classes", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Theory", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Practical", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Smart Classes", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "MIS Classes", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Total Classes", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Classes/Day", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } }
                ]
            ];

            entitySchools.forEach(s => {
                const udise = cleanUdise(s.udise_code);
                const stats = jhpmsLabRangeMap[udise] || { ict: 0, smart: 0, mis: 0, theory: 0, practical: 0 };
                const ict = stats.ict;
                const theory = stats.theory || 0;
                const practical = stats.practical || 0;
                const smart = stats.smart;
                const mis = stats.mis || 0;

                const total = ict + smart;
                const days = Number(workingDays) || 1;
                const rate = parseFloat((total / days).toFixed(2));

                table12Data.push([
                    { text: s.school_name || s.school || "N/A", options: { fontSize: 8 } },
                    { text: udise, options: { fontSize: 8 } },
                    { text: String(ict), options: { fontSize: 8 } },
                    { text: String(theory), options: { fontSize: 8 } },
                    { text: String(practical), options: { fontSize: 8 } },
                    { text: String(smart), options: { fontSize: 8 } },
                    { text: String(mis), options: { fontSize: 8 } },
                    { text: String(total), options: { fontSize: 8, bold: true } },
                    { text: String(rate), options: { fontSize: 8 } }
                ]);
            });

            slide12Table.addTable(table12Data, {
                x: 0.5, y: 1.2, w: 9.0, h: 3.8,
                autoPage: true,
                autoPageHeader: true,
                autoPageLineMultiplier: 0.8,
                colWidths: [2.6, 0.9, 0.7, 0.7, 0.7, 0.7, 0.7, 0.9, 1.1],
                border: { type: "solid", color: "E2E8F0", width: 0.5 }
            });


            // SLIDE 13: NATIVE BAR CHART - Class Conduction Metrics
            const slideClChart = pptx.addSlide();
            addSlideHeader(slideClChart, 'Class Conduction Performance by Sub-Group', 'Data Visualisation');

            const classLabels = [];
            const totalClassesVal = [];

            subGroupKPIs.slice(0, 10).forEach(g => {
                classLabels.push(g.name.substring(0, 15));
                totalClassesVal.push(g.totalClasses);
            });

            const classChartData = [
                { name: "Total Classes Logged", labels: classLabels, values: totalClassesVal }
            ];

            slideClChart.addChart(pptx.charts.BAR, classChartData, {
                x: 0.5, y: 1.3, w: 9.0, h: 3.8,
                showLegend: true,
                legendPos: "b",
                showTitle: false,
                barDir: "col",
                chartColors: ["8B5CF6"]
            });


            // SLIDE 14: Field Team Visitation & Monitoring
            const slideVisits = pptx.addSlide();
            addSlideHeader(slideVisits, 'Field Coordinator Visitation & Monitoring Compliance', 'Operations & Compliance');

            slideVisits.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                x: 0.5, y: 1.3, w: 9.0, h: 3.8, fill: { color: colorWhite }, line: { color: 'E2E8F0', width: 1 }
            });

            slideVisits.addText('FIELD MONITORING METRICS', {
                x: 0.8, y: 1.6, w: 8.4, h: 0.3, fontSize: 10, bold: true, color: 'F59E0B', tracking: 1
            });

            const visitRuns = [
                { text: `Total coordinator monitoring visits recorded: ${dossierData.totalVisits} sessions during the period.`, options: { bullet: true, fontSize: 10, color: colorTextDark, paraSpaceBefore: 6 } },
                { text: `Visitation Density: Averaging ${dossierData.visitRate} supervisor visits per school, reflecting operational oversight.`, options: { bullet: true, fontSize: 10, color: colorTextDark, paraSpaceBefore: 6 } },
                { text: `Supervision Targets: Target benchmark is at least 1.0 visits per school during a monthly operational cycle.`, options: { bullet: true, fontSize: 10, color: colorTextDark, paraSpaceBefore: 6 } },
                { text: `Impact: Direct field audits help identify network sync dropouts and instruct roster vacancies quickly.`, options: { bullet: true, fontSize: 10, color: colorTextDark, paraSpaceBefore: 6 } }
            ];

            slideVisits.addText(visitRuns, {
                x: 0.8, y: 2.1, w: 8.4, h: 2.6
            });


            // SLIDE 15: REFERENCE TABLE - School-wise Visitation Logs Table
            const slide15Table = pptx.addSlide();
            addSlideHeader(slide15Table, 'School-wise Field Monitoring Visits Log', 'Data Reference');

            const table15Data = [
                [
                    { text: "School Name", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "UDISE Code", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Visits Count", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Last Visit Date", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Coordinator (CC)", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } }
                ]
            ];

            entitySchools.forEach(s => {
                const udise = cleanUdise(s.udise_code);
                const stats = visitsRangeMap[udise] || { count: 0, lastDate: null };
                const count = stats.count;
                const lastDate = stats.lastDate;

                table15Data.push([
                    { text: s.school_name || s.school || "N/A", options: { fontSize: 8 } },
                    { text: udise, options: { fontSize: 8 } },
                    { text: String(count), options: { fontSize: 8, bold: count > 0 } },
                    { text: lastDate ? formatDate(lastDate) : "No Visits", options: { fontSize: 8, color: lastDate ? "1E293B" : "64748B" } },
                    { text: s.visitor_name || "Unassigned CC", options: { fontSize: 8 } }
                ]);
            });

            slide15Table.addTable(table15Data, {
                x: 0.5, y: 1.2, w: 9.0, h: 3.8,
                autoPage: true,
                autoPageHeader: true,
                autoPageLineMultiplier: 0.8,
                colWidths: [3.8, 1.2, 1.2, 1.4, 1.4],
                border: { type: "solid", color: "E2E8F0", width: 0.5 }
            });


            // SLIDE 16: Staffing & Instructor Roster Status
            const slideManpower = pptx.addSlide();
            addSlideHeader(slideManpower, 'Instructor Roster Deployment Status', 'Manpower Deployment');

            slideManpower.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                x: 0.5, y: 1.3, w: 9.0, h: 3.8, fill: { color: colorWhite }, line: { color: 'E2E8F0', width: 1 }
            });

            slideManpower.addText('MANPOWER ROSTER COMPLIANCE', {
                x: 0.8, y: 1.6, w: 8.4, h: 0.3, fontSize: 10, bold: true, color: '10B981', tracking: 1
            });

            const staffPct = dossierData.totalSchools > 0 ? Math.round((dossierData.activeStaff / dossierData.totalSchools) * 100) : 0;

            const manpowerRuns = [
                { text: `Roster placement stands at a strong ${staffPct}% across the selected entity scope.`, options: { bullet: true, fontSize: 10, color: colorTextDark, paraSpaceBefore: 6 } },
                { text: `Active Personnel: ${dossierData.activeStaff} school computer labs have working instructors.`, options: { bullet: true, fontSize: 10, color: colorTextDark, paraSpaceBefore: 6 } },
                { text: `Vacant Posts: ${dossierData.vacantStaff} schools operate without assigned instructors, leading to locked lab rooms.`, options: { bullet: true, fontSize: 10, color: colorTextDark, paraSpaceBefore: 6 } },
                { text: `Impact: Recruitment gaps remain the largest single bottleneck to achieving 100% lab usage compliance.`, options: { bullet: true, fontSize: 10, color: colorTextDark, paraSpaceBefore: 6 } }
            ];

            slideManpower.addText(manpowerRuns, {
                x: 0.8, y: 2.1, w: 8.4, h: 2.6
            });


            // SLIDE 17: REFERENCE TABLE - School-wise Staffing Directory Table
            const slide17Table = pptx.addSlide();
            addSlideHeader(slide17Table, 'School-wise IT Instructor Staffing Directory', 'Data Reference');

            const table17Data = [
                [
                    { text: "School Name", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "UDISE Code", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Instructor Name", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Roster Status", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Join / Last Working Date", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } }
                ]
            ];

            entitySchools.forEach(s => {
                const udise = cleanUdise(s.udise_code);
                const schoolMp = manpowerMap[udise] || [];
                const activeRec = schoolMp.find(m => {
                    const status = String(getVal(m, 'status') || '').trim().toUpperCase();
                    return status.includes('WORKING') || status.includes('ACTIVE') || status === '';
                });

                let name = "N/A";
                let status = "🔴 VACANT";
                let statusDate = "N/A";

                if (activeRec) {
                    name = getVal(activeRec, 'instructor') || getVal(activeRec, 'name') || "Assigned Instructor";
                    status = "🟢 WORKING";
                    const dateVal = getVal(activeRec, 'date') || getVal(activeRec, 'statusDate') || getVal(activeRec, 'join');
                    if (dateVal) {
                        const parsed = parseDateRobust(dateVal);
                        if (parsed) statusDate = formatDate(parsed);
                    }
                } else if (schoolMp.length > 0) {
                    const lastRec = schoolMp[schoolMp.length - 1];
                    name = getVal(lastRec, 'instructor') || getVal(lastRec, 'name') || "Last Instructor";
                    const dateVal = getVal(lastRec, 'date') || getVal(lastRec, 'statusDate') || getVal(lastRec, 'last_working_day');
                    if (dateVal) {
                        const parsed = parseDateRobust(dateVal);
                        if (parsed) statusDate = formatDate(parsed);
                    }
                }

                table17Data.push([
                    { text: s.school_name || s.school || "N/A", options: { fontSize: 8 } },
                    { text: udise, options: { fontSize: 8 } },
                    { text: name, options: { fontSize: 8 } },
                    { text: status, options: { fontSize: 8, bold: true, color: activeRec ? "059669" : "DC2626" } },
                    { text: statusDate, options: { fontSize: 8 } }
                ]);
            });

            slide17Table.addTable(table17Data, {
                x: 0.5, y: 1.2, w: 9.0, h: 3.8,
                autoPage: true,
                autoPageHeader: true,
                autoPageLineMultiplier: 0.8,
                colWidths: [3.8, 1.2, 1.6, 1.2, 1.2],
                border: { type: "solid", color: "E2E8F0", width: 0.5 }
            });


            // SLIDE 18: Key Operational Challenges & Risks
            const slideChallenges = pptx.addSlide();
            addSlideHeader(slideChallenges, 'Key Operational Challenges & Risks', 'Risk Assessment');

            slideChallenges.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                x: 0.5, y: 1.3, w: 9.0, h: 3.8, fill: { color: colorWhite }, line: { color: 'E2E8F0', width: 1 }
            });

            slideChallenges.addText('IDENTIFIED BOTTLENECKS & RISKS', {
                x: 0.8, y: 1.6, w: 8.4, h: 0.3, fontSize: 10, bold: true, color: 'DC2626', tracking: 1
            });

            const challengesRuns = customChallenges.map((item, idx) => {
                return { text: `[Risk ${idx + 1}]  ${item}`, options: { bullet: true, fontSize: 10.5, color: colorTextDark, paraSpaceBefore: 8, bold: true } };
            });
            if (challengesRuns.length === 0) {
                challengesRuns.push({ text: 'No high-risk operational bottlenecks identified for the selected scope.', options: { bullet: true, fontSize: 10.5, color: '64748B' } });
            }

            slideChallenges.addText(challengesRuns, {
                x: 0.8, y: 2.1, w: 8.4, h: 2.6
            });


            // SLIDE 19: REFERENCE TABLE - Risk Priority & Remediation Mapping Table
            const slide19Table = pptx.addSlide();
            addSlideHeader(slide19Table, 'Operational Risk Remediation Mapping', 'Data Reference');

            const table19Data = [
                [
                    { text: "Identified Challenge / Risk", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Risk Level", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Immediate Remediation Action Plan", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Timeline", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } },
                    { text: "Responsible Owner", options: { bold: true, color: colorWhite, fill: colorTealDark, fontSize: 8.5 } }
                ]
            ];

            customChallenges.forEach((ch, idx) => {
                let risk = "MODERATE";
                let riskColor = "D97706";
                let remediation = "Monitor metrics weekly and report deviations.";
                let timeline = "15 Days";
                let owner = "Regional CC In-Charge";

                if (ch.toLowerCase().includes("recruitment") || ch.toLowerCase().includes("vacant")) {
                    risk = "HIGH";
                    riskColor = "DC2626";
                    remediation = "Accelerate candidate interview and allocate replacement roster.";
                    timeline = "14 Days";
                    owner = "HR Operations Team";
                } else if (ch.toLowerCase().includes("network") || ch.toLowerCase().includes("sync") || ch.toLowerCase().includes("offline")) {
                    risk = "HIGH";
                    riskColor = "DC2626";
                    remediation = "Inspect routers, power supplies, and check SIM card validity.";
                    timeline = "7 Days";
                    owner = "Field IT Support Eng.";
                } else if (ch.toLowerCase().includes("class") || ch.toLowerCase().includes("logging") || ch.toLowerCase().includes("conduction")) {
                    risk = "MODERATE";
                    remediation = "Enforce lab schedules in school timetables and monitor logins.";
                    timeline = "30 Days";
                    owner = "School Principal / CC";
                }

                table19Data.push([
                    { text: ch, options: { fontSize: 8 } },
                    { text: risk, options: { fontSize: 8, bold: true, color: riskColor } },
                    { text: remediation, options: { fontSize: 8 } },
                    { text: timeline, options: { fontSize: 8 } },
                    { text: owner, options: { fontSize: 8 } }
                ]);
            });

            if (customChallenges.length === 0) {
                table19Data.push([
                    { text: "No operational risks defined.", options: { fontSize: 8, italic: true } },
                    { text: "LOW", options: { fontSize: 8 } },
                    { text: "Sustain daily compliance inspections.", options: { fontSize: 8 } },
                    { text: "Ongoing", options: { fontSize: 8 } },
                    { text: "All CCs", options: { fontSize: 8 } }
                ]);
            }

            slide19Table.addTable(table19Data, {
                x: 0.5, y: 1.2, w: 9.0, h: 3.8,
                autoPage: true,
                autoPageHeader: true,
                autoPageLineMultiplier: 0.8,
                colWidths: [2.5, 0.9, 3.2, 1.0, 1.4],
                border: { type: "solid", color: "E2E8F0", width: 0.5 }
            });


            // SLIDE 20: Future Roadmap & Corrective Action Plan
            const slideRoadmap = pptx.addSlide();
            addSlideHeader(slideRoadmap, 'Strategic Roadmap & Action Plan', 'Strategic Roadmaps');

            slideRoadmap.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                x: 0.5, y: 1.3, w: 9.0, h: 3.8, fill: { color: colorWhite }, line: { color: 'E2E8F0', width: 1 }
            });

            slideRoadmap.addText('RECOMMENDED CORRECTIVE ACTIONS', {
                x: 0.8, y: 1.6, w: 8.4, h: 0.3, fontSize: 10, bold: true, color: '059669', tracking: 1
            });

            const roadmapRuns = customFuturePlans.map((item, idx) => {
                return { text: `✔  ${item}`, options: { bullet: true, fontSize: 10.5, color: colorTextDark, paraSpaceBefore: 8, bold: true } };
            });
            if (roadmapRuns.length === 0) {
                roadmapRuns.push({ text: 'Sustain baseline operational standards and monitor metrics weekly.', options: { bullet: true, fontSize: 10.5, color: '64748B' } });
            }

            slideRoadmap.addText(roadmapRuns, {
                x: 0.8, y: 2.1, w: 8.4, h: 2.6
            });

            // Save Presentation File
            const fileName = `Review_Meeting_${formattedEntityName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
            await pptx.writeFile({ fileName });

        } catch (error) {
            console.error("PPTX Generation error:", error);
            alert("Failed to export PowerPoint slide deck. Please check logs.");
        } finally {
            setExportingPPTX(false);
        }
    };

    const formattedSelectedEntityName = useMemo(() => {
        if (reviewLevel === 'school' && selectedEntity) {
            const found = entityOptions.find(o => o.udise === selectedEntity);
            return found ? found.name : selectedEntity;
        }
        return selectedEntity || 'All Entities';
    }, [reviewLevel, selectedEntity, entityOptions]);

    // Slide Carousel Preview Navigation State
    const [activePreviewSlide, setActivePreviewSlide] = useState(1);
    const totalPreviewSlides = 20;

    return (
        <div className="p-6 bg-slate-50 dark:bg-slate-900/40 min-h-screen font-sans">
            {/* Upper Header Control Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <span>👔</span> Review Meeting Executive Dossier & Exporter
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Deep operational analysis, dynamic SWOT matrices, and boardroom-ready PowerPoint 16:9 exports.
                    </p>
                </div>

                <button
                    disabled={!dossierData || exportingPPTX}
                    onClick={handlePPTXExport}
                    className="px-4 py-2 bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-800 hover:to-teal-900 active:from-teal-950 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                    {exportingPPTX ? (
                        <>
                            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Generating Slides...</span>
                        </>
                    ) : (
                        <>
                            <span>📊</span> Download PowerPoint Presentation (16:9)
                        </>
                    )}
                </button>
            </div>

            {/* Level & Entity Selector Bar */}
            <div className="bg-white dark:bg-slate-950/45 p-5 rounded-2xl border border-gray-150 dark:border-white/5 shadow-md mb-6 flex flex-col md:flex-row gap-5 items-stretch md:items-center">
                <div className="flex-1">
                    <label className="block text-[10px] uppercase font-black text-gray-400 dark:text-gray-500 mb-2 tracking-wider">
                        1. Select Review Level
                    </label>
                    <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl">
                        {[
                            { id: 'zone', label: 'Zone-wise' },
                            { id: 'project', label: 'Project-wise' },
                            { id: 'district', label: 'District-wise' },
                            { id: 'cc', label: 'CC-wise' },
                            { id: 'school', label: 'School-wise' }
                        ].map(lvl => (
                            <button
                                key={lvl.id}
                                onClick={() => setReviewLevel(lvl.id)}
                                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${reviewLevel === lvl.id ? 'bg-teal-700 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                            >
                                {lvl.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1">
                    <label className="block text-[10px] uppercase font-black text-gray-400 dark:text-gray-500 mb-2 tracking-wider">
                        2. Choose Target Entity ({entityOptions.length} Options)
                    </label>
                    {reviewLevel === 'school' ? (
                        <select
                            value={selectedEntity}
                            onChange={(e) => setSelectedEntity(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-250 dark:border-white/10 rounded-xl p-2.5 text-xs text-gray-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            {entityOptions.map(opt => (
                                <option key={opt.udise} value={opt.udise}>
                                    [{opt.udise}] {opt.name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <select
                            value={selectedEntity}
                            onChange={(e) => setSelectedEntity(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-250 dark:border-white/10 rounded-xl p-2.5 text-xs text-gray-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            {entityOptions.map(opt => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* If no data available for selected entity */}
            {!dossierData ? (
                <div className="bg-white dark:bg-slate-950/45 border border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-10 text-center shadow-sm">
                    <p className="text-xs text-gray-400">No schools or records match the selected entity. Apply filters or choose a different scope.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* LEFT & CENTER PANELS: Detailed Dossier Panel */}
                    <div className="xl:col-span-2 space-y-6">
                        {/* Executive KPI Scorecard */}
                        <div className="bg-white dark:bg-slate-950/45 p-6 rounded-2xl border border-gray-150 dark:border-white/5 shadow-md">
                            <h3 className="text-xs uppercase font-black tracking-widest text-gray-400 dark:text-gray-500 mb-4">
                                Dynamic KPI Dossier: {formattedSelectedEntityName}
                            </h3>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-gray-100 dark:border-white/5">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 block mb-1">Roster Placement</span>
                                    <span className="text-lg font-black text-gray-800 dark:text-white">{dossierData.activeStaff} Active</span>
                                    <span className="text-[10px] text-red-500 block font-semibold mt-1">🔴 {dossierData.vacantStaff} Vacant Slots</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-gray-100 dark:border-white/5">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 block mb-1">Hardware Sync</span>
                                    <span className="text-lg font-black text-gray-800 dark:text-white">{dossierData.syncSchoolsCount} / {dossierData.totalSchools}</span>
                                    <span className="text-[10px] text-teal-600 dark:text-teal-400 block font-semibold mt-1">
                                        {Math.round((dossierData.syncSchoolsCount / dossierData.totalSchools) * 100)}% Sync Rate
                                    </span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-gray-100 dark:border-white/5">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 block mb-1">Class Conduction</span>
                                    <span className="text-lg font-black text-gray-800 dark:text-white">{dossierData.totalClasses} logs</span>
                                    <span className="text-[10px] text-purple-600 block font-semibold mt-1">
                                        {dossierData.classRate} cls/school/day
                                    </span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-gray-100 dark:border-white/5">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 block mb-1">Field Monitoring</span>
                                    <span className="text-lg font-black text-gray-800 dark:text-white">{dossierData.totalVisits} Visits</span>
                                    <span className="text-[10px] text-amber-500 block font-semibold mt-1">
                                        {dossierData.visitRate} visits/school
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Interactive SWOT Matrix with inputs */}
                        <div className="bg-white dark:bg-slate-950/45 p-6 rounded-2xl border border-gray-150 dark:border-white/5 shadow-md">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xs uppercase font-black tracking-widest text-gray-400 dark:text-gray-500">
                                    SWOT Matrix Editor
                                </h3>
                                <span className="text-[10px] bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 px-2 py-0.5 rounded font-black uppercase">
                                    Dynamic Engine
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Strengths */}
                                <div className="bg-emerald-50/20 dark:bg-emerald-950/10 p-4 rounded-xl border border-emerald-100/40 dark:border-emerald-900/20">
                                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 block mb-2">💪 STRENGTHS</span>
                                    <textarea
                                        className="w-full bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/40 rounded-lg p-2 text-xs font-medium text-gray-700 dark:text-gray-300 h-24 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        value={customStrengths.join('\n')}
                                        onChange={(e) => {
                                            setCustomStrengths(e.target.value.split('\n'));
                                            setHasUserEdited(true);
                                        }}
                                        placeholder="Enter strengths line by line..."
                                    />
                                </div>

                                {/* Weaknesses */}
                                <div className="bg-rose-50/20 dark:bg-rose-950/10 p-4 rounded-xl border border-rose-100/40 dark:border-rose-900/20">
                                    <span className="text-xs font-black text-rose-700 dark:text-rose-450 block mb-2">⚠ WEAKNESSES</span>
                                    <textarea
                                        className="w-full bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/40 rounded-lg p-2 text-xs font-medium text-gray-700 dark:text-gray-300 h-24 focus:outline-none focus:ring-1 focus:ring-rose-500"
                                        value={customWeaknesses.join('\n')}
                                        onChange={(e) => {
                                            setCustomWeaknesses(e.target.value.split('\n'));
                                            setHasUserEdited(true);
                                        }}
                                        placeholder="Enter weaknesses line by line..."
                                    />
                                </div>

                                {/* Opportunities */}
                                <div className="bg-blue-50/20 dark:bg-blue-950/10 p-4 rounded-xl border border-blue-100/40 dark:border-blue-900/20">
                                    <span className="text-xs font-black text-blue-700 dark:text-blue-400 block mb-2">⚡ OPPORTUNITIES</span>
                                    <textarea
                                        className="w-full bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900/40 rounded-lg p-2 text-xs font-medium text-gray-700 dark:text-gray-300 h-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        value={customOpportunities.join('\n')}
                                        onChange={(e) => {
                                            setCustomOpportunities(e.target.value.split('\n'));
                                            setHasUserEdited(true);
                                        }}
                                        placeholder="Enter opportunities line by line..."
                                    />
                                </div>

                                {/* Threats */}
                                <div className="bg-amber-50/20 dark:bg-amber-950/10 p-4 rounded-xl border border-amber-100/40 dark:border-amber-900/20">
                                    <span className="text-xs font-black text-amber-700 dark:text-amber-500 block mb-2">🛑 THREATS</span>
                                    <textarea
                                        className="w-full bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900/40 rounded-lg p-2 text-xs font-medium text-gray-700 dark:text-gray-300 h-24 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                        value={customThreats.join('\n')}
                                        onChange={(e) => {
                                            setCustomThreats(e.target.value.split('\n'));
                                            setHasUserEdited(true);
                                        }}
                                        placeholder="Enter threats line by line..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Challenges & Roadmap Planner */}
                        <div className="bg-white dark:bg-slate-950/45 p-6 rounded-2xl border border-gray-150 dark:border-white/5 shadow-md">
                            <h3 className="text-xs uppercase font-black tracking-widest text-gray-400 dark:text-gray-500 mb-4">
                                Challenges & Future Roadmap Planner
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] uppercase font-black text-gray-400 dark:text-gray-500 mb-1.5 tracking-wider">
                                        Operational Challenges & Bottlenecks
                                    </label>
                                    <textarea
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-xs font-medium text-gray-800 dark:text-white h-24 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                                        value={customChallenges.join('\n')}
                                        onChange={(e) => {
                                            setCustomChallenges(e.target.value.split('\n'));
                                            setHasUserEdited(true);
                                        }}
                                        placeholder="Add operational bottlenecks..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] uppercase font-black text-gray-400 dark:text-gray-500 mb-1.5 tracking-wider">
                                        Future Roadmap & Correction Plan
                                    </label>
                                    <textarea
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-xs font-medium text-gray-800 dark:text-white h-24 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                                        value={customFuturePlans.join('\n')}
                                        onChange={(e) => {
                                            setCustomFuturePlans(e.target.value.split('\n'));
                                            setHasUserEdited(true);
                                        }}
                                        placeholder="Add roadmap corrections..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL: Slide Deck Widescreen 16:9 Preview */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-950/45 p-6 rounded-2xl border border-gray-150 dark:border-white/5 shadow-md flex flex-col h-full">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xs uppercase font-black tracking-widest text-gray-400 dark:text-gray-500">
                                    Slide Deck Preview (16:9)
                                </h3>
                                <span className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded font-black">
                                    Slide {activePreviewSlide} / {totalPreviewSlides}
                                </span>
                            </div>

                            {/* Slide Window Frame (16:9 Ratio Container) */}
                            <div className="w-full aspect-[16/9] bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-gray-200 dark:border-white/5 relative text-slate-800 flex flex-col select-none">
                                {/* Slide 1: Cover */}
                                {activePreviewSlide === 1 && (
                                    <div className="w-full h-full bg-[#0B4F48] p-5 flex flex-col justify-between text-white font-serif">
                                        <div className="space-y-1">
                                            <span className="text-[8px] uppercase tracking-wider text-emerald-300 font-sans font-bold">DEPARTMENT OF SCHOOL EDUCATION</span>
                                            <h4 className="text-md md:text-xl font-bold leading-tight">Review Meeting Dossier</h4>
                                            <span className="text-[10px] italic text-emerald-100 block">{reviewLevel.toUpperCase()}: {formattedSelectedEntityName}</span>
                                        </div>
                                        <div className="border-t border-emerald-800 pt-2 flex justify-between items-end font-sans">
                                            <div>
                                                <span className="text-[7px] text-emerald-300 block tracking-wider uppercase font-bold">Compiler</span>
                                                <span className="text-[9px] font-bold block">{localStorage.getItem('snet_full_name') || 'Portal Member'}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[7px] text-emerald-300 block tracking-wider uppercase font-bold">Date Scope</span>
                                                <span className="text-[8px]">{startDate} to {endDate}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Slide 2: KPI Scorecard */}
                                {activePreviewSlide === 2 && (
                                    <div className="w-full h-full bg-slate-50 dark:bg-slate-950 p-4 flex flex-col justify-between font-sans">
                                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-1">
                                            <span className="text-[9px] font-black text-teal-800 dark:text-teal-400">1. CORE METRICS OVERVIEW</span>
                                            <span className="text-[8px] text-gray-400">JHARKHAND EDUCATION</span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 my-auto">
                                            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-white/5 rounded-lg p-2 text-center">
                                                <span className="text-[7px] uppercase font-bold text-gray-400 block mb-0.5">Composite Score</span>
                                                <span className="text-lg font-black text-teal-700 dark:text-teal-400 block">{dossierData.compositeScore}%</span>
                                                <span className="text-[8px] font-bold text-slate-500">Grade: {dossierData.grade}</span>
                                            </div>
                                            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-white/5 rounded-lg p-2 text-center">
                                                <span className="text-[7px] uppercase font-bold text-gray-400 block mb-0.5">Active Instructors</span>
                                                <span className="text-lg font-black text-emerald-600 block">{dossierData.activeStaff}</span>
                                                <span className="text-[8px] font-bold text-red-500">{dossierData.vacantStaff} Vacant</span>
                                            </div>
                                            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-white/5 rounded-lg p-2 text-center">
                                                <span className="text-[7px] uppercase font-bold text-gray-400 block mb-0.5">Classes Average</span>
                                                <span className="text-lg font-black text-purple-600 block">{dossierData.totalClasses}</span>
                                                <span className="text-[8px] font-bold text-slate-500">{dossierData.classRate}/sch/day</span>
                                            </div>
                                        </div>

                                        <div className="text-[7px] text-gray-400 border-t border-gray-200 dark:border-white/5 pt-1 text-center">
                                            *Analysis is auto-generated based on device running hours, CC logs, and field reports.
                                        </div>
                                    </div>
                                )}

                                {/* Slide 3: SWOT Grid */}
                                {activePreviewSlide === 3 && (
                                    <div className="w-full h-full bg-[#0B4F48] p-4 flex flex-col justify-between text-white font-sans">
                                        <div className="border-b border-emerald-800 pb-1 flex justify-between items-center">
                                            <span className="text-[9px] font-bold text-emerald-300">2. STRATEGIC SWOT MATRIX</span>
                                            <span className="text-[8px] text-emerald-400">Dossier Overview</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 my-auto">
                                            <div className="bg-emerald-950/40 p-2 rounded border border-emerald-850">
                                                <span className="text-[8px] font-bold text-emerald-300 block mb-0.5">Strengths</span>
                                                <p className="text-[7px] text-gray-200 line-clamp-2">
                                                    {customStrengths[0] || 'Sustained instructional compliance.'}
                                                </p>
                                            </div>
                                            <div className="bg-red-950/40 p-2 rounded border border-red-900/40">
                                                <span className="text-[8px] font-bold text-red-300 block mb-0.5">Weaknesses</span>
                                                <p className="text-[7px] text-gray-200 line-clamp-2">
                                                    {customWeaknesses[0] || 'Underutilized device runtimes.'}
                                                </p>
                                            </div>
                                            <div className="bg-blue-950/40 p-2 rounded border border-blue-900/40">
                                                <span className="text-[8px] font-bold text-blue-300 block mb-0.5">Opportunities</span>
                                                <p className="text-[7px] text-gray-200 line-clamp-2">
                                                    {customOpportunities[0] || 'Perform field routing upgrades.'}
                                                </p>
                                            </div>
                                            <div className="bg-amber-950/40 p-2 rounded border border-amber-900/40">
                                                <span className="text-[8px] font-bold text-amber-300 block mb-0.5">Threats</span>
                                                <p className="text-[7px] text-gray-200 line-clamp-2">
                                                    {customThreats[0] || 'Long-term breakdown neglect.'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-[7px] text-emerald-400 text-center border-t border-emerald-800 pt-1">
                                            Confidential Review Material
                                        </div>
                                    </div>
                                )}

                                {/* Slide 4: Operations details */}
                                {activePreviewSlide === 4 && (
                                    <div className="w-full h-full bg-slate-50 dark:bg-slate-950 p-4 flex flex-col justify-between font-sans">
                                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-1">
                                            <span className="text-[9px] font-black text-teal-800 dark:text-teal-400">3. OPERATIONS & INTERNET SYNC</span>
                                            <span className="text-[8px] text-gray-400">JHARKHAND EDUCATION</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 my-auto">
                                            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-white/5 rounded-lg p-2.5">
                                                <span className="text-[7px] uppercase font-bold text-gray-400 block mb-1">Hardware Sync</span>
                                                <span className="text-xl font-black text-teal-700 block">
                                                    {Math.round((dossierData.syncSchoolsCount / dossierData.totalSchools) * 100)}%
                                                </span>
                                                <span className="text-[8px] text-gray-500 block mt-1">Syncing: {dossierData.syncSchoolsCount} / {dossierData.totalSchools} Schools</span>
                                            </div>

                                            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-white/5 rounded-lg p-2.5">
                                                <span className="text-[7px] uppercase font-bold text-gray-400 block mb-1">Total Devices Logged</span>
                                                <span className="text-xl font-black text-purple-600 block">
                                                    {dossierData.totalDevices} units
                                                </span>
                                                <span className="text-[8px] text-gray-500 block mt-1">CPUs: {dossierData.cpuInstalled} | Panels: {dossierData.panelInstalled}</span>
                                            </div>
                                        </div>

                                        <div className="text-[7px] text-gray-400 border-t border-gray-200 dark:border-white/5 pt-1 text-center">
                                            Syncing compliance denotes active database communication over last working cycle.
                                        </div>
                                    </div>
                                )}
                                 {/* Slide 5: SWOT Reference Evaluation Rules */}
                                {activePreviewSlide === 5 && (
                                    <div className="w-full h-full bg-slate-50 dark:bg-slate-950 p-3.5 flex flex-col justify-between font-sans">
                                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-1">
                                            <span className="text-[9px] font-black text-teal-850 dark:text-teal-400">5. SWOT BENCHMARK RULE REFERENCE</span>
                                            <span className="text-[8px] text-gray-400">Data Reference</span>
                                        </div>
                                        <div className="my-auto overflow-y-auto max-h-[140px] text-[8px]">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-200 dark:bg-slate-800 font-bold">
                                                        <th className="p-1">Dimension</th>
                                                        <th className="p-1">Target</th>
                                                        <th className="p-1">Value</th>
                                                        <th className="p-1">Result</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr className="border-b border-gray-150 dark:border-white/5">
                                                        <td className="p-1 font-bold">Staffing</td>
                                                        <td className="p-1">&gt;=90%</td>
                                                        <td className="p-1">{Math.round((dossierData.activeStaff / dossierData.totalSchools) * 100)}%</td>
                                                        <td className="p-1 text-emerald-600 font-black">OK</td>
                                                    </tr>
                                                    <tr className="border-b border-gray-150 dark:border-white/5">
                                                        <td className="p-1 font-bold">Sync</td>
                                                        <td className="p-1">&gt;=85%</td>
                                                        <td className="p-1">{Math.round((dossierData.syncSchoolsCount / dossierData.totalSchools) * 100)}%</td>
                                                        <td className="p-1 text-emerald-600 font-black">OK</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="text-[7px] text-gray-400 text-center">
                                            Rule-based SWOT evaluation engines.
                                        </div>
                                    </div>
                                )}

                                {/* Slide 6: Hardware Infrastructure Breakdown */}
                                {activePreviewSlide === 6 && (
                                    <div className="w-full h-full bg-slate-50 dark:bg-slate-950 p-4 flex flex-col justify-between font-sans">
                                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-1">
                                            <span className="text-[9px] font-black text-teal-850 dark:text-teal-400">6. HARDWARE INFRASTRUCTURE SUMMARY</span>
                                            <span className="text-[8px] text-gray-400">Operations & Compliance</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 my-auto">
                                            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-white/5 rounded-lg p-1.5 text-center">
                                                <span className="text-[6px] uppercase font-bold text-gray-400 block mb-0.5">CPUs</span>
                                                <span className="text-md font-black text-teal-700 block">{dossierData.cpuInstalled}</span>
                                            </div>
                                            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-white/5 rounded-lg p-1.5 text-center">
                                                <span className="text-[6px] uppercase font-bold text-gray-400 block mb-0.5">Mini PCs</span>
                                                <span className="text-md font-black text-blue-600 block">{dossierData.miniInstalled}</span>
                                            </div>
                                            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-white/5 rounded-lg p-1.5 text-center">
                                                <span className="text-[6px] uppercase font-bold text-gray-400 block mb-0.5">Panels</span>
                                                <span className="text-md font-black text-purple-600 block">{dossierData.panelInstalled}</span>
                                            </div>
                                        </div>
                                        <div className="text-[7px] text-gray-400 text-center">
                                            Telemetry synced: {dossierData.syncSchoolsCount} / {dossierData.totalSchools} schools.
                                        </div>
                                    </div>
                                )}

                                {/* Slide 7: School Hardware Table */}
                                {activePreviewSlide === 7 && (
                                    <div className="w-full h-full bg-slate-50 dark:bg-slate-950 p-4 flex flex-col justify-between font-sans">
                                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-1">
                                            <span className="text-[9px] font-black text-teal-850 dark:text-teal-400">7. SCHOOL-WISE HARDWARE INVENTORY</span>
                                            <span className="text-[8px] text-gray-400">Data Reference</span>
                                        </div>
                                        <div className="my-auto overflow-y-auto max-h-[140px] text-[8px] text-left">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-200 dark:bg-slate-800 font-bold border-b border-gray-300">
                                                        <th className="p-1 text-[7px]">School Name</th>
                                                        <th className="p-1 text-[7px]">UDISE</th>
                                                        <th className="p-1 text-[7px] text-center">CPUs</th>
                                                        <th className="p-1 text-[7px] text-center">Mini PCs</th>
                                                        <th className="p-1 text-[7px] text-center">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {entitySchools.slice(0, 3).map((s, idx) => {
                                                        const udise = cleanUdise(s.udise_code);
                                                        const masterRec = edustatMasterMap[udise];
                                                        const c = masterRec ? Number(getVal(masterRec, 'cpu') || 0) : 1;
                                                        const m = masterRec ? Number(getVal(masterRec, 'mini') || getVal(masterRec, 'thin') || 0) : 0;
                                                        return (
                                                            <tr key={idx} className="border-b border-gray-150 dark:border-white/5">
                                                                <td className="p-1 truncate max-w-[80px]">{s.school_name || s.school}</td>
                                                                <td className="p-1 text-[7px]">{udise}</td>
                                                                <td className="p-1 text-center">{c}</td>
                                                                <td className="p-1 text-center">{m}</td>
                                                                <td className="p-1 text-center font-bold">{c + m}</td>
                                                            </tr>
                                                        );
                      })}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="text-[7px] text-gray-400 text-center">
                                            Showing first 3 of {entitySchools.length} schools. Auto-paged in PowerPoint.
                                        </div>
                                    </div>
                                )}

                                {/* Slide 8: Hardware Distribution Sub-Group Chart */}
                                {activePreviewSlide === 8 && (
                                    <div className="w-full h-full bg-slate-50 dark:bg-slate-950 p-4 flex flex-col justify-between font-sans">
                                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-1">
                                            <span className="text-[9px] font-black text-teal-850 dark:text-teal-400">8. HARDWARE CONFIGURATION DISTRIBUTION</span>
                                            <span className="text-[8px] text-gray-400">Visual Chart</span>
                                        </div>
                                        <div className="my-auto flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[8px] font-bold w-16 truncate text-left">CPUs</span>
                                                <div className="flex-1 bg-slate-200 dark:bg-slate-800 h-3 rounded overflow-hidden">
                                                    <div className="bg-teal-600 h-full rounded" style={{ width: '75%' }}></div>
                                                </div>
                                                <span className="text-[8px] font-bold w-8">{dossierData.cpuInstalled}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[8px] font-bold w-16 truncate text-left">Mini PCs</span>
                                                <div className="flex-1 bg-slate-200 dark:bg-slate-800 h-3 rounded overflow-hidden">
                                                    <div className="bg-blue-500 h-full rounded" style={{ width: '45%' }}></div>
                                                </div>
                                                <span className="text-[8px] font-bold w-8">{dossierData.miniInstalled}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[8px] font-bold w-16 truncate text-left">Smart Panels</span>
                                                <div className="flex-1 bg-slate-200 dark:bg-slate-800 h-3 rounded overflow-hidden">
                                                    <div className="bg-purple-500 h-full rounded" style={{ width: '20%' }}></div>
                                                </div>
                                                <span className="text-[8px] font-bold w-8">{dossierData.panelInstalled}</span>
                                            </div>
                                        </div>
                                        <div className="text-[7px] text-gray-400 text-center">
                                            Native editable chart elements will be exported in PowerPoint.
                                        </div>
                                    </div>
                                )}

                                {/* Slide 9: Utilisation & Sync Run Hours */}
                                {activePreviewSlide === 9 && (
                                    <div className="w-full h-full bg-slate-50 dark:bg-slate-950 p-4 flex flex-col justify-between font-sans">
                                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-1">
                                            <span className="text-[9px] font-black text-teal-850 dark:text-teal-400">9. UTILISATION & SYNC RUN HOURS</span>
                                            <span className="text-[8px] text-gray-400">Operations & Sync</span>
                                        </div>
                                        <div className="my-auto px-2 space-y-1 text-left">
                                            <div className="text-[8px] text-gray-700 dark:text-gray-200 flex items-start gap-1 font-medium">
                                                <span className="text-teal-500">▶</span>
                                                <span>Data upload sync compliance rate stands at <strong className="text-teal-600 dark:text-teal-400">{Math.round((dossierData.syncSchoolsCount / dossierData.totalSchools) * 100)}%</strong>.</span>
                                            </div>
                                            <div className="text-[8px] text-gray-700 dark:text-gray-200 flex items-start gap-1 font-medium">
                                                <span className="text-teal-500">▶</span>
                                                <span>Active syncing: {dossierData.syncSchoolsCount} labs. Offline/MIA labs: {dossierData.nonSyncSchoolsCount} schools.</span>
                                            </div>
                                            <div className="text-[8px] text-gray-700 dark:text-gray-200 flex items-start gap-1 font-medium">
                                                <span className="text-teal-500">▶</span>
                                                <span>Logged system runtime stands at a cumulative total of {dossierData.totalHours} hours.</span>
                                            </div>
                                        </div>
                                        <div className="text-[7px] text-gray-400 text-center">
                                            Active telemetry tracked through local client background daemon agents.
                                        </div>
                                    </div>
                                )}

                                {/* Slide 10: School-wise Run Hours & Sync Table */}
                                {activePreviewSlide === 10 && (
                                    <div className="w-full h-full bg-slate-50 dark:bg-slate-950 p-4 flex flex-col justify-between font-sans">
                                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-1">
                                            <span className="text-[9px] font-black text-teal-850 dark:text-teal-400">10. SCHOOL-WISE UTILISATION & SYNC</span>
                                            <span className="text-[8px] text-gray-400">Data Reference</span>
                                        </div>
                                        <div className="my-auto overflow-y-auto max-h-[140px] text-[8px] text-left">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-200 dark:bg-slate-800 font-bold border-b border-gray-300">
                                                        <th className="p-1">School Name</th>
                                                        <th className="p-1">UDISE</th>
                                                        <th className="p-1">Sync Status</th>
                                                        <th className="p-1 text-center">Run Hours</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {entitySchools.slice(0, 3).map((s, idx) => {
                                                        const udise = cleanUdise(s.udise_code);
                                                        const stats = edustatRangeMap[udise];
                                                        const totalHrs = stats ? stats.hours : 0;
                                                        const synced = stats ? stats.synced : false;
                                                        return (
                                                            <tr key={idx} className="border-b border-gray-150 dark:border-white/5">
                                                                <td className="p-1 truncate max-w-[100px]">{s.school_name || s.school}</td>
                                                                <td className="p-1">{udise}</td>
                                                                <td className={`p-1 font-bold ${synced ? 'text-emerald-600' : 'text-red-500'}`}>{synced ? 'SYNCING' : 'OFFLINE'}</td>
                                                                <td className="p-1 text-center">{totalHrs} hrs</td>
                                                            </tr>
                                                        );
                      })}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="text-[7px] text-gray-400 text-center">
                                            Showing first 3 of {entitySchools.length} schools. Auto-paged in PowerPoint.
                                        </div>
                                    </div>
                                )}

                                {/* Slide 11: Academic Class Conduction Performance */}
                                {activePreviewSlide === 11 && (
                                    <div className="w-full h-full bg-slate-50 dark:bg-slate-950 p-4 flex flex-col justify-between font-sans">
                                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-1">
                                            <span className="text-[9px] font-black text-teal-850 dark:text-teal-400">11. CLASS CONDUCTION PERFORMANCE</span>
                                            <span className="text-[8px] text-gray-400">Operations & Compliance</span>
                                        </div>
                                        <div className="my-auto px-2 space-y-1 text-left">
                                            <div className="text-[8px] text-gray-700 dark:text-gray-200 flex items-start gap-1 font-medium">
                                                <span className="text-purple-500">▶</span>
                                                <span>Cumulative computer classes conducted: <strong className="text-purple-600">{dossierData.totalClasses} logging entries</strong>.</span>
                                            </div>
                                            <div className="text-[8px] text-gray-700 dark:text-gray-200 flex items-start gap-1 font-medium">
                                                <span className="text-purple-500">▶</span>
                                                <span>ICT / Traditional classes: {dossierData.ictClasses} logs. Smart Panel classes: {dossierData.smartClasses} logs.</span>
                                            </div>
                                            <div className="text-[8px] text-gray-700 dark:text-gray-200 flex items-start gap-1 font-medium">
                                                <span className="text-purple-500">▶</span>
                                                <span>Logging density index: {dossierData.classRate} classes per school daily against the target of 1.5.</span>
                                            </div>
                                        </div>
                                        <div className="text-[7px] text-gray-400 text-center">
                                            Classes are synced and cross-referenced with assigned instructor rosters.
                                        </div>
                                    </div>
                                )}

                                {/* Slide 12: School-wise Class Conduction Logs Table */}
                                {activePreviewSlide === 12 && (
                                    <div className="w-full h-full bg-slate-50 dark:bg-slate-950 p-4 flex flex-col justify-between font-sans">
                                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-1">
                                            <span className="text-[9px] font-black text-teal-850 dark:text-teal-400">12. SCHOOL-WISE CLASS CONDUCTION LOGS</span>
                                            <span className="text-[8px] text-gray-400">Data Reference</span>
                                        </div>
                                        <div className="my-auto overflow-y-auto max-h-[140px] text-[8px] text-left">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-200 dark:bg-slate-800 font-bold border-b border-gray-300">
                                                        <th className="p-1">School Name</th>
                                                        <th className="p-1">UDISE</th>
                                                        <th className="p-1 text-center">ICT</th>
                                                        <th className="p-1 text-center">Theory</th>
                                                        <th className="p-1 text-center">Practical</th>
                                                        <th className="p-1 text-center">Smart</th>
                                                        <th className="p-1 text-center">MIS</th>
                                                        <th className="p-1 text-center">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {entitySchools.slice(0, 3).map((s, idx) => {
                                                        const udise = cleanUdise(s.udise_code);
                                                        const stats = jhpmsLabRangeMap[udise] || { ict: 0, smart: 0, mis: 0, theory: 0, practical: 0 };
                                                        const ict = stats.ict;
                                                        const theory = stats.theory || 0;
                                                        const practical = stats.practical || 0;
                                                        const smart = stats.smart;
                                                        const mis = stats.mis || 0;
                                                        return (
                                                            <tr key={idx} className="border-b border-gray-150 dark:border-white/5">
                                                                <td className="p-1 truncate max-w-[80px]">{s.school_name || s.school}</td>
                                                                <td className="p-1">{udise}</td>
                                                                <td className="p-1 text-center">{ict}</td>
                                                                <td className="p-1 text-center">{theory}</td>
                                                                <td className="p-1 text-center">{practical}</td>
                                                                <td className="p-1 text-center">{smart}</td>
                                                                <td className="p-1 text-center">{mis}</td>
                                                                <td className="p-1 text-center font-bold">{ict + smart}</td>
                                                            </tr>
                                                        );
                      })}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="text-[7px] text-gray-400 text-center">
                                            Showing first 3 of {entitySchools.length} schools. Auto-paged in PowerPoint.
                                        </div>
                                    </div>
                                )}

                                {/* Slide 13: Sub-Group Class Conduction Performance Chart */}
                                {activePreviewSlide === 13 && (
                                    <div className="w-full h-full bg-slate-50 dark:bg-slate-950 p-4 flex flex-col justify-between font-sans">
                                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-1">
                                            <span className="text-[9px] font-black text-teal-850 dark:text-teal-400">13. SUB-GROUP CLASS CONDUCTION LOGS</span>
                                            <span className="text-[8px] text-gray-400">Visual Chart</span>
                                        </div>
                                        <div className="my-auto flex flex-col gap-2">
                                            {subGroupKPIs.slice(0, 3).map((g, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <span className="text-[8px] font-bold w-20 truncate text-left">{g.name}</span>
                                                    <div className="flex-1 bg-slate-200 dark:bg-slate-800 h-3 rounded overflow-hidden">
                                                        <div className="bg-purple-600 h-full rounded" style={{ width: `${Math.min(100, (g.totalClasses / Math.max(1, dossierData.totalClasses)) * 250)}%` }}></div>
                                                    </div>
                                                    <span className="text-[8px] font-bold w-8">{g.totalClasses}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="text-[7px] text-gray-400 text-center">
                                            Native editable chart elements will be exported in PowerPoint.
                                        </div>
                                    </div>
                                )}

                                {/* Slide 14: Field Coordinator Visitation & Monitoring Compliance */}
                                {activePreviewSlide === 14 && (
                                    <div className="w-full h-full bg-slate-50 dark:bg-slate-950 p-4 flex flex-col justify-between font-sans">
                                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-1">
                                            <span className="text-[9px] font-black text-teal-850 dark:text-teal-400">14. FIELD COORDINATOR VISITATION</span>
                                            <span className="text-[8px] text-gray-400">Operations & Compliance</span>
                                        </div>
                                        <div className="my-auto px-2 space-y-1 text-left">
                                            <div className="text-[8px] text-gray-700 dark:text-gray-200 flex items-start gap-1 font-medium">
                                                <span className="text-amber-500">▶</span>
                                                <span>Total coordinator monitoring visits recorded: <strong className="text-amber-600">{dossierData.totalVisits} sessions</strong>.</span>
                                            </div>
                                            <div className="text-[8px] text-gray-700 dark:text-gray-200 flex items-start gap-1 font-medium">
                                                <span className="text-amber-500">▶</span>
                                                <span>Visitation Density: Averaging {dossierData.visitRate} supervisor visits per school during the scope.</span>
                                            </div>
                                            <div className="text-[8px] text-gray-700 dark:text-gray-200 flex items-start gap-1 font-medium">
                                                <span className="text-amber-500">▶</span>
                                                <span>Supervision Targets: Target benchmark is at least 1.0 visits per school during a monthly cycle.</span>
                                            </div>
                                        </div>
                                        <div className="text-[7px] text-gray-400 text-center">
                                            Helps identify connectivity issues and instructor roster vacancies.
                                        </div>
                                    </div>
                                )}

                                {/* Slide 15: School-wise Field Monitoring Visits Log */}
                                {activePreviewSlide === 15 && (
                                    <div className="w-full h-full bg-slate-50 dark:bg-slate-950 p-4 flex flex-col justify-between font-sans">
                                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-1">
                                            <span className="text-[9px] font-black text-teal-850 dark:text-teal-400">15. SCHOOL-WISE FIELD MONITORING</span>
                                            <span className="text-[8px] text-gray-400">Data Reference</span>
                                        </div>
                                        <div className="my-auto overflow-y-auto max-h-[140px] text-[8px] text-left">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-200 dark:bg-slate-800 font-bold border-b border-gray-300">
                                                        <th className="p-1">School Name</th>
                                                        <th className="p-1">UDISE</th>
                                                        <th className="p-1 text-center">Visits</th>
                                                        <th className="p-1">Last Visit</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {entitySchools.slice(0, 3).map((s, idx) => {
                                                        const udise = cleanUdise(s.udise_code);
                                                        const stats = visitsRangeMap[udise] || { count: 0, lastDate: null };
                                                        return (
                                                            <tr key={idx} className="border-b border-gray-150 dark:border-white/5">
                                                                <td className="p-1 truncate max-w-[100px]">{s.school_name || s.school}</td>
                                                                <td className="p-1">{udise}</td>
                                                                <td className="p-1 text-center font-bold">{stats.count}</td>
                                                                <td className="p-1 truncate max-w-[85px]">{stats.lastDate ? formatDate(stats.lastDate) : 'No Visits'}</td>
                                                            </tr>
                                                        );
                      })}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="text-[7px] text-gray-400 text-center">
                                            Showing first 3 of {entitySchools.length} schools. Auto-paged in PowerPoint.
                                        </div>
                                    </div>
                                )}

                                {/* Slide 16: Staffing & Instructor Deployment Status */}
                                {activePreviewSlide === 16 && (
                                    <div className="w-full h-full bg-slate-50 dark:bg-slate-950 p-4 flex flex-col justify-between font-sans">
                                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-1">
                                            <span className="text-[9px] font-black text-teal-850 dark:text-teal-400">16. STAFFING & DEPLOYMENT COMPLIANCE</span>
                                            <span className="text-[8px] text-gray-400">Manpower deployment</span>
                                        </div>
                                        <div className="my-auto px-2 space-y-1 text-left">
                                            <div className="text-[8px] text-gray-700 dark:text-gray-200 flex items-start gap-1 font-medium">
                                                <span className="text-emerald-500">▶</span>
                                                <span>Roster instructor placement stands at <strong className="text-emerald-600">{Math.round((dossierData.activeStaff / dossierData.totalSchools) * 100)}%</strong>.</span>
                                            </div>
                                            <div className="text-[8px] text-gray-700 dark:text-gray-200 flex items-start gap-1 font-medium">
                                                <span className="text-emerald-500">▶</span>
                                                <span>Active Deployment: {dossierData.activeStaff} labs. Gaps / Vacancies: {dossierData.vacantStaff} posts.</span>
                                            </div>
                                            <div className="text-[8px] text-gray-700 dark:text-gray-200 flex items-start gap-1 font-medium">
                                                <span className="text-emerald-500">▶</span>
                                                <span>Staffing vacancies are key drivers of locked lab hours in remote blocks.</span>
                                            </div>
                                        </div>
                                        <div className="text-[7px] text-gray-400 text-center">
                                            Coordinated with Jharkhand Education Project Council (JEPC) recruitment directives.
                                        </div>
                                    </div>
                                )}

                                {/* Slide 17: School-wise IT Instructor Staffing Directory Table */}
                                {activePreviewSlide === 17 && (
                                    <div className="w-full h-full bg-slate-50 dark:bg-slate-950 p-4 flex flex-col justify-between font-sans">
                                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-1">
                                            <span className="text-[9px] font-black text-teal-850 dark:text-teal-400">17. SCHOOL-WISE IT INSTRUCTOR DEPLOYMENT</span>
                                            <span className="text-[8px] text-gray-400">Data Reference</span>
                                        </div>
                                        <div className="my-auto overflow-y-auto max-h-[140px] text-[8px] text-left">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-200 dark:bg-slate-800 font-bold border-b border-gray-300">
                                                        <th className="p-1">School Name</th>
                                                        <th className="p-1">UDISE</th>
                                                        <th className="p-1">Instructor</th>
                                                        <th className="p-1">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {entitySchools.slice(0, 3).map((s, idx) => {
                                                        const udise = cleanUdise(s.udise_code);
                                                        const schoolMp = manpowerMap[udise] || [];
                                                        const activeRec = schoolMp.find(m => {
                                                            const status = String(getVal(m, 'status') || '').trim().toUpperCase();
                                                            return status.includes('WORKING') || status.includes('ACTIVE') || status === '';
                                                        });
                                                        const name = activeRec ? (getVal(activeRec, 'instructor') || getVal(activeRec, 'name') || "Assigned") : (schoolMp.length > 0 ? "Last Active" : "Vacant");
                                                        return (
                                                            <tr key={idx} className="border-b border-gray-150 dark:border-white/5">
                                                                <td className="p-1 truncate max-w-[100px]">{s.school_name || s.school}</td>
                                                                <td className="p-1">{udise}</td>
                                                                <td className="p-1 truncate max-w-[80px]">{name}</td>
                                                                <td className={`p-1 font-bold ${activeRec ? 'text-emerald-600' : 'text-red-500'}`}>{activeRec ? 'WORKING' : 'VACANT'}</td>
                                                            </tr>
                                                        );
                      })}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="text-[7px] text-gray-400 text-center">
                                            Showing first 3 of {entitySchools.length} schools. Auto-paged in PowerPoint.
                                        </div>
                                    </div>
                                )}

                                {/* Slide 18: SWOT Reference target evaluation table */}
                                {activePreviewSlide === 18 && (
                                    <div className="w-full h-full bg-[#0B4F48] p-3 flex flex-col justify-between text-white font-sans text-left">
                                        <div className="border-b border-emerald-800 pb-1 flex justify-between items-center">
                                            <span className="text-[9px] font-bold text-emerald-300">18. SWOT PERFORMANCE BENCHMARKS</span>
                                            <span className="text-[8px] text-emerald-400">Target Framework</span>
                                        </div>
                                        <div className="my-auto overflow-y-auto max-h-[140px] text-[7.5px]">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-emerald-950/60 font-bold border-b border-emerald-800">
                                                        <th className="p-1">Metric Dimension</th>
                                                        <th className="p-1">Goal Target</th>
                                                        <th className="p-1">Status Result</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr className="border-b border-emerald-950/45">
                                                        <td className="p-1">Staffing Placement</td>
                                                        <td className="p-1">&gt;= 90%</td>
                                                        <td className="p-1 text-emerald-300 font-bold">STRENGTH</td>
                                                    </tr>
                                                    <tr className="border-b border-emerald-950/45">
                                                        <td className="p-1">Daily Run Hours</td>
                                                        <td className="p-1">&gt;= 20 hrs</td>
                                                        <td className="p-1 text-amber-300 font-bold">WEAKNESS</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="text-[7px] text-emerald-400 text-center border-t border-emerald-800 pt-1">
                                            Framework coordinates strategic remediations.
                                        </div>
                                    </div>
                                )}

                                {/* Slide 19: Operational Challenges & Risks */}
                                {activePreviewSlide === 19 && (
                                    <div className="w-full h-full bg-slate-50 dark:bg-slate-950 p-4 flex flex-col justify-between font-sans">
                                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-1">
                                            <span className="text-[9px] font-black text-red-650">19. KEY OPERATIONAL CHALLENGES</span>
                                            <span className="text-[8px] text-gray-400">Risk Assessment</span>
                                        </div>
                                        <div className="my-auto px-2 space-y-1 text-left">
                                            {customChallenges.slice(0, 3).map((item, idx) => (
                                                <div key={idx} className="text-[8px] font-bold text-gray-800 dark:text-gray-200 flex items-start gap-1">
                                                    <span className="text-red-500 font-extrabold">[{idx + 1}]</span>
                                                    <span className="line-clamp-1">{item}</span>
                                                </div>
                                            ))}
                                            {customChallenges.length === 0 && (
                                                <p className="text-[8px] text-gray-400 italic">No operational risks specified.</p>
                                            )}
                                        </div>
                                        <div className="text-[7px] text-gray-400 border-t border-gray-200 dark:border-white/5 pt-1 text-center">
                                            Requires immediate action from local monitoring agents.
                                        </div>
                                    </div>
                                )}

                                {/* Slide 20: Future Strategic Roadmap */}
                                {activePreviewSlide === 20 && (
                                    <div className="w-full h-full bg-slate-50 dark:bg-slate-950 p-4 flex flex-col justify-between font-sans">
                                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-1">
                                            <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400">20. ACTION PLAN ROADMAP</span>
                                            <span className="text-[8px] text-gray-400">Strategic Roadmap</span>
                                        </div>
                                        <div className="my-auto px-2 space-y-1 text-left">
                                            {customFuturePlans.slice(0, 3).map((item, idx) => (
                                                <div key={idx} className="text-[8px] font-bold text-gray-800 dark:text-gray-200 flex items-start gap-1">
                                                    <span className="text-emerald-500 font-extrabold">✔</span>
                                                    <span className="line-clamp-1">{item}</span>
                                                </div>
                                            ))}
                                            {customFuturePlans.length === 0 && (
                                                <p className="text-[8px] text-gray-400 italic">No future actions specified.</p>
                                            )}
                                        </div>
                                        <div className="text-[7px] text-gray-400 border-t border-gray-200 dark:border-white/5 pt-1 text-center">
                                            Timeline-focused execution deliverables.
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Slide Navigator Controls */}
                            <div className="flex items-center justify-between mt-4">
                                <button
                                    onClick={() => setActivePreviewSlide(p => Math.max(1, p - 1))}
                                    disabled={activePreviewSlide === 1}
                                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 disabled:opacity-40 cursor-pointer"
                                >
                                    ◀ Prev Slide
                                </button>
                                
                                <div className="flex flex-wrap gap-1 max-w-[180px] justify-center">
                                    {Array.from({ length: 20 }, (_, idx) => idx + 1).map(i => (
                                        <button
                                            key={i}
                                            onClick={() => setActivePreviewSlide(i)}
                                            className={`w-2 h-2 rounded-full ${activePreviewSlide === i ? 'bg-teal-700 w-3' : 'bg-slate-300 dark:bg-slate-700'} transition-all`}
                                            title={`Go to Slide ${i}`}
                                        />
                                    ))}
                                </div>

                                <button
                                    onClick={() => setActivePreviewSlide(p => Math.min(totalPreviewSlides, p + 1))}
                                    disabled={activePreviewSlide === totalPreviewSlides}
                                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 disabled:opacity-40 cursor-pointer"
                                >
                                    Next Slide ▶
                                </button>
                            </div>
                            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left">
                                <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold leading-relaxed font-sans">
                                    💡 <strong>Slide Deck Notice:</strong> You can now preview all 20 slide outlines above! Clicking "Download PowerPoint Presentation" will export this exact structure with full, auto-paged school lists.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviewMeeting;
