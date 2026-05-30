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
    userRole,
    schools = [],
    visits = [],
    manpower = [],
    ccNameMapping = {},
    onUpdateNameMapping
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
                        {userRole === 'admin' && (
                            <div className="border border-dashed border-gray-300 rounded p-6 hover:border-purple-600 bg-gray-50 transition relative">
                                <div className="font-bold text-purple-800 mb-2 text-xs uppercase flex items-center justify-between">
                                    <span>4a. Edustat Master Inventory</span>
                                    <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-black">ADMIN-ONLY</span>
                                </div>
                                <input type="file" onChange={(e) => onUpload(e, 'edustat_master')} accept=".xlsx" className="text-xs w-full cursor-pointer" />
                            </div>
                        )}
                        <div className="border border-dashed border-gray-300 rounded p-6 hover:border-violet-500 bg-gray-50 transition relative">
                            <div className="font-bold text-violet-700 mb-2 text-xs uppercase">4b. Edustat Daily Logs</div>
                            <input type="file" onChange={(e) => onUpload(e, 'edustat')} accept=".xlsx" className="text-xs w-full cursor-pointer" />
                        </div>
                        <div className="border border-dashed border-gray-300 rounded p-6 hover:border-indigo-500 bg-gray-50 transition relative">
                            <div className="font-bold text-indigo-700 mb-2 text-xs uppercase">5. Instructor Profile</div>
                            <input type="file" onChange={(e) => onUpload(e, 'manpower')} accept=".xlsx" className="text-xs w-full cursor-pointer" />
                        </div>
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

            {/* Name-Mapping Resolution Section */}
            {schools.length > 0 && (
                <div className="portal-card bg-white/80 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
                    <div className="portal-card-header text-sm py-3 px-6 bg-gradient-to-r from-amber-700 to-orange-800 text-white font-semibold flex items-center justify-between font-serif">
                        <div className="flex items-center gap-2">
                            <Icons.Reports className="w-5 h-5 text-amber-300" />
                            <span>Roster & Visit Name-Mapping Resolution Console ({mismatchList.length} Mismatches)</span>
                        </div>
                        {mismatchList.length > 0 && (
                            <button
                                onClick={handleAutoResolve}
                                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg border border-amber-400 transition"
                            >
                                ⚡ Auto-Resolve All
                            </button>
                        )}
                    </div>
                    
                    <div className="p-6 bg-white space-y-4">
                        <p className="text-gray-500 text-[11px] leading-relaxed">
                            Mismatches appear between the CC visitor name logged in Visits and the Roster instructor name logged in Manpower. Confirming matches maps the names dynamically, establishing high trust in data reporting.
                        </p>
                        
                        <div className="overflow-auto max-h-[300px] border border-slate-100 rounded-xl shadow-inner">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                                        <th className="p-3">UDISE Code</th>
                                        <th className="p-3">School Name</th>
                                        <th className="p-3 text-amber-800">Assigned CC (Schools Master)</th>
                                        <th className="p-3 text-teal-800">Visiting CC (Visit Log)</th>
                                        <th className="p-3 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mismatchList.slice(0, 100).map((item, idx) => (
                                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="p-3 font-mono text-[11px] text-slate-600">{item.udise}</td>
                                            <td className="p-3 font-bold text-slate-800 truncate max-w-[150px]" title={item.schoolName}>{item.schoolName}</td>
                                            <td className="p-3 font-medium text-amber-800">{item.rosterName}</td>
                                            <td className="p-3 font-medium text-teal-800">{item.visitorName}</td>
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={() => handleConfirmMatch(item.visitorName, item.rosterName)}
                                                    className="bg-teal-50 text-teal-700 font-bold px-3 py-1.5 rounded-lg border border-teal-200 hover:bg-teal-100 transition text-[10px]"
                                                >
                                                    Confirm Match
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {mismatchList.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="p-8 text-center text-emerald-600 font-bold italic text-xs">
                                                🎉 All names successfully resolved! Data Trust Index is at High Trust.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {mismatchList.length > 100 && (
                            <div className="text-[10px] text-slate-400 text-center italic mt-2">
                                Showing first 100 mismatches. Click Auto-Resolve to automatically map all remaining CC/instructor pairs.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Setup;
