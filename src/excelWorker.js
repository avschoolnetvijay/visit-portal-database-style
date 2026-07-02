import * as XLSX from 'xlsx';

self.onmessage = function (e) {
    let type = undefined;
    try {
        if (e.data) {
            type = e.data.type;
        }
        const buffer = e.data?.buffer;
        if (!buffer) {
            throw new Error("No buffer received in worker.");
        }
        const data = new Uint8Array(buffer);
        
        // Use dense mode to significantly reduce memory usage for large files
        const wb = XLSX.read(data, { type: 'array', dense: true });
        
        if (!wb.SheetNames || wb.SheetNames.length === 0) {
            throw new Error(`No sheets found in workbook. Buffer size: ${buffer.byteLength} bytes.`);
        }

        let bestJson = [];
        let bestSheetName = "";
        let debugInfo = [];

        // Find the sheet with the most rows
        for (const sheetName of wb.SheetNames) {
            const sheet = wb.Sheets[sheetName];
            
            // Recalculate range if missing or too small (e.g. A1:A1 / A1:B1 when we have many rows)
            const range = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : null;
            const rangeRows = range ? (range.e.r - range.s.r + 1) : 0;
            
            if (Array.isArray(sheet)) {
                // Dense sheet recalculation
                if (!sheet['!ref'] || rangeRows <= 1) {
                    let maxCol = -1;
                    sheet.forEach(row => {
                        if (Array.isArray(row) && row.length > maxCol) {
                            maxCol = row.length;
                        }
                    });
                    if (sheet.length > 0 && maxCol > 0) {
                        sheet['!ref'] = XLSX.utils.encode_range({
                            s: { c: 0, r: 0 },
                            e: { c: maxCol - 1, r: sheet.length - 1 }
                        });
                    }
                }
            } else {
                // Sparse sheet recalculation
                if (!sheet['!ref'] || rangeRows <= 1) {
                    let maxRow = -1;
                    let maxCol = -1;
                    Object.keys(sheet).forEach(k => {
                        if (k[0] !== '!') {
                            const cell = XLSX.utils.decode_cell(k);
                            if (cell) {
                                if (cell.r > maxRow) maxRow = cell.r;
                                if (cell.c > maxCol) maxCol = cell.c;
                            }
                        }
                    });
                    if (maxRow >= 0 && maxCol >= 0) {
                        sheet['!ref'] = XLSX.utils.encode_range({
                            s: { c: 0, r: 0 },
                            e: { c: maxCol, r: maxRow }
                        });
                    }
                }
            }
            
            const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
            
            let currentJson = json;
            if (json.length === 0) {
                 const rawJson = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
                 if (rawJson.length > 0) {
                      const headers = rawJson[0].map((_, i) => `Column_${i+1}`);
                      currentJson = rawJson.map(row => {
                          const obj = {};
                          headers.forEach((h, i) => obj[h] = row[i]);
                          return obj;
                      });
                 }
            }

            debugInfo.push(`${sheetName}: ${currentJson.length} rows`);

            if (currentJson.length > bestJson.length) {
                bestJson = currentJson;
                bestSheetName = sheetName;
            }
            
            // Clean up sheet memory immediately to avoid Out of Memory errors
            wb.Sheets[sheetName] = null;
        }

        if (bestJson.length === 0) {
            throw new Error(`Parsed successfully but all sheets were empty! Info: ${debugInfo.join(', ')}`);
        }

        self.postMessage({ success: true, json: bestJson, sheetName: bestSheetName, type });
    } catch (err) {
        self.postMessage({ success: false, error: err.message, type });
    }
};
