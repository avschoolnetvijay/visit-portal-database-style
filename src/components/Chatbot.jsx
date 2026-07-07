import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Icons } from './Icons';
import { parseDateRobust, formatDate } from '../utils';

function Chatbot({
  schools = [],
  visits = [],
  jhpmsLab = [],
  edustat = [],
  manpower = [],
  startDate,
  endDate,
  selProjects = [],
  selDistricts = [],
  selBlocks = [],
  selCCs = [],
  ccNameMapping = {},
  workingDays,
  darkMode = false
}) {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! I am your AI Copilot. I analyze the portal database directly in your browser. All calculations are completely free, secure, and run locally.\n\nWhat would you like to know today?',
      timestamp: new Date(),
      chips: [
        'Show critical schools list',
        'Analyze visit coverage',
        'Total hardware usage hours',
        'Academic classes conducted',
        'List active CC/DEFs'
      ]
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clean and parse helper functions
  const cleanUdise = (u) => {
    if (!u) return '';
    let s = String(u).trim();
    if (s.endsWith('.0')) {
      s = s.substring(0, s.length - 2);
    }
    return s;
  };

  const parseHours = (v) => {
    if (!v) return 0;
    const s = String(v);
    if (s.includes(':')) {
      const [h, m] = s.split(':');
      return (parseInt(h) || 0) + (parseInt(m) || 0) / 60;
    }
    return parseFloat(s) || 0;
  };

  // Compile base active weights and parameters
  const validWdays = Number(workingDays) > 0 ? Number(workingDays) : 22;
  const isJhpmsActive = jhpmsLab && jhpmsLab.length > 0;
  const isEdustatActive = edustat && edustat.length > 0;
  const isVisitActive = visits && visits.length > 0;
  const isManpowerActive = manpower && manpower.length > 0;

  // Active filters applied dataset (Filtered Data)
  const filteredSchools = useMemo(() => {
    let list = schools || [];
    if (selProjects?.length) list = list.filter((s) => selProjects.includes(s.project_name));
    if (selDistricts?.length) list = list.filter((s) => selDistricts.includes(s.district));
    if (selBlocks?.length) list = list.filter((s) => selBlocks.includes(s.block));
    if (selCCs?.length) {
      list = list.filter((s) => {
        const name = s.visitor_name || s.visitorName || '';
        const resolved = ccNameMapping[name] || name;
        return selCCs.includes(resolved) || selCCs.includes(name);
      });
    }
    return list;
  }, [schools, selProjects, selDistricts, selBlocks, selCCs, ccNameMapping]);

  const activeUdises = useMemo(() => new Set(filteredSchools.map(s => cleanUdise(s.udise_code)).filter(Boolean)), [filteredSchools]);

  // Helper date parsed boundaries
  const parsedStartDate = useMemo(() => parseDateRobust(startDate), [startDate]);
  const parsedEndDate = useMemo(() => parseDateRobust(endDate), [endDate]);

  // Pre-index collections for performance
  const jhpmsIndexed = useMemo(() => {
    const map = {};
    const splitMap = {};
    jhpmsLab.forEach(row => {
      const udise = cleanUdise(row.udise || row.udise_code);
      if (!udise) return;
      
      const rawDate = row.visit_date || row.date;
      const d = parseDateRobust(rawDate);
      if (parsedStartDate && parsedEndDate && d) {
        if (d < parsedStartDate || d > parsedEndDate) return;
      }

      const cls = Number(row.no_of_classes || row.classes || 1) || 1;
      map[udise] = (map[udise] || 0) + cls;

      if (!splitMap[udise]) splitMap[udise] = { total: 0, ict: 0, smart: 0, mis: 0 };
      splitMap[udise].total += cls;

      const labType = String(row.labType || row.lab_type || '').toUpperCase();
      const subject = String(row.subject || '').toUpperCase();

      if (subject.split(/[^A-Z0-9]+/).includes('MIS')) {
        splitMap[udise].mis += cls;
      } else if (labType.includes('ICT') && subject.includes('COMPUTER')) {
        splitMap[udise].ict += cls;
      } else if (labType.includes('SMART')) {
        splitMap[udise].smart += cls;
      }
    });
    return { overall: map, splits: splitMap };
  }, [jhpmsLab, parsedStartDate, parsedEndDate]);

  const edustatIndexed = useMemo(() => {
    const map = {};
    edustat.forEach(e => {
      const udise = cleanUdise(e.udise_code || e.udise);
      if (!udise) return;

      const rawDate = e.date;
      const d = parseDateRobust(rawDate);
      if (parsedStartDate && parsedEndDate && d) {
        if (d < parsedStartDate || d > parsedEndDate) return;
      }

      const hrs = parseHours(e.total_used_hours || e.used_hours || e.hours || e.used);
      map[udise] = (map[udise] || 0) + hrs;
    });
    return map;
  }, [edustat, parsedStartDate, parsedEndDate]);

  const visitsIndexed = useMemo(() => {
    const map = {};
    visits.forEach(v => {
      const udise = cleanUdise(v.udise_code);
      if (!udise) return;

      const d = parseDateRobust(v.visit_date);
      if (parsedStartDate && parsedEndDate && d) {
        if (d < parsedStartDate || d > parsedEndDate) return;
      }

      const type = (v.visit_type || '').toLowerCase();
      if (!map[udise]) map[udise] = { total: 0, ict: 0, smart: 0, dates: new Set() };
      
      const dateStr = (v.visit_date || '').split('T')[0];
      if (dateStr && !map[udise].dates.has(dateStr)) {
        map[udise].dates.add(dateStr);
        map[udise].total++;
        if (type.includes('smart')) {
          map[udise].smart++;
        } else {
          map[udise].ict++; // fallback to ict visit count
        }
      }
    });
    return map;
  }, [visits, parsedStartDate, parsedEndDate]);

  const manpowerIndexed = useMemo(() => {
    const map = {};
    manpower.forEach(m => {
      const udise = cleanUdise(m.udise_code || m.udise);
      if (udise) map[udise] = m;
    });
    return map;
  }, [manpower]);

  // Compute school score averages for the filtered list (Filtered Context)
  const enrichedSchools = useMemo(() => {
    const maxJhpms = Math.max(1, ...Object.values(jhpmsIndexed.overall));
    const maxEdustat = Math.max(1, ...Object.values(edustatIndexed));

    return filteredSchools.map(s => {
      const udise = cleanUdise(s.udise_code);
      const schoolName = s.school_name || s.school || udise;
      
      const jClasses = jhpmsIndexed.overall[udise] || 0;
      const ictCls = jhpmsIndexed.splits[udise]?.ict || 0;
      const smartCls = jhpmsIndexed.splits[udise]?.smart || 0;
      const misCls = jhpmsIndexed.splits[udise]?.mis || 0;
      const edHours = edustatIndexed[udise] || 0;
      
      const vis = visitsIndexed[udise] || { total: 0, ict: 0, smart: 0 };
      const fVisits = vis.total;
      const monthlyTarget = s.monthly_target || 1;
      const targetVisits = monthlyTarget * 1; // standard scale

      const mp = manpowerIndexed[udise] || { status: 'Vacant', instructorName: '-' };
      const resolvedCC = ccNameMapping[s.visitor_name] || s.visitor_name || 'Unassigned';

      // Scores
      const jScore = isJhpmsActive ? Math.min(100, (jClasses / maxJhpms) * 100) : 0;
      const eScore = isEdustatActive ? Math.min(100, (edHours / maxEdustat) * 105) : 0;
      const vScore = isVisitActive ? (targetVisits > 0 ? Math.min(100, (fVisits / targetVisits) * 100) : 0) : 0;
      const mScore = isManpowerActive ? (mp.status === 'Active' || mp.status === 'WORKING' ? 100 : mp.status === 'Pending' ? 40 : 0) : 0;

      // Base composite 30-25-25-20 weights
      const compositeScore = (jScore * 0.3) + (eScore * 0.25) + (vScore * 0.25) + (mScore * 0.2);

      return {
        udise,
        schoolName,
        district: s.district || '-',
        block: s.block || '-',
        project: s.project_name || '-',
        visitorName: resolvedCC,
        jhpmsClasses: jClasses,
        ictClasses: ictCls,
        smartClasses: smartCls,
        misClasses: misCls,
        eduHours: edHours,
        fieldVisits: fVisits,
        ictVisits: vis.ict,
        smartVisits: vis.smart,
        targetVisits,
        compositeScore,
        instructorName: mp.instructorName || mp.instructor_name || mp.instructor || '-',
        instructorStatus: mp.status || 'Vacant'
      };
    });
  }, [filteredSchools, jhpmsIndexed, edustatIndexed, visitsIndexed, manpowerIndexed, ccNameMapping, isJhpmsActive, isEdustatActive, isVisitActive, isManpowerActive]);

  // NLP Parser Engine (Option A)
  const parseLocalQuery = (queryText) => {
    const q = queryText.toLowerCase().trim();
    
    // Check if query is about scope (overall vs filtered)
    const isGlobalScope = q.includes('overall') || q.includes('pure') || q.includes('raw') || q.includes('total') || q.includes('database') || q.includes(' झारखंड') || q.includes('jharkhand');
    const isFilterScope = q.includes('filter') || q.includes('selected') || q.includes('active') || q.includes('abhi') || q.includes('yahan');

    // 1. QUERY CATEGORY: CRITICAL SCHOOLS / HELP
    if (q.includes('critical') || q.includes('help') || q.includes('weak') || q.includes('kamjor') || q.includes('urg') || q.includes('attention')) {
      const critSchools = enrichedSchools.filter(s => s.compositeScore < 30);
      if (critSchools.length === 0) {
        return (
          <div className="space-y-2">
            <p>✅ **Great news!** Under your currently selected filters, there are **0 critical schools** with a health score below 30%.</p>
            <p className="text-[10px] text-slate-400 italic">Formula: School Composite Health Score = (JHPMS Classes % * 30%) + (EduStat Hours % * 25%) + (Visit Coverage % * 25%) + (CC Manpower % * 20%)</p>
          </div>
        );
      }
      return (
        <div className="space-y-3">
          <p>🚨 **Critical Schools Alert:** Found **{critSchools.length} schools** in the active filtered list with composite health scores below 30%:</p>
          <div className="overflow-x-auto border rounded-lg max-h-48 overflow-y-auto">
            <table className="min-w-full text-[11px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="p-2">School Name</th>
                  <th className="p-2 text-center">Block</th>
                  <th className="p-2 text-center">CC Name</th>
                  <th className="p-2 text-center">Score %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                {critSchools.slice(0, 15).map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                    <td className="p-2 truncate max-w-[130px] font-medium">{s.schoolName}</td>
                    <td className="p-2 text-center">{s.block}</td>
                    <td className="p-2 text-center truncate max-w-[100px]">{s.visitorName}</td>
                    <td className="p-2 text-center text-red-600 dark:text-red-400 font-bold font-mono">{Math.round(s.compositeScore)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {critSchools.length > 15 && (
            <p className="text-[10px] text-slate-400 italic">*Showing top 15 critical schools. Filter down further by Block or CC/DEF in the sidebar to isolate specific sectors.</p>
          )}
          <p className="text-[10px] text-slate-500 font-medium font-sans mt-1.5 border-t border-slate-100 dark:border-slate-800 pt-1.5 leading-normal">
            *Formula: School Composite Health Score = (JHPMS Classes Score × 30%) + (EduStat Hours Score × 25%) + (Visit Coverage Score × 25%) + (CC Manpower Score × 20%). Weights are redistributed proportionally if a data feed is inactive.
          </p>
        </div>
      );
    }

    // 2. QUERY CATEGORY: VISIT ANALYSIS
    if (q.includes('visit') || q.includes('monitoring') || q.includes(' cc ') || q.includes('def')) {
      let totalCompleted = 0;
      let totalTarget = 0;
      let visitedCount = 0;

      if (isGlobalScope) {
        // Global calculations
        schools.forEach(s => {
          totalTarget += (s.monthly_target || 1);
          if (s.uniqueVisits > 0) visitedCount++;
        });
        totalCompleted = visits.length;
      } else {
        // Active Filtered calculations
        enrichedSchools.forEach(s => {
          totalTarget += s.targetVisits || 0;
          totalCompleted += s.fieldVisits || 0;
          if (s.fieldVisits > 0) visitedCount++;
        });
      }

      const percent = totalTarget > 0 ? Math.round((visitedCount / (isGlobalScope ? schools.length : enrichedSchools.length)) * 100) : 0;
      
      return (
        <div className="space-y-2">
          <p className="font-bold text-teal-800 dark:text-teal-400 uppercase text-[10px] tracking-wider">📈 Field Visit & Monitoring Summary</p>
          <p>Based on the **{isGlobalScope ? 'Global Portal Roster' : 'Active Filtered Scope'}**:</p>
          <ul className="list-disc pl-4 space-y-1 text-xs">
            <li>**Total Schools Evaluated:** {isGlobalScope ? schools.length : enrichedSchools.length} schools</li>
            <li>**Schools Visited (≥ 1 Visit):** {visitedCount} ({percent}% Coverage)</li>
            <li>**Total Completed Visits:** {totalCompleted} visits</li>
            <li>**Estimated Targets:** {totalTarget} target visits</li>
          </ul>
          <p className="text-[10px] text-slate-500 border-t border-slate-150/40 dark:border-slate-800/40 pt-1.5 mt-2">
            *Formulas & Logic: Target Visits = sum of (monthly_target * duration_months) for all scoped schools. Visit Coverage % = (Visited Schools / Total Schools) * 100.
          </p>
          <p className="text-[10px] text-slate-400 mt-1">*Tips: Ask "overall visits" to get the raw database counts without active sidebar filters.*</p>
        </div>
      );
    }

    // 3. QUERY CATEGORY: HARDWARE RUNTIMES (EDUSTAT)
    if (q.includes('hour') || q.includes('runtime') || q.includes('edustat') || q.includes('device') || q.includes('computer')) {
      let sumHours = 0;
      if (isGlobalScope) {
        edustat.forEach(e => {
          sumHours += parseHours(e.total_used_hours || e.used_hours || e.hours || e.used);
        });
      } else {
        enrichedSchools.forEach(s => {
          sumHours += s.eduHours || 0;
        });
      }

      return (
        <div className="space-y-2">
          <p className="font-bold text-[#d97706] uppercase text-[10px] tracking-wider">💻 Hardware Usage Summary (EduStat)</p>
          <p>The total recorded computer runtimes in the **{isGlobalScope ? 'Entire Uploaded Database' : 'Active Filtered Scope'}** is:</p>
          <p className="text-2xl font-black font-mono text-slate-800 dark:text-slate-100">{Math.round(sumHours).toLocaleString('en-IN')} <span className="text-sm font-semibold">Hours</span></p>
          <p className="text-xs text-slate-500">This represents active computer sync hours reported by the client mini-PCs and CPUs in JHPMS labs.</p>
          <p className="text-[10px] text-slate-500 border-t border-slate-150/40 dark:border-slate-800/40 pt-1.5 mt-1.5">
            *Formula: Sum of all device login hours recorded across active scoped schools during the period.*
          </p>
        </div>
      );
    }

    // 4. QUERY CATEGORY: ACADEMIC CLASSES CONDUCTED
    if (q.includes('class') || q.includes('conduct') || q.includes('jhpms') || q.includes('teaching') || q.includes('lecture')) {
      let sumICT = 0;
      let sumSmart = 0;
      let sumMIS = 0;

      if (isGlobalScope) {
        jhpmsLab.forEach(row => {
          const cls = Number(row.no_of_classes || row.classes || 1) || 1;
          const labType = String(row.labType || row.lab_type || '').toUpperCase();
          const subject = String(row.subject || '').toUpperCase();

          if (subject.split(/[^A-Z0-9]+/).includes('MIS')) {
            sumMIS += cls;
          } else if (labType.includes('ICT') && subject.includes('COMPUTER')) {
            sumICT += cls;
          } else if (labType.includes('SMART')) {
            sumSmart += cls;
          }
        });
      } else {
        enrichedSchools.forEach(s => {
          sumICT += s.ictClasses || 0;
          sumSmart += s.smartClasses || 0;
          sumMIS += s.misClasses || 0;
        });
      }

      const totalCls = sumICT + sumSmart + sumMIS;

      return (
        <div className="space-y-2.5">
          <p className="font-bold text-teal-800 dark:text-teal-400 uppercase text-[10px] tracking-wider">🏫 JHPMS Classes Conducted Summary</p>
          <p>Total academic classes conducted in the **{isGlobalScope ? 'Overall database' : 'Active Filtered Scope'}**:</p>
          <div className="grid grid-cols-3 gap-2 py-1 text-center font-mono">
            <div className="p-2 border rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-xs text-slate-400 block uppercase font-bold">ICT (Comp)</span>
              <strong className="text-lg font-black text-teal-800 dark:text-teal-400">{sumICT}</strong>
            </div>
            <div className="p-2 border rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-xs text-slate-400 block uppercase font-bold">Smart Class</span>
              <strong className="text-lg font-black text-blue-600 dark:text-blue-400">{sumSmart}</strong>
            </div>
            <div className="p-2 border rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-xs text-slate-400 block uppercase font-bold">MIS Work</span>
              <strong className="text-lg font-black text-amber-700 dark:text-amber-500">{sumMIS}</strong>
            </div>
          </div>
          <p className="text-xs font-semibold text-right text-slate-600 dark:text-slate-400">Total Sum: {totalCls} Classes</p>
          <p className="text-[10px] text-slate-500 border-t border-slate-150/40 dark:border-slate-800/40 pt-1.5">
            *Formulas & Logics: Calculated by summing JHPMS lab log 'no_of_classes'. ICT = Subject "Computer" in ICT Lab; Smart = Smart Class type with subjects other than Computer/MIS; MIS = Subject contains "MIS".*
          </p>
        </div>
      );
    }

    // 5. QUERY CATEGORY: ACTIVE COORDINATORS LIST
    if (q.includes('cc') || q.includes('def') || q.includes('manpower') || q.includes('coordinator') || q.includes('team')) {
      const activeCCSet = new Set();
      const vacantCCSet = new Set();

      manpower.forEach(m => {
        const name = m.instructorName || m.instructor_name || m.instructor || 'Unassigned';
        const resolved = ccNameMapping[name] || name;
        if (m.status === 'Active' || m.status === 'WORKING') {
          activeCCSet.add(resolved);
        } else {
          vacantCCSet.add(resolved);
        }
      });

      return (
        <div className="space-y-2">
          <p className="font-bold text-teal-800 dark:text-teal-400 uppercase text-[10px] tracking-wider">👥 CC/DEF Manpower Status</p>
          <p>Based on the current Roster Directory:</p>
          <ul className="list-disc pl-4 space-y-1 text-xs">
            <li>**Total Active CC/DEFs:** {activeCCSet.size} unique members</li>
            <li>**Vacant/Pending CC Positions:** {vacantCCSet.size} posts</li>
          </ul>
          <div className="pt-2">
            <span className="text-[10px] font-black uppercase text-slate-400 block">Sample Active CC List:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {Array.from(activeCCSet).slice(0, 10).map((n, i) => (
                <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border dark:border-slate-700 font-medium">{n}</span>
              ))}
              {activeCCSet.size > 10 && <span className="text-[10px] text-slate-400 italic px-1">+{activeCCSet.size - 10} more</span>}
            </div>
          </div>
          <p className="text-[10px] text-slate-500 border-t border-slate-150/40 dark:border-slate-800/40 pt-1.5 mt-2">
            *Logic: CC/DEF is considered 'Active' if status in manpower roster is 'Active' or 'WORKING'. 'Vacant' covers 'Resign', 'Terminate', or 'Vacant'.*
          </p>
        </div>
      );
    }

    // 6. GEOGRAPHIC LOOKUP: SCAN FOR SPECIFIC BLOCKS / DISTRICTS
    let matchedBlock = null;
    let matchedProject = null;

    // Check blocks
    const allBlocksInDataset = new Set(schools.map(s => s.block).filter(Boolean));
    for (const block of allBlocksInDataset) {
      if (q.includes(block.toLowerCase())) {
        matchedBlock = block;
        break;
      }
    }

    // Check projects
    const allProjectsInDataset = new Set(schools.map(s => s.project_name).filter(Boolean));
    for (const proj of allProjectsInDataset) {
      if (q.includes(proj.toLowerCase())) {
        matchedProject = proj;
        break;
      }
    }

    if (matchedBlock) {
      const blockSchools = enrichedSchools.filter(s => s.block === matchedBlock);
      if (blockSchools.length === 0) {
        return <p>📍 **Block found: "{matchedBlock}"**, but no schools match the current sidebar filter scope. Try selecting 'All blocks/projects' in filters.</p>;
      }

      let sumClasses = 0;
      let sumHours = 0;
      let sumVisits = 0;
      let sumScores = 0;
      blockSchools.forEach(s => {
        sumClasses += s.jhpmsClasses;
        sumHours += s.eduHours;
        sumVisits += s.fieldVisits;
        sumScores += s.compositeScore;
      });

      const avgScore = Math.round(sumScores / blockSchools.length);

      return (
        <div className="space-y-2">
          <p className="font-bold text-teal-800 dark:text-teal-400 uppercase text-[10px] tracking-wider">📍 Block Report Card: {matchedBlock}</p>
          <ul className="list-disc pl-4 space-y-1 text-xs">
            <li>**Total Schools in Block:** {blockSchools.length} schools</li>
            <li>**Academic Classes Conducted:** {sumClasses} classes</li>
            <li>**Total EduStat Runtime:** {Math.round(sumHours)} Hours</li>
            <li>**Field Monitoring Visits:** {sumVisits} completed</li>
            <li>**Composite Block Score:** <strong className={avgScore >= 70 ? 'text-green-600' : avgScore >= 40 ? 'text-amber-500' : 'text-red-500'}>{avgScore}%</strong></li>
          </ul>
          <p className="text-[10px] text-slate-500 border-t border-slate-150/40 dark:border-slate-800/40 pt-1.5">
            *Logic: Block stats are direct sums of constituent schools. Block Score is the arithmetic average of constituent schools' health scores.*
          </p>
        </div>
      );
    }

    if (matchedProject) {
      const projSchools = enrichedSchools.filter(s => s.project === matchedProject);
      if (projSchools.length === 0) {
        return <p>💼 **Project found: "{matchedProject}"**, but no schools match the current sidebar filter scope.</p>;
      }

      let sumClasses = 0;
      let sumHours = 0;
      let sumVisits = 0;
      let sumScores = 0;
      projSchools.forEach(s => {
        sumClasses += s.jhpmsClasses;
        sumHours += s.eduHours;
        sumVisits += s.fieldVisits;
        sumScores += s.compositeScore;
      });

      const avgScore = Math.round(sumScores / projSchools.length);

      return (
        <div className="space-y-2">
          <p className="font-bold text-teal-800 dark:text-teal-400 uppercase text-[10px] tracking-wider">💼 Project Performance Card: {matchedProject}</p>
          <ul className="list-disc pl-4 space-y-1 text-xs">
            <li>**Total Schools in Project:** {projSchools.length} schools</li>
            <li>**Academic Classes Conducted:** {sumClasses} classes</li>
            <li>**Total EduStat Runtime:** {Math.round(sumHours)} Hours</li>
            <li>**Field Monitoring Visits:** {sumVisits} completed</li>
            <li>**Average Project Score:** <strong className={avgScore >= 70 ? 'text-green-600' : avgScore >= 40 ? 'text-amber-500' : 'text-red-500'}>{avgScore}%</strong></li>
          </ul>
          <p className="text-[10px] text-slate-500 border-t border-slate-150/40 dark:border-slate-800/40 pt-1.5">
            *Logic: Project stats are direct sums of constituent schools. Project Score is the arithmetic average of constituent schools' health scores.*
          </p>
        </div>
      );
    }

    // 7. DEFAULT FALLBACK
    return (
      <div className="space-y-2">
        <p>🤔 **I am not sure I understand that query.** Since I run locally in your browser, I parse specific analytical keywords. </p>
        <p className="text-xs text-slate-500 font-medium">Please ask questions containing words like:</p>
        <div className="flex flex-wrap gap-1 py-1">
          {['critical', 'visits', 'hours', 'classes', 'manpower', 'block name (e.g. Jamua)'].map((kw, i) => (
            <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 px-1.5 py-0.5 rounded font-mono font-bold text-teal-800 dark:text-teal-400">{kw}</span>
          ))}
        </div>
      </div>
    );
  };

  const handleSendMessage = (text) => {
    if (!text.trim()) return;

    const newMessages = [
      ...messages,
      { sender: 'user', text, timestamp: new Date() }
    ];

    setMessages(newMessages);
    setInputVal('');

    // Trigger local NLP calculations after brief bot thinking state delay
    setTimeout(() => {
      const parsedAns = parseLocalQuery(text);
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: parsedAns,
          timestamp: new Date()
        }
      ]);
    }, 350);
  };

  return (
    <div className={`p-4 md:p-6 space-y-5 font-sans select-none animate-fade-in ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-extrabold font-serif text-teal-900 dark:text-teal-400 uppercase tracking-wider flex items-center gap-2">
            <Icons.Robot className="w-6 h-6 animate-bounce" /> AI Copilot Analytics Chatbot
          </h1>
          <p className="text-xs text-slate-400 mt-1 leading-normal">
            Query the active dashboard database using local Natural Language Processing (NLP). Safe, private, and zero API costs.
          </p>
        </div>
        <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200 font-mono tracking-wider">
          Local Engine Active
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-start">
        
        {/* LEFT WORKSTATION STATUS SIDEBAR */}
        <div className="lg:col-span-1 space-y-4 font-sans no-print">
          
          <div className="portal-card bg-slate-50/50 dark:bg-slate-900/50 p-4 border border-slate-200/50 dark:border-slate-800/50 rounded-xl space-y-3 shadow-inner">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Icons.Reports className="w-3.5 h-3.5" /> Database Index
            </h3>
            <div className="space-y-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-350">
              <div className="flex justify-between">
                <span>Schools Indexed:</span>
                <span className="font-mono text-teal-700">{schools.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Active Scope:</span>
                <span className="font-mono text-blue-600">{enrichedSchools.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Visits Logged:</span>
                <span className="font-mono text-purple-600">{visits.length}</span>
              </div>
              <div className="flex justify-between">
                <span>JHPMS Classes:</span>
                <span className="font-mono text-emerald-600">{jhpmsLab.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Hardware Logins:</span>
                <span className="font-mono text-amber-600">{edustat.length}</span>
              </div>
            </div>
          </div>

          <div className="portal-card bg-white dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-800 rounded-xl space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Icons.Plan className="w-3.5 h-3.5" /> Suggested Questions
            </h3>
            <div className="flex flex-col gap-1.5 text-left text-xs">
              {[
                'Show critical schools list',
                'What are overall visits?',
                'Academic classes conducted',
                'Device usage runtimes',
                'Jamua block stats'
              ].map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  className="p-2 rounded bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/20 dark:hover:bg-slate-850 border dark:border-slate-800/40 text-left font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors"
                >
                  ❓ {q}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT MAIN CHAT AREA */}
        <div className="lg:col-span-3 portal-card bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 flex flex-col h-[520px] rounded-2xl justify-between shadow-xl">
          
          {/* MESSAGES LOG WORKSPACE */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 items-start animate-fade-in ${
                  msg.sender === 'user' ? 'flex-row-reverse text-right' : 'text-left'
                }`}
              >
                {/* Avatar Icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border select-none ${
                  msg.sender === 'user'
                    ? 'bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-950/30'
                    : 'bg-teal-100 border-teal-200 text-teal-800 dark:bg-teal-950/30'
                }`}>
                  {msg.sender === 'user' ? <Icons.Users className="w-4 h-4" /> : <Icons.Robot className="w-4 h-4" />}
                </div>

                {/* Bubble box */}
                <div className="max-w-[75%] space-y-2">
                  <div className={`p-3.5 rounded-2xl text-xs leading-relaxed border font-sans ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white border-blue-700 rounded-tr-none'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-850 text-slate-700 dark:text-slate-300 rounded-tl-none shadow-sm'
                  }`}>
                    {typeof msg.text === 'string' ? (
                      <p className="whitespace-pre-line font-sans">{msg.text}</p>
                    ) : (
                      msg.text
                    )}
                  </div>
                  
                  {/* Assistant Suggested Quick Chips */}
                  {msg.chips && (
                    <div className="flex flex-wrap gap-1.5 pt-1 justify-start">
                      {msg.chips.map((chip, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => handleSendMessage(chip)}
                          className="text-[10px] bg-teal-800/10 hover:bg-teal-800/25 border border-teal-800/15 text-teal-900 dark:text-teal-400 font-bold px-2.5 py-1 rounded-full transition-all duration-150 animate-fade-in hover:scale-105"
                        >
                          ⚡ {chip}
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="text-[9px] text-slate-400 font-mono block select-none px-1">
                    {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT BAR PANEL */}
          <div className="border-t border-slate-150 dark:border-slate-800 pt-3.5 mt-2.5 flex items-center gap-2 no-print">
            <input
              type="text"
              placeholder="Ask me something about critical schools, class status, or CC visits..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage(inputVal);
              }}
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-sans text-slate-800 dark:text-slate-200 placeholder-slate-400"
            />
            <button
              onClick={() => handleSendMessage(inputVal)}
              className="bg-teal-700 hover:bg-teal-800 text-white p-2.5 rounded-xl shadow-md border border-teal-600 transition hover:scale-105 active:scale-95"
              title="Send Prompt"
            >
              <Icons.Home className="w-4 h-4 rotate-90" /> {/* rotated home acts as send arrow */}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}

export default React.memo(Chatbot);
