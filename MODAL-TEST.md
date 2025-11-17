# Como testar o PurchaseWarningModal

## 🚀 Fluxo de teste

1. **Acesse**: `/pre-order`
2. **Clique**: botão "Continuar" 
3. **Modal abre** com:
   - ✅ Ícone vermelho de alerta (SVG do Figma)
   - ✅ Texto do aviso
   - ✅ Barra de progresso animada (0% → 100%)
   - ✅ Timer regressivo de 15 segundos
   - ✅ Botão "Continuar" azul

## ⚡ Opções de redirecionamento

**Opção 1**: Clique no botão "Continuar" → redireciona para `/location`

**Opção 2**: Aguarde 15 segundos → redirecionamento automático para `/location`

## 📁 Arquivos criados

- ✅ `components/PurchaseWarningModal.tsx` - Modal principal
- ✅ `assets/icons/alert-warning.svg` - Ícone do Figma
- ✅ `app/location/page.tsx` - Página de destino
- ✅ `types/svg.d.ts` - Tipos TypeScript para SVG
- ✅ Configuração Next.js para SVG

## 🎨 Especificações seguidas

- Fundo blur + escurecimento 70%
- Modal centralizado, bordas 20px, fundo preto
- Ícone SVG vermelho 48px (do Figma)
- Timer de 15 segundos
- Progresso visual animado
- Botão azul #2563EB
- Redirecionamento automático