export type ConsultationDelivery = {
  reference: string
  receivedAt: Date
  name: string
  phone: string
  availableTime: string
  message: string
  country: string | null
  source: string
}
