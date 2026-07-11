import XLSX from 'xlsx-js-style';

export const parseDateRobust = (input) => {
  if (!input) return null;
  if (input instanceof Date) return input;
  if (typeof input === 'number') return new Date(Math.round((input - 25569) * 86400 * 1000));
  if (typeof input === 'string') {
    const clean = input.trim().replace(/["']/g, '');
    
    // Check for YYYY-MM-DD format
    const yyyymmdd = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (yyyymmdd) return new Date(parseInt(yyyymmdd[1]), parseInt(yyyymmdd[2]) - 1, parseInt(yyyymmdd[3]));
    
    // Check for DD/MM/YYYY or MM/DD/YYYY formats
    const partMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (partMatch) {
      const val1 = parseInt(partMatch[1], 10);
      const val2 = parseInt(partMatch[2], 10);
      const year = parseInt(partMatch[3], 10);
      
      if (val2 > 12) {
        // Second segment > 12 implies it must be the Day, format is MM/DD/YYYY
        return new Date(year, val1 - 1, val2);
      }
      if (val1 > 12) {
        // First segment > 12 implies it must be the Day, format is DD/MM/YYYY
        return new Date(year, val2 - 1, val1);
      }
      // Fallback/Default to Indian standard DD/MM/YYYY when both <= 12
      return new Date(year, val2 - 1, val1);
    }
    
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

export const formatDate = (dateInput) => {
  if (!dateInput) return '-';
  const d = parseDateRobust(dateInput);
  if (!d || isNaN(d.getTime())) return '-';

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
  if (!data || data.length === 0) return;

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();

  // Find worksheet range
  const ref = ws['!ref'];
  if (!ref) return;

  const range = XLSX.utils.decode_range(ref);
  const cols = Object.keys(data[0] || {});

  // 1. Column Auto-Widths calculation
  const colWidths = cols.map(col => {
    let maxLen = String(col).length;
    data.forEach(row => {
      const val = row[col];
      if (val !== null && val !== undefined) {
        maxLen = Math.max(maxLen, String(val).length);
      }
    });
    return { wch: Math.min(Math.max(maxLen + 4, 10), 50) };
  });
  ws['!cols'] = colWidths;

  // 2. Define standard style presets
  const headerStyle = {
    fill: { fgColor: { rgb: "0F766E" } }, // Teal 700
    font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { rgb: "0D9488" } },
      bottom: { style: "medium", color: { rgb: "0D9488" } },
      left: { style: "thin", color: { rgb: "0D9488" } },
      right: { style: "thin", color: { rgb: "0D9488" } }
    }
  };

  const borderStyle = {
    top: { style: "thin", color: { rgb: "94A3B8" } },
    bottom: { style: "thin", color: { rgb: "94A3B8" } },
    left: { style: "thin", color: { rgb: "94A3B8" } },
    right: { style: "thin", color: { rgb: "94A3B8" } }
  };

  // Helper to determine cell styling based on data row and column values
  const getCellStyles = (rowVal, colName, isAlternateRow) => {
    let style = {
      font: { name: "Segoe UI", sz: 10 },
      border: borderStyle,
      alignment: { vertical: "center", wrapText: true }
    };

    // Row Zebra Striping
    if (isAlternateRow) {
      style.fill = { fgColor: { rgb: "F8FAFC" } }; // Slate 50
    } else {
      style.fill = { fgColor: { rgb: "FFFFFF" } };
    }

    // Rank Shading (Gold, Silver, Bronze)
    const rankVal = parseInt(rowVal['Rank'] || rowVal['rank'] || rowVal['Slno'] || rowVal['slno']);
    if (rankVal === 1) {
      style.fill = { fgColor: { rgb: "FEF3C7" } }; // Amber 100 (Gold)
      style.font.bold = true;
    } else if (rankVal === 2) {
      style.fill = { fgColor: { rgb: "F1F5F9" } }; // Slate 100 (Silver)
      style.font.bold = true;
    } else if (rankVal === 3) {
      style.fill = { fgColor: { rgb: "FFEDD5" } }; // Orange 100 (Bronze)
      style.font.bold = true;
    }

    // Special column-based formatting and color highlights
    const colLower = colName.toLowerCase();
    
    // Status / Instructor Highlighting
    if (colLower.includes('status') || colLower.includes('instructor')) {
      const statusStr = String(rowVal[colName] || '').toUpperCase();
      if (statusStr.includes('ACTIVE') || statusStr.includes('WORKING')) {
        style.fill = { fgColor: { rgb: "DCFCE7" } }; // Green 100
        style.font.color = { rgb: "15803D" }; // Green 700
        style.font.bold = true;
      } else if (statusStr.includes('RESIGN') || statusStr.includes('TERMINATE') || statusStr.includes('VACANT')) {
        style.fill = { fgColor: { rgb: "FEE2E2" } }; // Red 100
        style.font.color = { rgb: "B91C1C" }; // Red 700
        style.font.bold = true;
      }
      style.alignment.horizontal = "center";
    }

    // Score column highlights
    if (colLower.includes('score') || colLower.includes('percent') || colLower.includes('%') || colLower.includes('combined')) {
      style.fill = { fgColor: { rgb: "E0E7FF" } }; // Indigo 100
      style.font.color = { rgb: "4338CA" }; // Indigo 700
      style.font.bold = true;
      style.alignment.horizontal = "center";
    }

    // Action Plan / Rationale Alignment
    if (colLower.includes('action') || colLower.includes('plan') || colLower.includes('rationale')) {
      style.alignment.vertical = "top";
      style.alignment.horizontal = "left";
    }

    // Align numeric columns center/right
    const cellVal = rowVal[colName];
    if (typeof cellVal === 'number') {
      style.alignment.horizontal = "right";
    } else if (colLower.includes('udise') || colLower.includes('date') || colLower.includes('rank') || colLower.includes('slno')) {
      style.alignment.horizontal = "center";
    } else {
      style.alignment.horizontal = "left";
    }

    return style;
  };

  // 3. Loop through worksheet cells and apply styles
  for (let R = range.s.r; R <= range.e.r; ++R) {
    const isHeader = (R === 0);
    const isAlternateRow = (R % 2 === 0);
    const rowVal = isHeader ? null : data[R - 1];

    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellRef];
      if (!cell) continue;

      const colName = cols[C];

      if (isHeader) {
        cell.s = headerStyle;
      } else {
        cell.s = getCellStyles(rowVal, colName, isAlternateRow);
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const downloadSVG = (svgElement, filename) => {
  if (!svgElement) return;
  try {
    // Clone and ensure the standard namespace is present
    const clonedSvg = svgElement.cloneNode(true);
    if (!clonedSvg.getAttribute('xmlns')) {
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    const svgString = new XMLSerializer().serializeToString(clonedSvg);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error exporting SVG', err);
  }
};

export const downloadPNG = (svgElement, filename) => {
  if (!svgElement) return;
  try {
    const clonedSvg = svgElement.cloneNode(true);
    if (!clonedSvg.getAttribute('xmlns')) {
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    const svgString = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const rect = svgElement.getBoundingClientRect();
      const width = rect.width || svgElement.viewBox?.baseVal?.width || svgElement.clientWidth || 300;
      const height = rect.height || svgElement.viewBox?.baseVal?.height || svgElement.clientHeight || 200;
      
      // Support high DPI screens
      const scale = window.devicePixelRatio || 1;
      canvas.width = width * scale;
      canvas.height = height * scale;
      
      const context = canvas.getContext('2d');
      context.scale(scale, scale);
      context.fillStyle = '#ffffff'; // white background so png is readable
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      
      const png = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = png;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };
    image.src = url;
  } catch (err) {
    console.error('Error exporting PNG', err);
  }
};

export const downloadCSV = (data, filename) => {
  if (!data || !data.length) return;
  try {
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        const escaped = (val === null || val === undefined) ? '' : ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error exporting CSV', err);
  }
};
export const calculateDateRanges = (data, dateField = 'date', gapThresholdDays = 10) => {
  if (!Array.isArray(data) || data.length === 0) return 'No Data';
  
  const times = data
    .map(row => {
      const rawVal = row[dateField];
      if (!rawVal) return null;
      const d = parseDateRobust(rawVal);
      return d && !isNaN(d.getTime()) ? new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() : null;
    })
    .filter(Boolean);
    
  if (times.length === 0) return 'No Data';
  
  const uniqueTimes = [...new Set(times)].sort((a, b) => a - b);
  
  const ranges = [];
  let start = uniqueTimes[0];
  let prev = uniqueTimes[0];
  
  for (let i = 1; i < uniqueTimes.length; i++) {
    const curr = uniqueTimes[i];
    const gapDays = (curr - prev) / (1000 * 60 * 60 * 24);
    if (gapDays > gapThresholdDays) {
      ranges.push({ start: new Date(start), end: new Date(prev) });
      start = curr;
    }
    prev = curr;
  }
  ranges.push({ start: new Date(start), end: new Date(prev) });
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmt = (d) => {
    const day = String(d.getDate()).padStart(2, '0');
    const mon = months[d.getMonth()];
    const yr = d.getFullYear();
    return `${day}-${mon}-${yr}`;
  };
  
  return ranges.map(r => `${fmt(r.start)} to ${fmt(r.end)}`).join(', ');
};


