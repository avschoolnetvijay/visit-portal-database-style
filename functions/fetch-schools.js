const fetch = require('node-fetch');

exports.handler = async (event, context) => {
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
    const targetGid = process.env.TARGET_GID || '1188942420';

    if (!apiKey || !sheetId) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Google API credentials are not configured on the server. Please add GOOGLE_API_KEY and GOOGLE_SHEET_ID to your Netlify environment variables." })
        };
    }

    try {
        // 1. Fetch metadata to resolve target sheet title from GID
        const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}`;
        const metaRes = await fetch(metaUrl);
        if (!metaRes.ok) {
            throw new Error(`Google API Sheet metadata request failed with status: ${metaRes.status}`);
        }
        const metaData = await metaRes.json();

        const targetSheet = metaData.sheets.find(s => String(s.properties.sheetId) === String(targetGid));
        if (!targetSheet) {
            throw new Error(`Target sheet with GID ${targetGid} was not found in the spreadsheet.`);
        }
        const sheetTitle = targetSheet.properties.title;

        // 2. Fetch sheet content using the sheet title
        const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetTitle)}!A:Z?key=${apiKey}`;
        const dataRes = await fetch(dataUrl);
        if (!dataRes.ok) {
            throw new Error(`Google API Sheet data request failed with status: ${dataRes.status}`);
        }
        const sheetData = await dataRes.json();

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
};
