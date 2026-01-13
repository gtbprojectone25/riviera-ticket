/**
 * Webhook Service
 * Envia notificações externas para cadastro e verificação de código.
 */

interface CadastroPayload {
  email: string
  etapa: string
  nome: string
  telefone: string
}

interface NotificacaoPayload {
  email: string
  etapa: string
  nome: string
  telefone: string // Código de 5 dígitos enviado no campo "telefone"
}

class WebhookService {
  // URLs e etapas definidas conforme payload esperado pelo parceiro
  private cadastroUrl = 'http://31.97.93.134/api/cadastro'
  private notificacaoUrl = 'http://31.97.93.134/api/notificacao'
  private cadastroEtapa = 'cadastro'
  private notificacaoEtapa = 'RVE1'
  private enabled = process.env.WEBHOOK_ENABLED !== 'false'
  // Timeout maior para evitar abortar cedo em redes mais lentas
  private timeoutMs = 20_000

  /**
   * Envia webhook de cadastro (quando usuári@ completa informações)
   */
  async sendCadastroWebhook(data: {
    email: string
    name: string
    surname: string
  }): Promise<boolean> {
    try {
      if (!this.enabled) return true
      if (!data.email) {
        console.error('Webhook cadastro: email vazio.')
        return false
      }

      const payload: CadastroPayload = {
        email: data.email,
        etapa: this.cadastroEtapa,
        nome: `${data.name} ${data.surname}`.trim(),
        telefone: '00000',
      }

      const response = await this.postWithTimeout(this.cadastroUrl, payload)

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        console.error(
          'Erro ao enviar webhook de cadastro:',
          response.status,
          response.statusText,
          body,
        )
        return false
      }

      console.log('OK. Webhook de cadastro enviado com sucesso:', payload)
      return true
    } catch (error) {
      console.error('Erro ao enviar webhook de cadastro:', error)
      return false
    }
  }

  /**
   * Envia webhook de notificação (código de verificação no campo "telefone")
   */
  async sendNotificacaoWebhook(data: {
    email: string
    name: string
    surname: string
    code: string // Código de 5 dígitos
  }): Promise<boolean> {
    try {
      if (!this.enabled) return true
      const code = data.code.trim()
      const isFiveDigits = /^\d{5}$/.test(code)
      if (!isFiveDigits) {
        console.error('Webhook notificação: código inválido, esperado 5 dígitos.')
        return false
      }
      if (!data.email) {
        console.error('Webhook notificação: email vazio.')
        return false
      }

      const payload: NotificacaoPayload = {
        email: data.email,
        etapa: this.notificacaoEtapa,
        nome: `${data.name} ${data.surname}`.trim(),
        telefone: code,
      }

      const response = await this.postWithTimeout(this.notificacaoUrl, payload)

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        console.error(
          'Erro ao enviar webhook de notificação:',
          response.status,
          response.statusText,
          body,
        )
        return false
      }

      console.log('OK. Webhook de notificação enviado com sucesso:', payload)
      return true
    } catch (error) {
      console.error('Erro ao enviar webhook de notificação:', error)
      return false
    }
  }

  // POST com timeout para evitar requisições penduradas
  private async postWithTimeout(url: string, body: Record<string, unknown> | CadastroPayload | NotificacaoPayload) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      return await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }
  }
}

export const webhookService = new WebhookService()
