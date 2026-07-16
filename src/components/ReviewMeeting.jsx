import React, { useState, useMemo } from 'react';
import { parseDateRobust, formatDate, exportToExcel } from '../utils';

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
                const dStr = rDate.toISOString().split('T')[0];
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
        jhpmsLab.forEach(row => {
            const udise = cleanUdise(row.udise || getVal(row, 'udise') || row.udise_code);
            if (!entityUdises.has(udise)) return;

            const rDate = parseDateRobust(row.date || getVal(row, 'date') || row.visit_date);
            if (rDate && startDate && endDate) {
                const dStr = rDate.toISOString().split('T')[0];
                if (dStr >= startDate && dStr <= endDate) {
                    const lab = String(row.labType || getVal(row, 'lab') || '').toUpperCase();
                    if (lab.includes('ICT') || lab.includes('COMP')) ictClasses++;
                    else if (lab.includes('SMART') || lab.includes('BOARD') || lab.includes('PANEL')) smartClasses++;
                }
            }
        });

        const totalClasses = ictClasses + smartClasses;
        const days = Number(workingDays) || 1;
        const classRate = parseFloat((totalClasses / (entitySchools.length * days)).toFixed(2));

        // 4. Visits
        let totalVisits = 0;
        visits.forEach(row => {
            const udise = cleanUdise(row.udise_code);
            if (!entityUdises.has(udise)) return;

            const rDate = parseDateRobust(row.visit_date);
            if (rDate && startDate && endDate) {
                const dStr = rDate.toISOString().split('T')[0];
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
            strengths.push("High Instructor Placement: Near-full operational strength with active instructors in class.");
        } else if (staffRatio < 70) {
            weaknesses.push(`Severe Staffing Shortage: ${dossierData.vacantStaff} vacant instructor post(s) causing learning downtime.`);
            threats.push("Prolonged instructor vacancy leading to student detachment from Computer Labs.");
        } else {
            weaknesses.push("Moderate Instructor Vacancies: Intermittent lab lockouts due to unfilled slots.");
        }

        // Conduction rate
        if (dossierData.classRate >= 1.0) {
            strengths.push(`Excellent Class Conduction Rate: Averaging ${dossierData.classRate} computer classes per school daily.`);
        } else if (dossierData.classRate < 0.4) {
            weaknesses.push(`Extremely Low Class Conduction: Labs are severely under-utilized (${dossierData.classRate} classes/day).`);
            opportunities.push("Conduct special training drives for coordinators to increase daily class frequency.");
        } else {
            opportunities.push("Scope to maximize Smart Class logging compliance up to 1.5 classes/day.");
        }

        // Sync Status
        const syncRatio = dossierData.totalSchools > 0 ? (dossierData.syncSchoolsCount / dossierData.totalSchools) * 100 : 0;
        if (syncRatio >= 85) {
            strengths.push("Excellent Data Syncing: Real-time hardware utilization logs are highly compliant.");
        } else if (syncRatio < 50) {
            weaknesses.push(`Data Inflow Gap: ${dossierData.nonSyncSchoolsCount} schools are not syncing device usage logs.`);
            threats.push("Extended hardware breakdowns hidden due to lack of device sync reporting.");
            opportunities.push("Initiate manual hardware audit visits to restore internet/sync services.");
        }

        // Hours & Hardware
        const avgHours = dossierData.totalDevices > 0 ? dossierData.totalHours / dossierData.totalDevices : 0;
        if (avgHours > 20) {
            strengths.push("Strong Device Utilization: System run-times show active student participation.");
        } else {
            weaknesses.push("Low Cumulative Runtime: Low run-hours point to passive or unlogged sessions.");
        }

        // Monitoring
        if (dossierData.visitRate >= 1.0) {
            strengths.push(`Proactive Supervision: Coordinator visit rate stands at a strong ${dossierData.visitRate} visits per school.`);
        } else {
            weaknesses.push("Deficient Supervision: Low visitation rates reduce coordinator oversight and support.");
            opportunities.push("Implement mandatory field visit route-mapping for all regional CCs.");
        }

        // General
        opportunities.push("Integrate student computer labs with local academic curriculum projects.");
        threats.push("Hardware deprecation risk due to lack of regular upkeep and dust protection.");

        return { strengths, weaknesses, opportunities, threats };
    }, [dossierData]);

    // Challenge & Future Roadmap logic
    const roadmapData = useMemo(() => {
        if (!dossierData) return { challenges: [], futurePlans: [] };

        const challenges = [];
        const futurePlans = [];

        if (dossierData.vacantStaff > 0) {
            challenges.push(`Recruitment Gaps: ${dossierData.vacantStaff} school(s) currently operate without active IT instructors.`);
            futurePlans.push("Accelerate recruitment workflows to fill instructor vacancies within 14 business days.");
        }
        if (dossierData.nonSyncSchoolsCount > 0) {
            challenges.push(`Network & Reporting Issues: ${dossierData.nonSyncSchoolsCount} schools failed to sync any device logs.`);
            futurePlans.push("Deploy a technical taskforce to inspect internet and local agent sync software at non-reporting labs.");
        }
        if (dossierData.classRate < 0.6) {
            challenges.push("Sub-optimal Classroom Conduction: Weekly lab logging averages fall below target benchmarks.");
            futurePlans.push("Enforce strict timetable allocation ensuring every student group gets 2+ lab sessions weekly.");
        }

        if (dossierData.compositeScore < 60) {
            challenges.push("Below Average Composite Grade: Performance indicators show general regional lag.");
            futurePlans.push("Organize monthly review meetings with CCs to inspect local lab attendance registers.");
        }

        // Default backups
        if (challenges.length === 0) {
            challenges.push("Sustaining current operational efficiency across all metrics.");
            challenges.push("Ensuring periodic hardware checkups to prevent hardware failure.");
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

    const handlePPTXExport = async () => {
        if (!selectedEntity || !dossierData) return;
        setExportingPPTX(true);

        try {
            const PptxGen = (await import('pptxgenjs')).default;
            const pptx = new PptxGen();
            pptx.layout = 'LAYOUT_16x9';

            // Premium Corporate Colors
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

            const addSlideHeader = (slide, title, categoryLabel) => {
                slide.background = { fill: colorBgLight };
                
                // Header bar
                slide.addShape(pptx.shapes.RECTANGLE, {
                    x: 0, y: 0, w: 10.0, h: 0.9, fill: { color: colorTealDark }
                });

                // Category
                slide.addText(categoryLabel.toUpperCase(), {
                    x: 0.5, y: 0.12, w: 8.0, h: 0.2,
                    fontSize: 8, bold: true, color: '8BF8E0', tracking: 2
                });

                // Main Title
                slide.addText(title, {
                    x: 0.5, y: 0.32, w: 7.0, h: 0.45,
                    fontSize: 18, bold: true, color: colorWhite, fontFace: 'Georgia'
                });

                // Top right brand badge
                slide.addText('JHARKHAND EDUCATION PROJECT COUNCIL', {
                    x: 7.2, y: 0.35, w: 2.3, h: 0.3,
                    fontSize: 8, bold: true, color: '8BF8E0', align: 'right', tracking: 1
                });
            };

            // SLIDE 1: Executive Cover
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

            // Meta fields
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

            // Grade Card on Left
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
            
            const statsOverviewText = 
                `• Total Schools Managed: ${dossierData.totalSchools}\n` +
                `• Student-to-Device Ratio: 1:${dossierData.studentToDevice}\n` +
                `• Conduction Target Index: ${Math.round(Math.min(100, (dossierData.classRate / 1.5) * 100))}%`;
            slideKPI.addText(statsOverviewText, {
                x: 0.8, y: 3.7, w: 2.6, h: 1.2, fontSize: 10, color: colorTextDark, lineSpacing: 5
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

                // Top color strip
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


            // SLIDE 3: SWOT Analysis Grid
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

                // Main card
                slideSWOT.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                    x: xPos, y: yPos, w: 4.4, h: 1.8, fill: { color: block.bg }, line: { color: 'E2E8F0', width: 1 }
                });

                // Colored Header
                slideSWOT.addText(block.title, {
                    x: xPos + 0.2, y: yPos + 0.15, w: 4.0, h: 0.3,
                    fontSize: 10, bold: true, color: block.color, tracking: 1
                });

                // Points
                const bullets = block.list.slice(0, 3).map(p => `• ${p}`).join('\n');
                slideSWOT.addText(bullets || '• No specific entries determined.', {
                    x: xPos + 0.2, y: yPos + 0.45, w: 4.0, h: 1.2,
                    fontSize: 8.5, bold: true, color: colorTextDark, lineSpacing: 4
                });
            });


            // SLIDE 4: Infrastructure & Logging Health
            const slideHardware = pptx.addSlide();
            addSlideHeader(slideHardware, 'Hardware Infrastructure & Compliance', 'Operations & Compliance');

            // Left Box: Sync compliance
            slideHardware.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                x: 0.5, y: 1.3, w: 4.3, h: 3.8, fill: { color: colorWhite }, line: { color: 'E2E8F0', width: 1 }
            });
            slideHardware.addText('HARDWARE SYNC COMPLIANCE', {
                x: 0.8, y: 1.6, w: 3.7, h: 0.3, fontSize: 10, bold: true, color: '64748B', tracking: 1
            });

            const syncRatio = dossierData.totalSchools > 0 
                ? Math.round((dossierData.syncSchoolsCount / dossierData.totalSchools) * 100) 
                : 0;

            slideHardware.addText(`${syncRatio}%`, {
                x: 0.8, y: 2.0, w: 3.7, h: 0.9, fontSize: 44, bold: true, color: syncRatio >= 75 ? '059669' : 'DC2626', fontFace: 'Courier'
            });

            slideHardware.addText(`Syncing: ${dossierData.syncSchoolsCount} / ${dossierData.totalSchools} Active Labs`, {
                x: 0.8, y: 2.9, w: 3.7, h: 0.3, fontSize: 12, bold: true, color: colorTextDark
            });

            const hardwareBarText = 
                `• CPUs Configured: ${dossierData.cpuInstalled} systems\n` +
                `• Mini PCs Configured: ${dossierData.miniInstalled} nodes\n` +
                `• Panel IFPs Active: ${dossierData.panelInstalled} boards\n` +
                `• Total Hardware Node Roster: ${dossierData.totalDevices} units`;
            slideHardware.addText(hardwareBarText, {
                x: 0.8, y: 3.3, w: 3.7, h: 1.5, fontSize: 10, color: '475569', lineSpacing: 5
            });

            // Right Box: Classes breakdown
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

            const classesBreakdownText = 
                `• ICT / Computer Lab classes: ${dossierData.ictClasses} logged\n` +
                `• Smart Interactive Board classes: ${dossierData.smartClasses} logged\n` +
                `• Field verification visit sessions: ${dossierData.totalVisits} logs\n` +
                `• Monitoring visits per school: ${dossierData.visitRate} average`;
            slideHardware.addText(classesBreakdownText, {
                x: 5.5, y: 3.3, w: 3.7, h: 1.5, fontSize: 10, color: '475569', lineSpacing: 5
            });


            // SLIDE 5: Strategic Challenges
            const slideChallenges = pptx.addSlide();
            addSlideHeader(slideChallenges, 'Key Operational Challenges', 'Risk Assessment');

            slideChallenges.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                x: 0.5, y: 1.3, w: 9.0, h: 3.8, fill: { color: colorWhite }, line: { color: 'E2E8F0', width: 1 }
            });

            slideChallenges.addText('IDENTIFIED BOTTLENECKS & RISKS', {
                x: 0.8, y: 1.6, w: 8.4, h: 0.3, fontSize: 10, bold: true, color: 'DC2626', tracking: 1
            });

            // List challenges in a structured large font view
            const challengesList = customChallenges.map((item, idx) => {
                return `[Risk ${idx + 1}]  ${item}`;
            }).join('\n\n');

            slideChallenges.addText(challengesList || 'No high-risk operational bottlenecks identified for the selected scope.', {
                x: 0.8, y: 2.1, w: 8.4, h: 2.6, fontSize: 11, bold: true, color: colorTextDark, lineSpacing: 8
            });


            // SLIDE 6: Future Roadmap & Action Plan
            const slideRoadmap = pptx.addSlide();
            addSlideHeader(slideRoadmap, 'Strategic Roadmap & Action Plan', 'Strategic Roadmaps');

            slideRoadmap.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                x: 0.5, y: 1.3, w: 9.0, h: 3.8, fill: { color: colorWhite }, line: { color: 'E2E8F0', width: 1 }
            });

            slideRoadmap.addText('RECOMMENDED CORRECTIVE ACTIONS', {
                x: 0.8, y: 1.6, w: 8.4, h: 0.3, fontSize: 10, bold: true, color: '059669', tracking: 1
            });

            // List future actions
            const actionsList = customFuturePlans.map((item, idx) => {
                return `✔  ${item}`;
            }).join('\n\n');

            slideRoadmap.addText(actionsList || 'Sustain baseline operational standards and monitor metrics weekly.', {
                x: 0.8, y: 2.1, w: 8.4, h: 2.6, fontSize: 11, bold: true, color: colorTextDark, lineSpacing: 8
            });

            // Save Presentation
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
    const totalPreviewSlides = 6;

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

                                {/* Slide 5: Strategic Challenges */}
                                {activePreviewSlide === 5 && (
                                    <div className="w-full h-full bg-slate-50 dark:bg-slate-950 p-4 flex flex-col justify-between font-sans">
                                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-1">
                                            <span className="text-[9px] font-black text-red-650">4. KEY OPERATIONAL CHALLENGES</span>
                                            <span className="text-[8px] text-gray-400">Risk Assessment</span>
                                        </div>

                                        <div className="my-auto px-2 space-y-1.5">
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

                                {/* Slide 6: Future Roadmap */}
                                {activePreviewSlide === 6 && (
                                    <div className="w-full h-full bg-slate-50 dark:bg-slate-950 p-4 flex flex-col justify-between font-sans">
                                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-1">
                                            <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400">5. ACTION PLAN ROADMAP</span>
                                            <span className="text-[8px] text-gray-400">Strategic Roadmap</span>
                                        </div>

                                        <div className="my-auto px-2 space-y-1.5">
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
                                
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5, 6].map(i => (
                                        <button
                                            key={i}
                                            onClick={() => setActivePreviewSlide(i)}
                                            className={`w-2.5 h-2.5 rounded-full ${activePreviewSlide === i ? 'bg-teal-700' : 'bg-slate-300 dark:bg-slate-700'}`}
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
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviewMeeting;
