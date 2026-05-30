import React, { useMemo } from 'react';
import { 
  LineChart, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar 
} from 'recharts';
import { Icons } from './Icons';
import { formatDate, calculateEngagement, calculateStatus } from '../utils';

const StatusCards = ({ buckets, onDrillDown }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
      <div onClick={() => onDrillDown('Not Visited Schools (0 Visits)', buckets.Critical)} className="portal-card p-4 items-center justify-center cursor-pointer hover:border-rose-300 group">
        <span className="text-3xl font-black text-gray-800 mb-1 group-hover:text-rose-600 transition-colors">{buckets.Critical.length}</span>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm ring-2 ring-rose-100"></span>
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide group-hover:text-gray-700">Not Visited</span>
        </div>
      </div>
      <div onClick={() => onDrillDown('Low Visit Schools (<50%)', buckets.Risk)} className="portal-card p-4 items-center justify-center cursor-pointer hover:border-amber-300 group">
        <span className="text-3xl font-black text-gray-800 mb-1 group-hover:text-amber-500 transition-colors">{buckets.Risk.length}</span>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm ring-2 ring-amber-100"></span>
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide group-hover:text-gray-700">Low Visit</span>
        </div>
      </div>
      <div onClick={() => onDrillDown('Partial Pending Schools', buckets.Track)} className="portal-card p-4 items-center justify-center cursor-pointer hover:border-teal-300 group">
        <span className="text-3xl font-black text-gray-800 mb-1 group-hover:text-teal-600 transition-colors">{buckets.Track.length}</span>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-sm ring-2 ring-teal-100"></span>
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide group-hover:text-gray-700">In Progress</span>
        </div>
      </div>
      <div onClick={() => onDrillDown('Target Completed', buckets.Excellent)} className="portal-card p-4 items-center justify-center cursor-pointer hover:border-green-300 group">
        <span className="text-3xl font-black text-gray-800 mb-1 group-hover:text-green-600 transition-colors">{buckets.Excellent.length}</span>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm ring-2 ring-green-100"></span>
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide group-hover:text-gray-700">Completed</span>
        </div>
      </div>
    </div>
  );
};

const PortalCard = ({ title, icon: IconComponent, items, onDrillDown }) => {
  return (
    <div className="portal-card flex flex-col border border-[#7bbcb8] rounded-xl overflow-hidden bg-white shadow-md font-sans">
      {/* Upper Area: Icon on left, Table/Grid on right */}
      <div className="flex-1 flex items-center p-3 gap-3 bg-white">
        {/* Left Icon Area */}
        {IconComponent && (
          <div className="w-12 h-12 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-lg shrink-0">
            <IconComponent className="w-8 h-8 text-[#2d8b7e]" />
          </div>
        )}
        {/* Right Table/Grid Area */}
        <div className="flex-1 overflow-hidden rounded border border-[#7bbcb8]">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="border-b border-[#7bbcb8] bg-slate-50/50">
                {items.map((item, idx) => (
                  <th 
                    key={idx} 
                    className="py-1 px-1 text-[10px] font-extrabold text-[#555] uppercase tracking-wide border-r border-[#7bbcb8] last:border-r-0 text-center"
                    style={{ width: `${100 / items.length}%` }}
                  >
                    {item.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {items.map((item, idx) => (
                  <td 
                    key={idx} 
                    onClick={() => item.drillData && onDrillDown(item.label + " - " + title, item.drillData)}
                    className="py-1.5 px-1 font-black text-sm text-teal-950 bg-[#e8f5f4] cursor-pointer hover:bg-[#c5e6e4] transition-colors border-r border-[#7bbcb8] last:border-r-0 text-center"
                  >
                    {item.value}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      {/* Bottom solid teal footer label */}
      <div className="bg-[#2d8b7e] text-white font-bold text-xs py-1.5 text-center tracking-wider uppercase">
        {title}
      </div>
    </div>
  );
};

const TargetCard = ({ target, achieved, gap, onDrillDown, schools }) => {
  const items = [
    { label: 'Target', value: target, drillData: schools },
    { label: 'Achieved', value: achieved, drillData: schools.filter(s => s.uniqueVisits > 0) },
    { label: 'Gap', value: gap, drillData: schools.filter(s => s.uniqueVisits < s.targetVisits) }
  ];
  
  return (
    <div className="portal-card flex flex-col border border-[#7bbcb8] rounded-xl overflow-hidden bg-white shadow-md font-sans">
      {/* Upper Area: Icon on left, Table/Grid on right */}
      <div className="flex-1 flex items-center p-3 gap-3 bg-white">
        {/* Left Icon Area */}
        <div className="w-12 h-12 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-lg shrink-0">
          <Icons.Target className="w-8 h-8 text-[#2d8b7e]" />
        </div>
        {/* Right Table/Grid Area */}
        <div className="flex-1 overflow-hidden rounded border border-[#7bbcb8]">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="border-b border-[#7bbcb8] bg-slate-50/50">
                {items.map((item, idx) => (
                  <th 
                    key={idx} 
                    className="py-1 px-1 text-[10px] font-extrabold text-[#555] uppercase tracking-wide border-r border-[#7bbcb8] last:border-r-0 text-center"
                    style={{ width: '33.33%' }}
                  >
                    {item.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {items.map((item, idx) => (
                  <td 
                    key={idx} 
                    onClick={() => item.drillData && onDrillDown(item.label + " - Target Analysis", item.drillData)}
                    className="py-1.5 px-1 font-black text-sm text-teal-950 bg-[#e8f5f4] cursor-pointer hover:bg-[#c5e6e4] transition-colors border-r border-[#7bbcb8] last:border-r-0 text-center"
                  >
                    {item.value}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      {/* Bottom solid teal footer label */}
      <div className="bg-[#2d8b7e] text-white font-bold text-xs py-1.5 text-center tracking-wider uppercase">
        Target Analysis
      </div>
    </div>
  );
};

const AIInsightsCard = ({ schools, visits, onDrillDown }) => {
  const insights = useMemo(() => {
    const list = [];
    const visitorStats = {};
    schools.forEach(s => {
      if (s.uniqueVisits > 0) {
        visitorStats[s.visitor_name] = (visitorStats[s.visitor_name] || 0) + s.uniqueVisits;
      }
    });
    const topVisitor = Object.entries(visitorStats).sort((a, b) => b[1] - a[1])[0];
    if (topVisitor) {
      const drill = schools.filter(s => s.visitor_name === topVisitor[0] && s.uniqueVisits > 0);
      list.push({
        type: 'success',
        text: `🚀 Top Performer: ${topVisitor[0]} with ${topVisitor[1]} unique visits.`,
        title: `Visits by ${topVisitor[0]}`,
        data: drill
      });
    }

    const distStats = schools.reduce((acc, s) => {
      if (!acc[s.district]) acc[s.district] = { total: 0, zero: 0 };
      acc[s.district].total++;
      if (s.uniqueVisits === 0) acc[s.district].zero++;
      return acc;
    }, {});
    const criticalDist = Object.entries(distStats).sort((a, b) => (b[1].zero / b[1].total) - (a[1].zero / a[1].total))[0];
    if (criticalDist && criticalDist[1].zero > 0) {
      const drill = schools.filter(s => s.district === criticalDist[0] && s.uniqueVisits === 0);
      list.push({
        type: 'danger',
        text: `⚠️ Action Needed: ${criticalDist[0]} has ${criticalDist[1].zero} unvisited schools.`,
        title: `Unvisited in ${criticalDist[0]}`,
        data: drill
      });
    }

    const overVisited = schools.filter(s => s.uniqueVisits > s.targetVisits + 2);
    if (overVisited.length > 0) {
      list.push({
        type: 'warning',
        text: `🔄 Efficiency Check: ${overVisited.length} schools visited more than required.`,
        title: 'Over-visited Schools',
        data: overVisited
      });
    }

    const today = new Date();
    const dormant = schools.filter(s => s.uniqueVisits > 0 && s.lastVisit && (today - new Date(s.lastVisit)) / (1000 * 60 * 60 * 24) > 60);
    if (dormant.length > 0) {
      list.push({
        type: 'info',
        text: `💤 Idle Lab: ${dormant.length} schools not visited in 60+ days.`,
        title: 'Dormant Schools',
        data: dormant
      });
    }

    return list;
  }, [schools, visits]);

  return (
    <div className="portal-card flex flex-col border border-[#7bbcb8] rounded-xl overflow-hidden bg-white shadow-md font-sans h-full">
      <div className="flex-1 flex items-center p-3 gap-3 bg-white">
        {/* Left Icon Area */}
        <div className="w-12 h-12 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-lg shrink-0">
          <Icons.Robot className="w-8 h-8 text-[#2d8b7e]" />
        </div>
        {/* Right List Area */}
        <div className="flex-1 overflow-y-auto max-h-[96px] rounded border border-[#7bbcb8] p-1.5 bg-[#e8f5f4]">
          <ul className="space-y-1">
            {insights.map((ins, i) => (
              <li
                key={i}
                onClick={() => onDrillDown(ins.title, ins.data)}
                className="flex items-start gap-1 text-[11px] font-semibold text-teal-950 hover:bg-[#c5e6e4] p-1 rounded cursor-pointer transition-colors"
              >
                <span className="leading-tight">{ins.text}</span>
              </li>
            ))}
            {insights.length === 0 && <li className="text-xs text-gray-500 italic p-2 text-center">No critical insights generated yet.</li>}
          </ul>
        </div>
      </div>
      {/* Bottom solid teal footer label */}
      <div className="bg-[#2d8b7e] text-white font-bold text-xs py-1.5 text-center tracking-wider uppercase shrink-0">
        AI Strategic Insights
      </div>
    </div>
  );
};

const Dashboard = ({ data, onDrillDown, startDate, endDate }) => {
  const { totalTarget, totalUnique, totalRecords, schools, visits } = data;

  const statusBuckets = { Critical: [], Risk: [], Track: [], Excellent: [] };
  schools.forEach(s => {
    if (s.status.val === 0) statusBuckets.Critical.push(s);
    if (s.status.val === 1) statusBuckets.Risk.push(s);
    if (s.status.val === 2) statusBuckets.Track.push(s);
    if (s.status.val === 3) statusBuckets.Excellent.push(s);
  });

  const visitTypes = { Smart: [], ICT: [], Other: [] };
  visits.forEach(v => {
    const type = (v.visit_type || "").toString().toLowerCase().trim();
    if (type.includes('smart')) visitTypes.Smart.push(v);
    else if (type.includes('ict')) visitTypes.ICT.push(v);
    else visitTypes.Other.push(v);
  });

  const pendingSchoolsCount = schools.filter(s => s.uniqueVisits < s.targetVisits).length;

  const topDistricts = Object.entries(schools.reduce((acc, s) => {
    if (!acc[s.district]) acc[s.district] = { total: 0, visited: 0 };
    acc[s.district].total++;
    if (s.uniqueVisits > 0) acc[s.district].visited++;
    return acc;
  }, {})).sort((a, b) => (b[1].visited / b[1].total) - (a[1].visited / a[1].total));

  const bestDist = topDistricts.length ? topDistricts[0][0] : "N/A";
  const worstDist = topDistricts.length ? topDistricts[topDistricts.length - 1][0] : "N/A";

  const dailyTrends = {};
  const uniqueVisitTracker = new Set();

  visits.forEach(v => {
    const d = formatDate(v.visit_date);
    if (!dailyTrends[d]) dailyTrends[d] = { name: d, Smart: 0, ICT: 0, Total: 0 };

    const t = (v.visit_type || "").toLowerCase();
    if (t.includes('smart')) dailyTrends[d].Smart++;
    if (t.includes('ict')) dailyTrends[d].ICT++;

    // Defensive check to avoid crash on null date
    const rawDate = (v.visit_date || '').split('T')[0];
    if (rawDate) {
      const key = `${rawDate}_${v.udise_code}`;
      if (!uniqueVisitTracker.has(key)) {
        uniqueVisitTracker.add(key);
        dailyTrends[d].Total++;
      }
    }
  });

  const lineChartData = Object.values(dailyTrends).sort((a, b) => {
    const [d1, m1, y1] = a.name.split('-');
    const [d2, m2, y2] = b.name.split('-');
    return new Date(y1, m1 - 1, d1) - new Date(y2, m2 - 1, d2);
  });

  const velocityData = useMemo(() => {
    const s = new Date(startDate);
    const e = new Date(endDate);

    if (isNaN(s.getTime()) || isNaN(e.getTime())) return [];

    const totalDays = Math.max(1, (e - s) / (1000 * 60 * 60 * 24) + 1);
    const dailyRate = totalTarget / totalDays;

    const data = [];
    let cumActual = 0;
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const visitCounts = {};
    const uniqueVisitSet = new Set();

    visits.forEach(v => {
      // Defensive check to avoid crash on null date
      const dKey = (v.visit_date || '').split('T')[0];
      if (dKey) {
        const uniqueKey = `${v.udise_code}_${dKey}`;
        if (!uniqueVisitSet.has(uniqueKey)) {
          uniqueVisitSet.add(uniqueKey);
          visitCounts[dKey] = (visitCounts[dKey] || 0) + 1;
        }
      }
    });

    let current = new Date(s);
    let dayIndex = 0;

    while (current <= e) {
      const dStr = current.toISOString().split('T')[0];
      const label = formatDate(dStr);

      dayIndex++;
      const cumTarget = Math.round(dailyRate * dayIndex);

      if (visitCounts[dStr]) cumActual += visitCounts[dStr];
      const isFuture = current > today;

      data.push({
        name: label,
        Target: cumTarget,
        Actual: isFuture ? null : cumActual
      });

      current.setDate(current.getDate() + 1);
    }
    return data;
  }, [startDate, endDate, totalTarget, visits]);

  const visitorLeaderboard = useMemo(() => {
    if (!schools) return [];
    const map = {};
    schools.forEach(s => {
      const vName = s.visitor_name || 'Unknown';
      if (!map[vName]) map[vName] = { name: vName, assigned: 0, completed: 0 };
      map[vName].assigned++;
      if (s.uniqueVisits >= s.targetVisits) map[vName].completed++;
    });

    return Object.values(map)
      .map(v => ({
        ...v,
        score: v.assigned > 0 ? Math.round((v.completed / v.assigned) * 100) : 0
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [schools]);

  return (
    <div className="space-y-4 animate-fade-in">
      <StatusCards buckets={statusBuckets} onDrillDown={onDrillDown} />

      <div className="portal-card p-3 flex items-center justify-between !flex-row bg-white/40 border-teal-100">
        <div className="flex items-center gap-3">
          <span className="bg-teal-600 text-white px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider shadow-sm shadow-teal-200">Report Summary</span>
          <div className="h-6 w-px bg-teal-200/50"></div>
          <div className="text-xs text-gray-700 flex gap-4">
            <span className="flex items-center gap-1.5"><Icons.Target className="w-3.5 h-3.5 text-teal-600" /> <strong className="text-teal-800">Best District:</strong> {bestDist}</span>
            <span className="flex items-center gap-1.5"><Icons.Alert className="w-3.5 h-3.5 text-red-500" /> <strong className="text-red-700">Needs Focus:</strong> {worstDist}</span>
            <span className="flex items-center gap-1.5"><Icons.Analytics className="w-3.5 h-3.5 text-blue-600" /> <strong className="text-blue-700">Smart/ICT Ratio:</strong> {visitTypes.Smart.length}:{visitTypes.ICT.length}</span>
          </div>
        </div>
        <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Filtered View</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <PortalCard
          title="School Coverage"
          icon={Icons.SchoolSolid}
          onDrillDown={onDrillDown}
          items={[
            { label: "Allocated", value: schools.length, drillData: schools },
            { label: "Active", value: schools.length - statusBuckets.Critical.length, color: "text-green-600", drillData: schools.filter(s => s.uniqueVisits > 0) },
            { label: "Pending", value: pendingSchoolsCount, color: "text-red-600", drillData: schools.filter(s => s.uniqueVisits < s.targetVisits) }
          ]}
        />
        <PortalCard
          title="Visit Records"
          icon={Icons.Visit}
          onDrillDown={onDrillDown}
          items={[
            { label: "Smart", value: visitTypes.Smart.length, color: "text-teal-600", drillData: visitTypes.Smart },
            { label: "ICT Lab", value: visitTypes.ICT.length, color: "text-blue-600", drillData: visitTypes.ICT },
            { label: "Total", value: totalRecords, drillData: visits }
          ]}
        />
        <TargetCard
          target={totalTarget}
          achieved={totalUnique}
          gap={Math.max(0, totalTarget - totalUnique)}
          onDrillDown={onDrillDown}
          schools={schools}
        />
        <AIInsightsCard schools={schools} visits={visits} onDrillDown={onDrillDown} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 portal-card">
          <div className="portal-card-header flex justify-between items-center text-white bg-teal-600">
            <h3 className="text-xs font-bold uppercase flex items-center gap-2 text-white">
              <Icons.Analytics className="w-6 h-6 shrink-0" /> Coverage Velocity
            </h3>
            <div className="flex gap-4 text-xs text-white">
              <span className="flex items-center gap-1.5 font-medium text-white">
                <span className="w-6 h-0.5 border-t border-dashed border-white/60"></span> Target
              </span>
              <span className="flex items-center gap-1.5 font-bold text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-white"></span> Actual
              </span>
            </div>
          </div>
          <div className="p-4 flex-1">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={velocityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                    minTickGap={30}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Line name="Target Goal" type="monotone" dataKey="Target" stroke="#cbd5e1" strokeDasharray="4 4" dot={false} strokeWidth={2} activeDot={false} />
                  <Line name="Actual Visits" type="monotone" dataKey="Actual" stroke="#0d9488" strokeWidth={3} dot={{ r: 3, fill: '#0d9488', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="portal-card p-0 flex flex-col">
          <div className="portal-card-header bg-gradient-to-r from-amber-500 to-amber-600 !text-white flex items-center justify-center gap-2 py-3 shadow-sm">
            <Icons.Performance className="w-6 h-6 shrink-0" /> TOP PERFORMERS
          </div>
          <div className="p-3 overflow-y-auto flex-1 h-64">
            {visitorLeaderboard.map((v, i) => (
              <div key={i} className="flex items-center justify-between border-b border-gray-100 last:border-0 py-3 hover:bg-amber-50/50 transition rounded-lg px-2 group">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ring-2 ring-white
                    ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-800' : 'bg-teal-600'}`}>
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-800 group-hover:text-amber-800 transition-colors">{v.name}</div>
                    <div className="text-[10px] text-gray-400 font-medium">{v.completed} / {v.assigned} Schools</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-teal-700">{v.score}%</div>
                  <div className="text-[9px] text-gray-400 uppercase font-bold">Done</div>
                </div>
              </div>
            ))}
            {visitorLeaderboard.length === 0 && <div className="text-xs text-gray-400 text-center py-8 italic">No visit data available to rank.</div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 portal-card">
          <div className="portal-card-header flex justify-between items-center text-white bg-teal-600">
            <h3 className="text-xs font-bold uppercase flex items-center gap-2 text-white">
              <Icons.Analytics className="w-6 h-6 shrink-0" /> Daily Trend Analysis
            </h3>
            <div className="flex gap-3 text-xs text-white">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-300"></span> Smart</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-300"></span> ICT</span>
            </div>
          </div>
          <div className="p-4 flex-1">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineChartData}>
                  <defs>
                    <linearGradient id="colorSmart" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8} /><stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorICT" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} /><stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} minTickGap={30} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '11px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="Smart" stroke="#0d9488" fillOpacity={1} fill="url(#colorSmart)" strokeWidth={2} />
                  <Area type="monotone" dataKey="ICT" stroke="#0891b2" fillOpacity={1} fill="url(#colorICT)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="portal-card flex flex-col">
          <div className="portal-card-header flex items-center gap-2">
            <Icons.Analytics className="w-6 h-6 shrink-0" /> DISTRICT HEATMAP
          </div>
          <div className="h-full overflow-y-auto pr-2 pl-3 py-3">
            {topDistricts.map(([dist, d], i) => {
              const pct = Math.round((d.visited / d.total) * 100);
              return (
                <div key={i} className="flex items-center justify-between mb-3 text-xs group">
                  <span className="font-bold text-gray-600 w-1/3 truncate group-hover:text-teal-700 transition-colors" title={dist}>{dist}</span>
                  <div className="w-1/2 bg-gray-100 rounded-full h-2.5 mx-2 relative overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${pct > 80 ? 'bg-gradient-to-r from-teal-400 to-teal-600' : pct > 50 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gradient-to-r from-red-400 to-red-600'}`} style={{ width: `${pct}%` }}></div>
                  </div>
                  <span className="w-8 text-right font-bold text-gray-800">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
