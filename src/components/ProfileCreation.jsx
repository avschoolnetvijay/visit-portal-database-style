import React, { useState, useEffect, useMemo } from 'react';
import { Icons } from './Icons';
import { supabase, hashPassword } from '../supabaseClient';

const EyeIcon = ({ className }) => (
    <svg viewBox="0 0 24 24" className={className || "w-4 h-4"} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const EyeOffIcon = ({ className }) => (
    <svg viewBox="0 0 24 24" className={className || "w-4 h-4"} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

const permissionMenus = [
    { id: 'dashboard', label: 'Dashboard', under: 'Home' },
    { id: 'performance', label: 'Performance Matrix', under: 'Lab Visit' },
    { id: 'search', label: 'Search & Insights', under: 'Lab Visit' },
    { id: 'compliance', label: 'Compliance Check', under: 'Lab Visit' },
    { id: 'plan', label: 'Visit Planning', under: 'Lab Visit' },
    { id: 'team-performance', label: 'Field Team Performance', under: 'Performance Analysis' },
    { id: 'school-performance', label: 'School Performance', under: 'Performance Analysis' },
    { id: 'reports', label: 'Reports & Export', under: 'Reports' },
    { id: 'overall-analysis', label: 'Overall Analysis', under: 'Reports' },
    { id: 'setup', label: 'Data Upload', under: 'System Setup' },
    { id: 'profile-creation', label: 'Profile Creation', under: 'Profile Creation' }
];

const ProfileCreation = ({ userRole, schools = [] }) => {
    // Subsection toggle: 'create' | 'list' | 'permission'
    const [activeSubTab, setActiveSubTab] = useState('create');
    
    // Core database state
    const [usersList, setUsersList] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [dbHasColumns, setDbHasColumns] = useState(false); // Flag if supabase has new fields or uses JSON fallback
    const [dbHasPermissionsCol, setDbHasPermissionsCol] = useState(false); // Flag if supabase has native permissions column
    
    // Notification states
    const [manageError, setManageError] = useState('');
    const [manageSuccess, setManageSuccess] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Form inputs for User Creation
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [assignedDistrict, setAssignedDistrict] = useState('');
    const [designation, setDesignation] = useState('CC');
    const [customDesignation, setCustomDesignation] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [privilegeRole, setPrivilegeRole] = useState('user'); // 'user' (Standard) | 'admin' (Admin)

    // User Directory Search & Sort States
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('username');
    const [sortAsc, setSortAsc] = useState(true);

    // Inspector/Editor Modal State
    const [selectedUser, setSelectedUser] = useState(null); // User object being edited
    const [modalFullName, setModalFullName] = useState('');
    const [modalEmail, setModalEmail] = useState('');
    const [modalMobile, setModalMobile] = useState('');
    const [modalAssignedDistrict, setModalAssignedDistrict] = useState('');
    const [modalDesignation, setModalDesignation] = useState('');
    const [modalCustomDesignation, setModalCustomDesignation] = useState('');
    const [modalPrivilegeRole, setModalPrivilegeRole] = useState('user');
    const [modalNewPassword, setModalNewPassword] = useState('');
    const [modalConfirmNewPassword, setModalConfirmNewPassword] = useState('');
    const [modalError, setModalError] = useState('');
    const [modalSuccess, setModalSuccess] = useState('');

    // Show/Hide password toggle and password inspector states
    const [passwordInspectorUser, setPasswordInspectorUser] = useState(null);
    const [showCreatePassword, setShowCreatePassword] = useState(false);
    const [showModalPassword, setShowModalPassword] = useState(false);

    // Permission Matrix and District Gating States
    const [selectedPermUser, setSelectedPermUser] = useState('');
    const [permMatrix, setPermMatrix] = useState({});
    const [permDistricts, setPermDistricts] = useState([]);
    const [districtSearchTerm, setDistrictSearchTerm] = useState('');

    // Load dynamic unique districts from schools master list
    const uniqueDistricts = useMemo(() => {
        if (!schools || schools.length === 0) return [];
        const dists = schools.map(s => s.district).filter(Boolean);
        return [...new Set(dists)].sort();
    }, [schools]);

    // Parse a user database row, checking for JSON-packed role metadata fallback
    const parseUserRow = (u) => {
        let parsedMetadata = {};
        let resolvedRole = u.role || 'user';
        let permissions = null;
        let allowedDistricts = [];
        
        if (u.role && u.role.trim().startsWith('{')) {
            try {
                const meta = JSON.parse(u.role);
                parsedMetadata = meta;
                resolvedRole = meta.privilege || 'user';
                if (meta.permissions) permissions = meta.permissions;
                if (meta.allowed_districts) allowedDistricts = meta.allowed_districts;
            } catch (e) {
                console.error("Failed to parse JSON user role:", e);
            }
        }
        
        // Also check if permissions are saved natively in u.permissions
        if (u.permissions) {
            try {
                permissions = typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions;
            } catch (e) {
                console.error("Failed to parse native permissions:", e);
            }
        }
        
        // Also check for allowed districts fallback
        if (u.assigned_district && allowedDistricts.length === 0) {
            allowedDistricts = [u.assigned_district];
        }
        
        return {
            username: u.username,
            role: resolvedRole,
            created_at: u.created_at,
            full_name: u.full_name || parsedMetadata.full_name || '',
            email: u.email || parsedMetadata.email || '',
            mobile: u.mobile || parsedMetadata.mobile || '',
            assigned_district: u.assigned_district || parsedMetadata.assigned_district || '',
            designation: u.designation || parsedMetadata.designation || '',
            permissions: permissions,
            allowed_districts: allowedDistricts,
            raw_role: u.role,
            raw_password_hash: u.password_hash
        };
    };

    // Load active users list and inspect schema dynamically
    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (data && data.length > 0) {
                // Inspect fields in first record to detect if column exists natively in database
                const keys = Object.keys(data[0]);
                const hasCols = keys.includes('full_name');
                const hasPermsCol = keys.includes('permissions');
                setDbHasColumns(hasCols);
                setDbHasPermissionsCol(hasPermsCol);
                setUsersList(data.map(parseUserRow));
            } else {
                setUsersList([]);
            }
        } catch (err) {
            console.error("Error fetching users list:", err);
            setManageError("Failed to fetch user accounts directory.");
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
        if (userRole === 'admin') {
            fetchUsers();
        }
    }, [userRole]);

    const getDefaultPermissions = (userRoleVal) => {
        const matrix = {};
        permissionMenus.forEach(m => {
            if (userRoleVal === 'admin') {
                matrix[m.id] = { show: true, add: true, edit: true, delete: true, view: true };
            } else {
                const isStandard = ['dashboard', 'performance', 'search', 'compliance', 'plan'].includes(m.id);
                matrix[m.id] = {
                    show: isStandard,
                    add: isStandard,
                    edit: isStandard,
                    delete: isStandard,
                    view: isStandard
                };
            }
        });
        return matrix;
    };

    // Load selected user's permissions and districts dynamically
    useEffect(() => {
        if (selectedPermUser) {
            const userObj = usersList.find(u => u.username === selectedPermUser);
            if (userObj) {
                if (userObj.permissions && userObj.permissions.menu) {
                    const newMatrix = {};
                    permissionMenus.forEach(m => {
                        newMatrix[m.id] = userObj.permissions.menu[m.id] || { show: false, add: false, edit: false, delete: false, view: false };
                    });
                    setPermMatrix(newMatrix);
                } else {
                    setPermMatrix(getDefaultPermissions(userObj.role));
                }

                if (userObj.permissions && userObj.permissions.allowed_districts) {
                    setPermDistricts(userObj.permissions.allowed_districts);
                } else if (userObj.allowed_districts && userObj.allowed_districts.length > 0) {
                    setPermDistricts(userObj.allowed_districts);
                } else if (userObj.assigned_district) {
                    setPermDistricts([userObj.assigned_district]);
                } else {
                    setPermDistricts([]);
                }
            }
        } else {
            setPermMatrix({});
            setPermDistricts([]);
        }
    }, [selectedPermUser, usersList]);

    const handleResetPermissions = () => {
        if (!selectedPermUser) return;
        const userObj = usersList.find(u => u.username === selectedPermUser);
        if (userObj) {
            setPermMatrix(getDefaultPermissions(userObj.role));
            setPermDistricts(userObj.assigned_district ? [userObj.assigned_district] : []);
            setManageSuccess("Permissions matrix reset to default standard access successfully!");
        }
    };

    const isAllChecked = (field) => {
        if (permissionMenus.length === 0) return false;
        return permissionMenus.every(m => permMatrix[m.id]?.[field] === true);
    };

    const handleHeaderCheckboxChange = (field, checked) => {
        setPermMatrix(prev => {
            const next = { ...prev };
            permissionMenus.forEach(m => {
                if (!next[m.id]) next[m.id] = {};
                next[m.id][field] = checked;
            });
            return next;
        });
    };

    const handleSavePermissions = async (e) => {
        e.preventDefault();
        setManageError('');
        setManageSuccess('');

        if (!selectedPermUser) {
            setManageError('Please select a user to update permissions.');
            return;
        }

        const userObj = usersList.find(u => u.username === selectedPermUser);
        if (!userObj) return;

        setActionLoading(true);
        try {
            const permissionsPayload = {
                menu: permMatrix,
                allowed_districts: permDistricts
            };

            let updatePayload = {};
            if (dbHasPermissionsCol) {
                updatePayload = {
                    permissions: permissionsPayload
                };
            } else {
                let privilege = userObj.role;
                let parsedMeta = {};
                if (userObj.raw_role && userObj.raw_role.trim().startsWith('{')) {
                    try {
                        parsedMeta = JSON.parse(userObj.raw_role);
                        privilege = parsedMeta.privilege || 'user';
                    } catch (err) {
                        console.error(err);
                    }
                }

                const roleJson = JSON.stringify({
                    ...parsedMeta,
                    privilege: privilege,
                    full_name: userObj.full_name,
                    email: userObj.email,
                    mobile: userObj.mobile,
                    assigned_district: userObj.assigned_district,
                    designation: userObj.designation,
                    permissions: permissionsPayload,
                    allowed_districts: permDistricts
                });

                updatePayload = {
                    role: roleJson
                };
            }

            const { error } = await supabase
                .from('users')
                .update(updatePayload)
                .eq('username', selectedPermUser);

            if (error) throw error;

            setManageSuccess(`Permissions and allowed districts for "${selectedPermUser}" updated successfully!`);
            fetchUsers();
        } catch (err) {
            console.error("Failed to save user permissions:", err);
            setManageError(err.message || "An unexpected error occurred while saving permissions.");
        } finally {
            setActionLoading(false);
        }
    };

    // Form Reset Helpers
    const resetCreationForm = () => {
        setFullName('');
        setUsername('');
        setEmail('');
        setMobile('');
        setAssignedDistrict('');
        setDesignation('CC');
        setCustomDesignation('');
        setPassword('');
        setConfirmPassword('');
        setPrivilegeRole('user');
    };

    // Handle New User Creation Submission
    const handleCreateUser = async (e) => {
        e.preventDefault();
        setManageError('');
        setManageSuccess('');

        // 1. Sanitize & Validate Username
        const u = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
        if (!u) {
            setManageError('Please enter a valid User ID (alphanumeric, underscore, dash, or dot).');
            return;
        }

        // 2. Client-Side Field Validations
        if (!fullName.trim()) {
            setManageError('Please enter the Name Of User.');
            return;
        }
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setManageError('Please enter a valid Email ID.');
            return;
        }
        if (!mobile.trim() || !/^\d{10}$/.test(mobile.trim())) {
            setManageError('Please enter a valid 10-digit Mobile Number.');
            return;
        }
        if (!assignedDistrict) {
            setManageError('Please assign a District.');
            return;
        }
        
        const finalDesignation = designation === 'Other' ? customDesignation.trim() : designation;
        if (!finalDesignation) {
            setManageError('Please specify the Designation.');
            return;
        }

        // 3. Password Verification
        const p = password.trim();
        const cp = confirmPassword.trim();
        if (!p) {
            setManageError('Password cannot be empty.');
            return;
        }
        if (p !== cp) {
            setManageError('Passwords do not match. Please verify.');
            return;
        }

        setActionLoading(true);
        try {
            // Cryptographically hash password client-side using native Web Crypto API helper
            const hash = await hashPassword(u, p);
            
            // Build insert payload based on active database capabilities
            let insertPayload = {};
            if (dbHasColumns) {
                insertPayload = {
                    username: u,
                    password_hash: hash,
                    role: privilegeRole,
                    full_name: fullName.trim(),
                    email: email.trim().toLowerCase(),
                    mobile: mobile.trim(),
                    assigned_district: assignedDistrict,
                    designation: finalDesignation
                };
            } else {
                // Pack details into 'role' JSON fallback for absolute zero-config compatibility
                const roleJson = JSON.stringify({
                    privilege: privilegeRole,
                    full_name: fullName.trim(),
                    email: email.trim().toLowerCase(),
                    mobile: mobile.trim(),
                    assigned_district: assignedDistrict,
                    designation: finalDesignation
                });
                insertPayload = {
                    username: u,
                    password_hash: hash,
                    role: roleJson
                };
            }

            const { error } = await supabase
                .from('users')
                .insert([insertPayload]);

            if (error) {
                if (error.code === '23505') {
                    throw new Error(`Username "${u}" already exists! Please choose another.`);
                }
                throw error;
            }

            setManageSuccess(`User Account "${u}" created successfully!`);
            resetCreationForm();
            fetchUsers();
            
            // Transition to list tab to see new user
            setTimeout(() => {
                setActiveSubTab('list');
            }, 800);

        } catch (err) {
            console.error("User creation failed:", err);
            setManageError(err.message || "An unexpected error occurred during creation.");
        } finally {
            setActionLoading(false);
        }
    };

    // Handle User Delete Action
    const handleDeleteUser = async (usernameToDelete) => {
        if (usernameToDelete === localStorage.getItem('snet_username')) {
            alert("Security Gate Alert: You cannot delete your own admin account while logged in!");
            return;
        }
        if (!window.confirm(`Safety Check: Are you absolutely sure you want to permanently delete user account "${usernameToDelete}"? This cannot be undone.`)) {
            return;
        }
        
        setManageError('');
        setManageSuccess('');
        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('username', usernameToDelete);

            if (error) throw error;
            setManageSuccess(`User account "${usernameToDelete}" deleted successfully!`);
            fetchUsers();
            if (selectedUser && selectedUser.username === usernameToDelete) {
                setSelectedUser(null);
            }
        } catch (err) {
            console.error("User deletion error:", err);
            setManageError(err.message || "Failed to delete user account.");
        }
    };

    // Open Inspector/Edit Modal and populate values
    const openInspector = (user) => {
        setSelectedUser(user);
        setModalFullName(user.full_name || '');
        setModalEmail(user.email || '');
        setModalMobile(user.mobile || '');
        setModalAssignedDistrict(user.assigned_district || '');
        
        const designationsList = ['CC', 'DEF', 'ZC', 'CR', 'PM'];
        if (designationsList.includes(user.designation)) {
            setModalDesignation(user.designation);
            setModalCustomDesignation('');
        } else {
            setModalDesignation('Other');
            setModalCustomDesignation(user.designation || '');
        }
        
        setModalPrivilegeRole(user.role || 'user');
        setModalNewPassword('');
        setModalConfirmNewPassword('');
        setModalError('');
        setModalSuccess('');
    };

    // Save Edited User Profile & Password
    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setModalError('');
        setModalSuccess('');

        if (!selectedUser) return;
        const u = selectedUser.username;

        // 1. Client-Side Field Validations
        if (!modalFullName.trim()) {
            setModalError('Please enter the Name Of User.');
            return;
        }
        if (!modalEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(modalEmail.trim())) {
            setModalError('Please enter a valid Email ID.');
            return;
        }
        if (!modalMobile.trim() || !/^\d{10}$/.test(modalMobile.trim())) {
            setModalError('Please enter a valid 10-digit Mobile Number.');
            return;
        }
        if (!modalAssignedDistrict) {
            setModalError('Please assign a District.');
            return;
        }
        
        const finalDesignation = modalDesignation === 'Other' ? modalCustomDesignation.trim() : modalDesignation;
        if (!finalDesignation) {
            setModalError('Please specify the Designation.');
            return;
        }

        // 2. Optional Password Validation
        const p = modalNewPassword.trim();
        const cp = modalConfirmNewPassword.trim();
        let newHash = null;

        if (p || cp) {
            if (p !== cp) {
                setModalError('New passwords do not match. Please verify.');
                return;
            }
            newHash = await hashPassword(u, p);
        }

        setActionLoading(true);
        try {
            // Build update payload based on active database capabilities
            let updatePayload = {};
            if (dbHasColumns) {
                updatePayload = {
                    role: modalPrivilegeRole,
                    full_name: modalFullName.trim(),
                    email: modalEmail.trim().toLowerCase(),
                    mobile: modalMobile.trim(),
                    assigned_district: modalAssignedDistrict,
                    designation: finalDesignation
                };
                if (newHash) {
                    updatePayload.password_hash = newHash;
                }
            } else {
                // Pack details into 'role' JSON fallback
                const roleJson = JSON.stringify({
                    privilege: modalPrivilegeRole,
                    full_name: modalFullName.trim(),
                    email: modalEmail.trim().toLowerCase(),
                    mobile: modalMobile.trim(),
                    assigned_district: modalAssignedDistrict,
                    designation: finalDesignation
                });
                updatePayload = {
                    role: roleJson
                };
                if (newHash) {
                    updatePayload.password_hash = newHash;
                }
            }

            const { error } = await supabase
                .from('users')
                .update(updatePayload)
                .eq('username', u);

            if (error) throw error;

            setModalSuccess('User profile details updated successfully!');
            fetchUsers();
            
            // If the admin edited their own active account, update local storage roles dynamically
            if (u === localStorage.getItem('snet_username')) {
                localStorage.setItem('snet_user_role', dbHasColumns ? modalPrivilegeRole : updatePayload.role);
                localStorage.setItem('snet_full_name', modalFullName.trim());
                localStorage.setItem('snet_designation', finalDesignation);
                window.dispatchEvent(new Event('storage'));
            }

            // Close modal after brief success presentation
            setTimeout(() => {
                setSelectedUser(null);
            }, 800);

        } catch (err) {
            console.error("Profile update failed:", err);
            setModalError(err.message || "Failed to save profile changes.");
        } finally {
            setActionLoading(false);
        }
    };

    // Filter and Sort Directory List in Real-Time
    const sortedAndFilteredUsers = useMemo(() => {
        let list = [...usersList];
        
        // Search filter (Fuzzy matchmaking)
        if (searchTerm.trim()) {
            const query = searchTerm.toLowerCase().trim();
            list = list.filter(u => 
                u.username.toLowerCase().includes(query) ||
                u.full_name.toLowerCase().includes(query) ||
                u.email.toLowerCase().includes(query) ||
                u.mobile.includes(query) ||
                u.assigned_district.toLowerCase().includes(query) ||
                u.designation.toLowerCase().includes(query) ||
                u.role.toLowerCase().includes(query)
            );
        }

        // Sort execution
        list.sort((a, b) => {
            let valA = a[sortField] || '';
            let valB = b[sortField] || '';
            
            if (sortField === 'created_at') {
                valA = new Date(a.created_at || 0).getTime();
                valB = new Date(b.created_at || 0).getTime();
            } else {
                valA = String(valA).toLowerCase();
                valB = String(valB).toLowerCase();
            }

            if (valA < valB) return sortAsc ? -1 : 1;
            if (valA > valB) return sortAsc ? 1 : -1;
            return 0;
        });

        return list;
    }, [usersList, searchTerm, sortField, sortAsc]);

    // Handle Sort toggle
    const handleSort = (field) => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(true);
        }
    };

    if (userRole !== 'admin') {
        return (
            <div className="max-w-7xl mx-auto p-6 text-center text-red-500 font-semibold bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 rounded-2xl p-8 mt-10">
                ⚠️ Access Denied: Administrator privileges are strictly required to operate this module.
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 animate-fade-in text-left">
            {/* Header Strip & Sub-navigation Tab Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                        <Icons.Setup className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                        <span>Profile & Accounts Manager</span>
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Register portal members, assign district boundaries, manage staff designations, and update security credentials.
                    </p>
                </div>

                {/* Sub Tab Switcher */}
                <div className="flex items-center bg-gray-100 dark:bg-slate-800/80 p-1 rounded-xl border border-gray-200 dark:border-slate-700/60 shadow-inner">
                    <button
                        onClick={() => { setActiveSubTab('create'); setManageError(''); setManageSuccess(''); }}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                            activeSubTab === 'create'
                                ? 'bg-white dark:bg-teal-600/90 text-teal-700 dark:text-white shadow-md'
                                : 'text-gray-600 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
                        }`}
                    >
                        <Icons.Home className="w-3.5 h-3.5" />
                        <span>User Creation</span>
                    </button>
                    <button
                        onClick={() => { setActiveSubTab('list'); setManageError(''); setManageSuccess(''); fetchUsers(); }}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                            activeSubTab === 'list'
                                ? 'bg-white dark:bg-teal-600/90 text-teal-700 dark:text-white shadow-md'
                                : 'text-gray-600 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
                        }`}
                    >
                        <Icons.Users className="w-3.5 h-3.5" />
                        <span>User List Directory</span>
                    </button>
                    <button
                        onClick={() => { setActiveSubTab('permission'); setManageError(''); setManageSuccess(''); fetchUsers(); }}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                            activeSubTab === 'permission'
                                ? 'bg-white dark:bg-teal-600/90 text-teal-700 dark:text-white shadow-md'
                                : 'text-gray-600 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
                        }`}
                    >
                        <Icons.Lock className="w-3.5 h-3.5" />
                        <span>User Permissions</span>
                    </button>
                </div>
            </div>

            {/* Notification Alerts */}
            {manageError && (
                <div className="mb-4 text-red-600 dark:text-red-400 text-xs font-semibold bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-3 rounded-xl flex items-center gap-2">
                    <Icons.Alert className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{manageError}</span>
                </div>
            )}
            {manageSuccess && (
                <div className="mb-4 text-emerald-600 dark:text-emerald-400 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 p-3 rounded-xl flex items-center gap-2">
                    <Icons.Reports className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{manageSuccess}</span>
                </div>
            )}

            {/* Tab 1: User Creation Form */}
            {activeSubTab === 'create' && (
                <div className="portal-card bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/60 dark:border-slate-800/80 shadow-xl rounded-2xl overflow-hidden animate-slide-up">
                    <div className="portal-card-header text-sm py-3.5 px-6 bg-gradient-to-r from-teal-600 to-teal-700 dark:from-slate-800 dark:to-slate-900 text-white font-bold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Icons.Lock className="w-4 h-4 text-teal-300" />
                            <span>Create New Member Account</span>
                        </div>
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Database Mode: {dbHasColumns ? "Advanced Native" : "Seamless Encoded"}
                        </span>
                    </div>

                    <form onSubmit={handleCreateUser} className="p-6 md:p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Column Fields */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                                        Name Of User
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Rajesh Kumar"
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                        required
                                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700/60 rounded-xl px-4 py-2.5 text-gray-700 dark:text-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 dark:focus:border-teal-500 transition shadow-inner"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                                        User ID / Username
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. rajesh.kumar"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        required
                                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700/60 rounded-xl px-4 py-2.5 text-gray-700 dark:text-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 dark:focus:border-teal-500 transition shadow-inner"
                                    />
                                    <span className="block text-[9px] text-gray-400 mt-1 ml-1">
                                        Username should be alphanumeric. Punctuation (. - _) allowed.
                                    </span>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                                        Email ID
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="e.g. rajesh@schoolnet.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700/60 rounded-xl px-4 py-2.5 text-gray-700 dark:text-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 dark:focus:border-teal-500 transition shadow-inner"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                                        Mobile Number
                                    </label>
                                    <input
                                        type="tel"
                                        placeholder="10-digit number"
                                        value={mobile}
                                        onChange={e => setMobile(e.target.value)}
                                        maxLength={10}
                                        required
                                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700/60 rounded-xl px-4 py-2.5 text-gray-700 dark:text-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 dark:focus:border-teal-500 transition shadow-inner"
                                    />
                                </div>
                            </div>

                            {/* Right Column Fields */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                                        Assigned District (School Boundary)
                                    </label>
                                    <select
                                        value={assignedDistrict}
                                        onChange={e => setAssignedDistrict(e.target.value)}
                                        required
                                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700/60 rounded-xl px-4 py-2.5 text-gray-700 dark:text-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 dark:focus:border-teal-500 transition"
                                    >
                                        <option value="">-- Choose Assigned District --</option>
                                        {uniqueDistricts.map(dist => (
                                            <option key={dist} value={dist}>{dist}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                                        Designation Role
                                    </label>
                                    <select
                                        value={designation}
                                        onChange={e => setDesignation(e.target.value)}
                                        required
                                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700/60 rounded-xl px-4 py-2.5 text-gray-700 dark:text-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 dark:focus:border-teal-500 transition"
                                    >
                                        <option value="CC">CC (Cluster Coordinator)</option>
                                        <option value="DEF">DEF (District Executive Field)</option>
                                        <option value="ZC">ZC (Zone Coordinator)</option>
                                        <option value="CR">CR (Coordinator Representative)</option>
                                        <option value="PM">PM (Project Manager)</option>
                                        <option value="Other">Other (Enter Manually...)</option>
                                    </select>

                                    {/* Manual entry if Other */}
                                    {designation === 'Other' && (
                                        <input
                                            type="text"
                                            placeholder="Enter manual designation here"
                                            value={customDesignation}
                                            onChange={e => setCustomDesignation(e.target.value)}
                                            required
                                            className="w-full mt-2 bg-yellow-50/30 dark:bg-slate-800 border border-yellow-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-gray-700 dark:text-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500 transition shadow-inner animate-slide-up"
                                        />
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                                            Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showCreatePassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                required
                                                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700/60 rounded-xl pl-4 pr-10 py-2.5 text-gray-700 dark:text-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 dark:focus:border-teal-500 transition shadow-inner"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCreatePassword(!showCreatePassword)}
                                                className="absolute right-3 top-3 text-gray-400 hover:text-slate-600 dark:hover:text-gray-200 focus:outline-none"
                                            >
                                                {showCreatePassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                                            Confirm Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showCreatePassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                required
                                                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700/60 rounded-xl pl-4 pr-10 py-2.5 text-gray-700 dark:text-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 dark:focus:border-teal-500 transition shadow-inner"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                                        Access Privilege Role
                                    </label>
                                    <select
                                        value={privilegeRole}
                                        onChange={e => setPrivilegeRole(e.target.value)}
                                        required
                                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700/60 rounded-xl px-4 py-2.5 text-gray-700 dark:text-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 dark:focus:border-teal-500 transition"
                                    >
                                        <option value="user">Standard User (View & Sync Own Data)</option>
                                        <option value="admin">Administrator (Manage System & Users)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-slate-800/80">
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white text-xs uppercase tracking-widest font-extrabold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-xl transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {actionLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Saving User Account...</span>
                                    </>
                                ) : (
                                    <>
                                        <Icons.Lock className="w-4 h-4 text-white" />
                                        <span>Create User ID & Save</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Tab 2: User List Directory */}
            {activeSubTab === 'list' && (
                <div className="portal-card bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/60 dark:border-slate-800/80 shadow-xl rounded-2xl overflow-hidden animate-slide-up">
                    
                    {/* Search & Statistics Strip */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-b border-gray-100 dark:border-slate-800/80 flex flex-col md:flex-row justify-between items-center gap-4">
                        
                        {/* Search Input */}
                        <div className="relative w-full md:max-w-md">
                            <input
                                type="text"
                                placeholder="Search by Username, Name, District, Designation, Role..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700/60 rounded-xl pl-9 pr-4 py-2 text-gray-700 dark:text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-transparent transition"
                            />
                            <div className="absolute left-3 top-2.5 text-gray-400">
                                <Icons.Search className="w-4 h-4" />
                            </div>
                        </div>

                        {/* Directory count & Refresh button */}
                        <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                Total Members: <strong className="text-slate-800 dark:text-white">{usersList.length}</strong> | Found: <strong className="text-teal-600 dark:text-teal-400">{sortedAndFilteredUsers.length}</strong>
                            </span>
                            <button
                                onClick={fetchUsers}
                                className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-teal-600 dark:text-teal-400 text-[10px] font-extrabold uppercase px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 transition flex items-center gap-1.5 shadow-sm"
                            >
                                <Icons.Setup className="w-3 h-3 animate-spin-slow" />
                                <span>Refresh</span>
                            </button>
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto">
                        {loadingUsers ? (
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-20 flex flex-col items-center justify-center gap-2">
                                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                                <span>Loading Active User Directory...</span>
                            </div>
                        ) : sortedAndFilteredUsers.length === 0 ? (
                            <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-16 flex flex-col items-center justify-center gap-3">
                                <Icons.Users className="w-12 h-12 text-gray-300 dark:text-gray-700" />
                                <span>No user accounts match your search parameters.</span>
                            </div>
                        ) : (
                            <table className="w-full border-collapse portal-table">
                                <thead>
                                    <tr className="bg-slate-100/50 dark:bg-slate-800/40 border-b border-gray-200 dark:border-slate-800 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">
                                        <th className="py-3 px-4">S.No.</th>
                                        <th className="py-3 px-4 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800/80" onClick={() => handleSort('full_name')}>
                                            Name Of User {sortField === 'full_name' && (sortAsc ? '▲' : '▼')}
                                        </th>
                                        <th className="py-3 px-4 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800/80" onClick={() => handleSort('username')}>
                                            User ID / Username {sortField === 'username' && (sortAsc ? '▲' : '▼')}
                                        </th>
                                        <th className="py-3 px-4 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800/80" onClick={() => handleSort('designation')}>
                                            Designation {sortField === 'designation' && (sortAsc ? '▲' : '▼')}
                                        </th>
                                        <th className="py-3 px-4 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800/80" onClick={() => handleSort('assigned_district')}>
                                            District {sortField === 'assigned_district' && (sortAsc ? '▲' : '▼')}
                                        </th>
                                        <th className="py-3 px-4">Contact Info</th>
                                        <th className="py-3 px-4 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800/80" onClick={() => handleSort('role')}>
                                            Privilege {sortField === 'role' && (sortAsc ? '▲' : '▼')}
                                        </th>
                                        <th className="py-3 px-4 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800/80" onClick={() => handleSort('created_at')}>
                                            Created {sortField === 'created_at' && (sortAsc ? '▲' : '▼')}
                                        </th>
                                        <th className="py-3 px-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
                                    {sortedAndFilteredUsers.map((u, index) => (
                                        <tr key={u.username} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition">
                                            <td className="py-3.5 px-4 text-gray-400 font-mono text-[10px]">{index + 1}</td>
                                            <td className="py-3.5 px-4 font-bold text-gray-800 dark:text-white">{u.full_name || '-'}</td>
                                            <td className="py-3.5 px-4">
                                                <button
                                                    onClick={() => openInspector(u)}
                                                    className="font-mono font-bold text-teal-600 dark:text-teal-400 hover:underline text-left cursor-pointer"
                                                    title="Click to view details & edit"
                                                >
                                                    {u.username}
                                                </button>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                    {u.designation || '-'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 font-medium text-gray-600 dark:text-gray-300">{u.assigned_district || '-'}</td>
                                            <td className="py-3.5 px-4 text-[10px] text-gray-500 dark:text-gray-400">
                                                <div>{u.email || '-'}</div>
                                                <div className="font-mono mt-0.5">{u.mobile || '-'}</div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className={`text-[9px] uppercase px-2 py-0.5 rounded-md font-extrabold border ${
                                                    u.role === 'admin'
                                                        ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30'
                                                        : 'bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900/30'
                                                }`}>
                                                    {u.role === 'admin' ? 'Administrator' : 'Standard'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-[10px] text-gray-400 dark:text-gray-500">
                                                {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => openInspector(u)}
                                                        className="p-1.5 text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/30 rounded-lg transition"
                                                        title="Edit User Profile"
                                                    >
                                                        <Icons.Profile className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setPasswordInspectorUser(u)}
                                                        className="p-1.5 text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition"
                                                        title="Inspect Secure Password Hash"
                                                    >
                                                        <EyeIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(u.username)}
                                                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                                                        title="Delete User Account"
                                                    >
                                                        <Icons.Close className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Tab 3: User Permissions & District Gating */}
            {activeSubTab === 'permission' && (
                <div className="portal-card bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/60 dark:border-slate-800/80 shadow-xl rounded-2xl overflow-hidden animate-slide-up">
                    <div className="portal-card-header text-sm py-3.5 px-6 bg-gradient-to-r from-teal-600 to-teal-700 dark:from-slate-800 dark:to-slate-900 text-white font-bold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Icons.Lock className="w-4 h-4 text-teal-300" />
                            <span>User/Group Access Permission & District Scope</span>
                        </div>
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Type: User Access Matrix
                        </span>
                    </div>

                    <form onSubmit={handleSavePermissions} className="p-6 md:p-8 space-y-6">
                        {/* Dropdown User Selector & Reset Button Strip */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-gray-100 dark:border-slate-800/80 shadow-inner">
                            <div className="w-full sm:max-w-md">
                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                                    Select User to Configure
                                </label>
                                <select
                                    value={selectedPermUser}
                                    onChange={e => setSelectedPermUser(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700/60 rounded-xl px-4 py-2.5 text-gray-700 dark:text-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 dark:focus:border-teal-500 transition shadow-inner font-semibold"
                                >
                                    <option value="">-- Choose User Accounts --</option>
                                    {usersList.map(u => (
                                        <option key={u.username} value={u.username}>
                                            {u.full_name ? `${u.full_name} (${u.username})` : u.username} — {u.role === 'admin' ? 'Admin' : 'Standard'} ({u.designation || 'No Role'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedPermUser && (
                                <button
                                    type="button"
                                    onClick={handleResetPermissions}
                                    className="w-full sm:w-auto shrink-0 bg-white dark:bg-slate-850 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 text-xs uppercase tracking-widest font-extrabold px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-900/40 transition flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                    <Icons.Close className="w-4 h-4 text-red-500" />
                                    <span>Reset User Permission</span>
                                </button>
                            )}
                        </div>

                        {!selectedPermUser ? (
                            <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-20 flex flex-col items-center justify-center gap-3">
                                <Icons.Lock className="w-12 h-12 text-gray-300 dark:text-gray-700" />
                                <span>Please choose a user account above to view and edit their permission matrix.</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
                                {/* Left Columns: Permissions Matrix Table */}
                                <div className="lg:col-span-2 space-y-4">
                                    <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 dark:border-slate-800 pb-2">
                                        <Icons.Setup className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                        <span>User/Group Access List</span>
                                    </h3>
                                    
                                    <div className="overflow-x-auto border border-gray-105 dark:border-slate-800 rounded-xl shadow-sm">
                                        <table className="w-full border-collapse text-left text-xs bg-white dark:bg-slate-900/40">
                                            <thead>
                                                <tr className="bg-slate-100/50 dark:bg-slate-800/40 border-b border-gray-200 dark:border-slate-800 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">
                                                    <th className="py-3.5 px-4 w-12 text-center">SLNO</th>
                                                    <th className="py-3.5 px-4 w-28">UNDER</th>
                                                    <th className="py-3.5 px-4">MENU</th>
                                                    <th className="py-3.5 px-4 text-center w-20 border-l border-gray-200/50 dark:border-slate-800/50">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="text-[9px]">SHOW YN</span>
                                                            <input
                                                                type="checkbox"
                                                                checked={isAllChecked('show')}
                                                                onChange={e => handleHeaderCheckboxChange('show', e.target.checked)}
                                                                className="w-3.5 h-3.5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer"
                                                            />
                                                        </div>
                                                    </th>
                                                    <th className="py-3.5 px-4 text-center w-16">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="text-[9px]">ADD</span>
                                                            <input
                                                                type="checkbox"
                                                                checked={isAllChecked('add')}
                                                                onChange={e => handleHeaderCheckboxChange('add', e.target.checked)}
                                                                className="w-3.5 h-3.5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer"
                                                            />
                                                        </div>
                                                    </th>
                                                    <th className="py-3.5 px-4 text-center w-16">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="text-[9px]">EDIT</span>
                                                            <input
                                                                type="checkbox"
                                                                checked={isAllChecked('edit')}
                                                                onChange={e => handleHeaderCheckboxChange('edit', e.target.checked)}
                                                                className="w-3.5 h-3.5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer"
                                                            />
                                                        </div>
                                                    </th>
                                                    <th className="py-3.5 px-4 text-center w-16">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="text-[9px]">DELETE</span>
                                                            <input
                                                                type="checkbox"
                                                                checked={isAllChecked('delete')}
                                                                onChange={e => handleHeaderCheckboxChange('delete', e.target.checked)}
                                                                className="w-3.5 h-3.5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer"
                                                            />
                                                        </div>
                                                    </th>
                                                    <th className="py-3.5 px-4 text-center w-16">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="text-[9px]">VIEW</span>
                                                            <input
                                                                type="checkbox"
                                                                checked={isAllChecked('view')}
                                                                onChange={e => handleHeaderCheckboxChange('view', e.target.checked)}
                                                                className="w-3.5 h-3.5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer"
                                                            />
                                                        </div>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
                                                {permissionMenus.map((menu, index) => (
                                                    <tr key={menu.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition">
                                                        <td className="py-3 px-4 text-center text-gray-400 font-mono text-[10px]">{index}</td>
                                                        <td className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400">{menu.under}</td>
                                                        <td className="py-3 px-4 font-bold text-gray-850 dark:text-slate-100">{menu.label}</td>
                                                        <td className="py-3 px-4 text-center border-l border-gray-150/40 dark:border-slate-800/40">
                                                            <input
                                                                type="checkbox"
                                                                checked={permMatrix[menu.id]?.show || false}
                                                                onChange={e => setPermMatrix(prev => ({
                                                                    ...prev,
                                                                    [menu.id]: { ...prev[menu.id], show: e.target.checked }
                                                                }))}
                                                                className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500/30 focus:ring-2 cursor-pointer transition"
                                                            />
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={permMatrix[menu.id]?.add || false}
                                                                onChange={e => setPermMatrix(prev => ({
                                                                    ...prev,
                                                                    [menu.id]: { ...prev[menu.id], add: e.target.checked }
                                                                }))}
                                                                className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500/30 focus:ring-2 cursor-pointer transition"
                                                            />
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={permMatrix[menu.id]?.edit || false}
                                                                onChange={e => setPermMatrix(prev => ({
                                                                    ...prev,
                                                                    [menu.id]: { ...prev[menu.id], edit: e.target.checked }
                                                                }))}
                                                                className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500/30 focus:ring-2 cursor-pointer transition"
                                                            />
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={permMatrix[menu.id]?.delete || false}
                                                                onChange={e => setPermMatrix(prev => ({
                                                                    ...prev,
                                                                    [menu.id]: { ...prev[menu.id], delete: e.target.checked }
                                                                }))}
                                                                className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500/30 focus:ring-2 cursor-pointer transition"
                                                            />
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={permMatrix[menu.id]?.view || false}
                                                                onChange={e => setPermMatrix(prev => ({
                                                                    ...prev,
                                                                    [menu.id]: { ...prev[menu.id], view: e.target.checked }
                                                                }))}
                                                                className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500/30 focus:ring-2 cursor-pointer transition"
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Right Column: District Gating Checklist */}
                                <div className="space-y-4">
                                    <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 dark:border-slate-800 pb-2">
                                        <Icons.Visit className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                        <span>District Data Isolation Scope</span>
                                    </h3>

                                    <div className="bg-slate-50/50 dark:bg-slate-900/20 border border-gray-100 dark:border-slate-800 rounded-xl p-4 space-y-4 shadow-inner">
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal">
                                            Select which districts' schools, visits, lab classes, CC structures, and daily CPU hours this coordinator is authorized to view. Checked items isolate all metrics globally.
                                        </p>

                                        {/* Search Filter for Districts */}
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Search Districts..."
                                                value={districtSearchTerm}
                                                onChange={e => setDistrictSearchTerm(e.target.value)}
                                                className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700/60 rounded-lg pl-8 pr-3 py-1.5 text-gray-700 dark:text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-transparent shadow-sm"
                                            />
                                            <div className="absolute left-2.5 top-2 text-gray-400">
                                                <Icons.Search className="w-3.5 h-3.5" />
                                            </div>
                                        </div>

                                        {/* Quick Select Actions */}
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPermDistricts([...uniqueDistricts])}
                                                className="w-1/2 bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 text-teal-700 dark:text-teal-400 text-[9px] font-bold uppercase py-1.5 border border-gray-200 dark:border-slate-750 rounded-lg shadow-sm cursor-pointer"
                                            >
                                                Select All
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPermDistricts([])}
                                                className="w-1/2 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-slate-700 text-red-600 dark:text-red-400 text-[9px] font-bold uppercase py-1.5 border border-gray-200 dark:border-slate-750 rounded-lg shadow-sm cursor-pointer"
                                            >
                                                Clear All
                                            </button>
                                        </div>

                                        {/* District Checklist Grid */}
                                        <div className="max-h-[300px] overflow-y-auto space-y-2.5 pr-2 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-xl p-3.5 shadow-inner">
                                            {uniqueDistricts
                                                .filter(dist => dist.toLowerCase().includes(districtSearchTerm.toLowerCase().trim()))
                                                .map(dist => {
                                                    const isChecked = permDistricts.includes(dist);
                                                    return (
                                                        <label key={dist} className="flex items-center gap-2.5 p-1 rounded hover:bg-gray-50 dark:hover:bg-slate-800/40 cursor-pointer select-none transition">
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={e => {
                                                                    if (e.target.checked) {
                                                                        setPermDistricts(prev => [...prev, dist]);
                                                                    } else {
                                                                        setPermDistricts(prev => prev.filter(d => d !== dist));
                                                                    }
                                                                }}
                                                                className="w-4 h-4 text-teal-600 border-gray-305 rounded focus:ring-teal-500 cursor-pointer"
                                                            />
                                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{dist}</span>
                                                        </label>
                                                    );
                                                })}
                                            {uniqueDistricts.filter(dist => dist.toLowerCase().includes(districtSearchTerm.toLowerCase().trim())).length === 0 && (
                                                <div className="text-[10px] text-gray-400 dark:text-gray-500 text-center py-6">
                                                    No districts match search query
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedPermUser && (
                            <div className="pt-4 border-t border-gray-100 dark:border-slate-800/80">
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white text-xs uppercase tracking-widest font-extrabold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-xl transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                >
                                    {actionLoading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Saving Access Permissions...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icons.Lock className="w-4 h-4 text-white" />
                                            <span>Submit Permissions Matrix</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            )}

            {/* Inspector Modal: Detail view & Account Editor */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-slate-950/85 backdrop-blur-sm flex justify-center items-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scale-up text-left">
                        {/* Modal Header */}
                        <div className="bg-slate-100 dark:bg-slate-800/70 py-3.5 px-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Icons.Profile className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
                                    Inspector: {selectedUser.username}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700/60 rounded-full transition"
                            >
                                <Icons.Close className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Body Form */}
                        <form onSubmit={handleUpdateUser} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            {modalError && (
                                <div className="text-red-600 dark:text-red-400 text-xs font-semibold bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-2.5 rounded-lg flex items-center gap-2">
                                    <Icons.Alert className="w-4 h-4" />
                                    <span>{modalError}</span>
                                </div>
                            )}
                            {modalSuccess && (
                                <div className="text-green-600 dark:text-green-400 text-xs font-semibold bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 p-2.5 rounded-lg flex items-center gap-2">
                                    <Icons.Reports className="w-4 h-4" />
                                    <span>{modalSuccess}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 ml-0.5">
                                    Name Of User
                                </label>
                                <input
                                    type="text"
                                    value={modalFullName}
                                    onChange={e => setModalFullName(e.target.value)}
                                    required
                                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700/60 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 ml-0.5">
                                        Email ID
                                    </label>
                                    <input
                                        type="email"
                                        value={modalEmail}
                                        onChange={e => setModalEmail(e.target.value)}
                                        required
                                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700/60 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 ml-0.5">
                                        Mobile Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={modalMobile}
                                        onChange={e => setModalMobile(e.target.value)}
                                        maxLength={10}
                                        required
                                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700/60 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 ml-0.5">
                                        Assigned District
                                    </label>
                                    <select
                                        value={modalAssignedDistrict}
                                        onChange={e => setModalAssignedDistrict(e.target.value)}
                                        required
                                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700/60 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    >
                                        <option value="">-- Select District --</option>
                                        {uniqueDistricts.map(dist => (
                                            <option key={dist} value={dist}>{dist}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 ml-0.5">
                                        Designation
                                    </label>
                                    <select
                                        value={modalDesignation}
                                        onChange={e => setModalDesignation(e.target.value)}
                                        required
                                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700/60 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    >
                                        <option value="CC">CC (Cluster Coordinator)</option>
                                        <option value="DEF">DEF (District Executive Field)</option>
                                        <option value="ZC">ZC (Zone Coordinator)</option>
                                        <option value="CR">CR (Coordinator Representative)</option>
                                        <option value="PM">PM (Project Manager)</option>
                                        <option value="Other">Other...</option>
                                    </select>
                                </div>
                            </div>

                            {/* Manual modal designation text input if 'Other' is chosen */}
                            {modalDesignation === 'Other' && (
                                <div className="animate-slide-up">
                                    <label className="block text-[9px] font-bold text-yellow-600 uppercase tracking-widest mb-1 ml-0.5">
                                        Enter Manual Designation
                                    </label>
                                    <input
                                        type="text"
                                        value={modalCustomDesignation}
                                        onChange={e => setModalCustomDesignation(e.target.value)}
                                        required
                                        placeholder="e.g. Area Director"
                                        className="w-full bg-yellow-50/20 dark:bg-slate-800 border border-yellow-200 dark:border-slate-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 ml-0.5">
                                    Privilege Access Role
                                </label>
                                <select
                                    value={modalPrivilegeRole}
                                    onChange={e => setModalPrivilegeRole(e.target.value)}
                                    required
                                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700/60 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="user">Standard User (View & Sync Own Data)</option>
                                    <option value="admin">Administrator (Manage System & Users)</option>
                                </select>
                            </div>

                            {/* Optional Password Overrider */}
                            <div className="pt-3 border-t border-gray-100 dark:border-slate-800 mt-2">
                                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase tracking-wider mb-2 text-teal-600 dark:text-teal-400">
                                    Reset Password (Optional)
                                </h4>
                                <p className="text-[9px] text-gray-400 dark:text-gray-500 mb-3">
                                    Leave these fields blank to retain the current password. Fill them out to override with a new password.
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-0.5">
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showModalPassword ? "text" : "password"}
                                                value={modalNewPassword}
                                                onChange={e => setModalNewPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700/60 rounded-lg pl-3 pr-9 py-2 text-gray-700 dark:text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowModalPassword(!showModalPassword)}
                                                className="absolute right-2.5 top-2 text-gray-400 hover:text-slate-600 dark:hover:text-gray-200 focus:outline-none"
                                            >
                                                {showModalPassword ? <EyeOffIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-0.5">
                                            Confirm Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showModalPassword ? "text" : "password"}
                                                value={modalConfirmNewPassword}
                                                onChange={e => setModalConfirmNewPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700/60 rounded-lg pl-3 pr-9 py-2 text-gray-700 dark:text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setSelectedUser(null)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 text-xs font-extrabold rounded-lg shadow-md hover:shadow-lg transition flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {actionLoading ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icons.Reports className="w-4 h-4 text-white" />
                                            <span>Save Changes</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Password Security Inspector Modal */}
            {passwordInspectorUser && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-slate-950/85 backdrop-blur-sm flex justify-center items-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-up text-left">
                        <div className="bg-amber-500 py-3.5 px-6 border-b border-amber-600 flex justify-between items-center text-white">
                            <div className="flex items-center gap-2">
                                <EyeIcon className="w-4 h-4 text-white" />
                                <h3 className="font-extrabold text-xs uppercase tracking-wider">
                                    Password Security Inspector
                                </h3>
                            </div>
                            <button
                                onClick={() => setPasswordInspectorUser(null)}
                                className="p-1 hover:bg-amber-600 rounded-full transition"
                            >
                                <Icons.Close className="w-4 h-4 text-white" />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4 text-left">
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">User ID / Username</div>
                                <div className="text-xs font-bold text-slate-800 dark:text-white font-mono">{passwordInspectorUser.username}</div>
                            </div>
                            
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Name Of User</div>
                                <div className="text-xs font-bold text-slate-800 dark:text-white">{passwordInspectorUser.full_name || 'Portal Member'}</div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                                <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Cryptographic Hash (SHA-256)</div>
                                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 text-xs font-mono break-all border border-gray-200 dark:border-slate-700/60 shadow-inner">
                                    {passwordInspectorUser.raw_password_hash || 'None'}
                                </div>
                            </div>

                            <div className="p-3.5 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30 rounded-xl text-[11px] text-yellow-700 dark:text-yellow-400 leading-relaxed">
                                <strong className="block mb-1">🛡️ Core Security Notice:</strong>
                                Passwords in this portal are cryptographically hashed using <strong>one-way SHA-256</strong> client-side before submission. Plain-text passwords are never sent or stored in the database.
                                <span className="block mt-2 font-medium">
                                    To assign a new password, click the blue profile icon in the table to open the inspector, enter a new password in the reset fields, and click Save.
                                </span>
                            </div>

                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end mt-4">
                                <button
                                    type="button"
                                    onClick={() => setPasswordInspectorUser(null)}
                                    className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2 text-xs font-bold rounded-lg transition text-center"
                                >
                                    Close Inspector
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileCreation;
