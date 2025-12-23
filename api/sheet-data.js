import { google } from 'googleapis'

let cache = {
    data: null,
    timestamp: 0
}

const CACHE_DURATION = 60 * 1000

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', 'https://tubneungloogpeeham.vercel.app')
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    if (req.method !== 'GET') return res.status(405).json({ error: '(!) method not allowed' })

    try {
        const now = Date.now()

        if (cache.data && (now - cache.timestamp) < CACHE_DURATION) {
            return res.status(200).json({
                ...cache.data,
                cached: true,
                cacheAge: Math.floor((now - cache.timestamp) / 1000)
            })
        }

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_SERVICE_PRIVATE_KEY.replace(/\\n/g, '\n')
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
        })

        const sheets = google.sheets({ version: 'v4', auth })
        const spreadsheetId = '118Uq9uj9esoR6iTpi6hmZ7L3QYFZRnWvb2tpUNgTP6g' // <-- this sheet is publicly readable, no need to be concerned

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'เก็บเงินห้อง!A1:AC50'
        })

        const rows = response.data.values

        if (!rows || rows.length === 0) return res.status(404).json({ error: '(!) no data found' })

        const headers = rows[2]
        const maxAmount = parseFloat(rows[2][4]?.replace(/[^\d.-]/g, '') || 0)

        const students = []

        for (let i = 3; i < rows.length; i++) {
            const row = rows[i]
            if (!row[0] || row[0] === '' || row[0] === 'รวมทั้งสิ้น') break

            const student = {
                id: parseInt(row[0]) || 0,
                prefix: row[1] || '',
                firstName: row[2] || '',
                lastName: row[3] || '',
                totalPaid: parseFloat(row[4]?.replace(/[^\d.-]/g, '') || 0),
                payments: []
            }

            for (let j = 5; j < Math.min(row.length, headers.length); j++) {
                const status = row[j] || 'ยังไม่จ่าย'
                const weekAmount = parseFloat(headers[j]?.replace(/[^\d.-]/g, '') || 0)
                const weekLabel = headers[j] || ''

                if (weekAmount !== 0 && weekLabel !== '') {
                    student.payments.push({
                        week: j - 4,
                        label: weekLabel,
                        amount: weekAmount,
                        status: status,
                        paid: status === 'จ่ายแล้ว' || status === 'โอนจ่าย',
                        used: status === 'ใช้แล้ว'
                    })
                }
            }

            students.push(student)
        }

        const freshData = {
            maxAmount,
            students,
            lastUpdated: new Date().toISOString(),
            cached: false
        }

        cache = {
            data: freshData,
            timestamp: now
        }

        res.status(200).json(freshData)
    } catch (error) {
        console.error('(!) fetching sheet data;', error)
        res.status(500).json({
            error: '(!) failed to fetch data',
            // details: error.message | i don't feel like to expose error details in production
        })
    }
}