import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { supabase, hashPassword } from '../supabaseClient';

const Setup = ({
    onUpload,
    onReset,
    status,
    onGoogleFetch,
    googleLoading,
    onJhpmsSync,
    jhpmsLoading,
    userRole
}) => {
    const [usersList, setUsersList] = useState([]);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('user');
    const [manageError, setManageError] = useState('');
    const [manageSuccess, setManageSuccess] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(false);

    useEffect(() => {
        if (userRole === 'admin') {
            fetchUsers();
        }
    }, [userRole]);

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('username, role, created_at')
                .order('created_at', { ascending: true });

            if (error) throw error;
            setUsersList(data || []);
        } catch (err) {
            console.error("Error fetching users list:", err);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setManageError('');
        setManageSuccess('');
        const u = newUsername.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const p = newPassword.trim();

        if (!u || !p) {
            setManageError('Please fill in both Username and Password.');
            return;
        }

        try {
            const hash = await hashPassword(u, p);
            const { error } = await supabase
                .from('users')
                .insert([{ username: u, password_hash: hash, role: newRole }]);

            if (error) {
                if (error.code === '23505') {
                    setManageError('Username already exists!');
                } else {
                    setManageError(error.message);
                }
                return;
            }

            setManageSuccess(`User "${u}" created successfully!`);
            setNewUsername('');
            setNewPassword('');
            setNewRole('user');
            fetchUsers();
        } catch (err) {
            setManageError(err.message);
        }
    };

    const handleDeleteUser = async (usernameToDelete) => {
        if (usernameToDelete === localStorage.getItem('snet_username')) {
            alert("You cannot delete your own admin account while logged in!");
            return;
        }
        if (!window.confirm(`Are you sure you want to permanently delete user "${usernameToDelete}"?`)) {
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
            setManageSuccess(`User "${usernameToDelete}" deleted successfully!`);
            fetchUsers();
        } catch (err) {
            setManageError(err.message);
        }
    };
    return (
        <div className="max-w-4xl mx-auto p-6 animate-fade-in space-y-6">
            {/* Google Sheets API Secure Gateway Status */}
            <div className="portal-card bg-white/80 backdrop-blur-md border border-white/60 shadow-xl rounded-2xl overflow-hidden">
                <div className="portal-card-header text-sm py-3 px-6 bg-gradient-to-r from-teal-800 to-cyan-900 text-white font-semibold flex items-center gap-2">
                    <Icons.Lock className="w-4 h-4 text-teal-300" />
                    <span>System Security & Integration Status</span>
                </div>
                <div className="p-6 space-y-5 text-left">
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-teal-50/50 border border-teal-100">
                        <div className="p-2.5 bg-teal-600 rounded-xl text-white shadow-md shadow-teal-200 shrink-0">
                            <Icons.Lock className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-bold text-gray-800 text-sm">Secure Server-Side Integration</h4>
                            <p className="text-gray-600 text-xs leading-relaxed">
                                To protect organization secrets, Google Sheets API Keys and spreadsheet credentials are fully encrypted and securely isolated inside the serverless Netlify environment. No API key is ever exposed to client-side code, view source, or browser console. The portal automatically routes synchronization through our secure gateway.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/30 flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <div>
                                <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Sheets Connection</div>
                                <div className="text-xs font-bold text-gray-700">Secure (Proxied)</div>
                            </div>
                        </div>
                        <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/30 flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <div>
                                <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">API Key Protection</div>
                                <div className="text-xs font-bold text-gray-700">Zero Client Exposure</div>
                            </div>
                        </div>
                        <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/30 flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <div>
                                <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Access Mode</div>
                                <div className="text-xs font-bold text-gray-700">Team-Wide Auto-Sync</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Original Import Card */}
            <div className="portal-card">
                <div className="portal-card-header text-sm py-2">System Setup & Data Import</div>
                <div className="p-8 text-center bg-white">
                    <Icons.Setup className="w-12 h-12 text-teal-600 mx-auto mb-4 animate-spin-slow" />
                    <p className="text-gray-500 mb-6 text-xs">Upload your Excel files to populate the portal. Data is securely stored in the Cloud Database (Supabase).</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border border-dashed border-gray-300 rounded p-6 hover:border-teal-500 bg-gray-50 transition relative">
                            <div className="font-bold text-teal-700 mb-2 text-xs uppercase">1. School Master Data</div>
                            <input type="file" onChange={(e) => onUpload(e, 'schools')} accept=".xlsx" className="text-xs w-full cursor-pointer" />

                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <button
                                    onClick={onGoogleFetch}
                                    disabled={googleLoading}
                                    className="w-full bg-blue-50 text-blue-700 text-xs font-bold py-2 rounded border border-blue-200 hover:bg-blue-100 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {googleLoading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                                            Fetching Securely...
                                        </span>
                                    ) : (
                                        <>
                                            <Icons.GoogleSheet className="w-4 h-4" /> Auto-Fetch from Google Sheet
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="border border-dashed border-gray-300 rounded p-6 hover:border-cyan-500 bg-gray-50 transition">
                            <div className="font-bold text-cyan-700 mb-2 text-xs uppercase">2. Visit Reports</div>
                            <input type="file" onChange={(e) => onUpload(e, 'visits')} accept=".xlsx" className="text-xs w-full cursor-pointer" />

                            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                                <button
                                    onClick={onJhpmsSync}
                                    disabled={jhpmsLoading}
                                    className="w-full bg-teal-50 text-teal-700 text-xs font-bold py-2 rounded border border-teal-200 hover:bg-teal-100 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {jhpmsLoading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></span>
                                            Syncing from JHPMS...
                                        </span>
                                    ) : (
                                        <>
                                            <Icons.Visit className="w-4 h-4" /> Sync from JHPMS (Local Proxy)
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 mb-4 flex items-center gap-2 text-teal-800 font-bold border-b border-teal-100 pb-2">
                        <Icons.Performance className="w-5 h-5" />
                        <h3>Field Team Performance Data</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="border border-dashed border-gray-300 rounded p-6 hover:border-amber-500 bg-gray-50 transition relative">
                            <div className="font-bold text-amber-700 mb-2 text-xs uppercase">3. JHPMS Lab Data</div>
                            <input type="file" onChange={(e) => onUpload(e, 'jhpms_lab')} accept=".xlsx" className="text-xs w-full cursor-pointer" />
                        </div>
                        <div className="border border-dashed border-gray-300 rounded p-6 hover:border-purple-500 bg-gray-50 transition relative">
                            <div className="font-bold text-purple-700 mb-2 text-xs uppercase">4. Edustat Data</div>
                            <input type="file" onChange={(e) => onUpload(e, 'edustat')} accept=".xlsx" className="text-xs w-full cursor-pointer" />
                        </div>
                        <div className="border border-dashed border-gray-300 rounded p-6 hover:border-indigo-500 bg-gray-50 transition relative">
                            <div className="font-bold text-indigo-700 mb-2 text-xs uppercase">5. Instructor Profile</div>
                            <input type="file" onChange={(e) => onUpload(e, 'manpower')} accept=".xlsx" className="text-xs w-full cursor-pointer" />
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 p-3 border-t border-gray-200 flex justify-between items-center">
                    <div className="text-xs text-gray-600 font-medium">
                        <span className={status.schools ? "text-green-600" : "text-red-500"}>● Schools: {status.schools}</span>
                        <span className="mx-2">|</span>
                        <span className={status.visits ? "text-green-600" : "text-red-500"}>● Visits: {status.visits}</span>
                        <span className="mx-2">|</span>
                        <span className={status.jhpms_lab ? "text-green-600" : "text-gray-400"}>● Lab Uses: {status.jhpms_lab || 0}</span>
                        <span className="mx-2">|</span>
                        <span className={status.edustat ? "text-green-600" : "text-gray-400"}>● Edustat: {status.edustat || 0}</span>
                        <span className="mx-2">|</span>
                        <span className={status.manpower ? "text-green-600" : "text-gray-400"}>● Manpower: {status.manpower || 0}</span>
                    </div>
                    <button onClick={onReset} className="text-red-600 text-xs font-bold hover:bg-red-50 px-3 py-1 rounded border border-red-200 transition">CLEAR CLOUD DATA</button>
                </div>
            </div>

            {/* Admin User Accounts Management Panel */}
            {userRole === 'admin' && (
                <div className="portal-card bg-white/80 backdrop-blur-md border border-white/60 shadow-xl rounded-2xl overflow-hidden mt-6">
                    <div className="portal-card-header text-sm py-3 px-6 bg-gradient-to-r from-slate-800 to-slate-900 text-white font-semibold flex items-center gap-2">
                        <Icons.Lock className="w-4 h-4 text-teal-300" />
                        <span>User Accounts Management (Admin Console)</span>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                        {/* Create User Form */}
                        <div className="space-y-4 border-r border-gray-100 pr-0 md:pr-6">
                            <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Create New User Account</h4>
                            <form onSubmit={handleCreateUser} className="space-y-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">
                                        User ID / Username
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. vijay, amit"
                                        value={newUsername}
                                        onChange={e => setNewUsername(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-transparent transition shadow-inner"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">
                                        User Password
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="Enter secure password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-transparent transition shadow-inner"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">
                                        Access Privilege Role
                                    </label>
                                    <select
                                        value={newRole}
                                        onChange={e => setNewRole(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-transparent transition"
                                    >
                                        <option value="user">Standard User (View & Sync Own Data)</option>
                                        <option value="admin">Administrator (Manage System & Users)</option>
                                    </select>
                                </div>

                                {manageError && (
                                    <div className="text-red-600 text-xs font-semibold bg-red-50 border border-red-200 p-2 rounded">
                                        ⚠️ {manageError}
                                    </div>
                                )}
                                {manageSuccess && (
                                    <div className="text-green-600 text-xs font-semibold bg-green-50 border border-green-200 p-2 rounded">
                                        ✅ {manageSuccess}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white text-xs uppercase tracking-widest font-extrabold py-2 px-4 rounded-lg shadow transition duration-150"
                                >
                                    Create User Account
                                </button>
                            </form>
                        </div>

                        {/* Existing Users List */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center justify-between">
                                <span>Active Portal Users</span>
                                <button onClick={fetchUsers} className="text-teal-600 hover:text-teal-800 text-[10px] font-bold uppercase">Refresh</button>
                            </h4>

                            {loadingUsers ? (
                                <div className="text-xs text-gray-500 text-center py-10">Loading active users...</div>
                            ) : (
                                <div className="overflow-y-auto max-h-[220px] rounded-lg border border-gray-100 divide-y divide-gray-50 shadow-inner">
                                    {usersList.length === 0 ? (
                                        <div className="text-xs text-gray-400 text-center py-8">No user accounts found.</div>
                                    ) : (
                                        usersList.map(u => (
                                            <div key={u.username} className="p-3 flex items-center justify-between hover:bg-gray-50/50 transition">
                                                <div>
                                                    <div className="font-semibold text-gray-700 text-xs flex items-center gap-1.5">
                                                        <span>{u.username}</span>
                                                        <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-extrabold ${u.role === 'admin' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-teal-50 text-teal-600 border border-teal-100'}`}>
                                                            {u.role}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 mt-0.5">Created: {new Date(u.created_at).toLocaleDateString()}</div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteUser(u.username)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded transition"
                                                    title="Delete User Account"
                                                >
                                                    <Icons.Close className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Setup;
