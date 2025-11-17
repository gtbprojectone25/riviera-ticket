# PurchaseWarningModal Component

## 📖 Descrição

Componente modal de aviso que aparece antes do usuário entrar no fluxo de compra. Reproduz exatamente o design do Figma com:

- Fundo escuro com blur
- Contador regressivo de 15 segundos
- Barra de progresso animada
- Ícone de alerta laranja
- Botão "Continuar" azul
- Design responsivo

## 🚀 Como usar

```tsx
import { useState } from 'react'
import { PurchaseWarningModal } from '@/components/purchase-warning-modal'

export function MyComponent() {
  const [showWarning, setShowWarning] = useState(false)

  const handleContinue = () => {
    setShowWarning(false)
    // Continuar para próxima etapa
    console.log('Usuário clicou em continuar')
  }

  const handleTimeout = () => {
    setShowWarning(false)
    // Modal fechou automaticamente
    console.log('Modal fechou por timeout')
  }

  return (
    <div>
      <button onClick={() => setShowWarning(true)}>
        Mostrar Aviso
      </button>

      <PurchaseWarningModal
        open={showWarning}
        onContinue={handleContinue}
        onTimeout={handleTimeout}
      />
    </div>
  )
}
```

## 📝 Props

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `open` | `boolean` | ✅ | Controla se o modal está aberto |
| `onContinue` | `() => void` | ✅ | Callback executado quando usuário clica "Continuar" |
| `onTimeout` | `() => void` | ❌ | Callback executado quando timer chega a 0 |

## 🎨 Características

- **Timer**: 15 segundos com countdown visual
- **Progress Bar**: Barra que enche progressivamente
- **Auto-close**: Fecha automaticamente quando timer chega a 0
- **Responsivo**: Funciona em mobile e desktop
- **Acessível**: Usa componentes shadcn/ui com acessibilidade

## 🔧 Dependências

- `@radix-ui/react-dialog`
- `@radix-ui/react-progress` 
- `lucide-react`
- `shadcn/ui` (Button, Dialog, Progress)

## 📱 Design

O componente reproduz fielmente o design do Figma com:

- Background overlay escuro (70% opacity) + blur
- Caixa modal arredondada com fundo `#111`
- Ícone `AlertTriangle` laranja em círculo
- Texto explicativo centralizado
- Progress bar azul animada
- Botão azul `#2563EB` full-width
- Typography responsiva e clean

## ⚡ Performance

- Usa `key` prop para forçar reset do estado quando reabre
- Limpa intervals automaticamente no cleanup
- Evita re-renders desnecessários
- Progress calculado de forma otimizada