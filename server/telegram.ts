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

function escapeTelegramHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export async function sendConsultationToTelegram(consultation: ConsultationDelivery) {
  const botToken = requireEnvironmentVariable('TELEGRAM_BOT_TOKEN')
  const chatId = requireEnvironmentVariable('TELEGRAM_CHAT_ID')
  const text = [
    '🔔 <b>새 상담 신청</b>',
    '',
    '━━━━━━━━━━━━━━',
    `👤 <b>이름</b>  ${escapeTelegramHtml(consultation.name)}`,
    `📞 <b>연락처</b>  <code>${escapeTelegramHtml(consultation.phone)}</code>`,
    `🕒 <b>상담 가능시간</b>  ${escapeTelegramHtml(consultation.availableTime)}`,
    '━━━━━━━━━━━━━━',
    '',
    '📝 <b>문의 내용</b>',
    `<blockquote>${escapeTelegramHtml(consultation.message)}</blockquote>`,
  ].join('\n')

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
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
