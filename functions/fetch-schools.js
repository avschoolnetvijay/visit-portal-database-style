import https from 'https';

// Helper to make HTTPS GET requests and return a promise
function httpGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    data: data
                });
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

export async function handler(event, context) {
    // CORS headers for local/cross-origin access
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Retrieve environment variables securely from Netlify
    const apiKey = process.env.GOOGLE_API_KEY;
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const targetGid = process.env.TARGET_GID;

    if (!apiKey || !sheetId || !targetGid) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Google API credentials are not configured on the server. Please add GOOGLE_API_KEY, GOOGLE_SHEET_ID, and TARGET_GID to your Netlify environment variables." })
        };
    }

    try {
        // 1. Fetch metadata to resolve target sheet title from GID
        const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}`;
        const metaRes = await httpGet(metaUrl);
        if (!metaRes.ok) {
            throw new Error(`Google API Sheet metadata request failed with status: ${metaRes.status}. Response: ${metaRes.data}`);
        }
        
        const metaData = JSON.parse(metaRes.data);
        if (!metaData.sheets) {
            throw new Error("Invalid response from Google Sheets API: 'sheets' property is missing.");
        }

        const targetSheet = metaData.sheets.find(s => String(s.properties.sheetId) === String(targetGid));
        if (!targetSheet) {
            throw new Error(`Target sheet with GID ${targetGid} was not found in the spreadsheet.`);
        }
        const sheetTitle = targetSheet.properties.title;

        // 2. Fetch sheet content using the sheet title
        const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetTitle)}!A:Z?key=${apiKey}`;
        const dataRes = await httpGet(dataUrl);
        if (!dataRes.ok) {
            throw new Error(`Google API Sheet data request failed with status: ${dataRes.status}. Response: ${dataRes.data}`);
        }
        
        const sheetData = JSON.parse(dataRes.data);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(sheetData)
        };
    } catch (error) {
        console.error("Serverless Function Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
}
