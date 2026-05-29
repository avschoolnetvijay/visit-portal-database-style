import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { supabase, hashPassword } from '../supabaseClient';

const ProfileCreation = ({ userRole }) => {
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

    if (userRole !== 'admin') {
        return (
            <div className="max-w-4xl mx-auto p-6 text-center text-gray-500">
                ⚠️ Access Denied: Administrator privileges are required to view this module.
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 animate-fade-in">
            {/* Admin User Accounts Management Panel */}
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
        </div>
    );
};

export default ProfileCreation;
