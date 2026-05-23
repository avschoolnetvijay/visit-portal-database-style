import * as XLSX from 'xlsx';

self.onmessage = function (e) {
    try {
        const { buffer, type } = e.data;
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
            
            // Manually fix missing !ref if dense array exists
            if (!sheet['!ref'] && sheet['!data'] && sheet['!data'].length > 0) {
                const maxRow = sheet['!data'].length - 1;
                const maxCol = sheet['!data'].reduce((max, row) => row && row.length > max ? row.length : max, 0) - 1;
                if (maxCol >= 0) {
                    sheet['!ref'] = XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: maxCol, r: maxRow } });
                }
            }
            
            const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
            const rawJson = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
            
            let currentJson = json;
            if (json.length === 0 && rawJson.length > 0) {
                 const headers = rawJson[0].map((_, i) => `Column_${i+1}`);
                 currentJson = rawJson.map(row => {
                     const obj = {};
                     headers.forEach((h, i) => obj[h] = row[i]);
                     return obj;
                 });
            }

            debugInfo.push(`${sheetName}: ${currentJson.length} rows`);

            if (currentJson.length > bestJson.length) {
                bestJson = currentJson;
                bestSheetName = sheetName;
            }
        }

        if (bestJson.length === 0) {
            throw new Error(`Parsed successfully but all sheets were empty! Info: ${debugInfo.join(', ')}`);
        }

        self.postMessage({ success: true, json: bestJson, sheetName: bestSheetName, type });
    } catch (err) {
        self.postMessage({ success: false, error: err.message, type });
    }
};
