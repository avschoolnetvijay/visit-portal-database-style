import React, { useState, useEffect, useMemo } from 'react';
import { Icons } from './Icons';
import { exportToExcel, formatDate } from '../utils';

const PlanView = ({ data, allVisits = [], manpower = [], jhpmsLab = [], edustat = [], edustatMaster = [], schools = [], startDate, endDate }) => {
    // 1. Month Picker State setup
    const monthOptions = useMemo(() => {
        const options = [];
        const today = new Date();
        // Generate the last 9 months and next 3 months to provide a robust selection scope
        for (let i = -9; i <= 2; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            options.push({
                label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
                value: `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`,
                year: d.getFullYear(),
                monthIndex: d.getMonth()
            });
        }
        return options;
    }, []);

    const defaultMonth = useMemo(() => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}`;
    }, []);

    const [selectedMonthStr, setSelectedMonthStr] = useState(() => {
        // Fallback to first available if defaultMonth is somehow out of options
        return monthOptions.some(o => o.value === defaultMonth) ? defaultMonth : monthOptions[0]?.value;
    });

    const [selectedWeek, setSelectedWeek] = useState('All'); // 'All', 'Week 1', 'Week 2', 'Week 3', 'Week 4'
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    // Expandable check-list drawers dictionary mapping UDISE code -> boolean
    const [expandedUdise, setExpandedUdise] = useState(null);
    
    // Checklist progress dictionary mapping UDISE code -> object { [taskIndex]: boolean }
    const [checklistState, setChecklistState] = useState({});

    // Success feedback trigger state for WhatsApp clipboard copying
    const [copiedUdise, setCopiedUdise] = useState(null);

    // Normalize manpower roster to extract active/vacant CC statuses
    const manpowerMap = useMemo(() => {
        const map = {};
        (manpower || []).forEach(m => {
            const rawUdise = m.udise || m.udise_code || '';
            const udise = String(rawUdise).trim();
            if (!udise) return;
            const rawStatus = m.status || '';
            const statusUpper = String(rawStatus).toUpperCase().trim();
            
            let status = 'Active';
            if (statusUpper.includes('RESIGN') || statusUpper.includes('TERMINATE') || statusUpper.includes('VACANT') || !rawStatus) {
                status = 'Vacant';
            }
            const name = String(m.instructorName || m.instructor_name || m.name || '').trim();
            
            if (!map[udise]) map[udise] = { status, name };
            if (status === 'Active') map[udise] = { status, name };
        });
        return map;
    }, [manpower]);

    // Precalculated absolute last visit dates for all schools
    const absoluteLastVisitMap = useMemo(() => {
        const map = {};
        (allVisits || []).forEach(v => {
            const udise = String(v.udise_code).trim();
            if (!udise) return;
            const dObj = new Date(v.visit_date);
            if (!isNaN(dObj.getTime())) {
                const currentLast = map[udise];
                if (!currentLast || dObj > new Date(currentLast)) {
                    map[udise] = v.visit_date;
                }
            }
        });
        return map;
    }, [allVisits]);

    // Precalculated completed visits count in selected month for all schools
    const monthVisitsCountMap = useMemo(() => {
        const map = {};
        if (!selectedMonthStr) return map;
        const [year, monthIdx] = selectedMonthStr.split('-').map(Number);
        
        (allVisits || []).forEach(v => {
            const udise = String(v.udise_code).trim();
            if (!udise) return;
            const dObj = new Date(v.visit_date);
            if (!isNaN(dObj.getTime()) && dObj.getFullYear() === year && dObj.getMonth() === monthIdx) {
                map[udise] = (map[udise] || 0) + 1;
            }
        });
        return map;
    }, [allVisits, selectedMonthStr]);

    // Precalculated classes logged in selected month for all schools
    const monthJhpmsMap = useMemo(() => {
        const map = {};
        if (!selectedMonthStr) return map;
        const [year, monthIdx] = selectedMonthStr.split('-').map(Number);

        (jhpmsLab || []).forEach(j => {
            const u = j.udise || j.udise_code || '';
            const udise = String(u).trim();
            if (!udise) return;
            const dObj = new Date(j.date || j.visit_date);
            if (!isNaN(dObj.getTime()) && dObj.getFullYear() === year && dObj.getMonth() === monthIdx) {
                map[udise] = (map[udise] || 0) + (Number(j.classes) || 0);
            }
        });
        return map;
    }, [jhpmsLab, selectedMonthStr]);

    // Precalculated usage hours logged in selected month for all schools
    const monthEdustatMap = useMemo(() => {
        const map = {};
        if (!selectedMonthStr) return map;
        const [year, monthIdx] = selectedMonthStr.split('-').map(Number);

        (edustat || []).forEach(e => {
            const udise = String(e.udise).trim();
            if (!udise) return;
            const dObj = new Date(e.date);
            if (!isNaN(dObj.getTime()) && dObj.getFullYear() === year && dObj.getMonth() === monthIdx) {
                map[udise] = (map[udise] || 0) + (Number(e.hours) || 0);
            }
        });
        return map;
    }, [edustat, selectedMonthStr]);

    // Build the prioritized school visits roster
    const priorities = useMemo(() => {
        if (!selectedMonthStr) return [];
        const today = new Date();

        return data.schools.map(s => {
            const udise = String(s.udise_code).trim();
            const target = s.monthly_target || 1;

            // A. Calculate Absolute Aging (All visits regardless of filters)
            const absLastVisitDate = absoluteLastVisitMap[udise] || null;

            let daysSince = 999;
            if (absLastVisitDate) {
                daysSince = Math.floor((today - new Date(absLastVisitDate)) / (1000 * 60 * 60 * 24));
            }

            // Weight calculation for Aging (max 35 points)
            let agingScore = 0;
            if (daysSince === 999) agingScore = 35;
            else if (daysSince >= 60) agingScore = 35;
            else if (daysSince >= 45) agingScore = 25;
            else if (daysSince >= 30) agingScore = 15;
            else if (daysSince >= 15) agingScore = 5;

            // B. Target Deficit for selected month (max 30 points)
            const completedInMonth = monthVisitsCountMap[udise] || 0;

            const deficit = Math.max(0, target - completedInMonth);
            const deficitScore = target > 0 ? (deficit / target) * 30 : 0;

            // C. Manpower Vacancy (max 20 points)
            const mp = manpowerMap[udise] || { status: 'Vacant', name: '-' };
            const isVacant = mp.status === 'Vacant';
            const vacancyScore = isVacant ? 20 : 0;

            // D. Critical concerns in selected month (max 15 points)
            const totalJhpmsClasses = monthJhpmsMap[udise] || 0;
            const totalEdustatHours = monthEdustatMap[udise] || 0;

            const jhpmsConcern = totalJhpmsClasses === 0 ? 7.5 : 0;
            const edustatConcern = totalEdustatHours === 0 ? 7.5 : 0;
            
            const isLowScore = s.compositeScore !== undefined ? s.compositeScore < 40 : false;
            const scoreConcern = isLowScore ? 5 : 0;

            const criticalConcernScore = Math.min(15, jhpmsConcern + edustatConcern + scoreConcern);

            // Total dynamic risk priority score (Capped at 100)
            const totalScore = Math.round(agingScore + deficitScore + vacancyScore + criticalConcernScore);

            // E. Dynamic actionable reasons
            const reasons = [];
            if (daysSince === 999) {
                reasons.push("🚨 Never visited (No record in system history)");
            } else if (daysSince >= 30) {
                reasons.push(`⏳ Long overdue (Not visited in ${daysSince} days)`);
            }
            if (deficit > 0) {
                reasons.push(`📊 Target deficit (${deficit} of ${target} visits pending for this month)`);
            }
            if (isVacant) {
                reasons.push("👤 ICT Instructor post is vacant (Candidate Mobilization needed)");
            }
            if (totalJhpmsClasses === 0) {
                reasons.push("📉 JHPMS concern (0 classes logged this month)");
            }
            if (totalEdustatHours === 0) {
                reasons.push("💻 EduStat concern (0 usage hours synced this month)");
            }

            // Fallback default reason if everything looks fine but still flagged
            if (reasons.length === 0) {
                reasons.push("Routine verification and baseline audit");
            }

            return {
                ...s,
                daysSince,
                absLastVisitDate,
                deficit,
                completedInMonth,
                target,
                isVacant,
                reasons,
                score: totalScore
            };
        })
        .sort((a, b) => b.score - a.score);
    }, [data.schools, absoluteLastVisitMap, monthVisitsCountMap, manpowerMap, monthJhpmsMap, monthEdustatMap, selectedMonthStr]);

    // Curated Monthly visit plan contains top 40 schools
    const top40Schools = useMemo(() => {
        return priorities.slice(0, 40).map((school, index) => {
            // Assign a planning week dynamically (Weeks 1 to 4)
            const weekIndex = Math.floor(index / 10) + 1; // 10 schools per week
            return {
                ...school,
                planningWeek: `Week ${weekIndex}`
            };
        });
    }, [priorities]);

    // Grouping Top 40 by District/Block to optimize travel
    const blockClusters = useMemo(() => {
        const clusters = {};
        top40Schools.forEach(s => {
            const key = `${s.district} / ${s.block}`;
            if (!clusters[key]) clusters[key] = 0;
            clusters[key]++;
        });
        return Object.entries(clusters)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [top40Schools]);

    // Count of vacant manpower schools inside our 40-school roster
    const vacancyCountInPlan = useMemo(() => {
        return top40Schools.filter(s => s.isVacant).length;
    }, [top40Schools]);

    // Filter Top 40 list by Week selection
    const filteredTop40 = useMemo(() => {
        if (selectedWeek === 'All') return top40Schools;
        return top40Schools.filter(s => s.planningWeek === selectedWeek);
    }, [top40Schools, selectedWeek]);

    // Pagination calculations
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedMonthStr, selectedWeek]);

    const totalPages = rowsPerPage === -1 ? 1 : Math.ceil(filteredTop40.length / rowsPerPage);
    const activePage = Math.min(currentPage, totalPages) || 1;
    const startIdx = rowsPerPage === -1 ? 0 : (activePage - 1) * rowsPerPage;

    const paginatedSchools = useMemo(() => {
        if (rowsPerPage === -1) return filteredTop40;
        return filteredTop40.slice(startIdx, startIdx + rowsPerPage);
    }, [filteredTop40, startIdx, rowsPerPage]);

    // Get color code and labels based on score bounds
    const getPriorityDetails = (score) => {
        if (score >= 80) return { label: 'CRITICAL', color: 'bg-rose-600 shadow-rose-100 dark:bg-rose-700', action: '🚨 Visit Immediately (Risk Level Max)' };
        if (score >= 50) return { label: 'HIGH', color: 'bg-amber-600 shadow-amber-100 dark:bg-amber-700', action: '⚠️ High Priority: Schedule soon' };
        return { label: 'MEDIUM', color: 'bg-teal-600 shadow-teal-100 dark:bg-teal-700', action: 'Routine Visit Planning' };
    };

    // Copy formatted visit details to clipboard for direct WhatsApp sharing
    const handleCopyWhatsApp = (school) => {
        const text = `*🏫 SCHOOL VISIT BRIEF: ${school.school_name}*\n` +
                     `*UDISE Code:* ${school.udise_code}\n` +
                     `*Block/District:* ${school.block} / ${school.district}\n` +
                     `*Assigned Visitor:* ${school.visitor_name || 'Unassigned'}\n` +
                     `*Priority Rank & Score:* ${school.score} pts (${getPriorityDetails(school.score).label})\n` +
                     `*Scheduled Slot:* ${school.planningWeek}\n` +
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
        const excelData = top40Schools.map((s, idx) => ({
            "Rank": idx + 1,
            "Scheduled Week": s.planningWeek,
            "School Name": s.school_name,
            "UDISE Code": s.udise_code,
            "District": s.district,
            "Block": s.block,
            "Assigned Visitor": s.visitor_name || 'Unassigned',
            "Priority Score": s.score,
            "Abs Days Since Last Visit": s.daysSince === 999 ? 'Never' : s.daysSince,
            "Absolute Last Visit Date": s.absLastVisitDate ? formatDate(s.absLastVisitDate) : 'Never',
            "Staff Status": s.isVacant ? 'Vacant' : 'Active',
            "Deficit This Month": s.deficit,
            "Rationales": s.reasons.join(' | ')
        }));
        exportToExcel(excelData, `Monthly_Visit_Plan_${selectedMonthStr}`);
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
                        <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Team Monthly Visit Planner</h2>
                        <p className="text-[11.5px] text-slate-400 font-medium mt-0.5">Weighted Priority Engine • Curated Top 40 Roster</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Select Month:</label>
                    <select
                        value={selectedMonthStr}
                        onChange={(e) => setSelectedMonthStr(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer w-full md:w-56 shadow-sm transition"
                    >
                        {monthOptions.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Dashboard Overview Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 no-print">
                <div className="portal-card bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-teal-500/10 text-teal-600 rounded-xl">
                        <Icons.Trophy className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Planned Visits</div>
                        <div className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{top40Schools.length} Schools</div>
                        <div className="text-[10px] text-slate-400 mt-1">Target roster maximum</div>
                    </div>
                </div>

                <div className="portal-card bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-rose-500/10 text-rose-600 rounded-xl">
                        <Icons.Users className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CC Vacancy Targets</div>
                        <div className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{vacancyCountInPlan} Schools</div>
                        <div className="text-[10px] text-slate-400 mt-1">Focus candidate mobilization</div>
                    </div>
                </div>

                <div className="portal-card bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl shadow-sm flex items-center gap-4 col-span-1 sm:col-span-2">
                    <div className="p-3 bg-cyan-500/10 text-cyan-600 rounded-xl">
                        <Icons.ExecutiveClipboard className="w-6 h-6" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Route Clusters (Top Blocks)</div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
                            {blockClusters.slice(0, 3).map((bc, i) => (
                                <span key={i} className="inline-block bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 px-2 py-0.5 rounded mr-1.5 mb-1 text-[10px] text-slate-600 dark:text-slate-400">
                                    {bc.name}: <strong className="text-teal-700 dark:text-teal-400 font-extrabold">{bc.count}</strong>
                                </span>
                            ))}
                            {blockClusters.length === 0 && <span className="text-slate-400">No clusters found</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Roster Container */}
            <div className="portal-card flex-1 bg-white/95 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl rounded-2xl overflow-hidden flex flex-col min-h-0">
                <div className="portal-card-header bg-gradient-to-r from-teal-850 to-cyan-900 flex justify-between items-center text-white py-3.5 px-6 font-semibold shrink-0">
                    <div className="flex items-center gap-2">
                        <Icons.Plan className="w-5 h-5 text-teal-300 animate-pulse" />
                        <span>Weighted Priority Visit Plan ({top40Schools.length} Targeted)</span>
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
                        ℹ️ <strong className="text-slate-700 dark:text-slate-350">Weighted Risk Logic:</strong> Priority score (out of 100) dynamically weights: **Absolute Aging** (35 pts), **Target Deficit in month** (30 pts), **CC Staffing Vacancy** (20 pts), and **Critical Usage Concerns** (JHPMS/EduStat zero-logs) (15 pts).
                    </div>
                </div>

                {/* Weekly Scheduler Tabs Bar */}
                <div className="bg-white dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800 px-6 py-2 flex items-center justify-between gap-4 shrink-0 overflow-x-auto no-print">
                    <div className="flex gap-1.5 select-none">
                        {['All', 'Week 1', 'Week 2', 'Week 3', 'Week 4'].map((week) => {
                            const count = week === 'All' ? top40Schools.length : top40Schools.filter(s => s.planningWeek === week).length;
                            const isSelected = selectedWeek === week;
                            return (
                                <button
                                    key={week}
                                    onClick={() => setSelectedWeek(week)}
                                    className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-colors flex items-center gap-1.5 ${
                                        isSelected
                                            ? 'bg-teal-600 text-white'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-850 dark:text-slate-300 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <span>{week}</span>
                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                                        isSelected ? 'bg-teal-700 text-teal-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
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
                                <th className="px-4 py-3 bg-slate-50 dark:bg-slate-855 font-extrabold text-slate-500 uppercase tracking-wider">Priority Rationale & Root Causes</th>
                                <th className="px-4 py-3 bg-slate-50 dark:bg-slate-855 font-extrabold text-slate-500 uppercase tracking-wider text-center w-36 no-print">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/50">
                            {paginatedSchools.map((s, i) => {
                                const rank = startIdx + i + 1;
                                const details = getPriorityDetails(s.score);
                                const isRowExpanded = expandedUdise === s.udise_code;

                                // Custom tasks list for checklist mapping
                                const schoolChecklist = [
                                    ...(s.isVacant ? ["Conduct CC candidate mobilization & coordinate deployment status"] : []),
                                    ...(s.daysSince >= 30 || s.daysSince === 999 ? ["Conduct full site hardware audits (system, screens, connectivity)"] : []),
                                    ...(s.reasons.some(r => r.includes("JHPMS")) ? ["Investigate JHPMS class logger setup and sync server connection"] : []),
                                    ...(s.reasons.some(r => r.includes("EduStat")) ? ["Verify EduStat software device local sync and login records"] : []),
                                    "Conduct general visitor validation and log standard audit entry"
                                ];

                                // Calculate checklist progress
                                const checkedTasks = checklistState[s.udise_code] || {};
                                const completedCount = schoolChecklist.filter((_, idx) => checkedTasks[idx]).length;
                                const pctVal = Math.round((completedCount / schoolChecklist.length) * 100);

                                return (
                                    <React.Fragment key={s.udise_code}>
                                        <tr className={`hover:bg-slate-50/40 dark:hover:bg-slate-850/10 transition-colors ${
                                            s.score >= 80 ? 'bg-rose-50/20 dark:bg-rose-950/5' : ''
                                        }`}>
                                            <td className="px-4 py-3.5 text-center font-black text-slate-400">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xs">{rank}</span>
                                                    <span className="text-[9px] text-slate-400 font-bold mt-0.5">({s.score} pts)</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wide ${
                                                    s.planningWeek === 'Week 1' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/20 dark:text-cyan-400' :
                                                    s.planningWeek === 'Week 2' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/20 dark:text-indigo-400' :
                                                    s.planningWeek === 'Week 3' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/20 dark:text-purple-400' :
                                                    'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400'
                                                }`}>
                                                    {s.planningWeek}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-left">
                                                <div className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[220px]" title={s.school_name}>
                                                    {s.school_name}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px] text-slate-400">
                                                    <span>UDISE: {s.udise_code}</span>
                                                    <span>•</span>
                                                    <span className="bg-slate-100 dark:bg-slate-800 px-1 rounded font-sans text-[8.5px] font-bold text-slate-500 uppercase tracking-wide">{s.project_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-left">
                                                <div className="font-semibold text-teal-800 dark:text-teal-400 truncate max-w-[180px]" title={s.visitor_name || 'Unassigned'}>
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
                                                    {s.reasons.map((reason, idx) => (
                                                        <span key={idx} className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-805 text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-700/60 px-2 py-0.5 rounded-full text-[9px] font-bold">
                                                            {reason}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-center no-print">
                                                <div className="flex items-center justify-center gap-2">
                                                    {/* Copied/WhatsApp button */}
                                                    <button
                                                        onClick={() => handleCopyWhatsApp(s)}
                                                        className={`p-1.5 rounded-lg border shadow-sm transition text-xs font-bold ${
                                                            copiedUdise === s.udise_code
                                                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                                                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-750'
                                                        }`}
                                                        title="Copy WhatsApp Brief"
                                                    >
                                                        {copiedUdise === s.udise_code ? 'Copied ✓' : '📲 Share'}
                                                    </button>

                                                    {/* Checklist Drawer Toggle */}
                                                    <button
                                                        onClick={() => setExpandedUdise(isRowExpanded ? null : s.udise_code)}
                                                        className={`p-1.5 rounded-lg border shadow-sm transition text-xs font-bold ${
                                                            isRowExpanded
                                                                ? 'bg-teal-600 text-white border-teal-700'
                                                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-750'
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
                                                                <h4 className="text-xs font-black text-slate-700 dark:text-slate-250 uppercase tracking-wider">Field Visit Audit Checklist</h4>
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
                                                        <div className="w-full md:w-64 bg-white dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-xl p-4 shadow-sm text-left shrink-0 self-stretch flex flex-col justify-between">
                                                            <div>
                                                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Visit Checklist Progress</span>
                                                                <div className="flex items-end gap-2 mt-1">
                                                                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{pctVal}%</span>
                                                                    <span className="text-xs font-bold text-slate-400 mb-1">({completedCount} of {schoolChecklist.length} done)</span>
                                                                </div>
                                                                {/* Progress Bar */}
                                                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden mt-3 shadow-inner">
                                                                    <div
                                                                        className="h-full bg-teal-600 rounded-full transition-all duration-300"
                                                                        style={{ width: `${pctVal}%` }}
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-855">
                                                                <div className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wide">Last Audit Data</div>
                                                                <div className="text-[10px] text-slate-600 dark:text-slate-350 font-semibold space-y-1">
                                                                    <div>🗓️ Last Visited: <span className="font-bold text-slate-800 dark:text-slate-200">{s.absLastVisitDate ? formatDate(s.absLastVisitDate) : 'Never'}</span></div>
                                                                    <div>💼 Assigned Visitor: <span className="font-bold text-slate-800 dark:text-slate-200">{s.visitor_name || 'Unassigned'}</span></div>
                                                                    <div>⚙️ Composite Rating: <span className={`font-black ${s.compositeScore < 40 ? 'text-rose-600' : 'text-teal-700 dark:text-teal-400'}`}>{s.compositeScore !== undefined ? `${Math.round(s.compositeScore)}%` : 'N/A'}</span></div>
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
                            {filteredTop40.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="text-center p-12 text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/30">
                                        <Icons.Compliance className="w-12 h-12 text-teal-500/20 mx-auto mb-3" />
                                        <span className="text-sm font-semibold text-slate-500 block">No schools matched filters</span>
                                        <span className="text-xs text-slate-400 italic mt-1 block">Adjust selected week, month, or sidebar filters.</span>
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
                            {filteredTop40.length > 0 ? (
                                `Showing ${startIdx + 1}–${Math.min(startIdx + (rowsPerPage === -1 ? filteredTop40.length : rowsPerPage), filteredTop40.length)} of ${filteredTop40.length} targeted schools`
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
