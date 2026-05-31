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

    console.log(`Total schools: ${schools.length}, Total JHPMS rows: ${jhpmsLab.length}`);

    // Filter schools to Jamtara and ICT-627
    const jamtaraSchools = schools.filter(s => 
      s.district && s.district.toUpperCase().trim() === 'JAMTARA' &&
      s.project_name && s.project_name.toUpperCase().trim() === 'ICT-627'
    );
    console.log(`Schools in Jamtara for ICT-627: ${jamtaraSchools.length}`);

    const allowedUdises = new Set(jamtaraSchools.map(s => String(s.udise_code || '').trim()));
    console.log("Allowed UDISE codes in Jamtara ICT-627:", Array.from(allowedUdises));

    const startDate = "2026-03-01";
    const endDate = "2026-03-31";

    const getVal = (row, keyMatch) => {
      const key = Object.keys(row).find(k => k.toLowerCase().includes(keyMatch.toLowerCase()));
      return key ? row[key] : null;
    };

    // Calculate unique JHPMS dates count per school in Jamtara ICT-627
    const schoolDatesMap = {};
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
          if (!schoolDatesMap[udise]) {
            schoolDatesMap[udise] = new Set();
          }
          schoolDatesMap[udise].add(dateStr);
        }
      }
    });

    console.log("\nUnique JHPMS counts for ALL schools in the dataset:");
    Object.keys(schoolDatesMap).forEach(udise => {
      const sch = schools.find(s => String(s.udise_code || '').trim() === udise);
      const isAllowed = allowedUdises.has(udise);
      console.log(`School UDISE: "${udise}" | Name: "${sch ? sch.school_name : 'Unknown'}" | Allowed (Filtered): ${isAllowed} | Unique Class Days: ${schoolDatesMap[udise].size}`);
      if (schoolDatesMap[udise].size > 20) {
        console.log("Class Days:", Array.from(schoolDatesMap[udise]).sort());
      }
    });

  } catch (err) {
    console.error("Error:", err);
  }
}

run();
