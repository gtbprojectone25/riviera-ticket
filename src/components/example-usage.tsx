// Exemplo de uso do PurchaseWarningModal

import { useState } from 'react'
import { PurchaseWarningModal } from '@/components/purchase-warning-modal'

export function ExampleUsage() {
  const [showWarning, setShowWarning] = useState(false)

  const handleContinue = () => {
    console.log('Usuário clicou em continuar')
    setShowWarning(false)
    // Redirecionar para próxima etapa do fluxo
  }

  const handleTimeout = () => {
    console.log('Modal fechou automaticamente após 15 segundos')
    setShowWarning(false)
    // Opcional: redirecionar ou executar alguma ação
  }

  return (
    <div>
      <button onClick={() => setShowWarning(true)}>
        Mostrar Aviso de Compra
      </button>

      <PurchaseWarningModal
        open={showWarning}
        onContinue={handleContinue}
        onTimeout={handleTimeout}
      />
    </div>
  )
}