# Este diretório armazena os códigos de barras dos tickets

Os barcodes são gerados automaticamente quando:
1. Um pagamento é confirmado via webhook (Stripe ou Adyen)
2. O sistema cria os tickets confirmados
3. O BarcodeService gera as versões real e blurred

**Estrutura esperada:**
- `ticket-{ticketId}-real.png` - Barcode real (revelado no dia do evento)
- `ticket-{ticketId}-blurred.png` - Barcode borrado (exibido antes do evento)

**Nota:** Os arquivos são criados automaticamente pelo sistema. Não adicione arquivos manualmente aqui.

