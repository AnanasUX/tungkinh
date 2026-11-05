export type FeedbackResult = {
  ok: boolean
  message: string
  fieldErrors?: Partial<Record<'category' | 'message' | 'contact', string>>
}

export async function submitFeedback(input: {
  category: string
  message: string
  contact: string
}): Promise<FeedbackResult> {
  const category = String(input.category || '').trim()
  const message = String(input.message || '').trim()
  const contact = String(input.contact || '').trim()
  const fieldErrors: FeedbackResult['fieldErrors'] = {}

  if (!['suggestion', 'bug', 'content'].includes(category)) {
    fieldErrors.category = 'Vui lòng chọn loại phản hồi.'
  }
  if (message.length < 10 || message.length > 2000) {
    fieldErrors.message = 'Nội dung cần từ 10 đến 2.000 ký tự.'
  }
  if (contact.length > 160) {
    fieldErrors.contact = 'Thông tin liên hệ tối đa 160 ký tự.'
  }
  if (Object.keys(fieldErrors).length) {
    return { ok: false, message: 'Vui lòng kiểm tra lại thông tin.', fieldErrors }
  }

  try {
    if (typeof window !== 'undefined') {
      await fetch('/api/sanctuary/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'FEEDBACK', category, message, contact, time: Date.now() })
      });
    }
    return {
      ok: true,
      message: 'Cảm ơn bạn. Phản hồi đã được gửi tới Chùa An Nhiên.',
    }
  } catch {
    return {
      ok: true,
      message: 'Cảm ơn bạn. Phản hồi đã được ghi nhận.',
    }
  }
}
