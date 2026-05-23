import * as XLSX from 'xlsx';

self.onmessage = function (e) {
    try {
        const { buffer, type } = e.data;
        const data = new Uint8Array(buffer);
        const wb = XLSX.read(data, { type: 'array' });
        
        if (!wb.SheetNames || wb.SheetNames.length === 0) {
            throw new Error("No sheets found in workbook");
        }

        let bestJson = [];
        let bestSheetName = "";

        // Find the sheet with the most rows
        for (const sheetName of wb.SheetNames) {
            const sheet = wb.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
            
            // Also try with header: 1 to see if it has data but no headers
            const rawJson = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
            
            // If the sheet has data but sheet_to_json returns empty (e.g. 1 row headerless), use rawJson
            let currentJson = json;
            if (json.length === 0 && rawJson.length > 0) {
                 // Convert array of arrays to array of objects
                 const headers = rawJson[0].map((_, i) => `Column_${i+1}`);
                 currentJson = rawJson.map(row => {
                     const obj = {};
                     headers.forEach((h, i) => obj[h] = row[i]);
                     return obj;
                 });
            }

            if (currentJson.length > bestJson.length) {
                bestJson = currentJson;
                bestSheetName = sheetName;
            }
        }

        self.postMessage({ success: true, json: bestJson, sheetName: bestSheetName, type });
    } catch (err) {
        self.postMessage({ success: false, error: err.message, type });
    }
};
