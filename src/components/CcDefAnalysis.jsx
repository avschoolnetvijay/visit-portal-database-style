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

const SparklesIcon = ({ className }) => (
    <svg className={className || 'w-4 h-4'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707-.707" />
        <circle cx="12" cy="12" r="4" />
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
export default function CcDefAnalysis({ schools = [], visits = [], jhpmsLab = [], edustat = [], startDate, endDate, ccNameMapping = {}, darkMode = false, onNavigateToSchool, manpower = [], edustatMaster = [], onDrillDown, visit360 = [] }) {
    const [selectedCC, setSelectedCC] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isMatrixExpanded, setIsMatrixExpanded] = useState(false);
    const [selectedAnalysisTab, setSelectedAnalysisTab] = useState('performance');

    // Build schools map once for O(1) lookups
    const schoolsMap = useMemo(() => {
        const map = {};
        schools.forEach(s => {
            const ud = String(s.udise_code || s.udise || '').trim();
            if (ud) {
                map[ud] = s;
                let clean = ud;
                if (clean.endsWith('.0')) clean = clean.substring(0, clean.length - 2);
                map[clean] = s;
            }
        });
        return map;
    }, [schools]);

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

    // Helper to normalize CC names for comparison
    const cleanName = (n) => String(n || '').trim().toLowerCase();

    // Group Visit 360 records by date
    const cc360RecordsByDate = useMemo(() => {
        const map = {};
        if (!selectedCC || !visit360 || visit360.length === 0) return map;
        
        const filtered = visit360.filter(row => {
            const matchName = cleanName(row.staff_name) === cleanName(selectedCC);
            const matchDate = row.visit_date && row.visit_date >= startDate && row.visit_date <= endDate;
            return matchName && matchDate;
        });

        filtered.forEach(row => {
            const d = row.visit_date;
            if (!map[d]) map[d] = [];
            map[d].push(row);
        });
        return map;
    }, [visit360, selectedCC, startDate, endDate]);

    // Group portal visits by date
    const portalVisitsByDate = useMemo(() => {
        const map = {};
        if (!profile || !profile.ccVisits) return map;
        profile.ccVisits.forEach(v => {
            const d = String(v.visit_date || '').split('T')[0];
            if (d) {
                if (!map[d]) map[d] = [];
                map[d].push(v);
            }
        });
        return map;
    }, [profile]);

    // Sorted activity dates
    const sortedActivityDates = useMemo(() => {
        const dates = new Set([
            ...Object.keys(cc360RecordsByDate),
            ...Object.keys(portalVisitsByDate)
        ]);
        return Array.from(dates).sort().reverse();
    }, [cc360RecordsByDate, portalVisitsByDate]);

    // Summary statistics for Visit 360 tracking
    const trackingStats = useMemo(() => {
        let totalShiftHours = 0;
        let activeDaysCount = 0;
        let schoolVisitsCount360 = 0;
        let schoolVisitsDuration360 = 0;
        let discrepancyCount = 0;

        Object.entries(cc360RecordsByDate).forEach(([date, records]) => {
            const dayInOut = records.find(r => String(r.visit_type).toLowerCase().includes('day'));
            if (dayInOut) {
                activeDaysCount++;
                totalShiftHours += parseFloat(dayInOut.duration) || 0;
            }

            const schoolRecs = records.filter(r => String(r.visit_type).toLowerCase().includes('school'));
            schoolVisitsCount360 += schoolRecs.length;
            schoolRecs.forEach(r => {
                schoolVisitsDuration360 += parseFloat(r.duration) || 0;
            });
        });

        // Count mismatches
        sortedActivityDates.forEach(date => {
            const recs360 = cc360RecordsByDate[date] || [];
            const recsPortal = portalVisitsByDate[date] || [];
            
            const schoolUdises360 = new Set(
                recs360
                    .filter(r => String(r.visit_type).toLowerCase().includes('school'))
                    .map(r => String(r.udise_code || '').trim())
                    .filter(Boolean)
            );

            const schoolUdisesPortal = new Set(
                recsPortal
                    .map(v => String(v.udise_code || '').trim())
                    .filter(Boolean)
            );

            // Mismatch: portal has school but 360 doesn't
            schoolUdisesPortal.forEach(u => {
                if (!schoolUdises360.has(u)) discrepancyCount++;
            });

            // Mismatch: 360 has school but portal doesn't
            schoolUdises360.forEach(u => {
                if (!schoolUdisesPortal.has(u)) discrepancyCount++;
            });
        });

        const avgShift = activeDaysCount > 0 ? (totalShiftHours / activeDaysCount).toFixed(1) : 0;
        const avgSchoolTime = schoolVisitsCount360 > 0 ? ((schoolVisitsDuration360 * 60) / schoolVisitsCount360).toFixed(0) : 0;

        return {
            totalShiftHours: totalShiftHours.toFixed(1),
            activeDaysCount,
            avgShift,
            avgSchoolTime,
            discrepancyCount
        };
    }, [cc360RecordsByDate, portalVisitsByDate, sortedActivityDates]);

    // Simple helper to format HH:MM:SS to HH:MM AM/PM
    const formatTimeAMPM = (timeStr) => {
        if (!timeStr) return '-';
        const parts = timeStr.split(':');
        if (parts.length < 2) return timeStr;
        let hrs = parseInt(parts[0], 10);
        const mins = String(parts[1]).padStart(2, '0');
        const ampm = hrs >= 12 ? 'PM' : 'AM';
        hrs = hrs % 12;
        hrs = hrs ? hrs : 12;
        return `${String(hrs).padStart(2, '0')}:${mins} ${ampm}`;
    };

    // ── Profile computation ──────────────────────────────────────────────────
    const profile = useMemo(() => {
        if (!selectedCC) return null;

        // Assigned schools (mapped by visitor_name in school master)
        const assignedSchools = schools.filter(s => (s.visitor_name || '').trim() === selectedCC.trim());
        const assignedSchoolUdises = new Set(assignedSchools.map(s => String(s.udise_code || s.udise || '').trim()));

        // Date range days
        const rangeDays = startD && endD ? Math.max(1, Math.ceil((endD - startD) / 86400000) + 1) : 30;

        // Shift range back by rangeDays to find previous period range
        let prevStartD = null;
        let prevEndD = null;
        if (startD && endD) {
            prevEndD = new Date(startD);
            prevEndD.setDate(prevEndD.getDate() - 1);
            prevEndD.setHours(23, 59, 59, 999);

            prevStartD = new Date(prevEndD);
            prevStartD.setDate(prevStartD.getDate() - rangeDays + 1);
            prevStartD.setHours(0, 0, 0, 0);
        }

        const inPrevRange = (dateStr) => {
            const d = parseDateLocal(dateStr);
            if (!d || !prevStartD || !prevEndD) return false;
            if (d < prevStartD || d > prevEndD) return false;
            return true;
        };

        // All visits by this CC in date range
        const ccVisits = visits.filter(v => {
            const vName = (v.visitor_name || v.cc_name || v.def_name || '').trim();
            return vName === selectedCC.trim() && inRange(v.visit_date);
        });

        // Previous visits by this CC
        const prevCcVisits = visits.filter(v => {
            const vName = (v.visitor_name || v.cc_name || v.def_name || '').trim();
            return vName === selectedCC.trim() && inPrevRange(v.visit_date);
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

        // Split unique day visit counts for previous period
        const prevAssignedUniqueVisitSet = new Set();
        const prevOtherUniqueVisitSet = new Set();

        prevCcVisits.forEach(v => {
            const ud = String(v.udise_code || v.udise || '').trim();
            const d = parseDateLocal(v.visit_date);
            if (ud && d) {
                const dateStr = d.toISOString().split('T')[0];
                if (assignedSchoolUdises.has(ud)) {
                    prevAssignedUniqueVisitSet.add(`${ud}_${dateStr}`);
                } else {
                    prevOtherUniqueVisitSet.add(`${ud}_${dateStr}`);
                }
            }
        });

        const prevAssignedVisitsCount = prevAssignedUniqueVisitSet.size;
        const prevOtherVisitsCount = prevOtherUniqueVisitSet.size;
        const prevTotalVisits = prevAssignedVisitsCount + prevOtherVisitsCount;

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
        let ictCount = 0;
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
            } else if (labType.includes('ICT') && subject.includes('COMPUTER')) {
                ictCount++;
                if (theoryPractical.includes('PRACTICAL')) {
                    practicalCount++;
                } else {
                    theoryCount++;
                }
            } else if (labType.includes('SMART')) {
                smartCount++;
            }
        });
        const totalJhpmsClasses = ictCount + smartCount;
        const totalEduHours = ccEdustat.reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);

        // Previous Period Calculations
        const prevVisitsBySchool = {};
        prevCcVisits.forEach(v => {
            const ud = String(v.udise_code || v.udise || '').trim();
            if (!ud) return;
            if (!prevVisitsBySchool[ud]) {
                prevVisitsBySchool[ud] = { 
                    visits: [], 
                    lastDate: null,
                    uniqueDates: new Set()
                };
            }
            prevVisitsBySchool[ud].visits.push(v);
            const d = parseDateLocal(v.visit_date);
            if (d) {
                prevVisitsBySchool[ud].uniqueDates.add(d.toISOString().split('T')[0]);
            }
            if (d && (!prevVisitsBySchool[ud].lastDate || d > parseDateLocal(prevVisitsBySchool[ud].lastDate))) {
                prevVisitsBySchool[ud].lastDate = v.visit_date;
            }
        });
        const prevVisitedAssignedCount = assignedSchools.filter(s => prevVisitsBySchool[String(s.udise_code || s.udise || '').trim()]).length;
        const prevCoveragePct = assignedSchools.length > 0 ? Math.round((prevVisitedAssignedCount / assignedSchools.length) * 100) : 0;

        const prevCcJhpms = jhpmsLab.filter(j => {
            const ud = String(j.udise || '').trim();
            return ccUdises.has(ud) && inPrevRange(j.date);
        });
        const prevCcEdustat = edustat.filter(e => {
            const ud = String(e.udise || '').trim();
            return ccUdises.has(ud) && inPrevRange(e.date);
        });

        let prevIctCount = 0;
        let prevTheoryCount = 0;
        let prevPracticalCount = 0;
        let prevSmartCount = 0;
        let prevMisCount = 0;

        prevCcJhpms.forEach(l => {
            const labType = String(l.labType || getVal(l, 'lab') || '').toUpperCase();
            const subject = String(l.subject || getVal(l, 'sub') || '').toUpperCase();
            const theoryPractical = String(l.theoryPractical || getVal(l, 'theoryPractical') || getVal(l, 'theory/practical') || getVal(l, 'theorypractical') || '').toUpperCase();

            if (subject.split(/[^A-Z0-9]+/).includes('MIS')) {
                prevMisCount++;
            } else if (labType.includes('ICT') && subject.includes('COMPUTER')) {
                prevIctCount++;
                if (theoryPractical.includes('PRACTICAL')) {
                    prevPracticalCount++;
                } else {
                    prevTheoryCount++;
                }
            } else if (labType.includes('SMART')) {
                prevSmartCount++;
            }
        });
        const prevTotalJhpmsClasses = prevIctCount + prevSmartCount;
        const prevTotalEduHours = prevCcEdustat.reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);

        // School-by-school JHPMS and EduStat counts (both periods)
        const jhpmsBySchool = {};
        ccJhpms.forEach(j => {
            const ud = String(j.udise || '').trim();
            if (!ud) return;
            jhpmsBySchool[ud] = (jhpmsBySchool[ud] || 0) + 1;
        });

        const prevJhpmsBySchool = {};
        prevCcJhpms.forEach(j => {
            const ud = String(j.udise || '').trim();
            if (!ud) return;
            prevJhpmsBySchool[ud] = (prevJhpmsBySchool[ud] || 0) + 1;
        });

        const edustatBySchool = {};
        ccEdustat.forEach(e => {
            const ud = String(e.udise || '').trim();
            if (!ud) return;
            edustatBySchool[ud] = (edustatBySchool[ud] || 0) + (parseFloat(e.hours) || 0);
        });

        const prevEdustatBySchool = {};
        prevCcEdustat.forEach(e => {
            const ud = String(e.udise || '').trim();
            if (!ud) return;
            prevEdustatBySchool[ud] = (prevEdustatBySchool[ud] || 0) + (parseFloat(e.hours) || 0);
        });

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
        const avgVisitsPerWeek = ((totalVisits / rangeDays) * 7).toFixed(1);

        // Ranking among all CCs in same project - based on unique days visit count
        const allProjectCCs = [...new Set(schools.filter(s => {
            const proj = assignedSchools[0]?.project_name;
            return proj ? s.project_name === proj : true;
        }).map(s => (s.visitor_name || '').trim()).filter(Boolean))];

        // Build mapping of CC -> Set of UDISE codes for schools
        const ccToSchoolUdises = {};
        schools.forEach(s => {
            const cc = (s.visitor_name || '').trim();
            if (!cc) return;
            if (!ccToSchoolUdises[cc]) ccToSchoolUdises[cc] = new Set();
            ccToSchoolUdises[cc].add(String(s.udise_code || s.udise || '').trim());
        });

        // Build mapping of CC -> Set of school-date signatures (to count unique day visits)
        const ccToUniqueVisits = {};
        // Build mapping of CC -> Set of visited school UDISEs (to calculate coverage pct)
        const ccToVisitedSchoolUdises = {};

        visits.forEach(v => {
            const cc = (v.visitor_name || v.cc_name || '').trim();
            if (!cc) return;
            if (!inRange(v.visit_date)) return;

            const ud = String(v.udise_code || v.udise || '').trim();
            const d = parseDateLocal(v.visit_date);
            if (ud && d) {
                const dateStr = d.toISOString().split('T')[0];
                if (!ccToUniqueVisits[cc]) ccToUniqueVisits[cc] = new Set();
                ccToUniqueVisits[cc].add(`${ud}_${dateStr}`);

                if (!ccToVisitedSchoolUdises[cc]) ccToVisitedSchoolUdises[cc] = new Set();
                ccToVisitedSchoolUdises[cc].add(ud);
            }
        });

        const ccRankData = allProjectCCs.map(cc => {
            const uniqueVisitsSet = ccToUniqueVisits[cc] || new Set();
            const ccV = uniqueVisitsSet.size;

            const ccSchoolUdises = ccToSchoolUdises[cc] || new Set();
            const ccSchoolsCount = ccSchoolUdises.size;

            // Coverage percentage (visited assigned schools / total assigned schools)
            const visitedUdisesSet = ccToVisitedSchoolUdises[cc] || new Set();
            let visitedAssignedCount = 0;
            ccSchoolUdises.forEach(ud => {
                if (visitedUdisesSet.has(ud)) visitedAssignedCount++;
            });

            const pct = ccSchoolsCount > 0 ? (visitedAssignedCount / ccSchoolsCount) * 100 : 0;
            return { cc, visits: ccV, assigned: ccSchoolsCount, pct: Math.min(100, pct) };
        }).sort((a, b) => b.pct - a.pct || b.visits - a.visits);

        const rankIndex = ccRankData.findIndex(r => r.cc === selectedCC);
        const rank = rankIndex + 1;
        const totalCCs = ccRankData.length;

        // Project avg visits
        const projectAvgVisits = ccRankData.length > 0 ? (ccRankData.reduce((s, r) => s + r.visits, 0) / ccRankData.length).toFixed(1) : 0;
        const projectAvgCoverage = ccRankData.length > 0 ? (ccRankData.reduce((s, r) => s + r.pct, 0) / ccRankData.length).toFixed(1) : 0;

        // Weekly trend - unique school-dates per week comparison (Current vs Previous period aligned)
        const getWeekIndex = (date, baseDate) => {
            if (!date || !baseDate) return 0;
            const diffTime = Math.abs(date.getTime() - baseDate.getTime());
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            return Math.floor(diffDays / 7);
        };

        const currWeekVisits = {};
        const seenCurrSchoolDates = new Set();
        ccVisits.forEach(v => {
            const ud = String(v.udise_code || v.udise || '').trim();
            const d = parseDateLocal(v.visit_date);
            if (!d || !ud) return;
            const dateStr = d.toISOString().split('T')[0];
            const signature = `${ud}_${dateStr}`;
            if (seenCurrSchoolDates.has(signature)) return;
            seenCurrSchoolDates.add(signature);

            const wIdx = getWeekIndex(d, startD);
            currWeekVisits[wIdx] = (currWeekVisits[wIdx] || 0) + 1;
        });

        const prevWeekVisits = {};
        const seenPrevSchoolDates = new Set();
        prevCcVisits.forEach(v => {
            const ud = String(v.udise_code || v.udise || '').trim();
            const d = parseDateLocal(v.visit_date);
            if (!d || !ud) return;
            const dateStr = d.toISOString().split('T')[0];
            const signature = `${ud}_${dateStr}`;
            if (seenPrevSchoolDates.has(signature)) return;
            seenPrevSchoolDates.add(signature);

            const wIdx = getWeekIndex(d, prevStartD);
            prevWeekVisits[wIdx] = (prevWeekVisits[wIdx] || 0) + 1;
        });

        // Determine max weeks to render
        const maxWeeks = Math.max(
            Object.keys(currWeekVisits).length > 0 ? Math.max(...Object.keys(currWeekVisits).map(Number)) + 1 : 0,
            Object.keys(prevWeekVisits).length > 0 ? Math.max(...Object.keys(prevWeekVisits).map(Number)) + 1 : 0,
            4 // Minimum 4 weeks for nice chart rendering
        );

        const trendLabels = Array.from({ length: maxWeeks }, (_, i) => `Wk ${i + 1}`);
        const currTrendSeries = Array.from({ length: maxWeeks }, (_, i) => currWeekVisits[i] || 0);
        const prevTrendSeries = Array.from({ length: maxWeeks }, (_, i) => prevWeekVisits[i] || 0);

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

        // Previous Period Performance score
        const maxVisitsPrev = Math.max(...ccRankData.map(r => r.visits), 1);
        const prevCompositeScore = Math.round(
            (prevCoveragePct * 0.4) +
            (scoreNorm(prevTotalVisits, maxVisitsPrev) * 0.35) +
            (scoreNorm(prevTotalJhpmsClasses, Math.max(...(ccRankData.map(r => r.assigned * 15)), 1)) * 0.15) +
            (scoreNorm(prevTotalEduHours, Math.max(...(ccRankData.map(r => r.assigned * 30)), 1)) * 0.1)
        );

        // ── Heuristics Engine / AI Insights (At least 10 custom metrics) ───────
        
        // 1. Visit Coverage Velocity
        const visitDelta = totalVisits - prevTotalVisits;
        let insight1Text = '';
        let insight1Type = 'info';
        if (visitDelta > 0) {
            const pct = prevTotalVisits > 0 ? ((visitDelta / prevTotalVisits) * 100).toFixed(1) : '100';
            insight1Text = `Field activity accelerated: CC conducted ${totalVisits} visits this period vs ${prevTotalVisits} last period (an increase of ${visitDelta} visits, +${pct}%).`;
            insight1Type = 'success';
        } else if (visitDelta < 0) {
            const pct = prevTotalVisits > 0 ? ((Math.abs(visitDelta) / prevTotalVisits) * 100).toFixed(1) : '100';
            insight1Text = `Field activity decelerated: CC conducted ${totalVisits} visits this period vs ${prevTotalVisits} last period (a drop of ${Math.abs(visitDelta)} visits, -${pct}%).`;
            insight1Type = 'warning';
        } else {
            insight1Text = `Field activity stayed completely stable at ${totalVisits} visits compared to the previous period.`;
            insight1Type = 'info';
        }

        // 2. Resource Allocation Skew (neglected vs over-visited)
        const overVisitedSchools = assignedSchools.filter(s => {
            const ud = String(s.udise_code || s.udise || '').trim();
            return visitsBySchool[ud] && visitsBySchool[ud].uniqueDates.size >= 3;
        });
        let insight2Text = '';
        let insight2Type = 'info';
        if (overVisitedSchools.length > 0 && unvisited.length > 0) {
            const schoolNamesWithVisits = overVisitedSchools.map(s => {
                const ud = String(s.udise_code || s.udise || '').trim();
                const visitCount = visitsBySchool[ud]?.uniqueDates.size || 0;
                return `${s.school_name} (${visitCount} visits)`;
            }).join(', ');
            insight2Text = `Resource skew detected: CC conducted multiple visits to ${schoolNamesWithVisits} while ${unvisited.length} assigned schools remain completely unvisited. Consider rebalancing weekly plans.`;
            insight2Type = 'warning';
        } else {
            insight2Text = `Visit distribution is balanced: No significant over-visiting of schools while leaving others neglected.`;
            insight2Type = 'success';
        }

        // 3. Drastic Decline in Class Delivery (JHPMS)
        const classDrops = [];
        assignedSchools.forEach(s => {
            const ud = String(s.udise_code || s.udise || '').trim();
            const currClasses = ccJhpms.filter(j => String(j.udise).trim() === ud).length;
            const prevClasses = jhpmsLab.filter(j => String(j.udise).trim() === ud && inPrevRange(j.date)).length;
            if (prevClasses >= 5 && currClasses < prevClasses && (currClasses / prevClasses) <= 0.6) {
                classDrops.push({ name: s.school_name, curr: currClasses, prev: prevClasses });
            }
        });
        let insight3Text = '';
        let insight3Type = 'info';
        if (classDrops.length > 0) {
            const listStr = classDrops.map(d => `${d.name} (fell to ${d.curr} from ${d.prev})`).join(', ');
            insight3Text = `Drastic class delivery drop: JHPMS classes at ${listStr} declined by over 40% compared to the previous period.`;
            insight3Type = 'error';
        } else {
            insight3Text = `Classroom instruction stability: No assigned schools registered a drastic drop (>40%) in JHPMS classes.`;
            insight3Type = 'success';
        }

        // 4. Outstanding Progress in Class Delivery
        const classRises = [];
        assignedSchools.forEach(s => {
            const ud = String(s.udise_code || s.udise || '').trim();
            const currClasses = ccJhpms.filter(j => String(j.udise).trim() === ud).length;
            const prevClasses = jhpmsLab.filter(j => String(j.udise).trim() === ud && inPrevRange(j.date)).length;
            if (currClasses >= 5 && currClasses > prevClasses && (prevClasses === 0 || (currClasses / prevClasses) >= 1.4)) {
                classRises.push({ name: s.school_name, curr: currClasses, prev: prevClasses });
            }
        });
        let insight4Text = '';
        let insight4Type = 'info';
        if (classRises.length > 0) {
            const listStr = classRises.map(r => `${r.name} (rose to ${r.curr} from ${r.prev})`).join(', ');
            insight4Text = `Outstanding class delivery growth: JHPMS classes at ${listStr} surged by over 40% compared to the previous period.`;
            insight4Type = 'success';
        } else {
            insight4Text = `Steady instruction delivery: Class counts are stable without any rapid increases or spikes.`;
            insight4Type = 'info';
        }

        // 5. Cross-Project Scope Involvement
        const otherProjectUniqueVisits = new Set();
        const otherProjectVisits = ccVisits.filter(v => {
            const ud = String(v.udise_code || v.udise || '').trim();
            const matchedSchool = schoolsMap[ud];
            if (!matchedSchool) return false;
            const primaryProj = assignedSchools[0]?.project_name;
            const isOtherProj = primaryProj && matchedSchool.project_name && matchedSchool.project_name.toLowerCase() !== primaryProj.toLowerCase();
            if (isOtherProj) {
                const d = parseDateLocal(v.visit_date);
                if (d) {
                    const dateStr = d.toISOString().split('T')[0];
                    otherProjectUniqueVisits.add(`${ud}_${dateStr}`);
                }
            }
            return isOtherProj;
        });
        const otherProjectVisitsCount = otherProjectUniqueVisits.size;
        let insight5Text = '';
        let insight5Type = 'info';
        if (otherProjectVisitsCount > 0) {
            const projects = Array.from(new Set(otherProjectVisits.map(v => {
                const ud = String(v.udise_code || v.udise || '').trim();
                return schoolsMap[ud]?.project_name || 'Other';
            })));
            insight5Text = `Cross-project collaboration: CC performed ${otherProjectVisitsCount} visits to schools in external projects (${projects.join(', ')}), demonstrating support beyond primary assigned zone.`;
            insight5Type = 'info';
        } else {
            insight5Text = `Focused project alignment: 100% of CC visits were confined within their assigned primary project boundaries.`;
            insight5Type = 'success';
        }

        // 6. Digital Device Sync Slump
        const deviceSlumps = [];
        installedDevicesList.forEach(d => {
            const serial = String(d.serial || '').trim();
            const currHours = serialHoursMap[serial] || 0;
            const prevHours = prevCcEdustat.filter(e => String(e.serial).trim() === serial).reduce((acc, curr) => acc + (parseFloat(curr.hours) || 0), 0);
            if (prevHours > 10 && currHours === 0) {
                const sch = schoolsMap[String(d.udise).trim()];
                deviceSlumps.push(sch ? sch.school_name : d.udise);
            }
        });
        let insight6Text = '';
        let insight6Type = 'info';
        if (deviceSlumps.length > 0) {
            insight6Text = `Device sync alerts: EduStat devices at ${deviceSlumps.join(', ')} went completely offline (0 hours logged) after active syncing in the previous period.`;
            insight6Type = 'error';
        } else {
            insight6Text = `Stable device syncing: No previously active digital devices dropped to zero activity in this period.`;
            insight6Type = 'success';
        }

        // 7. Manpower Vacancy Correlation
        let vacantClassCount = 0;
        let workingClassCount = 0;
        let vacantSyncHours = 0;
        let workingSyncHours = 0;
        let vacantCount = 0;
        let workingCount = 0;

        assignedSchools.forEach(s => {
            const ud = String(s.udise_code || s.udise || '').trim();
            const schoolManpower = manpower.filter(m => String(m.udise).trim() === ud);
            const working = schoolManpower.some(m => String(m.status).toUpperCase().trim() === 'WORKING');
            const classes = ccJhpms.filter(j => String(j.udise).trim() === ud).length;
            const sync = ccEdustat.filter(e => String(e.udise).trim() === ud).reduce((acc, curr) => acc + (parseFloat(curr.hours) || 0), 0);
            if (working) {
                workingClassCount += classes;
                workingSyncHours += sync;
                workingCount++;
            } else {
                vacantClassCount += classes;
                vacantSyncHours += sync;
                vacantCount++;
            }
        });

        const avgWorkingClass = workingCount > 0 ? (workingClassCount / workingCount) : 0;
        const avgVacantClass = vacantCount > 0 ? (vacantClassCount / vacantCount) : 0;

        let insight7Text = '';
        let insight7Type = 'info';
        if (vacantCount > 0 && avgWorkingClass > avgVacantClass * 1.5) {
            insight7Text = `Manpower vacancy impact: Schools with working instructors averaged ${avgWorkingClass.toFixed(1)} classes, compared to only ${avgVacantClass.toFixed(1)} classes in vacant schools (an impact gap of ${Math.round((avgWorkingClass - avgVacantClass) / (avgWorkingClass || 1) * 100)}%).`;
            insight7Type = 'warning';
        } else {
            insight7Text = `Manpower status is not limiting performance: Vacant schools are maintaining classroom instruction levels close to working ones.`;
            insight7Type = 'success';
        }

        // 8. Field Activity Inactivity Gap
        let maxGapDays = 0;
        let maxGapStart = null;
        let maxGapEnd = null;
        if (sortedVisits.length > 1) {
            const chronVisits = [...sortedVisits].sort((a, b) => new Date(a.visit_date) - new Date(b.visit_date));
            for (let i = 0; i < chronVisits.length - 1; i++) {
                const d1 = new Date(chronVisits[i].visit_date);
                const d2 = new Date(chronVisits[i+1].visit_date);
                const gap = Math.floor((d2 - d1) / (86400000)) - 1;
                if (gap > maxGapDays) {
                    maxGapDays = gap;
                    maxGapStart = chronVisits[i].visit_date;
                    maxGapEnd = chronVisits[i+1].visit_date;
                }
            }
        }
        let insight8Text = '';
        let insight8Type = 'info';
        if (maxGapDays >= 7) {
            insight8Text = `Field inactivity gap: CC had a consecutive block of ${maxGapDays} days without logging any school visits (from ${formatDate(maxGapStart)} to ${formatDate(maxGapEnd)}). Ensure visit schedules are consistent.`;
            insight8Type = 'warning';
        } else {
            insight8Text = `Consistent field coverage: Maximum consecutive gap between school visits was only ${maxGapDays} days, showing high frequency.`;
            insight8Type = 'success';
        }

        // 9. External vs. Internal Effort Bias
        const otherVisitsPct = totalVisits > 0 ? Math.round((otherVisitsCount / totalVisits) * 100) : 0;
        let insight9Text = '';
        let insight9Type = 'info';
        if (otherVisitsPct >= 30) {
            insight9Text = `High external effort bias: ${otherVisitsPct}% of CC visits (${otherVisitsCount} visits) were to unassigned schools. Focus on completing assigned coverage first.`;
            insight9Type = 'warning';
        } else {
            insight9Text = `Targeted focus: CC dedicated ${100 - otherVisitsPct}% of their visits to assigned schools.`;
            insight9Type = 'success';
        }

        // 10. Administrative/MIS Duty Overhead Warning
        const misPct = totalJhpmsClasses > 0 ? Math.round((misCount / (totalJhpmsClasses + misCount)) * 100) : 0;
        let insight10Text = '';
        let insight10Type = 'info';
        if (misPct >= 30) {
            insight10Text = `Admin Overhead Alert: MIS entries make up ${misPct}% of CC's classroom records, indicating a heavy administrative workload at the cost of computer lab delivery.`;
            insight10Type = 'warning';
        } else {
            insight10Text = `Balanced admin ratio: MIS entries make up only ${misPct}% of school logs. ICT Instructor is primarily used for classroom teaching.`;
            insight10Type = 'success';
        }

        const aiInsights = [
            { id: 1, title: 'Visit Coverage Velocity', text: insight1Text, type: insight1Type },
            { id: 2, title: 'Resource Allocation Skew', text: insight2Text, type: insight2Type },
            { id: 3, title: 'JHPMS Classroom Delivery Drop', text: insight3Text, type: insight3Type },
            { id: 4, title: 'JHPMS Classroom Delivery Growth', text: insight4Text, type: insight4Type },
            { id: 5, title: 'Cross-Project Activity', text: insight5Text, type: insight5Type },
            { id: 6, title: 'Device Sync Status', text: insight6Text, type: insight6Type },
            { id: 7, title: 'Manpower Vacancy Correlation', text: insight7Text, type: insight7Type },
            { id: 8, title: 'Field Activity Inactivity Gap', text: insight8Text, type: insight8Type },
            { id: 9, title: 'External vs. Internal Effort', text: insight9Text, type: insight9Type },
            { id: 10, title: 'Admin / MIS Duty Ratio', text: insight10Text, type: insight10Type }
        ];

        return {
            assignedSchools, ccVisits: sortedVisits, visitsBySchool,
            prevVisitsBySchool, jhpmsBySchool, prevJhpmsBySchool,
            edustatBySchool, prevEdustatBySchool,
            visitedAssigned, unvisited, repeatVisits,
            coveragePct, totalVisits, uniqueSchoolsVisited, avgVisitsPerSchool,
            avgVisitsPerWeek, totalJhpmsClasses, totalEduHours,
            rank, totalCCs, projectAvgVisits, projectAvgCoverage,
            trendSeries: currTrendSeries,
            currTrendSeries,
            prevTrendSeries,
            trendLabels, prioritySchools, lastVisit,
            lastVisitDays, compositeScore, ccRankData: ccRankData.slice(0, 10),
            totalIctVisits, totalSmartVisits,
            
            // Previous Period variables
            prevTotalVisits,
            prevCoveragePct,
            prevTotalJhpmsClasses,
            prevTotalEduHours,
            prevCompositeScore,
            aiInsights,
            
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
        colors: ['#0d9488', '#64748b'],
        xaxis: { categories: profile?.trendLabels || [], labels: { style: { colors: darkMode ? '#94a3b8' : '#6b7280', fontSize: '10px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { style: { colors: darkMode ? '#94a3b8' : '#6b7280', fontSize: '10px' } }, tickAmount: 4 },
        grid: { borderColor: darkMode ? '#1e293b' : '#f1f5f9', strokeDashArray: 3 },
        tooltip: { theme: darkMode ? 'dark' : 'light', y: { formatter: v => `${v} visits` } },
        dataLabels: { enabled: false },
        legend: { show: true, position: 'top', horizontalAlign: 'right', labels: { colors: darkMode ? '#94a3b8' : '#64748b' } }
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
    const getCombinedVisitType = (logs) => {
        const types = logs.map(l => String(l.visit_type || '').toUpperCase());
        const hasIct = types.some(t => t.includes('ICT'));
        const hasSmart = types.some(t => t.includes('SMART'));
        if (hasIct && hasSmart) return "ICT+Smart";
        if (hasIct) return "ICT";
        if (hasSmart) return "Smart";
        const uniqueTypes = Array.from(new Set(logs.map(l => String(l.visit_type || '').trim()).filter(Boolean)));
        return uniqueTypes.join(' + ') || 'N/A';
    };

    const handleTotalVisitsDrillDown = () => {
        if (!profile || !profile.ccVisits || !onDrillDown) return;
        
        // Group by (udise, date)
        const grouped = {};
        profile.ccVisits.forEach(v => {
            const udise = String(v.udise_code || v.udise || '').trim();
            const d = parseDateLocal(v.visit_date);
            if (!udise || !d) return;
            const dateStr = d.toISOString().split('T')[0];
            const key = `${udise}_${dateStr}`;
            if (!grouped[key]) {
                grouped[key] = {
                    udise,
                    date: v.visit_date,
                    dateObj: d,
                    logs: []
                };
            }
            grouped[key].logs.push(v);
        });

        const sortedGroups = Object.values(grouped).sort((a, b) => b.dateObj - a.dateObj);

        const drillData = sortedGroups.map((g, idx) => {
            const school = schoolsMap[g.udise];
            const isAssigned = profile.assignedSchoolUdises.has(g.udise);
            const combinedType = getCombinedVisitType(g.logs);
            const remarksList = g.logs.map(l => String(l.remarks || '').trim()).filter(Boolean);
            const combinedRemarks = remarksList.join(' | ') || '—';
            
            return {
                "Sl No": idx + 1,
                "School Name": school?.school_name || "Unknown School",
                "UDISE": g.udise,
                "District": school?.district_name || "N/A",
                "Project Name": school?.project_name || "N/A",
                "Assigned CC/DEF": school?.visitor_name || "N/A",
                "Date": formatDate(g.date),
                "Visit Type": combinedType,
                "Assignment": isAssigned ? "Assigned School" : "Other School",
                "Remarks": combinedRemarks
            };
        });
        onDrillDown(`All CC Visits - ${selectedCC}`, drillData);
    };

    const handleOtherVisitsDrillDown = () => {
        if (!profile || !profile.ccVisits || !onDrillDown) return;
        const otherVisits = profile.ccVisits.filter(v => !profile.assignedSchoolUdises.has(String(v.udise_code || v.udise || '').trim()));
        
        // Group by (udise, date)
        const grouped = {};
        otherVisits.forEach(v => {
            const udise = String(v.udise_code || v.udise || '').trim();
            const d = parseDateLocal(v.visit_date);
            if (!udise || !d) return;
            const dateStr = d.toISOString().split('T')[0];
            const key = `${udise}_${dateStr}`;
            if (!grouped[key]) {
                grouped[key] = {
                    udise,
                    date: v.visit_date,
                    dateObj: d,
                    logs: []
                };
            }
            grouped[key].logs.push(v);
        });

        const sortedGroups = Object.values(grouped).sort((a, b) => b.dateObj - a.dateObj);

        const drillData = sortedGroups.map((g, idx) => {
            const school = schoolsMap[g.udise];
            const combinedType = getCombinedVisitType(g.logs);
            const remarksList = g.logs.map(l => String(l.remarks || '').trim()).filter(Boolean);
            const combinedRemarks = remarksList.join(' | ') || '—';
            
            return {
                "Sl No": idx + 1,
                "School Name": school?.school_name || "Unknown School",
                "UDISE": g.udise,
                "District": school?.district_name || "N/A",
                "Project Name": school?.project_name || "N/A",
                "Assigned CC/DEF": school?.visitor_name || "N/A",
                "Date": formatDate(g.date),
                "Visit Type": combinedType,
                "Remarks": combinedRemarks
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
            const school = schoolsMap[ud];
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
            const school = schoolsMap[ud];
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
            const school = schoolsMap[ud];
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

    const handleManpowerReqDrillDown = () => {
        if (!profile || !profile.assignedSchools || !onDrillDown) return;
        const drillData = profile.assignedSchools.map((s, idx) => {
            const ud = String(s.udise_code || s.udise || '').trim();
            const schoolManpower = manpower.filter(m => String(m.udise).trim() === ud);
            const workingStaff = schoolManpower.find(m => String(m.status).toUpperCase().trim() === 'WORKING');
            const statusStr = workingStaff ? "Working" : "Vacant";
            const nameStr = workingStaff?.instructorName || workingStaff?.instructor_name || "—";
            
            return {
                "Sl No": idx + 1,
                "School Name": s.school_name || "Unknown School",
                "UDISE": ud,
                "District": s.district_name || "N/A",
                "Project Name": s.project_name || "N/A",
                "Assigned CC/DEF": s.visitor_name || "N/A",
                "Manpower Status": statusStr,
                "Instructor Name": nameStr
            };
        });
        onDrillDown(`ICT Manpower Required - ${selectedCC}`, drillData);
    };

    const handleManpowerWorkDrillDown = () => {
        if (!profile || !profile.assignedSchools || !onDrillDown) return;
        
        const workingSchools = [];
        profile.assignedSchools.forEach(s => {
            const ud = String(s.udise_code || s.udise || '').trim();
            const schoolManpower = manpower.filter(m => String(m.udise).trim() === ud);
            const workingStaff = schoolManpower.find(m => String(m.status).toUpperCase().trim() === 'WORKING');
            if (workingStaff) {
                workingSchools.push({ school: s, workingStaff });
            }
        });

        const drillData = workingSchools.map((item, idx) => {
            const s = item.school;
            const ud = String(s.udise_code || s.udise || '').trim();
            return {
                "Sl No": idx + 1,
                "School Name": s.school_name || "Unknown School",
                "UDISE": ud,
                "District": s.district_name || "N/A",
                "Project Name": s.project_name || "N/A",
                "Assigned CC/DEF": s.visitor_name || "N/A",
                "Manpower Status": "Working",
                "Instructor Name": item.workingStaff?.instructorName || item.workingStaff?.instructor_name || "—"
            };
        });
        onDrillDown(`ICT Manpower Working - ${selectedCC}`, drillData);
    };

    const handleManpowerVacDrillDown = () => {
        if (!profile || !profile.assignedSchools || !onDrillDown) return;
        
        const vacantSchools = [];
        profile.assignedSchools.forEach(s => {
            const ud = String(s.udise_code || s.udise || '').trim();
            const schoolManpower = manpower.filter(m => String(m.udise).trim() === ud);
            const workingStaff = schoolManpower.find(m => String(m.status).toUpperCase().trim() === 'WORKING');
            if (!workingStaff) {
                const sortedRecords = [...schoolManpower].sort((a, b) => {
                    const da = a.statusDate ? new Date(a.statusDate) : (a.joiningDate ? new Date(a.joiningDate) : null);
                    const db = b.statusDate ? new Date(b.statusDate) : (b.joiningDate ? new Date(b.joiningDate) : null);
                    return (db?.getTime() || 0) - (da?.getTime() || 0);
                });
                const prevRecord = sortedRecords.find(r => (r.instructorName || r.instructor_name) && String(r.instructorName || r.instructor_name).trim() !== '' && String(r.instructorName || r.instructor_name).trim() !== '—');
                
                vacantSchools.push({
                    school: s,
                    lastInstructor: prevRecord?.instructorName || prevRecord?.instructor_name || "—",
                    lastWorkingDate: prevRecord?.statusDate || prevRecord?.joiningDate || "—"
                });
            }
        });

        const drillData = vacantSchools.map((item, idx) => {
            const s = item.school;
            const ud = String(s.udise_code || s.udise || '').trim();
            const formattedDate = item.lastWorkingDate !== "—" ? formatDate(item.lastWorkingDate) : "—";
            return {
                "Sl No": idx + 1,
                "School Name": s.school_name || "Unknown School",
                "UDISE": ud,
                "District": s.district_name || "N/A",
                "Project Name": s.project_name || "N/A",
                "Assigned CC/DEF": s.visitor_name || "N/A",
                "Manpower Status": "Vacant",
                "Last Working Instructor": item.lastInstructor,
                "Last Working Date": formattedDate
            };
        });
        onDrillDown(`ICT Manpower Vacant - ${selectedCC}`, drillData);
    };

    const handleUnvisitedDrillDown = () => {
        if (!profile || !profile.unvisited || !onDrillDown) return;
        const drillData = profile.unvisited.map((s, idx) => {
            return {
                "Sl No": idx + 1,
                "School Name": s.school_name || "Unknown School",
                "UDISE": String(s.udise_code || s.udise || '').trim(),
                "District": s.district_name || "N/A",
                "Project Name": s.project_name || "N/A",
                "Assigned CC/DEF": s.visitor_name || "N/A",
                "Status": "Unvisited in this period"
            };
        });
        onDrillDown(`Unvisited Schools - ${selectedCC}`, drillData);
    };

    const handleRepeatVisitsDrillDown = () => {
        if (!profile || !profile.repeatVisits || !onDrillDown) return;
        const drillData = profile.repeatVisits.map((s, idx) => {
            const ud = String(s.udise_code || s.udise || '').trim();
            const visitCount = profile.visitsBySchool[ud]?.uniqueDates?.size || 0;
            return {
                "Sl No": idx + 1,
                "School Name": s.school_name || "Unknown School",
                "UDISE": ud,
                "District": s.district_name || "N/A",
                "Project Name": s.project_name || "N/A",
                "Assigned CC/DEF": s.visitor_name || "N/A",
                "Unique Visit Dates Count": visitCount
            };
        });
        onDrillDown(`Repeat Visits Alert - ${selectedCC}`, drillData);
    };

    const renderGrowthPill = (curr, prev, isPercentage = false) => {
        if (prev === undefined || prev === null) return null;
        
        let delta = curr - prev;
        if (delta === 0) {
            return (
                <span className="inline-flex items-center text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full ml-2 border border-slate-200 dark:border-slate-700">
                    0%
                </span>
            );
        }
        
        let pct = 0;
        if (prev > 0) {
            pct = Math.round((delta / prev) * 100);
        } else {
            pct = 100;
        }

        const isPositive = delta > 0;
        const colorClass = isPositive 
            ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30" 
            : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/30";
        
        return (
            <span className={`inline-flex items-center text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ml-2 border ${colorClass}`}>
                {isPositive ? '↑' : '↓'} {isPercentage ? `${delta > 0 ? '+' : ''}${delta.toFixed(0)}%` : `${isPositive ? '+' : ''}${pct}%`}
            </span>
        );
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

                    {/* ── Tab Toggle ───────────────────────────────── */}
                    <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/40 w-fit gap-1 mb-4 select-none">
                        <button
                            onClick={() => setSelectedAnalysisTab('performance')}
                            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                                selectedAnalysisTab === 'performance'
                                    ? 'bg-teal-600 text-white shadow-sm font-black'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-slate-200'
                            }`}
                        >
                            <TrophyIcon className="w-3.5 h-3.5" /> Performance Summary
                        </button>
                        <button
                            onClick={() => setSelectedAnalysisTab('visit360')}
                            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                                selectedAnalysisTab === 'visit360'
                                    ? 'bg-teal-600 text-white shadow-sm font-black'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-slate-200'
                            }`}
                        >
                            <ClockIcon className="w-3.5 h-3.5" /> Visit 360 & Timeline Audit
                        </button>
                    </div>

                    {selectedAnalysisTab === 'performance' && (
                        <>
                            {/* ── Visits & Coverage KPI Grid ─────────────────── */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        <KpiCard icon={CalendarIcon} iconColor="bg-teal-50 dark:bg-teal-900/20 text-teal-600"
                            value={<span className="flex items-center">{profile.totalVisits} {renderGrowthPill(profile.totalVisits, profile.prevTotalVisits)}</span>} label="Total Visits" 
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
                            value={<span className="flex items-center">{profile.visitedAssigned.length}/${profile.assignedSchools.length} {renderGrowthPill(profile.coveragePct, profile.prevCoveragePct, true)}</span>} label="Coverage" 
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
                                <div className="flex gap-1 flex-wrap text-[11px] font-extrabold mt-1">
                                    <span onClick={(e) => { e.stopPropagation(); handleManpowerReqDrillDown(); }} className="text-teal-600 dark:text-teal-400 hover:underline cursor-pointer bg-teal-50 dark:bg-teal-950/20 px-1 py-0.5 rounded flex items-center gap-0.5">Req: {profile.manpowerRequired} 🔍</span>
                                    <span className="text-slate-300 dark:text-slate-700 font-normal self-center">·</span>
                                    <span onClick={(e) => { e.stopPropagation(); handleManpowerWorkDrillDown(); }} className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer bg-emerald-50 dark:bg-emerald-950/20 px-1 py-0.5 rounded flex items-center gap-0.5">Work: {profile.manpowerWorking} 🔍</span>
                                    <span className="text-slate-300 dark:text-slate-700 font-normal self-center">·</span>
                                    <span onClick={(e) => { e.stopPropagation(); handleManpowerVacDrillDown(); }} className="text-rose-600 dark:text-rose-400 hover:underline cursor-pointer bg-rose-50 dark:bg-rose-950/20 px-1 py-0.5 rounded flex items-center gap-0.5">Vac: {profile.manpowerVacant} 🔍</span>
                                </div>
                            } 
                        />
                        <KpiCard icon={BarChartIcon} iconColor="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600"
                            value={<span className="flex items-center">{profile.totalJhpmsClasses} {renderGrowthPill(profile.totalJhpmsClasses, profile.prevTotalJhpmsClasses)}</span>} label="JHPMS Classes" 
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
                            value={<span className="flex items-center">{profile.totalEduHours > 0 ? profile.totalEduHours.toFixed(1) : '0'} {renderGrowthPill(profile.totalEduHours, profile.prevTotalEduHours)}</span>} label="EduStat Hours" 
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
                            {profile.currTrendSeries && profile.currTrendSeries.length > 0 ? (
                                <ReactApexChart
                                    options={trendChartOptions}
                                    series={[
                                        { name: 'Current Period', data: profile.currTrendSeries },
                                        { name: 'Previous Period', data: profile.prevTrendSeries }
                                    ]}
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
                                        const school = schoolsMap[String(v.udise_code || v.udise || '').trim()];
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

                    {/* Collapsible Matrix: School-Level Performance & Growth Audit */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-md overflow-hidden">
                        <button
                            onClick={() => setIsMatrixExpanded(!isMatrixExpanded)}
                            className="w-full flex items-center justify-between p-5 text-left focus:outline-none transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                            <div className="flex items-center gap-2">
                                <SchoolIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                                <div>
                                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                                        School-Level Performance & Growth Audit
                                    </h3>
                                    <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                                        Comparative matrix showing visits, class logs, and learning hours growth vs. previous period
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
                                    {profile.assignedSchools.length} Mapped Schools
                                </span>
                                <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isMatrixExpanded ? 'rotate-90' : ''}`} />
                            </div>
                        </button>

                        {isMatrixExpanded && (
                            <div className="border-t border-slate-100 dark:border-slate-800 p-5 overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700 text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                            <th className="py-2.5 px-3">School Name (UDISE)</th>
                                            <th className="py-2.5 px-3 text-center">Visits (Curr / Prev)</th>
                                            <th className="py-2.5 px-3 text-center">Visit Growth</th>
                                            <th className="py-2.5 px-3 text-center">JHPMS Classes (Curr / Prev)</th>
                                            <th className="py-2.5 px-3 text-center">JHPMS Growth</th>
                                            <th className="py-2.5 px-3 text-center">EduStat Hours (Curr / Prev)</th>
                                            <th className="py-2.5 px-3 text-center">EduStat Growth</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                        {profile.assignedSchools.map((s, idx) => {
                                            const udise = String(s.udise_code || s.udise || '').trim();
                                            
                                            // Visits
                                            const currVisits = profile.visitsBySchool[udise]?.uniqueDates?.size || 0;
                                            const prevVisits = profile.prevVisitsBySchool[udise]?.uniqueDates?.size || 0;
                                            const visitsDiff = currVisits - prevVisits;
                                            
                                            // JHPMS
                                            const currJhpms = profile.jhpmsBySchool[udise] || 0;
                                            const prevJhpms = profile.prevJhpmsBySchool[udise] || 0;
                                            const jhpmsDiff = currJhpms - prevJhpms;
                                            
                                            // EduStat
                                            const currEdu = parseFloat((profile.edustatBySchool[udise] || 0).toFixed(1));
                                            const prevEdu = parseFloat((profile.prevEdustatBySchool[udise] || 0).toFixed(1));
                                            const eduDiff = parseFloat((currEdu - prevEdu).toFixed(1));

                                            const renderGrowth = (diff) => {
                                                if (diff > 0) {
                                                    return <span className="text-[10px] font-extrabold text-green-600 dark:text-green-400 flex items-center justify-center gap-0.5">▲ +{diff}</span>;
                                                } else if (diff < 0) {
                                                    return <span className="text-[10px] font-extrabold text-red-500 dark:text-red-400 flex items-center justify-center gap-0.5">▼ {diff}</span>;
                                                }
                                                return <span className="text-[10px] font-bold text-gray-400">—</span>;
                                            };

                                            return (
                                                <tr 
                                                    key={idx}
                                                    onClick={() => onNavigateToSchool && onNavigateToSchool(udise)}
                                                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition cursor-pointer text-xs animate-fadeIn"
                                                >
                                                    <td className="py-3 px-3 min-w-[200px]">
                                                        <p className="font-extrabold text-gray-800 dark:text-gray-200">{s.school_name}</p>
                                                        <p className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">{udise}</p>
                                                    </td>
                                                    <td className="py-3 px-3 text-center font-bold text-gray-700 dark:text-slate-300">
                                                        {currVisits} <span className="text-gray-300 dark:text-slate-700 font-normal mx-1">/</span> {prevVisits}
                                                    </td>
                                                    <td className="py-3 px-3 text-center">
                                                        {renderGrowth(visitsDiff)}
                                                    </td>
                                                    <td className="py-3 px-3 text-center font-bold text-gray-700 dark:text-slate-300">
                                                        {currJhpms} <span className="text-gray-300 dark:text-slate-700 font-normal mx-1">/</span> {prevJhpms}
                                                    </td>
                                                    <td className="py-3 px-3 text-center">
                                                        {renderGrowth(jhpmsDiff)}
                                                    </td>
                                                    <td className="py-3 px-3 text-center font-bold text-gray-700 dark:text-slate-300">
                                                        {currEdu}h <span className="text-gray-300 dark:text-slate-700 font-normal mx-1">/</span> {prevEdu}h
                                                    </td>
                                                    <td className="py-3 px-3 text-center">
                                                        {renderGrowth(eduDiff)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
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
                                    <div 
                                        onClick={handleUnvisitedDrillDown}
                                        className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 cursor-pointer hover:border-red-300 dark:hover:border-red-800 transition active:scale-[0.99] select-none">
                                        <AlertIcon className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-[11px] font-bold text-red-700 dark:text-red-400">{profile.unvisited.length} schools not visited in this period. 🔍</p>
                                            <p className="text-[10px] text-red-500 dark:text-red-500 mt-0.5">{profile.unvisited.slice(0, 3).map(s => s.school_name).join(', ')}{profile.unvisited.length > 3 ? ` +${profile.unvisited.length - 3} more` : ''}</p>
                                        </div>
                                    </div>
                                )}

                                {profile.repeatVisits.length > 0 && (
                                    <div 
                                        onClick={handleRepeatVisitsDrillDown}
                                        className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 cursor-pointer hover:border-amber-300 dark:hover:border-amber-800 transition active:scale-[0.99] select-none">
                                        <AlertIcon className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">Repeat Visit Alert: {profile.repeatVisits.length} school(s) visited 3+ times 🔍</p>
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

                    {/* ── Row 6: 10 Dynamic AI Insights Engine ───────────── */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-md mt-6">
                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-slate-800 pb-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 flex items-center gap-1.5">
                                <SparklesIcon className="w-3.5 h-3.5" /> Automated AI Insights & Heuristics (10 Metrics)
                            </h3>
                            <span className="text-[10px] bg-teal-500/10 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 font-bold px-2 py-0.5 rounded-full">
                                Real-Time Audit
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {profile.aiInsights && profile.aiInsights.map((insight) => {
                                // determine color/styling classes based on type
                                let bgClass = "bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800";
                                let textClass = "text-slate-800 dark:text-slate-200";
                                let titleClass = "text-slate-900 dark:text-slate-100";
                                let iconColor = "text-slate-500";
                                let Icon = AlertIcon;
                                
                                if (insight.type === 'success') {
                                    bgClass = "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-100/60 dark:border-emerald-900/20";
                                    textClass = "text-emerald-800 dark:text-emerald-300";
                                    titleClass = "text-emerald-900 dark:text-emerald-200";
                                    iconColor = "text-emerald-600 dark:text-emerald-400";
                                    Icon = CheckIcon;
                                } else if (insight.type === 'error') {
                                    bgClass = "bg-rose-50/40 dark:bg-rose-950/10 border-rose-100/60 dark:border-rose-900/20";
                                    textClass = "text-rose-800 dark:text-rose-300";
                                    titleClass = "text-rose-900 dark:text-rose-200";
                                    iconColor = "text-rose-600 dark:text-rose-400";
                                    Icon = AlertIcon;
                                } else if (insight.type === 'warning') {
                                    bgClass = "bg-amber-50/40 dark:bg-amber-950/10 border-amber-100/60 dark:border-amber-900/20";
                                    textClass = "text-amber-800 dark:text-amber-300";
                                    titleClass = "text-amber-900 dark:text-amber-200";
                                    iconColor = "text-amber-600 dark:text-amber-400";
                                    Icon = AlertIcon;
                                } else if (insight.type === 'info') {
                                    bgClass = "bg-sky-50/40 dark:bg-sky-950/10 border-sky-100/60 dark:border-sky-900/20";
                                    textClass = "text-sky-800 dark:text-sky-300";
                                    titleClass = "text-sky-900 dark:text-sky-200";
                                    iconColor = "text-sky-600 dark:text-sky-400";
                                    Icon = AlertIcon;
                                }
                                return (
                                    <div key={insight.id} className={`flex items-start gap-3 p-3.5 rounded-xl border ${bgClass} transition hover:scale-[1.01] duration-150`}>
                                        <div className={`p-1.5 rounded-lg bg-white dark:bg-slate-900 shadow-sm ${iconColor} flex-shrink-0`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className={`text-xs font-black ${titleClass} flex items-center gap-1.5`}>
                                                {insight.title}
                                            </h4>
                                            <p className={`text-[11px] font-medium leading-relaxed mt-1 ${textClass}`}>
                                                {insight.text}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                        </>
                    )}

                    {selectedAnalysisTab === 'visit360' && (
                        <div className="space-y-4 animate-fade-in">
                            {/* Summary Card Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                                    <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider">Tracked Shift Days</div>
                                    <div className="text-2xl font-black text-teal-700 dark:text-teal-400 mt-1">{trackingStats.activeDaysCount} Days</div>
                                    <div className="text-[10px] text-gray-500 mt-0.5">With Day In/Out logged</div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                                    <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider">Total Shift Hours</div>
                                    <div className="text-2xl font-black text-cyan-700 dark:text-cyan-400 mt-1">{trackingStats.totalShiftHours} Hrs</div>
                                    <div className="text-[10px] text-gray-500 mt-0.5">Accumulated duty time</div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                                    <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider">Avg Shift Duration</div>
                                    <div className="text-2xl font-black text-indigo-700 dark:text-indigo-400 mt-1">{trackingStats.avgShift} Hrs/Day</div>
                                    <div className="text-[10px] text-gray-500 mt-0.5">Average time on field</div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                                    <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider">Sync Mismatches</div>
                                    <div className={`text-2xl font-black mt-1 ${trackingStats.discrepancyCount > 0 ? 'text-rose-600 dark:text-rose-450' : 'text-emerald-600'}`}>{trackingStats.discrepancyCount} Alerts</div>
                                    <div className="text-[10px] text-gray-500 mt-0.5">Log vs Portal discrepancies</div>
                                </div>
                            </div>

                            {/* Daily timeline list */}
                            <div className="space-y-4">
                                {sortedActivityDates.length === 0 ? (
                                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-10 text-center text-gray-400 dark:text-slate-500">
                                        <ClockIcon className="w-10 h-10 mx-auto mb-2 opacity-35" />
                                        <p className="text-sm font-bold">No Visit 360 Logs or Portal Visits found in this range.</p>
                                        <p className="text-xs mt-1">Please check range or upload logs in Setup.</p>
                                    </div>
                                ) : (
                                    sortedActivityDates.map(date => {
                                        const recs360 = cc360RecordsByDate[date] || [];
                                        const recsPortal = portalVisitsByDate[date] || [];
                                        
                                        const dayInOut = recs360.find(r => String(r.visit_type).toLowerCase().includes('day'));
                                        const schools360 = recs360.filter(r => String(r.visit_type).toLowerCase().includes('school'));
                                        
                                        // Match school visits by UDISE
                                        const matchedVisits = [];
                                        const portalOnlyVisits = [];
                                        const trackingOnlyVisits = [];
                                        
                                        const udisesIn360 = new Set();
                                        schools360.forEach(s360 => {
                                            const u360 = String(s360.udise_code || '').trim();
                                            udisesIn360.add(u360);
                                            
                                            // Find match in portal
                                            const matchPortal = recsPortal.find(vp => String(vp.udise_code || '').trim() === u360);
                                            if (matchPortal) {
                                                matchedVisits.push({ tracking: s360, portal: matchPortal });
                                            } else {
                                                trackingOnlyVisits.push(s360);
                                            }
                                        });
                                        
                                        recsPortal.forEach(vp => {
                                            const up = String(vp.udise_code || '').trim();
                                            if (!udisesIn360.has(up)) {
                                                portalOnlyVisits.push(vp);
                                            }
                                        });

                                        return (
                                            <div key={date} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
                                                {/* Day Header */}
                                                <div className="bg-slate-50 dark:bg-slate-800/40 px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap justify-between items-center gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"></div>
                                                        <span className="text-sm font-black text-gray-900 dark:text-white">{formatDate(date)}</span>
                                                        <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded font-bold">{new Date(date).toLocaleDateString('en-IN', { weekday: 'long' })}</span>
                                                    </div>
                                                    <div className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                                                        {dayInOut ? (
                                                            <span className="flex items-center gap-1.5">
                                                                <ClockIcon className="w-3.5 h-3.5 text-teal-600" />
                                                                Shift: <strong className="text-teal-700 dark:text-teal-400">{formatTimeAMPM(dayInOut.in_time)} - {formatTimeAMPM(dayInOut.out_time)}</strong> ({dayInOut.duration.toFixed(1)} Hrs)
                                                            </span>
                                                        ) : (
                                                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                                ⚠️ Shift Log Missing (No Day In/Out)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Day Timeline Details */}
                                                <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5 divide-y lg:divide-y-0 lg:divide-x divide-slate-150 dark:divide-slate-800">
                                                    {/* Left Side: 360 Tracking Logs */}
                                                    <div className="space-y-4 pr-0 lg:pr-5">
                                                        <h4 className="text-[11px] uppercase tracking-wider font-extrabold text-teal-800 dark:text-teal-400 flex items-center gap-1">
                                                            <ClockIcon className="w-3.5 h-3.5" /> Visit 360 App GPS Tracking Logs
                                                        </h4>

                                                        {schools360.length === 0 ? (
                                                            <div className="text-xs text-gray-400 dark:text-slate-500 italic py-2">No school visits logged in the tracking app on this day.</div>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                {schools360.map((s360, idx) => {
                                                                    const hasPortalReport = matchedVisits.some(mv => mv.tracking === s360);
                                                                    return (
                                                                        <div key={idx} className="bg-slate-50/50 dark:bg-slate-800/20 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/60 relative">
                                                                            <div className="flex justify-between items-start gap-2">
                                                                                <div>
                                                                                    <div className="text-xs font-black text-slate-800 dark:text-slate-200">{s360.place_name || 'Unknown School'}</div>
                                                                                    <div className="text-[10px] font-mono text-gray-400 mt-0.5">UDISE: {s360.udise_code || 'N/A'}</div>
                                                                                </div>
                                                                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                                                                    hasPortalReport 
                                                                                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-200/50' 
                                                                                        : 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 border border-yellow-250/30'
                                                                                }`}>
                                                                                    {hasPortalReport ? 'Verified ✅' : 'Report Pending ⚠️'}
                                                                                </span>
                                                                            </div>

                                                                            {/* Times */}
                                                                            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-2.5 flex items-center gap-2 flex-wrap">
                                                                                <span className="bg-teal-50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-400 px-2 py-0.5 rounded">In: {formatTimeAMPM(s360.in_time)}</span>
                                                                                <span className="bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded">Out: {formatTimeAMPM(s360.out_time)}</span>
                                                                                <span className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded">Duration: {s360.duration.toFixed(1)} Hrs</span>
                                                                            </div>

                                                                            {/* Addresses */}
                                                                            <div className="mt-3 text-[10px] text-gray-500 dark:text-slate-400 space-y-1 bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/40">
                                                                                <div className="flex items-start gap-1">
                                                                                    <strong className="text-slate-700 dark:text-slate-300 flex-shrink-0">GPS Entry:</strong>
                                                                                    <span className="line-clamp-2">{s360.in_address || 'Address not captured'}</span>
                                                                                </div>
                                                                                {s360.out_address && (
                                                                                    <div className="flex items-start gap-1">
                                                                                        <strong className="text-slate-700 dark:text-slate-300 flex-shrink-0">GPS Exit:</strong>
                                                                                        <span className="line-clamp-2">{s360.out_address}</span>
                                                                                    </div>
                                                                                )}
                                                                                {s360.remarks && (
                                                                                    <div className="text-slate-600 dark:text-slate-400 italic mt-1.5 border-t border-slate-50 dark:border-slate-800/50 pt-1.5">
                                                                                        <strong>Remarks:</strong> {s360.remarks}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Right Side: Visit Portal Verification Comparison */}
                                                    <div className="space-y-4 pt-4 lg:pt-0 pl-0 lg:pl-5">
                                                        <h4 className="text-[11px] uppercase tracking-wider font-extrabold text-indigo-800 dark:text-indigo-400 flex items-center gap-1">
                                                            <TrophyIcon className="w-3.5 h-3.5" /> Portal Visit Reports & Verification
                                                        </h4>

                                                        {recsPortal.length === 0 ? (
                                                            <div className="text-xs text-gray-400 dark:text-slate-500 italic py-2">No portal reports submitted for this day.</div>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                {recsPortal.map((vp, idx) => {
                                                                    const trackingRecord = schools360.find(s360 => String(s360.udise_code || '').trim() === String(vp.udise_code || '').trim());
                                                                    const matchStatus = trackingRecord ? 'Verified' : 'Unverified';
                                                                    
                                                                    return (
                                                                        <div key={idx} className={`p-3.5 rounded-xl border relative ${
                                                                            matchStatus === 'Verified'
                                                                                ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30'
                                                                                : 'bg-red-50/20 dark:bg-red-950/10 border-red-100 dark:border-red-900/30'
                                                                        }`}>
                                                                            <div className="flex justify-between items-start gap-2">
                                                                                <div>
                                                                                    <div className="text-xs font-black text-slate-800 dark:text-slate-200">{vp.school_name || vp.school || 'Unknown School'}</div>
                                                                                    <div className="text-[10px] font-mono text-gray-400 mt-0.5">UDISE: {vp.udise_code}</div>
                                                                                </div>
                                                                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                                                                    matchStatus === 'Verified'
                                                                                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-200/50'
                                                                                        : 'bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 border border-red-200/30 animate-pulse'
                                                                                }`}>
                                                                                    {matchStatus === 'Verified' ? 'GPS Verified ✅' : 'Tracking Missing ⚠️'}
                                                                                </span>
                                                                            </div>

                                                                            {/* Details from portal */}
                                                                            <div className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 flex-wrap font-bold">
                                                                                {vp.visit_type && (
                                                                                    <span className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded">Type: {vp.visit_type}</span>
                                                                                )}
                                                                                {vp.visit_time && (
                                                                                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">Logged Time: {vp.visit_time}</span>
                                                                                )}
                                                                            </div>

                                                                            {/* Comparative verification warning */}
                                                                            {matchStatus === 'Unverified' && (
                                                                                <div className="mt-3 text-[10px] text-red-650 dark:text-red-405 bg-red-50/40 dark:bg-red-950/20 p-2.5 rounded-lg border border-red-100/30 font-semibold leading-relaxed">
                                                                                    ⚠️ विसंगति: यह विजिट पोर्टल पर रिपोर्ट की गई है, लेकिन 'Visit 360 App' जीपीएस ट्रैकिंग लॉग में इस स्कूल का कोई रिकॉर्ड नहीं मिला।
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
