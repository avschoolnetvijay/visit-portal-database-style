import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import * as XLSX from 'xlsx';
import { get, set, clear as clearIDB } from 'idb-keyval';
import { Icons } from './components/Icons';
import Dashboard from './components/Dashboard';
import SearchView from './components/SearchView';
import PerformanceView from './components/PerformanceView';
import PlanView from './components/PlanView';
import ComplianceView from './components/ComplianceView';
import ReportsView from './components/ReportsView';
import Setup from './components/Setup';
import DrillDownModal from './components/DrillDownModal';
import FieldTeamPerformance from './components/FieldTeamPerformance';
import MultiSelect from './components/MultiSelect';
import {
    parseDateRobust,
    formatDate,
    getMonthsInRange,
    calculateStatus,
    calculateEngagement,
    exportToExcel
} from './utils';

const normalizeRowHeaders = (row, isSheetValueArray = false, headersList = null) => {
    const newRow = {};
    
    const processKey = (k, val) => {
        let nk = k.trim().toLowerCase().replace(/ /g, '_').replace(/[\r\n]+/g, '');
        if (nk.includes('udise')) nk = 'udise_code';
        else if (nk.includes('school') && nk.includes('name')) nk = 'school_name';
        else if (nk.includes('school') && !nk.includes('name')) nk = 'school_name';
        else if (nk.includes('district')) nk = 'district';
        else if (nk.includes('block')) nk = 'block';
        else if (nk.includes('visitor') && nk.includes('name')) nk = 'visitor_name';
        else if (nk.includes('visitor') && !nk.includes('name')) nk = 'visitor_name';
        else if (nk.includes('project')) nk = 'project_name';
        else if (nk.includes('visit') && nk.includes('type')) nk = 'visit_type';
        else if (nk.includes('visit') && nk.includes('date')) nk = 'visit_date';
        else if (nk.includes('target') || nk.includes('monthly')) nk = 'monthly_target';
        newRow[nk] = val;
    };

    if (isSheetValueArray && headersList) {
        headersList.forEach((h, idx) => {
            processKey(h, row[idx] !== undefined ? row[idx] : '');
        });
    } else {
        Object.keys(row).forEach(k => {
            processKey(k, row[k]);
        });
    }

    if (!newRow.monthly_target) {
        newRow.monthly_target = newRow.monthly_visit_target || 1;
    } else {
        newRow.monthly_target = Number(newRow.monthly_target) || 1;
    }

    return newRow;
};

const App = () => {
    const [activeTab, setActiveTab] = useState('setup');
    const [schools, setSchools] = useState([]);
    const [visits, setVisits] = useState([]);
    const [jhpmsLab, setJhpmsLab] = useState([]);
    const [edustat, setEdustat] = useState([]);
    const [manpower, setManpower] = useState([]);
    const [drillDownData, setDrillDownData] = useState(null);

    const [isAuthenticated, setIsAuthenticated] = useState(
        () => sessionStorage.getItem('snet_authenticated') === 'true'
    );
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');

    const [googleLoading, setGoogleLoading] = useState(false);
    const [jhpmsLoading, setJhpmsLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [globalLoading, setGlobalLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    const [startDate, setStartDate] = useState(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const [selProjects, setSelProjects] = useState([]);
    const [selDistricts, setSelDistricts] = useState([]);
    const [selBlocks, setSelBlocks] = useState([]);
    const [selSchools, setSelSchools] = useState([]);

    const [darkMode, setDarkMode] = useState(
        () => localStorage.getItem('snet_dark_mode') === 'true'
    );

    // Sync body class with dark mode theme
    useEffect(() => {
        if (darkMode) {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
        localStorage.setItem('snet_dark_mode', String(darkMode));
    }, [darkMode]);

    // Deferred values for lag-free filter changes
    const defStartDate = useDeferredValue(startDate);
    const defEndDate = useDeferredValue(endDate);
    const defSelProjects = useDeferredValue(selProjects);
    const defSelDistricts = useDeferredValue(selDistricts);
    const defSelBlocks = useDeferredValue(selBlocks);
    const defSelSchools = useDeferredValue(selSchools);
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const s = await get('schools');
                const v = await get('visits');
                const jl = await get('jhpms_lab');
                const e = await get('edustat');
                const m = await get('manpower');
                
                if (s) setSchools(s);
                if (v) setVisits(v);
                if (jl) setJhpmsLab(jl);
                if (e) setEdustat(e);
                if (m) setManpower(m);
                
                if (s && v) setActiveTab('dashboard');
                else setActiveTab('setup');
            } catch (err) {
                console.error("Error loading from IndexedDB:", err);
            } finally {
                setIsLoadingData(false);
            }
        };
        loadData();
    }, []);

    // Primary Data Processing Engine
    const processedData = useMemo(() => {
        const start = new Date(defStartDate);
        const end = new Date(defEndDate);
        end.setHours(23, 59, 59, 999);
        const months = getMonthsInRange(start, end);

        let fSchools = schools;
        if (defSelProjects.length) fSchools = fSchools.filter(s => defSelProjects.includes(s.project_name));
        if (defSelDistricts.length) fSchools = fSchools.filter(s => defSelDistricts.includes(s.district));
        if (defSelBlocks.length) fSchools = fSchools.filter(s => defSelBlocks.includes(s.block));
        if (defSelSchools.length) fSchools = fSchools.filter(s => defSelSchools.includes(s.school_name));

        const validUdise = new Set(fSchools.map(s => String(s.udise_code)));
        const fVisits = visits.filter(v => {
            const d = new Date(v.visit_date);
            return !isNaN(d.getTime()) && d >= start && d <= end && validUdise.has(String(v.udise_code));
        });

        const metrics = {};
        const today = new Date();
        fSchools.forEach(s => {
            metrics[s.udise_code] = {
                ...s,
                uniqueVisits: 0,
                visitDates: new Set(),
                totalRecords: 0,
                lastVisit: null,
                smartRecords: 0,
                ictRecords: 0
            };
        });

        fVisits.forEach(v => {
            if (metrics[v.udise_code]) {
                const m = metrics[v.udise_code];
                m.totalRecords++;
                // Defensive split on visit_date to avoid crashing on missing or invalid logs
                const dateStr = (v.visit_date || '').split('T')[0];
                if (dateStr) {
                    m.visitDates.add(dateStr);
                }
                const dObj = new Date(v.visit_date);
                if (!isNaN(dObj.getTime())) {
                    if (!m.lastVisit || dObj > new Date(m.lastVisit)) m.lastVisit = v.visit_date;
                }

                const type = (v.visit_type || '').toLowerCase();
                if (type.includes('smart')) m.smartRecords++;
                if (type.includes('ict')) m.ictRecords++;
            }
        });

        const finalSchools = Object.values(metrics).map(s => {
            const unique = s.visitDates.size;
            const target = (s.monthly_target || 1) * months;
            const daysSince = s.lastVisit ? Math.floor((today - new Date(s.lastVisit)) / (1000 * 60 * 60 * 24)) : 999;

            const dateArr = Array.from(s.visitDates).sort();
            const formattedDates = dateArr
                .map(d => {
                    const parts = d.split('-');
                    return `${parts[2]}-${parts[1]}-${parts[0]}`;
                })
                .join(', ');

            return {
                ...s,
                uniqueVisits: unique,
                targetVisits: target,
                engagement: calculateEngagement(unique, target, daysSince),
                status: calculateStatus(unique, target),
                lastVisit: s.lastVisit,
                formattedDates: formattedDates,
                // CRITICAL STABILITY IMPROVEMENT: Convert Set to Array before rendering or saving
                visitDates: dateArr
            };
        });

        return {
            schools: finalSchools,
            visits: fVisits,
            months,
            totalTarget: finalSchools.reduce((a, b) => a + b.targetVisits, 0),
            totalUnique: finalSchools.reduce((a, b) => a + b.uniqueVisits, 0),
            totalRecords: fVisits.length
        };
    }, [schools, visits, defStartDate, defEndDate, defSelProjects, defSelDistricts, defSelBlocks, defSelSchools]);

    // Secure Auto-Fetch from Google Sheets (via Netlify proxy)
    const fetchFromGoogleSheet = async () => {
        setGoogleLoading(true);
        try {
            // Fallback to production URL when running locally in development mode or offline
            const functionUrl =
                window.location.hostname === 'localhost' ||
                window.location.hostname === '' ||
                window.location.protocol === 'file:'
                    ? 'https://schoolnet-visit-portal-vijay.netlify.app/.netlify/functions/fetch-schools'
                    : '/.netlify/functions/fetch-schools';

            const res = await fetch(functionUrl);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Server returned status ${res.status}`);
            }
            const sheetData = await res.json();

            if (!sheetData.values || sheetData.values.length < 2) {
                alert('No data found in the sheet.');
                return;
            }

            const headers = sheetData.values[0];
            const rows = sheetData.values.slice(1);

            const normalized = rows.map(row => normalizeRowHeaders(row, true, headers));

            setSchools(normalized);
            await set('schools', normalized);
            alert(`Successfully imported ${normalized.length} schools from Google Sheet securely!`);
        } catch (error) {
            console.error(error);
            alert('Error fetching Google Sheet: ' + error.message);
        } finally {
            setGoogleLoading(false);
        }
    };

    // Synchronize Visit Data directly from JHPMS via local python proxy server
    const fetchJhpmsData = async () => {
        setJhpmsLoading(true);
        try {
            const syncUrl = `http://localhost:8000/sync?startDate=${startDate}&endDate=${endDate}`;
            const response = await fetch(syncUrl);

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Server returned status ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const data = new Uint8Array(arrayBuffer);
            const wb = XLSX.read(data, { type: 'array' });
            const sheetJson = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

            const normalized = sheetJson
                .map(row => {
                    const newRow = normalizeRowHeaders(row);
                    if (newRow.visit_type) newRow.visit_type = newRow.visit_type.toString().trim();

                    // Parse the raw date robustly to prevent shifting
                    const pd = parseDateRobust(newRow.visit_date);
                    if (pd) {
                        const year = pd.getFullYear();
                        const month = String(pd.getMonth() + 1).padStart(2, '0');
                        const day = String(pd.getDate()).padStart(2, '0');
                        newRow.visit_date = `${year}-${month}-${day}T00:00:00`;
                    }
                    return newRow;
                })
                .filter(r => r.visit_date);

            setVisits(normalized);
            await set('visits', normalized);

            // Auto-fill Dates Logic
            if (normalized.length > 0) {
                const dates = normalized
                    .map(v => new Date(v.visit_date))
                    .filter(d => !isNaN(d.getTime()))
                    .sort((a, b) => a - b);
                if (dates.length > 0) {
                    setStartDate(dates[0].toISOString().split('T')[0]);
                    setEndDate(dates[dates.length - 1].toISOString().split('T')[0]);
                }
            }

            alert(`Successfully synchronized ${normalized.length} visit records from JHPMS proxy!`);
        } catch (error) {
            console.error('JHPMS sync error:', error);
            alert(
                `JHPMS Sync Failed: ${error.message}\n\nMake sure the local Python proxy server 'jhpms_sync.py' is running on http://localhost:8000 and you have provided a valid ASP.NET_SessionId cookie.`
            );
        } finally {
            setJhpmsLoading(false);
        }
    };

    // Handle Local File Uploads (School master / Raw visit reports)
    const handleUpload = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        setGlobalLoading(true);
        let msg = "Processing data...";
        if (type === 'schools') msg = "Ingesting and validating School Master records...";
        else if (type === 'visits') msg = "Analyzing and compiling Visit Report records...";
        else if (type === 'jhpms_lab') msg = "Ingesting JHPMS Lab Usage records...";
        else if (type === 'edustat') msg = "Ingesting Edustat records...";
        else if (type === 'manpower') msg = "Ingesting Instructor profiles...";
        setLoadingMessage(msg);

        const reader = new FileReader();
        reader.onload = evt => {
            // Delay parsing slightly to let the glassmorphic spinner overlay render in the UI
            setTimeout(async () => {
                try {
                    const wb = XLSX.read(evt.target.result, { type: 'binary' });
                    const sheetName = wb.SheetNames[0];
                    const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);

                    if (!data || data.length === 0) {
                        alert("Validation Error: The uploaded Excel file appears to contain no rows.");
                        e.target.value = '';
                        setGlobalLoading(false);
                        return;
                    }

                    // Column header presence validation check
                    const sampleRowKeys = Object.keys(data[0]).map(k => k.trim().toLowerCase().replace(/ /g, '_'));
                    const hasUdise = sampleRowKeys.some(k => k.includes('udise'));

                    if (type === 'schools') {
                        const hasSchoolName = sampleRowKeys.some(k => k.includes('school_name') || k.includes('schoolname') || k.includes('school'));
                        if (!hasUdise || !hasSchoolName) {
                            alert("Validation Mismatch!\n\nThis sheet does not match the School Master schema. It must contain at least 'udise_code' (or UDISE) and 'school_name' (or School Name) columns.");
                            e.target.value = '';
                            setGlobalLoading(false);
                            return;
                        }
                    } else if (type === 'visits') {
                        const hasVisitDate = sampleRowKeys.some(k => k.includes('visit_date') || k.includes('visitdate') || k.includes('date'));
                        if (!hasUdise || !hasVisitDate) {
                            alert("Validation Mismatch!\n\nThis sheet does not match the Visit Reports schema. It must contain at least 'udise_code' (or UDISE) and 'visit_date' (or Visit Date) columns.");
                            e.target.value = '';
                            setGlobalLoading(false);
                            return;
                        }
                    }

                    let normalized;
                    if (type === 'schools' || type === 'visits') {
                        normalized = data
                            .map(row => {
                                const newRow = normalizeRowHeaders(row);
                                if (newRow.visit_type) newRow.visit_type = newRow.visit_type.toString().trim();

                                if (type === 'visits') {
                                    const pd = parseDateRobust(newRow.visit_date);
                                    if (pd) {
                                        const year = pd.getFullYear();
                                        const month = String(pd.getMonth() + 1).padStart(2, '0');
                                        const day = String(pd.getDate()).padStart(2, '0');
                                        newRow.visit_date = `${year}-${month}-${day}T00:00:00`;
                                    }
                                }
                                return newRow;
                            })
                            .filter(r => type === 'schools' || r.visit_date);
                    } else if (type === 'jhpms_lab') {
                        let missingKeysAlert = false;
                        normalized = data.map(r => {
                            const cleanKeys = Object.keys(r).map(k => ({ orig: k, clean: k.toLowerCase().replace(/[^a-z0-9]/g, '') }));
                            const uKey = cleanKeys.find(k => k.clean.includes('udise'))?.orig;
                            const dKey = cleanKeys.find(k => k.clean === 'date' || k.clean.includes('date'))?.orig;
                            const labKey = cleanKeys.find(k => k.clean.includes('lab'))?.orig;
                            const subKey = cleanKeys.find(k => k.clean.includes('sub'))?.orig;
                            
                            if (!labKey || !subKey) missingKeysAlert = true;
                            
                            return { 
                                udise: uKey ? r[uKey] : '', 
                                date: dKey ? r[dKey] : '',
                                labType: labKey ? r[labKey] : '',
                                subject: subKey ? r[subKey] : ''
                            };
                        });
                        
                        if (missingKeysAlert) {
                            alert("Warning: The uploaded JHPMS file does not seem to have 'Lab Type' or 'Subject' columns. ICT/Smart classes might show as zero. Please check your Excel headers.");
                        }
                    } else if (type === 'edustat') {
                        normalized = data.map(r => {
                            const cleanKeys = Object.keys(r).map(k => ({ orig: k, clean: k.toLowerCase().replace(/[^a-z0-9]/g, '') }));
                            const uKey = cleanKeys.find(k => k.clean.includes('udise'))?.orig;
                            const devKey = cleanKeys.find(k => k.clean.includes('device'))?.orig;
                            const instKey = cleanKeys.find(k => k.clean.includes('installed'))?.orig;
                            const hrsKey = cleanKeys.find(k => k.clean.includes('totalusedhours'))?.orig;
                            return {
                                udise: uKey ? r[uKey] : '',
                                device: devKey ? r[devKey] : '',
                                installed: instKey ? r[instKey] : '',
                                'total used hours': hrsKey ? r[hrsKey] : ''
                            };
                        });
                    } else if (type === 'manpower') {
                        normalized = data.map(r => {
                            const cleanKeys = Object.keys(r).map(k => ({ orig: k, clean: k.toLowerCase().replace(/[^a-z0-9]/g, '') }));
                            const uKey = cleanKeys.find(k => k.clean.includes('udise'))?.orig;
                            const statKey = cleanKeys.find(k => k.clean === 'status')?.orig;
                            return { udise: uKey ? r[uKey] : '', status: statKey ? r[statKey] : '' };
                        });
                    } else {
                        normalized = data; 
                    }

                    if (type === 'schools') {
                        setSchools(normalized);
                        await set('schools', normalized);
                        alert(`Successfully uploaded ${normalized.length} schools master records!`);
                    } else if (type === 'visits') {
                        setVisits(normalized);
                        await set('visits', normalized);
                        alert(`Successfully uploaded ${normalized.length} visit reports!`);

                        // Auto-fill Dates Logic
                        if (normalized.length > 0) {
                            const dates = normalized
                                .map(v => new Date(v.visit_date))
                                .filter(d => !isNaN(d.getTime()))
                                .sort((a, b) => a - b);
                            if (dates.length > 0) {
                                setStartDate(dates[0].toISOString().split('T')[0]);
                                setEndDate(dates[dates.length - 1].toISOString().split('T')[0]);
                            }
                        }
                    } else if (type === 'jhpms_lab') {
                        setJhpmsLab(normalized);
                        await set('jhpms_lab', normalized);
                        alert(`Successfully uploaded ${normalized.length} JHPMS Lab usage records!`);
                    } else if (type === 'edustat') {
                        setEdustat(normalized);
                        await set('edustat', normalized);
                        alert(`Successfully uploaded ${normalized.length} Edustat records!`);
                    } else if (type === 'manpower') {
                        setManpower(normalized);
                        await set('manpower', normalized);
                        alert(`Successfully uploaded ${normalized.length} Instructor profiles!`);
                    }
                } catch (err) {
                    console.error(err);
                    alert("Excel Parse Error: " + err.message);
                } finally {
                    e.target.value = '';
                    setGlobalLoading(false);
                }
            }, 50);
        };
        reader.readAsBinaryString(file);
    };

    // Calculate Cascading Options
    const opts = useMemo(() => {
        const proj = [...new Set(schools.map(s => s.project_name))].filter(x => x).sort();
        const filteredByProj = schools.filter(s => selProjects.length === 0 || selProjects.includes(s.project_name));
        const dist = [...new Set(filteredByProj.map(s => s.district))].filter(x => x).sort();
        const filteredByDist = filteredByProj.filter(s => selDistricts.length === 0 || selDistricts.includes(s.district));
        const blocks = [...new Set(filteredByDist.map(s => s.block))].filter(x => x).sort();
        const filteredByBlocks = filteredByDist.filter(s => selBlocks.length === 0 || selBlocks.includes(s.block));
        const schoolNames = [...new Set(filteredByBlocks.map(s => s.school_name))].filter(x => x).sort();
        return { proj, dist, blocks, schoolNames };
    }, [schools, selProjects, selDistricts, selBlocks]);

    const renderContent = () => {
        if (activeTab === 'setup') {
            return (
                <Setup
                    onUpload={handleUpload}
                    onReset={async () => {
                        if (window.confirm("⚠️ WARNING: This will permanently wipe all local databases and visit logs from your browser cache.\n\nAre you absolutely sure you want to clear all data?")) {
                            await clearIDB();
                            localStorage.clear();
                            sessionStorage.clear();
                            setSchools([]);
                            setVisits([]);
                            setJhpmsLab([]);
                            setEdustat([]);
                            setManpower([]);
                            window.location.reload();
                        }
                    }}
                    status={{ 
                        schools: schools.length, 
                        visits: visits.length,
                        jhpms_lab: jhpmsLab.length,
                        edustat: edustat.length,
                        manpower: manpower.length
                    }}
                    onGoogleFetch={fetchFromGoogleSheet}
                    googleLoading={googleLoading}
                    onJhpmsSync={fetchJhpmsData}
                    jhpmsLoading={jhpmsLoading}
                />
            );
        }

        if (activeTab === 'dashboard') {
            if (!schools.length) {
                return (
                    <div className="p-10 text-center text-gray-500">
                        Please go to Setup and upload school master data first.
                    </div>
                );
            }
            return (
                <Dashboard
                    data={processedData}
                    onDrillDown={(t, d) => setDrillDownData({ title: t, data: d })}
                    startDate={startDate}
                    endDate={endDate}
                />
            );
        }

        if (activeTab === 'search') {
            return (
                <SearchView
                    schools={processedData.schools}
                    visits={visits}
                    startDate={startDate}
                    endDate={endDate}
                    onDrillDown={(t, d) => setDrillDownData({ title: t, data: d })}
                />
            );
        }

        if (activeTab === 'performance') return <PerformanceView data={processedData} />;
        if (activeTab === 'team-performance') return <FieldTeamPerformance schools={schools} visits={visits} jhpmsLab={jhpmsLab} edustat={edustat} manpower={manpower} startDate={startDate} endDate={endDate} selProjects={selProjects} selDistricts={selDistricts} selBlocks={selBlocks} />;
        if (activeTab === 'plan') return <PlanView data={processedData} />;
        if (activeTab === 'compliance') return <ComplianceView data={processedData} />;
        if (activeTab === 'reports') return <ReportsView data={processedData} />;

        return <div className="p-10 text-center text-gray-500">Module under development</div>;
    };

    // Password authentication gate
    if (!isAuthenticated) {
        const handleLogin = e => {
            e.preventDefault();
            if (password === 'Schoolnet@2026') {
                sessionStorage.setItem('snet_authenticated', 'true');
                setIsAuthenticated(true);
                setAuthError('');
            } else {
                setAuthError('Invalid credentials. Access Denied.');
            }
        };

        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-slate-900 via-teal-950 to-slate-900 p-4">
                <div className="w-full max-w-md p-8 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl flex flex-col items-center">
                    <div className="bg-teal-500/20 text-teal-300 p-4 rounded-full shadow-inner border border-teal-500/30 mb-4 animate-pulse">
                        <Icons.Lock className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-white text-center tracking-tight mb-1">
                        Access Restricted
                    </h2>
                    <p className="text-teal-200/60 text-xs text-center mb-6 uppercase tracking-wider font-semibold">
                        Schoolnet India Limited
                    </p>

                    <form onSubmit={handleLogin} className="w-full space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-teal-200 uppercase tracking-widest mb-1.5 ml-1">
                                Portal Access Password
                            </label>
                            <input
                                type="password"
                                placeholder="••••••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-slate-950/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-inner"
                                autoFocus
                            />
                        </div>

                        {authError && (
                            <div className="text-red-400 text-xs font-semibold text-center bg-red-950/30 border border-red-500/20 py-2 rounded-lg animate-bounce">
                                ⚠️ {authError}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white text-xs uppercase tracking-widest font-extrabold py-3.5 rounded-xl shadow-lg shadow-teal-500/20 hover:shadow-teal-600/30 transition-all active:scale-[0.98] duration-150"
                        >
                            Unlock Portal
                        </button>
                    </form>

                    <div className="mt-8 text-[10px] text-teal-200/40 text-center font-medium">
                        School Visit Tracking & Reporting Portal • v2.2
                    </div>
                </div>
            </div>
        );
    }

    if (isLoadingData) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-4"></div>
                <h2 className="text-xl font-bold text-teal-800 animate-pulse">Loading Application Data...</h2>
                <p className="text-sm text-gray-500 mt-2 text-center max-w-md">Please wait while we securely load your data from the offline IndexedDB storage. This is very fast but might take a second for large datasets.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row h-screen overflow-hidden text-gray-800 text-sm selection:bg-teal-100 selection:text-teal-900">
            {/* Global Glassmorphic Progress Loading Spinner Overlay */}
            {globalLoading && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[999] flex flex-col items-center justify-center text-white no-print">
                    <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4 shadow-lg shadow-teal-500/20"></div>
                    <p className="text-sm font-bold tracking-wide animate-pulse">{loadingMessage || 'Processing...'}</p>
                </div>
            )}

            {/* Drilldown Modal Overlay */}
            <DrillDownModal
                isOpen={!!drillDownData}
                onClose={() => setDrillDownData(null)}
                title={drillDownData?.title}
                data={drillDownData?.data || []}
            />

            {/* Mobile Sticky Top Header */}
            <div className="flex md:hidden items-center justify-between p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-white/5 sticky top-0 z-30 w-full no-print">
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 focus:outline-none p-1"
                >
                    <Icons.Menu className="w-6 h-6" />
                </button>
                <div className="text-center">
                    <div className="font-bold text-teal-800 dark:text-teal-400 tracking-tight">Schoolnet Visit Portal</div>
                </div>
                <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 focus:outline-none p-1"
                    title="Toggle Dark Mode"
                >
                    {darkMode ? <Icons.Sun className="w-5 h-5 text-amber-500" /> : <Icons.Moon className="w-5 h-5" />}
                </button>
            </div>

            {/* Responsive Sidebar Backdrop Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden animate-fade-in no-print"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar Left Navigation Panel */}
            <div className={`fixed md:relative top-0 bottom-0 left-0 h-[calc(100vh-24px)] md:h-auto w-64 portal-sidebar flex flex-col z-40 md:z-20 m-3 rounded-2xl border border-white/10 shadow-2xl shrink-0 transition-transform duration-300 md:translate-x-0 no-print ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+24px)]'}`}>
                <div className="p-5 border-b border-white/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 text-white p-2.5 rounded-lg shadow-inner backdrop-blur-md font-bold text-xs ring-1 ring-white/20">
                            PMS
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-white tracking-tight text-base shadow-black drop-shadow-md">
                                Visit Portal
                            </div>
                            <div className="text-[10px] text-teal-200 uppercase tracking-widest font-semibold">
                                Admin Console
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="md:hidden text-teal-200 hover:text-white focus:outline-none"
                    >
                        <Icons.Close className="w-5 h-5" />
                    </button>
                </div>
                <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
                    {[
                        { id: 'dashboard', l: 'Dashboard', i: Icons.Dashboard },
                        { id: 'search', l: 'Search & Insights', i: Icons.GlobalSearch },
                        { id: 'setup', l: 'System Setup', i: Icons.Setup },
                        { id: 'performance', l: 'Performance Matrix', i: Icons.Performance },
                        { id: 'team-performance', l: 'Field Team Performance', i: Icons.Performance },
                        { id: 'plan', l: 'Visit Planning', i: Icons.Plan },
                        { id: 'compliance', l: 'Compliance Check', i: Icons.Compliance },
                        { id: 'reports', l: 'Reports & Export', i: Icons.Reports }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => {
                                setActiveTab(t.id);
                                setIsSidebarOpen(false);
                            }}
                            className={`w-full nav-item group ${activeTab === t.id ? 'active' : ''}`}
                        >
                            <span
                                className={`mr-3 p-1.5 rounded-md transition-colors ${
                                    activeTab === t.id
                                        ? 'bg-teal-900/20 text-teal-800'
                                        : 'bg-white/10 text-teal-100 group-hover:bg-white/20'
                                }`}
                            >
                                <t.i className="w-4 h-4" />
                            </span>
                            {t.l}
                            {activeTab === t.id && (
                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse"></span>
                            )}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-white/10 text-[10px] text-teal-200/60 text-center font-medium flex flex-col items-center gap-3">
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-1.5 w-full text-xs font-semibold shadow-inner border border-white/10 transition"
                    >
                        {darkMode ? (
                            <>
                                <Icons.Sun className="w-4 h-4 text-amber-300" />
                                <span>Light Theme</span>
                            </>
                        ) : (
                            <>
                                <Icons.Moon className="w-4 h-4 text-teal-200" />
                                <span>Dark Theme</span>
                            </>
                        )}
                    </button>
                    <div>
                        v2.3 • Glass Edition
                        <br />
                        Made with ❤️ by Schoolnet
                    </div>
                </div>
            </div>

            {/* Main Center Tab Panel */}
            <div className="flex-1 flex flex-col overflow-hidden relative m-3 md:my-3 md:mr-3 md:ml-0 rounded-2xl bg-white/60 backdrop-blur-md border border-white/60 shadow-xl">
                {activeTab !== 'search' && activeTab !== 'setup' && (
                    <div className="portal-filter-bar z-10 mx-4 mt-4 rounded-xl border border-white shadow-sm flex flex-col gap-2 no-print">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-1">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <span className="w-1 h-6 bg-teal-600 rounded-full"></span>
                                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} View
                            </h2>
                            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                <button
                                    onClick={() => {
                                        setActiveTab('search');
                                        setIsSidebarOpen(false);
                                    }}
                                    className="bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-all hover:-translate-y-0.5 text-xs font-bold flex-1 sm:flex-none justify-center"
                                >
                                    <Icons.Search className="w-3.5 h-3.5 text-gray-500" /> Advanced Search
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-all hover:-translate-y-0.5 text-xs font-bold flex-1 sm:flex-none justify-center"
                                >
                                    <Icons.Print className="w-3.5 h-3.5 text-teal-600" /> Print / PDF
                                </button>
                                <button
                                    onClick={() => exportToExcel(processedData.schools, `Visit_Portal_Export_${activeTab}`)}
                                    className="bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 flex items-center gap-2 shadow-md shadow-teal-200 transition-all hover:-translate-y-0.5 text-xs font-bold flex-1 sm:flex-none justify-center"
                                >
                                    <Icons.Export className="w-3.5 h-3.5 text-teal-100" /> Export View
                                </button>
                            </div>
                        </div>
                        <div className="h-px bg-gray-200/80 w-full my-1"></div>
                        <div className="flex flex-wrap gap-3 items-end">
                            <div className="w-full sm:w-[calc(50%-6px)] md:w-44 text-left">
                                <span className="portal-label">Agency</span>
                                <select className="portal-input bg-gray-50 cursor-not-allowed opacity-70" disabled>
                                    <option>Schoolnet India Limited</option>
                                </select>
                            </div>
                            <div className="w-full sm:w-[calc(50%-6px)] md:w-36 text-left">
                                <MultiSelect
                                    label="Projects"
                                    options={opts.proj}
                                    value={selProjects}
                                    onChange={setSelProjects}
                                    placeholder="All Projects"
                                />
                            </div>
                            <div className="w-full sm:w-[calc(50%-6px)] md:w-36 text-left">
                                <MultiSelect
                                    label="District"
                                    options={opts.dist}
                                    value={selDistricts}
                                    onChange={setSelDistricts}
                                    placeholder="All Districts"
                                />
                            </div>
                            <div className="w-full sm:w-[calc(50%-6px)] md:w-36 text-left">
                                <MultiSelect
                                    label="Block"
                                    options={opts.blocks}
                                    value={selBlocks}
                                    onChange={setSelBlocks}
                                    placeholder="All Blocks"
                                />
                            </div>
                            <div className="w-full sm:w-[calc(50%-6px)] md:w-44 text-left">
                                <MultiSelect
                                    label="School"
                                    options={opts.schoolNames}
                                    value={selSchools}
                                    onChange={setSelSchools}
                                    placeholder="All Schools"
                                />
                            </div>
                            <div className="w-full lg:w-auto flex items-end gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200 lg:ml-auto">
                                <div className="text-left w-full sm:w-auto">
                                    <span className="portal-label text-[10px] mb-0.5 ml-1">Date Range</span>
                                    <div className="flex items-center gap-1 w-full">
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={e => setStartDate(e.target.value)}
                                            className="portal-input h-7 w-full sm:w-28 text-xs bg-white"
                                        />
                                        <span className="text-gray-400">-</span>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={e => setEndDate(e.target.value)}
                                            className="portal-input h-7 w-full sm:w-28 text-xs bg-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <main className="flex-1 overflow-y-auto p-4 scroll-smooth">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default App;
