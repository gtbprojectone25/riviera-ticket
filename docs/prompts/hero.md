# Riviera Ticket — Loading Experience (The Odyssey)

## Objetivo
Criar uma tela de loading imersiva para o fluxo de compra do filme
**The Odyssey (IMAX Experience)**.

Essa tela aparece durante:
- carregamento de sessões
- reserva de assentos
- criação de pagamento
- confirmação pós-pagamento

## Conceito Visual
- Fundo com efeito **Glassmorphism**
- Conteúdo do app visível, porém:
  - blur
  - dark overlay
  - desaturado
- Ícone central: **Elmo (Odyssey / guerreiro)**
- O loading NÃO é genérico → faz parte da narrativa do filme

## Animação Principal
### Elmo
- Rotação **horizontal (eixo Y)** contínua
- Leve easing (não mecânico)
- Velocidade média (não agressiva)

### Preenchimento (Progress)
- O elmo é “preenchido” gradualmente:
  - máscara vertical OU radial
  - representa progresso de carregamento
- Se não houver progresso real:
  - usar progresso fake (0 → 90%)
  - finalizar em 100% quando a promise resolve

## Estados
1) Idle (início)
2) Loading (rotação + fill)
3) Finalizando (fill 100%, fade out)
4) Desaparece suavemente

## Comportamento
- Não bloquear o thread principal
- Deve ser reutilizável (componente)
- Deve aceitar:
  - isLoading (boolean)
  - progress (0–100 opcional)
- Se isLoading=false → desmonta com animação

## Stack Técnica
- Next.js (App Router)
- React
- Tailwind
- Opcional:
  - Framer Motion (preferido)
  - CSS animation se necessário
- SVG inline para o elmo (permite mask/clip-path)

## Restrições
- Não usar GIF
- Não usar canvas pesado
- Não travar navegação
- Compatível com mobile

## Acessibilidade
- Respeitar prefers-reduced-motion
- Fallback simples (spinner estático)

## Integração
- Usado em:
  - Seat Selection
  - Checkout
  - Payment Confirmation
- Controlado por estado global ou props
