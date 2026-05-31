const { createClient } = require('@supabase/supabase-js');
const zlib = require('zlib');

const supabaseUrl = 'https://jvmmkenowaiyvxkofmqt.supabase.co';
const supabaseKey = 'sb_publishable_xKXKI1K3LOIsNMF-Wb1cIA_t0Ld4mXn';
const supabase = createClient(supabaseUrl, supabaseKey);

async function decompressGzip(buffer) {
  return new Promise((resolve, reject) => {
    zlib.gunzip(buffer, (err, decompressed) => {
      if (err) reject(err);
      else resolve(decompressed);
    });
  });
}

const parseDateRobust = (input) => {
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

async function run() {
  try {
    console.log("Downloading schools master...");
    const { data: schoolsData, error: sErr } = await supabase.storage
      .from('app-data')
      .download('admin_schools.json.gz');
    if (sErr) throw sErr;
    const schools = JSON.parse(await decompressGzip(Buffer.from(await schoolsData.arrayBuffer())));

    console.log("Downloading jhpms_lab...");
    const { data: jhpmsData, error: jErr } = await supabase.storage
      .from('app-data')
      .download('admin_jhpms_lab.json.gz');
    if (jErr) throw jErr;
    const jhpmsLab = JSON.parse(await decompressGzip(Buffer.from(await jhpmsData.arrayBuffer())));

    const startDate = "2026-03-01";
    const endDate = "2026-03-31";

    const getVal = (row, keyMatch) => {
      const key = Object.keys(row).find(k => k.toLowerCase().includes(keyMatch.toLowerCase()));
      return key ? row[key] : null;
    };

    // Calculate unique JHPMS dates count per school globally
    const schoolDatesMap = {};
    const globalDates = new Set();

    jhpmsLab.forEach(l => {
      const udise = String(l.udise || getVal(l, 'udise') || '').trim();
      const rawDate = l.date || getVal(l, 'date');
      const d = parseDateRobust(rawDate);
      if (d && !isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        if (dateStr >= startDate && dateStr <= endDate) {
          globalDates.add(dateStr);
          if (!schoolDatesMap[udise]) {
            schoolDatesMap[udise] = new Set();
          }
          schoolDatesMap[udise].add(dateStr);
        }
      }
    });

    console.log(`Global unique dates in March 2026: ${globalDates.size}`);
    console.log("Sorted Global Dates:", Array.from(globalDates).sort());

    const sortedSchools = Object.entries(schoolDatesMap)
      .map(([udise, set]) => {
        const sch = schools.find(s => String(s.udise_code || '').trim() === udise);
        return {
          udise,
          name: sch ? sch.school_name : 'Unknown',
          district: sch ? sch.district : 'Unknown',
          project: sch ? sch.project_name : 'Unknown',
          count: set.size,
          dates: Array.from(set).sort()
        };
      })
      .sort((a, b) => b.count - a.count);

    console.log("\nTop 10 schools by unique date count in March 2026:");
    sortedSchools.slice(0, 10).forEach(x => {
      console.log(`School: "${x.name}" | UDISE: "${x.udise}" | District: "${x.district}" | Project: "${x.project}" | Count: ${x.count}`);
      console.log("Dates:", x.dates);
    });

  } catch (err) {
    console.error("Error:", err);
  }
}

run();
