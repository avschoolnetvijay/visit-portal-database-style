import React from 'react';
import { Icons } from './Icons';

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
    return (
        <div className="max-w-4xl mx-auto p-6 animate-fade-in space-y-6">
            {/* Setup & Import Card */}
            <div className="portal-card bg-white/80 backdrop-blur-md border border-white/60 shadow-xl rounded-2xl overflow-hidden">
                <div className="portal-card-header text-sm py-3 px-6 bg-gradient-to-r from-teal-800 to-cyan-900 text-white font-semibold flex items-center gap-2">
                    <Icons.Setup className="w-4 h-4 text-teal-300" />
                    <span>System Setup & Data Import</span>
                </div>
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
        </div>
    );
};

export default Setup;
