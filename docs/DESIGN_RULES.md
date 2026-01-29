# Design System Rules (Mobile-First)

Este documento define regras para manter o layout consistente e sem classes arbitrarias.

## Regra principal
Evitar classes arbitrarias de Tailwind no codigo:
- text-[...]
- rounded-[...]
- p-[...]
- gap-[...]

Use sempre tokens e classes padrao (text-xs/sm/base, rounded-md/lg/xl, p-3/p-4, gap-3/gap-4).

## Validacao
Script: npm run lint:tokens

- Usa ripgrep para encontrar classes proibidas.
- Se encontrar ocorrencias, retorna exit code 1.

Nao ha allowlist. Qualquer excecao deve ser removida do codigo.
