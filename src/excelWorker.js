import * as XLSX from 'xlsx';

self.onmessage = function (e) {
    try {
        const { buffer, type } = e.data;
        const data = new Uint8Array(buffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const json = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
        self.postMessage({ success: true, json, type });
    } catch (err) {
        self.postMessage({ success: false, error: err.message, type });
    }
};
