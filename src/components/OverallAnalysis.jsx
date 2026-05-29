import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, LineChart, Line, AreaChart, Area, Treemap
} from 'recharts';
import { Icons } from './Icons';

/* ───────────────────────── helpers ───────────────────────── */

const parseHours = (v) => {
  if (!v) return 0;
  const s = String(v);
  if (s.includes(':')) {
    const [h, m] = s.split(':');
    return (parseInt(h) || 0) + (parseInt(m) || 0) / 60;
  }
  return parseFloat(s) || 0;
};

const fmt = (n) => (typeof n === 'number' ? (n % 1 === 0 ? n.toLocaleString() : n.toFixed(1)) : n);
const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);
const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

const colorFor = (v) =>
  v >= 70 ? 'text-green-600' : v >= 40 ? 'text-amber-500' : 'text-red-600';
const bgFor = (v) =>
  v >= 70
    ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-200'
    : v >= 40
    ? 'bg-gradient-to-br from-amber-50 to-yellow-100 border-amber-200'
    : 'bg-gradient-to-br from-red-50 to-rose-100 border-red-200';
const barColorFor = (v) => (v >= 70 ? '#059669' : v >= 40 ? '#d97706' : '#dc2626');

const getVal = (row, keyMatch) => {
  if (!row) return null;
  const key = Object.keys(row).find(
    (k) =>
      k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(keyMatch.toLowerCase().replace(/[^a-z0-9]/g, ''))
  );
  return key ? row[key] : null;
};

const formatDate = (dateInput) => {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

/* ───── SVG semi-circle gauge ───── */
const SemiGauge = ({ value, size = 220, label, grade, gradeColor }) => {
  const r = (size - 24) / 2;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const startAngle = Math.PI;
  const sweepAngle = Math.PI;
  const v = clamp(value) / 100;

  const arcPath = (startFrac, endFrac) => {
    const a1 = startAngle + sweepAngle * startFrac;
    const a2 = startAngle + sweepAngle * endFrac;
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy + r * Math.sin(a2);
    const largeArc = endFrac - startFrac > 0.5 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const needleAngle = startAngle + sweepAngle * v;
  const nx = cx + (r - 18) * Math.cos(needleAngle);
  const ny = cy + (r - 18) * Math.sin(needleAngle);

  return (
    <svg width={size} height={size / 2 + 40} viewBox={`0 0 ${size} ${size / 2 + 40}`}>
      {/* background arc */}
      <path d={arcPath(0, 1)} fill="none" stroke="#e5e7eb" strokeWidth="16" strokeLinecap="round" />
      {/* value arc */}
      {v > 0 && (
        <path
          d={arcPath(0, v)}
          fill="none"
          stroke={v >= 0.8 ? '#059669' : v >= 0.6 ? '#0d9488' : v >= 0.4 ? '#d97706' : '#dc2626'}
          strokeWidth="16"
          strokeLinecap="round"
        />
      )}
      {/* needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#334155" strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill="#334155" />
      {/* center text */}
      <text x={cx} y={cy - 20} textAnchor="middle" className="fill-gray-800" style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Inter, sans-serif' }}>
        {Math.round(value)}%
      </text>
      <text x={cx} y={cy + 28} textAnchor="middle" style={{ fontSize: 13, fontWeight: 700, fill: gradeColor, fontFamily: 'Inter, sans-serif' }}>
        {grade}
      </text>
      {/* scale labels */}
      <text x={cx - r - 2} y={cy + 16} textAnchor="middle" style={{ fontSize: 9, fill: '#9ca3af' }}>0</text>
      <text x={cx} y={cy - r - 4} textAnchor="middle" style={{ fontSize: 9, fill: '#9ca3af' }}>50</text>
      <text x={cx + r + 2} y={cy + 16} textAnchor="middle" style={{ fontSize: 9, fill: '#9ca3af' }}>100</text>
    </svg>
  );
};

/* ───── mini progress bar ───── */
const MiniBar = ({ label, value, weight, color }) => (
  <div className="flex items-center gap-2 text-xs">
    <span className="w-28 font-semibold text-gray-600 truncate">{label} ({weight}%)</span>
    <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${clamp(value)}%`, background: color }} />
    </div>
    <span className="w-10 text-right font-bold text-gray-700">{Math.round(value)}%</span>
  </div>
);

/* ──────────────────────────────────────────────────────────── */
/* MAIN COMPONENT                                              */
/* ──────────────────────────────────────────────────────────── */

const OverallAnalysis = ({
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
  workingDays
}) => {
  const [sortKey, setSortKey] = useState('compositeScore');
  const [sortDir, setSortDir] = useState('desc');
  const [showAll, setShowAll] = useState(false);

  const validWdays = Number(workingDays) > 0 ? Number(workingDays) : 22;

  /* ── 1. Filtered schools set ── */
  const fSchools = useMemo(() => {
    let list = schools || [];
    if (selProjects?.length) list = list.filter((s) => selProjects.includes(s.project_name));
    if (selDistricts?.length) list = list.filter((s) => selDistricts.includes(s.district));
    if (selBlocks?.length) list = list.filter((s) => selBlocks.includes(s.block));
    return list;
  }, [schools, selProjects, selDistricts, selBlocks]);

  const validUdises = useMemo(
    () => new Set(fSchools.map((s) => String(s.udise_code || '').trim()).filter(Boolean)),
    [fSchools]
  );

  /* ── 2. JHPMS classes per UDISE ── */
  const jhpmsMap = useMemo(() => {
    const map = {};
    (jhpmsLab || []).forEach((row) => {
      const udise = String(row.udise || row.udise_code || getVal(row, 'udise') || '').trim();
      if (!validUdises.has(udise)) return;
      if (!map[udise]) map[udise] = 0;
      map[udise]++;
    });
    return map;
  }, [jhpmsLab, validUdises]);

  /* ── 3. EduStat hours per UDISE ── */
  const edustatMap = useMemo(() => {
    const map = {};
    (edustat || []).forEach((e) => {
      const udise = String(e.udise || '').trim();
      if (!validUdises.has(udise)) return;
      if (!map[udise]) map[udise] = 0;
      map[udise] += parseHours(e['total used hours']);
    });
    return map;
  }, [edustat, validUdises]);

  /* ── 4. Manpower status per UDISE ── */
  const manpowerMap = useMemo(() => {
    const map = {};
    (manpower || []).forEach((m) => {
      const udise = String(m.udise || getVal(m, 'udise') || '').trim();
      const status = String(m.status || getVal(m, 'status') || 'Active').trim();
      const name = String(m.instructorName || m.instructor_name || getVal(m, 'instructor') || '').trim();
      if (udise) {
        if (!map[udise]) map[udise] = { status, name };
        // prefer Active over Vacant; keep first found if same
        if (status === 'Active') map[udise] = { status, name };
      }
    });
    return map;
  }, [manpower]);

  /* ── 5. Visit count per UDISE ── */
  const visitMap = useMemo(() => {
    const map = {};
    (visits || []).forEach((v) => {
      const udise = String(v.udise_code || '').trim();
      if (!validUdises.has(udise)) return;
      if (!map[udise]) map[udise] = { count: 0, lastDate: null };
      map[udise].count++;
      if (v.visit_date) {
        const d = new Date(v.visit_date);
        if (!isNaN(d.getTime()) && (!map[udise].lastDate || d > map[udise].lastDate)) {
          map[udise].lastDate = d;
        }
      }
    });
    return map;
  }, [visits, validUdises]);

  /* ── 6. Per-school composite scores & enriched rows ── */
  const enriched = useMemo(() => {
    const totalSchools = fSchools.length || 1;

    // Normalization helpers — max across filtered set
    const maxJhpms = Math.max(1, ...Object.values(jhpmsMap));
    const maxEdustat = Math.max(1, ...Object.values(edustatMap));

    return fSchools.map((s) => {
      const udise = String(s.udise_code || '').trim();
      const schoolName = s.school_name || s.school || udise;
      const district = s.district || '-';
      const block = s.block || '-';
      const project = s.project_name || '-';

      const jhpmsClasses = jhpmsMap[udise] || 0;
      const eduHours = edustatMap[udise] || 0;
      const mp = manpowerMap[udise] || { status: 'Unknown', name: '-' };
      const vis = visitMap[udise] || { count: 0, lastDate: null };
      const fieldVisits = s.uniqueVisits != null ? s.uniqueVisits : vis.count;
      const targetVisits = s.targetVisits || 0;
      const lastVisitDate = s.lastVisit || vis.lastDate;

      // Sub-scores (0-100)
      const jhpmsScore = clamp((jhpmsClasses / maxJhpms) * 100);
      const edustatScore = clamp((eduHours / maxEdustat) * 100);
      const visitScore = targetVisits > 0 ? clamp((fieldVisits / targetVisits) * 100) : (fieldVisits > 0 ? 50 : 0);
      const manpowerScore = mp.status === 'Active' ? 100 : mp.status === 'Pending' ? 40 : 0;

      // Composite: JHPMS 30%, EduStat 25%, Visit 25%, Manpower 20%
      const compositeScore = jhpmsScore * 0.30 + edustatScore * 0.25 + visitScore * 0.25 + manpowerScore * 0.20;

      // Root cause heuristic
      let rootCause = 'Normal';
      let recommendation = 'Continue monitoring';

      if (jhpmsClasses > 0 && eduHours === 0) {
        rootCause = 'Power Failure';
        recommendation = 'Investigate device/power issues at school';
      } else if (jhpmsClasses === 0 && eduHours === 0 && (mp.status === 'Vacant' || mp.status === 'Pending')) {
        rootCause = 'Staff Vacancy';
        recommendation = 'Assign instructor immediately';
      } else if (fieldVisits > 3 && compositeScore < 30) {
        rootCause = 'Visitor Ineffectiveness';
        recommendation = 'Review visit quality & follow-up mechanism';
      } else if (fieldVisits === 0 && compositeScore >= 80) {
        rootCause = 'Self-Sustaining';
        recommendation = 'Acknowledge & replicate best practices';
      } else if (fieldVisits > 3 && compositeScore < 30) {
        rootCause = 'Training Gap';
        recommendation = 'Schedule capacity-building workshop';
      } else if (jhpmsClasses === 0 && eduHours === 0) {
        rootCause = 'Non-Functional Lab';
        recommendation = 'Dispatch technical team for diagnosis';
      } else if (fieldVisits === 0) {
        rootCause = 'Not Visited';
        recommendation = 'Schedule field visit urgently';
      }

      // Dormancy
      const today = new Date();
      const daysSinceVisit = lastVisitDate ? Math.floor((today - new Date(lastVisitDate)) / (1000 * 60 * 60 * 24)) : 999;
      if (daysSinceVisit > 45 && fieldVisits > 0 && rootCause === 'Normal') {
        rootCause = 'Dormancy Alert';
        recommendation = `Not visited in ${daysSinceVisit} days — schedule follow-up`;
      }

      // Low utilization
      const avgClassPerDay = jhpmsClasses / validWdays;
      if (avgClassPerDay < 1.0 && avgClassPerDay > 0 && rootCause === 'Normal') {
        rootCause = 'Low Utilization';
        recommendation = 'Increase daily lab usage to ≥1 class/day';
      }

      return {
        udise,
        schoolName,
        district,
        block,
        project,
        fieldVisits,
        targetVisits,
        lastVisitDate,
        staffStatus: mp.status,
        staffName: mp.name,
        jhpmsClasses,
        eduHours,
        jhpmsScore,
        edustatScore,
        visitScore,
        manpowerScore,
        compositeScore,
        rootCause,
        recommendation,
        daysSinceVisit,
        avgClassPerDay
      };
    });
  }, [fSchools, jhpmsMap, edustatMap, manpowerMap, visitMap, validWdays]);

  /* ── 7. KPI aggregates ── */
  const kpis = useMemo(() => {
    const total = enriched.length || 1;
    const activeCCs = (manpower || []).filter(
      (m) => String(m.status || getVal(m, 'status') || '').toLowerCase() === 'active'
    ).length;

    const avgScore = enriched.reduce((a, b) => a + b.compositeScore, 0) / total;
    const labFunctional = enriched.filter((s) => s.jhpmsClasses > 0).length;
    const labPct = pct(labFunctional, total);

    const visitCovered = enriched.filter((s) => s.fieldVisits >= s.targetVisits && s.targetVisits > 0).length;
    const visitPct = pct(visitCovered, total);

    const totalJhpms = enriched.reduce((a, b) => a + b.jhpmsClasses, 0);
    const contentIntensity = (totalJhpms / total).toFixed(1);

    const deviceHours = enriched.reduce((a, b) => a + b.eduHours, 0);
    const criticalCount = enriched.filter((s) => s.compositeScore < 30).length;

    return [
      { label: 'Schools Covered', value: total, rawPct: 100, icon: '🏫' },
      { label: 'Active CCs', value: activeCCs, rawPct: pct(activeCCs, total), icon: '👤' },
      { label: 'Avg Performance', value: `${avgScore.toFixed(1)}%`, rawPct: avgScore, icon: '📊' },
      { label: 'Lab Functionality', value: `${labPct}%`, rawPct: labPct, icon: '🖥️' },
      { label: 'Visit Coverage', value: `${visitPct}%`, rawPct: visitPct, icon: '✅' },
      { label: 'Content Intensity', value: contentIntensity, rawPct: Math.min(100, (contentIntensity / validWdays) * 100), icon: '📚' },
      { label: 'Device Hours', value: fmt(deviceHours), rawPct: Math.min(100, (deviceHours / (total * validWdays)) * 100), icon: '⏱️' },
      { label: 'Critical Schools', value: criticalCount, rawPct: 100 - pct(criticalCount, total), icon: '🚨' }
    ];
  }, [enriched, manpower, validWdays]);

  /* ── 8. Global composite health ── */
  const healthData = useMemo(() => {
    const total = enriched.length || 1;
    const jhpmsGlobal = clamp((enriched.filter((s) => s.jhpmsClasses > 0).length / total) * 100);
    const edustatGlobal = clamp((enriched.filter((s) => s.eduHours > 0).length / total) * 100);
    const visitGlobal = clamp(
      (enriched.filter((s) => s.fieldVisits >= s.targetVisits && s.targetVisits > 0).length / total) * 100
    );
    const manpowerGlobal = clamp(
      ((manpower || []).filter((m) => String(m.status || getVal(m, 'status') || '').toLowerCase() === 'active').length /
        Math.max(1, (manpower || []).length)) *
        100
    );

    const composite = jhpmsGlobal * 0.3 + edustatGlobal * 0.25 + visitGlobal * 0.25 + manpowerGlobal * 0.2;
    let grade, gradeColor;
    if (composite > 80) { grade = 'Excellent'; gradeColor = '#059669'; }
    else if (composite > 60) { grade = 'On-Track'; gradeColor = '#0d9488'; }
    else if (composite > 40) { grade = 'Needs Attention'; gradeColor = '#d97706'; }
    else { grade = 'Critical'; gradeColor = '#dc2626'; }

    return { composite, grade, gradeColor, jhpmsGlobal, edustatGlobal, visitGlobal, manpowerGlobal };
  }, [enriched, manpower]);

  /* ── 9. Executive narrative ── */
  const narrative = useMemo(() => {
    const total = enriched.length;
    const labActive = enriched.filter((s) => s.jhpmsClasses > 0).length;
    const labPctVal = pct(labActive, total);
    const visitCov = pct(enriched.filter((s) => s.fieldVisits >= s.targetVisits && s.targetVisits > 0).length, total);
    const critCount = enriched.filter((s) => s.compositeScore < 30).length;
    const scope = selDistricts?.length
      ? selDistricts.join(', ')
      : selProjects?.length
      ? selProjects.join(', ')
      : 'All Regions';
    const dateRange = startDate && endDate ? `${formatDate(startDate)} to ${formatDate(endDate)}` : 'Current Period';

    const lines = [
      `For ${scope} during ${dateRange}, ${labActive} of ${total} schools reported lab activity (${labPctVal}%).`,
      `Overall health rating is ${Math.round(healthData.composite)}% (${healthData.grade}).`,
      `JHPMS lab functionality stands at ${Math.round(healthData.jhpmsGlobal)}%, while visit coverage is at ${visitCov}%.`,
      `EduStat device utilization rate is ${Math.round(healthData.edustatGlobal)}% and manpower availability is ${Math.round(healthData.manpowerGlobal)}%.`,
      critCount > 0
        ? `${critCount} school${critCount > 1 ? 's are' : ' is'} flagged as critical (score <30%) requiring immediate attention.`
        : 'No schools are currently in the critical zone — well done!',
      enriched.filter((s) => s.rootCause === 'Self-Sustaining').length > 0
        ? `${enriched.filter((s) => s.rootCause === 'Self-Sustaining').length} school(s) are self-sustaining with high scores despite zero visits.`
        : ''
    ].filter(Boolean);

    return lines;
  }, [enriched, healthData, selDistricts, selProjects, startDate, endDate]);

  /* ── 10. Achievements ── */
  const achievements = useMemo(() => {
    const wins = [];
    // Best district
    const distScores = {};
    enriched.forEach((s) => {
      if (!distScores[s.district]) distScores[s.district] = { sum: 0, count: 0 };
      distScores[s.district].sum += s.compositeScore;
      distScores[s.district].count++;
    });
    const bestDist = Object.entries(distScores).sort(
      (a, b) => b[1].sum / b[1].count - a[1].sum / a[1].count
    )[0];
    if (bestDist) wins.push({ label: 'Top District', value: bestDist[0], detail: `Avg ${(bestDist[1].sum / bestDist[1].count).toFixed(1)}%` });

    // Star school by utilization
    const starSchool = [...enriched].sort((a, b) => b.jhpmsClasses + b.eduHours - (a.jhpmsClasses + a.eduHours))[0];
    if (starSchool) wins.push({ label: 'Star School', value: starSchool.schoolName, detail: `${starSchool.jhpmsClasses} classes, ${starSchool.eduHours.toFixed(1)} hrs` });

    // Best visitor
    const visitorScores = {};
    enriched.forEach((s) => {
      const vis = fSchools.find((f) => String(f.udise_code) === s.udise);
      const name = vis?.visitor_name || '-';
      if (name === '-') return;
      if (!visitorScores[name]) visitorScores[name] = { sum: 0, count: 0 };
      visitorScores[name].sum += s.compositeScore;
      visitorScores[name].count++;
    });
    const bestVisitor = Object.entries(visitorScores).sort(
      (a, b) => b[1].sum / b[1].count - a[1].sum / a[1].count
    )[0];
    if (bestVisitor) wins.push({ label: 'Best CC/Visitor', value: bestVisitor[0], detail: `Avg ${(bestVisitor[1].sum / bestVisitor[1].count).toFixed(1)}%` });

    // Self-sustaining
    const selfSustaining = enriched.filter((s) => s.fieldVisits === 0 && s.compositeScore >= 80);
    if (selfSustaining.length > 0) wins.push({ label: 'Self-Sustaining', value: `${selfSustaining.length} schools`, detail: 'Score >80% with 0 visits' });

    // 100% data compliance clusters (districts with all schools having jhpms + edustat data)
    const compliant = Object.entries(distScores).filter(([dist, d]) => {
      const distSchools = enriched.filter((s) => s.district === dist);
      return distSchools.every((s) => s.jhpmsClasses > 0 && s.eduHours > 0);
    });
    if (compliant.length > 0) wins.push({ label: '100% Data Compliance', value: `${compliant.length} cluster(s)`, detail: compliant.map((c) => c[0]).join(', ') });

    return wins;
  }, [enriched, fSchools]);

  // Top 5 improvers by composite score
  const topImprovers = useMemo(() => {
    return [...enriched]
      .filter((s) => s.compositeScore > 0)
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, 5)
      .map((s) => ({
        name: s.schoolName.length > 22 ? s.schoolName.substring(0, 20) + '..' : s.schoolName,
        score: Math.round(s.compositeScore),
        fullName: s.schoolName
      }));
  }, [enriched]);

  /* ── 11. Critical areas ── */
  const criticalAreas = useMemo(() => {
    const zeroVisits = enriched.filter((s) => s.fieldVisits === 0);
    const nonFunctional = enriched.filter((s) => s.jhpmsClasses === 0);
    const vacantCC = enriched.filter((s) => s.staffStatus === 'Vacant');
    const noData = enriched.filter((s) => s.jhpmsClasses === 0 && s.eduHours === 0);

    // Count by district for bar chart
    const distCounts = {};
    [...zeroVisits, ...nonFunctional, ...vacantCC].forEach((s) => {
      distCounts[s.district] = (distCounts[s.district] || 0) + 1;
    });
    const distChart = Object.entries(distCounts)
      .map(([name, count]) => ({ name: name.length > 15 ? name.substring(0, 13) + '..' : name, count, fullName: name }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { zeroVisits, nonFunctional, vacantCC, noData, distChart };
  }, [enriched]);

  /* ── 12. Bottleneck root causes ── */
  const bottlenecks = useMemo(() => {
    const causes = {};
    enriched.forEach((s) => {
      if (s.rootCause !== 'Normal') {
        causes[s.rootCause] = (causes[s.rootCause] || 0) + 1;
      }
    });
    const chartData = Object.entries(causes)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    return { causes, chartData };
  }, [enriched]);

  /* ── 13. Sorted + paginated PM review grid ── */
  const sortedRows = useMemo(() => {
    const sorted = [...enriched].sort((a, b) => {
      let va = a[sortKey];
      let vb = b[sortKey];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return showAll ? sorted : sorted.slice(0, 50);
  }, [enriched, sortKey, sortDir, showAll]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  /* ── 14. Rankings: top 5, bottom 5 ── */
  const rankings = useMemo(() => {
    const sorted = [...enriched].sort((a, b) => b.compositeScore - a.compositeScore);
    const top5 = sorted.slice(0, 5).map((s) => ({
      name: s.schoolName.length > 25 ? s.schoolName.substring(0, 23) + '..' : s.schoolName,
      score: Math.round(s.compositeScore),
      fullName: s.schoolName
    }));
    const bot5 = sorted
      .slice(-5)
      .reverse()
      .map((s) => ({
        name: s.schoolName.length > 25 ? s.schoolName.substring(0, 23) + '..' : s.schoolName,
        score: Math.round(s.compositeScore),
        fullName: s.schoolName
      }));
    return { top5, bot5 };
  }, [enriched]);

  /* ── Badge helper ── */
  const StatusBadge = ({ status }) => {
    const c =
      status === 'Active'
        ? 'bg-green-100 text-green-700 border-green-200'
        : status === 'Vacant'
        ? 'bg-red-100 text-red-700 border-red-200'
        : status === 'Pending'
        ? 'bg-amber-100 text-amber-700 border-amber-200'
        : 'bg-gray-100 text-gray-500 border-gray-200';
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c}`}>{status}</span>;
  };

  const RootBadge = ({ cause }) => {
    const colors = {
      'Power Failure': 'bg-orange-100 text-orange-700',
      'Staff Vacancy': 'bg-red-100 text-red-700',
      'Visitor Ineffectiveness': 'bg-rose-100 text-rose-700',
      'Training Gap': 'bg-purple-100 text-purple-700',
      'Self-Sustaining': 'bg-green-100 text-green-700',
      'Non-Functional Lab': 'bg-red-100 text-red-700',
      'Not Visited': 'bg-slate-100 text-slate-600',
      'Dormancy Alert': 'bg-amber-100 text-amber-700',
      'Low Utilization': 'bg-yellow-100 text-yellow-700',
      Normal: 'bg-gray-50 text-gray-400'
    };
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${colors[cause] || 'bg-gray-100 text-gray-500'}`}>
        {cause}
      </span>
    );
  };

  const SortHeader = ({ label, field, className = '' }) => (
    <th
      className={`cursor-pointer select-none hover:bg-teal-50 transition ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === field && <span className="text-teal-600">{sortDir === 'asc' ? '▲' : '▼'}</span>}
      </div>
    </th>
  );

  /* ── Custom tooltip for bar charts ── */
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white p-2 rounded-lg shadow-lg border border-gray-200 text-xs">
        <p className="font-bold text-gray-800">{d.fullName || d.name}</p>
        <p className="text-teal-700 font-semibold">{payload[0].name}: {payload[0].value}</p>
      </div>
    );
  };

  const bottleneckColors = ['#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#10b981', '#f97316', '#6366f1', '#ec4899'];

  /* ──────────────────────────────────────────────────────────── */
  /* RENDER                                                      */
  /* ──────────────────────────────────────────────────────────── */

  if (!fSchools.length) {
    return (
      <div className="p-10 text-center text-gray-500 bg-white/80 rounded-2xl m-4 shadow-sm border border-white/40 animate-fade-in">
        No school data available. Please upload School Master data in Setup first.
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in p-4">

      {/* ═══════ HEADER STRIP ═══════ */}
      <div className="portal-card !rounded-2xl overflow-visible">
        <div className="portal-card-header !rounded-t-2xl flex items-center gap-2">
          <Icons.ExecutiveClipboard className="w-6 h-6 shrink-0" />
          EXECUTIVE OVERALL ANALYSIS
        </div>
        <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-gradient-to-r from-teal-50 to-white">
          {/* breadcrumbs */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-teal-800">Filters:</span>
            <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-semibold">
              Projects: {selProjects?.length ? selProjects.length : 'All'}
            </span>
            <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-semibold">
              Districts: {selDistricts?.length ? selDistricts.length : 'All'}
            </span>
            <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-semibold">
              Blocks: {selBlocks?.length ? selBlocks.length : 'All'}
            </span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">
              {startDate && endDate ? `${formatDate(startDate)} → ${formatDate(endDate)}` : 'All Dates'}
            </span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-400 italic">Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {/* export buttons */}
          <div className="flex gap-2 no-print">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition shadow-sm"
            >
              <Icons.Print className="w-4 h-4" /> Export PDF
            </button>
            <button
              onClick={() => alert('PPTX export feature coming soon!')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition shadow-sm"
            >
              <Icons.Export className="w-4 h-4" /> Export PPTX
            </button>
          </div>
        </div>
      </div>

      {/* ═══════ SECTION 1: KPI SUMMARY CARDS ═══════ */}
      <div>
        <h2 className="text-sm font-extrabold text-teal-900 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Icons.Dashboard className="w-5 h-5" /> Key Performance Indicators
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((kpi, i) => (
            <div key={i} className={`rounded-xl border p-4 ${bgFor(kpi.rawPct)} transition hover:shadow-md`}>
              <div className="flex items-start justify-between">
                <span className="text-2xl">{kpi.icon}</span>
                <span className={`text-[10px] font-extrabold uppercase ${colorFor(kpi.rawPct)}`}>
                  {kpi.rawPct >= 70 ? '▲ Good' : kpi.rawPct >= 40 ? '► Moderate' : '▼ Poor'}
                </span>
              </div>
              <div className="mt-2">
                <div className={`text-2xl font-black ${colorFor(kpi.rawPct)}`} style={{ fontFamily: 'Inter, sans-serif' }}>
                  {kpi.value}
                </div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">{kpi.label}</div>
              </div>
              {/* mini sparkline bar */}
              <div className="mt-2 bg-white/50 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${clamp(kpi.rawPct)}%`, background: barColorFor(kpi.rawPct) }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════ SECTION 2: COMPOSITE HEALTH GAUGE ═══════ */}
      <div className="portal-card">
        <div className="portal-card-header flex items-center gap-2">
          <Icons.Gauge className="w-6 h-6 shrink-0" /> COMPOSITE HEALTH GAUGE
        </div>
        <div className="p-6 flex flex-col lg:flex-row items-center gap-6">
          <div className="flex-shrink-0">
            <SemiGauge
              value={healthData.composite}
              size={240}
              label="Overall Health"
              grade={healthData.grade}
              gradeColor={healthData.gradeColor}
            />
          </div>
          <div className="flex-1 w-full space-y-3">
            <MiniBar label="JHPMS Labs" value={healthData.jhpmsGlobal} weight={30} color="#0d9488" />
            <MiniBar label="EduStat Usage" value={healthData.edustatGlobal} weight={25} color="#2563eb" />
            <MiniBar label="Visit Coverage" value={healthData.visitGlobal} weight={25} color="#7c3aed" />
            <MiniBar label="Manpower" value={healthData.manpowerGlobal} weight={20} color="#d97706" />
            <div className="text-[10px] text-gray-400 mt-2 italic">
              Composite = JHPMS×0.30 + EduStat×0.25 + Visits×0.25 + Manpower×0.20
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ SECTION 3: EXECUTIVE NARRATIVE ═══════ */}
      <div className="portal-card">
        <div className="portal-card-header flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 !text-white">
          <Icons.Robot className="w-6 h-6 shrink-0" /> EXECUTIVE NARRATIVE
        </div>
        <div className="p-5 bg-indigo-50/40">
          <div className="bg-white rounded-xl border border-indigo-100 p-5 shadow-sm text-sm text-gray-700 leading-relaxed space-y-2" style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
            {narrative.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════ SECTION 4: ACHIEVEMENTS PANEL ═══════ */}
      <div className="portal-card border-green-200">
        <div className="portal-card-header !bg-gradient-to-r !from-green-600 !to-emerald-600 flex items-center gap-2">
          <Icons.Trophy className="w-6 h-6 shrink-0" /> ACHIEVEMENTS & WINS
        </div>
        <div className="p-4 bg-green-50/40">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {achievements.map((win, i) => (
              <div key={i} className="bg-white rounded-xl border border-green-200 p-3 shadow-sm hover:shadow-md transition">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{win.label}</span>
                </div>
                <div className="text-sm font-extrabold text-gray-800 truncate" title={win.value}>{win.value}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{win.detail}</div>
              </div>
            ))}
            {achievements.length === 0 && (
              <div className="col-span-full text-center text-xs text-gray-400 py-4 italic">
                Not enough data to compute achievements yet.
              </div>
            )}
          </div>
          {/* Top 5 Improvers Bar Chart */}
          {topImprovers.length > 0 && (
            <div>
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-green-800 mb-2">Top 5 Schools by Score</h4>
              <div className="h-44 bg-white rounded-xl border border-green-100 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topImprovers} layout="vertical" margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#334155' }} width={130} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="score" name="Score %" radius={[0, 6, 6, 0]} barSize={18}>
                      {topImprovers.map((entry, idx) => (
                        <Cell key={idx} fill={idx === 0 ? '#059669' : idx === 1 ? '#10b981' : '#34d399'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ SECTION 5: CRITICAL AREAS PANEL ═══════ */}
      <div className="portal-card border-red-200">
        <div className="portal-card-header !bg-gradient-to-r !from-red-600 !to-rose-600 flex items-center gap-2">
          <Icons.Alert className="w-6 h-6 shrink-0" /> CRITICAL AREAS
        </div>
        <div className="p-4 bg-red-50/30">
          {/* summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: '0 Visits', count: criticalAreas.zeroVisits.length, icon: '🚫' },
              { label: 'Non-Functional Labs', count: criticalAreas.nonFunctional.length, icon: '⚠️' },
              { label: 'Vacant CCs', count: criticalAreas.vacantCC.length, icon: '👤' },
              { label: 'No Data Schools', count: criticalAreas.noData.length, icon: '📭' }
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-red-200 p-3 text-center shadow-sm">
                <div className="text-xl">{item.icon}</div>
                <div className="text-xl font-black text-red-600" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {item.count}
                </div>
                <div className="text-[10px] font-bold text-gray-500 uppercase">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Critical schools table */}
            <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
              <div className="bg-red-100 px-3 py-2 text-[10px] font-extrabold text-red-800 uppercase tracking-wider">
                Critical Schools (Score &lt;30%)
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full portal-table">
                  <thead>
                    <tr>
                      <th className="text-left">#</th>
                      <th className="text-left">School</th>
                      <th className="text-left">District</th>
                      <th className="text-center">Score</th>
                      <th className="text-center">Root Cause</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enriched
                      .filter((s) => s.compositeScore < 30)
                      .sort((a, b) => a.compositeScore - b.compositeScore)
                      .slice(0, 20)
                      .map((s, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td className="truncate max-w-[140px]" title={s.schoolName}>{s.schoolName}</td>
                          <td>{s.district}</td>
                          <td className="text-center font-bold text-red-600">{Math.round(s.compositeScore)}%</td>
                          <td className="text-center"><RootBadge cause={s.rootCause} /></td>
                        </tr>
                      ))}
                    {enriched.filter((s) => s.compositeScore < 30).length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center text-gray-400 italic py-4">No critical schools found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Count by district bar chart */}
            <div className="bg-white rounded-xl border border-red-100 p-3">
              <div className="text-[10px] font-extrabold text-red-800 uppercase tracking-wider mb-2">
                Issues by District
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={criticalAreas.distChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fef2f2" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Issues" radius={[6, 6, 0, 0]} barSize={28}>
                      {criticalAreas.distChart.map((_, idx) => (
                        <Cell key={idx} fill={idx % 2 === 0 ? '#ef4444' : '#f87171'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ SECTION 6: BOTTLENECKS PANEL ═══════ */}
      <div className="portal-card border-amber-200">
        <div className="portal-card-header !bg-gradient-to-r !from-amber-500 !to-yellow-500 !text-gray-900 flex items-center gap-2">
          <Icons.IssueFound className="w-6 h-6 shrink-0" /> BOTTLENECKS & ROOT CAUSE ENGINE
        </div>
        <div className="p-4 bg-amber-50/30">
          {/* categorized counts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {bottlenecks.chartData.slice(0, 8).map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-amber-200 p-3 text-center shadow-sm hover:shadow-md transition">
                <div className="text-lg font-black text-amber-700" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {item.count}
                </div>
                <div className="text-[10px] font-bold text-gray-600 uppercase mt-0.5">{item.name}</div>
              </div>
            ))}
            {bottlenecks.chartData.length === 0 && (
              <div className="col-span-full text-center text-xs text-gray-400 py-4 italic">
                No bottlenecks detected — all systems nominal.
              </div>
            )}
          </div>
          {/* Root cause frequency chart */}
          {bottlenecks.chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-amber-100 p-3">
              <div className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider mb-2">
                Root Cause Frequency
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bottlenecks.chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fffbeb" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280', angle: -20 }} interval={0} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Schools" radius={[6, 6, 0, 0]} barSize={32}>
                      {bottlenecks.chartData.map((_, idx) => (
                        <Cell key={idx} fill={bottleneckColors[idx % bottleneckColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ SECTION 7: PM EXECUTIVE REVIEW GRID TABLE ═══════ */}
      <div className="portal-card">
        <div className="portal-card-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icons.Analytics className="w-6 h-6 shrink-0" /> PM EXECUTIVE REVIEW GRID
          </div>
          <span className="text-[10px] font-medium text-teal-100 tracking-wider">
            {showAll ? enriched.length : Math.min(50, enriched.length)} of {enriched.length} rows
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full portal-table text-[11px]">
            <thead>
              <tr>
                <th className="w-8">#</th>
                <SortHeader label="School Name" field="schoolName" />
                <SortHeader label="UDISE" field="udise" />
                <SortHeader label="District" field="district" />
                <SortHeader label="Block" field="block" />
                <SortHeader label="Visits" field="fieldVisits" />
                <SortHeader label="Last Visit" field="lastVisitDate" />
                <th>Staffing</th>
                <SortHeader label="JHPMS" field="jhpmsClasses" />
                <SortHeader label="EduStat Hrs" field="eduHours" />
                <SortHeader label="Score %" field="compositeScore" />
                <th>Root Cause</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((s, i) => (
                <tr key={i} className={s.compositeScore < 30 ? 'bg-red-50/40' : ''}>
                  <td className="font-bold text-gray-400">{i + 1}</td>
                  <td className="font-semibold max-w-[160px] truncate" title={s.schoolName}>{s.schoolName}</td>
                  <td className="text-center font-mono text-[10px]">{s.udise}</td>
                  <td>{s.district}</td>
                  <td>{s.block}</td>
                  <td className="text-center font-bold">{s.fieldVisits}</td>
                  <td className="text-center text-[10px]">{s.lastVisitDate ? formatDate(s.lastVisitDate) : '-'}</td>
                  <td className="text-center"><StatusBadge status={s.staffStatus} /></td>
                  <td className="text-center font-bold">{s.jhpmsClasses}</td>
                  <td className="text-center">{s.eduHours.toFixed(1)}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${clamp(s.compositeScore)}%`,
                            background: barColorFor(s.compositeScore)
                          }}
                        />
                      </div>
                      <span className={`text-[10px] font-bold w-8 text-right ${colorFor(s.compositeScore)}`}>
                        {Math.round(s.compositeScore)}
                      </span>
                    </div>
                  </td>
                  <td><RootBadge cause={s.rootCause} /></td>
                  <td className="max-w-[180px] text-[10px] text-gray-500 truncate" title={s.recommendation}>
                    {s.recommendation}
                  </td>
                </tr>
              ))}
              {sortedRows.length === 0 && (
                <tr>
                  <td colSpan="13" className="text-center text-gray-400 italic py-6">No data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {enriched.length > 50 && (
          <div className="p-3 text-center border-t border-gray-100 no-print">
            <button
              onClick={() => setShowAll(!showAll)}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-teal-100 text-teal-700 hover:bg-teal-200 transition"
            >
              {showAll ? `Show Top 50 Only` : `Show All ${enriched.length} Rows`}
            </button>
          </div>
        )}
      </div>

      {/* ═══════ SECTION 8: RANKINGS & LEADERBOARDS ═══════ */}
      <div>
        <h2 className="text-sm font-extrabold text-teal-900 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Icons.Trophy className="w-5 h-5" /> Rankings & Leaderboards
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top 5 */}
          <div className="portal-card">
            <div className="portal-card-header !bg-gradient-to-r !from-green-600 !to-emerald-600 flex items-center gap-2">
              🏆 TOP 5 SCHOOLS
            </div>
            <div className="p-4">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rankings.top5} layout="vertical" margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#334155' }} width={150} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="score" name="Score %" radius={[0, 6, 6, 0]} barSize={20}>
                      {rankings.top5.map((_, idx) => (
                        <Cell key={idx} fill={['#fbbf24', '#94a3b8', '#d97706', '#0d9488', '#0d9488'][idx]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Medal list */}
              <div className="mt-3 space-y-1.5">
                {rankings.top5.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-lg">{['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i]}</span>
                    <span className="font-bold text-gray-800 truncate flex-1" title={s.fullName}>{s.fullName}</span>
                    <span className={`font-black ${colorFor(s.score)}`}>{s.score}%</span>
                  </div>
                ))}
                {rankings.top5.length === 0 && (
                  <div className="text-xs text-gray-400 italic text-center py-3">No data to rank</div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom 5 */}
          <div className="portal-card">
            <div className="portal-card-header !bg-gradient-to-r !from-red-600 !to-rose-600 flex items-center gap-2">
              ⚠️ BOTTOM 5 SCHOOLS
            </div>
            <div className="p-4">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rankings.bot5} layout="vertical" margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#334155' }} width={150} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="score" name="Score %" radius={[0, 6, 6, 0]} barSize={20}>
                      {rankings.bot5.map((_, idx) => (
                        <Cell key={idx} fill={['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2'][idx]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-1.5">
                {rankings.bot5.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                    <span className="font-bold text-gray-800 truncate flex-1" title={s.fullName}>{s.fullName}</span>
                    <span className="font-black text-red-600">{s.score}%</span>
                  </div>
                ))}
                {rankings.bot5.length === 0 && (
                  <div className="text-xs text-gray-400 italic text-center py-3">No data to rank</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverallAnalysis;
