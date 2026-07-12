import React, { useState, useEffect, useMemo } from 'react';
import { Icons } from './Icons';
import { formatDate } from '../utils';
import ReactApexChart from 'react-apexcharts';

// Helper to extract cell value from a row regardless of exact key casing or spacing
const getVal = (row, keyMatch) => {
    if (!row) return null;
    const key = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(keyMatch.toLowerCase().replace(/[^a-z0-9]/g, '')));
    return key ? row[key] : null;
};

// Robust date parser
const parseDateRobust = (dateInput) => {
    if (!dateInput) return null;
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d;
};

// Dynamic Performance Color Indicator
const getBenchmarkColor = (val, avg) => {
    if (avg <= 0) return 'bg-green-600';
    const pct = (val / avg) * 100;
    if (pct >= 100) return 'bg-green-600';
    if (pct >= 50) return 'bg-orange-500';
    return 'bg-rose-600';
};

// Clean icons for breakdown cards
const MonitorIcon = ({ className }) => (
    <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
);

const BookIcon = ({ className }) => (
    <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
);

const ClipboardIcon = ({ className }) => (
    <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
);

const SmartBoardIcon = ({ className }) => (
    <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="3" width="20" height="13" rx="2" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 16v4" />
        <path d="M8 20h8" />
    </svg>
);

const DatabaseIcon = ({ className }) => (
    <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </svg>
);

const SchoolWiseSearch = ({
    schools = [],
    jhpmsLab = [],
    edustat = [],
    edustatMaster = [],
    manpower = [],
    visits = [],
    startDate,
    endDate,
    workingDays = 1,
    darkMode = false,
    onDrillDown
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [suggestions, setSuggestions] = useState([]);

    // Debounce search input
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 200);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Generate search suggestions
    useEffect(() => {
        if (debouncedSearchTerm && debouncedSearchTerm.length > 1 && !selectedSchool) {
            const lowerTerm = debouncedSearchTerm.toLowerCase();
            const matches = schools.filter(s =>
                (s.school_name && s.school_name.toLowerCase().includes(lowerTerm)) ||
                (s.udise_code && String(s.udise_code).includes(lowerTerm))
            ).slice(0, 10);
            setSuggestions(matches);
        } else {
            setSuggestions([]);
        }
    }, [debouncedSearchTerm, schools, selectedSchool]);

    const handleSelect = (school) => {
        setSelectedSchool(school);
        setSearchTerm(school.school_name || '');
        setSuggestions([]);
    };

    const handleClear = () => {
        setSearchTerm('');
        setSelectedSchool(null);
        setSuggestions([]);
    };

    // 1. Pre-filter JHPMS logs inside the selected date range once
    const filteredJhpmsRange = useMemo(() => {
        const list = [];
        (jhpmsLab || []).forEach(row => {
            const rawDate = row.date || getVal(row, 'date');
            const d = parseDateRobust(rawDate);
            if (d) {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const dateStr = `${yyyy}-${mm}-${dd}`;
                
                if (dateStr >= startDate && dateStr <= endDate) {
                    list.push(row);
                }
            }
        });
        return list;
    }, [jhpmsLab, startDate, endDate]);

    // 2. Pre-filter EduStat logs inside the selected date range once
    const filteredEdustatRange = useMemo(() => {
        const list = [];
        (edustat || []).forEach(row => {
            const rawDate = row.date || getVal(row, 'date');
            const d = parseDateRobust(rawDate);
            if (d) {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const dateStr = `${yyyy}-${mm}-${dd}`;
                
                if (dateStr >= startDate && dateStr <= endDate) {
                    list.push(row);
                }
            }
        });
        return list;
    }, [edustat, startDate, endDate]);

    // 3. Pre-calculate class count and edustat hour metrics for each UDISE in O(N) pass
    const schoolSummaryMap = useMemo(() => {
        const map = {};
        
        filteredJhpmsRange.forEach(l => {
            const udise = String(l.udise || getVal(l, 'udise') || '').trim();
            if (!udise) return;
            if (!map[udise]) {
                map[udise] = { classes: 0, hours: 0 };
            }
            
            const labType = String(l.labType || getVal(l, 'lab') || '').toUpperCase();
            const subject = String(l.subject || getVal(l, 'sub') || '').toUpperCase();
            if (!subject.split(/[^A-Z0-9]+/).includes('MIS')) {
                if ((labType.includes('ICT') && subject.includes('COMPUTER')) || labType.includes('SMART')) {
                    map[udise].classes++;
                }
            }
        });

        filteredEdustatRange.forEach(e => {
            const udise = String(e.udise || '').trim();
            if (!udise) return;
            if (!map[udise]) {
                map[udise] = { classes: 0, hours: 0 };
            }
            const hours = e.hours !== undefined ? Number(e.hours) : parseFloat(getVal(e, 'hours') || 0);
            map[udise].hours += hours;
        });

        return map;
    }, [filteredJhpmsRange, filteredEdustatRange]);

    // 4. Compute overall rank once
    const allSchoolsRanked = useMemo(() => {
        const validWdays = Number(workingDays) > 0 ? Number(workingDays) : 1;
        const list = schools.map(s => {
            const udise = String(s.udise_code || '').trim();
            const stats = schoolSummaryMap[udise] || { classes: 0, hours: 0 };
            const combinedScore = (stats.classes / validWdays) * 0.6 + (stats.hours / validWdays) * 0.4;
            return { udise, score: combinedScore };
        }).sort((a, b) => b.score - a.score);
        return list;
    }, [schools, schoolSummaryMap, workingDays]);

    // Calculate details for selected school
    const schoolProfile = useMemo(() => {
        if (!selectedSchool) return null;
        const school = selectedSchool;
        const udise = String(school.udise_code || '').trim();

        // Filter JHPMS logs for this school inside the date range
        const schoolJhpms = filteredJhpmsRange.filter(l => {
            const lUdise = String(l.udise || getVal(l, 'udise') || '').trim();
            return lUdise === udise;
        });

        // Compute unique logged days
        const uniqueLoggedDays = new Set(schoolJhpms.map(l => {
            const d = parseDateRobust(l.date || getVal(l, 'date'));
            return d ? d.toISOString().split('T')[0] : '';
        }).filter(Boolean));
        const jhpmsLoggedDays = uniqueLoggedDays.size;

        // Categorize JHPMS classes
        let theoryCount = 0;
        let practicalCount = 0;
        let smartCount = 0;
        let misCount = 0;

        schoolJhpms.forEach(l => {
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
                    // Fallback classification if theoryPractical is empty/missing
                    if (labType.includes('ICT') && subject.includes('COMPUTER')) {
                        theoryCount++;
                    } else if (labType.includes('SMART')) {
                        practicalCount++;
                    }
                }
            }
        });

        const totalJhpmsClasses = theoryCount + practicalCount;

        // Filter EduStat device hours
        const schoolEdustatLogs = filteredEdustatRange.filter(e => {
            const eUdise = String(e.udise || '').trim();
            return eUdise === udise;
        });

        let totalEduHours = 0;
        const deviceHoursMap = {}; // serial -> hours
        schoolEdustatLogs.forEach(e => {
            const hours = e.hours !== undefined ? Number(e.hours) : parseFloat(getVal(e, 'hours') || 0);
            totalEduHours += hours;
            const serial = String(e.serial || '').trim();
            if (serial) {
                deviceHoursMap[serial] = (deviceHoursMap[serial] || 0) + hours;
            }
        });

        // Device Sync Auditing (EduStat Master)
        const schoolDevices = edustatMaster.filter(d => String(d.udise).trim() === udise);
        const unsyncedDevices = schoolDevices.filter(d => {
            const serial = String(d.serial || '').trim();
            const hours = deviceHoursMap[serial] || 0;
            return hours === 0;
        });
        const unsyncedCount = unsyncedDevices.length;

        // Manpower & Instructor Details
        const instructor = manpower.find(m => String(m.udise).trim() === udise) || null;

        // Visits in this QPR
        const qprVisits = visits.filter(v => {
            const vUdise = String(v.udise_code || getVal(v, 'udise') || '').trim();
            if (vUdise !== udise) return false;
            const d = parseDateRobust(v.visit_date);
            if (!d) return false;
            const dateStr = d.toISOString().split('T')[0];
            return dateStr >= startDate && dateStr <= endDate;
        });

        // Absolute Visit History (Last Visit)
        const historyVisits = visits.filter(v => {
            const vUdise = String(v.udise_code || getVal(v, 'udise') || '').trim();
            return vUdise === udise;
        }).sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));

        const lastVisitObj = historyVisits.length > 0 ? historyVisits[0] : null;
        let lastVisitAge = 999;
        if (lastVisitObj) {
            const lDate = parseDateRobust(lastVisitObj.visit_date);
            if (lDate) {
                lastVisitAge = Math.floor((new Date() - lDate) / (1000 * 60 * 60 * 24));
            }
        }

        // Rank Lookup
        const rankIndex = allSchoolsRanked.findIndex(item => item.udise === udise);
        const schoolRank = rankIndex !== -1 ? rankIndex + 1 : 'N/A';

        // Regional Averages (District & Block Benchmarks)
        const districtSchools = schools.filter(s => s.district === school.district);
        const blockSchools = schools.filter(s => s.block === school.block);

        // 1. Calculate District Rank
        const districtSchoolsRanked = districtSchools.map(s => {
            const sUdise = String(s.udise_code || '').trim();
            const stats = schoolSummaryMap[sUdise] || { classes: 0, hours: 0 };
            const validWdays = Number(workingDays) > 0 ? Number(workingDays) : 1;
            const score = (stats.classes / validWdays) * 0.6 + (stats.hours / validWdays) * 0.4;
            return { udise: sUdise, score };
        }).sort((a, b) => b.score - a.score);
        
        const distRankIndex = districtSchoolsRanked.findIndex(item => item.udise === udise);
        const districtRank = distRankIndex !== -1 ? distRankIndex + 1 : 'N/A';

        // 2. Calculate Project Rank
        const projectSchools = schools.filter(s => s.project_name === school.project_name);
        const projectSchoolsRanked = projectSchools.map(s => {
            const sUdise = String(s.udise_code || '').trim();
            const stats = schoolSummaryMap[sUdise] || { classes: 0, hours: 0 };
            const validWdays = Number(workingDays) > 0 ? Number(workingDays) : 1;
            const score = (stats.classes / validWdays) * 0.6 + (stats.hours / validWdays) * 0.4;
            return { udise: sUdise, score };
        }).sort((a, b) => b.score - a.score);

        const projRankIndex = projectSchoolsRanked.findIndex(item => item.udise === udise);
        const projectRank = projRankIndex !== -1 ? projRankIndex + 1 : 'N/A';

        const getGroupAverages = (groupList) => {
            let totalCls = 0;
            let totalHrs = 0;
            groupList.forEach(s => {
                const sUdise = String(s.udise_code || '').trim();
                const stats = schoolSummaryMap[sUdise] || { classes: 0, hours: 0 };
                totalCls += stats.classes;
                totalHrs += stats.hours;
            });

            return {
                avgClasses: groupList.length > 0 ? (totalCls / groupList.length) : 0,
                avgHours: groupList.length > 0 ? (totalHrs / groupList.length) : 0
            };
        };

        const distAvgs = getGroupAverages(districtSchools);
        const blkAvgs = getGroupAverages(blockSchools);

        // Weekly logs trend (ApexCharts payload)
        const startD = new Date(startDate);
        const endD = new Date(endDate);
        const weeks = [];
        let curr = new Date(startD);
        
        while (curr <= endD) {
            const wStart = new Date(curr);
            const wEnd = new Date(curr);
            wEnd.setDate(wEnd.getDate() + 6);
            if (wEnd > endD) wEnd.setTime(endD.getTime());
            
            weeks.push({
                start: wStart,
                end: wEnd,
                label: `${wStart.getDate()} ${wStart.toLocaleString('en-US', { month: 'short' })}`
            });
            curr.setDate(curr.getDate() + 7);
        }

        const weeklyTrend = weeks.map(w => {
            let weeklyClasses = 0;
            let weeklyHours = 0;

            schoolJhpms.forEach(l => {
                const d = parseDateRobust(l.date || getVal(l, 'date'));
                if (d && d >= w.start && d <= w.end) {
                    const labType = String(l.labType || getVal(l, 'lab') || '').toUpperCase();
                    const subject = String(l.subject || getVal(l, 'sub') || '').toUpperCase();
                    if (!subject.split(/[^A-Z0-9]+/).includes('MIS')) {
                        if ((labType.includes('ICT') && subject.includes('COMPUTER')) || labType.includes('SMART')) {
                            weeklyClasses++;
                        }
                    }
                }
            });

            schoolEdustatLogs.forEach(e => {
                const d = parseDateRobust(e.date || getVal(e, 'date'));
                if (d && d >= w.start && d <= w.end) {
                    weeklyHours += e.hours !== undefined ? Number(e.hours) : parseFloat(getVal(e, 'hours') || 0);
                }
            });

            return {
                week: w.label,
                classes: weeklyClasses,
                hours: parseFloat(weeklyHours.toFixed(1))
            };
        });

        // Automated Insights
        const insightsList = [];
        const isVacant = instructor ? (String(instructor.status).toUpperCase().includes('RESIGN') || String(instructor.status).toUpperCase().includes('VACANT')) : true;

        if (isVacant) {
            insightsList.push({
                type: 'danger',
                text: "ICT Instructor post is vacant. Recruitment/Allotment should be prioritized."
            });
        }
        if (qprVisits.length === 0) {
            insightsList.push({
                type: 'warning',
                text: "Zero visits logged by CC in this QPR period. Schedule an audit visit immediately."
            });
        } else if (lastVisitAge > 60 && lastVisitAge !== 999) {
            insightsList.push({
                type: 'warning',
                text: `Dormant Audit Status: Last physical visit was ${lastVisitAge} days ago.`
            });
        }
        if (totalEduHours === 0 && totalJhpmsClasses > 0) {
            insightsList.push({
                type: 'danger',
                text: "Device Sync Issue suspected: JHPMS classes are logged, but EduStat reports 0 usage hours."
            });
        }
        if (unsyncedCount > 0) {
            insightsList.push({
                type: 'warning',
                text: `${unsyncedCount} device(s) did not sync any hours. Click the Unsynced card to review serial numbers.`
            });
        }
        if (totalJhpmsClasses > 0 && totalJhpmsClasses < blkAvgs.avgClasses) {
            insightsList.push({
                type: 'info',
                text: `Class usage is below block average (${totalJhpmsClasses} vs block avg: ${blkAvgs.avgClasses.toFixed(1)}).`
            });
        }

        return {
            jhpmsLoggedDays,
            theoryCount,
            practicalCount,
            smartCount,
            misCount,
            totalJhpmsClasses,
            totalEduHours,
            unsyncedCount,
            unsyncedDevices,
            instructor,
            qprVisits,
            lastVisitObj,
            lastVisitAge,
            schoolRank,
            totalRanked: allSchoolsRanked.length,
            districtRank,
            totalDistrictRanked: districtSchoolsRanked.length,
            projectRank,
            totalProjectRanked: projectSchoolsRanked.length,
            distAvgs,
            blkAvgs,
            weeklyTrend,
            insightsList,
            historyVisits
        };
    }, [selectedSchool, filteredJhpmsRange, filteredEdustatRange, edustatMaster, manpower, visits, startDate, endDate, allSchoolsRanked, schools, schoolSummaryMap]);

    // Chart Configuration
    const trendSeries = useMemo(() => {
        if (!schoolProfile || !schoolProfile.weeklyTrend) return [];
        return [
            { name: 'JHPMS Classes', type: 'column', data: schoolProfile.weeklyTrend.map(t => t.classes) },
            { name: 'EduStat Hours', type: 'line', data: schoolProfile.weeklyTrend.map(t => t.hours) }
        ];
    }, [schoolProfile]);

    const trendOptions = useMemo(() => {
        if (!schoolProfile || !schoolProfile.weeklyTrend) return {};
        return {
            chart: {
                height: 350,
                type: 'line',
                toolbar: { show: false },
                fontFamily: 'inherit',
                background: 'transparent'
            },
            stroke: {
                width: [0, 3],
                curve: 'smooth'
            },
            colors: ['#0d9488', '#3b82f6'],
            fill: {
                opacity: [0.85, 1]
            },
            labels: schoolProfile.weeklyTrend.map(t => t.week),
            xaxis: {
                type: 'category',
                labels: {
                    style: { colors: darkMode ? '#94a3b8' : '#6B7280' }
                }
            },
            yaxis: [
                {
                    title: { text: 'Classes Logged' },
                    labels: {
                        style: { colors: darkMode ? '#94a3b8' : '#6B7280' }
                    }
                },
                {
                    opposite: true,
                    title: { text: 'EduStat device hours' },
                    labels: {
                        style: { colors: darkMode ? '#94a3b8' : '#6B7280' }
                    }
                }
            ],
            grid: {
                borderColor: darkMode ? 'rgba(255,255,255,0.08)' : '#E5E7EB',
                strokeDashArray: 4
            },
            tooltip: {
                theme: darkMode ? 'dark' : 'light'
            }
        };
    }, [schoolProfile, darkMode]);

    const handleUnsyncedClick = () => {
        if (!schoolProfile || !schoolProfile.unsyncedDevices.length) return;
        const drillData = schoolProfile.unsyncedDevices.map((d, idx) => ({
            "Sl No": idx + 1,
            "udise": d.udise,
            "device": d.device || 'EduStat Device',
            "serial": d.serial || 'N/A',
            "installed": d.installed || 'N/A',
            "status": "Not Synced (0 Hours)"
        }));
        onDrillDown(`Unsynced Devices - ${selectedSchool.school_name}`, drillData);
    };

    return (
        <div className="p-4 h-full flex flex-col overflow-auto animate-fade-in no-print">
            
            {/* 1. Header Search Area */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 mb-4 shadow-sm">
                <div className="max-w-2xl mx-auto relative z-30">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 text-center md:text-left">
                        🔍 Search & Audit School Profile ({formatDate(startDate)} to {formatDate(endDate)})
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Icons.GlobalSearch className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-slate-700 rounded-xl leading-5 bg-white dark:bg-slate-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 sm:text-sm shadow-sm text-gray-900 dark:text-white"
                            placeholder="Enter UDISE code or School Name to search..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setSelectedSchool(null);
                            }}
                        />
                        {searchTerm && (
                            <button onClick={handleClear} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                                <Icons.Close className="h-5 w-5" />
                            </button>
                        )}
                    </div>

                    {suggestions.length > 0 && (
                        <ul className="absolute z-50 mt-1.5 w-full bg-white dark:bg-slate-800 shadow-xl max-h-60 rounded-xl py-1 text-sm border border-gray-100 dark:border-slate-700 overflow-auto">
                            {suggestions.map((s, i) => (
                                <li
                                    key={i}
                                    onClick={() => handleSelect(s)}
                                    className="cursor-pointer select-none relative py-2.5 pl-4 pr-9 hover:bg-teal-50 dark:hover:bg-slate-700 border-b border-gray-100 dark:border-slate-700/50 last:border-0 text-gray-900 dark:text-gray-200"
                                >
                                    <div className="font-semibold">{s.school_name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">UDISE: {s.udise_code} | {s.block}, {s.district}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {selectedSchool && schoolProfile ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    
                    {/* LEFT PANEL: Metadata and Roster (1 Column) */}
                    <div className="flex flex-col gap-4">
                        
                        {/* School Basic Card */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl p-5 shadow-md relative overflow-hidden border-l-4 border-l-teal-700">
                            <div>
                                <span className="px-2 py-0.5 bg-teal-750 text-white rounded-md text-[10px] uppercase font-bold tracking-wider mb-2 inline-block">School Profile Summary</span>
                                <h2 className="text-lg font-black leading-snug mb-1 text-teal-950 dark:text-white">{selectedSchool.school_name}</h2>
                                <p className="text-xs text-gray-550 dark:text-gray-400 font-bold mb-4">UDISE: {selectedSchool.udise_code}</p>

                                <div className="space-y-2.5 text-xs border-t border-gray-150 dark:border-slate-800 pt-4 text-gray-800 dark:text-gray-200">
                                    <div className="flex justify-between"><span className="text-gray-600 font-bold dark:text-gray-450">District:</span><span className="font-black text-gray-900 dark:text-white">{selectedSchool.district}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-600 font-bold dark:text-gray-450">Block:</span><span className="font-black text-gray-900 dark:text-white">{selectedSchool.block}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-600 font-bold dark:text-gray-450">Project:</span><span className="font-black text-gray-900 dark:text-white">{selectedSchool.project_name || 'N/A'}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-600 font-bold dark:text-gray-450">Visitor (CC):</span><span className="font-black text-teal-900 dark:text-teal-400">{selectedSchool.visitor_name || 'Unassigned'}</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Roster & Manpower Details */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 mb-3 flex items-center gap-1.5 border-b border-gray-100 dark:border-slate-800 pb-2">
                                👤 Instructor & Roster Status
                            </h3>
                            <div className="space-y-3 text-xs">
                                <div>
                                    <label className="text-[10px] text-gray-400 uppercase font-semibold">ICT Instructor Name</label>
                                    <div className="font-bold text-sm text-gray-800 dark:text-gray-150">
                                        {schoolProfile.instructor ? schoolProfile.instructor.instructorName : 'No instructor assigned'}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] text-gray-400 uppercase font-semibold">Roster Status</label>
                                        <div className="mt-1">
                                            {schoolProfile.instructor ? (
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    String(schoolProfile.instructor.status).toUpperCase().includes('ACTIVE') || String(schoolProfile.instructor.status).toUpperCase().includes('WORK')
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400'
                                                        : 'bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                                                }`}>
                                                    {schoolProfile.instructor.status}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400 rounded-full text-[10px] font-bold">Vacant</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-400 uppercase font-semibold">Date of Joining</label>
                                        <div className="font-bold text-gray-800 dark:text-gray-150 mt-0.5">
                                            {schoolProfile.instructor?.joiningDate ? formatDate(schoolProfile.instructor.joiningDate) : 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Visit Status Audit */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 mb-3 flex items-center gap-1.5 border-b border-gray-100 dark:border-slate-800 pb-2">
                                🚗 QPR CC Audit Status
                            </h3>
                            <div className="space-y-3.5 text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-gray-600 dark:text-gray-400">CC Visit in this QPR?</span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold shadow-sm ${
                                        schoolProfile.qprVisits.length > 0
                                            ? 'bg-green-150 text-green-800 border border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30'
                                            : 'bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30'
                                    }`}>
                                        {schoolProfile.qprVisits.length > 0 ? `Yes (${schoolProfile.qprVisits.length} visits)` : 'No'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-gray-600 dark:text-gray-400">Last CC Visit Date:</span>
                                    <span className="font-extrabold text-gray-850 dark:text-gray-150">
                                        {schoolProfile.lastVisitObj ? formatDate(schoolProfile.lastVisitObj.visit_date) : 'Never'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-gray-600 dark:text-gray-400">Last Visitor Name:</span>
                                    <span className="font-bold text-gray-800 dark:text-gray-200">
                                        {schoolProfile.lastVisitObj ? schoolProfile.lastVisitObj.visitor_name : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-gray-600 dark:text-gray-400">Last Visit Aging:</span>
                                    <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                        schoolProfile.lastVisitAge === 999
                                            ? 'bg-gray-100 text-gray-600 dark:bg-slate-800'
                                            : schoolProfile.lastVisitAge > 60
                                                ? 'bg-red-100 text-red-700 dark:bg-red-950/20'
                                                : 'bg-teal-50 text-teal-700 dark:bg-teal-950/20'
                                    }`}>
                                        {schoolProfile.lastVisitAge === 999 ? 'Never' : `${schoolProfile.lastVisitAge} days ago`}
                                    </span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT PANEL: KPIs & Charts (2 Columns) */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        
                        {/* KPI Cards Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            
                            {/* Card 1: School Ranks */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl p-3 shadow-md flex flex-col justify-center gap-2">
                                <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-1.5">
                                    <Icons.Trophy className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                                    <span className="text-[11px] text-gray-700 uppercase font-black tracking-wide dark:text-slate-400">School Ranks</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1 divide-x divide-gray-100 dark:divide-slate-800 text-center">
                                    <div>
                                        <div className="text-[9px] text-gray-500 uppercase font-extrabold tracking-wider">District</div>
                                        <div className="text-xs font-black text-gray-900 dark:text-white mt-0.5">
                                            #{schoolProfile.districtRank}
                                        </div>
                                        <div className="text-[8px] text-gray-400 font-medium">of {schoolProfile.totalDistrictRanked}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] text-gray-500 uppercase font-extrabold tracking-wider">Project</div>
                                        <div className="text-xs font-black text-gray-900 dark:text-white mt-0.5">
                                            #{schoolProfile.projectRank}
                                        </div>
                                        <div className="text-[8px] text-gray-400 font-medium">of {schoolProfile.totalProjectRanked}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] text-gray-500 uppercase font-extrabold tracking-wider">Overall</div>
                                        <div className="text-xs font-black text-teal-800 dark:text-teal-400 mt-0.5">
                                            #{schoolProfile.schoolRank}
                                        </div>
                                        <div className="text-[8px] text-teal-600 font-extrabold">of {schoolProfile.totalRanked}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Logged Days */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 shadow-md flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xl">
                                    <Icons.Plan className="w-5 h-5" />
                                </div>
                                <div>
                                    <label className="text-[11px] text-gray-650 uppercase font-extrabold tracking-wide dark:text-slate-400">JHPMS Logged Days</label>
                                    <div className="text-xl font-extrabold text-gray-900 dark:text-white mt-0.5">
                                        {schoolProfile.jhpmsLoggedDays} <span className="text-xs text-gray-500 font-bold dark:text-slate-400">days</span>
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: EduStat Hours */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 shadow-md flex items-center gap-3">
                                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 rounded-xl">
                                    <Icons.Analytics className="w-5 h-5" />
                                </div>
                                <div>
                                    <label className="text-[11px] text-gray-650 uppercase font-extrabold tracking-wide dark:text-slate-400">EduStat Device Hours</label>
                                    <div className="text-xl font-extrabold text-gray-900 dark:text-white mt-0.5">
                                        {schoolProfile.totalEduHours.toFixed(1)} <span className="text-xs text-gray-500 font-bold dark:text-slate-400">hrs</span>
                                    </div>
                                </div>
                            </div>

                            {/* Card 4: Unsynced devices (Clickable Drill Down) */}
                            <div 
                                onClick={handleUnsyncedClick}
                                className={`border rounded-2xl p-4 shadow-md flex items-center gap-3 transition-all ${
                                    schoolProfile.unsyncedCount > 0 
                                        ? 'bg-rose-50/70 hover:bg-rose-100/70 border-rose-300 cursor-pointer dark:bg-rose-950/20 dark:border-rose-900/40' 
                                        : 'bg-white border-slate-150 dark:bg-slate-900 dark:border-slate-800'
                                }`}
                            >
                                <div className={`p-2.5 rounded-xl ${
                                    schoolProfile.unsyncedCount > 0 
                                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-450' 
                                        : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-405'
                                }`}>
                                    <Icons.Alert className="w-5 h-5" />
                                </div>
                                <div>
                                    <label className="text-[11px] text-gray-650 uppercase font-extrabold tracking-wide dark:text-slate-400">Unsynced Devices</label>
                                    <div className={`text-xl font-extrabold mt-0.5 flex items-center gap-1 ${
                                        schoolProfile.unsyncedCount > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-gray-900 dark:text-white'
                                    }`}>
                                        {schoolProfile.unsyncedCount}
                                        {schoolProfile.unsyncedCount > 0 && <span className="text-[10px] font-bold text-rose-600 underline uppercase ml-1 animate-pulse">View</span>}
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Usage & Class Performance breakdown Grid (5 Cards) */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-3 shadow-md text-center flex flex-col justify-between min-h-[100px]">
                                <div className="flex items-center justify-center gap-1.5 text-gray-700 dark:text-slate-350 border-b border-gray-150 dark:border-slate-850 pb-1">
                                    <ClipboardIcon className="w-3.5 h-3.5 text-teal-600" />
                                    <span className="text-[11px] uppercase font-extrabold">Total</span>
                                </div>
                                <div className="text-2xl font-black text-teal-850 dark:text-teal-400 my-1">{schoolProfile.totalJhpmsClasses}</div>
                                <span className="text-[9px] text-gray-500 font-semibold block">Classes Logged</span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-3 shadow-md text-center flex flex-col justify-between min-h-[100px]">
                                <div className="flex items-center justify-center gap-1.5 text-gray-700 dark:text-slate-350 border-b border-gray-150 dark:border-slate-850 pb-1">
                                    <BookIcon className="w-3.5 h-3.5 text-indigo-600" />
                                    <span className="text-[11px] uppercase font-extrabold">Theory</span>
                                </div>
                                <div className="text-2xl font-black text-indigo-800 dark:text-indigo-400 my-1">{schoolProfile.theoryCount}</div>
                                <span className="text-[9px] text-indigo-750 font-bold bg-indigo-50 dark:bg-indigo-950/20 px-1.5 py-0.5 rounded-full inline-block">
                                    {schoolProfile.totalJhpmsClasses > 0 ? Math.round((schoolProfile.theoryCount / schoolProfile.totalJhpmsClasses) * 100) : 0}%
                                </span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-3 shadow-md text-center flex flex-col justify-between min-h-[100px]">
                                <div className="flex items-center justify-center gap-1.5 text-gray-700 dark:text-slate-350 border-b border-gray-150 dark:border-slate-850 pb-1">
                                    <MonitorIcon className="w-3.5 h-3.5 text-amber-600" />
                                    <span className="text-[11px] uppercase font-extrabold">Practical</span>
                                </div>
                                <div className="text-2xl font-black text-amber-800 dark:text-amber-400 my-1">{schoolProfile.practicalCount}</div>
                                <span className="text-[9px] text-amber-750 font-bold bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded-full inline-block">
                                    {schoolProfile.totalJhpmsClasses > 0 ? Math.round((schoolProfile.practicalCount / schoolProfile.totalJhpmsClasses) * 100) : 0}%
                                </span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-3 shadow-md text-center flex flex-col justify-between min-h-[100px]">
                                <div className="flex items-center justify-center gap-1.5 text-gray-700 dark:text-slate-350 border-b border-gray-150 dark:border-slate-850 pb-1">
                                    <SmartBoardIcon className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-[11px] uppercase font-extrabold">Smart</span>
                                </div>
                                <div className="text-2xl font-black text-emerald-850 dark:text-emerald-400 my-1">{schoolProfile.smartCount}</div>
                                <span className="text-[9px] text-gray-500 font-semibold block">Interactive Board</span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-3 shadow-md text-center col-span-2 md:col-span-1 flex flex-col justify-between min-h-[100px]">
                                <div className="flex items-center justify-center gap-1.5 text-gray-700 dark:text-slate-350 border-b border-gray-150 dark:border-slate-850 pb-1">
                                    <DatabaseIcon className="w-3.5 h-3.5 text-rose-600" />
                                    <span className="text-[11px] uppercase font-extrabold">MIS</span>
                                </div>
                                <div className="text-2xl font-black text-rose-800 dark:text-rose-450 my-1">{schoolProfile.misCount}</div>
                                <span className="text-[9px] text-gray-500 font-semibold block">Data Entry / Other</span>
                            </div>
                        </div>

                        {/* Benchmark Comparisons Panel */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-md">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-855 dark:text-teal-400 mb-4 flex items-center gap-1.5 border-b border-gray-150 dark:border-slate-800 pb-2">
                                📊 Comparison with Regional Performance (Benchmark)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                
                                {/* JHPMS Benchmarks */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-gray-800 dark:text-gray-200">Average Classes vs Regional Averages</h4>
                                    
                                    {/* District JHPMS */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-extrabold text-gray-700 dark:text-gray-300">
                                            <span>District Average ({selectedSchool.district})</span>
                                            <span>{schoolProfile.distAvgs.avgClasses.toFixed(1)} classes</span>
                                        </div>
                                        <div className="relative h-2.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className={`absolute top-0 left-0 h-full rounded-full ${getBenchmarkColor(schoolProfile.totalJhpmsClasses, schoolProfile.distAvgs.avgClasses)}`} style={{ width: `${Math.min(100, (schoolProfile.totalJhpmsClasses / Math.max(1, schoolProfile.distAvgs.avgClasses)) * 50)}%` }} />
                                            <div className="absolute top-0 h-full bg-gray-450 w-0.5" style={{ left: '50%' }} title="District Average Marker" />
                                        </div>
                                        <span className="text-[11px] text-gray-700 dark:text-gray-400 font-extrabold">School Total Classes: {schoolProfile.totalJhpmsClasses}</span>
                                    </div>

                                    {/* Block JHPMS */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-extrabold text-gray-700 dark:text-gray-300">
                                            <span>Block Average ({selectedSchool.block})</span>
                                            <span>{schoolProfile.blkAvgs.avgClasses.toFixed(1)} classes</span>
                                        </div>
                                        <div className="relative h-2.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className={`absolute top-0 left-0 h-full rounded-full ${getBenchmarkColor(schoolProfile.totalJhpmsClasses, schoolProfile.blkAvgs.avgClasses)}`} style={{ width: `${Math.min(100, (schoolProfile.totalJhpmsClasses / Math.max(1, schoolProfile.blkAvgs.avgClasses)) * 50)}%` }} />
                                            <div className="absolute top-0 h-full bg-gray-450 w-0.5" style={{ left: '50%' }} title="Block Average Marker" />
                                        </div>
                                    </div>
                                </div>

                                {/* EduStat Benchmarks */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-gray-800 dark:text-gray-200">Average Device Hours vs Regional Averages</h4>
                                    
                                    {/* District EduStat */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-extrabold text-gray-700 dark:text-gray-300">
                                            <span>District Average ({selectedSchool.district})</span>
                                            <span>{schoolProfile.distAvgs.avgHours.toFixed(1)} hrs</span>
                                        </div>
                                        <div className="relative h-2.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className={`absolute top-0 left-0 h-full rounded-full ${getBenchmarkColor(schoolProfile.totalEduHours, schoolProfile.distAvgs.avgHours)}`} style={{ width: `${Math.min(100, (schoolProfile.totalEduHours / Math.max(1, schoolProfile.distAvgs.avgHours)) * 50)}%` }} />
                                            <div className="absolute top-0 h-full bg-gray-450 w-0.5" style={{ left: '50%' }} title="District Average Marker" />
                                        </div>
                                        <span className="text-[11px] text-gray-700 dark:text-gray-400 font-extrabold">School Total Hours: {schoolProfile.totalEduHours.toFixed(1)}</span>
                                    </div>

                                    {/* Block EduStat */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-extrabold text-gray-700 dark:text-gray-300">
                                            <span>Block Average ({selectedSchool.block})</span>
                                            <span>{schoolProfile.blkAvgs.avgHours.toFixed(1)} hrs</span>
                                        </div>
                                        <div className="relative h-2.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className={`absolute top-0 left-0 h-full rounded-full ${getBenchmarkColor(schoolProfile.totalEduHours, schoolProfile.blkAvgs.avgHours)}`} style={{ width: `${Math.min(100, (schoolProfile.totalEduHours / Math.max(1, schoolProfile.blkAvgs.avgHours)) * 50)}%` }} />
                                            <div className="absolute top-0 h-full bg-gray-450 w-0.5" style={{ left: '50%' }} title="Block Average Marker" />
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Interactive Weekly Trend Chart */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 mb-4 flex items-center gap-1.5 border-b border-gray-100 dark:border-slate-800 pb-2">
                                📈 Weekly Log trends
                            </h3>
                            <ReactApexChart 
                                options={trendOptions}
                                series={trendSeries}
                                height={280}
                            />
                        </div>

                        {/* Automated Actionable Recommendations Engine */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 mb-4 flex items-center gap-1.5 border-b border-gray-100 dark:border-slate-800 pb-2">
                                💡 Profile Insights & Action Plans
                            </h3>
                            {schoolProfile.insightsList.length === 0 ? (
                                <div className="text-xs text-green-700 bg-green-50 dark:bg-green-950/20 dark:text-green-400 p-3.5 rounded-xl border border-green-100 dark:border-green-900/30 flex items-center gap-2">
                                    <Icons.Reports className="w-5 h-5 shrink-0" />
                                    <span>Everything looks aligned! All systems, sync devices, and audits are running within standard ranges.</span>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {schoolProfile.insightsList.map((ins, idx) => (
                                        <div 
                                            key={idx}
                                            className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                                                ins.type === 'danger'
                                                    ? 'bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-950/10 dark:border-rose-900/30 dark:text-rose-400'
                                                    : ins.type === 'warning'
                                                        ? 'bg-amber-50 border-amber-100 text-amber-800 dark:bg-amber-950/10 dark:border-amber-900/30 dark:text-amber-400'
                                                        : 'bg-blue-50 border-blue-100 text-blue-800 dark:bg-blue-950/10 dark:border-blue-900/30 dark:text-blue-450'
                                            }`}
                                        >
                                            <div className="mt-0.5 shrink-0">
                                                {ins.type === 'danger' ? <Icons.Alert className="w-4 h-4" /> : <Icons.Setup className="w-4 h-4" />}
                                            </div>
                                            <span>{ins.text}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recent Coordinator Audit History Timeline */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 mb-4 flex items-center gap-1.5 border-b border-gray-100 dark:border-slate-800 pb-2">
                                ⏱ Recent Audit Visits History
                            </h3>
                            {schoolProfile.historyVisits.length === 0 ? (
                                <div className="text-xs text-gray-400 italic text-center py-8">
                                    No historical audit visits logged for this school.
                                </div>
                            ) : (
                                <div className="space-y-4 relative before:absolute before:top-1.5 before:bottom-1.5 before:left-3 before:w-0.5 before:bg-gray-100 dark:before:bg-slate-800 pl-8">
                                    {schoolProfile.historyVisits.slice(0, 5).map((v, idx) => (
                                        <div key={idx} className="relative text-xs">
                                            <div className="absolute -left-8 w-2 h-2 rounded-full bg-teal-600 mt-1.5 outline outline-4 outline-white dark:outline-slate-900" />
                                            <div className="flex flex-col md:flex-row justify-between gap-1.5">
                                                <div>
                                                    <span className="font-extrabold text-gray-850 dark:text-gray-200">
                                                        {v.visitor_name}
                                                    </span>{' '}
                                                    <span className="text-[10px] text-gray-400">
                                                        ({v.visit_type})
                                                    </span>
                                                </div>
                                                <span className="text-gray-500 font-bold shrink-0">
                                                    {formatDate(v.visit_date)}
                                                </span>
                                            </div>
                                            {v.purpose && (
                                                <p className="text-gray-550 mt-1 leading-relaxed">{v.purpose}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>

                </div>
            ) : (
                <div className="flex-1 flex flex-col justify-center items-center py-20 text-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
                    <div className="p-4 bg-teal-50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-400 rounded-full mb-4">
                        <Icons.GlobalSearch className="w-8 h-8" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider mb-1">
                        Select a School to view profile
                    </h3>
                    <p className="text-xs text-gray-400 max-w-sm">
                        Use the search input above to search by school name or UDISE code.
                    </p>
                </div>
            )}

        </div>
    );
};

export default SchoolWiseSearch;
