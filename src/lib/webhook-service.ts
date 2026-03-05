/**
 * Webhook Service
 * Envia notificacoes externas para cadastro e verificacao de codigo.
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
  telefone: string // Codigo de 5 digitos enviado no campo "telefone"
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
  private maxRetries = 3

  /**
   * Envia webhook de cadastro (quando usuari@ completa informacoes)
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

      const response = await this.postWithRetry(this.cadastroUrl, payload)

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
      console.error('Erro ao enviar webhook de cadastro:', this.formatError(error))
      return false
    }
  }

  /**
   * Envia webhook de notificacao (codigo de verificacao no campo "telefone")
   */
  async sendNotificacaoWebhook(data: {
    email: string
    name: string
    surname: string
    code: string // Codigo de 5 digitos
  }): Promise<boolean> {
    try {
      if (!this.enabled) return true
      const code = data.code.trim()
      const isFiveDigits = /^\d{5}$/.test(code)
      if (!isFiveDigits) {
        console.error('Webhook notificacao: codigo invalido, esperado 5 digitos.')
        return false
      }
      if (!data.email) {
        console.error('Webhook notificacao: email vazio.')
        return false
      }

      const payload: NotificacaoPayload = {
        email: data.email,
        etapa: this.notificacaoEtapa,
        nome: `${data.name} ${data.surname}`.trim(),
        telefone: code,
      }

      const response = await this.postWithRetry(this.notificacaoUrl, payload)

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        console.error(
          'Erro ao enviar webhook de notificacao:',
          response.status,
          response.statusText,
          body,
        )
        return false
      }

      console.log('OK. Webhook de notificacao enviado com sucesso:', payload)
      return true
    } catch (error) {
      console.error('Erro ao enviar webhook de notificacao:', this.formatError(error))
      return false
    }
  }

  private async postWithRetry(
    url: string,
    body: Record<string, unknown> | CadastroPayload | NotificacaoPayload,
  ) {
    let lastError: unknown

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.postWithTimeout(url, body)
      } catch (error) {
        lastError = error
        const transient = this.isTransientNetworkError(error)
        if (!transient || attempt === this.maxRetries) {
          break
        }
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt))
      }
    }

    throw lastError
  }

  // POST com timeout para evitar requisicoes penduradas
  private async postWithTimeout(
    url: string,
    body: Record<string, unknown> | CadastroPayload | NotificacaoPayload,
  ) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    const allowInsecure =
      process.env.NODE_ENV !== 'production' && process.env.ALLOW_INSECURE_WEBHOOKS === 'true'
    const isHttps = url.startsWith('https://')
    let previousTlsSetting: string | undefined

    try {
      // Permitir self-signed apenas em dev e somente durante esta chamada
      if (allowInsecure && isHttps) {
        previousTlsSetting = process.env.NODE_TLS_REJECT_UNAUTHORIZED
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
      }

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
      // Restaurar validacao TLS global
      if (allowInsecure && isHttps) {
        if (previousTlsSetting === undefined) {
          delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
        } else {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousTlsSetting
        }
      }
    }
  }

  private isTransientNetworkError(error: unknown): boolean {
    const text = this.collectErrorText(error).toLowerCase()
    return (
      text.includes('fetch failed') ||
      text.includes('connect timeout') ||
      text.includes('connecttimeouterror') ||
      text.includes('und_err_connect_timeout') ||
      text.includes('econnreset') ||
      text.includes('etimedout') ||
      text.includes('econnrefused') ||
      text.includes('enotfound')
    )
  }

  private collectErrorText(error: unknown, depth = 0): string {
    if (!error || depth > 5) return ''
    if (typeof error === 'string') return error
    if (error instanceof Error) {
      const nested = error as Error & { code?: string; cause?: unknown }
      return `${error.name} ${error.message} ${nested.code ?? ''} ${this.collectErrorText(nested.cause, depth + 1)}`.trim()
    }
    if (typeof error === 'object') {
      const maybe = error as { message?: unknown; code?: unknown; cause?: unknown; name?: unknown }
      return `${typeof maybe.name === 'string' ? maybe.name : ''} ${typeof maybe.message === 'string' ? maybe.message : ''} ${typeof maybe.code === 'string' ? maybe.code : ''} ${this.collectErrorText(maybe.cause, depth + 1)}`.trim()
    }
    return String(error)
  }

  private formatError(error: unknown): string {
    const text = this.collectErrorText(error)
    return text || 'unknown webhook error'
  }
}

export const webhookService = new WebhookService()
