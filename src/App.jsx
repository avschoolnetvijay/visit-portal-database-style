import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { get, set, clearIDB, hashPassword, supabase } from './supabaseClient';
import ExcelWorker from './excelWorker.js?worker';
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
import SchoolPerformance from './components/SchoolPerformance';
import ProfileCreation from './components/ProfileCreation';
import OverallAnalysis from './components/OverallAnalysis';
import Helpdesk from './components/Helpdesk';
import Chatbot from './components/Chatbot';
import MultiSelect from './components/MultiSelect';
import signatureLogo from './vijay_ray_signature.png';
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

    let rawTarget = 1;
    if (!newRow.monthly_target) {
        rawTarget = Number(newRow.monthly_visit_target) || 1;
    } else {
        rawTarget = Number(newRow.monthly_target) || 1;
    }
    newRow.monthly_target = Math.max(1, rawTarget);

    return newRow;
};

const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const num = Number(timeStr);
    if (!isNaN(num) && num > 0 && num < 1) {
        return num * 24 * 60;
    }
    const cleanStr = String(timeStr).trim().toUpperCase();
    const match = cleanStr.match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)?/);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = match[3] ? parseInt(match[3], 10) : 0;
    const ampm = match[4];
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes + (seconds / 60);
};

const deduplicateVisits = (visitList) => {
    if (!Array.isArray(visitList)) return [];
    const seen = new Set();
    const unique = [];
    visitList.forEach(v => {
        const idKey = Object.keys(v).find(k => k === 'id' || k.toLowerCase() === 'id');
        const idVal = idKey ? String(v[idKey] || '').trim() : null;

        if (idVal) {
            if (!seen.has(idVal)) {
                seen.add(idVal);
                unique.push(v);
            }
        } else {
            // Parse date robustly to standard string YYYY-MM-DD for deduplication
            let normDate = '';
            if (v.visit_date) {
                const pd = parseDateRobust(v.visit_date);
                if (pd && !isNaN(pd.getTime())) {
                    const y = pd.getFullYear();
                    const m = String(pd.getMonth() + 1).padStart(2, '0');
                    const d = String(pd.getDate()).padStart(2, '0');
                    normDate = `${y}-${m}-${d}`;
                } else {
                    normDate = String(v.visit_date).trim();
                }
            }
            const signature = `${v.udise_code || ''}_${normDate}_${v.visit_type || ''}_${v.visitor_name || ''}`;
            if (!seen.has(signature)) {
                seen.add(signature);
                unique.push(v);
            }
        }
    });
    return unique;
};

const mergeEdustat = (existing, newRows) => {
    const seen = new Set();
    const merged = [];
    const addRow = (r) => {
        const normDate = r.date ? String(r.date).split('T')[0] : '';
        const sig = `${r.udise || ''}_${r.serial || ''}_${normDate}_${Number(r.hours || 0).toFixed(4)}`;
        if (!seen.has(sig)) {
            seen.add(sig);
            merged.push(r);
        }
    };
    if (Array.isArray(existing)) existing.forEach(addRow);
    if (Array.isArray(newRows)) newRows.forEach(addRow);
    return merged;
};

const mergeJhpms = (existing, newRows) => {
    const seen = new Set();
    const merged = [];
    const addRow = (r) => {
        const u = r.udise || r.udise_code || '';
        const d = r.date || r.visit_date || '';
        const normDate = d ? String(d).split('T')[0] : '';
        const l = r.labType || r.lab_type || r.lab || '';
        const sub = r.subject || '';
        const t = r.subjectTeacher || r.subject_teacher || r.teacher || '';
        const inT = r.inTime || '';
        const outT = r.outTime || '';
        
        const sig = `${u}_${normDate}_${String(l).trim()}_${String(sub).trim()}_${String(t).trim()}_${String(inT).trim()}_${String(outT).trim()}`;
        if (!seen.has(sig)) {
            seen.add(sig);
            merged.push(r);
        }
    };
    if (Array.isArray(existing)) existing.forEach(addRow);
    if (Array.isArray(newRows)) newRows.forEach(addRow);
    return merged;
};

const mergeVisits = (existing, newRows) => {
    return deduplicateVisits([...(newRows || []), ...(existing || [])]);
};

const App = () => {
    const [transparentSignature, setTransparentSignature] = useState(null);

    useEffect(() => {
        const img = new Image();
        img.src = signatureLogo;
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const threshold = 55;
                
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i+1];
                    const b = data[i+2];
                    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
                    
                    if (luminance < threshold) {
                        data[i+3] = 0;
                    } else {
                        const factor = (luminance - threshold) / (255 - threshold);
                        data[i+3] = Math.round(factor * 255);
                        data[i] = 255;
                        data[i+1] = 255;
                        data[i+2] = 255;
                    }
                }
                
                ctx.putImageData(imageData, 0, 0);
                setTransparentSignature(canvas.toDataURL("image/png"));
            } catch (err) {
                console.warn("Canvas transparency processing failed, falling back to static asset:", err);
                setTransparentSignature(signatureLogo);
            }
        };
        img.onerror = (e) => {
            console.warn("Error loading signature logo image, falling back to static asset:", e);
            setTransparentSignature(signatureLogo);
        };
    }, []);

    const [activeTab, setActiveTab] = useState('setup');
    const [schools, setSchools] = useState([]);
    const [visits, setVisitsRaw] = useState([]);
    const setVisits = useCallback((val) => {
        setVisitsRaw(prev => {
            const list = typeof val === 'function' ? val(prev) : val;
            return deduplicateVisits(list);
        });
    }, []);
    const [jhpmsLab, setJhpmsLab] = useState([]);
    const [edustat, setEdustat] = useState([]);
    const [edustatMaster, setEdustatMaster] = useState([]);
    const [manpower, setManpower] = useState([]);
    
    // Temporary Session states (Hybrid Sandbox)
    const [tempVisits, setTempVisits] = useState(() => JSON.parse(sessionStorage.getItem('snet_temp_visits') || '[]'));
    const [tempJhpmsLab, setTempJhpmsLab] = useState(() => JSON.parse(sessionStorage.getItem('snet_temp_jhpms_lab') || '[]'));
    const [tempEdustat, setTempEdustat] = useState(() => JSON.parse(sessionStorage.getItem('snet_temp_edustat') || '[]'));

    // Combined states (Supabase + Session)
    const combinedVisits = useMemo(() => mergeVisits(visits, tempVisits), [visits, tempVisits]);
    const combinedJhpmsLab = useMemo(() => mergeJhpms(jhpmsLab, tempJhpmsLab), [jhpmsLab, tempJhpmsLab]);
    const combinedEdustat = useMemo(() => mergeEdustat(edustat, tempEdustat), [edustat, tempEdustat]);

    // Metadata states
    const [visitsMeta, setVisitsMeta] = useState(null);
    const [jhpmsLabMeta, setJhpmsLabMeta] = useState(null);
    const [edustatMeta, setEdustatMeta] = useState(null);

    // User Specific Custom Upload Overlays
    const [userVisits, setUserVisits] = useState([]);
    const [userJhpmsLab, setUserJhpmsLab] = useState([]);
    const [userEdustat, setUserEdustat] = useState([]);
    const [userVisitsMeta, setUserVisitsMeta] = useState(null);
    const [userJhpmsLabMeta, setUserJhpmsLabMeta] = useState(null);
    const [userEdustatMeta, setUserEdustatMeta] = useState(null);

    // Admin Baseline cache for merging (Standard User mode)
    const [baselineVisits, setBaselineVisits] = useState([]);
    const [baselineJhpmsLab, setBaselineJhpmsLab] = useState([]);
    const [baselineEdustat, setBaselineEdustat] = useState([]);

    const [drillDownData, setDrillDownData] = useState(null);

    const [isAuthenticated, setIsAuthenticated] = useState(
        () => sessionStorage.getItem('snet_authenticated') === 'true'
    );
    const [usernameInput, setUsernameInput] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [userRole, setUserRole] = useState(() => {
        const storedRole = localStorage.getItem('snet_user_role') || 'user';
        if (storedRole && storedRole.startsWith('{')) {
            try {
                const parsed = JSON.parse(storedRole);
                return parsed.privilege || 'user';
            } catch (e) {
                console.error("Error parsing stored role", e);
                return 'user';
            }
        }
        return storedRole;
    });
    const [userFullName, setUserFullName] = useState(() => localStorage.getItem('snet_full_name') || '');
    const [userDesignation, setUserDesignation] = useState(() => localStorage.getItem('snet_designation') || '');
    const [userPermissions, setUserPermissions] = useState(null);
    const [userAllowedDistricts, setUserAllowedDistricts] = useState([]);
    const [userAllowedProjects, setUserAllowedProjects] = useState([]);

    const handleLogout = () => {
        sessionStorage.removeItem('snet_authenticated');
        localStorage.removeItem('snet_username');
        localStorage.removeItem('snet_user_role');
        localStorage.removeItem('snet_profile_photo');
        localStorage.removeItem('snet_full_name');
        localStorage.removeItem('snet_designation');
        window.location.reload();
    };

    const [googleLoading, setGoogleLoading] = useState(false);
    const [jhpmsLoading, setJhpmsLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [globalLoading, setGlobalLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    const [startDate, setStartDate] = useState(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const [workingDays, setWorkingDays] = useState('');
    const [isWorkingDaysManual, setIsWorkingDaysManual] = useState(false);
    const [customExportHandler, setCustomExportHandler] = useState(null);

    const [selProjects, setSelProjects] = useState([]);
    const [selDistricts, setSelDistricts] = useState([]);
    const [selBlocks, setSelBlocks] = useState([]);
    const [selCCs, setSelCCs] = useState([]);
    const [selSchools, setSelSchools] = useState([]);

    const [profilePhoto, setProfilePhoto] = useState(() => localStorage.getItem('snet_profile_photo') || null);
    const [uploadAsSession, setUploadAsSession] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const fileInputRef = useRef(null);

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("File is too large! Please choose an image smaller than 2MB.");
                return;
            }
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64 = event.target.result;
                localStorage.setItem('snet_profile_photo', base64);
                setProfilePhoto(base64);
                try {
                    await set('profile_photo', base64);
                } catch (err) {
                    console.error("Error saving profile photo to Supabase:", err);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // Advanced dashboard filter states
    const [activeSources, setActiveSources] = useState(['jhpms', 'edustat', 'visits', 'manpower']);
    const [perfBands, setPerfBands] = useState([]);
    const [showExceptions, setShowExceptions] = useState(false);
    const [compareMode, setCompareMode] = useState(false);

    // CC Name-Mapping state
    const [ccNameMapping, setCcNameMapping] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('ccNameMapping') || '{}');
        } catch (e) {
            return {};
        }
    });

    const handleUpdateNameMapping = (newMapping) => {
        setCcNameMapping(newMapping);
        localStorage.setItem('ccNameMapping', JSON.stringify(newMapping));
    };

    // Local filter state inputs (for non-laggy, staged selections)
    const [localStartDate, setLocalStartDate] = useState(startDate);
    const [localEndDate, setLocalEndDate] = useState(endDate);
    const [localSelProjects, setLocalSelProjects] = useState(selProjects);
    const [localSelDistricts, setLocalSelDistricts] = useState(selDistricts);
    const [localSelBlocks, setLocalSelBlocks] = useState(selBlocks);
    const [localSelCCs, setLocalSelCCs] = useState([]);
    const [localSelSchools, setLocalSelSchools] = useState(selSchools);
    const [localWorkingDays, setLocalWorkingDays] = useState(workingDays);
    const [localIsWorkingDaysManual, setLocalIsWorkingDaysManual] = useState(isWorkingDaysManual);
    const [localActiveSources, setLocalActiveSources] = useState(['jhpms', 'edustat', 'visits', 'manpower']);
    const [localPerfBands, setLocalPerfBands] = useState([]);
    const [localShowExceptions, setLocalShowExceptions] = useState(false);
    const [localCompareMode, setLocalCompareMode] = useState(false);

    // Sidebar Collapsible Folder States
    const [expandedFolders, setExpandedFolders] = useState({
        'Home': true,
        'Lab Visit': false,
        'Performance Analysis': false,
        'Reports': false,
        'System Setup': false,
        'Profile Creation': false
    });

    const menuGroups = useMemo(() => {
        const rawGroups = [
            {
                title: 'Home',
                icon: Icons.Home,
                items: [
                    { id: 'dashboard', label: 'Dashboard', icon: Icons.Dashboard }
                ]
            },
            {
                title: 'Lab Visit',
                icon: Icons.Visit,
                items: [
                    { id: 'performance', label: 'Performance Matrix', icon: Icons.Performance },
                    { id: 'search', label: 'Search & Insights', icon: Icons.GlobalSearch },
                    { id: 'compliance', label: 'Compliance Check', icon: Icons.Compliance },
                    { id: 'plan', label: 'Visit Planning', icon: Icons.Plan }
                ]
            },
            {
                title: 'Performance Analysis',
                icon: Icons.Performance,
                items: [
                    { id: 'team-performance', label: 'Field Team Performance', icon: Icons.Performance },
                    { id: 'school-performance', label: 'School Performance', icon: Icons.Trophy }
                ]
            },
            {
                title: 'Reports',
                icon: Icons.Reports,
                items: [
                    { id: 'reports', label: 'Reports & Export', icon: Icons.Reports },
                    { id: 'overall-analysis', label: 'Overall Analysis', icon: Icons.ExecutiveClipboard }
                ]
            },
            {
                title: 'System Setup',
                icon: Icons.Setup,
                items: [
                    { id: 'setup', label: 'Data Upload', icon: Icons.Setup }
                ]
            },
            {
                title: 'Profile Creation',
                icon: Icons.Profile,
                items: [
                    { id: 'user-creation', label: 'User Creation', icon: Icons.Home },
                    { id: 'user-list', label: 'User List Directory', icon: Icons.Users },
                    { id: 'user-permissions', label: 'User Permissions', icon: Icons.Lock }
                ]
            }
        ];

        if (userRole === 'admin') {
            return rawGroups;
        }

        // Standard user filtering based on database permissions
        return rawGroups.map(group => {
            const filteredItems = group.items.filter(item => {
                // Profile creation submenus are strictly admin-only
                if (['profile-creation', 'user-creation', 'user-list', 'user-permissions'].includes(item.id)) return false;

                // Check custom permissions mapping
                if (userPermissions && userPermissions.menu) {
                    const perm = userPermissions.menu[item.id];
                    return perm && (perm.show || perm.view);
                }
                
                // Baseline fallback options before permissions sync
                return ['dashboard', 'performance', 'search', 'compliance', 'plan'].includes(item.id);
            });
            return { ...group, items: filteredItems };
        }).filter(group => group.items.length > 0);
    }, [userRole, userPermissions]);

    // Sync local selections with global filters when global values are updated (e.g. initial load)
    useEffect(() => {
        setLocalStartDate(startDate);
        setLocalEndDate(endDate);
        setLocalSelProjects(selProjects);
        setLocalSelDistricts(selDistricts);
        setLocalSelBlocks(selBlocks);
        setLocalSelCCs(selCCs);
        setLocalSelSchools(selSchools);
        setLocalWorkingDays(workingDays);
        setLocalIsWorkingDaysManual(isWorkingDaysManual);
        setLocalActiveSources(activeSources);
        setLocalPerfBands(perfBands);
        setLocalShowExceptions(showExceptions);
        setLocalCompareMode(compareMode);
    }, [startDate, endDate, selProjects, selDistricts, selBlocks, selCCs, selSchools, workingDays, isWorkingDaysManual, activeSources, perfBands, showExceptions, compareMode]);

    // Dynamic mount-time user profile sync (auto-populates/updates Name and Designation badges)
    useEffect(() => {
        if (isAuthenticated) {
            const u = localStorage.getItem('snet_username');
            if (u) {
                supabase
                    .from('users')
                    .select('*')
                    .eq('username', u)
                    .single()
                    .then(({ data }) => {
                        if (data) {
                            let resolvedRole = data.role;
                            let fullNameVal = data.full_name || '';
                            let designationVal = data.designation || '';

                            if (data.role && data.role.startsWith('{')) {
                                try {
                                    const parsed = JSON.parse(data.role);
                                    resolvedRole = parsed.privilege || 'user';
                                    fullNameVal = parsed.full_name || '';
                                    designationVal = parsed.designation || '';
                                } catch (e) {
                                    console.error("Error parsing role metadata on mount", e);
                                }
                            }
                            
                            localStorage.setItem('snet_full_name', fullNameVal || data.username);
                            localStorage.setItem('snet_designation', designationVal || (resolvedRole === 'admin' ? 'Administrator' : 'Standard User'));
                            
                            setUserFullName(fullNameVal || data.username);
                            setUserDesignation(designationVal || (resolvedRole === 'admin' ? 'Administrator' : 'Standard User'));
                        }
                    })
                    .catch(err => console.error("Error syncing profile on mount", err));
            }
        }
    }, [isAuthenticated]);

    // Cross-tab / cross-component storage listener to immediately sync sidebar profile photo or text changes
    useEffect(() => {
        const handleStorageChange = () => {
            setUserFullName(localStorage.getItem('snet_full_name') || '');
            setUserDesignation(localStorage.getItem('snet_designation') || '');
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Auto-expand folder when active tab changes programmatically
    useEffect(() => {
        const parentGroup = menuGroups.find(g => g.items.some(item => item.id === activeTab));
        if (parentGroup) {
            setExpandedFolders(prev => ({
                ...prev,
                [parentGroup.title]: true
            }));
        }
    }, [activeTab, menuGroups]);

    const handleApplyFilters = () => {
        setGlobalLoading(true);
        setLoadingMessage('Applying filters and recalculating performance...');
        setTimeout(() => {
            setStartDate(localStartDate);
            setEndDate(localEndDate);
            setSelProjects(localSelProjects);
            setSelDistricts(localSelDistricts);
            setSelBlocks(localSelBlocks);
            setSelCCs(localSelCCs);
            setSelSchools(localSelSchools);
            setWorkingDays(localWorkingDays);
            setIsWorkingDaysManual(localIsWorkingDaysManual);
            setActiveSources(localActiveSources);
            setPerfBands(localPerfBands);
            setShowExceptions(localShowExceptions);
            setCompareMode(localCompareMode);
            setGlobalLoading(false);
        }, 300);
    };

    // Pre-parse JHPMS dates once when dataset changes to prevent datepicker lag
    const parsedJhpmsDates = useMemo(() => {
        if (!jhpmsLab || !jhpmsLab.length) return [];
        
        const getValLocal = (row, keyMatch) => {
            const key = Object.keys(row).find(k => k.toLowerCase().includes(keyMatch.toLowerCase()));
            return key ? row[key] : null;
        };

        return jhpmsLab.map(l => {
            const udise = String(l.udise || getValLocal(l, 'udise') || '').trim();
            const rawDate = l.date || getValLocal(l, 'date');
            const d = parseDateRobust(rawDate);
            if (d && !isNaN(d.getTime())) {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                return { udise, dateStr: `${yyyy}-${mm}-${dd}` };
            }
            return null;
        }).filter(Boolean);
    }, [jhpmsLab]);

    // Calculate auto working days dynamically for unapplied local selections to keep UI reactive
    const localAutoWorkingDays = useMemo(() => {
        if (!parsedJhpmsDates.length) return 0;
        if (!localStartDate || !localEndDate || localStartDate.length !== 10 || localEndDate.length !== 10) return 0;

        let fSchools = schools || [];
        if (localSelProjects && localSelProjects.length) fSchools = fSchools.filter(s => localSelProjects.includes(s.project_name));
        if (localSelDistricts && localSelDistricts.length) fSchools = fSchools.filter(s => localSelDistricts.includes(s.district));
        if (localSelBlocks && localSelBlocks.length) fSchools = fSchools.filter(s => localSelBlocks.includes(s.block));
        if (localSelCCs && localSelCCs.length) {
            fSchools = fSchools.filter(s => {
                const name = s.visitor_name || '';
                const resolved = ccNameMapping[name] || name;
                return localSelCCs.includes(resolved) || localSelCCs.includes(name);
            });
        }
        if (localSelSchools && localSelSchools.length) fSchools = fSchools.filter(s => localSelSchools.includes(s.school_name || s.school));

        const allowedUdises = new Set(fSchools.map(s => String(s.udise_code || '').trim()));

        const uniqueDates = new Set();
        parsedJhpmsDates.forEach(l => {
            if (allowedUdises.size > 0 && !allowedUdises.has(l.udise)) return;
            if (l.dateStr >= localStartDate && l.dateStr <= localEndDate) {
                uniqueDates.add(l.dateStr);
            }
        });

        return uniqueDates.size;
    }, [parsedJhpmsDates, localStartDate, localEndDate, schools, localSelProjects, localSelDistricts, localSelBlocks, localSelCCs, ccNameMapping, localSelSchools]);

    // Keep localWorkingDays state in sync with localAutoWorkingDays if not overridden
    useEffect(() => {
        if (!localIsWorkingDaysManual) {
            const calculated = localAutoWorkingDays || Math.max(1, Math.ceil((new Date(localEndDate) - new Date(localStartDate)) / (1000 * 60 * 60 * 24)));
            setLocalWorkingDays(calculated);
        }
    }, [localAutoWorkingDays, localIsWorkingDaysManual, localStartDate, localEndDate]);

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

    // We use the direct states to ensure immediate updates across all sections upon Apply Filters

    // Dynamic Working Days auto-calculation based on maximum unique JHPMS dates per active school matching active filters
    const autoWorkingDays = useMemo(() => {
        if (!jhpmsLab.length) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const getVal = (row, keyMatch) => {
            const key = Object.keys(row).find(k => k.toLowerCase().includes(keyMatch.toLowerCase()));
            return key ? row[key] : null;
        };

        // 1. Gather UDISE codes for schools matching the currently selected active filters
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
        if (selSchools && selSchools.length) fSchools = fSchools.filter(s => selSchools.includes(s.school_name || s.school));

        const allowedUdises = new Set(fSchools.map(s => String(s.udise_code || '').trim()));

        // 2. Group unique JHPMS date strings across all active schools matching active filters
        const uniqueDates = new Set();
        jhpmsLab.forEach(l => {
            const udise = String(l.udise || getVal(l, 'udise') || '').trim();
            
            // Only include data for schools that match the active project/district/block/school filters
            if (allowedUdises.size > 0 && !allowedUdises.has(udise)) return;

            const rawDate = l.date || getVal(l, 'date');
            const d = parseDateRobust(rawDate);
            if (d && !isNaN(d.getTime())) {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const dateStr = `${yyyy}-${mm}-${dd}`;
                if (dateStr >= startDate && dateStr <= endDate) {
                    uniqueDates.add(dateStr);
                }
            }
        });

        return uniqueDates.size;
    }, [jhpmsLab, startDate, endDate, schools, selProjects, selDistricts, selBlocks, selCCs, ccNameMapping, selSchools]);

    // Synchronize workingDays state with auto-calculated value if not overridden
    useEffect(() => {
        if (!isWorkingDaysManual) {
            const calculated = autoWorkingDays || Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)));
            setWorkingDays(calculated);
        }
    }, [autoWorkingDays, isWorkingDaysManual, startDate, endDate]);

    // Reset manual override state when date range parameters change
    useEffect(() => {
        setIsWorkingDaysManual(false);
    }, [startDate, endDate]);

    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                // 1. Fetch user profile, role, custom permissions, and allowed districts/projects scope first
                const u = localStorage.getItem('snet_username');
                let userPerms = null;
                let userDists = [];
                let userProjs = [];
                let resolvedRole = userRole;
                let rawUserData = null;

                if (u) {
                    const { data, error } = await supabase
                        .from('users')
                        .select('*')
                        .eq('username', u)
                        .single();

                    if (!error && data) {
                        rawUserData = data;
                        resolvedRole = data.role;
                        let fullNameVal = data.full_name || '';
                        let designationVal = data.designation || '';
                        let permsData = data.permissions;
                        let distsData = data.assigned_district ? [data.assigned_district] : [];

                        if (data.role && data.role.startsWith('{')) {
                            try {
                                const parsed = JSON.parse(data.role);
                                resolvedRole = parsed.privilege || 'user';
                                fullNameVal = parsed.full_name || '';
                                designationVal = parsed.designation || '';
                                if (parsed.permissions) permsData = parsed.permissions;
                                if (parsed.allowed_districts) distsData = parsed.allowed_districts;
                            } catch (e) {
                                console.error("Error parsing role metadata during load", e);
                            }
                        }

                        // Parse permissions & extract allowed districts & projects
                        if (permsData) {
                            try {
                                userPerms = typeof permsData === 'string' ? JSON.parse(permsData) : permsData;
                                if (userPerms) {
                                    if (userPerms.allowed_districts) {
                                        userDists = userPerms.allowed_districts;
                                    }
                                    if (userPerms.allowed_projects) {
                                        userProjs = userPerms.allowed_projects;
                                    }
                                }
                            } catch (e) {
                                console.error("Error parsing permissions", e);
                            }
                        }

                        // Parse allowed districts fallback if not already loaded from permissions
                        if ((!userDists || userDists.length === 0) && distsData) {
                            try {
                                userDists = typeof distsData === 'string' ? JSON.parse(distsData) : distsData;
                                if (!Array.isArray(userDists)) {
                                    userDists = [distsData];
                                }
                            } catch (e) {
                                userDists = [distsData];
                            }
                        }

                        localStorage.setItem('snet_full_name', fullNameVal || data.username);
                        localStorage.setItem('snet_designation', designationVal || (resolvedRole === 'admin' ? 'Administrator' : 'Standard User'));
                        
                        setUserFullName(fullNameVal || data.username);
                        setUserDesignation(designationVal || (resolvedRole === 'admin' ? 'Administrator' : 'Standard User'));
                        setUserRole(resolvedRole);
                        setUserPermissions(userPerms);
                        setUserAllowedDistricts(userDists);
                        setUserAllowedProjects(userProjs);
                    }
                }

                // 2. Load baseline datasets from storage in parallel
                let s, v, jl, e, em, m, p, vMeta, jlMeta, eMeta;
                let userV = [], userJl = [], userE = [];
                let userVM = null, userJlM = null, userEM = null;

                if (resolvedRole === 'admin') {
                    const [resSchools, resVisits, resJhpms, resEdustat, resEdustatMaster, resManpower, resPhoto, resVMeta, resJlMeta, resEMeta] = await Promise.all([
                        get('schools'),
                        get('visits'),
                        get('jhpms_lab'),
                        get('edustat'),
                        get('edustat_master'),
                        get('manpower'),
                        get('profile_photo'),
                        get('visits_meta'),
                        get('jhpms_lab_meta'),
                        get('edustat_meta')
                    ]);
                    s = resSchools;
                    v = resVisits;
                    jl = resJhpms;
                    e = resEdustat;
                    em = resEdustatMaster;
                    m = resManpower;
                    p = resPhoto;
                    vMeta = resVMeta;
                    jlMeta = resJlMeta;
                    eMeta = resEMeta;
                } else {
                    const [
                        adminSchools,
                        adminManpower,
                        adminVisits,
                        adminJhpms,
                        adminEdustat,
                        adminVMeta,
                        adminJlMeta,
                        adminEMeta,
                        
                        customVisits,
                        customJhpms,
                        customEdustat,
                        customVMeta,
                        customJlMeta,
                        customEMeta,
                        
                        resPhoto,
                        resEdustatMaster
                    ] = await Promise.all([
                        get('schools', 'admin_'),
                        get('manpower', 'admin_'),
                        get('visits', 'admin_'),
                        get('jhpms_lab', 'admin_'),
                        get('edustat', 'admin_'),
                        get('visits_meta', 'admin_'),
                        get('jhpms_lab_meta', 'admin_'),
                        get('edustat_meta', 'admin_'),
                        
                        get('visits'),
                        get('jhpms_lab'),
                        get('edustat'),
                        get('visits_meta'),
                        get('jhpms_lab_meta'),
                        get('edustat_meta'),
                        
                        get('profile_photo'),
                        get('edustat_master')
                    ]);
                    s = adminSchools;
                    m = adminManpower;
                    em = resEdustatMaster;
                    p = resPhoto;
                    
                    v = mergeVisits(adminVisits, customVisits);
                    jl = mergeJhpms(adminJhpms, customJhpms);
                    e = mergeEdustat(adminEdustat, customEdustat);
                    
                    setBaselineVisits(adminVisits || []);
                    setBaselineJhpmsLab(adminJhpms || []);
                    setBaselineEdustat(adminEdustat || []);

                    userV = customVisits || [];
                    userJl = customJhpms || [];
                    userE = customEdustat || [];
                    
                    userVM = customVMeta;
                    userJlM = customJlMeta;
                    userEM = customEMeta;
                    
                    vMeta = adminVMeta;
                    jlMeta = adminJlMeta;
                    eMeta = adminEMeta;
                }

                if (p) {
                    localStorage.setItem('snet_profile_photo', p);
                    setProfilePhoto(p);
                } else {
                    localStorage.removeItem('snet_profile_photo');
                    setProfilePhoto(null);
                }
                
                // Initialize metadata states from session storage or cloud
                const sVisitsMeta = sessionStorage.getItem('snet_temp_visits_meta');
                if (sVisitsMeta) setVisitsMeta(JSON.parse(sVisitsMeta));
                else if (vMeta) setVisitsMeta(vMeta);

                const sJhpmsMeta = sessionStorage.getItem('snet_temp_jhpms_lab_meta');
                if (sJhpmsMeta) setJhpmsLabMeta(JSON.parse(sJhpmsMeta));
                else if (jlMeta) setJhpmsLabMeta(jlMeta);

                const sEdustatMeta = sessionStorage.getItem('snet_temp_edustat_meta');
                if (sEdustatMeta) setEdustatMeta(JSON.parse(sEdustatMeta));
                else if (eMeta) setEdustatMeta(eMeta);

                // 3. Enforce global district-level data gating (jurisdiction isolation)
                let filteredSchools = s || [];
                let filteredVisits = v || [];
                let filteredJhpms = jl || [];
                let filteredEdustat = e || [];
                let filteredManpower = m || [];
                
                let filteredUserVisits = userV || [];
                let filteredUserJhpms = userJl || [];
                let filteredUserEdustat = userE || [];

                if (resolvedRole !== 'admin') {
                    // Standard users must be restricted
                    const fallbackDistrict = rawUserData && rawUserData.assigned_district ? [rawUserData.assigned_district] : [];
                    const districtsToGate = (userDists && userDists.length > 0) 
                        ? userDists 
                        : (fallbackDistrict.length > 0 ? fallbackDistrict : ['__FORCE_EMPTY_DISTRICT__']);
                    
                    const allowedDistsSet = new Set(districtsToGate.map(d => d.toUpperCase().trim()));
                    
                    // Filter schools by allowed districts first
                    let gSchools = (s || []).filter(sch => sch.district && allowedDistsSet.has(sch.district.toUpperCase().trim()));
                    
                    // Also filter schools by allowed projects if configured
                    if (userProjs && userProjs.length > 0) {
                        const allowedProjsSet = new Set(userProjs.map(p => p.toUpperCase().trim()));
                        gSchools = gSchools.filter(sch => sch.project_name && allowedProjsSet.has(sch.project_name.toUpperCase().trim()));
                    }
                    
                    filteredSchools = gSchools;
                    const filteredUdise = new Set(filteredSchools.map(sch => String(sch.udise_code)));

                    // Filter visits
                    filteredVisits = (v || []).filter(vis => vis.udise_code && filteredUdise.has(String(vis.udise_code)));

                    // Filter JHPMS Lab
                    filteredJhpms = (jl || []).filter(j => {
                        const udise = j.udise || j.udise_code || '';
                        return udise && filteredUdise.has(String(udise));
                    });

                    // Filter Edustat
                    filteredEdustat = (e || []).filter(ed => {
                        const udise = ed.udise || ed.udise_code || '';
                        return udise && filteredUdise.has(String(udise));
                    });

                    // Filter Manpower
                    filteredManpower = (m || []).filter(mp => {
                        const udise = mp.udise || mp.udise_code || '';
                        return udise && filteredUdise.has(String(udise));
                    });

                    // Filter User Overlays for Setup Status Table
                    filteredUserVisits = (userV || []).filter(vis => vis.udise_code && filteredUdise.has(String(vis.udise_code)));
                    filteredUserJhpms = (userJl || []).filter(j => {
                        const udise = j.udise || j.udise_code || '';
                        return udise && filteredUdise.has(String(udise));
                    });
                    filteredUserEdustat = (userE || []).filter(ed => {
                        const udise = ed.udise || ed.udise_code || '';
                        return udise && filteredUdise.has(String(udise));
                    });
                }

                // Temporary storage conflict checks
                const checkConflictAndResolve = (type, cloudList, tempStorageKey, setTempState, setMetaState, cloudMeta) => {
                    const tempStr = sessionStorage.getItem(tempStorageKey);
                    if (!tempStr) return;
                    try {
                        const tempRows = JSON.parse(tempStr);
                        if (tempRows.length === 0) return;
                        
                        const tempDates = tempRows.map(r => r.date || r.visit_date).filter(Boolean).map(d => new Date(d).getTime());
                        if (tempDates.length === 0) return;
                        const minTempTime = Math.min(...tempDates);
                        
                        const cloudDates = (cloudList || []).map(r => r.date || r.visit_date).filter(Boolean).map(d => new Date(d).getTime());
                        if (cloudDates.length === 0) return;
                        const maxCloudTime = Math.max(...cloudDates);
                        
                        if (maxCloudTime >= minTempTime) {
                            sessionStorage.removeItem(tempStorageKey);
                            sessionStorage.removeItem(`${tempStorageKey}_meta`);
                            setTempState([]);
                            if (cloudMeta) setMetaState(cloudMeta);
                            else setMetaState(null);
                            
                            setTimeout(() => {
                                alert(`⚠️ Sync Warning: Admin has updated the central database for ${type}. Your local temporary session data has been cleared to prevent overlap conflict.`);
                            }, 1000);
                        }
                    } catch (err) {
                        console.error("Conflict checking error:", err);
                    }
                };

                checkConflictAndResolve('Visits', filteredVisits, 'snet_temp_visits', setTempVisits, setVisitsMeta, vMeta);
                checkConflictAndResolve('JHPMS Lab Logs', filteredJhpms, 'snet_temp_jhpms_lab', setTempJhpmsLab, setJhpmsLabMeta, jlMeta);
                checkConflictAndResolve('EduStat Daily Logs', filteredEdustat, 'snet_temp_edustat', setTempEdustat, setEdustatMeta, eMeta);

                if (filteredSchools.length > 0) setSchools(filteredSchools);
                if (filteredVisits.length > 0) {
                    const clean = deduplicateVisits(filteredVisits);
                    setVisits(clean);
                    if (clean.length < filteredVisits.length && resolvedRole === 'admin') {
                        await set('visits', clean);
                        console.log(`Self-healed visits: removed duplicate entries.`);
                    }
                }
                if (filteredJhpms.length > 0) {
                    const clean = mergeJhpms([], filteredJhpms);
                    setJhpmsLab(clean);
                    if (clean.length < filteredJhpms.length && resolvedRole === 'admin') {
                        await set('jhpms_lab', clean);
                        console.log(`Self-healed JHPMS logs: removed duplicate entries.`);
                    }
                }
                if (filteredEdustat.length > 0) setEdustat(filteredEdustat);
                if (em) setEdustatMaster(em);
                if (filteredManpower.length > 0) setManpower(filteredManpower);
                
                // Save user specific overlay states
                setUserVisits(filteredUserVisits);
                setUserJhpmsLab(filteredUserJhpms);
                setUserEdustat(filteredUserEdustat);
                if (userVM) setUserVisitsMeta(userVM);
                if (userJlM) setUserJhpmsLabMeta(userJlM);
                if (userEM) setUserEdustatMeta(userEM);
                
                if (filteredSchools.length > 0 && filteredVisits.length > 0) setActiveTab('dashboard');
                else setActiveTab('setup');
            } catch (err) {
                console.error("Error loading and gating datasets:", err);
            } finally {
                setIsLoadingData(false);
            }
        };
        loadData();
    }, []);

    // Primary Data Processing Engine
    const processedData = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const months = getMonthsInRange(start, end);

        let fSchools = schools;
        if (selProjects.length) fSchools = fSchools.filter(s => selProjects.includes(s.project_name));
        if (selDistricts.length) fSchools = fSchools.filter(s => selDistricts.includes(s.district));
        if (selBlocks.length) fSchools = fSchools.filter(s => selBlocks.includes(s.block));
        if (selCCs.length) {
            fSchools = fSchools.filter(s => {
                const name = s.visitor_name || '';
                const resolved = ccNameMapping[name] || name;
                return selCCs.includes(resolved) || selCCs.includes(name);
            });
        }
        if (selSchools.length) fSchools = fSchools.filter(s => selSchools.includes(s.school_name));

        const validUdise = new Set(fSchools.map(s => String(s.udise_code)));
        const fVisits = combinedVisits.filter(v => {
            const d = new Date(v.visit_date);
            if (isNaN(d.getTime())) return false;
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;
            return dateStr >= startDate && dateStr <= endDate && validUdise.has(String(v.udise_code));
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
                
                const type = (v.visit_type || '').toLowerCase();
                const isIct = type.includes('ict');
                
                // Only count ICT visits for target completion
                if (isIct) {
                    const dateStr = (v.visit_date || '').split('T')[0];
                    if (dateStr) {
                        m.visitDates.add(dateStr);
                    }
                }
                
                const dObj = new Date(v.visit_date);
                if (!isNaN(dObj.getTime())) {
                    if (!m.lastVisit || dObj > new Date(m.lastVisit)) m.lastVisit = v.visit_date;
                }

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
    }, [schools, combinedVisits, startDate, endDate, selProjects, selDistricts, selBlocks, selCCs, ccNameMapping, selSchools]);

    // Secure Auto-Fetch from Google Sheets (via Netlify proxy)
    const fetchFromGoogleSheet = async () => {
        if (userRole !== 'admin') {
            alert('Access Denied: Only Administrator can fetch baseline school master data.');
            return;
        }
        setGoogleLoading(true);
        try {
            // Fallback to production URL when running locally in development mode or offline
            const functionUrl =
                window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1' ||
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

            const cleanVisits = deduplicateVisits(normalized);
            const meta = {
                last_uploaded_at: new Date().toISOString(),
                last_uploaded_by: localStorage.getItem('snet_username') || 'admin',
                is_temp: false
            };

            if (userRole === 'admin') {
                setVisits(cleanVisits);
                await set('visits', cleanVisits);
                await set('visits_meta', meta);
                setVisitsMeta(meta);
            } else {
                const existing = await get('visits') || [];
                const merged = mergeVisits(existing, cleanVisits);
                await set('visits', merged);
                await set('visits_meta', meta);

                const gatedUserV = gateVisits(merged);
                setUserVisits(gatedUserV);
                setUserVisitsMeta(meta);

                const activeVisits = mergeVisits(baselineVisits, merged);
                const gatedActive = gateVisits(activeVisits);
                setVisits(gatedActive);
            }

            // Auto-fill Dates Logic
            if (cleanVisits.length > 0) {
                const dates = cleanVisits
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

    const getAllowedUdiseSet = useCallback(() => {
        let fSchools = schools || [];
        if (userRole === 'admin') {
            return new Set(fSchools.map(s => String(s.udise_code)));
        }
        
        if (userAllowedDistricts && userAllowedDistricts.length > 0) {
            const allowedDistsSet = new Set(userAllowedDistricts.map(d => d.toUpperCase().trim()));
            fSchools = fSchools.filter(s => s.district && allowedDistsSet.has(s.district.toUpperCase().trim()));
        }
        
        if (userAllowedProjects && userAllowedProjects.length > 0) {
            const allowedProjsSet = new Set(userAllowedProjects.map(p => p.toUpperCase().trim()));
            fSchools = fSchools.filter(s => s.project_name && allowedProjsSet.has(s.project_name.toUpperCase().trim()));
        }
        
        return new Set(fSchools.map(s => String(s.udise_code)));
    }, [schools, userRole, userAllowedDistricts, userAllowedProjects]);

    const gateVisits = useCallback((list) => {
        if (userRole === 'admin') return list;
        const allowedUdise = getAllowedUdiseSet();
        return (list || []).filter(vis => vis.udise_code && allowedUdise.has(String(vis.udise_code)));
    }, [userRole, getAllowedUdiseSet]);

    const gateJhpmsLab = useCallback((list) => {
        if (userRole === 'admin') return list;
        const allowedUdise = getAllowedUdiseSet();
        return (list || []).filter(j => {
            const udise = j.udise || j.udise_code || '';
            return udise && allowedUdise.has(String(udise));
        });
    }, [userRole, getAllowedUdiseSet]);

    const gateEdustat = useCallback((list) => {
        if (userRole === 'admin') return list;
        const allowedUdise = getAllowedUdiseSet();
        return (list || []).filter(ed => {
            const udise = ed.udise || ed.udise_code || '';
            return udise && allowedUdise.has(String(udise));
        });
    }, [userRole, getAllowedUdiseSet]);

    const updateLastUploadTime = async (username) => {
        try {
            const uploadTime = new Date().toISOString();
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .single();
            if (error || !data) return;

            const hasPermissionsCol = ('permissions' in data);
            if (hasPermissionsCol) {
                const currentPermissions = data.permissions || {};
                const updatedPermissions = {
                    ...currentPermissions,
                    last_upload: uploadTime
                };
                await supabase
                    .from('users')
                    .update({ permissions: updatedPermissions })
                    .eq('username', username);
            } else {
                let privilege = data.role;
                let parsedMeta = {};
                if (data.role && data.role.trim().startsWith('{')) {
                    try {
                        parsedMeta = JSON.parse(data.role);
                        privilege = parsedMeta.privilege || 'user';
                    } catch (err) {
                        console.error(err);
                    }
                }
                const updatedRoleJson = JSON.stringify({
                    ...parsedMeta,
                    privilege: privilege,
                    last_upload: uploadTime
                });
                await supabase
                    .from('users')
                    .update({ role: updatedRoleJson })
                    .eq('username', username);
            }
        } catch (err) {
            console.error("Error updating last upload time:", err);
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
            const worker = new ExcelWorker();
            worker.postMessage({ buffer: evt.target.result, type }, [evt.target.result]);

            worker.onmessage = async (workerEvent) => {
                const { success, json, error } = workerEvent.data;
                worker.terminate();

                if (!success) {
                    alert("Excel Parse Error: " + error);
                    e.target.value = '';
                    setGlobalLoading(false);
                    return;
                }

                const data = json;
                try {
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
                            const teacherKey = cleanKeys.find(k => k.clean.includes('subjectteacher'))?.orig;
                            const subKey = cleanKeys.find(k => k.orig !== teacherKey && k.clean.includes('sub'))?.orig;
                            const inTimeKey = cleanKeys.find(k => k.clean.includes('intime') || k.clean.includes('login'))?.orig;
                            const outTimeKey = cleanKeys.find(k => k.clean.includes('outtime') || k.clean.includes('logout'))?.orig;
                            
                            if (!labKey || !subKey) missingKeysAlert = true;
                            
                            const inTimeVal = inTimeKey ? String(r[inTimeKey]).trim() : '';
                            const outTimeVal = outTimeKey ? String(r[outTimeKey]).trim() : '';
                            
                            const totalHourKey = cleanKeys.find(k => k.clean.includes('totalhour') || k.clean.includes('usedhour') || k.clean.includes('duration') || (k.clean.includes('total') && k.clean.includes('hour')) || k.clean === 'hours')?.orig;
                            
                            let totalHourVal = '';
                            if (totalHourKey) {
                                totalHourVal = String(r[totalHourKey]).trim();
                            } else {
                                const inMin = parseTimeToMinutes(inTimeVal);
                                const outMin = parseTimeToMinutes(outTimeVal);
                                if (inMin !== null && outMin !== null && outMin >= inMin) {
                                    totalHourVal = ((outMin - inMin) / 60).toFixed(2);
                                }
                            }
                            
                            return { 
                                udise: uKey ? r[uKey] : '', 
                                date: dKey ? r[dKey] : '',
                                labType: labKey ? r[labKey] : '',
                                subject: subKey ? r[subKey] : '',
                                subjectTeacher: teacherKey ? String(r[teacherKey]).trim() : '',
                                inTime: inTimeVal,
                                outTime: outTimeVal,
                                totalHour: totalHourVal
                            };
                        });
                        
                        if (missingKeysAlert) {
                            alert("Warning: The uploaded JHPMS file does not seem to have 'Lab Type' or 'Subject' columns. ICT/Smart classes might show as zero. Please check your Excel headers.");
                        }
                    } else if (type === 'edustat_master') {
                        normalized = data.map(r => {
                            const cleanKeys = Object.keys(r).map(k => ({ orig: k, clean: k.toLowerCase().replace(/[^a-z0-9]/g, '') }));
                            const uKey = cleanKeys.find(k => k.clean.includes('udise'))?.orig;
                            const devKey = cleanKeys.find(k => k.clean === 'device')?.orig;
                            const serialKey = cleanKeys.find(k => k.clean.includes('serialnumber') || k.clean.includes('serial'))?.orig;
                            const instKey = cleanKeys.find(k => k.clean.includes('installed'))?.orig;
                            return {
                                udise: uKey ? String(r[uKey]).trim() : '',
                                device: devKey ? String(r[devKey]).trim() : '',
                                serial: serialKey ? String(r[serialKey]).trim() : '',
                                installed: instKey ? String(r[instKey]).trim() : ''
                            };
                        });
                    } else if (type === 'edustat') {
                        normalized = data.map(r => {
                            const cleanKeys = Object.keys(r).map(k => ({ orig: k, clean: k.toLowerCase().replace(/[^a-z0-9]/g, '') }));
                            const uKey = cleanKeys.find(k => k.clean.includes('udise'))?.orig;
                            const serialKey = cleanKeys.find(k => k.clean.includes('serialnumber') || k.clean.includes('serial'))?.orig;
                            const dateKey = cleanKeys.find(k => k.clean.includes('processdate') || k.clean.includes('date'))?.orig;
                            const hrsKey = cleanKeys.find(k => k.clean.includes('totalhour') || k.clean.includes('hours') || k.clean.includes('usedhour'))?.orig;
                            
                            const rawDate = dateKey ? r[dateKey] : '';
                            let parsedDate = '';
                            if (rawDate) {
                                const dObj = new Date(rawDate);
                                if (!isNaN(dObj.getTime())) {
                                    parsedDate = dObj.toISOString().split('T')[0];
                                } else {
                                    parsedDate = String(rawDate).trim();
                                }
                            }
                            
                            const rawHour = hrsKey ? r[hrsKey] : '0';
                            let parsedHours = 0;
                            if (typeof rawHour === 'number') {
                                parsedHours = rawHour;
                            } else if (rawHour) {
                                const parts = String(rawHour).split(':');
                                if (parts.length === 3) {
                                    const hrs = parseInt(parts[0], 10) || 0;
                                    const mins = parseInt(parts[1], 10) || 0;
                                    const secs = parseInt(parts[2], 10) || 0;
                                    parsedHours = hrs + (mins / 60) + (secs / 3600);
                                } else if (parts.length === 2) {
                                    const hrs = parseInt(parts[0], 10) || 0;
                                    const mins = parseInt(parts[1], 10) || 0;
                                    parsedHours = hrs + (mins / 60);
                                } else {
                                    const num = parseFloat(rawHour);
                                    parsedHours = isNaN(num) ? 0 : num;
                                }
                            }

                            return {
                                udise: uKey ? String(r[uKey]).trim() : '',
                                serial: serialKey ? String(r[serialKey]).trim() : '',
                                date: parsedDate,
                                hours: parsedHours
                            };
                        });
                    } else if (type === 'manpower') {
                        normalized = data.map(r => {
                            const cleanKeys = Object.keys(r).map(k => ({ orig: k, clean: k.toLowerCase().replace(/[^a-z0-9]/g, '') }));
                            const uKey = cleanKeys.find(k => k.clean.includes('udise'))?.orig;
                            const statKey = cleanKeys.find(k => k.clean === 'status')?.orig;
                            const nameKey = cleanKeys.find(k => k.clean.includes('instructorname') || (k.clean.includes('instructor') && k.clean.includes('name')))?.orig;
                            return { 
                                udise: uKey ? r[uKey] : '', 
                                status: statKey ? r[statKey] : '',
                                instructorName: nameKey ? String(r[nameKey]).trim() : ''
                            };
                        });
                    } else {
                        normalized = data; 
                    }

                    if (type === 'schools') {
                        if (userRole !== 'admin') {
                            alert("Access Denied: Only Administrator can upload School Master Data.");
                            return;
                        }
                        const originalLength = normalized.length;
                        const seenUdises = new Set();
                        const uniqueSchools = [];
                        normalized.forEach(s => {
                            const u = String(s.udise_code || s.udise || '').trim();
                            if (u && !seenUdises.has(u)) {
                                seenUdises.add(u);
                                uniqueSchools.push(s);
                            }
                        });
                        const skippedCount = originalLength - uniqueSchools.length;
                        const skippedMsg = skippedCount > 0 ? ` (${skippedCount} duplicate rows skipped)` : '';
                        setSchools(uniqueSchools);
                        await set('schools', uniqueSchools);
                        alert(`Successfully uploaded ${uniqueSchools.length} schools master records!${skippedMsg}`);
                    } else if (type === 'visits') {
                        const isTemp = uploadAsSession;
                        const meta = {
                            last_uploaded_at: new Date().toISOString(),
                            last_uploaded_by: localStorage.getItem('snet_username') || 'admin',
                            is_temp: isTemp
                        };
                        
                        let merged;
                        if (isTemp) {
                            merged = mergeVisits(tempVisits, normalized);
                            const skippedCount = (tempVisits.length + normalized.length) - merged.length;
                            const skippedMsg = skippedCount > 0 ? ` (${skippedCount} duplicate rows skipped)` : '';
                            setTempVisits(merged);
                            sessionStorage.setItem('snet_temp_visits', JSON.stringify(merged));
                            sessionStorage.setItem('snet_temp_visits_meta', JSON.stringify(meta));
                            if (userRole === 'admin') {
                                setVisitsMeta(meta);
                            } else {
                                setUserVisitsMeta(meta);
                            }
                            alert(`Successfully uploaded ${normalized.length} visit reports to temporary session!${skippedMsg}`);
                        } else {
                            const existing = await get('visits') || [];
                            merged = mergeVisits(existing, normalized);
                            const skippedCount = (existing.length + normalized.length) - merged.length;
                            const skippedMsg = skippedCount > 0 ? ` (${skippedCount} duplicate rows skipped)` : '';
                            await set('visits', merged);
                            await set('visits_meta', meta);
                            
                            if (userRole === 'admin') {
                                setVisits(merged);
                                setVisitsMeta(meta);
                                alert(`Successfully uploaded and merged ${normalized.length} visit reports to Central Cloud!${skippedMsg}`);
                            } else {
                                const gatedUserV = gateVisits(merged);
                                setUserVisits(gatedUserV);
                                setUserVisitsMeta(meta);

                                const activeVisits = mergeVisits(baselineVisits, merged);
                                const gatedActive = gateVisits(activeVisits);
                                setVisits(gatedActive);
                                alert(`Successfully uploaded and merged ${normalized.length} visit reports as your personal cloud overlay!${skippedMsg}`);
                            }
                        }

                        // Auto-fill Dates Logic using combined visits
                        const newCombined = isTemp 
                            ? mergeVisits(visits, merged) 
                            : (userRole === 'admin' 
                                ? mergeVisits(merged, tempVisits) 
                                : mergeVisits(gateVisits(mergeVisits(baselineVisits, merged)), tempVisits));
                        if (newCombined.length > 0) {
                            const dates = newCombined
                                .map(v => new Date(v.visit_date))
                                .filter(d => !isNaN(d.getTime()))
                                .sort((a, b) => a - b);
                            if (dates.length > 0) {
                                setStartDate(dates[0].toISOString().split('T')[0]);
                                setEndDate(dates[dates.length - 1].toISOString().split('T')[0]);
                            }
                        }
                    } else if (type === 'jhpms_lab') {
                        const isTemp = uploadAsSession;
                        const meta = {
                            last_uploaded_at: new Date().toISOString(),
                            last_uploaded_by: localStorage.getItem('snet_username') || 'admin',
                            is_temp: isTemp
                        };
                        
                        let merged;
                        if (isTemp) {
                            merged = mergeJhpms(tempJhpmsLab, normalized);
                            const skippedCount = (tempJhpmsLab.length + normalized.length) - merged.length;
                            const skippedMsg = skippedCount > 0 ? ` (${skippedCount} duplicate rows skipped)` : '';
                            setTempJhpmsLab(merged);
                            sessionStorage.setItem('snet_temp_jhpms_lab', JSON.stringify(merged));
                            sessionStorage.setItem('snet_temp_jhpms_lab_meta', JSON.stringify(meta));
                            if (userRole === 'admin') {
                                setJhpmsLabMeta(meta);
                            } else {
                                setUserJhpmsLabMeta(meta);
                            }
                            alert(`Successfully uploaded ${normalized.length} JHPMS Lab logs to temporary session!${skippedMsg}`);
                        } else {
                            const existing = await get('jhpms_lab') || [];
                            merged = mergeJhpms(existing, normalized);
                            const skippedCount = (existing.length + normalized.length) - merged.length;
                            const skippedMsg = skippedCount > 0 ? ` (${skippedCount} duplicate rows skipped)` : '';
                            await set('jhpms_lab', merged);
                            await set('jhpms_lab_meta', meta);

                            if (userRole === 'admin') {
                                setJhpmsLab(merged);
                                setJhpmsLabMeta(meta);
                                alert(`Successfully uploaded and merged ${normalized.length} JHPMS Lab logs to Central Cloud!${skippedMsg}`);
                            } else {
                                const gatedUserJl = gateJhpmsLab(merged);
                                setUserJhpmsLab(gatedUserJl);
                                setUserJhpmsLabMeta(meta);

                                const activeJhpms = mergeJhpms(baselineJhpmsLab, merged);
                                const gatedActive = gateJhpmsLab(activeJhpms);
                                setJhpmsLab(gatedActive);
                                alert(`Successfully uploaded and merged ${normalized.length} JHPMS Lab logs as your personal cloud overlay!${skippedMsg}`);
                            }
                        }
                    } else if (type === 'edustat') {
                        const isTemp = uploadAsSession;
                        const meta = {
                            last_uploaded_at: new Date().toISOString(),
                            last_uploaded_by: localStorage.getItem('snet_username') || 'admin',
                            is_temp: isTemp
                        };
                        
                        let merged;
                        if (isTemp) {
                            merged = mergeEdustat(tempEdustat, normalized);
                            const skippedCount = (tempEdustat.length + normalized.length) - merged.length;
                            const skippedMsg = skippedCount > 0 ? ` (${skippedCount} duplicate rows skipped)` : '';
                            setTempEdustat(merged);
                            sessionStorage.setItem('snet_temp_edustat', JSON.stringify(merged));
                            sessionStorage.setItem('snet_temp_edustat_meta', JSON.stringify(meta));
                            if (userRole === 'admin') {
                                setEdustatMeta(meta);
                            } else {
                                setUserEdustatMeta(meta);
                            }
                            alert(`Successfully uploaded ${normalized.length} EduStat daily logs to temporary session!${skippedMsg}`);
                        } else {
                            const existing = await get('edustat') || [];
                            merged = mergeEdustat(existing, normalized);
                            const skippedCount = (existing.length + normalized.length) - merged.length;
                            const skippedMsg = skippedCount > 0 ? ` (${skippedCount} duplicate rows skipped)` : '';
                            await set('edustat', merged);
                            await set('edustat_meta', meta);

                            if (userRole === 'admin') {
                                setEdustat(merged);
                                setEdustatMeta(meta);
                                alert(`Successfully uploaded and merged ${normalized.length} EduStat daily logs to Central Cloud!${skippedMsg}`);
                            } else {
                                const gatedUserE = gateEdustat(merged);
                                setUserEdustat(gatedUserE);
                                setUserEdustatMeta(meta);

                                const activeEdustat = mergeEdustat(baselineEdustat, merged);
                                const gatedActive = gateEdustat(activeEdustat);
                                setEdustat(gatedActive);
                                alert(`Successfully uploaded and merged ${normalized.length} EduStat daily logs as your personal cloud overlay!${skippedMsg}`);
                            }
                        }
                    } else if (type === 'edustat_master') {
                        if (userRole !== 'admin') {
                            alert("Access Denied: Only Administrator can upload EduStat Master Inventory.");
                            return;
                        }
                        const originalLength = normalized.length;
                        const seenSerials = new Set();
                        const uniqueEdustatMaster = [];
                        normalized.forEach(e => {
                            const key = `${e.udise}_${e.serial}`;
                            if (e.serial && !seenSerials.has(key)) {
                                seenSerials.add(key);
                                uniqueEdustatMaster.push(e);
                            }
                        });
                        const skippedCount = originalLength - uniqueEdustatMaster.length;
                        const skippedMsg = skippedCount > 0 ? ` (${skippedCount} duplicate UDISE+Serial rows skipped)` : '';
                        setEdustatMaster(uniqueEdustatMaster);
                        await set('edustat_master', uniqueEdustatMaster);
                        alert(`Successfully uploaded ${uniqueEdustatMaster.length} Edustat Master Inventory records!${skippedMsg}`);
                    } else if (type === 'manpower') {
                        if (userRole !== 'admin') {
                            alert("Access Denied: Only Administrator can upload Manpower Roster.");
                            return;
                        }
                        setManpower(normalized);
                        await set('manpower', normalized);
                        alert(`Successfully uploaded ${normalized.length} Instructor profiles!`);
                    }
                    // Track upload metadata in user database record
                    await updateLastUploadTime(localStorage.getItem('snet_username') || 'admin');
                } catch (err) {
                    console.error(err);
                    alert("Data Processing Error: " + err.message);
                } finally {
                    e.target.value = '';
                    setGlobalLoading(false);
                }
            };
            
            worker.onerror = (err) => {
                worker.terminate();
                alert("Worker Error: " + err.message);
                e.target.value = '';
                setGlobalLoading(false);
            };
        };
        reader.readAsArrayBuffer(file);
    };

    // Calculate Cascading Options
    const opts = useMemo(() => {
        const proj = [...new Set(schools.map(s => s.project_name))].filter(x => x).sort();
        const filteredByProj = schools.filter(s => localSelProjects.length === 0 || localSelProjects.includes(s.project_name));
        const dist = [...new Set(filteredByProj.map(s => s.district))].filter(x => x).sort();
        const filteredByDist = filteredByProj.filter(s => localSelDistricts.length === 0 || localSelDistricts.includes(s.district));
        const blocks = [...new Set(filteredByDist.map(s => s.block))].filter(x => x).sort();
        const filteredByBlocks = filteredByDist.filter(s => localSelBlocks.length === 0 || localSelBlocks.includes(s.block));
        const ccs = [...new Set(filteredByBlocks.map(s => s.visitor_name))].filter(x => x).sort();
        const filteredByCCs = filteredByBlocks.filter(s => localSelCCs.length === 0 || localSelCCs.includes(s.visitor_name));
        const schoolNames = [...new Set(filteredByCCs.map(s => s.school_name))].filter(x => x).sort();
        return { proj, dist, blocks, ccs, schoolNames };
    }, [schools, localSelProjects, localSelDistricts, localSelBlocks, localSelCCs]);

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
                            setEdustatMaster([]);
                            setManpower([]);
                            window.location.reload();
                        }
                    }}
                    status={userRole === 'admin' ? { 
                        schools: schools.length, 
                        visits: combinedVisits.length,
                        jhpms_lab: combinedJhpmsLab.length,
                        edustat: combinedEdustat.length,
                        edustat_master: edustatMaster.length,
                        manpower: manpower.length
                    } : {
                        schools: 0,
                        visits: mergeVisits(userVisits, tempVisits).length,
                        jhpms_lab: mergeJhpms(userJhpmsLab, tempJhpmsLab).length,
                        edustat: mergeEdustat(userEdustat, tempEdustat).length,
                        edustat_master: edustatMaster.length,
                        manpower: 0
                    }}
                    onGoogleFetch={fetchFromGoogleSheet}
                    googleLoading={googleLoading}
                    onJhpmsSync={fetchJhpmsData}
                    jhpmsLoading={jhpmsLoading}
                    userRole={userRole}
                    schools={userRole === 'admin' ? schools : []}
                    visits={userRole === 'admin' ? combinedVisits : mergeVisits(userVisits, tempVisits)}
                    jhpmsLab={userRole === 'admin' ? combinedJhpmsLab : mergeJhpms(userJhpmsLab, tempJhpmsLab)}
                    edustat={userRole === 'admin' ? combinedEdustat : mergeEdustat(userEdustat, tempEdustat)}
                    manpower={userRole === 'admin' ? manpower : []}
                    ccNameMapping={ccNameMapping}
                    onUpdateNameMapping={handleUpdateNameMapping}
                    uploadAsSession={uploadAsSession}
                    setUploadAsSession={setUploadAsSession}
                    visitsMeta={userRole === 'admin' ? visitsMeta : userVisitsMeta}
                    jhpmsLabMeta={userRole === 'admin' ? jhpmsLabMeta : userJhpmsLabMeta}
                    edustatMeta={userRole === 'admin' ? edustatMeta : userEdustatMeta}
                    activeVisits={combinedVisits}
                    activeJhpmsLab={combinedJhpmsLab}
                    activeEdustat={combinedEdustat}
                />
            );
        }

        if (activeTab === 'user-creation' || activeTab === 'user-list' || activeTab === 'user-permissions' || activeTab === 'user-logs' || activeTab === 'profile-creation') {
            const subTabMap = {
                'user-creation': 'create',
                'user-list': 'list',
                'user-permissions': 'permission',
                'user-logs': 'logs',
                'profile-creation': 'create'
            };
            const reverseMap = {
                'create': 'user-creation',
                'list': 'user-list',
                'permission': 'user-permissions',
                'logs': 'user-logs'
            };
            return (
                <ProfileCreation
                    userRole={userRole}
                    schools={schools}
                    defaultSubTab={subTabMap[activeTab] || 'create'}
                    onSubTabChange={(newSubTab) => setActiveTab(reverseMap[newSubTab])}
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
                    jhpmsLab={combinedJhpmsLab}
                    edustat={combinedEdustat}
                    manpower={manpower}
                    onDrillDown={(t, d) => setDrillDownData({ title: t, data: d })}
                    startDate={startDate}
                    endDate={endDate}
                    darkMode={darkMode}
                />
            );
        }

        if (activeTab === 'search') {
            return (
                <SearchView
                    schools={processedData.schools}
                    visits={combinedVisits}
                    startDate={startDate}
                    endDate={endDate}
                    onDrillDown={(t, d) => setDrillDownData({ title: t, data: d })}
                    darkMode={darkMode}
                />
            );
        }

        if (activeTab === 'performance') return <PerformanceView data={processedData} />;
        if (activeTab === 'team-performance') return <FieldTeamPerformance schools={schools} visits={combinedVisits} jhpmsLab={combinedJhpmsLab} edustat={combinedEdustat} edustatMaster={edustatMaster} manpower={manpower} startDate={startDate} endDate={endDate} selProjects={selProjects} selDistricts={selDistricts} selBlocks={selBlocks} selCCs={selCCs} ccNameMapping={ccNameMapping} workingDays={workingDays} onRegisterExport={setCustomExportHandler} userPermissions={userPermissions} />;
        if (activeTab === 'school-performance') return <SchoolPerformance schools={schools} jhpmsLab={combinedJhpmsLab} edustat={combinedEdustat} edustatMaster={edustatMaster} manpower={manpower} startDate={startDate} endDate={endDate} selProjects={selProjects} selDistricts={selDistricts} selBlocks={selBlocks} selCCs={selCCs} ccNameMapping={ccNameMapping} workingDays={workingDays} onRegisterExport={setCustomExportHandler} userPermissions={userPermissions} />;
        if (activeTab === 'plan') return <PlanView data={processedData} />;
        if (activeTab === 'compliance') return <ComplianceView data={processedData} />;
        if (activeTab === 'reports') return <ReportsView data={processedData} />;
        if (activeTab === 'overall-analysis') return (
            <OverallAnalysis 
                schools={schools} 
                visits={combinedVisits} 
                jhpmsLab={combinedJhpmsLab} 
                edustat={combinedEdustat} 
                edustatMaster={edustatMaster} 
                manpower={manpower} 
                startDate={startDate} 
                endDate={endDate} 
                selProjects={selProjects} 
                selDistricts={selDistricts} 
                selBlocks={selBlocks} 
                selCCs={selCCs}
                workingDays={workingDays} 
                activeSources={activeSources}
                perfBands={perfBands}
                showExceptions={showExceptions}
                compareMode={compareMode}
                setLocalCompareMode={setLocalCompareMode}
                handleApplyFilters={handleApplyFilters}
                ccNameMapping={ccNameMapping}
                darkMode={darkMode}
                onDrillDown={(t, d) => setDrillDownData({ title: t, data: d })}
                userPermissions={userPermissions}
            />
        );

        if (activeTab === 'chatbot') {
            return (
                <Chatbot
                    schools={schools}
                    visits={combinedVisits}
                    jhpmsLab={combinedJhpmsLab}
                    edustat={combinedEdustat}
                    manpower={manpower}
                    startDate={startDate}
                    endDate={endDate}
                    selProjects={selProjects}
                    selDistricts={selDistricts}
                    selBlocks={selBlocks}
                    selCCs={selCCs}
                    ccNameMapping={ccNameMapping}
                    workingDays={workingDays}
                    darkMode={darkMode}
                />
            );
        }

        if (activeTab === 'helpdesk') {
            return (
                <Helpdesk
                    darkMode={darkMode}
                />
            );
        }

        return <div className="p-10 text-center text-gray-500">Module under development</div>;
    };

    // Secure Database-driven Authentication Gate
    if (!isAuthenticated) {
        const handleLogin = async e => {
            e.preventDefault();
            const u = usernameInput.trim().toLowerCase();
            const p = password;
            if (!u || !p) {
                setAuthError('Please enter both User ID and Password.');
                return;
            }
            setGlobalLoading(true);
            setLoadingMessage('Authenticating...');
            try {
                // Cryptographically hash password client-side using SHA-256
                const hash = await hashPassword(u, p);
                
                // Fetch credentials from the public users table in Supabase
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('username', u)
                    .eq('password_hash', hash)
                    .single();

                if (error || !data) {
                    setAuthError('Invalid User ID or Password.');
                    setGlobalLoading(false);
                    return;
                }

                // Store secure session data
                sessionStorage.setItem('snet_authenticated', 'true');
                localStorage.setItem('snet_username', data.username);
                localStorage.setItem('snet_user_role', data.role);
                
                let resolvedRole = data.role;
                let fullNameVal = data.full_name || '';
                let designationVal = data.designation || '';

                if (data.role && data.role.startsWith('{')) {
                    try {
                        const parsed = JSON.parse(data.role);
                        resolvedRole = parsed.privilege || 'user';
                        fullNameVal = parsed.full_name || '';
                        designationVal = parsed.designation || '';
                    } catch (e) {
                        console.error("Error parsing login role JSON", e);
                    }
                }
                
                localStorage.setItem('snet_full_name', fullNameVal || data.username);
                localStorage.setItem('snet_designation', designationVal || (resolvedRole === 'admin' ? 'Administrator' : 'Standard User'));
                
                setUserFullName(fullNameVal || data.username);
                setUserDesignation(designationVal || (resolvedRole === 'admin' ? 'Administrator' : 'Standard User'));
                setUserRole(resolvedRole);
                setIsAuthenticated(true);
                setAuthError('');
                
                // Update last_login in Supabase
                const loginTime = new Date().toISOString();
                const hasPermissionsCol = ('permissions' in data);
                if (hasPermissionsCol) {
                    const currentPermissions = data.permissions || {};
                    const updatedPermissions = {
                        ...currentPermissions,
                        last_login: loginTime
                    };
                    await supabase
                        .from('users')
                        .update({ permissions: updatedPermissions })
                        .eq('username', data.username);
                } else {
                    let privilege = data.role;
                    let parsedMeta = {};
                    if (data.role && data.role.trim().startsWith('{')) {
                        try {
                            parsedMeta = JSON.parse(data.role);
                            privilege = parsedMeta.privilege || 'user';
                        } catch (err) {
                            console.error(err);
                        }
                    }
                    const updatedRoleJson = JSON.stringify({
                        ...parsedMeta,
                        privilege: privilege,
                        last_login: loginTime
                    });
                    await supabase
                        .from('users')
                        .update({ role: updatedRoleJson })
                        .eq('username', data.username);
                }

                // Refresh to reload all user namespaces
                window.location.reload();
            } catch (err) {
                console.error("Login authentication error:", err);
                setAuthError('Connection error. Please try again.');
            } finally {
                setGlobalLoading(false);
            }
        };

        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-slate-900 via-teal-950 to-slate-900 p-4">
                <div className="w-full max-w-md p-8 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl flex flex-col items-center">
                    <div className="bg-teal-500/20 text-teal-300 p-4 rounded-full shadow-inner border border-teal-500/30 mb-4 animate-pulse">
                        <Icons.Lock className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-white text-center tracking-tight mb-1">
                        Secure Access Portal
                    </h2>
                    <p className="text-teal-200/60 text-xs text-center mb-6 uppercase tracking-wider font-semibold">
                        Schoolnet India Limited
                    </p>

                    <form onSubmit={handleLogin} className="w-full space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-teal-200 uppercase tracking-widest mb-1.5 ml-1">
                                User ID / Username
                            </label>
                            <input
                                type="text"
                                placeholder="Enter Username"
                                value={usernameInput}
                                onChange={e => setUsernameInput(e.target.value)}
                                className="w-full bg-slate-950/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-inner"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-teal-200 uppercase tracking-widest mb-1.5 ml-1">
                                Secure Password
                            </label>
                            <input
                                type="password"
                                placeholder="••••••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-slate-950/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-inner"
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
                            Sign In
                        </button>
                    </form>

                    <div className="mt-8 text-[10px] text-teal-200/40 text-center font-medium">
                        School Visit Tracking & Reporting Portal • v2.4 (Cloud Managed)
                    </div>
                </div>
            </div>
        );
    }

    if (isLoadingData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 flex flex-col items-center justify-center p-4">
                <div className="relative w-28 h-28 flex items-center justify-center">
                    {/* Outer glowing ring */}
                    <div className="absolute inset-0 rounded-full border border-teal-500/20 animate-pulse"></div>
                    {/* Middle rotating dashed ring */}
                    <div className="absolute w-24 h-24 rounded-full border-2 border-dashed border-teal-400/40 animate-[spin_8s_linear_infinite]"></div>
                    {/* Inner rotating solid ring */}
                    <div className="absolute w-16 h-16 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
                    {/* Core glowing orb */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-400 to-emerald-400 shadow-[0_0_20px_rgba(20,184,166,0.6)] animate-ping opacity-75"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row h-screen overflow-hidden text-gray-800 text-sm selection:bg-teal-100 selection:text-teal-900">
            {/* Global Glassmorphic Progress Loading Spinner Overlay */}
            {globalLoading && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[999] flex flex-col items-center justify-center p-4 text-white no-print">
                    <div className="relative flex flex-col items-center justify-center gap-5 bg-slate-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">
                        <div className="relative w-24 h-24 flex items-center justify-center">
                            {/* Glowing backdrop blur */}
                            <div className="absolute w-20 h-20 bg-teal-500/20 rounded-full blur-xl animate-pulse"></div>
                            {/* Elegant gradient arc spinner */}
                            <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-purple-500 border-r-teal-500 animate-spin"></div>
                            {/* Core pulsing dot */}
                            <div className="w-8 h-8 rounded-full bg-slate-950 flex items-center justify-center">
                                <div className="w-3 h-3 rounded-full bg-teal-400 animate-ping"></div>
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-1.5">
                            <h3 className="text-xs font-black text-white tracking-widest uppercase opacity-85">Calculating</h3>
                            <p className="text-xs font-semibold text-teal-300 animate-pulse text-center max-w-[200px]">{loadingMessage || 'Processing data...'}</p>
                        </div>
                    </div>
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
            <div className={`fixed md:relative top-0 bottom-0 left-0 h-screen w-64 portal-sidebar flex flex-col z-40 md:z-20 border-r border-white/10 shrink-0 transition-transform duration-300 md:translate-x-0 no-print ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-5 border-b border-white/10 flex flex-col items-center text-center relative select-none">
                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="absolute top-4 right-4 md:hidden text-teal-200 hover:text-white focus:outline-none"
                    >
                        <Icons.Close className="w-5 h-5" />
                    </button>

                    {/* Coordinator Profile Photo with Upload/Delete Option Dropdown */}
                    <div className="relative w-14 h-14 mb-4 select-none shrink-0">
                        {/* Interactive Avatar Container */}
                        <div 
                            onClick={() => setShowProfileMenu(prev => !prev)}
                            className="relative group w-14 h-14 rounded-md border border-white/20 shadow-md cursor-pointer transition-all hover:border-teal-400 duration-200 overflow-hidden"
                            title="Click to change or delete photo"
                        >
                            {profilePhoto ? (
                                <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover rounded-md" />
                            ) : (
                                <svg viewBox="0 0 100 100" className="w-full h-full object-cover rounded-md">
                                    {/* Background */}
                                    <rect width="100" height="100" fill="#2a8b87" />
                                    {/* Hair back */}
                                    <circle cx="50" cy="35" r="22" fill="#111111" />
                                    {/* Face */}
                                    <circle cx="50" cy="40" r="18" fill="#e5a07d" />
                                    {/* Hair front */}
                                    <path d="M32 30 Q50 15 68 30 Q50 24 32 30 Z" fill="#111111" />
                                    <rect x="32" y="28" width="36" height="8" fill="#111111" />
                                    {/* Eyes */}
                                    <circle cx="43" cy="38" r="2" fill="#111111" />
                                    <circle cx="57" cy="38" r="2" fill="#111111" />
                                    {/* Mouth */}
                                    <path d="M46 48 Q50 51 54 48" stroke="#8b4a36" strokeWidth="2" fill="none" strokeLinecap="round" />
                                    {/* Neck */}
                                    <rect x="46" y="55" width="8" height="12" fill="#e5a07d" />
                                    {/* Pink Shirt */}
                                    <path d="M20 80 Q50 62 80 80 L80 100 L20 100 Z" fill="#e05a8b" />
                                    {/* Collar */}
                                    <path d="M44 65 L50 78 L56 65 Z" fill="#b03a6b" />
                                    <path d="M35 68 L44 65 L46 72 Z" fill="#f0709b" />
                                    <path d="M65 68 L56 65 L54 72 Z" fill="#f0709b" />
                                </svg>
                            )}
                            
                            {/* Hover Overlay with Camera Icon */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-200 rounded-md text-white">
                                <svg className="w-5 h-5 mb-0.5 text-teal-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                <span className="text-[9px] font-semibold tracking-wider uppercase text-teal-100">Edit</span>
                            </div>
                        </div>

                        {/* Hidden File Input */}
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handlePhotoChange} 
                        />

                        {/* Transparent Backdrop to close menu when clicking outside */}
                        {showProfileMenu && (
                            <div 
                                className="fixed inset-0 z-40 cursor-default" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowProfileMenu(false);
                                }}
                            />
                        )}

                        {/* Premium Dropdown Option Menu */}
                        {showProfileMenu && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-36 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-lg p-1.5 shadow-2xl z-50 text-left animate-in fade-in slide-in-from-top-2 duration-150">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fileInputRef.current.click();
                                        setShowProfileMenu(false);
                                    }}
                                    className="w-full text-left px-2 py-1.5 rounded text-xs font-medium text-slate-200 hover:bg-teal-600/35 hover:text-white transition-colors flex items-center space-x-2 cursor-pointer"
                                >
                                    <svg className="w-3.5 h-3.5 text-teal-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span>Change Photo</span>
                                </button>
                                
                                {profilePhoto && (
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            setShowProfileMenu(false);
                                            localStorage.removeItem('snet_profile_photo');
                                            setProfilePhoto(null);
                                            try {
                                                await set('profile_photo', null);
                                            } catch (err) {
                                                console.error("Error clearing profile photo from Supabase:", err);
                                            }
                                        }}
                                        className="w-full text-left px-2 py-1.5 rounded text-xs font-medium text-rose-300 hover:bg-rose-600/25 hover:text-rose-100 transition-colors flex items-center space-x-2 cursor-pointer mt-0.5"
                                    >
                                        <svg className="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        <span>Delete Photo</span>
                                    </button>
                                )}

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowProfileMenu(false);
                                    }}
                                    className="w-full text-left px-2 py-1 rounded text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors flex items-center space-x-2 cursor-pointer mt-1 border-t border-white/5 pt-1.5"
                                >
                                    <span>Cancel</span>
                                </button>
                            </div>
                        )}
                    </div>
                    {/* Logged-in User Profile Name & Designation Badge */}
                    <div className="mt-3 select-none flex flex-col items-center">
                        <div className="font-extrabold text-white text-xs tracking-wide truncate max-w-[200px]" title={userFullName || localStorage.getItem('snet_username')}>
                            {userFullName || localStorage.getItem('snet_username') || 'Portal Member'}
                        </div>
                        <div className="text-[9px] text-teal-300 font-extrabold mt-1 truncate max-w-[200px] uppercase tracking-widest bg-teal-500/10 border border-teal-500/20 px-2.5 py-0.5 rounded-full" title={userDesignation}>
                            {userDesignation || 'User'}
                        </div>
                    </div>
                </div>
                <nav className="flex-1 overflow-y-auto py-2 space-y-1.5 px-3 text-left select-none">
                    <div className="space-y-1">
                        {menuGroups.map(g => {
                            if (g.items.length === 0) return null;
                            const isExpanded = !!expandedFolders[g.title];
                            
                            return (
                                <div key={g.title} className="space-y-0.5">
                                    {/* Collapsible Folder Header */}
                                    <button
                                        onClick={() => {
                                            setExpandedFolders(prev => ({
                                                ...prev,
                                                [g.title]: !prev[g.title]
                                            }));
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-none text-[14.5px] font-bold text-white hover:bg-white/5 transition duration-150 font-sans"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span className="p-0.5 rounded text-white shrink-0">
                                                <g.icon className="w-5 h-5" />
                                            </span>
                                            <span>{g.title}</span>
                                        </div>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className={`w-4 h-4 text-white transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={3}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {/* Collapsible Submenu list */}
                                    <div
                                        className={`pl-3 space-y-0.5 overflow-hidden transition-all duration-300 ${
                                            isExpanded ? 'max-h-80 opacity-100 py-0.5' : 'max-h-0 opacity-0 pointer-events-none'
                                        }`}
                                    >
                                        {g.items.map(t => {
                                            const isActive = activeTab === t.id;
                                            return (
                                                <button
                                                    key={t.id}
                                                    onClick={() => {
                                                        setActiveTab(t.id);
                                                        setIsSidebarOpen(false);
                                                    }}
                                                    className={`w-full flex items-center py-2 pl-[42px] pr-3 rounded-none text-[12.5px] font-semibold transition font-sans ${
                                                        isActive
                                                            ? 'bg-black/15 text-white font-extrabold border-l-4 border-white'
                                                            : 'text-white hover:text-white hover:bg-white/5'
                                                    }`}
                                                >
                                                    <span>{t.label}</span>
                                                    {isActive && (
                                                        <span className="ml-auto w-1 h-1 rounded-full bg-white animate-pulse"></span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}

                        {/* AI Analytics Copilot Chatbot */}
                        <button
                            onClick={() => setActiveTab('chatbot')}
                            className={`w-full flex items-center justify-between py-2 px-3 rounded-none text-[14.5px] font-bold text-white hover:bg-white/5 transition duration-150 font-sans ${
                                activeTab === 'chatbot' ? 'bg-black/15 text-white font-extrabold border-l-4 border-white' : ''
                            }`}
                        >
                            <div className="flex items-center gap-2.5">
                                <span className="p-0.5 rounded text-white shrink-0">
                                    <Icons.Robot className="w-5 h-5" />
                                </span>
                                <span>AI Copilot Chatbot</span>
                            </div>
                        </button>

                        {/* Helpdesk Menu Item */}
                        <button
                            onClick={() => setActiveTab('helpdesk')}
                            className={`w-full flex items-center justify-between py-2 px-3 rounded-none text-[14.5px] font-bold text-white hover:bg-white/5 transition duration-150 font-sans ${
                                activeTab === 'helpdesk' ? 'bg-black/15 text-white font-extrabold border-l-4 border-white' : ''
                            }`}
                        >
                            <div className="flex items-center gap-2.5">
                                <span className="p-0.5 rounded text-white shrink-0">
                                    <Icons.Help className="w-5 h-5" />
                                </span>
                                <span>Helpdesk</span>
                            </div>
                        </button>

                        {/* Integrated Premium Logout Button inside sidebar nav list */}
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-between py-2 px-3 rounded-none text-[14.5px] font-bold text-white hover:bg-white/5 transition duration-150 font-sans"
                            title="Sign Out of Portal"
                        >
                            <div className="flex items-center gap-2.5">
                                <span className="p-0.5 rounded text-white shrink-0">
                                    <Icons.Close className="w-5 h-5" />
                                </span>
                                <span>Logout</span>
                            </div>
                        </button>
                    </div>
                </nav>
                <div className="p-4 border-t border-white/10 text-center flex flex-col items-center gap-3 mt-auto shrink-0 select-none">
                    {/* Theme switcher toggle button */}
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
                    
                    {/* Official Vijay Ray Custom Signature Branding */}
                    <div className="mt-2 flex flex-col items-center justify-center select-none group py-1">
                        <div className="text-[9px] uppercase tracking-[0.25em] font-black text-teal-200/50 group-hover:text-teal-200/70 transition-colors duration-200">Made By</div>
                        <div className="relative mt-2 flex items-center justify-center">
                            <img 
                                src={transparentSignature || signatureLogo} 
                                alt="Vijay Ray" 
                                className="h-14 w-auto object-contain signature-animated hover:scale-110 transition-transform duration-300"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Center Tab Panel */}
            <div className="flex-1 flex flex-col overflow-hidden relative m-3 md:my-3 md:mr-3 md:ml-3 rounded-2xl bg-white/60 backdrop-blur-md border border-white/60 shadow-xl">
                <main className="flex-1 overflow-y-auto p-4 scroll-smooth">
                    {activeTab !== 'search' && activeTab !== 'setup' && activeTab !== 'profile-creation' && activeTab !== 'user-creation' && activeTab !== 'user-list' && activeTab !== 'user-permissions' && activeTab !== 'helpdesk' && (
                        <div className="portal-filter-bar z-10 mb-4 rounded-xl border border-white shadow-sm flex flex-col gap-2 no-print">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-1">
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <span className="w-1 h-6 bg-teal-600 rounded-full"></span>
                                    {activeTab === 'overall-analysis' ? 'Overall Analysis' : (activeTab.charAt(0).toUpperCase() + activeTab.slice(1))} View
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
                                    {(!userPermissions || userPermissions.menu?.[activeTab === 'overall-analysis' ? 'excel-export-analysis' : `excel-export-${activeTab}`]?.show !== false) && (
                                        <button
                                            onClick={() => {
                                                if ((activeTab === 'team-performance' || activeTab === 'school-performance') && customExportHandler) {
                                                    customExportHandler();
                                                } else {
                                                    exportToExcel(processedData.schools, `Visit_Portal_Export_${activeTab}`);
                                                }
                                            }}

                                            className="bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 flex items-center gap-2 shadow-md shadow-teal-200 transition-all hover:-translate-y-0.5 text-xs font-bold flex-1 sm:flex-none justify-center"
                                        >
                                            <Icons.Export className="w-3.5 h-3.5 text-teal-100" />
                                            {activeTab === 'team-performance' ? 'Export Excel' : 'Export View'}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="h-px bg-gray-200/80 w-full my-1"></div>
                            <div className="flex flex-wrap gap-3 items-end">
                                <div className="w-full sm:w-[calc(50%-6px)] md:w-36 text-left">
                                    <MultiSelect
                                        label="Projects"
                                        options={opts.proj}
                                        value={localSelProjects}
                                        onChange={setLocalSelProjects}
                                        placeholder="All Projects"
                                    />
                                </div>
                                <div className="w-full sm:w-[calc(50%-6px)] md:w-36 text-left">
                                    <MultiSelect
                                        label="District"
                                        options={opts.dist}
                                        value={localSelDistricts}
                                        onChange={setLocalSelDistricts}
                                        placeholder="All Districts"
                                    />
                                </div>
                                <div className="w-full sm:w-[calc(50%-6px)] md:w-36 text-left">
                                    <MultiSelect
                                        label="Block"
                                        options={opts.blocks}
                                        value={localSelBlocks}
                                        onChange={setLocalSelBlocks}
                                        placeholder="All Blocks"
                                    />
                                </div>
                                <div className="w-full sm:w-[calc(50%-6px)] md:w-36 text-left">
                                    <MultiSelect
                                        label="CC/DEF"
                                        options={opts.ccs}
                                        value={localSelCCs}
                                        onChange={setLocalSelCCs}
                                        placeholder="All CCs"
                                    />
                                </div>
                                <div className="w-full sm:w-[calc(50%-6px)] md:w-44 text-left">
                                    <MultiSelect
                                        label="School"
                                        options={opts.schoolNames}
                                        value={localSelSchools}
                                        onChange={setLocalSelSchools}
                                        placeholder="All Schools"
                                    />
                                </div>
                                {activeTab === 'overall-analysis' && (
                                    <>
                                        <div className="w-full sm:w-[calc(50%-6px)] md:w-36 text-left">
                                            <MultiSelect
                                                label="Data Sources"
                                                options={['jhpms', 'edustat', 'visits', 'manpower']}
                                                value={localActiveSources}
                                                onChange={setLocalActiveSources}
                                                placeholder="All Sources"
                                            />
                                        </div>
                                        <div className="w-full sm:w-[calc(50%-6px)] md:w-36 text-left">
                                            <MultiSelect
                                                label="Perf Bands"
                                                options={['Excellent', 'Good', 'Average', 'Poor']}
                                                value={localPerfBands}
                                                onChange={setLocalPerfBands}
                                                placeholder="All Bands"
                                            />
                                        </div>
                                        <div className="w-full sm:w-auto flex items-center gap-4 bg-transparent p-0.5 rounded-lg border border-transparent self-center">
                                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={localCompareMode}
                                                    onChange={e => {
                                                        const checked = e.target.checked;
                                                        setLocalCompareMode(checked);
                                                        setCompareMode(checked);
                                                    }}
                                                    className="w-4 h-4 accent-teal-600 rounded cursor-pointer"
                                                />
                                                <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider whitespace-nowrap">Compare MoM</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={localShowExceptions}
                                                    onChange={e => {
                                                        const checked = e.target.checked;
                                                        setLocalShowExceptions(checked);
                                                        setShowExceptions(checked);
                                                    }}
                                                    className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                                                />
                                                <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider whitespace-nowrap">Show Gaps Only</span>
                                            </label>
                                            </div>
                                    </>
                                )}
                                <div className="w-full sm:w-auto flex flex-col text-left bg-transparent p-0 rounded-lg border border-transparent lg:ml-auto">
                                    <span className="portal-label text-[10px] mb-0.5 ml-1">Date Range</span>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="date"
                                            value={localStartDate}
                                            onChange={e => setLocalStartDate(e.target.value)}
                                            className="portal-input h-7 w-full sm:w-28 text-xs bg-white"
                                        />
                                        <span className="text-gray-400">-</span>
                                        <input
                                            type="date"
                                            value={localEndDate}
                                            onChange={e => setLocalEndDate(e.target.value)}
                                            className="portal-input h-7 w-full sm:w-28 text-xs bg-white"
                                        />
                                    </div>
                                </div>
                                {(activeTab === 'team-performance' || activeTab === 'school-performance' || activeTab === 'overall-analysis') && (
                                    <div className="w-full sm:w-auto flex flex-col text-left bg-transparent p-0 rounded-lg border border-transparent">
                                        <span className="portal-label text-[10px] mb-0.5 ml-1 flex items-center gap-1 text-teal-800 font-bold whitespace-nowrap">
                                            Working Days
                                            {localIsWorkingDaysManual && (
                                                <span className="text-[8px] px-1 bg-amber-100 text-amber-800 rounded font-normal border border-amber-200">
                                                    Manual
                                                </span>
                                            )}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min="1"
                                                value={localWorkingDays}
                                                onChange={e => {
                                                    const val = parseInt(e.target.value, 10);
                                                    if (!isNaN(val) && val >= 1) {
                                                        setLocalWorkingDays(val);
                                                        setLocalIsWorkingDaysManual(true);
                                                    } else if (e.target.value === '') {
                                                        setLocalWorkingDays('');
                                                        setLocalIsWorkingDaysManual(true);
                                                    }
                                                }}
                                                className="portal-input h-7 w-16 text-xs bg-white font-extrabold text-center text-teal-800 border-teal-200 focus:border-teal-500"
                                            />
                                            {localIsWorkingDaysManual && (
                                                <button
                                                    onClick={() => setLocalIsWorkingDaysManual(false)}
                                                    className="h-7 px-1.5 rounded text-[10px] font-bold text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors"
                                                    title="Reset to Auto-calculated days"
                                                >
                                                    Auto
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={handleApplyFilters}
                                    className="h-10 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex items-center justify-center gap-2 shadow-md shadow-teal-200 transition-all hover:-translate-y-0.5 text-xs font-black shrink-0 self-end"
                                    title="Click to apply selected filter criteria and update dashboard views"
                                >
                                    <Icons.Filter className="w-4 h-4 text-teal-100" /> Apply Filters
                                </button>
                            </div>
                        </div>
                    )}
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default App;
