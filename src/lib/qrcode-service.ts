/**
 * QR Code Service
 * Gera QR Codes para ingressos no cliente (browser)
 */

import QRCode from 'qrcode';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

export const qrcodeService = {
  /**
   * Gera QR Code como Data URL (base64)
   * Pode ser usado diretamente como src de uma imagem
   */
  async generateDataURL(
    data: string,
    options: QRCodeOptions = {}
  ): Promise<string> {
    const defaultOptions = {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      ...options,
    };

    try {
      const dataUrl = await QRCode.toDataURL(data, defaultOptions);
      return dataUrl;
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      throw new Error('Falha ao gerar QR Code');
    }
  },

  /**
   * Gera dados únicos para o QR Code do ingresso
   */
  generateTicketQRData(params: {
    orderId: string;
    ticketId: string;
    seatId: string;
    sessionId: string;
  }): string {
    const { orderId, ticketId, seatId, sessionId } = params;
    
    // Formato: RIVIERA|ORDER_ID|TICKET_ID|SEAT|SESSION
    const qrData = `RIVIERA|${orderId}|${ticketId}|${seatId}|${sessionId}`;
    
    // Adicionar checksum simples para validação
    const checksum = qrData
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0) % 1000;
    
    return `${qrData}|${checksum.toString().padStart(3, '0')}`;
  },

  /**
   * Valida QR Code do ingresso
   */
  validateTicketQR(qrData: string): boolean {
    const parts = qrData.split('|');
    
    if (parts.length !== 6 || parts[0] !== 'RIVIERA') {
      return false;
    }

    const [prefix, orderId, ticketId, seatId, sessionId, checksum] = parts;
    const dataWithoutChecksum = `${prefix}|${orderId}|${ticketId}|${seatId}|${sessionId}`;
    
    const expectedChecksum = dataWithoutChecksum
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0) % 1000;

    return parseInt(checksum, 10) === expectedChecksum;
  },
};
