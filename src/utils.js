import * as XLSX from 'xlsx';

export const parseDateRobust = (input) => {
  if (!input) return null;
  if (input instanceof Date) return input;
  if (typeof input === 'number') return new Date(Math.round((input - 25569) * 86400 * 1000));
  if (typeof input === 'string') {
    const clean = input.trim();
    const ddmmyyyy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ddmmyyyy) return new Date(ddmmyyyy[3], parseInt(ddmmyyyy[2]) - 1, ddmmyyyy[1]);
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

export const formatDate = (dateInput) => {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
};

export const getMonthsInRange = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
};

export const calculateStatus = (unique, target) => {
  if (target === 0) return { label: "N/A", color: "text-gray-400", val: -1 };
  const pct = (unique / target) * 100;
  if (unique === 0) return { label: "Not Visited", color: "text-red-600", val: 0 };
  if (pct < 50) return { label: "Low Visit", color: "text-amber-600", val: 1 };
  if (pct < 100) return { label: "Partial Pending", color: "text-teal-600", val: 2 };
  return { label: "Target Completed", color: "text-green-600", val: 3 };
};

export const calculateEngagement = (unique, target, daysSince) => {
  let score = 0;
  if (target > 0) score += Math.min((unique / target) * 50, 50);
  if (unique > 0) {
    if (daysSince < 30) score += 30;
    else if (daysSince < 60) score += 15;
  }
  if (unique > 1) score += 20;
  else if (unique === 1) score += 10;
  return Math.round(score);
};

export const exportToExcel = (data, fileName) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};
