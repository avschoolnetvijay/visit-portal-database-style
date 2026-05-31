import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell, PieChart, Pie, Legend } from 'recharts';
import { exportToExcel, parseDateRobust, downloadSVG, downloadPNG, downloadCSV } from '../utils';
import { Icons } from './Icons';

/* ───── Standard Chart Download Toolbar Dropdown ───── */
const ChartToolbar = ({ chartId, csvData, filename }) => {
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!showMenu) return;
    const handleOutsideClick = () => setShowMenu(false);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [showMenu]);

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  return (
    <div className="absolute top-3 right-3 z-30 no-print" style={{ pointerEvents: 'auto' }}>
      <div className="relative inline-block text-left">
        <button
          onClick={handleMenuClick}
          type="button"
          className="p-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-md shadow-sm border border-slate-200 dark:border-slate-700 transition-colors focus:outline-none"
          title="Download Options"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
        </button>
        {showMenu && (
          <div className="origin-top-right absolute right-0 mt-1.5 w-36 rounded-lg shadow-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 ring-1 ring-black ring-opacity-5 focus:outline-none py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 font-sans">
            <button
              onClick={() => {
                const el = document.getElementById(chartId);
                const svgEl = el?.tagName?.toLowerCase() === 'svg' ? el : el?.querySelector('svg');
                if (svgEl) downloadSVG(svgEl, `${filename}.svg`);
              }}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Download SVG
            </button>
            <button
              onClick={() => {
                const el = document.getElementById(chartId);
                const svgEl = el?.tagName?.toLowerCase() === 'svg' ? el : el?.querySelector('svg');
                if (svgEl) downloadPNG(svgEl, `${filename}.png`);
              }}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Download PNG
            </button>
            {csvData && (
              <button
                onClick={() => {
                  downloadCSV(csvData, `${filename}.csv`);
                }}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Download CSV
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


// Robust helper to extract cell value from a row regardless of exact key casing or spacing
const getVal = (row, keyMatch) => {
    if (!row) return null;
    const key = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(keyMatch.toLowerCase().replace(/[^a-z0-9]/g, '')));
    return key ? row[key] : null;
};

const PremiumChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const title = label || payload[0]?.payload?.name || payload[0]?.payload?.fullName || "";
  return (
    <div className="bg-[#111827] text-white p-3 rounded-xl shadow-2xl border border-[#374151] text-xs font-sans min-w-[180px] pointer-events-none select-none z-50">
      {title && (
        <p className="font-extrabold text-[#f3f4f6] text-sm mb-2 border-b border-[#374151] pb-1.5">
          {title}
        </p>
      )}
      <div className="space-y-1.5">
        {payload.map((p, idx) => {
          const bulletColor = p.color || '#0d9488';
          const isScore = p.name.toLowerCase().includes('score') || p.name.includes('%');
          return (
            <div key={idx} className="flex items-center justify-between gap-4 font-bold py-0.5">
              <div className="flex items-center gap-1.5 text-[#d1d5db]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: bulletColor }} />
                <span>{p.name}:</span>
              </div>
              <span className="font-black text-white">
                {typeof p.value === 'number' ? (Number.isInteger(p.value) ? p.value : p.value.toFixed(1)) : p.value}
                {isScore ? '%' : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SchoolPerformance = ({
    schools = [],
    jhpmsLab = [],
    edustat = [],
    edustatMaster = [],
    manpower = [],
    startDate,
    endDate,
    selProjects = [],
    selDistricts = [],
    selBlocks = [],
    selCCs = [],
    ccNameMapping = {},
    workingDays = 1,
    onRegisterExport
}) => {
    // 1. Internal State
    const [performanceType, setPerformanceType] = useState('school'); // 'school' | 'ict_instructor' | 'subject_teacher'
    const [dataSource, setDataSource] = useState('jhpms'); // 'jhpms' | 'edustat' | 'both'
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(20);


    // 2. Auto-switch effect: Edustat has no teacher names, so auto-switch to JHPMS if teacher selected
    useEffect(() => {
        if ((performanceType === 'ict_instructor' || performanceType === 'subject_teacher') && dataSource === 'edustat') {
            setDataSource('jhpms');
        }
    }, [performanceType, dataSource]);

    // Reset current page when filters or tabs change
    useEffect(() => {
        setCurrentPage(1);
    }, [performanceType, dataSource]);

    // 3. Performance Calculation Logic
    const fSchools = useMemo(() => {
        let list = schools || [];
        if (selProjects?.length) list = list.filter(s => selProjects.includes(s.project_name));
        if (selDistricts?.length) list = list.filter(s => selDistricts.includes(s.district));
        if (selBlocks?.length) list = list.filter(s => selBlocks.includes(s.block));
        if (selCCs?.length) {
            list = list.filter(s => {
                const name = s.visitor_name || '';
                const resolved = ccNameMapping[name] || name;
                return selCCs.includes(resolved) || selCCs.includes(name);
            });
        }
        return list;
    }, [schools, selProjects, selDistricts, selBlocks, selCCs, ccNameMapping]);

    const schoolLookup = useMemo(() => {
        const map = {};
        fSchools.forEach(s => {
            const udise = String(s.udise_code || '').trim();
            if (udise) {
                map[udise] = {
                    schoolName: s.school_name || '-',
                    district: s.district || '-',
                    block: s.block || '-',
                    ccDef: s.visitor_name || '-',
                    projectName: s.project_name || '-'
                };
            }
        });
        return map;
    }, [fSchools]);

    const manpowerLookup = useMemo(() => {
        const map = {};
        (manpower || []).forEach(m => {
            const udise = String(m.udise || getVal(m, 'udise') || '').trim();
            const name = String(m.instructorName || getVal(m, 'instructor') || getVal(m, 'name') || '').trim().toUpperCase();
            const status = String(m.status || getVal(m, 'status') || 'Active').trim();
            if (name && udise) {
                map[`${name}_${udise}`] = status;
            }
        });
        return map;
    }, [manpower]);

    const validUdises = useMemo(() => {
        return new Set(fSchools.map(s => String(s.udise_code || '').trim()).filter(Boolean));
    }, [fSchools]);

    const filteredJhpms = useMemo(() => {
        const list = [];
        (jhpmsLab || []).forEach(row => {
            const udise = String(row.udise || getVal(row, 'udise') || getVal(row, 'udisecode') || '').trim();
            if (!validUdises.has(udise)) return;

            const rawDate = row.date || getVal(row, 'date');
            const d = parseDateRobust(rawDate);
            if (d && !isNaN(d.getTime())) {
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
    }, [jhpmsLab, startDate, endDate, validUdises]);

    const parseHours = (timeStr) => {
        if (!timeStr) return 0;
        const parts = String(timeStr).split(':');
        if (parts.length >= 2) {
            return parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
        }
        return parseFloat(timeStr) || 0;
    };

    // Helper to extract fields from JHPMS row regardless of raw or mapped format
    const extractJhpmsRow = (row) => {
        const udise = String(row.udise || getVal(row, 'udise') || getVal(row, 'udisecode') || '').trim();
        const labType = String(row.labType || getVal(row, 'lab') || '').toUpperCase();
        
        // Find "Subject Teacher" first
        const teacherKey = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes('subjectteacher'));
        const teacher = teacherKey ? String(row[teacherKey] || '').trim() : (getVal(row, 'teacher') || '');
        
        // Find "Subject" excluding "Subject Teacher"
        const subjectKey = Object.keys(row).find(k => k !== teacherKey && k.toLowerCase().replace(/[^a-z0-9]/g, '').includes('sub'));
        const subject = subjectKey ? String(row[subjectKey] || '').trim().toUpperCase() : '';

        return {
            udise,
            labType,
            teacher: String(teacher).trim(),
            subject
        };
    };

    const performanceData = useMemo(() => {
        const validWdays = Number(workingDays) > 0 ? Number(workingDays) : 1;

        // ICT Instructor mode
        if (performanceType === 'ict_instructor') {
            const groups = {};
            let totalIct = 0;

            filteredJhpms.forEach(l => {
                const { udise, labType, teacher, subject } = extractJhpmsRow(l);

                if (labType.includes('ICT') && subject.includes('COMPUTER')) {
                    if (!teacher) return;
                    const key = `${teacher.toUpperCase()}_${udise}`;

                    totalIct++;

                    if (!groups[key]) {
                        groups[key] = {
                            name: teacher,
                            udise: udise,
                            totalClasses: 0
                        };
                    }
                    groups[key].totalClasses++;
                }
            });

            const list = Object.values(groups);
            const maxClasses = list.length > 0 ? Math.max(...list.map(x => x.totalClasses)) : 1;

            const results = list.map(item => {
                const sch = schoolLookup[item.udise] || {};
                const score = (item.totalClasses / maxClasses) * 100;
                const statusKey = `${item.name.toUpperCase()}_${item.udise}`;
                const status = manpowerLookup[statusKey] || 'N/A';

                return {
                    name: item.name,
                    udise: item.udise,
                    district: sch.district || '-',
                    block: sch.block || '-',
                    schoolName: sch.schoolName || '-',
                    ccDef: sch.ccDef || '-',
                    projectName: sch.projectName || '-',
                    totalClasses: item.totalClasses,
                    avgPerDay: (item.totalClasses / validWdays).toFixed(2),
                    score: score,
                    status: status
                };
            }).sort((a, b) => b.score - a.score || b.totalClasses - a.totalClasses);

            results.forEach((r, idx) => {
                r.rank = idx + 1;
            });

            return {
                results,
                type: 'ict_instructor',
                totalIct,
                totalSmart: 0
            };
        }

        // Subject Teacher mode
        if (performanceType === 'subject_teacher') {
            const groups = {};
            let totalSmart = 0;

            filteredJhpms.forEach(l => {
                const { udise, labType, teacher, subject } = extractJhpmsRow(l);

                if (labType.includes('SMART') && !subject.includes('COMPUTER')) {
                    if (!teacher) return;
                    const key = `${teacher.toUpperCase()}_${udise}`;

                    totalSmart++;

                    if (!groups[key]) {
                        groups[key] = {
                            name: teacher,
                            udise: udise,
                            totalClasses: 0,
                            subjects: new Set()
                        };
                    }
                    groups[key].totalClasses++;
                    if (subject) {
                        const origSubject = l.subject || getVal(l, 'subject') || getVal(l, 'sub') || subject;
                        groups[key].subjects.add(String(origSubject).trim());
                    }
                }
            });

            const list = Object.values(groups);
            const maxClasses = list.length > 0 ? Math.max(...list.map(x => x.totalClasses)) : 1;

            const results = list.map(item => {
                const sch = schoolLookup[item.udise] || {};
                const score = (item.totalClasses / maxClasses) * 100;
                const statusKey = `${item.name.toUpperCase()}_${item.udise}`;
                const status = manpowerLookup[statusKey] || 'N/A';
                const subjectStr = Array.from(item.subjects).join(', ') || '-';

                return {
                    name: item.name,
                    udise: item.udise,
                    district: sch.district || '-',
                    block: sch.block || '-',
                    schoolName: sch.schoolName || '-',
                    ccDef: sch.ccDef || '-',
                    projectName: sch.projectName || '-',
                    totalClasses: item.totalClasses,
                    avgPerDay: (item.totalClasses / validWdays).toFixed(2),
                    score: score,
                    status: status,
                    subjects: subjectStr
                };
            }).sort((a, b) => b.score - a.score || b.totalClasses - a.totalClasses);

            results.forEach((r, idx) => {
                r.rank = idx + 1;
            });

            return {
                results,
                type: 'subject_teacher',
                totalIct: 0,
                totalSmart
            };
        }

        // School mode
        if (performanceType === 'school') {
            // Group JHPMS data
            const jhpmsGroups = {};
            let totalIct = 0;
            let totalSmart = 0;

            filteredJhpms.forEach(l => {
                const { udise, labType, subject } = extractJhpmsRow(l);

                if (!jhpmsGroups[udise]) {
                    jhpmsGroups[udise] = {
                        ictClasses: 0,
                        smartClasses: 0,
                        totalClasses: 0
                    };
                }

                const g = jhpmsGroups[udise];
                if (labType.includes('ICT') && subject.includes('COMPUTER')) {
                    g.ictClasses++;
                    g.totalClasses++;
                    totalIct++;
                } else if (labType.includes('SMART') && !subject.includes('COMPUTER')) {
                    g.smartClasses++;
                    g.totalClasses++;
                    totalSmart++;
                }
            });


            // Group Edustat data
            const formatDateStr = (dateInput) => {
                if (!dateInput) return null;
                const d = parseDateRobust(dateInput);
                if (!d || isNaN(d.getTime())) return null;
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            };

            const filteredEdustat = (edustat || []).filter(e => {
                const dateStr = formatDateStr(e.date || getVal(e, 'date'));
                return dateStr && dateStr >= startDate && dateStr <= endDate;
            });

            const edustatGroups = {};
            filteredEdustat.forEach(e => {
                const udise = String(e.udise || '').trim();
                if (!validUdises.has(udise)) return;
                const hours = e.hours !== undefined ? Number(e.hours) : parseHours(e['total used hours'] || getVal(e, 'hours') || 0);

                if (!edustatGroups[udise]) {
                    edustatGroups[udise] = 0;
                }
                edustatGroups[udise] += hours;
            });

            if (dataSource === 'jhpms') {
                const list = Object.entries(jhpmsGroups).map(([udise, data]) => {
                    const sch = schoolLookup[udise] || {};
                    const avgPerDay = data.totalClasses / validWdays;
                    return {
                        udise,
                        name: sch.schoolName || udise,
                        district: sch.district || '-',
                        block: sch.block || '-',
                        ccDef: sch.ccDef || '-',
                        projectName: sch.projectName || '-',
                        ictClasses: data.ictClasses,
                        smartClasses: data.smartClasses,
                        totalClasses: data.totalClasses,
                        avgPerDay: avgPerDay
                    };
                });

                const maxAvg = list.length > 0 ? Math.max(...list.map(x => x.avgPerDay)) : 1;
                const results = list.map(item => {
                    const score = maxAvg > 0 ? (item.avgPerDay / maxAvg) * 100 : 0;
                    return {
                        ...item,
                        score: score,
                        avgPerDayDisp: item.avgPerDay.toFixed(2)
                    };
                }).sort((a, b) => b.score - a.score || b.totalClasses - a.totalClasses);

                results.forEach((r, idx) => {
                    r.rank = idx + 1;
                });

                return {
                    results,
                    type: 'school_jhpms',
                    totalIct,
                    totalSmart
                };
            } else if (dataSource === 'edustat') {
                const list = Object.entries(edustatGroups).map(([udise, hours]) => {
                    const sch = schoolLookup[udise] || {};
                    const avgHrsPerDay = hours / validWdays;
                    return {
                        udise,
                        name: sch.schoolName || udise,
                        district: sch.district || '-',
                        block: sch.block || '-',
                        ccDef: sch.ccDef || '-',
                        projectName: sch.projectName || '-',
                        totalHours: hours,
                        avgHrsPerDay: avgHrsPerDay
                    };
                });

                const maxAvgHrs = list.length > 0 ? Math.max(...list.map(x => x.avgHrsPerDay)) : 1;
                const results = list.map(item => {
                    const score = maxAvgHrs > 0 ? (item.avgHrsPerDay / maxAvgHrs) * 100 : 0;
                    return {
                        ...item,
                        score: score,
                        totalHoursDisp: item.totalHours.toFixed(2),
                        avgHrsPerDayDisp: item.avgHrsPerDay.toFixed(2)
                    };
                }).sort((a, b) => b.score - a.score || b.totalHours - a.totalHours);

                results.forEach((r, idx) => {
                    r.rank = idx + 1;
                });

                return {
                    results,
                    type: 'school_edustat',
                    totalIct: 0,
                    totalSmart: 0
                };
            } else {
                // Both data sources
                const jhpmsAvgs = {};
                Object.entries(jhpmsGroups).forEach(([udise, data]) => {
                    jhpmsAvgs[udise] = data.totalClasses / validWdays;
                });
                const maxJhpmsAvg = Object.values(jhpmsAvgs).length > 0 ? Math.max(...Object.values(jhpmsAvgs)) : 1;

                const edustatAvgs = {};
                Object.entries(edustatGroups).forEach(([udise, hours]) => {
                    edustatAvgs[udise] = hours / validWdays;
                });
                const maxEdustatAvg = Object.values(edustatAvgs).length > 0 ? Math.max(...Object.values(edustatAvgs)) : 1;

                const allUdises = new Set([...Object.keys(jhpmsGroups), ...Object.keys(edustatGroups)]);
                const list = Array.from(allUdises).map(udise => {
                    const sch = schoolLookup[udise] || {};
                    const jhpmsAvg = jhpmsAvgs[udise] || 0;
                    const edustatAvg = edustatAvgs[udise] || 0;

                    const jhpmsScore = maxJhpmsAvg > 0 ? (jhpmsAvg / maxJhpmsAvg) * 100 : 0;
                    const edustatScore = maxEdustatAvg > 0 ? (edustatAvg / maxEdustatAvg) * 100 : 0;
                    const combinedScore = 0.6 * jhpmsScore + 0.4 * edustatScore;

                    const jhpmsData = jhpmsGroups[udise] || { ictClasses: 0, smartClasses: 0, totalClasses: 0 };
                    const edustatHrs = edustatGroups[udise] || 0;

                    return {
                        udise,
                        name: sch.schoolName || udise,
                        district: sch.district || '-',
                        block: sch.block || '-',
                        ccDef: sch.ccDef || '-',
                        projectName: sch.projectName || '-',
                        jhpmsClasses: jhpmsData.totalClasses,
                        ictClasses: jhpmsData.ictClasses,
                        smartClasses: jhpmsData.smartClasses,
                        edustatHours: edustatHrs,
                        jhpmsScore: jhpmsScore,
                        edustatScore: edustatScore,
                        score: combinedScore
                    };
                });

                const results = list.sort((a, b) => b.score - a.score).map((item, idx) => ({
                    ...item,
                    rank: idx + 1
                }));

                return {
                    results,
                    type: 'school_both',
                    totalIct,
                    totalSmart
                };
            }
        }

        return { results: [], type: '', totalIct: 0, totalSmart: 0 };
    }, [performanceType, dataSource, filteredJhpms, edustat, edustatMaster, startDate, endDate, workingDays, schoolLookup, manpowerLookup, validUdises]);

    // 4. Excel Export Handler
    const handleExport = useMemo(() => {
        return () => {
            if (!performanceData.results || performanceData.results.length === 0) return;

            let exportFormat = [];
            const type = performanceData.type;

            if (type === 'ict_instructor') {
                exportFormat = performanceData.results.map(d => ({
                    'Rank': d.rank,
                    'Instructor Name': d.name,
                    'District': d.district,
                    'School Name': d.schoolName,
                    'UDISE': d.udise,
                    'CC/DEF Name': d.ccDef,
                    'Project Name': d.projectName,
                    'Manpower Status': d.status,
                    'Total ICT Classes': d.totalClasses,
                    'Avg/Day': d.avgPerDay,
                    'Score %': d.score.toFixed(2)
                }));
            } else if (type === 'subject_teacher') {
                exportFormat = performanceData.results.map(d => ({
                    'Rank': d.rank,
                    'Teacher Name': d.name,
                    'District': d.district,
                    'School Name': d.schoolName,
                    'UDISE': d.udise,
                    'CC/DEF Name': d.ccDef,
                    'Project Name': d.projectName,
                    'Subject(s)': d.subjects,
                    'Manpower Status': d.status,
                    'Total Smart Classes': d.totalClasses,
                    'Avg/Day': d.avgPerDay,
                    'Score %': d.score.toFixed(2)
                }));
            } else if (type === 'school_jhpms') {
                exportFormat = performanceData.results.map(d => ({
                    'Rank': d.rank,
                    'School Name': d.name,
                    'UDISE': d.udise,
                    'District': d.district,
                    'Block': d.block,
                    'CC/DEF Name': d.ccDef,
                    'Project Name': d.projectName,
                    'ICT Classes': d.ictClasses,
                    'Smart Classes': d.smartClasses,
                    'Total Classes': d.totalClasses,
                    'Avg/Day': d.avgPerDayDisp,
                    'Score %': d.score.toFixed(2)
                }));
            } else if (type === 'school_edustat') {
                exportFormat = performanceData.results.map(d => ({
                    'Rank': d.rank,
                    'School Name': d.name,
                    'UDISE': d.udise,
                    'District': d.district,
                    'Block': d.block,
                    'CC/DEF Name': d.ccDef,
                    'Project Name': d.projectName,
                    'Total Hours': d.totalHoursDisp,
                    'Avg Hrs/Day': d.avgHrsPerDayDisp,
                    'Score %': d.score.toFixed(2)
                }));
            } else if (type === 'school_both') {
                exportFormat = performanceData.results.map(d => ({
                    'Rank': d.rank,
                    'School Name': d.name,
                    'UDISE': d.udise,
                    'District': d.district,
                    'Block': d.block,
                    'CC/DEF Name': d.ccDef,
                    'Project Name': d.projectName,
                    'JHPMS Classes': d.jhpmsClasses,
                    'Edustat Hours': d.edustatHours.toFixed(2),
                    'JHPMS Score %': d.jhpmsScore.toFixed(2),
                    'Edustat Score %': d.edustatScore.toFixed(2),
                    'Combined Score %': d.score.toFixed(2)
                }));
            }

            exportToExcel(exportFormat, `School_Performance_${performanceType}_${dataSource}`);
        };
    }, [performanceData, performanceType, dataSource]);

    useEffect(() => {
        if (onRegisterExport) {
            onRegisterExport(() => handleExport);
        }
        return () => {
            if (onRegisterExport) onRegisterExport(null);
        };
    }, [handleExport, onRegisterExport]);

    // 5. Pagination
    const totalRows = performanceData.results.length;
    const totalPages = rowsPerPage === 'All' ? 1 : Math.ceil(totalRows / Number(rowsPerPage));
    const activePage = Math.min(currentPage, totalPages || 1);

    const paginatedResults = useMemo(() => {
        if (rowsPerPage === 'All') return performanceData.results;
        const startIdx = (activePage - 1) * Number(rowsPerPage);
        const endIdx = startIdx + Number(rowsPerPage);
        return performanceData.results.slice(startIdx, endIdx);
    }, [performanceData.results, activePage, rowsPerPage]);

    // 6. Charts preparation
    const barChartData = useMemo(() => {
        return performanceData.results.slice(0, 10).map(d => ({
            name: d.name.length > 20 ? d.name.substring(0, 18) + '..' : d.name,
            score: parseFloat(d.score.toFixed(2)),
            fullName: d.name
        }));
    }, [performanceData.results]);

    const pieChartData = useMemo(() => {
        const data = [];
        if (performanceData.totalIct > 0) {
            data.push({ name: 'ICT Classes', value: performanceData.totalIct, color: '#0d9488' });
        }
        if (performanceData.totalSmart > 0) {
            data.push({ name: 'Smart Classes', value: performanceData.totalSmart, color: '#f59e0b' });
        }
        return data;
    }, [performanceData.totalIct, performanceData.totalSmart]);

    const hasTeacherData = useMemo(() => {
        return (jhpmsLab || []).some(row => {
            const teacherKey = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes('subjectteacher'));
            const teacher = teacherKey ? String(row[teacherKey] || '').trim() : getVal(row, 'teacher');
            return !!teacher;
        });
    }, [jhpmsLab]);

    // Render helper for empty master data
    if (!schools.length) {
        return (
            <div className="p-10 text-center text-gray-500 bg-white/80 rounded-2xl m-4 shadow-sm border border-white/40 animate-fade-in">
                Please go to Setup and upload School Master data first.
            </div>
        );
    }

    if (!jhpmsLab.length) {
        return (
            <div className="p-10 text-center text-gray-500 bg-white/80 rounded-2xl m-4 shadow-sm border border-white/40 animate-fade-in">
                Please upload JHPMS Lab Usage data in the Setup tab first.
            </div>
        );
    }


    return (
        <div className="flex flex-col gap-4 p-4 animate-fade-in">

            {/* 1. Header Filter Controls */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white/70 backdrop-blur-md p-3 rounded-2xl border border-white/40 shadow-sm shrink-0">
                <div className="flex flex-col gap-1.5 w-full md:w-auto">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-teal-800">Performance Category</span>
                    <div className="flex bg-gray-100 p-0.5 rounded-xl border border-gray-200">
                        <button
                            onClick={() => setPerformanceType('school')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                performanceType === 'school'
                                    ? 'bg-teal-600 text-white shadow-md'
                                    : 'text-gray-600 hover:text-teal-700 hover:bg-gray-50'
                            }`}
                        >
                            🏫 School
                        </button>
                        <button
                            onClick={() => setPerformanceType('ict_instructor')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                performanceType === 'ict_instructor'
                                    ? 'bg-teal-600 text-white shadow-md'
                                    : 'text-gray-600 hover:text-teal-700 hover:bg-gray-50'
                            }`}
                        >
                            🖥️ ICT Instructor
                        </button>
                        <button
                            onClick={() => setPerformanceType('subject_teacher')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                performanceType === 'subject_teacher'
                                    ? 'bg-teal-600 text-white shadow-md'
                                    : 'text-gray-600 hover:text-teal-700 hover:bg-gray-50'
                            }`}
                        >
                            📚 Subject Teacher
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5 w-full md:w-auto">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-teal-800">Data Source Filter</span>
                    <div className="flex bg-gray-100 p-0.5 rounded-xl border border-gray-200">
                        <button
                            onClick={() => setDataSource('jhpms')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                dataSource === 'jhpms'
                                    ? 'bg-teal-600 text-white shadow-md'
                                    : 'text-gray-600 hover:text-teal-700 hover:bg-gray-50'
                            }`}
                        >
                            JHPMS
                        </button>
                        <button
                            disabled={performanceType === 'ict_instructor' || performanceType === 'subject_teacher'}
                            onClick={() => setDataSource('edustat')}
                            title={
                                performanceType === 'ict_instructor' || performanceType === 'subject_teacher'
                                    ? 'Edustat has no teacher names'
                                    : 'Filter by Edustat device hours'
                            }
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all relative ${
                                dataSource === 'edustat'
                                    ? 'bg-teal-600 text-white shadow-md'
                                    : 'text-gray-600 hover:text-teal-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'
                            }`}
                        >
                            Edustat
                        </button>
                        <button
                            disabled={performanceType === 'ict_instructor' || performanceType === 'subject_teacher'}
                            onClick={() => setDataSource('both')}
                            title={
                                performanceType === 'ict_instructor' || performanceType === 'subject_teacher'
                                    ? 'Edustat has no teacher names'
                                    : 'Combined performance score (JHPMS + Edustat)'
                            }
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                dataSource === 'both'
                                    ? 'bg-teal-600 text-white shadow-md'
                                    : 'text-gray-600 hover:text-teal-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'
                            }`}
                        >
                            Both
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-teal-50 px-3 py-2 rounded-xl border border-teal-100 shadow-[inset_0_1px_2px_rgba(13,148,136,0.05)] self-stretch md:self-auto justify-center">
                    <div className="text-left">
                        <div className="text-[9px] uppercase tracking-wider text-teal-600 font-extrabold leading-none">Working Days</div>
                        <div className="text-sm font-black text-teal-800">{workingDays} Days</div>
                    </div>
                </div>
            </div>

            {/* 2. Top 3 Badges */}
            {performanceData.results.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border border-teal-100 p-2 rounded-2xl bg-white/70 backdrop-blur-md shadow-sm shrink-0">
                    {/* Gold Performer */}
                    {performanceData.results[0] && (
                        <div className="rounded-xl border shadow-sm bg-gradient-to-br from-amber-50 to-yellow-100/90 border-yellow-300 p-2.5 flex items-center gap-3 relative overflow-hidden transition-all hover:shadow-md animate-fade-in">
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-yellow-400 rounded-full opacity-20 blur-xl"></div>
                            <div className="text-3xl drop-shadow-md flex-shrink-0">🏆</div>
                            <div className="flex-1 text-left min-w-0">
                                <div className="font-extrabold text-[9px] text-yellow-800 uppercase tracking-wider opacity-90">Gold Performer</div>
                                <div className="font-extrabold text-sm text-gray-800 leading-tight truncate" title={performanceData.results[0].name}>
                                    {performanceData.results[0].name}
                                </div>
                                <div className="text-[10px] text-gray-600 font-semibold truncate">
                                    {performanceType === 'school' ? `UDISE: ${performanceData.results[0].udise}` : performanceData.results[0].schoolName}
                                </div>
                                <div className="text-[10px] text-gray-500 font-medium truncate">
                                    {performanceData.results[0].district} • CC/DEF: {performanceData.results[0].ccDef}
                                </div>
                                <div className="text-[10px] font-bold text-yellow-800 mt-1">
                                    {performanceData.type === 'school_edustat'
                                        ? `Hours: ${performanceData.results[0].totalHoursDisp} hrs`
                                        : performanceData.type === 'school_both'
                                        ? `Classes: ${performanceData.results[0].jhpmsClasses} | Hrs: ${performanceData.results[0].edustatHours.toFixed(1)}`
                                        : `Classes: ${performanceData.results[0].totalClasses}`}
                                </div>
                            </div>
                            <div className="bg-white px-2.5 py-1.5 rounded-lg font-black text-xs text-yellow-700 shadow-sm border border-yellow-200 whitespace-nowrap self-center">
                                {performanceData.results[0].score.toFixed(2)}%
                            </div>
                        </div>
                    )}

                    {/* Silver Performer */}
                    {performanceData.results[1] && (
                        <div className="rounded-xl border shadow-sm bg-gradient-to-br from-slate-50 to-gray-150 border-gray-300 p-2.5 flex items-center gap-3 relative overflow-hidden transition-all hover:shadow-md animate-fade-in">
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-gray-400 rounded-full opacity-20 blur-xl"></div>
                            <div className="text-3xl drop-shadow-md flex-shrink-0">🥈</div>
                            <div className="flex-1 text-left min-w-0">
                                <div className="font-extrabold text-[9px] text-gray-600 uppercase tracking-wider opacity-90">Silver Performer</div>
                                <div className="font-extrabold text-sm text-gray-800 leading-tight truncate" title={performanceData.results[1].name}>
                                    {performanceData.results[1].name}
                                </div>
                                <div className="text-[10px] text-gray-600 font-semibold truncate">
                                    {performanceType === 'school' ? `UDISE: ${performanceData.results[1].udise}` : performanceData.results[1].schoolName}
                                </div>
                                <div className="text-[10px] text-gray-500 font-medium truncate">
                                    {performanceData.results[1].district} • CC/DEF: {performanceData.results[1].ccDef}
                                </div>
                                <div className="text-[10px] font-bold text-gray-700 mt-1">
                                    {performanceData.type === 'school_edustat'
                                        ? `Hours: ${performanceData.results[1].totalHoursDisp} hrs`
                                        : performanceData.type === 'school_both'
                                        ? `Classes: ${performanceData.results[1].jhpmsClasses} | Hrs: ${performanceData.results[1].edustatHours.toFixed(1)}`
                                        : `Classes: ${performanceData.results[1].totalClasses}`}
                                </div>
                            </div>
                            <div className="bg-white px-2.5 py-1.5 rounded-lg font-black text-xs text-gray-700 shadow-sm border border-gray-350 whitespace-nowrap self-center">
                                {performanceData.results[1].score.toFixed(2)}%
                            </div>
                        </div>
                    )}

                    {/* Bronze Performer */}
                    {performanceData.results[2] && (
                        <div className="rounded-xl border shadow-sm bg-gradient-to-br from-orange-50 to-amber-100/70 border-amber-300/60 p-2.5 flex items-center gap-3 relative overflow-hidden transition-all hover:shadow-md animate-fade-in">
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-600 rounded-full opacity-10 blur-xl"></div>
                            <div className="text-3xl drop-shadow-md flex-shrink-0">🥉</div>
                            <div className="flex-1 text-left min-w-0">
                                <div className="font-extrabold text-[9px] text-amber-800 uppercase tracking-wider opacity-90">Bronze Performer</div>
                                <div className="font-extrabold text-sm text-gray-800 leading-tight truncate" title={performanceData.results[2].name}>
                                    {performanceData.results[2].name}
                                </div>
                                <div className="text-[10px] text-gray-600 font-semibold truncate">
                                    {performanceType === 'school' ? `UDISE: ${performanceData.results[2].udise}` : performanceData.results[2].schoolName}
                                </div>
                                <div className="text-[10px] text-gray-500 font-medium truncate">
                                    {performanceData.results[2].district} • CC/DEF: {performanceData.results[2].ccDef}
                                </div>
                                <div className="text-[10px] font-bold text-amber-800 mt-1">
                                    {performanceData.type === 'school_edustat'
                                        ? `Hours: ${performanceData.results[2].totalHoursDisp} hrs`
                                        : performanceData.type === 'school_both'
                                        ? `Classes: ${performanceData.results[2].jhpmsClasses} | Hrs: ${performanceData.results[2].edustatHours.toFixed(1)}`
                                        : `Classes: ${performanceData.results[2].totalClasses}`}
                                </div>
                            </div>
                            <div className="bg-white px-2.5 py-1.5 rounded-lg font-black text-xs text-amber-800 shadow-sm border border-amber-200 whitespace-nowrap self-center">
                                {performanceData.results[2].score.toFixed(2)}%
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 3. Charts Area */}
            {performanceData.results.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 shrink-0">
                    {/* Top 10 Performers Horizontal Bar Chart */}
                    <div className="bg-white/70 backdrop-blur-md border border-teal-100 p-3 rounded-2xl shadow-sm relative" id="top-performers-chart-container">
                        <ChartToolbar
                            chartId="top-performers-chart-container"
                            csvData={barChartData}
                            filename="top_performers_scores"
                        />
                        <div className="text-xs font-black uppercase text-teal-800 tracking-wider mb-2.5 flex items-center gap-1.5">
                            📊 Top 10 Performer Scores
                        </div>
                        <div className="h-[180px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={barChartData} margin={{ top: 0, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={9} />
                                    <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={9} width={80} />
                                    <Tooltip content={<PremiumChartTooltip />} />
                                    <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={12}>
                                        {barChartData.map((entry, index) => {
                                            let fill = '#0d9488'; // Teal
                                            if (index === 0) fill = '#f59e0b'; // Gold
                                            else if (index === 1) fill = '#94a3b8'; // Silver
                                            else if (index === 2) fill = '#b45309'; // Bronze
                                            return <Cell key={`cell-${index}`} fill={fill} />;
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Classes Split Donut Chart */}
                    <div className="bg-white/70 backdrop-blur-md border border-teal-100 p-3 rounded-2xl shadow-sm relative" id="donut-classes-chart-container">
                        <ChartToolbar
                            chartId="donut-classes-chart-container"
                            csvData={pieChartData}
                            filename="classes_split_distribution"
                        />
                        <div className="text-xs font-black uppercase text-teal-800 tracking-wider mb-2.5 flex items-center gap-1.5">
                            🍩 ICT vs Smart Class Distribution
                        </div>
                        {pieChartData.length > 0 ? (
                            <div className="h-[180px] w-full flex items-center justify-between gap-4">
                                <div className="h-full flex-1 relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieChartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={45}
                                                outerRadius={65}
                                                paddingAngle={4}
                                                dataKey="value"
                                            >
                                                {pieChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<PremiumChartTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    {/* Donut Center Count */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                        <div className="text-[8px] text-gray-500 uppercase tracking-widest font-black leading-none">Total</div>
                                        <div className="text-lg font-black text-teal-800 leading-tight">
                                            {performanceData.totalIct + performanceData.totalSmart}
                                        </div>
                                        <div className="text-[8px] text-teal-600 font-extrabold leading-none">Classes</div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2.5 text-xs font-extrabold text-gray-700 min-w-[120px] pr-2">
                                    {pieChartData.map((entry, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-md shadow-sm shrink-0" style={{ backgroundColor: entry.color }}></div>
                                            <div className="flex flex-col leading-tight">
                                                <span className="text-[10px] text-gray-400 uppercase tracking-wide leading-none">{entry.name}</span>
                                                <span className="text-sm font-bold text-gray-800">{entry.value} Classes</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="h-[180px] flex items-center justify-center text-gray-450 italic text-xs">
                                No Class Classification Available
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 4. Table / Leaderboard */}
            <div className="flex flex-col bg-white/80 backdrop-blur-md rounded-2xl border border-teal-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto text-xs">

                    <table className="w-full text-left min-w-max">
                        <thead className="bg-gradient-to-r from-teal-800 to-teal-700 text-white sticky top-0 z-30 shadow-md">
                            {performanceData.type === 'ict_instructor' && (
                                <tr>
                                    <th className="p-2.5 border-r border-teal-600/30 text-center font-bold w-[50px]">Rank</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold">Instructor Name</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold">District</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold">School Name</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold text-center">UDISE</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold">CC/DEF Name</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold text-center">Manpower Status</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold text-center bg-teal-900/40">Total ICT Classes</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold text-center">Avg/Day</th>
                                    <th className="p-2.5 font-bold text-center bg-indigo-900/40">Score %</th>
                                </tr>
                            )}
                            {performanceData.type === 'subject_teacher' && (
                                <tr>
                                    <th className="p-2.5 border-r border-teal-600/30 text-center font-bold w-[50px]">Rank</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold">Teacher Name</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold">District</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold">School Name</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold text-center">UDISE</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold">CC/DEF Name</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold">Subject(s)</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold text-center">Manpower Status</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold text-center bg-teal-900/40">Total Smart Classes</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold text-center">Avg/Day</th>
                                    <th className="p-2.5 font-bold text-center bg-indigo-900/40">Score %</th>
                                </tr>
                            )}
                            {performanceData.type === 'school_jhpms' && (
                                <tr>
                                    <th className="p-2.5 border-r border-teal-600/30 text-center font-bold w-[50px]">Rank</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold">School Name</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold text-center">UDISE</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold">District</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold">Block</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold">CC/DEF Name</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold text-center bg-teal-900/20">ICT Classes</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold text-center bg-teal-900/20">Smart Classes</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold text-center bg-teal-900/40">Total Classes</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold text-center">Avg/Day</th>
                                    <th className="p-2.5 font-bold text-center bg-indigo-900/40">Score %</th>
                                </tr>
                            )}
                            {performanceData.type === 'school_edustat' && (
                                <tr>
                                    <th className="p-2.5 border-r border-teal-600/30 text-center font-bold w-[50px]">Rank</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold">School Name</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold text-center">UDISE</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold">District</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold">Block</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold">CC/DEF Name</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold text-center bg-teal-900/40">Total Hours</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold text-center">Avg Hrs/Day</th>
                                    <th className="p-2.5 font-bold text-center bg-indigo-900/40">Score %</th>
                                </tr>
                            )}
                            {performanceData.type === 'school_both' && (
                                <tr>
                                    <th className="p-2.5 border-r border-teal-600/30 text-center font-bold w-[50px]">Rank</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold">School Name</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold text-center">UDISE</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold">District</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold">Block</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold">CC/DEF Name</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold text-center bg-teal-900/20">JHPMS Classes</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold text-center bg-teal-900/20">Edustat Hours</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold text-center bg-teal-900/40">JHPMS Score %</th>
                                    <th className="p-2.5 border-r border-teal-600/30 font-bold text-center bg-teal-900/40">Edustat Score %</th>
                                    <th className="p-2.5 font-bold text-center bg-indigo-900/40">Combined Score %</th>
                                </tr>
                            )}
                        </thead>
                        <tbody className="divide-y divide-gray-150 text-gray-700">
                            {paginatedResults.map((row) => (
                                <tr key={row.rank} className="hover:bg-teal-50/50 transition">
                                    <td className="p-2.5 border-r border-gray-150 text-center font-bold">
                                        {row.rank <= 3 ? (
                                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full font-black text-[10px] text-white shadow-sm ${
                                                row.rank === 1 ? 'bg-yellow-500' : row.rank === 2 ? 'bg-slate-400' : 'bg-amber-600'
                                            }`}>
                                                {row.rank}
                                            </span>
                                        ) : (
                                            row.rank
                                        )}
                                    </td>
                                    <td className="p-2.5 border-r border-gray-150 font-bold text-gray-900 leading-tight">
                                        {row.name}
                                    </td>

                                    {/* Specific fields depending on mode */}
                                    {performanceData.type === 'ict_instructor' && (
                                        <>
                                            <td className="p-2.5 border-r border-gray-150">{row.district}</td>
                                            <td className="p-2.5 border-r border-gray-150 font-medium leading-tight">{row.schoolName}</td>
                                            <td className="p-2.5 border-r border-gray-150 font-mono text-center">{row.udise}</td>
                                            <td className="p-2.5 border-r border-gray-150">{row.ccDef}</td>
                                            <td className="p-2.5 border-r border-gray-150 text-center font-bold">
                                                <span className={`inline-block px-1.5 py-0.5 rounded-md text-[10px] leading-tight ${
                                                    row.status.toUpperCase() === 'ACTIVE'
                                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                                        : 'bg-red-50 text-red-700 border border-red-200'
                                                }`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td className="p-2.5 border-r border-gray-150 text-center font-extrabold text-teal-800 bg-teal-50/20">{row.totalClasses}</td>
                                            <td className="p-2.5 border-r border-gray-150 text-center">{row.avgPerDay}</td>
                                        </>
                                    )}

                                    {performanceData.type === 'subject_teacher' && (
                                        <>
                                            <td className="p-2.5 border-r border-gray-150">{row.district}</td>
                                            <td className="p-2.5 border-r border-gray-150 font-medium leading-tight">{row.schoolName}</td>
                                            <td className="p-2.5 border-r border-gray-150 font-mono text-center">{row.udise}</td>
                                            <td className="p-2.5 border-r border-gray-150">{row.ccDef}</td>
                                            <td className="p-2.5 border-r border-gray-150 font-medium truncate max-w-[120px]" title={row.subjects}>{row.subjects}</td>
                                            <td className="p-2.5 border-r border-gray-150 text-center font-bold">
                                                <span className={`inline-block px-1.5 py-0.5 rounded-md text-[10px] leading-tight ${
                                                    row.status.toUpperCase() === 'ACTIVE'
                                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                                        : 'bg-red-50 text-red-700 border border-red-200'
                                                }`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td className="p-2.5 border-r border-gray-150 text-center font-extrabold text-teal-800 bg-teal-50/20">{row.totalClasses}</td>
                                            <td className="p-2.5 border-r border-gray-150 text-center">{row.avgPerDay}</td>
                                        </>
                                    )}

                                    {performanceData.type === 'school_jhpms' && (
                                        <>
                                            <td className="p-2.5 border-r border-gray-150 font-mono text-center font-semibold">{row.udise}</td>
                                            <td className="p-2.5 border-r border-gray-150">{row.district}</td>
                                            <td className="p-2.5 border-r border-gray-150">{row.block}</td>
                                            <td className="p-2.5 border-r border-gray-150">{row.ccDef}</td>
                                            <td className="p-2.5 border-r border-gray-150 text-center text-teal-700 font-semibold">{row.ictClasses}</td>
                                            <td className="p-2.5 border-r border-gray-150 text-center text-amber-600 font-semibold">{row.smartClasses}</td>
                                            <td className="p-2.5 border-r border-gray-150 text-center font-extrabold text-teal-900 bg-teal-50/20">{row.totalClasses}</td>
                                            <td className="p-2.5 border-r border-gray-150 text-center">{row.avgPerDayDisp}</td>
                                        </>
                                    )}

                                    {performanceData.type === 'school_edustat' && (
                                        <>
                                            <td className="p-2.5 border-r border-gray-150 font-mono text-center font-semibold">{row.udise}</td>
                                            <td className="p-2.5 border-r border-gray-150">{row.district}</td>
                                            <td className="p-2.5 border-r border-gray-150">{row.block}</td>
                                            <td className="p-2.5 border-r border-gray-150">{row.ccDef}</td>
                                            <td className="p-2.5 border-r border-gray-150 text-center font-extrabold text-teal-900 bg-teal-50/20">{row.totalHoursDisp} hrs</td>
                                            <td className="p-2.5 border-r border-gray-150 text-center">{row.avgHrsPerDayDisp} hrs</td>
                                        </>
                                    )}

                                    {performanceData.type === 'school_both' && (
                                        <>
                                            <td className="p-2.5 border-r border-gray-150 font-mono text-center font-semibold">{row.udise}</td>
                                            <td className="p-2.5 border-r border-gray-150">{row.district}</td>
                                            <td className="p-2.5 border-r border-gray-150">{row.block}</td>
                                            <td className="p-2.5 border-r border-gray-150">{row.ccDef}</td>
                                            <td className="p-2.5 border-r border-gray-150 text-center font-bold text-teal-700">{row.jhpmsClasses}</td>
                                            <td className="p-2.5 border-r border-gray-150 text-center font-bold text-amber-700">{row.edustatHours.toFixed(1)}</td>
                                            <td className="p-2.5 border-r border-gray-150 text-center text-teal-800 font-extrabold bg-teal-50/10">{row.jhpmsScore.toFixed(1)}%</td>
                                            <td className="p-2.5 border-r border-gray-150 text-center text-amber-800 font-extrabold bg-amber-50/10">{row.edustatScore.toFixed(1)}%</td>
                                        </>
                                    )}

                                    <td className="p-2.5 text-center font-extrabold text-indigo-700 bg-indigo-50/40 border-l border-indigo-150 text-[13px] shadow-[inset_1px_0_0_rgba(0,0,0,0.03)]">
                                        {row.score.toFixed(2)}%
                                    </td>
                                </tr>
                            ))}
                            {performanceData.results.length === 0 && (
                                <tr>
                                    <td colSpan="12" className="p-8 text-center text-gray-450 italic">
                                        {!hasTeacherData && (performanceType === 'ict_instructor' || performanceType === 'subject_teacher') ? (
                                            <div className="flex flex-col items-center justify-center p-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl max-w-lg mx-auto not-italic shadow-sm animate-fade-in my-4">
                                                <div className="text-3xl mb-2">⚠️</div>
                                                <div className="font-extrabold text-sm mb-1 uppercase tracking-wider">No Teacher Names in Database</div>
                                                <p className="text-[11px] leading-relaxed text-amber-700 font-semibold">
                                                    Your local database does not contain Subject Teacher names. To populate teacher names and view instructor/teacher performance, please go to the <strong>System Setup</strong> tab and re-upload your <strong>Lab Uses by JHPMS</strong> Excel file.
                                                </p>
                                            </div>
                                        ) : (
                                            "No data matches the selected filters."
                                        )}
                                    </td>
                                </tr>
                            )}

                        </tbody>
                    </table>
                </div>

                {/* 5. Pagination Footer */}
                {totalRows > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white border-t border-teal-100 shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-gray-500">Rows per page:</span>
                            <select
                                value={rowsPerPage}
                                onChange={(e) => {
                                    setRowsPerPage(e.target.value === 'All' ? 'All' : Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="px-2 py-1 text-xs border border-gray-200 rounded-lg font-bold text-gray-600 bg-white"
                            >
                                <option value={10}>10 Rows</option>
                                <option value={20}>20 Rows</option>
                                <option value={50}>50 Rows</option>
                                <option value={100}>100 Rows</option>
                                <option value="All">Show All</option>

                            </select>
                            <span className="text-[10px] text-gray-450 font-medium">
                                Showing {rowsPerPage === 'All' ? 1 : (activePage - 1) * Number(rowsPerPage) + 1}-
                                {rowsPerPage === 'All' ? totalRows : Math.min(activePage * Number(rowsPerPage), totalRows)} of {totalRows}
                            </span>
                        </div>

                        {rowsPerPage !== 'All' && totalPages > 1 && (
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={activePage === 1}
                                    className="px-2 py-1 text-xs border border-gray-200 rounded-lg text-gray-500 bg-white font-black hover:bg-teal-50/40 disabled:opacity-40 disabled:hover:bg-white transition"
                                    title="First Page"
                                >
                                    «
                                </button>
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                    disabled={activePage === 1}
                                    className="px-2 py-1 text-xs border border-gray-200 rounded-lg text-gray-500 bg-white font-black hover:bg-teal-50/40 disabled:opacity-40 disabled:hover:bg-white transition"
                                    title="Previous Page"
                                >
                                    ‹
                                </button>
                                <span className="px-3 py-1 text-xs font-black text-teal-800 bg-teal-50 rounded-lg border border-teal-100">
                                    Page {activePage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                                    disabled={activePage === totalPages}
                                    className="px-2 py-1 text-xs border border-gray-200 rounded-lg text-gray-500 bg-white font-black hover:bg-teal-50/40 disabled:opacity-40 disabled:hover:bg-white transition"
                                    title="Next Page"
                                >
                                    ›
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={activePage === totalPages}
                                    className="px-2 py-1 text-xs border border-gray-200 rounded-lg text-gray-500 bg-white font-black hover:bg-teal-50/40 disabled:opacity-40 disabled:hover:bg-white transition"
                                    title="Last Page"
                                >
                                    »
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SchoolPerformance;
