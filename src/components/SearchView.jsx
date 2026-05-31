import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid, Legend, ComposedChart, Line } from 'recharts';
import { Icons } from './Icons';
import { formatDate } from '../utils';

const PremiumChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const title = label || payload[0]?.payload?.date || payload[0]?.payload?.name || "";
  return (
    <div className="bg-[#111827] text-white p-3 rounded-xl shadow-2xl border border-[#374151] text-xs font-sans min-w-[180px] pointer-events-none select-none z-50">
      {title && (
        <p className="font-extrabold text-[#f3f4f6] text-sm mb-2 border-b border-[#374151] pb-1.5">
          {title}
        </p>
      )}
      <div className="space-y-1.5">
        {payload.map((p, idx) => {
          const bulletColor = p.color || '#0d9488';
          const name = p.name === 'Total' ? 'Total (Unique)' : p.name;
          return (
            <div key={idx} className="flex items-center justify-between gap-4 font-bold py-0.5">
              <div className="flex items-center gap-1.5 text-[#d1d5db]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: bulletColor }} />
                <span>{name}:</span>
              </div>
              <span className="font-black text-white">
                {typeof p.value === 'number' ? (Number.isInteger(p.value) ? p.value : p.value.toFixed(1)) : p.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CustomizedLabel = (props) => {
  const { x, y, value, fill, offset = -8 } = props;
  if (value === undefined || value === null || value === 0) return null;
  return (
    <text
      x={x}
      y={y + offset}
      fill={fill}
      fontSize={10}
      fontWeight="bold"
      textAnchor="middle"
      textRendering="geometricPrecision"
      style={{ fontFamily: "'Times New Roman', Times, serif" }}
      className="pointer-events-none select-none"
    >
      {Number(value).toLocaleString('en-IN')}
    </text>
  );
};

/* ───── Interactive Clickable Legend Component ───── */
const ClickableLegend = ({ payload, hiddenKeys, onLegendClick }) => {
  if (!payload) return null;
  return (
    <div className="flex flex-wrap justify-center gap-6 mb-3 pl-3 select-none no-print">
      {payload.map((entry) => {
        const { value, color, dataKey } = entry;
        const key = dataKey || value;
        const isHidden = !!hiddenKeys[key];
        
        // Match line colors (Smart Visit is #0088fe -> #378ADD, ICT Visit is #00c49f -> #1D9E75)
        const displayColor = key === 'Smart Visit' ? '#378ADD' : '#1D9E75';
        
        return (
          <div
            key={key}
            onClick={() => onLegendClick(key)}
            className="flex items-center gap-1.5 cursor-pointer transition-all duration-200"
            style={{
              opacity: isHidden ? 0.35 : 1,
              textDecoration: isHidden ? 'line-through' : 'none',
            }}
          >
            <span 
              className="w-2.5 h-2.5 rounded-full inline-block shrink-0" 
              style={{ backgroundColor: displayColor }} 
            />
            <span 
              className="text-xs font-bold"
              style={{ color: displayColor }}
            >
              {value}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const SearchView = ({ schools, visits, startDate, endDate, onDrillDown, darkMode = false }) => {
  const [searchType, setSearchType] = useState('school'); // 'school' or 'visitor'
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [listFilter, setListFilter] = useState('All'); // 'All', 'Completed', 'Pending'
  const [hiddenKeys, setHiddenKeys] = useState({});
  const [chartMenuOpen, setChartMenuOpen] = useState(false);

  const handleLegendClick = (dataKey) => {
    setHiddenKeys(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
  };

  const handleExportCSV = () => {
    if (!visitorData || !visitorData.monthlyStatusData || visitorData.monthlyStatusData.length === 0) return;
    const headers = ['Month', 'Smart Visit', 'ICT Visit'];
    const rows = visitorData.monthlyStatusData.map(d => [
      d.name,
      d['Smart Visit'] || 0,
      d['ICT Visit'] || 0
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `month_wise_visit_status_${visitorData.name.replace(/\s+/g, '_')}_${startDate || 'start'}_to_${endDate || 'end'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPNG = () => {
    alert("Exporting high-resolution PNG... Click OK to save standard chart image.");
  };

  const maxLogDate = useMemo(() => {
    let maxD = new Date();
    if (visits && visits.length > 0) {
      const dates = visits.map(v => new Date(v.visit_date)).filter(d => !isNaN(d.getTime()));
      if (dates.length > 0) {
        maxD = new Date(Math.max(...dates));
      }
    }
    return maxD;
  }, [visits]);

  const startMonthStr = useMemo(() => {
    const s = new Date(startDate);
    return isNaN(s.getTime()) ? "Start" : s.toLocaleString('en-US', { month: 'short', year: '2-digit' }).replace(' ', '-');
  }, [startDate]);

  const endMonthStr = useMemo(() => {
    const e = new Date(endDate);
    return isNaN(e.getTime()) ? "End" : e.toLocaleString('en-US', { month: 'short', year: '2-digit' }).replace(' ', '-');
  }, [endDate]);

  // Filter Suggestions
  useEffect(() => {
    if (searchTerm && searchTerm.length > 1 && !selectedItem) {
      const lowerTerm = searchTerm.toLowerCase();
      let matches = [];

      if (searchType === 'school') {
        matches = schools.filter(s =>
          (s.school_name && s.school_name.toLowerCase().includes(lowerTerm)) ||
          (s.udise_code && String(s.udise_code).includes(lowerTerm)) ||
          (s.snet_school_code && String(s.snet_school_code).toLowerCase().includes(lowerTerm))
        ).slice(0, 10);
      } else {
        const uniqueVisitors = [...new Set(schools.map(s => s.visitor_name))].filter(v => v && v.toLowerCase().includes(lowerTerm));
        matches = uniqueVisitors.map(v => ({ name: v, type: 'visitor' })).slice(0, 10);
      }
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  }, [searchTerm, schools, selectedItem, searchType]);

  const handleSelect = (item) => {
    setSelectedItem(item);
    const name = searchType === 'school' ? item.school_name : item.name;
    setSearchTerm(name || "");
    setSuggestions([]);
    setListFilter('All'); // Reset filter on new selection
  };

  const handleClear = () => {
    setSearchTerm("");
    setSelectedItem(null);
    setSuggestions([]);
    setListFilter('All');
  };

  const switchToSchool = (schoolName) => {
    const schoolObj = schools.find(s => s.school_name === schoolName);
    if (schoolObj) {
      setSearchType('school');
      handleSelect(schoolObj);
    }
  };

  // Calculate Insights for Selected School
  const schoolData = useMemo(() => {
    if (!selectedItem || searchType !== 'school') return null;
    const school = selectedItem;

    const target = school.targetVisits || 1;
    const uniqueCount = school.uniqueVisits || 0;
    const gap = Math.max(0, target - uniqueCount);

    let status = 'Pending';
    if (uniqueCount >= target) status = 'Completed';
    else if (uniqueCount === 0) status = 'Not Visited';
    else status = 'In Progress';

    const udise = String(school.udise_code);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const sVisits = visits.filter(v => {
      const d = new Date(v.visit_date);
      return String(v.udise_code) === udise && d >= start && d <= end;
    }).sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));

    const lastVisitDate = sVisits.length > 0 ? new Date(sVisits[0].visit_date) : null;
    const daysSinceLast = lastVisitDate ? Math.floor((maxLogDate - lastVisitDate) / (1000 * 60 * 60 * 24)) : 999;

    const insights = [];
    if (uniqueCount === 0) insights.push({ t: 'Critical', m: 'No visits recorded in this period.' });
    else if (status === 'Completed') insights.push({ t: 'Success', m: 'Target achieved! Great job.' });
    else insights.push({ t: 'Warning', m: `${gap} more visits needed to hit target.` });

    if (uniqueCount > 0 && daysSinceLast > 45) insights.push({ t: 'Alert', m: `Dormant: No visit in ${daysSinceLast} days.` });

    return {
      visits: sVisits,
      uniqueCount,
      target,
      gap,
      status,
      insights,
      lastVisit: lastVisitDate ? formatDate(sVisits[0].visit_date) : 'Never'
    };
  }, [selectedItem, visits, startDate, endDate, searchType]);

  // Calculate Insights for Selected Visitor
  const visitorData = useMemo(() => {
    if (!selectedItem || searchType !== 'visitor') return null;
    const visitorName = selectedItem.name;

    const assignedSchools = schools.filter(s => s.visitor_name === visitorName);
    const totalAssigned = assignedSchools.length;
    const completedSchools = assignedSchools.filter(s => s.uniqueVisits >= s.targetVisits).length;
    const pendingSchools = totalAssigned - completedSchools;
    const completionRate = totalAssigned > 0 ? Math.round((completedSchools / totalAssigned) * 100) : 0;

    const allVisitorStats = {};
    schools.forEach(s => {
      const vName = s.visitor_name || 'Unknown';
      if (!allVisitorStats[vName]) allVisitorStats[vName] = { assigned: 0, completed: 0 };
      allVisitorStats[vName].assigned++;
      if (s.uniqueVisits >= s.targetVisits) allVisitorStats[vName].completed++;
    });

    const rankedList = Object.entries(allVisitorStats)
      .map(([name, stats]) => ({
        name,
        rate: stats.assigned > 0 ? (stats.completed / stats.assigned) * 100 : 0
      }))
      .sort((a, b) => b.rate - a.rate);

    const rank = rankedList.findIndex(v => v.name === visitorName) + 1;
    const totalVisitors = rankedList.length;

    const activityMap = {};
    const uniqueVisitTracker = new Set();
    const schoolVisitCounts = {};
    let complianceGaps = 0;
    const complianceList = [];
    let allDates = new Set();

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    visits.forEach(v => {
      const vDate = new Date(v.visit_date);

      if (v.visitor_name === visitorName && vDate >= start && vDate <= end) {
        const d = formatDate(v.visit_date);
        
        // Defensive split check to prevent crash on null visit_date
        const rawDate = (v.visit_date || '').split('T')[0];
        if (rawDate) {
          allDates.add(rawDate);

          if (!activityMap[d]) activityMap[d] = { date: d, Total: 0, Smart: 0, ICT: 0, visits: [] };
          activityMap[d].visits.push(v);

          const type = (v.visit_type || "").toLowerCase();
          if (type.includes('smart')) activityMap[d].Smart++;
          if (type.includes('ict')) activityMap[d].ICT++;

          const uniqueKey = `${rawDate}_${v.udise_code}`;
          if (!uniqueVisitTracker.has(uniqueKey)) {
            uniqueVisitTracker.add(uniqueKey);
            activityMap[d].Total++;

            schoolVisitCounts[v.school_name] = (schoolVisitCounts[v.school_name] || 0) + 1;

            const hasSmart = visits.some(ov =>
              ov.visitor_name === visitorName &&
              (ov.visit_date || '').startsWith(rawDate) &&
              ov.udise_code === v.udise_code &&
              (ov.visit_type || "").toLowerCase().includes('smart')
            );
            const hasICT = visits.some(ov =>
              ov.visitor_name === visitorName &&
              (ov.visit_date || '').startsWith(rawDate) &&
              ov.udise_code === v.udise_code &&
              (ov.visit_type || "").toLowerCase().includes('ict')
            );

            if (!(hasSmart && hasICT)) {
              complianceGaps++;
              let issue = "Missed Both Facilities";
              if (hasSmart) issue = "Missed ICT Lab";
              else if (hasICT) issue = "Missed Smart Class";
              complianceList.push({
                school_name: v.school_name,
                district: v.district,
                visit_date: v.visit_date,
                gap_reason: issue,
                uniqueVisits: "⚠"
              });
            }
          }
        }
      }
    });

    const chartData = Object.values(activityMap).sort((a, b) => {
      const [d1, m1, y1] = a.date.split('-');
      const [d2, m2, y2] = b.date.split('-');
      return new Date(y1, m1 - 1, d1) - new Date(y2, m2 - 1, d2);
    });

    const insights = [];

    let mostVisitedSchool = "None";
    let maxVisits = 0;
    Object.entries(schoolVisitCounts).forEach(([name, count]) => {
      if (count > maxVisits) { maxVisits = count; mostVisitedSchool = name; }
    });
    if (maxVisits > 0) {
      const topSchoolVisits = visits.filter(v => v.visitor_name === visitorName && v.school_name === mostVisitedSchool && new Date(v.visit_date) >= start && new Date(v.visit_date) <= end);
      insights.push({
        t: 'Most Visited',
        m: `${mostVisitedSchool} visited ${maxVisits} times.`,
        drillTitle: `Visits to ${mostVisitedSchool}`,
        drillData: topSchoolVisits,
        type: 'info'
      });
    }

    const neverVisited = assignedSchools.filter(s => s.uniqueVisits === 0);
    if (neverVisited.length > 0) {
      insights.push({
        t: 'Zero Touch',
        m: `${neverVisited.length} assigned schools have NEVER been visited.`,
        drillTitle: `Unvisited Schools by ${visitorName}`,
        drillData: neverVisited,
        type: 'danger'
      });
    }

    const sortedDates = Array.from(allDates).sort();
    let maxGapDays = 0;
    let gapStartStr = null;
    let gapEndStr = null;
    const gapDrillData = [];

    if (sortedDates.length > 1) {
      for (let i = 1; i < sortedDates.length; i++) {
        const d1 = new Date(sortedDates[i - 1]);
        const d2 = new Date(sortedDates[i]);
        const diffTime = Math.abs(d2 - d1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > maxGapDays) {
          maxGapDays = diffDays;
          gapStartStr = sortedDates[i - 1];
          gapEndStr = sortedDates[i];
        }
      }
    } else if (sortedDates.length === 1) {
      const last = new Date(sortedDates[0]);
      const diff = Math.ceil(Math.abs(maxLogDate - last) / (1000 * 60 * 60 * 24));
      if (diff > maxGapDays) {
        maxGapDays = diff;
        gapStartStr = sortedDates[0];
        gapEndStr = maxLogDate.toISOString().split('T')[0];
      }
    }

    if (maxGapDays > 1 && gapStartStr && gapEndStr) {
      let curr = new Date(gapStartStr);
      curr.setDate(curr.getDate() + 1);
      const endD = new Date(gapEndStr);

      while (curr < endD) {
        gapDrillData.push({
          label: "No Visit Logged",
          district: "-",
          visit_type: "Inactive",
          uniqueVisits: 0,
          visit_date: curr.toISOString()
        });
        curr.setDate(curr.getDate() + 1);
      }
    }

    if (gapDrillData.length > 10) {
      insights.push({
        t: 'Longest Gap',
        m: `Inactive stretch of ${gapDrillData.length} days detected.`,
        drillTitle: `Inactive Dates (${formatDate(gapStartStr)} to ${formatDate(gapEndStr)})`,
        drillData: gapDrillData,
        type: 'warning'
      });
    }

    if (rank === 1) insights.push({ t: 'Champion', m: 'Currently the #1 ranked visitor!', type: 'success' });

    let displayList = assignedSchools;
    if (listFilter === 'Completed') displayList = assignedSchools.filter(s => s.uniqueVisits >= s.targetVisits);
    else if (listFilter === 'Pending') displayList = assignedSchools.filter(s => s.uniqueVisits < s.targetVisits);

    // Group visits by Month
    const monthMap = {};
    let currMonth = new Date(start);
    const endMonth = new Date(end);
    
    while (currMonth <= endMonth) {
      const mLabel = currMonth.toLocaleString('en-US', { month: 'short', year: '2-digit' }).replace(' ', '-');
      monthMap[mLabel] = { name: mLabel, 'Smart Visit': 0, 'ICT Visit': 0, sortKey: currMonth.getFullYear() * 12 + currMonth.getMonth() };
      currMonth.setMonth(currMonth.getMonth() + 1);
    }
    
    visits.forEach(v => {
      const vDate = new Date(v.visit_date);
      if (v.visitor_name === visitorName && vDate >= start && vDate <= end) {
        const mLabel = vDate.toLocaleString('en-US', { month: 'short', year: '2-digit' }).replace(' ', '-');
        if (!monthMap[mLabel]) {
          monthMap[mLabel] = { name: mLabel, 'Smart Visit': 0, 'ICT Visit': 0, sortKey: vDate.getFullYear() * 12 + vDate.getMonth() };
        }
        const type = (v.visit_type || "").toLowerCase();
        if (type.includes('smart')) {
          monthMap[mLabel]['Smart Visit']++;
        }
        if (type.includes('ict')) {
          monthMap[mLabel]['ICT Visit']++;
        }
      }
    });
    
    const monthlyStatusData = Object.values(monthMap).sort((a, b) => a.sortKey - b.sortKey);

    return {
      name: visitorName,
      assigned: assignedSchools,
      displayList,
      totalAssigned,
      completed: completedSchools,
      pending: pendingSchools,
      rate: completionRate,
      insights,
      chartData,
      rank,
      totalVisitors,
      complianceGaps,
      complianceList,
      monthlyStatusData
    };
  }, [selectedItem, schools, visits, searchType, listFilter, startDate, endDate]);

  const handleChartClick = (data) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const payload = data.activePayload[0].payload;
      const date = payload.date;
      const visitList = payload.visits || [];
      onDrillDown(`Visits on ${date} by ${selectedItem.name}`, visitList);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto h-full flex flex-col">
      <div className="relative mb-6 z-50">
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => { setSearchType('school'); setSearchTerm(''); setSelectedItem(null); setListFilter('All'); }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${searchType === 'school' ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-600'}`}
          >
            Search School
          </button>
          <button
            onClick={() => { setSearchType('visitor'); setSearchTerm(''); setSelectedItem(null); setListFilter('All'); }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${searchType === 'visitor' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}
          >
            Search Visitor
          </button>
        </div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
          {searchType === 'school' ? 'Find School Performance' : 'Find Visitor Performance'} ({formatDate(startDate)} to {formatDate(endDate)})
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {searchType === 'school' ? <Icons.GlobalSearch className="h-5 w-5 text-gray-400" /> : <Icons.Users className="h-5 w-5 text-gray-400" />}
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 sm:text-sm shadow-sm"
            placeholder={searchType === 'school' ? "Search by UDISE, SNET Code, or School Name..." : "Search by Visitor Name..."}
            value={searchTerm || ""}
            onChange={(e) => { setSearchTerm(e.target.value); setSelectedItem(null); }}
          />
          {searchTerm && (
            <button onClick={handleClear} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
              <Icons.Close className="h-5 w-5" />
            </button>
          )}
        </div>

        {suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-850 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm border border-gray-100 dark:border-slate-700">
            {suggestions.map((s, i) => (
              <li
                key={i}
                onClick={() => handleSelect(s)}
                className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-teal-50 dark:hover:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700/50 last:border-0"
              >
                {searchType === 'school' ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block truncate font-medium text-gray-900 dark:text-slate-200">{s.school_name}</span>
                      <span className="block truncate text-xs text-gray-500 dark:text-slate-400">UDISE: {s.udise_code}</span>
                    </div>
                    <span className="text-xs font-bold text-teal-600 bg-teal-100 dark:bg-teal-950/50 px-2 py-1 rounded">Select</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="block truncate font-medium text-indigo-900 dark:text-indigo-350">{s.name}</span>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-100 dark:bg-indigo-950/50 px-2 py-1 rounded">View Profile</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* SCHOOL PROFILE VIEW */}
      {searchType === 'school' && selectedItem && schoolData && (
        <div className="animate-fade-in flex-1 overflow-auto space-y-4 text-left">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-teal-600 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{selectedItem.school_name}</h2>
              <div className="flex gap-4 text-xs text-gray-500 mt-1">
                <span className="bg-gray-100 px-2 py-1 rounded">UDISE: {selectedItem.udise_code}</span>
                <span className="bg-gray-100 px-2 py-1 rounded">Dist: {selectedItem.district}</span>
                <span className="bg-gray-100 px-2 py-1 rounded">Block: {selectedItem.block}</span>
              </div>
              <div className="mt-2 text-sm text-gray-700">
                Assigned Visitor: <span className="font-bold text-teal-700">{selectedItem.visitor_name || "Unassigned"}</span>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${schoolData.status === 'Completed' ? 'text-green-600' : schoolData.status === 'Not Visited' ? 'text-red-500' : 'text-orange-500'}`}>
                {schoolData.status}
              </div>
              <div className="text-xs text-gray-400 uppercase">Current Status</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded shadow border border-gray-100 text-center">
              <div className="text-xs text-gray-500 uppercase font-bold">Target</div>
              <div className="text-2xl font-bold text-gray-800">{schoolData.target}</div>
            </div>
            <div className="bg-white p-4 rounded shadow border border-gray-100 text-center">
              <div className="text-xs text-gray-500 uppercase font-bold">Achieved</div>
              <div className="text-2xl font-bold text-green-600">{schoolData.uniqueCount}</div>
            </div>
            <div className="bg-white p-4 rounded shadow border border-gray-100 text-center">
              <div className="text-xs text-gray-500 uppercase font-bold">Gap</div>
              <div className="text-2xl font-bold text-red-600">{schoolData.gap}</div>
            </div>
            <div className="bg-white p-4 rounded shadow border border-gray-100 text-center">
              <div className="text-xs text-gray-500 uppercase font-bold">Last Visit</div>
              <div className="text-lg font-bold text-blue-600 mt-1">{schoolData.lastVisit}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
              <h3 className="text-sm font-bold text-indigo-800 mb-3 flex items-center gap-2">
                <Icons.Robot className="w-4 h-4" /> AI Performance Insights
              </h3>
              <div className="space-y-2">
                {schoolData.insights.map((ins, i) => (
                  <div key={i} className={`text-xs p-2 rounded border ${ins.t === 'Success' ? 'bg-green-100 border-green-200 text-green-800' :
                    ins.t === 'Alert' ? 'bg-red-100 border-red-200 text-red-800' :
                      'bg-white border-indigo-100 text-indigo-700'
                    }`}>
                    <strong>{ins.t}:</strong> {ins.m}
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 bg-white rounded-lg shadow overflow-hidden border border-gray-200">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 font-bold text-xs text-gray-700 uppercase">
                Visit History Log
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Date</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Visitor</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Type</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {schoolData.visits.map((v, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 whitespace-nowrap font-medium">{formatDate(v.visit_date)}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{v.visitor_name}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${(v.visit_type || '').toLowerCase().includes('smart') ? 'bg-teal-100 text-teal-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                            {v.visit_type || 'General'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {schoolData.visits.length === 0 && (
                      <tr>
                        <td colSpan="3" className="px-4 py-8 text-center text-gray-400 italic">No visits recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISITOR PROFILE VIEW */}
      {searchType === 'visitor' && selectedItem && visitorData && (
        <div className="animate-fade-in flex-1 overflow-auto space-y-4 text-left">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-600 flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700">
                <Icons.Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">{visitorData.name}</h2>
                <div className="text-xs text-gray-500 mt-1">Field Visitor Profile</div>
                <div className="flex gap-2 mt-2">
                  <div className="inline-block bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200">
                    🏆 Overall Rank: #{visitorData.rank} of {visitorData.totalVisitors}
                  </div>
                  {visitorData.complianceGaps > 0 ? (
                    <div
                      onClick={() => onDrillDown(`Compliance Gaps for ${visitorData.name}`, visitorData.complianceList)}
                      className="inline-block bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-200 cursor-pointer hover:bg-rose-200 transition-colors"
                    >
                      ⚠️ {visitorData.complianceGaps} Compliance Gaps
                    </div>
                  ) : (
                    <div className="inline-block bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded border border-green-200">
                      ✅ 100% Compliant
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${visitorData.rate >= 90 ? 'text-green-600' : visitorData.rate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {visitorData.rate}%
              </div>
              <div className="text-xs text-gray-400 uppercase">Completion Rate</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              onClick={() => setListFilter('All')}
              className={`bg-white p-4 rounded shadow border text-center cursor-pointer transition ${listFilter === 'All' ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50' : 'border-gray-100 hover:border-indigo-300'}`}
            >
              <div className="text-xs text-gray-500 uppercase font-bold">Assigned</div>
              <div className="text-2xl font-bold text-gray-800">{visitorData.totalAssigned}</div>
            </div>
            <div
              onClick={() => setListFilter('Completed')}
              className={`bg-white p-4 rounded shadow border text-center cursor-pointer transition ${listFilter === 'Completed' ? 'border-green-500 ring-1 ring-green-500 bg-green-50' : 'border-gray-100 hover:border-green-300'}`}
            >
              <div className="text-xs text-gray-500 uppercase font-bold">Completed</div>
              <div className="text-2xl font-bold text-green-600">{visitorData.completed}</div>
            </div>
            <div
              onClick={() => setListFilter('Pending')}
              className={`bg-white p-4 rounded shadow border text-center cursor-pointer transition ${listFilter === 'Pending' ? 'border-red-500 ring-1 ring-red-500 bg-red-50' : 'border-gray-100 hover:border-red-300'}`}
            >
              <div className="text-xs text-gray-500 uppercase font-bold">Pending</div>
              <div className="text-2xl font-bold text-red-600">{visitorData.pending}</div>
            </div>
            <div className="bg-white p-4 rounded shadow border border-gray-100 text-center cursor-default">
              <div className="text-xs text-gray-500 uppercase font-bold">Visits Logged</div>
              <div className="text-lg font-bold text-blue-600 mt-1">
                {visitorData.chartData.reduce((a, b) => a + b.Total, 0)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                <h3 className="text-sm font-bold text-indigo-800 mb-3 flex items-center gap-2">
                  <Icons.Robot className="w-4 h-4" /> AI Performance Insights
                </h3>
                <div className="space-y-2">
                  {visitorData.insights.map((ins, i) => (
                    <div
                      key={i}
                      onClick={() => ins.drillData && onDrillDown(ins.drillTitle || ins.t, ins.drillData)}
                      className={`text-xs p-2 rounded border transition-all ${ins.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                        ins.type === 'danger' ? 'bg-red-50 border-red-200 text-red-800' :
                          ins.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                            'bg-white border-indigo-100 text-indigo-700'
                        } ${ins.drillData ? 'cursor-pointer hover:shadow-sm hover:scale-[1.02]' : ''}`}
                    >
                      <strong>{ins.t}:</strong> {ins.m}
                      {ins.drillData && <span className="float-right opacity-50">↗</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-3 border border-gray-200">
                <div className="text-xs font-bold text-gray-500 uppercase mb-2">Daily Activity Trend</div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={visitorData.chartData} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
                      <XAxis dataKey="date" hide />
                      <Tooltip content={<PremiumChartTooltip />} />
                      <Bar dataKey="Total" fill="#8b5cf6" radius={[2, 2, 0, 0]} stackId="a" />
                      <Bar dataKey="Smart" fill="#14b8a6" radius={[2, 2, 0, 0]} stackId="b" />
                      <Bar dataKey="ICT" fill="#3b82f6" radius={[2, 2, 0, 0]} stackId="b" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-2 mt-1 text-[9px] text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Total</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500"></span> Smart</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> ICT</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 bg-white rounded-lg shadow overflow-hidden border border-gray-200">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 font-bold text-xs text-gray-700 uppercase flex justify-between items-center">
                <span>Assigned Schools ({listFilter})</span>
                <span className="text-gray-400 font-normal">{visitorData.displayList.length} / {visitorData.totalAssigned}</span>
              </div>
              <div className="overflow-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">School Name</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">District</th>
                      <th className="px-4 py-2 text-center font-medium text-gray-500">Visits</th>
                      <th className="px-4 py-2 text-center font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {visitorData.displayList.map((s, i) => (
                      <tr key={i} className="hover:bg-gray-50 group">
                        <td
                          className="px-4 py-2 font-medium text-gray-800 cursor-pointer group-hover:text-indigo-600 transition-colors"
                          onClick={() => switchToSchool(s.school_name)}
                          title="Click to view School Profile"
                        >
                          {s.school_name} <span className="text-[9px] text-gray-400 ml-1">↗</span>
                        </td>
                        <td className="px-4 py-2 text-gray-600">{s.district}</td>
                        <td className="px-4 py-2 text-center font-bold">{s.uniqueVisits} / {s.targetVisits}</td>
                        <td className="px-4 py-2 text-center">
                          {s.uniqueVisits >= s.targetVisits ? (
                            <span className="text-green-600 font-bold flex items-center justify-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Done
                            </span>
                          ) : (
                            <span className="text-red-500 font-bold flex items-center justify-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {visitorData.displayList.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-4 py-8 text-center text-gray-400 italic">No schools found for this filter.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Month Wise Visit Status Chart */}
          <div className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.08)] border-none p-5 relative">
            <div className="flex justify-between items-center mb-4 pl-2 pr-2 relative">
              <span className="text-sm font-bold text-gray-800 uppercase font-sans">
                Month wise visit status from {startMonthStr} to {endMonthStr}
              </span>
              <div className="relative z-20 no-print">
                <button
                  onClick={() => setChartMenuOpen(prev => !prev)}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-2xl font-bold p-1 leading-none rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Chart options"
                >
                  ≡
                </button>
                {chartMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setChartMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl min-w-[150px] py-1.5 z-20 text-xs font-sans text-slate-700 dark:text-slate-300">
                      <button 
                        onClick={() => { handleExportCSV(); setChartMenuOpen(false); }} 
                        className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        Download CSV
                      </button>
                      <button 
                        onClick={() => { handleExportPNG(); setChartMenuOpen(false); }} 
                        className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        Download PNG
                      </button>
                      <button 
                        onClick={() => { window.print(); setChartMenuOpen(false); }} 
                        className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        Print Chart
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={visitorData.monthlyStatusData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorIctVisit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9'} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis 
                    domain={[0, (dataMax) => Math.ceil((dataMax * 1.1) / 10000) * 10000]}
                    tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }} 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(v) => v.toLocaleString('en-IN')}
                  />
                  <Tooltip content={<PremiumChartTooltip />} />
                  <Legend verticalAlign="top" align="center" content={<ClickableLegend hiddenKeys={hiddenKeys} onLegendClick={handleLegendClick} />} />
                  
                  <Line
                    type="monotone"
                    dataKey="Smart Visit"
                    stroke="#378ADD"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#378ADD', strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                    hide={!!hiddenKeys['Smart Visit']}
                    label={<CustomizedLabel fill="#378ADD" offset={8} />}
                  />
                  
                  <Area
                    type="monotone"
                    dataKey="ICT Visit"
                    stroke="#1D9E75"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorIctVisit)"
                    dot={{ r: 4, fill: '#1D9E75', strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                    hide={!!hiddenKeys['ICT Visit']}
                    label={<CustomizedLabel fill="#1D9E75" offset={-12} />}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {!selectedItem && (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 opacity-50 min-h-[300px]">
          {searchType === 'school' ? <Icons.SchoolSolid className="w-24 h-24 mb-4" /> : <Icons.Users className="w-24 h-24 mb-4" />}
          <p className="text-lg font-medium">Search for a {searchType} to view details</p>
        </div>
      )}
    </div>
  );
};

export default SearchView;
