import { JWT } from 'google-auth-library'
import type { ConsultationDelivery } from './consultation-delivery.js'

const sheetsScope = 'https://www.googleapis.com/auth/spreadsheets'
let sheetsAuth: JWT | undefined

function requireEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function getSheetsAuth() {
  if (!sheetsAuth) {
    sheetsAuth = new JWT({
      email: requireEnvironmentVariable('FIREBASE_CLIENT_EMAIL'),
      key: requireEnvironmentVariable('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
      scopes: [sheetsScope],
    })
  }

  return sheetsAuth
}

export async function appendConsultationToGoogleSheets(consultation: ConsultationDelivery) {
  const spreadsheetId = requireEnvironmentVariable('GOOGLE_SHEET_ID')
  const range = process.env.GOOGLE_SHEET_RANGE?.trim() || '상담신청!A:I'
  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append`
  const receivedAt = new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'Asia/Seoul',
  }).format(consultation.receivedAt)

  await getSheetsAuth().request({
    url: endpoint,
    method: 'POST',
    params: {
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
    },
    data: {
      majorDimension: 'ROWS',
      values: [[
        receivedAt,
        consultation.reference,
        consultation.name,
        consultation.phone,
        consultation.availableTime,
        consultation.message,
        '신규',
        consultation.country || '',
        consultation.source,
      ]],
    },
    timeout: 8_000,
  })
}
