/**
 * Webhook Service
 * Envia notificações para APIs externas e registra logs no banco
 */

import { db } from '@/db'
import { webhookLogs, users } from '@/db/schema'
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
  telefone: string // Código de 5 dígitos
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
    let logId: string | undefined
    try {
      const payload: CadastroPayload = {
        email: data.email,
        etapa: 'cadastro',
        nome: `${data.name} ${data.surname}`.trim(),
        telefone: '000000000' // Valor padrão conforme especificado
      }

      // Buscar userId se não fornecido
      let userId = data.userId
      if (!userId) {
        const [user] = await db.select().from(users).where(eq(users.email, data.email)).limit(1)
        userId = user?.id
      }

      // Registrar tentativa de envio
      const [log] = await db.insert(webhookLogs).values({
        url: this.cadastroUrl,
        endpoint: 'cadastro',
        payload: JSON.stringify(payload),
        userId: userId || null,
        success: false,
      }).returning()
      
      logId = log.id

      const response = await fetch(this.cadastroUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const responseBody = await response.text()
      const success = response.ok

      // Atualizar log com resultado
      if (logId) {
        await db.update(webhookLogs)
          .set({
            responseStatus: response.status,
            responseBody: responseBody,
            success: success,
            error: success ? null : `HTTP ${response.status}: ${response.statusText}`
          })
          .where(eq(webhookLogs.id, logId))
      }

      if (!success) {
        console.error('Erro ao enviar webhook de cadastro:', response.status, response.statusText)
        return false
      }

      console.log('✅ Webhook de cadastro enviado com sucesso:', payload)
      return true
    } catch (error) {
      // Atualizar log com erro
      if (logId) {
        await db.update(webhookLogs)
          .set({
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          })
          .where(eq(webhookLogs.id, logId))
      }
      console.error('Erro ao enviar webhook de cadastro:', error)
      return false
    }
  }

  /**
   * Envia webhook de notificação (quando código é confirmado)
   */
  async sendNotificacaoWebhook(data: {
    email: string
    name: string
    surname: string
    code: string // Código de 5 dígitos
    userId?: string
  }): Promise<boolean> {
    let logId: string | undefined
    try {
      const payload: NotificacaoPayload = {
        email: data.email,
        etapa: 'RVE1',
        nome: `${data.name} ${data.surname}`.trim(),
        telefone: data.code // Código de 5 dígitos no campo telefone
      }

      // Buscar userId se não fornecido
      let userId = data.userId
      if (!userId) {
        const [user] = await db.select().from(users).where(eq(users.email, data.email)).limit(1)
        userId = user?.id
      }

      // Registrar tentativa de envio
      const [log] = await db.insert(webhookLogs).values({
        url: this.notificacaoUrl,
        endpoint: 'notificacao',
        payload: JSON.stringify(payload),
        userId: userId || null,
        success: false,
      }).returning()
      
      logId = log.id

      const response = await fetch(this.notificacaoUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const responseBody = await response.text()
      const success = response.ok

      // Atualizar log com resultado
      if (logId) {
        await db.update(webhookLogs)
          .set({
            responseStatus: response.status,
            responseBody: responseBody,
            success: success,
            error: success ? null : `HTTP ${response.status}: ${response.statusText}`
          })
          .where(eq(webhookLogs.id, logId))
      }

      if (!success) {
        console.error('Erro ao enviar webhook de notificação:', response.status, response.statusText)
        return false
      }

      console.log('✅ Webhook de notificação enviado com sucesso:', payload)
      return true
    } catch (error) {
      // Atualizar log com erro
      if (logId) {
        await db.update(webhookLogs)
          .set({
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          })
          .where(eq(webhookLogs.id, logId))
      }
      console.error('Erro ao enviar webhook de notificação:', error)
      return false
    }
  }
}

export const webhookService = new WebhookService()

