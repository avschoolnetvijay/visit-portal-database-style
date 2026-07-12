import React, { useState, useMemo } from 'react';
import { formatDate } from '../utils';
import ReactApexChart from 'react-apexcharts';

// ─── Inline SVG Icons ──────────────────────────────────────────────────────────
const UserGroupIcon = ({ className }) => (
    <svg className={className || 'w-4 h-4'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);
const SchoolIcon = ({ className }) => (
    <svg className={className || 'w-4 h-4'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
);
const CalendarIcon = ({ className }) => (
    <svg className={className || 'w-4 h-4'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);
const TrophyIcon = ({ className }) => (
    <svg className={className || 'w-4 h-4'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="8 21 12 17 16 21" /><line x1="12" y1="17" x2="12" y2="11" />
        <path d="M17 3H7l2.5 8M17 3l-2.5 8" /><path d="M4 3h3M17 3h3" />
        <path d="M4 3c0 4 2 7 5 9M20 3c0 4-2 7-5 9" />
    </svg>
);
const AlertIcon = ({ className }) => (
    <svg className={className || 'w-4 h-4'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);
const CheckIcon = ({ className }) => (
    <svg className={className || 'w-4 h-4'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
const SearchIcon = ({ className }) => (
    <svg className={className || 'w-4 h-4'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);
const ChevronRight = ({ className }) => (
    <svg className={className || 'w-4 h-4'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);
const BarChartIcon = ({ className }) => (
    <svg className={className || 'w-4 h-4'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
        <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
);
const TargetIcon = ({ className }) => (
    <svg className={className || 'w-4 h-4'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
);
const TrendUpIcon = ({ className }) => (
    <svg className={className || 'w-4 h-4'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
);
const ClockIcon = ({ className }) => (
    <svg className={className || 'w-4 h-4'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
);

const DeviceIcon = ({ className }) => (
    <svg className={className || 'w-4 h-4'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
);

const SyncIcon = ({ className }) => (
    <svg className={className || 'w-4 h-4'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
    </svg>
);

// ─── Utility ───────────────────────────────────────────────────────────────────
const parseDateLocal = (d) => {
    if (!d) return null;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
};

const getDaysSince = (dateStr) => {
    if (!dateStr) return null;
    const d = parseDateLocal(dateStr);
    if (!d) return null;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
};

const getRatingBadge = (pct) => {
    if (pct >= 90) return { label: 'Excellent', color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' };
    if (pct >= 70) return { label: 'Good', color: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800' };
    if (pct >= 50) return { label: 'Average', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' };
    if (pct >= 25) return { label: 'Attention Needed', color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' };
    return { label: 'Critical', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' };
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, iconColor, value, label, sub, highlight, onClick }) => (
    <div 
        onClick={onClick}
        className={`relative bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-md border ${
            highlight ? 'border-teal-400 dark:border-teal-700' : 'border-slate-150 dark:border-slate-800'
        } flex flex-col gap-1 overflow-hidden transition-all duration-300 ${
            onClick ? 'cursor-pointer hover:shadow-lg hover:border-teal-500 dark:hover:border-teal-500 transform hover:-translate-y-0.5' : ''
        }`}
    >
        <div className={`flex items-center justify-center w-8 h-8 rounded-xl ${iconColor} mb-1`}>
            <Icon className="w-4 h-4" />
        </div>
        <div className="text-2xl font-black text-gray-900 dark:text-white leading-tight flex items-baseline justify-between">
            <span>{value}</span>
            {onClick && <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-1.5 py-0.5 rounded">🔍 Details</span>}
        </div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 leading-tight">{label}</div>
        {sub && <div className="text-[10px] font-medium text-gray-400 dark:text-slate-500">{sub}</div>}
    </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
export default function CcDefAnalysis({ schools = [], visits = [], jhpmsLab = [], edustat = [], startDate, endDate, ccNameMapping = {}, darkMode = false, onNavigateToSchool, manpower = [], edustatMaster = [], onDrillDown }) {
    const [selectedCC, setSelectedCC] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    // ── Build unique CC list ──────────────────────────────────────────────────
    const ccList = useMemo(() => {
        const names = new Set();
        schools.forEach(s => { if (s.visitor_name && s.visitor_name.trim()) names.add(s.visitor_name.trim()); });
        visits.forEach(v => {
            const name = v.visitor_name || v.cc_name || v.def_name || '';
            if (name.trim()) names.add(name.trim());
        });
        return Array.from(names).sort();
    }, [schools, visits]);

    const suggestions = useMemo(() => {
        if (!searchTerm || searchTerm.length < 1) return [];
        return ccList.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 15);
    }, [ccList, searchTerm]);

    // ── Date bounds ──────────────────────────────────────────────────────────
    const startD = useMemo(() => parseDateLocal(startDate), [startDate]);
    const endD = useMemo(() => parseDateLocal(endDate), [endDate]);

    const inRange = (dateStr) => {
        const d = parseDateLocal(dateStr);
        if (!d) return false;
        if (startD && d < startD) return false;
        if (endD && d > endD) return false;
        return true;
    };

    // ── Profile computation ──────────────────────────────────────────────────
    const profile = useMemo(() => {
        if (!selectedCC) return null;

        // Assigned schools (mapped by visitor_name in school master)
        const assignedSchools = schools.filter(s => (s.visitor_name || '').trim() === selectedCC.trim());
        const assignedSchoolUdises = new Set(assignedSchools.map(s => String(s.udise_code || s.udise || '').trim()));

        // All visits by this CC in date range
        const ccVisits = visits.filter(v => {
            const vName = (v.visitor_name || v.cc_name || v.def_name || '').trim();
            return vName === selectedCC.trim() && inRange(v.visit_date);
        });

        // Sort visits by date desc
        const sortedVisits = [...ccVisits].sort((a, b) => {
            const da = parseDateLocal(a.visit_date);
            const db = parseDateLocal(b.visit_date);
            return (db?.getTime() || 0) - (da?.getTime() || 0);
        });

        // School-level visit summary
        const visitsBySchool = {};
        ccVisits.forEach(v => {
            const ud = String(v.udise_code || v.udise || '').trim();
            if (!ud) return;
            if (!visitsBySchool[ud]) {
                visitsBySchool[ud] = { 
                    visits: [], 
                    lastDate: null,
                    uniqueDates: new Set()
                };
            }
            visitsBySchool[ud].visits.push(v);
            const d = parseDateLocal(v.visit_date);
            if (d) {
                visitsBySchool[ud].uniqueDates.add(d.toISOString().split('T')[0]);
            }
            if (d && (!visitsBySchool[ud].lastDate || d > parseDateLocal(visitsBySchool[ud].lastDate))) {
                visitsBySchool[ud].lastDate = v.visit_date;
            }
        });

        // Split unique day visit counts between assigned and other schools
        const assignedUniqueVisitSet = new Set();
        const otherUniqueVisitSet = new Set();
        
        ccVisits.forEach(v => {
            const ud = String(v.udise_code || v.udise || '').trim();
            const d = parseDateLocal(v.visit_date);
            if (ud && d) {
                const dateStr = d.toISOString().split('T')[0];
                if (assignedSchoolUdises.has(ud)) {
                    assignedUniqueVisitSet.add(`${ud}_${dateStr}`);
                } else {
                    otherUniqueVisitSet.add(`${ud}_${dateStr}`);
                }
            }
        });

        const assignedVisitsCount = assignedUniqueVisitSet.size;
        const otherVisitsCount = otherUniqueVisitSet.size;
        const totalVisits = assignedVisitsCount + otherVisitsCount;

        // Assigned school coverage
        const visitedAssigned = assignedSchools.filter(s => visitsBySchool[String(s.udise_code || s.udise || '').trim()]);
        const coveragePct = assignedSchools.length > 0 ? Math.round((visitedAssigned.length / assignedSchools.length) * 100) : 0;

        // Unvisited assigned schools (overdue)
        const unvisited = assignedSchools.filter(s => !visitsBySchool[String(s.udise_code || s.udise || '').trim()]);

        // Repeat visits alert: schools visited 3+ times while others unvisited
        const repeatVisits = assignedSchools.filter(s => {
            const ud = String(s.udise_code || s.udise || '').trim();
            return visitsBySchool[ud] && visitsBySchool[ud].uniqueDates.size >= 3 && unvisited.length > 0;
        });

        // JHPMS data for CC's schools
        const ccUdises = new Set(assignedSchools.map(s => String(s.udise_code || s.udise || '').trim()));
        const ccJhpms = jhpmsLab.filter(j => {
            const ud = String(j.udise || '').trim();
            return ccUdises.has(ud) && inRange(j.date);
        });
        const ccEdustat = edustat.filter(e => {
            const ud = String(e.udise || '').trim();
            return ccUdises.has(ud) && inRange(e.date);
        });

        // JHPMS classes categorization
        let theoryCount = 0;
        let practicalCount = 0;
        let smartCount = 0;
        let misCount = 0;

        ccJhpms.forEach(l => {
            const labType = String(l.labType || getVal(l, 'lab') || '').toUpperCase();
            const subject = String(l.subject || getVal(l, 'sub') || '').toUpperCase();
            const theoryPractical = String(l.theoryPractical || getVal(l, 'theoryPractical') || getVal(l, 'theory/practical') || getVal(l, 'theorypractical') || '').toUpperCase();

            if (subject.split(/[^A-Z0-9]+/).includes('MIS')) {
                misCount++;
            } else {
                if (labType.includes('SMART')) {
                    smartCount++;
                }

                if (theoryPractical.includes('THEORY')) {
                    theoryCount++;
                } else if (theoryPractical.includes('PRACTICAL')) {
                    practicalCount++;
                } else {
                    if (labType.includes('ICT') && subject.includes('COMPUTER')) {
                        theoryCount++;
                    } else if (labType.includes('SMART')) {
                        practicalCount++;
                    }
                }
            }
        });
        const totalJhpmsClasses = theoryCount + practicalCount;
        const totalEduHours = ccEdustat.reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);

        // Visit frequency metrics
        const uniqueSchoolsVisited = Object.keys(visitsBySchool).length;
        const avgVisitsPerSchool = assignedSchools.length > 0 ? (assignedVisitsCount / assignedSchools.length).toFixed(1) : '0';

        // Count ICT and Smart visits separately
        let totalIctVisits = 0;
        let totalSmartVisits = 0;
        ccVisits.forEach(v => {
            const typeLower = String(v.visit_type || '').toLowerCase();
            if (typeLower.includes('ict')) totalIctVisits++;
            if (typeLower.includes('smart')) totalSmartVisits++;
        });

        // Manpower & CC Required/Working/Vacant Details
        let manpowerWorking = 0;
        assignedSchools.forEach(s => {
            const ud = String(s.udise_code || s.udise || '').trim();
            const schoolManpower = manpower.filter(m => String(m.udise).trim() === ud);
            const working = schoolManpower.some(m => String(m.status).toUpperCase().trim() === 'WORKING');
            if (working) manpowerWorking++;
        });
        const manpowerRequired = assignedSchools.length;
        const manpowerVacant = Math.max(0, manpowerRequired - manpowerWorking);

        // EduStat Devices Install & Sync Details
        const ccSchoolDevices = edustatMaster.filter(d => {
            const ud = String(d.udise || d.udise_code || '').trim();
            return ccUdises.has(ud);
        });
        let devicesTotal = ccSchoolDevices.length;
        let devicesInstalled = 0;
        let devicesNotInstalled = 0;
        ccSchoolDevices.forEach(d => {
            const inst = String(d.installed || '').toUpperCase().trim();
            if (inst === 'YES') {
                devicesInstalled++;
            } else {
                devicesNotInstalled++;
            }
        });

        const serialHoursMap = {};
        ccEdustat.forEach(e => {
            const serial = String(e.serial || '').trim();
            const hours = parseFloat(e.hours) || 0;
            if (serial) {
                serialHoursMap[serial] = (serialHoursMap[serial] || 0) + hours;
            }
        });

        let devicesSynced = 0;
        let devicesNotSynced = 0;
        const installedDevicesList = ccSchoolDevices.filter(d => String(d.installed || '').toUpperCase().trim() === 'YES');
        installedDevicesList.forEach(d => {
            const serial = String(d.serial || '').trim();
            const hours = serialHoursMap[serial] || 0;
            if (hours > 0) {
                devicesSynced++;
            } else {
                devicesNotSynced++;
            }
        });

        // Date range days
        const rangeDays = startD && endD ? Math.max(1, Math.ceil((endD - startD) / 86400000) + 1) : 30;
        const avgVisitsPerWeek = ((totalVisits / rangeDays) * 7).toFixed(1);

        // Ranking among all CCs in same project - based on unique days visit count
        const allProjectCCs = [...new Set(schools.filter(s => {
            const proj = assignedSchools[0]?.project_name;
            return proj ? s.project_name === proj : true;
        }).map(s => (s.visitor_name || '').trim()).filter(Boolean))];

        const ccRankData = allProjectCCs.map(cc => {
            const ccVisitsForCC = visits.filter(v => (v.visitor_name || v.cc_name || '').trim() === cc && inRange(v.visit_date));
            const ccSchoolDateSet = new Set();
            ccVisitsForCC.forEach(v => {
                const ud = String(v.udise_code || v.udise || '').trim();
                const d = parseDateLocal(v.visit_date);
                if (ud && d) {
                    ccSchoolDateSet.add(`${ud}_${d.toISOString().split('T')[0]}`);
                }
            });
            const ccV = ccSchoolDateSet.size;
            const ccSchools = schools.filter(s => (s.visitor_name || '').trim() === cc).length;
            const ccAssignedSchools = schools.filter(s => (s.visitor_name || '').trim() === cc);
            const ccVisitedSchools = ccAssignedSchools.filter(s => {
                const ud = String(s.udise_code || s.udise || '').trim();
                return ccVisitsForCC.some(v => String(v.udise_code || v.udise || '').trim() === ud);
            });
            const pct = ccSchools > 0 ? (ccVisitedSchools.length / ccSchools) * 100 : 0;
            return { cc, visits: ccV, assigned: ccSchools, pct: Math.min(100, pct) };
        }).sort((a, b) => b.pct - a.pct || b.visits - a.visits);

        const rankIndex = ccRankData.findIndex(r => r.cc === selectedCC);
        const rank = rankIndex + 1;
        const totalCCs = ccRankData.length;

        // Project avg visits
        const projectAvgVisits = ccRankData.length > 0 ? (ccRankData.reduce((s, r) => s + r.visits, 0) / ccRankData.length).toFixed(1) : 0;
        const projectAvgCoverage = ccRankData.length > 0 ? (ccRankData.reduce((s, r) => s + r.pct, 0) / ccRankData.length).toFixed(1) : 0;

        // Weekly trend - unique school-dates per week
        const weekMap = {};
        const seenSchoolDates = new Set();
        ccVisits.forEach(v => {
            const ud = String(v.udise_code || v.udise || '').trim();
            const d = parseDateLocal(v.visit_date);
            if (!d || !ud) return;
            const dateStr = d.toISOString().split('T')[0];
            const signature = `${ud}_${dateStr}`;
            if (seenSchoolDates.has(signature)) return;
            seenSchoolDates.add(signature);

            const sunday = new Date(d);
            sunday.setDate(d.getDate() - d.getDay());
            const key = sunday.toISOString().split('T')[0];
            weekMap[key] = (weekMap[key] || 0) + 1;
        });
        const weekKeys = Object.keys(weekMap).sort();
        const trendSeries = weekKeys.map(k => weekMap[k]);
        const trendLabels = weekKeys.map(k => {
            const d = new Date(k);
            return `${d.getDate()}/${d.getMonth() + 1}`;
        });

        // Top 3 priority schools (unvisited + overdue by most days based on last visit elsewhere)
        const prioritySchools = unvisited.slice(0, 5);

        // CC's last visit date
        const lastVisit = sortedVisits[0];
        const lastVisitDays = lastVisit ? getDaysSince(lastVisit.visit_date) : null;

        // Performance score (composite: coverage 40%, visit count 30%, jhpms 20%, edustat 10%)
        const scoreNorm = (val, max) => max > 0 ? Math.min(100, (val / max) * 100) : 0;
        const maxVisits = Math.max(...ccRankData.map(r => r.visits), 1);
        const compositeScore = Math.round(
            (coveragePct * 0.4) +
            (scoreNorm(totalVisits, maxVisits) * 0.35) +
            (scoreNorm(totalJhpmsClasses, Math.max(...(ccRankData.map(r => r.assigned * 15)), 1)) * 0.15) +
            (scoreNorm(totalEduHours, Math.max(...(ccRankData.map(r => r.assigned * 30)), 1)) * 0.1)
        );

        return {
            assignedSchools, ccVisits: sortedVisits, visitsBySchool,
            visitedAssigned, unvisited, repeatVisits,
            coveragePct, totalVisits, uniqueSchoolsVisited, avgVisitsPerSchool,
            avgVisitsPerWeek, totalJhpmsClasses, totalEduHours,
            rank, totalCCs, projectAvgVisits, projectAvgCoverage,
            trendSeries, trendLabels, prioritySchools, lastVisit,
            lastVisitDays, compositeScore, ccRankData: ccRankData.slice(0, 10),
            totalIctVisits, totalSmartVisits,
            
            // New KPI values
            assignedSchoolUdises,
            assignedVisitsCount,
            otherVisitsCount,
            manpowerRequired,
            manpowerWorking,
            manpowerVacant,
            theoryCount,
            practicalCount,
            smartCount,
            misCount,
            devicesTotal,
            devicesInstalled,
            devicesNotInstalled,
            devicesSynced,
            devicesNotSynced,
            ccSchoolDevices,
            ccEdustat
        };
    }, [selectedCC, schools, visits, jhpmsLab, edustat, startD, endD, manpower, edustatMaster]);

    // ── Chart Options ────────────────────────────────────────────────────────
    const trendChartOptions = useMemo(() => ({
        chart: { type: 'area', toolbar: { show: false }, background: 'transparent', sparkline: { enabled: false } },
        stroke: { curve: 'smooth', width: 2.5 },
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 90, 100] } },
        colors: ['#0d9488'],
        xaxis: { categories: profile?.trendLabels || [], labels: { style: { colors: darkMode ? '#94a3b8' : '#6b7280', fontSize: '10px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { style: { colors: darkMode ? '#94a3b8' : '#6b7280', fontSize: '10px' } }, tickAmount: 4 },
        grid: { borderColor: darkMode ? '#1e293b' : '#f1f5f9', strokeDashArray: 3 },
        tooltip: { theme: darkMode ? 'dark' : 'light', y: { formatter: v => `${v} visits` } },
        dataLabels: { enabled: false },
    }), [profile, darkMode]);

    // ── Rank bar chart ────────────────────────────────────────────────────────
    const rankChartOptions = useMemo(() => ({
        chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
        plotOptions: { bar: { horizontal: true, barHeight: '65%', borderRadius: 4 } },
        colors: profile?.ccRankData?.map(r => r.cc === selectedCC ? '#0d9488' : (darkMode ? '#334155' : '#e2e8f0')) || ['#0d9488'],
        xaxis: { 
            categories: profile?.ccRankData?.map(r => r.cc) || [],
            labels: { style: { colors: darkMode ? '#94a3b8' : '#6b7280', fontSize: '10px' } } 
        },
        yaxis: { labels: { style: { colors: darkMode ? '#94a3b8' : '#6b7280', fontSize: '10px', fontWeight: 600 }, maxWidth: 140 } },
        grid: { borderColor: darkMode ? '#1e293b' : '#f1f5f9', xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
        dataLabels: { enabled: true, style: { fontSize: '10px', fontWeight: 700, colors: [darkMode ? '#f1f5f9' : '#1e293b'] }, formatter: v => `${v}` },
        tooltip: { theme: darkMode ? 'dark' : 'light', y: { formatter: v => `${v} visits` } },
    }), [profile, darkMode, selectedCC]);

    // ─── Drill down handlers ──────────────────────────────────────────────────
    const handleTotalVisitsDrillDown = () => {
        if (!profile || !profile.ccVisits || !onDrillDown) return;
        const sortedVisits = [...profile.ccVisits].sort((a, b) => {
            const da = parseDateLocal(a.visit_date);
            const db = parseDateLocal(b.visit_date);
            return (db?.getTime() || 0) - (da?.getTime() || 0);
        });
        const drillData = sortedVisits.map((v, idx) => {
            const udise = String(v.udise_code || v.udise || '').trim();
            const school = schools.find(s => String(s.udise_code || s.udise || '').trim() === udise);
            const isAssigned = profile.assignedSchoolUdises.has(udise);
            return {
                "Sl No": idx + 1,
                "School Name": school?.school_name || "Unknown School",
                "UDISE": udise,
                "District": school?.district_name || "N/A",
                "Project Name": school?.project_name || "N/A",
                "Assigned CC/DEF": school?.visitor_name || "N/A",
                "Date": formatDate(v.visit_date),
                "Visit Type": v.visit_type || "N/A",
                "Assignment": isAssigned ? "Assigned School" : "Other School",
                "Remarks": v.remarks || "—"
            };
        });
        onDrillDown(`All CC Visits - ${selectedCC}`, drillData);
    };

    const handleOtherVisitsDrillDown = () => {
        if (!profile || !profile.ccVisits || !onDrillDown) return;
        const otherVisits = profile.ccVisits.filter(v => !profile.assignedSchoolUdises.has(String(v.udise_code || v.udise || '').trim()));
        const sortedVisits = [...otherVisits].sort((a, b) => {
            const da = parseDateLocal(a.visit_date);
            const db = parseDateLocal(b.visit_date);
            return (db?.getTime() || 0) - (da?.getTime() || 0);
        });
        const drillData = sortedVisits.map((v, idx) => {
            const udise = String(v.udise_code || v.udise || '').trim();
            const school = schools.find(s => String(s.udise_code || s.udise || '').trim() === udise);
            return {
                "Sl No": idx + 1,
                "School Name": school?.school_name || "Unknown School",
                "UDISE": udise,
                "District": school?.district_name || "N/A",
                "Project Name": school?.project_name || "N/A",
                "Assigned CC/DEF": school?.visitor_name || "N/A",
                "Date": formatDate(v.visit_date),
                "Visit Type": v.visit_type || "N/A",
                "Remarks": v.remarks || "—"
            };
        });
        onDrillDown(`Other School Visits - ${selectedCC}`, drillData);
    };

    const handleDevicesDrillDown = () => {
        if (!profile || !profile.ccSchoolDevices || !onDrillDown) return;
        
        const serialHoursMap = {};
        profile.ccEdustat.forEach(e => {
            const serial = String(e.serial || '').trim();
            const hours = parseFloat(e.hours) || 0;
            if (serial) {
                serialHoursMap[serial] = (serialHoursMap[serial] || 0) + hours;
            }
        });

        const drillData = profile.ccSchoolDevices.map((d, idx) => {
            const ud = String(d.udise || d.udise_code || '').trim();
            const school = schools.find(s => String(s.udise_code || s.udise || '').trim() === ud);
            const serial = String(d.serial || '').trim();
            const inst = String(d.installed || '').toUpperCase().trim() === 'YES';
            const hours = serialHoursMap[serial] || 0;
            
            let syncStatus = "Not Synced (0 Hours)";
            if (!inst) {
                syncStatus = "Device Not Installed";
            } else if (hours > 0) {
                syncStatus = `Synced (${hours.toFixed(1)} Hours)`;
            }

            return {
                "Sl No": idx + 1,
                "School Name": school?.school_name || "Unknown School",
                "UDISE": ud,
                "District": school?.district_name || "N/A",
                "Project Name": school?.project_name || "N/A",
                "Assigned CC/DEF": school?.visitor_name || "N/A",
                "Device": d.device || "EduStat Device",
                "Serial Number": serial || "N/A",
                "Installation Status": inst ? "Installed" : "Not Installed",
                "Sync Status": syncStatus
            };
        });
        onDrillDown(`EduStat Devices Audit - ${selectedCC}`, drillData);
    };

    const handleSyncedDevicesDrillDown = () => {
        if (!profile || !profile.ccSchoolDevices || !onDrillDown) return;
        
        const serialHoursMap = {};
        profile.ccEdustat.forEach(e => {
            const serial = String(e.serial || '').trim();
            const hours = parseFloat(e.hours) || 0;
            if (serial) {
                serialHoursMap[serial] = (serialHoursMap[serial] || 0) + hours;
            }
        });

        const syncedDevices = profile.ccSchoolDevices.filter(d => {
            const inst = String(d.installed || '').toUpperCase().trim() === 'YES';
            const serial = String(d.serial || '').trim();
            const hours = serialHoursMap[serial] || 0;
            return inst && hours > 0;
        });

        const drillData = syncedDevices.map((d, idx) => {
            const ud = String(d.udise || d.udise_code || '').trim();
            const school = schools.find(s => String(s.udise_code || s.udise || '').trim() === ud);
            const serial = String(d.serial || '').trim();
            const hours = serialHoursMap[serial] || 0;

            return {
                "Sl No": idx + 1,
                "School Name": school?.school_name || "Unknown School",
                "UDISE": ud,
                "District": school?.district_name || "N/A",
                "Project Name": school?.project_name || "N/A",
                "Assigned CC/DEF": school?.visitor_name || "N/A",
                "Device": d.device || "EduStat Device",
                "Serial Number": serial || "N/A",
                "Sync Hours": `${hours.toFixed(1)} Hours`
            };
        });
        onDrillDown(`Synced Devices - ${selectedCC}`, drillData);
    };

    const handleNotSyncedDevicesDrillDown = () => {
        if (!profile || !profile.ccSchoolDevices || !onDrillDown) return;
        
        const serialHoursMap = {};
        profile.ccEdustat.forEach(e => {
            const serial = String(e.serial || '').trim();
            const hours = parseFloat(e.hours) || 0;
            if (serial) {
                serialHoursMap[serial] = (serialHoursMap[serial] || 0) + hours;
            }
        });

        const unsyncedDevices = profile.ccSchoolDevices.filter(d => {
            const inst = String(d.installed || '').toUpperCase().trim() === 'YES';
            const serial = String(d.serial || '').trim();
            const hours = serialHoursMap[serial] || 0;
            return inst && hours === 0;
        });

        const drillData = unsyncedDevices.map((d, idx) => {
            const ud = String(d.udise || d.udise_code || '').trim();
            const school = schools.find(s => String(s.udise_code || s.udise || '').trim() === ud);
            const serial = String(d.serial || '').trim();

            return {
                "Sl No": idx + 1,
                "School Name": school?.school_name || "Unknown School",
                "UDISE": ud,
                "District": school?.district_name || "N/A",
                "Project Name": school?.project_name || "N/A",
                "Assigned CC/DEF": school?.visitor_name || "N/A",
                "Device": d.device || "EduStat Device",
                "Serial Number": serial || "N/A",
                "Sync Status": "Not Synced (0 Hours)"
            };
        });
        onDrillDown(`Not Synced Devices - ${selectedCC}`, drillData);
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5 p-1">
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <UserGroupIcon className="w-5 h-5 text-teal-600" />
                        CC / DEF Deep Analysis
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 font-medium">
                        Select a Cluster Coordinator or District Educational Facilitator to view their complete performance profile.
                    </p>
                </div>
            </div>

            {/* ── CC Selector ────────────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-md border border-slate-150 dark:border-slate-800">
                <div className="relative max-w-xl" onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-9 pr-4 py-3 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                        placeholder="Search CC / DEF name…"
                        value={searchTerm}
                        onFocus={() => setShowSuggestions(true)}
                        onChange={e => { setSearchTerm(e.target.value); setSelectedCC(''); setShowSuggestions(true); }}
                    />
                    {showSuggestions && suggestions.length > 0 && (
                        <ul className="absolute z-50 mt-1.5 w-full bg-white dark:bg-slate-800 shadow-xl max-h-56 rounded-xl py-1 text-sm border border-gray-100 dark:border-slate-700 overflow-auto">
                            {suggestions.map((s, i) => (
                                <li key={i}
                                    className="cursor-pointer px-4 py-2.5 hover:bg-teal-50 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 font-semibold border-b border-gray-50 dark:border-slate-700/50 last:border-0"
                                    onMouseDown={() => { setSelectedCC(s); setSearchTerm(s); setShowSuggestions(false); }}>
                                    <span className="flex items-center gap-2"><UserGroupIcon className="w-3.5 h-3.5 text-teal-500" />{s}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                {selectedCC && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="px-2.5 py-1 bg-teal-50 dark:bg-teal-900/20 text-teal-800 dark:text-teal-300 rounded-full font-bold border border-teal-100 dark:border-teal-800">
                            {selectedCC}
                        </span>
                        <span className="px-2.5 py-1 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded-full font-medium border border-gray-100 dark:border-slate-700">
                            {formatDate(startDate)} – {formatDate(endDate)}
                        </span>
                    </div>
                )}
            </div>

            {/* ── Main Dashboard (only when CC selected) ─────────────── */}
            {!selectedCC && (
                <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 dark:text-slate-500">
                    <UserGroupIcon className="w-14 h-14 mb-4 opacity-30" />
                    <p className="text-base font-semibold">Search and select a CC / DEF to load their profile</p>
                    <p className="text-xs mt-1">All performance data and insights will appear here.</p>
                </div>
            )}

            {selectedCC && profile && (
                <>
                    {/* ── Performance Header Banner ─────────────────── */}
                    <div className="bg-gradient-to-r from-teal-800 to-teal-600 dark:from-teal-900 dark:to-teal-700 rounded-2xl p-5 shadow-lg text-white flex flex-wrap gap-4 items-center justify-between">
                        <div>
                            <div className="text-[11px] uppercase tracking-widest font-bold opacity-70 mb-1">CC / DEF Profile</div>
                            <h2 className="text-lg font-black leading-tight">{selectedCC}</h2>
                            <div className="text-xs opacity-75 mt-1">
                                {profile.assignedSchools.length} Schools Assigned &nbsp;·&nbsp;
                                {profile.totalVisits} Visits in Period &nbsp;·&nbsp;
                                {formatDate(startDate)} – {formatDate(endDate)}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-center">
                                <div className="text-3xl font-black">{profile.compositeScore}%</div>
                                <div className="text-[10px] uppercase tracking-wider opacity-70">Composite Score</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-black">#{profile.rank}</div>
                                <div className="text-[10px] uppercase tracking-wider opacity-70">of {profile.totalCCs} CCs</div>
                            </div>
                            <div className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold border ${getRatingBadge(profile.coveragePct).color}`}>
                                {getRatingBadge(profile.coveragePct).label}
                            </div>
                        </div>
                    </div>

                    {/* ── Visits & Coverage KPI Grid ─────────────────── */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        <KpiCard icon={CalendarIcon} iconColor="bg-teal-50 dark:bg-teal-900/20 text-teal-600"
                            value={profile.totalVisits} label="Total Visits" 
                            sub={
                                <div className="flex gap-1 flex-wrap text-[11px] font-bold mt-1">
                                    <span className="text-teal-600 dark:text-teal-400">Assigned: {profile.assignedVisitsCount}</span>
                                    <span className="text-slate-300 dark:text-slate-700 font-normal">·</span>
                                    <span className="text-rose-600 dark:text-rose-400">Other: {profile.otherVisitsCount}</span>
                                </div>
                            } 
                            onClick={handleTotalVisitsDrillDown} 
                        />
                        <KpiCard icon={SchoolIcon} iconColor="bg-rose-50 dark:bg-rose-900/20 text-rose-600"
                            value={profile.otherVisitsCount} label="Other School Visits" 
                            sub={<span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1 block">Outside assigned list</span>} 
                            onClick={handleOtherVisitsDrillDown} 
                        />
                        <KpiCard icon={SchoolIcon} iconColor="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600"
                            value={`${profile.visitedAssigned.length}/${profile.assignedSchools.length}`} label="Coverage" 
                            sub={<span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">{profile.coveragePct}% Assigned Schools</span>} 
                        />
                        <KpiCard icon={TrendUpIcon} iconColor="bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                            value={profile.avgVisitsPerWeek} label="Avg Visits/Week" 
                            sub={<span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mt-1 block">Across period</span>} 
                        />
                        <KpiCard icon={TargetIcon} iconColor="bg-amber-50 dark:bg-amber-900/20 text-amber-600"
                            value={profile.avgVisitsPerSchool} label="Avg Visits/School" 
                            sub={<span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-1 block">Assigned schools</span>} 
                        />
                    </div>

                    {/* ── Manpower, JHPMS & EduStat Device Audit Grid ───────── */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-3">
                        <KpiCard icon={UserGroupIcon} iconColor="bg-teal-50 dark:bg-teal-900/20 text-teal-600"
                            value={`${profile.manpowerWorking}/${profile.manpowerRequired}`} label="ICT Manpower" 
                            sub={
                                <div className="flex gap-1 flex-wrap text-[11.5px] font-extrabold mt-1">
                                    <span className="text-teal-600 dark:text-teal-400">Req: {profile.manpowerRequired}</span>
                                    <span className="text-slate-300 dark:text-slate-700 font-normal">·</span>
                                    <span className="text-emerald-600 dark:text-emerald-400">Work: {profile.manpowerWorking}</span>
                                    <span className="text-slate-300 dark:text-slate-700 font-normal">·</span>
                                    <span className="text-rose-600 dark:text-rose-400">Vac: {profile.manpowerVacant}</span>
                                </div>
                            } 
                        />
                        <KpiCard icon={BarChartIcon} iconColor="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600"
                            value={profile.totalJhpmsClasses} label="JHPMS Classes" 
                            sub={
                                <div className="flex gap-1 flex-wrap text-[11.5px] font-extrabold mt-1">
                                    <span className="text-blue-600 dark:text-blue-400">Th: {profile.theoryCount}</span>
                                    <span className="text-slate-300 dark:text-slate-700 font-normal">·</span>
                                    <span className="text-indigo-600 dark:text-indigo-400">Pr: {profile.practicalCount}</span>
                                    <span className="text-slate-300 dark:text-slate-700 font-normal">·</span>
                                    <span className="text-emerald-600 dark:text-emerald-400">Sm: {profile.smartCount}</span>
                                    <span className="text-slate-300 dark:text-slate-700 font-normal">·</span>
                                    <span className="text-amber-600 dark:text-amber-400">MIS: {profile.misCount}</span>
                                </div>
                            } 
                        />
                        <KpiCard icon={ClockIcon} iconColor="bg-rose-50 dark:bg-rose-900/20 text-rose-600"
                            value={profile.totalEduHours > 0 ? profile.totalEduHours.toFixed(1) : '0'} label="EduStat Hours" 
                            sub={<span className="text-[11.5px] font-bold text-rose-600 dark:text-rose-400 mt-1 block">In assigned schools</span>} 
                        />
                        <KpiCard icon={DeviceIcon} iconColor="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600"
                            value={`${profile.devicesInstalled}/${profile.devicesTotal}`} label="Installed Devices" 
                            sub={
                                <div className="flex gap-1 flex-wrap text-[11.5px] font-extrabold mt-1">
                                    <span className="text-slate-600 dark:text-slate-300">Tot: {profile.devicesTotal}</span>
                                    <span className="text-slate-300 dark:text-slate-700 font-normal">·</span>
                                    <span className="text-indigo-600 dark:text-indigo-400">Inst: {profile.devicesInstalled}</span>
                                    <span className="text-slate-300 dark:text-slate-700 font-normal">·</span>
                                    <span className="text-rose-600 dark:text-rose-400">Not: {profile.devicesNotInstalled}</span>
                                </div>
                            } 
                            onClick={handleDevicesDrillDown} 
                        />
                        <KpiCard icon={SyncIcon} iconColor="bg-rose-50 dark:bg-rose-900/20 text-rose-600"
                            value={`${profile.devicesSynced}/${profile.devicesInstalled}`} label="Synced Devices" 
                            sub={
                                <div className="flex gap-1 flex-wrap text-[11.5px] font-extrabold mt-1">
                                    <span onClick={(e) => { e.stopPropagation(); handleSyncedDevicesDrillDown(); }} className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer bg-emerald-50 dark:bg-emerald-950/20 px-1 py-0.5 rounded flex items-center gap-0.5">Sync: {profile.devicesSynced} 🔍</span>
                                    <span className="text-slate-300 dark:text-slate-700 font-normal self-center">·</span>
                                    <span onClick={(e) => { e.stopPropagation(); handleNotSyncedDevicesDrillDown(); }} className="text-rose-600 dark:text-rose-400 hover:underline cursor-pointer bg-rose-50 dark:bg-rose-950/20 px-1 py-0.5 rounded flex items-center gap-0.5">Not: {profile.devicesNotSynced} 🔍</span>
                                </div>
                            } 
                        />
                    </div>

                    {/* ── Row 2: Coverage + Trend Chart ─────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                        {/* Coverage Progress */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-md">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 mb-4 border-b border-gray-100 dark:border-slate-800 pb-2 flex items-center gap-1.5">
                                <TargetIcon className="w-3.5 h-3.5" /> School Coverage Status
                            </h3>

                            {/* Radial-style coverage */}
                            <div className="flex items-center justify-center mb-4">
                                <div className="relative w-28 h-28">
                                    <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                                        <circle cx="18" cy="18" r="15.5" fill="none" stroke={darkMode ? '#1e293b' : '#f1f5f9'} strokeWidth="3" />
                                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#0d9488" strokeWidth="3"
                                            strokeDasharray={`${profile.coveragePct * 0.974} 100`}
                                            strokeLinecap="round" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-black text-gray-900 dark:text-white">{profile.coveragePct}%</span>
                                        <span className="text-[9px] font-bold text-gray-500 uppercase">Coverage</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 dark:text-slate-400 font-medium">Assigned Schools</span>
                                    <span className="font-black text-gray-900 dark:text-white">{profile.assignedSchools.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 dark:text-slate-400 font-medium">Visited (≥1 visit)</span>
                                    <span className="font-black text-green-700 dark:text-green-400">{profile.visitedAssigned.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 dark:text-slate-400 font-medium">Not Visited</span>
                                    <span className="font-black text-red-600 dark:text-red-400">{profile.unvisited.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 dark:text-slate-400 font-medium">Last Visit</span>
                                    <span className="font-black text-gray-800 dark:text-gray-200">
                                        {profile.lastVisit ? `${formatDate(profile.lastVisit.visit_date)} (${profile.lastVisitDays}d ago)` : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 dark:text-slate-400 font-medium">Unique Schools Visited</span>
                                    <span className="font-black text-teal-700 dark:text-teal-400">{profile.uniqueSchoolsVisited}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-1">
                                    <span className="text-gray-500 dark:text-slate-400 font-medium">Total ICT Visits</span>
                                    <span className="font-extrabold text-blue-600 dark:text-blue-400">{profile.totalIctVisits}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 dark:text-slate-400 font-medium">Total Smart Class Visits</span>
                                    <span className="font-extrabold text-teal-600 dark:text-teal-400">{profile.totalSmartVisits}</span>
                                </div>
                            </div>
                        </div>

                        {/* Weekly Visit Trend Chart */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-md">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 mb-3 border-b border-gray-100 dark:border-slate-800 pb-2 flex items-center gap-1.5">
                                <TrendUpIcon className="w-3.5 h-3.5" /> Weekly Visit Trend
                            </h3>
                            {profile.trendSeries.length > 0 ? (
                                <ReactApexChart
                                    options={trendChartOptions}
                                    series={[{ name: 'Visits', data: profile.trendSeries }]}
                                    type="area"
                                    height={200}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-[200px] text-gray-400 dark:text-slate-500 text-sm font-medium">
                                    No visit data available in selected period
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Row 3: Assigned Schools Table + Timeline ──── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                        {/* Assigned Schools Coverage Table */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-md">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 mb-3 border-b border-gray-100 dark:border-slate-800 pb-2 flex items-center gap-1.5">
                                <SchoolIcon className="w-3.5 h-3.5" /> Assigned Schools Status
                            </h3>
                            <div className="overflow-y-auto max-h-72 space-y-1.5">
                                {profile.assignedSchools.length === 0 && (
                                    <p className="text-xs text-gray-400 dark:text-slate-500 py-4 text-center">No schools mapped to this CC.</p>
                                )}
                                {profile.assignedSchools.map((s, i) => {
                                    const udise = String(s.udise_code || s.udise || '').trim();
                                    const vData = profile.visitsBySchool[udise];
                                    const visited = !!vData;
                                    const lastDt = vData?.lastDate ? formatDate(vData.lastDate) : '—';
                                    const cnt = vData?.visits?.length || 0;
                                    return (
                                        <div key={i}
                                            onClick={() => onNavigateToSchool && onNavigateToSchool(udise)}
                                            className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800 border-l-4 ${visited ? 'border-l-green-500' : 'border-l-red-400'} bg-gray-50/40 dark:bg-slate-800/30`}>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-black text-gray-800 dark:text-gray-200 truncate">{s.school_name}</p>
                                                <p className="text-[9px] text-gray-400 dark:text-slate-500 font-medium">{udise}</p>
                                            </div>
                                            <div className="flex items-center gap-2 ml-2">
                                                {visited ? (
                                                    <span className="text-[10px] font-bold text-green-700 dark:text-green-400">{lastDt}</span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-red-500 dark:text-red-400">Not Visited</span>
                                                )}
                                                <span className={`w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center ${visited ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                    {vData?.uniqueDates?.size || 0}
                                                </span>
                                                <ChevronRight className="w-3 h-3 text-gray-400" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Recent Visit Timeline */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-md">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 mb-3 border-b border-gray-100 dark:border-slate-800 pb-2 flex items-center gap-1.5">
                                <ClockIcon className="w-3.5 h-3.5" /> Recent Visit Timeline
                            </h3>
                            <div className="overflow-y-auto max-h-72 relative">
                                {profile.ccVisits.length === 0 && (
                                    <p className="text-xs text-gray-400 dark:text-slate-500 py-4 text-center">No visits recorded in selected period.</p>
                                )}
                                <div className="space-y-0">
                                    {profile.ccVisits.slice(0, 25).map((v, i) => {
                                        const school = schools.find(s => String(s.udise_code || s.udise || '').trim() === String(v.udise_code || v.udise || '').trim());
                                        const daysSince = getDaysSince(v.visit_date);
                                        return (
                                            <div key={i} className="flex gap-3 items-start pb-3 relative">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-7 h-7 rounded-full bg-teal-50 dark:bg-teal-900/20 border-2 border-teal-200 dark:border-teal-800 flex items-center justify-center flex-shrink-0">
                                                        <CalendarIcon className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                                                    </div>
                                                    {i < profile.ccVisits.slice(0, 25).length - 1 && (
                                                        <div className="w-0.5 bg-gray-100 dark:bg-slate-800 flex-1 mt-0.5" style={{ minHeight: '20px' }} />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 pb-1">
                                                    <p className="text-[11px] font-black text-gray-800 dark:text-gray-200 leading-tight truncate">{school?.school_name || (v.udise_code || v.udise || 'Unknown School')}</p>
                                                    <p className="text-[9px] text-teal-700 dark:text-teal-500 font-bold mt-0.5">{formatDate(v.visit_date)} <span className="text-gray-400 dark:text-slate-600 font-medium">· {daysSince !== null ? `${daysSince}d ago` : ''}</span></p>
                                                    {v.remarks && <p className="text-[9px] text-gray-400 dark:text-slate-500 italic mt-0.5 truncate">{v.remarks}</p>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Row 4: Benchmarks vs Project CCs ─────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                        {/* Ranking Bar Chart */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-md">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 mb-3 border-b border-gray-100 dark:border-slate-800 pb-2 flex items-center gap-1.5">
                                <TrophyIcon className="w-3.5 h-3.5" /> CC Ranking (by Visits)
                            </h3>
                            {profile.ccRankData.length > 1 ? (
                                <ReactApexChart
                                    options={rankChartOptions}
                                    series={[{ name: 'Visits', data: profile.ccRankData.map(r => r.visits) }]}
                                    type="bar"
                                    height={Math.max(200, profile.ccRankData.length * 28)}
                                />
                            ) : (
                                <p className="text-xs text-gray-400 py-4 text-center">Not enough CCs for comparison.</p>
                            )}
                        </div>

                        {/* Benchmark Comparisons */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-md">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 mb-4 border-b border-gray-100 dark:border-slate-800 pb-2 flex items-center gap-1.5">
                                <BarChartIcon className="w-3.5 h-3.5" /> CC vs Project Benchmark
                            </h3>
                            <div className="space-y-5">
                                {/* Visits comparison */}
                                <div>
                                    <div className="flex justify-between items-baseline mb-1.5">
                                        <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400">Total Visits</span>
                                        <div className="flex gap-2 text-[10px] font-bold">
                                            <span className="text-teal-700 dark:text-teal-400">{selectedCC}: <b>{profile.totalVisits}</b></span>
                                            <span className="text-gray-400">|</span>
                                            <span className="text-gray-500">Avg: <b>{profile.projectAvgVisits}</b></span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <div className="flex-1 h-2.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.min(100, (profile.totalVisits / Math.max(1, parseFloat(profile.projectAvgVisits) * 2)) * 100)}%` }} />
                                        </div>
                                        <div className="flex-1 h-2.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-gray-300 dark:bg-slate-600 rounded-full" style={{ width: '50%' }} />
                                        </div>
                                    </div>
                                </div>

                                {/* Coverage comparison */}
                                <div>
                                    <div className="flex justify-between items-baseline mb-1.5">
                                        <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400">Coverage %</span>
                                        <div className="flex gap-2 text-[10px] font-bold">
                                            <span className="text-teal-700 dark:text-teal-400">{selectedCC}: <b>{profile.coveragePct}%</b></span>
                                            <span className="text-gray-400">|</span>
                                            <span className="text-gray-500">Avg: <b>{profile.projectAvgCoverage}%</b></span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <div className="flex-1 h-2.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${profile.coveragePct >= parseFloat(profile.projectAvgCoverage) ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${profile.coveragePct}%` }} />
                                        </div>
                                        <div className="flex-1 h-2.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-gray-300 dark:bg-slate-600 rounded-full" style={{ width: `${parseFloat(profile.projectAvgCoverage)}%` }} />
                                        </div>
                                    </div>
                                </div>

                                {/* Composite Score comparison */}
                                <div>
                                    <div className="flex justify-between items-baseline mb-1.5">
                                        <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400">Composite Score</span>
                                        <span className="text-[10px] font-black text-teal-700 dark:text-teal-400">{profile.compositeScore}/100</span>
                                    </div>
                                    <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${profile.compositeScore >= 75 ? 'bg-green-500' : profile.compositeScore >= 50 ? 'bg-teal-500' : profile.compositeScore >= 30 ? 'bg-orange-500' : 'bg-red-500'}`}
                                            style={{ width: `${profile.compositeScore}%` }} />
                                    </div>
                                </div>

                                {/* Rank position */}
                                <div className="mt-3 flex items-center gap-3 bg-teal-50 dark:bg-teal-900/10 rounded-xl px-3 py-2 border border-teal-100/60 dark:border-teal-900/30">
                                    <TrophyIcon className="w-5 h-5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-black text-teal-900 dark:text-teal-300">Rank #{profile.rank} out of {profile.totalCCs} CCs</p>
                                        <p className="text-[10px] text-teal-600 dark:text-teal-500 font-medium">within the same project area</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Row 5: Insights & Action Panel ───────────── */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-md">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 mb-4 border-b border-gray-100 dark:border-slate-800 pb-2 flex items-center gap-1.5">
                            <AlertIcon className="w-3.5 h-3.5" /> Automated Insights & Action Recommendations
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* Alerts */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">⚠ Alerts</p>

                                {profile.unvisited.length === 0 && (
                                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20">
                                        <CheckIcon className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <p className="text-[11px] font-bold text-green-700 dark:text-green-400">All assigned schools have been visited. Excellent coverage!</p>
                                    </div>
                                )}

                                {profile.unvisited.length > 0 && (
                                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                                        <AlertIcon className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-[11px] font-bold text-red-700 dark:text-red-400">{profile.unvisited.length} schools not visited in this period.</p>
                                            <p className="text-[10px] text-red-500 dark:text-red-500 mt-0.5">{profile.unvisited.slice(0, 3).map(s => s.school_name).join(', ')}{profile.unvisited.length > 3 ? ` +${profile.unvisited.length - 3} more` : ''}</p>
                                        </div>
                                    </div>
                                )}

                                {profile.repeatVisits.length > 0 && (
                                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                                        <AlertIcon className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">Repeat Visit Alert: {profile.repeatVisits.length} school(s) visited 3+ times</p>
                                            <p className="text-[10px] text-amber-500 mt-0.5">Consider re-allocating time to unvisited schools.</p>
                                        </div>
                                    </div>
                                )}

                                {profile.lastVisitDays !== null && profile.lastVisitDays > 14 && (
                                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20">
                                        <ClockIcon className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                        <p className="text-[11px] font-bold text-orange-700 dark:text-orange-400">Last visit was {profile.lastVisitDays} days ago. No recent field activity recorded.</p>
                                    </div>
                                )}

                                {profile.coveragePct < 50 && (
                                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                                        <AlertIcon className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                        <p className="text-[11px] font-bold text-red-700 dark:text-red-400">Coverage below 50% — Critical. Immediate intervention required.</p>
                                    </div>
                                )}

                                {profile.rank === 1 && (
                                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/20">
                                        <TrophyIcon className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                                        <p className="text-[11px] font-bold text-teal-700 dark:text-teal-400">Top-ranked CC in the project! Outstanding performance.</p>
                                    </div>
                                )}
                            </div>

                            {/* Priority Recommendations */}
                            <div>
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">📍 Priority Schools to Visit Next</p>
                                {profile.prioritySchools.length === 0 ? (
                                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20">
                                        <CheckIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                                        <p className="text-[11px] font-bold text-green-700 dark:text-green-400">All schools are covered. Keep up the great work!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {profile.prioritySchools.slice(0, 5).map((s, i) => (
                                            <div key={i}
                                                onClick={() => onNavigateToSchool && onNavigateToSchool(String(s.udise_code || s.udise || '').trim())}
                                                className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-teal-300 dark:hover:border-teal-700 transition group">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${i === 0 ? 'bg-red-500 text-white' : i === 1 ? 'bg-orange-500 text-white' : 'bg-amber-400 text-white'}`}>
                                                    {i + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-black text-gray-800 dark:text-gray-200 truncate">{s.school_name}</p>
                                                    <p className="text-[9px] text-gray-400 dark:text-slate-500">{s.block}, {s.district}</p>
                                                </div>
                                                <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-teal-500 transition" />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Suggestion Box */}
                                <div className="mt-3 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 text-[11px] text-blue-800 dark:text-blue-300 font-medium">
                                    💡 <b>Suggestion:</b> Aim for at least {Math.max(1, Math.ceil(profile.assignedSchools.length / 4))} visits/week to achieve 100% coverage within the quarter.
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
