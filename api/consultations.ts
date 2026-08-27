import type { VercelRequest, VercelResponse } from '@vercel/node'
import { FieldValue } from 'firebase-admin/firestore'
import type { DocumentReference } from 'firebase-admin/firestore'
import type { ConsultationDelivery } from '../server/consultation-delivery.js'
import { getFirebaseDatabase } from '../server/firebase-admin.js'
import { appendConsultationToGoogleSheets } from '../server/google-sheets.js'
import { sendConsultationToTelegram } from '../server/telegram.js'

const availableTimes = new Set([
  '오전 9시 ~ 12시',
  '오후 12시 ~ 3시',
  '오후 3시 ~ 6시',
  '오후 6시 이후',
  '언제든지 가능',
])

type ConsultationBody = {
  name?: unknown
  phone?: unknown
  availableTime?: unknown
  message?: unknown
  privacy?: unknown
  website?: unknown
}

function cleanText(value: unknown, maximumLength: number) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, maximumLength)
}

function getErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return 'Unknown delivery error'
  return error.message.replace(/[\r\n]+/g, ' ').slice(0, 240)
}

function getDeliveryStatus(result: PromiseSettledResult<void>) {
  if (result.status === 'fulfilled') return { status: 'delivered' }
  return { status: 'failed', error: getErrorMessage(result.reason) }
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ message: '허용되지 않은 요청입니다.' })
  }

  const body = (request.body ?? {}) as ConsultationBody

  if (cleanText(body.website, 100)) {
    return response.status(201).json({ message: '상담이 접수되었습니다.' })
  }

  const name = cleanText(body.name, 30)
  const phone = cleanText(body.phone, 20).replace(/[^0-9]/g, '')
  const availableTime = cleanText(body.availableTime, 30)
  const message = cleanText(body.message, 1000)

  if (name.length < 2) {
    return response.status(400).json({ message: '성함을 2자 이상 입력해 주세요.' })
  }

  if (phone.length < 9 || phone.length > 11) {
    return response.status(400).json({ message: '연락처를 정확히 입력해 주세요.' })
  }

  if (!availableTimes.has(availableTime)) {
    return response.status(400).json({ message: '상담 가능한 시간을 선택해 주세요.' })
  }

  if (message.length < 4) {
    return response.status(400).json({ message: '문의 내용을 4자 이상 입력해 주세요.' })
  }

  if (body.privacy !== true) {
    return response.status(400).json({ message: '개인정보 처리방침 동의가 필요합니다.' })
  }

  const receivedAt = new Date()
  const country = cleanText(request.headers['x-vercel-ip-country'], 8) || null
  const source = 'landing-page'
  let document: DocumentReference

  try {
    const database = getFirebaseDatabase()
    document = database.collection('consultationRequests').doc()
    await document.set({
      name,
      phone,
      availableTime,
      message,
      privacyAccepted: true,
      status: 'new',
      source,
      locale: 'ko-KR',
      country,
      userAgent: cleanText(request.headers['user-agent'], 300) || null,
      createdAt: FieldValue.serverTimestamp(),
      delivery: {
        googleSheets: { status: 'pending' },
        telegram: { status: 'pending' },
      },
    })
  } catch (error) {
    console.error('Failed to save consultation request:', getErrorMessage(error))
    return response.status(500).json({ message: '접수 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.' })
  }

  const consultation: ConsultationDelivery = {
    reference: document.id,
    receivedAt,
    name,
    phone,
    availableTime,
    message,
    country,
    source,
  }
  const [googleSheetsResult, telegramResult] = await Promise.allSettled([
    appendConsultationToGoogleSheets(consultation),
    sendConsultationToTelegram(consultation),
  ])
  const delivery = {
    googleSheets: getDeliveryStatus(googleSheetsResult),
    telegram: getDeliveryStatus(telegramResult),
  }

  if (googleSheetsResult.status === 'rejected') {
    console.error('Google Sheets delivery failed:', getErrorMessage(googleSheetsResult.reason))
  }
  if (telegramResult.status === 'rejected') {
    console.error('Telegram delivery failed:', getErrorMessage(telegramResult.reason))
  }

  try {
    await document.update({
      delivery,
      deliveryUpdatedAt: FieldValue.serverTimestamp(),
    })
  } catch (error) {
    console.error('Failed to update consultation delivery status:', getErrorMessage(error))
  }

  const allDelivered = googleSheetsResult.status === 'fulfilled' && telegramResult.status === 'fulfilled'
  return response.status(201).json({
    message: allDelivered
      ? '상담이 접수되었으며 담당자에게 안전하게 전달되었습니다.'
      : '상담은 접수되었습니다. 담당자 알림 전송이 지연되어 확인 후 처리하겠습니다.',
    reference: document.id,
    delivery: {
      googleSheets: delivery.googleSheets.status,
      telegram: delivery.telegram.status,
    },
  })
}
