/**
 * Barcode Service
 * Generates professional barcodes (Code128/PDF417) and blurred versions
 */

// Não foi possível localizar o módulo 'bwip-js' ou suas declarações de tipo correspondentes.
// Certifique-se de instalar com: npm install bwip-js @types/bwip-js (se houver types)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import bwipjs from 'bwip-js'
import sharp from 'sharp'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const STORAGE_PATH = process.env.STORAGE_PATH || './storage/barcodes'

class BarcodeService {
  /**
   * Generate barcode image (Code128)
   */
  async generateBarcode(
    data: string,
    options: {
      width?: number
      height?: number
      format?: 'png' | 'svg'
    } = {}
  ): Promise<Buffer> {
    const {
      width = 300,
      height = 100,
      format = 'png',
    } = options

    try {
      // bwip-js no Node.js - usar toBuffer diretamente
      const barcodeBuffer = await bwipjs.toBuffer({
        bcid: 'code128', // Barcode type
        text: data,
        scale: 3,
        height: height,
        includetext: true,
        textxalign: 'center',
      } as any)

      return barcodeBuffer
    } catch (error) {
      console.error('Error generating barcode:', error)
      throw new Error('Failed to generate barcode')
    }
  }

  /**
   * Generate blurred version of barcode
   */
  async generateBlurredBarcode(barcodeBuffer: Buffer): Promise<Buffer> {
    try {
      const blurred = await sharp(barcodeBuffer)
        .blur(15) // Strong blur
        .toBuffer()

      return blurred
    } catch (error) {
      console.error('Error blurring barcode:', error)
      throw new Error('Failed to blur barcode')
    }
  }

  /**
   * Save barcode to storage
   */
  async saveBarcode(
    ticketId: string,
    barcodeData: string
  ): Promise<{ realPath: string; blurredPath: string }> {
    try {
      // Ensure storage directory exists
      await mkdir(STORAGE_PATH, { recursive: true })

      // Generate barcode images
      const realBarcode = await this.generateBarcode(barcodeData)
      const blurredBarcode = await this.generateBlurredBarcode(realBarcode)

      // Save files
      const realPath = join(STORAGE_PATH, `ticket-${ticketId}-real.png`)
      const blurredPath = join(STORAGE_PATH, `ticket-${ticketId}-blurred.png`)

      await writeFile(realPath, realBarcode)
      await writeFile(blurredPath, blurredBarcode)

      return {
        realPath,
        blurredPath,
      }
    } catch (error) {
      console.error('Error saving barcode:', error)
      throw new Error('Failed to save barcode')
    }
  }

  /**
   * Get barcode image (real or blurred based on reveal date)
   */
  async getBarcodeImage(
    ticketId: string,
    revealDate: Date | null
  ): Promise<Buffer> {
    const shouldReveal = revealDate ? new Date() >= revealDate : false
    const filename = shouldReveal
      ? `ticket-${ticketId}-real.png`
      : `ticket-${ticketId}-blurred.png`

    const filePath = join(STORAGE_PATH, filename)

    try {
      const fs = await import('fs/promises')
      return await fs.readFile(filePath)
    } catch (error) {
      console.error('Error reading barcode file:', error)
      throw new Error('Barcode not found')
    }
  }

  /**
   * Generate barcode data string for ticket
   */
  generateBarcodeData(ticketId: string, orderId: string): string {
    // Format: TICKET-{ticketId}-{orderId}-{timestamp}
    const timestamp = Date.now()
    return `TICKET-${ticketId}-${orderId}-${timestamp}`
  }
}

export const barcodeService = new BarcodeService()

