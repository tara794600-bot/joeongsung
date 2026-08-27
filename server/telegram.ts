import type { ConsultationDelivery } from './consultation-delivery.js'

type TelegramResponse = {
  ok?: boolean
  description?: string
}

function requireEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export async function sendConsultationToTelegram(consultation: ConsultationDelivery) {
  const botToken = requireEnvironmentVariable('TELEGRAM_BOT_TOKEN')
  const chatId = requireEnvironmentVariable('TELEGRAM_CHAT_ID')
  const receivedAt = new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  }).format(consultation.receivedAt)
  const text = [
    '📬 새 상담 신청',
    '',
    `접수번호: ${consultation.reference}`,
    `접수시간: ${receivedAt}`,
    `이름: ${consultation.name}`,
    `연락처: ${consultation.phone}`,
    `상담 가능시간: ${consultation.availableTime}`,
    `접수지역: ${consultation.country || '확인 불가'}`,
    '',
    '[문의 내용]',
    consultation.message,
  ].join('\n')

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      protect_content: true,
      link_preview_options: { is_disabled: true },
    }),
    signal: AbortSignal.timeout(8_000),
  })
  const result = await response.json().catch(() => ({})) as TelegramResponse

  if (!response.ok || !result.ok) {
    throw new Error(result.description || `Telegram API request failed with status ${response.status}`)
  }
}
