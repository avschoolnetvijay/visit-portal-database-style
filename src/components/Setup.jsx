import React from 'react';
import { Icons } from './Icons';
import { calculateDateRanges, formatDate } from '../utils';

const Setup = ({
    onUpload,
    onReset,
    status,
    onGoogleFetch,
    googleLoading,
    onJhpmsSync,
    jhpmsLoading,
    userRole,
    schools = [],
    visits = [],
    jhpmsLab = [],
    edustat = [],
    manpower = [],
    ccNameMapping = {},
    onUpdateNameMapping,
    uploadAsSession,
    setUploadAsSession,
    visitsMeta,
    jhpmsLabMeta,
    edustatMeta
}) => {
    const mismatchList = React.useMemo(() => {
        const mismatchListLocal = [];
        const seenMismatches = new Set();
        
        schools.forEach(s => {
            const u = String(s.udise_code || '').trim();
            if (!u) return;
            
            // Find assigned CC in schools
            const assignedCC = String(s.visitor_name || s.visitor || '').trim();
            
            // Find visiting CC name in visits for this school
            const matchVisit = visits.find(v => String(v.udise_code || '').trim() === u);
            const visitorName = matchVisit?.visitor_name ? String(matchVisit.visitor_name).trim() : '-';
            
            if (assignedCC && visitorName && assignedCC !== '-' && visitorName !== '-' && assignedCC.toLowerCase() !== visitorName.toLowerCase()) {
                // If it is already mapped, skip!
                if (ccNameMapping[visitorName] === assignedCC) return;
                
                const mappingKey = `${visitorName}::${assignedCC}`;
                if (!seenMismatches.has(mappingKey)) {
                    seenMismatches.add(mappingKey);
                    mismatchListLocal.push({
                        udise: u,
                        schoolName: s.school_name || s.school || u,
                        rosterName: assignedCC, // holds the assigned CC
                        visitorName: visitorName // holds the visiting CC
                    });
                }
            }
        });
        return mismatchListLocal;
    }, [schools, visits, ccNameMapping]);


    const handleConfirmMatch = (visitorName, rosterName) => {
        const newMapping = { ...ccNameMapping, [visitorName]: rosterName };
        onUpdateNameMapping(newMapping);
    };

    const handleAutoResolve = () => {
        const newMapping = { ...ccNameMapping };
        mismatchList.forEach(m => {
            newMapping[m.visitorName] = m.rosterName;
        });
        onUpdateNameMapping(newMapping);
        alert(`Successfully auto-resolved ${mismatchList.length} CC/UDISE name mismatches! Name trust established.`);
    };

    const getMetaString = (meta) => {
        if (!meta || !meta.last_uploaded_at) return 'No Upload History';
        const d = new Date(meta.last_uploaded_at);
        const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        const dateStr = formatDate(d);
        const userStr = meta.last_uploaded_by || 'Unknown';
        return `${dateStr} ${timeStr} by ${userStr}`;
    };

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

                    {/* Sandbox Mode / Upload Session Mode Banner */}
                    <div className="mb-6 max-w-lg mx-auto bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-left">
                        <label className="flex items-start gap-3 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={uploadAsSession}
                                onChange={(e) => setUploadAsSession(e.target.checked)}
                                className="w-4 h-4 mt-0.5 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                            />
                            <div>
                                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Enable Session Sandbox Mode</span>
                                <span className="text-[10px] text-slate-500 block mt-0.5 font-medium leading-relaxed">
                                    {userRole === 'admin' 
                                        ? "Check this to upload files temporarily to browser cache only. Ideal for sandbox testing without overwriting Central Cloud."
                                        : "Check this to upload files temporarily to browser cache only. Otherwise, your data will be saved as your personal overlay in the Cloud."
                                    }
                                </span>
                            </div>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {userRole === 'admin' ? (
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
                        ) : (
                            <div className="border border-dashed border-gray-300 rounded p-6 bg-gray-100/70 transition relative opacity-70">
                                <div className="font-bold text-teal-700 mb-2 text-xs uppercase flex items-center justify-between">
                                    <span>1. School Master Data</span>
                                    <span className="text-[9px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-black">ADMIN-ONLY</span>
                                </div>
                                <div className="text-[10px] text-gray-500 mt-2 leading-relaxed">Read-Only baseline managed by Admin. Syncs automatically.</div>
                            </div>
                        )}
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="border border-dashed border-gray-300 rounded p-6 hover:border-amber-500 bg-gray-50 transition relative">
                            <div className="font-bold text-amber-700 mb-2 text-xs uppercase">3. JHPMS Lab Data</div>
                            <input type="file" onChange={(e) => onUpload(e, 'jhpms_lab')} accept=".xlsx" className="text-xs w-full cursor-pointer" />
                        </div>
                        {userRole === 'admin' ? (
                            <div className="border border-dashed border-gray-300 rounded p-6 hover:border-purple-600 bg-gray-50 transition relative">
                                <div className="font-bold text-purple-800 mb-2 text-xs uppercase flex items-center justify-between">
                                    <span>4a. Edustat Master Inventory</span>
                                    <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-black">ADMIN-ONLY</span>
                                </div>
                                <input type="file" onChange={(e) => onUpload(e, 'edustat_master')} accept=".xlsx" className="text-xs w-full cursor-pointer" />
                            </div>
                        ) : (
                            <div className="border border-dashed border-gray-300 rounded p-6 bg-gray-100/70 transition relative opacity-70">
                                <div className="font-bold text-purple-800 mb-2 text-xs uppercase flex items-center justify-between">
                                    <span>4a. Edustat Master Inventory</span>
                                    <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-black">ADMIN-ONLY</span>
                                </div>
                                <div className="text-[10px] text-gray-500 mt-2 leading-relaxed">Read-Only baseline managed by Admin. Syncs automatically.</div>
                            </div>
                        )}
                        <div className="border border-dashed border-gray-300 rounded p-6 hover:border-violet-500 bg-gray-50 transition relative">
                            <div className="font-bold text-violet-700 mb-2 text-xs uppercase">4b. Edustat Daily Logs</div>
                            <input type="file" onChange={(e) => onUpload(e, 'edustat')} accept=".xlsx" className="text-xs w-full cursor-pointer" />
                        </div>
                        {userRole === 'admin' ? (
                            <div className="border border-dashed border-gray-300 rounded p-6 hover:border-indigo-500 bg-gray-50 transition relative">
                                <div className="font-bold text-indigo-700 mb-2 text-xs uppercase">5. Instructor Profile</div>
                                <input type="file" onChange={(e) => onUpload(e, 'manpower')} accept=".xlsx" className="text-xs w-full cursor-pointer" />
                            </div>
                        ) : (
                            <div className="border border-dashed border-gray-300 rounded p-6 bg-gray-100/70 transition relative opacity-70">
                                <div className="font-bold text-indigo-700 mb-2 text-xs uppercase flex items-center justify-between">
                                    <span>5. Instructor Profile</span>
                                    <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-black">ADMIN-ONLY</span>
                                </div>
                                <div className="text-[10px] text-gray-500 mt-2 leading-relaxed">Read-Only baseline managed by Admin. Syncs automatically.</div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="bg-gray-50 p-3 border-t border-gray-200 flex justify-between items-center">
                    <div className="text-xs text-gray-600 font-medium flex flex-wrap gap-x-2 gap-y-1">
                        <span className={status.schools ? "text-green-600" : "text-red-500"}>● Schools: {status.schools}</span>
                        <span className="text-gray-300">|</span>
                        <span className={status.visits ? "text-green-600" : "text-red-500"}>● Visits: {status.visits}</span>
                        <span className="text-gray-300">|</span>
                        <span className={status.jhpms_lab ? "text-green-600" : "text-gray-400"}>● Lab Uses: {status.jhpms_lab || 0}</span>
                        <span className="text-gray-300">|</span>
                        <span className={status.edustat_master ? "text-green-600" : "text-gray-400"}>● Edustat Master: {status.edustat_master || 0}</span>
                        <span className="text-gray-300">|</span>
                        <span className={status.edustat ? "text-green-600" : "text-gray-400"}>● Daily Logs: {status.edustat || 0}</span>
                        <span className="text-gray-300">|</span>
                        <span className={status.manpower ? "text-green-600" : "text-gray-400"}>● Manpower: {status.manpower || 0}</span>
                    </div>
                    {userRole === 'admin' ? (
                        <button onClick={onReset} className="text-red-600 text-xs font-bold hover:bg-red-50 px-3 py-1 rounded border border-red-200 transition">CLEAR CLOUD DATA</button>
                    ) : (
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Cloud Secured</div>
                    )}
                </div>
            </div>

            {/* Database Status & Timeline Analyzer Panel */}
            <div className="portal-card bg-white/80 backdrop-blur-md border border-white/60 shadow-xl rounded-2xl overflow-hidden mt-6">
                <div className="portal-card-header text-sm py-3 px-6 bg-gradient-to-r from-teal-800 to-cyan-900 text-white font-semibold flex items-center justify-between">
                    <div className="flex items-center gap-2 font-serif">
                        <Icons.ExecutiveClipboard className="w-4 h-4 text-teal-300 animate-pulse" />
                        <span>Database Status & Timeline Analyzer</span>
                    </div>
                    <span className="text-[10px] bg-teal-900/60 text-teal-200 border border-teal-700/50 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-sans">Bilingual Console</span>
                </div>
                <div className="p-6 bg-white overflow-x-auto">
                    <table className="w-full text-left border-collapse font-sans text-xs">
                        <thead>
                            <tr className="border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                                <th className="pb-3 px-2">Table Name</th>
                                <th className="pb-3 px-2 text-center">Data Scope</th>
                                <th className="pb-3 px-2 text-right">Total Rows</th>
                                <th className="pb-3 px-2">Timeline Coverage (Gaps &gt; 10 Days Split)</th>
                                <th className="pb-3 px-2">Last Upload Log</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                            {/* Schools Roster */}
                            <tr>
                                <td className="py-3 px-2 font-semibold">1. School Master Baseline</td>
                                <td className="py-3 px-2 text-center">
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase">Cloud</span>
                                </td>
                                <td className="py-3 px-2 text-right font-mono font-bold text-teal-700">{schools.length.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-2 text-gray-400 italic">N/A (Geographic baseline)</td>
                                <td className="py-3 px-2 text-gray-500 font-medium">Synced from cloud baseline</td>
                            </tr>
                            {/* Visits Roster */}
                            <tr>
                                <td className="py-3 px-2 font-semibold">2. Coordinator Visit Reports</td>
                                <td className="py-3 px-2 text-center">
                                    {visitsMeta?.is_temp ? (
                                        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase animate-pulse">Session</span>
                                    ) : (
                                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase">Cloud</span>
                                    )}
                                </td>
                                <td className="py-3 px-2 text-right font-mono font-bold text-teal-700">{visits.length.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-2 text-slate-800 font-semibold tracking-wide">
                                    {calculateDateRanges(visits, 'visit_date')}
                                </td>
                                <td className="py-3 px-2 text-gray-500 font-medium">{getMetaString(visitsMeta)}</td>
                            </tr>
                            {/* JHPMS Lab Log */}
                            <tr>
                                <td className="py-3 px-2 font-semibold">3. JHPMS Lab Usage Logs</td>
                                <td className="py-3 px-2 text-center">
                                    {jhpmsLabMeta?.is_temp ? (
                                        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase animate-pulse">Session</span>
                                    ) : (
                                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase">Cloud</span>
                                    )}
                                </td>
                                <td className="py-3 px-2 text-right font-mono font-bold text-teal-700">{jhpmsLab.length.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-2 text-slate-800 font-semibold tracking-wide">
                                    {calculateDateRanges(jhpmsLab, 'date')}
                                </td>
                                <td className="py-3 px-2 text-gray-500 font-medium">{getMetaString(jhpmsLabMeta)}</td>
                            </tr>
                            {/* Edustat Master Inventory */}
                            <tr>
                                <td className="py-3 px-2 font-semibold">4a. EduStat Master Inventory</td>
                                <td className="py-3 px-2 text-center">
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase">Cloud</span>
                                </td>
                                <td className="py-3 px-2 text-right font-mono font-bold text-teal-700">{status.edustat_master.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-2 text-gray-400 italic">N/A (Hardware mapping reference)</td>
                                <td className="py-3 px-2 text-gray-500 font-medium">Synced from cloud inventory</td>
                            </tr>
                            {/* Edustat Daily Logs */}
                            <tr>
                                <td className="py-3 px-2 font-semibold">4b. EduStat Daily PC Logs</td>
                                <td className="py-3 px-2 text-center">
                                    {edustatMeta?.is_temp ? (
                                        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase animate-pulse">Session</span>
                                    ) : (
                                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase">Cloud</span>
                                    )}
                                </td>
                                <td className="py-3 px-2 text-right font-mono font-bold text-teal-700">{edustat.length.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-2 text-slate-800 font-semibold tracking-wide">
                                    {calculateDateRanges(edustat, 'date')}
                                </td>
                                <td className="py-3 px-2 text-gray-500 font-medium">{getMetaString(edustatMeta)}</td>
                            </tr>
                            {/* Manpower Roster */}
                            <tr>
                                <td className="py-3 px-2 font-semibold">5. Instructor Profile Roster</td>
                                <td className="py-3 px-2 text-center">
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase">Cloud</span>
                                </td>
                                <td className="py-3 px-2 text-right font-mono font-bold text-teal-700">{manpower.length.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-2 text-gray-400 italic">N/A (Manpower profile list)</td>
                                <td className="py-3 px-2 text-gray-500 font-medium">Synced from cloud roster</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Setup;
