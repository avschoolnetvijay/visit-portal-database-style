import React, { useState, useEffect, useMemo } from 'react';
import { Icons } from './Icons';
import { exportToExcel, exportMultiSheetToExcel, formatDate, parseDateRobust, getMonthsInRange } from '../utils';

const PlanView = ({ data, allVisits = [], manpower = [], jhpmsLab = [], edustat = [], edustatMaster = [], schools = [], startDate, endDate }) => {
    // 1. Dynamic Months within selected QPR date range
    const planningMonths = useMemo(() => {
        const list = [];
        const start = parseDateRobust(startDate);
        const end = parseDateRobust(endDate);
        if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return [];
        
        let curr = new Date(start.getFullYear(), start.getMonth(), 1);
        const endLimit = new Date(end.getFullYear(), end.getMonth(), 1);
        while (curr <= endLimit) {
            const label = curr.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            const value = curr.toISOString().substring(0, 7); // YYYY-MM
            list.push({ label, value });
            curr.setMonth(curr.getMonth() + 1);
        }
        return list;
    }, [startDate, endDate]);

    const [selectedPlanningMonth, setSelectedPlanningMonth] = useState('');

    useEffect(() => {
        if (planningMonths.length > 0) {
            const todayYYYYMM = new Date().toISOString().substring(0, 7);
            const found = planningMonths.find(m => m.value === todayYYYYMM);
            setSelectedPlanningMonth(found ? found.value : planningMonths[0].value);
        } else {
            setSelectedPlanningMonth('');
        }
    }, [planningMonths]);

    const durationMonths = useMemo(() => {
        return getMonthsInRange(startDate, endDate) || 1;
    }, [startDate, endDate]);

    // Capacity is fixed at 40 visits per coordinator per month
    const maxVisitsCapacity = 40;

    const [selectedSlot, setSelectedSlot] = useState('All'); // 'All', 'Week 1', 'Week 2', etc.
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    // Expandable check-list drawers dictionary mapping UDISE code -> boolean
    const [expandedUdise, setExpandedUdise] = useState(null);
    
    // Checklist progress dictionary mapping UDISE code -> object { [taskIndex]: boolean }
    const [checklistState, setChecklistState] = useState({});

    // Success feedback trigger state for WhatsApp clipboard copying
    const [copiedUdise, setCopiedUdise] = useState(null);

    // Helper function to extract keys case-insensitively
    const getValLocal = (row, keyMatch) => {
        if (!row) return null;
        const key = Object.keys(row).find(k => k.toLowerCase().includes(keyMatch.toLowerCase()));
        return key ? row[key] : null;
    };

    // Helper function to clean UDISE codes
    const cleanUdiseLocal = (val) => {
        if (!val) return '';
        let s = String(val).replace(/["']/g, '').trim();
        if (s.endsWith('.0')) {
            s = s.substring(0, s.length - 2);
        }
        return s;
    };

    // Helper function to format Date object to YYYY-MM-DD
    const formatDateToYYYYMMDD = (d) => {
        if (!d || isNaN(d.getTime())) return '';
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    // Normalize manpower roster to extract active/vacant CC statuses
    const manpowerMap = useMemo(() => {
        const map = {};
        (manpower || []).forEach(m => {
            const rawUdise = m.udise || m.udise_code || getValLocal(m, 'udise') || '';
            const udise = cleanUdiseLocal(rawUdise);
            if (!udise) return;
            const rawStatus = m.status || getValLocal(m, 'status') || '';
            const statusUpper = String(rawStatus).toUpperCase().trim();
            
            let status = 'Active';
            if (statusUpper.includes('RESIGN') || statusUpper.includes('TERMINATE') || statusUpper.includes('VACANT') || !rawStatus) {
                status = 'Vacant';
            }
            const name = String(m.instructorName || m.instructor_name || m.name || getValLocal(m, 'instructor') || '').trim();
            
            if (!map[udise]) map[udise] = { status, name };
            if (status === 'Active') map[udise] = { status, name };
        });
        return map;
    }, [manpower]);

    // Precalculated absolute last visit dates for all schools (ignores range filters to find overall last visit)
    const absoluteLastVisitMap = useMemo(() => {
        const map = {};
        (allVisits || []).forEach(v => {
            const rawUdise = v.udise_code || v.udise || getValLocal(v, 'udise') || '';
            const udise = cleanUdiseLocal(rawUdise);
            if (!udise) return;
            
            const rawDate = v.visit_date || getValLocal(v, 'visit') || getValLocal(v, 'date');
            const dObj = parseDateRobust(rawDate);
            if (dObj && !isNaN(dObj.getTime())) {
                const currentLast = map[udise];
                if (!currentLast || dObj > parseDateRobust(currentLast)) {
                    map[udise] = rawDate;
                }
            }
        });
        return map;
    }, [allVisits]);

    // Precalculated completed visits count in selected QPR date range for all schools
    const rangeVisitsCountMap = useMemo(() => {
        const map = {};
        (allVisits || []).forEach(v => {
            const rawUdise = v.udise_code || v.udise || getValLocal(v, 'udise') || '';
            const udise = cleanUdiseLocal(rawUdise);
            if (!udise) return;
            
            const rawDate = v.visit_date || getValLocal(v, 'visit') || getValLocal(v, 'date');
            const dObj = parseDateRobust(rawDate);
            if (dObj && !isNaN(dObj.getTime())) {
                const dateStr = formatDateToYYYYMMDD(dObj);
                if (dateStr >= startDate && dateStr <= endDate) {
                    map[udise] = (map[udise] || 0) + 1;
                }
            }
        });
        return map;
    }, [allVisits, startDate, endDate]);

    // Precalculated classes logged in selected date range for all schools
    const rangeJhpmsMap = useMemo(() => {
        const map = {};
        (jhpmsLab || []).forEach(j => {
            const rawUdise = j.udise || j.udise_code || getValLocal(j, 'udise') || getValLocal(j, 'udise_code') || '';
            const udise = cleanUdiseLocal(rawUdise);
            if (!udise) return;
            
            const rawDate = j.date || j.Date || getValLocal(j, 'date') || getValLocal(j, 'visit_date');
            const dObj = parseDateRobust(rawDate);
            
            if (dObj && !isNaN(dObj.getTime())) {
                const dateStr = formatDateToYYYYMMDD(dObj);
                if (dateStr >= startDate && dateStr <= endDate) {
                    map[udise] = (map[udise] || 0) + 1;
                }
            }
        });
        return map;
    }, [jhpmsLab, startDate, endDate]);

    // Precalculated usage hours logged in selected date range for all schools
    const rangeEdustatMap = useMemo(() => {
        const map = {};
        (edustat || []).forEach(e => {
            const rawUdise = e.udise || e.udise_code || getValLocal(e, 'udise') || getValLocal(e, 'udise_code') || '';
            const udise = cleanUdiseLocal(rawUdise);
            if (!udise) return;
            
            const rawDate = e.date || e.Date || getValLocal(e, 'date');
            const dObj = parseDateRobust(rawDate);
            
            if (dObj && !isNaN(dObj.getTime())) {
                const dateStr = formatDateToYYYYMMDD(dObj);
                if (dateStr >= startDate && dateStr <= endDate) {
                    const hoursVal = e._hours !== undefined ? e._hours : (e.hours !== undefined ? Number(e.hours) : Number(getValLocal(e, 'hours') || getValLocal(e, 'used') || 0));
                    map[udise] = (map[udise] || 0) + hoursVal;
                }
            }
        });
        return map;
    }, [edustat, startDate, endDate]);

    // Precalculated District Averages for JHPMS classes and Edustat hours
    const districtAverages = useMemo(() => {
        const stats = {};
        
        // Count schools per district
        data.schools.forEach(s => {
            const dist = String(s.district || 'Unknown').trim().toUpperCase();
            if (!stats[dist]) {
                stats[dist] = { schoolCount: 0, totalJhpms: 0, totalEdustat: 0 };
            }
            stats[dist].schoolCount++;
        });

        // Sum JHPMS classes logged for each school in district
        Object.entries(rangeJhpmsMap).forEach(([udise, count]) => {
            const schoolRec = data.schools.find(s => cleanUdiseLocal(s.udise_code) === udise);
            if (schoolRec) {
                const dist = String(schoolRec.district || 'Unknown').trim().toUpperCase();
                if (stats[dist]) {
                    stats[dist].totalJhpms += count;
                }
            }
        });

        // Sum Edustat hours logged for each school in district
        Object.entries(rangeEdustatMap).forEach(([udise, hours]) => {
            const schoolRec = data.schools.find(s => cleanUdiseLocal(s.udise_code) === udise);
            if (schoolRec) {
                const dist = String(schoolRec.district || 'Unknown').trim().toUpperCase();
                if (stats[dist]) {
                    stats[dist].totalEdustat += hours;
                }
            }
        });

        // Compute averages
        const averages = {};
        Object.entries(stats).forEach(([dist, item]) => {
            averages[dist] = {
                avgJhpms: item.schoolCount > 0 ? parseFloat((item.totalJhpms / item.schoolCount).toFixed(1)) : 0,
                avgEdustat: item.schoolCount > 0 ? parseFloat((item.totalEdustat / item.schoolCount).toFixed(1)) : 0
            };
        });

        return averages;
    }, [data.schools, rangeJhpmsMap, rangeEdustatMap]);

    // Build the prioritized school visits roster
    const priorities = useMemo(() => {
        const today = new Date();

        return data.schools.map(s => {
            const udise = cleanUdiseLocal(s.udise_code);
            const target = (s.monthly_target || 1) * durationMonths; // QPR target

            // A. Calculate Absolute Aging (All visits regardless of filters)
            const absLastVisitDate = absoluteLastVisitMap[udise] || null;

            let daysSince = 999;
            if (absLastVisitDate) {
                daysSince = Math.floor((today - parseDateRobust(absLastVisitDate)) / (1000 * 60 * 60 * 24));
            }

            // Weight calculation for Aging (max 30 points)
            let agingScore = 0;
            if (daysSince === 999 || daysSince >= 60) agingScore = 30;
            else if (daysSince >= 45) agingScore = 20;
            else if (daysSince >= 30) agingScore = 10;
            else if (daysSince >= 15) agingScore = 5;

            // B. QPR Target Deficit (max 35 points)
            const completedInPeriod = rangeVisitsCountMap[udise] || 0;
            const deficit = Math.max(0, target - completedInPeriod);
            let deficitScore = 0;
            if (deficit >= 3) deficitScore = 35;
            else if (deficit === 2) deficitScore = 25;
            else if (deficit === 1) deficitScore = 15;

            // C. Manpower Vacancy (max 15 points)
            const mp = manpowerMap[udise] || { status: 'Vacant', name: '-' };
            const isVacant = mp.status === 'Vacant';
            const vacancyScore = isVacant ? 15 : 0;

            // D. Usage & Performance Gap compared to District Averages (max 20 points)
            const schoolJhpms = rangeJhpmsMap[udise] || 0;
            const schoolEdustat = rangeEdustatMap[udise] || 0;
            const distUpper = String(s.district || '').trim().toUpperCase();
            const distAvg = districtAverages[distUpper] || { avgJhpms: 0, avgEdustat: 0 };

            const isLowJhpms = schoolJhpms < distAvg.avgJhpms;
            const isLowEdustat = schoolEdustat < distAvg.avgEdustat;
            const hasUsageGap = isLowJhpms || isLowEdustat;
            const usageGapScore = hasUsageGap ? 10 : 0;

            // Sync Discrepancy (10 points)
            const hasDiscrepancy = (schoolJhpms > 0 && schoolEdustat === 0) || (schoolEdustat > 0 && schoolJhpms === 0);
            const discrepancyScore = hasDiscrepancy ? 10 : 0;

            const totalScore = Math.min(100, agingScore + deficitScore + vacancyScore + usageGapScore + discrepancyScore);

            // E. Dynamic actionable reasons
            const reasons = [];
            if (daysSince === 999) {
                reasons.push("Never visited (No record in history)");
            } else if (daysSince >= 30) {
                reasons.push(`Long overdue (Not visited in ${daysSince} days)`);
            }
            if (deficit > 0) {
                reasons.push(`Target deficit (${deficit} of ${target} visits pending in QPR)`);
            }
            if (isVacant) {
                reasons.push("CC post is vacant");
            }
            if (isLowJhpms) {
                reasons.push(`Low JHPMS classes (${schoolJhpms} vs dist avg: ${distAvg.avgJhpms})`);
            }
            if (isLowEdustat) {
                reasons.push(`Low EduStat hours (${schoolEdustat}h vs dist avg: ${distAvg.avgEdustat}h)`);
            }
            if (hasDiscrepancy) {
                reasons.push("Sync discrepancy detected (JHPMS / EduStat log mismatch)");
            }

            if (reasons.length === 0) {
                reasons.push("Routine verification and baseline audit");
            }

            return {
                ...s,
                daysSince,
                absLastVisitDate,
                deficit,
                completedInPeriod,
                target,
                isVacant,
                isLowJhpms,
                isLowEdustat,
                hasDiscrepancy,
                distAvg,
                schoolJhpms,
                schoolEdustat,
                reasons,
                score: totalScore
            };
        })
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.daysSince - a.daysSince;
        });
    }, [data.schools, absoluteLastVisitMap, rangeVisitsCountMap, manpowerMap, rangeJhpmsMap, rangeEdustatMap, districtAverages, durationMonths]);

    // Curated visit plan contains top schools up to capacity (40 per coordinator), prioritizing by coverage cycle (Round Robin)
    const topPlannedSchools = useMemo(() => {
        const planned = [];
        if (!selectedPlanningMonth) return [];

        // Group priorities by coordinator (visitor_name)
        const ccGroups = {};
        priorities.forEach(s => {
            const visitor = s.visitor_name || 'Unassigned';
            if (!ccGroups[visitor]) ccGroups[visitor] = [];
            ccGroups[visitor].push(s);
        });

        // Process each coordinator group
        Object.entries(ccGroups).forEach(([visitor, schoolsList]) => {
            // Sort by completed visits in range (ascending) to guarantee full coverage, then by priority score (descending), then by daysSince (descending)
            const sorted = [...schoolsList].sort((a, b) => {
                if (a.completedInPeriod !== b.completedInPeriod) {
                    return a.completedInPeriod - b.completedInPeriod; // Coverage cycle priority
                }
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                return b.daysSince - a.daysSince; // Tie-breaker: higher aging first
            });

            // Take up to 40 schools max
            const selected = sorted.slice(0, 40);

            // Map to Weeks 1-4 (10 schools per week)
            selected.forEach((school, index) => {
                const weekNum = Math.floor(index / 10) + 1; // 10 schools per week
                planned.push({
                    ...school,
                    planningSlot: `Week ${weekNum}`,
                    overallRank: index + 1
                });
            });
        });

        // Sort overall planned schools by visitor_name, then planningSlot, then overallRank
        return planned.sort((a, b) => {
            const ccA = a.visitor_name || 'Unassigned';
            const ccB = b.visitor_name || 'Unassigned';
            if (ccA !== ccB) return ccA.localeCompare(ccB);
            return a.planningSlot.localeCompare(b.planningSlot);
        });
    }, [priorities, selectedPlanningMonth]);

    const uniqueCoordinatorsCount = useMemo(() => {
        const visitors = new Set(priorities.map(s => s.visitor_name || 'Unassigned'));
        return visitors.size;
    }, [priorities]);

    // Slots are always Weeks 1-4 for the chosen month
    const slotOptions = useMemo(() => {
        return ['All', 'Week 1', 'Week 2', 'Week 3', 'Week 4'];
    }, []);

    // Calculate range coverage statistics from priorities list
    const coverageStats = useMemo(() => {
        const stats = {
            totalAllotted: priorities.length,
            v0: 0,
            v1: 0,
            v2: 0,
            v3: 0,
            vMore: 0
        };
        priorities.forEach(p => {
            const count = p.completedInPeriod || 0;
            if (count === 0) stats.v0++;
            else if (count === 1) stats.v1++;
            else if (count === 2) stats.v2++;
            else if (count === 3) stats.v3++;
            else stats.vMore++;
        });
        return stats;
    }, [priorities]);

    // Grouping Top schools in plan by District/Block to optimize travel
    const blockClusters = useMemo(() => {
        const clusters = {};
        topPlannedSchools.forEach(s => {
            const key = `${s.district} / ${s.block}`;
            if (!clusters[key]) clusters[key] = 0;
            clusters[key]++;
        });
        return Object.entries(clusters)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [topPlannedSchools]);

    // Count of vacant manpower schools inside our planned roster
    const vacancyCountInPlan = useMemo(() => {
        return topPlannedSchools.filter(s => s.isVacant).length;
    }, [topPlannedSchools]);

    // Filter Top list by Slot selection
    const filteredTopSchools = useMemo(() => {
        if (selectedSlot === 'All') return topPlannedSchools;
        return topPlannedSchools.filter(s => s.planningSlot === selectedSlot);
    }, [topPlannedSchools, selectedSlot]);

    // Reset slot filter and page when range parameters change
    useEffect(() => {
        setSelectedSlot('All');
        setCurrentPage(1);
    }, [startDate, endDate, selectedPlanningMonth]);

    const totalPages = rowsPerPage === -1 ? 1 : Math.ceil(filteredTopSchools.length / rowsPerPage);
    const activePage = Math.min(currentPage, totalPages) || 1;
    const startIdx = rowsPerPage === -1 ? 0 : (activePage - 1) * rowsPerPage;

    const paginatedSchools = useMemo(() => {
        if (rowsPerPage === -1) return filteredTopSchools;
        return filteredTopSchools.slice(startIdx, startIdx + rowsPerPage);
    }, [filteredTopSchools, startIdx, rowsPerPage]);

    // Get color code and labels based on score bounds
    const getPriorityDetails = (score) => {
        if (score >= 85) return { label: 'CRITICAL', color: 'bg-rose-600 shadow-rose-100 dark:bg-rose-700', action: '🚨 Urgent Inspection Required' };
        if (score >= 50) return { label: 'HIGH', color: 'bg-amber-600 shadow-amber-100 dark:bg-amber-700', action: '⚠️ High Risk: Schedule soon' };
        return { label: 'MEDIUM', color: 'bg-teal-650 shadow-teal-100 dark:bg-teal-700', action: 'Routine Visit Planning' };
    };

    // Helper to resolve slot badge color dynamically
    const getSlotBadgeColor = (slot) => {
        if (slot.includes('1')) return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/20 dark:text-cyan-400';
        if (slot.includes('2')) return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/20 dark:text-indigo-400';
        if (slot.includes('3')) return 'bg-purple-100 text-purple-800 dark:bg-purple-950/20 dark:text-purple-400';
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400';
    };

    // Copy formatted visit details to clipboard for direct WhatsApp sharing
    const handleCopyWhatsApp = (school) => {
        const text = `*🏫 SCHOOL VISIT BRIEF: ${school.school_name}*\n` +
                     `*UDISE Code:* ${school.udise_code}\n` +
                     `*Block/District:* ${school.block} / ${school.district}\n` +
                     `*Assigned Visitor:* ${school.visitor_name || 'Unassigned'}\n` +
                     `*Priority Rank & Score:* ${school.score} pts (${getPriorityDetails(school.score).label})\n` +
                     `*Scheduled Slot:* ${school.planningSlot}\n` +
                     `*Days Since Last Visit:* ${school.daysSince === 999 ? 'Never visited' : `${school.daysSince} days`}\n\n` +
                     `*Why this school is prioritized?*\n` +
                     school.reasons.map((r, i) => `  ${i + 1}. ${r}`).join('\n') + `\n\n` +
                     `_Please conduct a thorough inspection of the logs, staffing vacancy, or device usage during this trip._`;
        
        navigator.clipboard.writeText(text);
        setCopiedUdise(school.udise_code);
        setTimeout(() => setCopiedUdise(null), 2000);
    };

    // Toggle checklists locally
    const handleToggleChecklist = (udise, index) => {
        setChecklistState(prev => {
            const schoolState = prev[udise] || {};
            return {
                ...prev,
                [udise]: {
                    ...schoolState,
                    [index]: !schoolState[index]
                }
            };
        });
    };

    const handleExportExcel = () => {
        const mapSchoolRow = (s) => ({
            "Rank": s.overallRank,
            "Scheduled Slot": s.planningSlot,
            "School Name": s.school_name,
            "UDISE Code": s.udise_code,
            "District": s.district,
            "Block": s.block,
            "Assigned Visitor": s.visitor_name || 'Unassigned',
            "Priority Score": s.score,
            "Abs Days Since Last Visit": s.daysSince === 999 ? 'Never' : s.daysSince,
            "Absolute Last Visit Date": s.absLastVisitDate ? formatDate(s.absLastVisitDate) : 'Never',
            "Ict Instructor": s.isVacant ? 'Vacant' : 'Active',
            "Pending visit in this QPR": s.deficit,
            "JHPMS Classes": s.schoolJhpms,
            "EduStat Hours": s.schoolEdustat,
            "District JHPMS Avg": s.distAvg.avgJhpms,
            "District EduStat Avg": s.distAvg.avgEdustat,
            "Action Plan": s.reasons.join('\n')
        });

        // Format selected month name (e.g. 2026-08 -> Aug-2026)
        let monthStr = 'Plan';
        if (selectedPlanningMonth) {
            const parts = selectedPlanningMonth.split('-');
            if (parts.length >= 2) {
                const year = parts[0];
                const monthIdx = parseInt(parts[1], 10) - 1;
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                if (monthIdx >= 0 && monthIdx < 12) {
                    monthStr = `${monthNames[monthIdx]}-${year}`;
                }
            }
        }

        // Get CC name list
        const uniqueCCs = Array.from(new Set(topPlannedSchools.map(s => s.visitor_name || 'Unassigned')));

        if (uniqueCCs.length <= 1) {
            // Single CC Export
            const ccName = uniqueCCs[0] || 'Unassigned';
            const excelData = topPlannedSchools.map(s => mapSchoolRow(s));
            const ccSuffixClean = ccName.replace(/\s+/g, '_');
            exportToExcel(excelData, `Visit_Plan_${monthStr}_${ccSuffixClean}`);
        } else {
            // Multiple CC Export -> Generate multiple sheets
            const sheetsArray = uniqueCCs.map(ccName => {
                const ccSchools = topPlannedSchools.filter(s => (s.visitor_name || 'Unassigned') === ccName);
                const sheetData = ccSchools.map(s => mapSchoolRow(s));
                return {
                    name: ccName,
                    data: sheetData
                };
            });

            exportMultiSheetToExcel(sheetsArray, `Visit_Plan_${monthStr}_All_Coordinators`);
        }
    };

    return (
        <div className="p-3 h-full flex flex-col animate-fade-in">
            {/* Top Config & Filters Banner */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 mb-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 no-print">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-teal-50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-400 rounded-xl">
                        <Icons.Plan className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Team QPR Visit Planner</h2>
                        <p className="text-[11.5px] text-slate-400 font-medium mt-0.5">Weighted Priority Engine • Round-Robin Coverage Plan</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Planning Month Selection */}
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Target Month:</label>
                        <select
                            value={selectedPlanningMonth}
                            onChange={(e) => {
                                setSelectedPlanningMonth(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-750 dark:text-slate-300 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 cursor-pointer shadow-sm"
                        >
                            {planningMonths.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-805 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-2 shadow-sm text-xs font-bold text-slate-750 dark:text-slate-300">
                        <span className="text-slate-400 uppercase tracking-wider text-[10px] font-black mr-1">QPR Period:</span>
                        <span>{formatDate(startDate)}</span>
                        <span className="text-slate-350 mx-1">to</span>
                        <span>{formatDate(endDate)}</span>
                        <span className="ml-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                            {durationMonths} {durationMonths === 1 ? 'Month' : 'Months'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Dashboard Overview Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4 no-print">
                {/* Card 1: Capacity Status */}
                <div className="portal-card bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-teal-500/10 text-teal-650 rounded-xl shrink-0">
                        <Icons.Trophy className="w-6 h-6" />
                    </div>
                    <div className="text-left min-w-0">
                        <div className="text-[9px] font-bold text-slate-450 uppercase tracking-wider font-sans truncate">Planned Visits ({selectedPlanningMonth ? planningMonths.find(m=>m.value===selectedPlanningMonth)?.label.split(' ')[0] : ''})</div>
                        <div className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5 truncate">{topPlannedSchools.length} Visits</div>
                        <div className="text-[9px] text-slate-400 mt-1 font-semibold">Max Cap: 40 per CC ({40 * uniqueCoordinatorsCount} total)</div>
                    </div>
                </div>

                {/* Card 2: Allotted Schools */}
                <div className="portal-card bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-xl shrink-0">
                        <Icons.Compliance className="w-6 h-6" />
                    </div>
                    <div className="text-left min-w-0">
                        <div className="text-[9px] font-bold text-slate-455 uppercase tracking-wider font-sans truncate">Allotted Schools</div>
                        <div className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5 truncate">{coverageStats.totalAllotted} Schools</div>
                        <div className="text-[9px] text-slate-400 mt-1 font-semibold">Coordinating scope</div>
                    </div>
                </div>

                {/* Card 3: Roster Vacancies */}
                <div className="portal-card bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-855 p-4 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-rose-500/10 text-rose-650 rounded-xl shrink-0">
                        <Icons.Users className="w-6 h-6" />
                    </div>
                    <div className="text-left min-w-0">
                        <div className="text-[9px] font-bold text-slate-455 uppercase tracking-wider font-sans truncate">CC Vacancies (Plan)</div>
                        <div className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5 truncate">{vacancyCountInPlan} Schools</div>
                        <div className="text-[9px] text-slate-400 mt-1 font-semibold">Focus mobilization</div>
                    </div>
                </div>

                {/* Card 4: Route Clusters */}
                <div className="portal-card bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-855 p-4 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-cyan-500/10 text-cyan-600 rounded-xl shrink-0">
                        <Icons.ExecutiveClipboard className="w-6 h-6" />
                    </div>
                    <div className="text-left min-w-0 flex-1">
                        <div className="text-[9px] font-bold text-slate-455 uppercase tracking-wider font-sans truncate">Route Clusters</div>
                        <div className="text-[10px] font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
                            {blockClusters.slice(0, 2).map((bc, i) => (
                                <span key={i} className="inline-block bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 px-1 py-0.5 rounded mr-1 text-[8.5px] text-slate-600 dark:text-slate-400">
                                    {bc.name.split(' / ')[1] || bc.name}: <strong className="text-teal-700 dark:text-teal-400 font-extrabold">{bc.count}</strong>
                                </span>
                            ))}
                            {blockClusters.length === 0 && <span className="text-slate-400">None</span>}
                        </div>
                    </div>
                </div>

                {/* Card 5: QPR Coverage Distribution */}
                <div className="portal-card bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-855 p-3 rounded-2xl shadow-sm flex flex-col justify-between h-full">
                    <div className="text-left w-full">
                        <div className="text-[9px] font-bold text-slate-455 uppercase tracking-wider font-sans mb-1.5 truncate">QPR Coverage (Visits)</div>
                        <div className="grid grid-cols-5 gap-0.5 text-center">
                            <div className="bg-slate-50 dark:bg-slate-850 py-1 rounded border dark:border-slate-700/50">
                                <div className="text-[10px] font-black text-rose-600">{coverageStats.v0}</div>
                                <div className="text-[7.5px] font-bold text-slate-400 mt-0.5">0 Vis</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-850 py-1 rounded border dark:border-slate-700/50">
                                <div className="text-[10px] font-black text-teal-650">{coverageStats.v1}</div>
                                <div className="text-[7.5px] font-bold text-slate-400 mt-0.5">1 Vis</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-850 py-1 rounded border dark:border-slate-700/50">
                                <div className="text-[10px] font-black text-indigo-650">{coverageStats.v2}</div>
                                <div className="text-[7.5px] font-bold text-slate-400 mt-0.5">2 Vis</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-850 py-1 rounded border dark:border-slate-700/50">
                                <div className="text-[10px] font-black text-purple-650">{coverageStats.v3}</div>
                                <div className="text-[7.5px] font-bold text-slate-400 mt-0.5">3 Vis</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-850 py-1 rounded border dark:border-slate-700/50">
                                <div className="text-[10px] font-black text-amber-600">{coverageStats.vMore}</div>
                                <div className="text-[7.5px] font-bold text-slate-400 mt-0.5">3+ Vis</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Roster Container */}
            <div className="portal-card flex-1 bg-white/95 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl rounded-2xl overflow-hidden flex flex-col min-h-0">
                <div className="portal-card-header bg-gradient-to-r from-teal-850 to-cyan-900 flex justify-between items-center text-white py-3.5 px-6 font-semibold shrink-0">
                    <div className="flex items-center gap-2">
                        <Icons.Plan className="w-5 h-5 text-teal-300 animate-pulse" />
                        <span>Weighted Priority Visit Plan ({topPlannedSchools.length} Targeted)</span>
                    </div>
                    <button
                        onClick={handleExportExcel}
                        className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition duration-200"
                    >
                        <Icons.Export className="w-4 h-4 text-teal-200" /> EXPORT EXCEL LIST
                    </button>
                </div>

                {/* Info & Calculation Banner */}
                <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-150 dark:border-slate-800 p-3 px-6 text-xs text-slate-500 dark:text-slate-400 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 shrink-0">
                    <div className="text-left leading-normal">
                        ℹ️ <strong className="text-slate-700 dark:text-slate-350">QPR Scheduling Logic:</strong> Priorities use a coverage-first algorithm (0-visits cycle prioritized first), sub-ordered by risk score: **Absolute Aging** (30 pts), **QPR Target Deficit** (35 pts), **CC Vacancy** (15 pts), **District Usage Gap** (10 pts), and **JHPMS/EduStat Sync Discrepancy** (10 pts).
                    </div>
                </div>

                {/* Weekly Scheduler Tabs Bar */}
                <div className="bg-white dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800 px-6 py-2 flex items-center justify-between gap-4 shrink-0 overflow-x-auto no-print">
                    <div className="flex gap-1.5 select-none">
                        {slotOptions.map((slot) => {
                            const count = slot === 'All' ? topPlannedSchools.length : topPlannedSchools.filter(s => s.planningSlot === slot).length;
                            const isSelected = selectedSlot === slot;
                            return (
                                <button
                                    key={slot}
                                    onClick={() => setSelectedSlot(slot)}
                                    className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-colors flex items-center gap-1.5 ${
                                        isSelected
                                            ? 'bg-teal-650 text-white'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-855 dark:text-slate-300 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <span>{slot}</span>
                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                                        isSelected ? 'bg-teal-750 text-teal-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-440'
                                    }`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Table Roster View */}
                <div className="overflow-auto flex-1 p-4">
                    <table className="w-full text-xs text-left portal-table rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                        <thead className="sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 bg-slate-50 dark:bg-slate-855 font-extrabold text-slate-500 uppercase tracking-wider text-center w-14">Rank</th>
                                <th className="px-4 py-3 bg-slate-50 dark:bg-slate-855 font-extrabold text-slate-500 uppercase tracking-wider text-center w-24">Slot</th>
                                <th className="px-4 py-3 bg-slate-50 dark:bg-slate-855 font-extrabold text-slate-500 uppercase tracking-wider w-[240px]">School Details</th>
                                <th className="px-4 py-3 bg-slate-50 dark:bg-slate-855 font-extrabold text-slate-500 uppercase tracking-wider w-[200px]">Assigned CC / Block</th>
                                <th className="px-4 py-3 bg-slate-50 dark:bg-slate-855 font-extrabold text-slate-500 uppercase tracking-wider">Action Plan</th>
                                <th className="px-4 py-3 bg-slate-50 dark:bg-slate-855 font-extrabold text-slate-500 uppercase tracking-wider text-center w-36 no-print">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/50">
                            {paginatedSchools.map((s, i) => {
                                const rank = startIdx + i + 1;
                                const details = getPriorityDetails(s.score);
                                const uniqueKey = `${s.udise_code}-${s.planningSlot}`;
                                const isRowExpanded = expandedUdise === uniqueKey;

                                // Custom checklist tasks based on issues
                                const schoolChecklist = [
                                    ...(s.isVacant ? ["Conduct CC candidate mobilization & coordinate deployment status"] : []),
                                    ...(s.daysSince >= 30 || s.daysSince === 999 ? ["Conduct full site hardware audits (system, screens, connectivity)"] : []),
                                    ...(s.isLowJhpms ? [`Investigate low JHPMS usage (${s.schoolJhpms} classes vs district avg ${s.distAvg.avgJhpms})`] : []),
                                    ...(s.isLowEdustat ? [`Investigate low EduStat hours (${s.schoolEdustat}h vs district avg ${s.distAvg.avgEdustat}h)`] : []),
                                    ...(s.hasDiscrepancy ? ["Verify JHPMS class logger vs EduStat local client sync logs to resolve discrepancy"] : []),
                                    "Conduct general visitor validation and log standard audit entry"
                                ];

                                const checkedTasks = checklistState[s.udise_code] || {};
                                const completedCount = schoolChecklist.filter((_, idx) => checkedTasks[idx]).length;
                                const pctVal = Math.round((completedCount / schoolChecklist.length) * 100);

                                return (
                                    <React.Fragment key={uniqueKey}>
                                        <tr className={`hover:bg-slate-50/40 dark:hover:bg-slate-850/10 transition-colors ${
                                            s.score >= 85 ? 'bg-rose-50/20 dark:bg-rose-950/5' : ''
                                        }`}>
                                            <td className="px-4 py-3.5 text-center font-black text-slate-455">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xs">{rank}</span>
                                                    <span className="text-[9px] text-slate-400 font-bold mt-0.5">({s.score} pts)</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wide ${getSlotBadgeColor(s.planningSlot)}`}>
                                                    {s.planningSlot}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-left">
                                                <div className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[220px]" title={s.school_name}>
                                                    {s.school_name}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px] text-slate-450">
                                                    <span>UDISE: {s.udise_code}</span>
                                                    <span>•</span>
                                                    <span className="bg-slate-100 dark:bg-slate-800 px-1 rounded font-sans text-[8.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{s.project_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-left">
                                                <div className="font-semibold text-teal-800 dark:text-teal-450 truncate max-w-[180px]" title={s.visitor_name || 'Unassigned'}>
                                                    👤 {s.visitor_name || 'Unassigned'}
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-1 font-medium">
                                                    {s.district} / {s.block}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-left">
                                                <div className="flex flex-wrap gap-1.5">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black text-white shrink-0 shadow-sm ${details.color}`}>
                                                        {details.label}
                                                    </span>
                                                    
                                                    {/* Custom Indicator Badges */}
                                                    {s.daysSince === 999 && (
                                                        <span className="inline-flex items-center gap-0.5 bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-450 border border-rose-200 dark:border-rose-900/30 px-2 py-0.5 rounded-full text-[9px] font-bold shadow-sm">
                                                            🚨 Never Visited
                                                        </span>
                                                    )}
                                                    {s.daysSince >= 30 && s.daysSince !== 999 && (
                                                        <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-705 dark:bg-amber-950/20 dark:text-amber-450 border border-amber-205 dark:border-amber-900/30 px-2 py-0.5 rounded-full text-[9px] font-bold shadow-sm">
                                                            ⏳ Aging: {s.daysSince}d
                                                        </span>
                                                    )}
                                                    {s.deficit > 0 && (
                                                        <span className="inline-flex items-center gap-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/30 px-2 py-0.5 rounded-full text-[9px] font-bold shadow-sm">
                                                            📊 Deficit: {s.deficit} / {s.target}
                                                        </span>
                                                    )}
                                                    {s.isVacant && (
                                                        <span className="inline-flex items-center gap-0.5 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/30 px-2 py-0.5 rounded-full text-[9px] font-bold shadow-sm">
                                                            👤 Staff Vacant
                                                        </span>
                                                    )}
                                                    {s.isLowJhpms && (
                                                        <span className="inline-flex items-center gap-0.5 bg-pink-50 text-pink-700 dark:bg-pink-950/20 dark:text-pink-405 border border-pink-200 dark:border-pink-900/30 px-2 py-0.5 rounded-full text-[9px] font-bold shadow-sm" title={`JHPMS Classes: ${s.schoolJhpms} (District Avg: ${s.distAvg.avgJhpms})`}>
                                                            📉 Low JHPMS ({s.schoolJhpms} vs {s.distAvg.avgJhpms})
                                                        </span>
                                                    )}
                                                    {s.isLowEdustat && (
                                                        <span className="inline-flex items-center gap-0.5 bg-yellow-50 text-yellow-705 dark:bg-yellow-950/20 dark:text-yellow-450 border border-yellow-200 dark:border-yellow-900/30 px-2 py-0.5 rounded-full text-[9px] font-bold shadow-sm" title={`EduStat Hours: ${s.schoolEdustat} (District Avg: ${s.distAvg.avgEdustat})`}>
                                                            💻 Low EduStat ({s.schoolEdustat}h vs {s.distAvg.avgEdustat}h)
                                                        </span>
                                                    )}
                                                    {s.hasDiscrepancy && (
                                                        <span className="inline-flex items-center gap-0.5 bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-450 border border-orange-200 dark:border-orange-900/30 px-2 py-0.5 rounded-full text-[9px] font-bold shadow-sm">
                                                            ⚠️ Sync Discrepancy
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-center no-print">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleCopyWhatsApp(s)}
                                                        className={`p-1.5 rounded-lg border shadow-sm transition text-xs font-bold ${
                                                            copiedUdise === s.udise_code
                                                                ? 'bg-emerald-100 text-emerald-850 border-emerald-300 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                                                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-205 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-750'
                                                        }`}
                                                        title="Copy WhatsApp Brief"
                                                    >
                                                        {copiedUdise === s.udise_code ? 'Copied ✓' : '📲 Share'}
                                                    </button>

                                                    <button
                                                        onClick={() => setExpandedUdise(isRowExpanded ? null : uniqueKey)}
                                                        className={`p-1.5 rounded-lg border shadow-sm transition text-xs font-bold ${
                                                            isRowExpanded
                                                                ? 'bg-teal-650 text-white border-teal-700'
                                                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-205 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-750'
                                                        }`}
                                                    >
                                                        {isRowExpanded ? 'Close ↑' : '📋 Tasks'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expandable Field Checklist Drawer */}
                                        {isRowExpanded && (
                                            <tr>
                                                <td colSpan="6" className="bg-slate-50/50 dark:bg-slate-900/10 p-4 border-t border-slate-100 dark:border-slate-800">
                                                    <div className="flex flex-col md:flex-row gap-5 items-start justify-between">
                                                        {/* Tasks check list */}
                                                        <div className="flex-1 text-left w-full">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <Icons.Compliance className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                                                <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">Field Visit Audit Checklist</h4>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {schoolChecklist.map((task, idx) => {
                                                                    const isChecked = !!checkedTasks[idx];
                                                                    return (
                                                                        <label key={idx} className="flex items-start gap-2.5 p-2 bg-white dark:bg-slate-850 rounded-lg border border-slate-150 dark:border-slate-800 shadow-sm hover:border-teal-450 dark:hover:border-teal-900/50 cursor-pointer select-none transition">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                onChange={() => handleToggleChecklist(s.udise_code, idx)}
                                                                                className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 focus:ring-opacity-25 w-3.5 h-3.5 border-slate-350 dark:border-slate-700 cursor-pointer bg-white"
                                                                            />
                                                                            <span className={`text-[11px] leading-tight font-medium ${
                                                                                isChecked ? 'line-through text-slate-400 dark:text-slate-500 font-normal' : 'text-slate-700 dark:text-slate-300'
                                                                            }`}>
                                                                                {task}
                                                                            </span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* Task Progress & share metrics card */}
                                                        <div className="w-full md:w-64 bg-white dark:bg-slate-855 border border-slate-150 dark:border-slate-800 rounded-xl p-4 shadow-sm text-left shrink-0 self-stretch flex flex-col justify-between">
                                                            <div>
                                                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Visit Checklist Progress</span>
                                                                <div className="flex items-end gap-2 mt-1">
                                                                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{pctVal}%</span>
                                                                    <span className="text-xs font-bold text-slate-400 mb-1">({completedCount} of {schoolChecklist.length} done)</span>
                                                                </div>
                                                                {/* Progress Bar */}
                                                                <div className="w-full bg-slate-105 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden mt-3 shadow-inner">
                                                                    <div
                                                                        className="h-full bg-teal-600 rounded-full transition-all duration-300"
                                                                        style={{ width: `${pctVal}%` }}
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-855">
                                                                <div className="text-[10px] text-slate-450 font-bold mb-1 uppercase tracking-wide">QPR & District Metrics</div>
                                                                <div className="text-[10px] text-slate-650 dark:text-slate-350 font-semibold space-y-1">
                                                                    <div>📊 QPR Target: <span className="font-bold text-slate-850 dark:text-slate-200">{s.target} visits ({s.completedInPeriod} completed)</span></div>
                                                                    <div>📉 JHPMS Classes: <span className="font-bold text-slate-850 dark:text-slate-200">{s.schoolJhpms} (District Avg: {s.distAvg.avgJhpms})</span></div>
                                                                    <div>💻 EduStat Hours: <span className="font-bold text-slate-850 dark:text-slate-200">{s.schoolEdustat}h (District Avg: {s.distAvg.avgEdustat}h)</span></div>
                                                                    <div>🗓️ Last Visited: <span className="font-bold text-slate-850 dark:text-slate-200">{s.absLastVisitDate ? formatDate(s.absLastVisitDate) : 'Never'}</span></div>
                                                                    <div>⚙️ Composite Rating: <span className={`font-black ${s.compositeScore < 40 ? 'text-rose-650' : 'text-teal-700 dark:text-teal-400'}`}>{s.compositeScore !== undefined ? `${Math.round(s.compositeScore)}%` : 'N/A'}</span></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            {filteredTopSchools.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="text-center p-12 text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/30">
                                        <Icons.Compliance className="w-12 h-12 text-teal-500/20 mx-auto mb-3" />
                                        <span className="text-sm font-semibold text-slate-500 block">No schools matched filters</span>
                                        <span className="text-xs text-slate-400 italic mt-1 block">Adjust selected week or sidebar filters.</span>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Roster Footer */}
                <div className="px-4 py-3 border-t border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 no-print">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span>Rows per page:</span>
                            <select
                                value={rowsPerPage}
                                onChange={(e) => {
                                    setRowsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-700 dark:text-slate-350 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 cursor-pointer shadow-sm"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={40}>40 (All)</option>
                                <option value={-1}>All Matches</option>
                            </select>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {filteredTopSchools.length > 0 ? (
                                `Showing ${startIdx + 1}–${Math.min(startIdx + (rowsPerPage === -1 ? filteredTopSchools.length : rowsPerPage), filteredTopSchools.length)} of ${filteredTopSchools.length} targeted schools`
                            ) : (
                                'Showing 0–0 of 0'
                            )}
                        </div>
                    </div>
                    
                    {totalPages > 1 && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={activePage === 1}
                                className="p-1 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold shadow-sm"
                                title="First Page"
                            >
                                «
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={activePage === 1}
                                className="p-1 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold shadow-sm"
                                title="Previous Page"
                            >
                                ‹
                            </button>
                            <span className="px-3 py-1 text-xs font-bold text-teal-800 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/20 rounded-md border border-teal-100 dark:border-teal-900/30">
                                Page {activePage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={activePage === totalPages}
                                className="p-1 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold shadow-sm"
                                title="Next Page"
                            >
                                ›
                            </button>
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={activePage === totalPages}
                                className="p-1 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold shadow-sm"
                                title="Last Page"
                            >
                                »
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlanView;
