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

async function run() {
  try {
    console.log("Downloading jhpms_lab...");
    const { data: jhpmsData, error: jErr } = await supabase.storage
      .from('app-data')
      .download('admin_jhpms_lab.json.gz');
    if (jErr) throw jErr;
    const jhpmsLab = JSON.parse(await decompressGzip(Buffer.from(await jhpmsData.arrayBuffer())));

    console.log(`Total JHPMS rows: ${jhpmsLab.length}`);

    const getVal = (row, keyMatch) => {
      const key = Object.keys(row).find(k => k.toLowerCase().includes(keyMatch.toLowerCase()));
      return key ? row[key] : null;
    };

    // Let's inspect all unique date inputs in March 2026
    const uniqueRawDates = new Set();
    jhpmsLab.forEach(l => {
      const rawDate = l.date || getVal(l, 'date');
      if (rawDate && (String(rawDate).includes('2026-03') || String(rawDate).includes('/03/2026') || String(rawDate).includes('Mar'))) {
        uniqueRawDates.add(String(rawDate).trim());
      }
    });

    console.log("Unique Raw Date strings in JHPMS matching March 2026:", Array.from(uniqueRawDates).sort());

  } catch (err) {
    console.error("Error:", err);
  }
}

run();
