import React from 'react';
import { Icons } from './Icons';

const Setup = ({
    onUpload,
    onReset,
    status,
    onGoogleFetch,
    googleLoading,
    onJhpmsSync,
    jhpmsLoading
}) => {
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
                    <p className="text-gray-500 mb-6 text-xs">Upload your Excel files to populate the portal. Data is stored locally in your browser.</p>

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
                </div>
                <div className="bg-gray-50 p-3 border-t border-gray-200 flex justify-between items-center">
                    <div className="text-xs text-gray-600 font-medium">
                        <span className={status.schools ? "text-green-600" : "text-red-500"}>● Schools: {status.schools}</span>
                        <span className="mx-2">|</span>
                        <span className={status.visits ? "text-green-600" : "text-red-500"}>● Visits: {status.visits}</span>
                    </div>
                    <button onClick={onReset} className="text-red-600 text-xs font-bold hover:bg-red-50 px-3 py-1 rounded border border-red-200 transition">CLEAR DATA</button>
                </div>
            </div>
        </div>
    );
};

export default Setup;
