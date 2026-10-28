# HomologaGO

Aplicativo instalável (PWA) que gera os documentos de homologação de micro e minigeração fotovoltaica para a Equatorial Goiás: formulário de solicitação (Anexo I/II, PDF e Excel), memorial descritivo, diagrama unifilar, diagrama de blocos, planta de situação, placa de advertência, lista de beneficiárias e checklist de protocolo.

O usuário anexa os documentos do cliente (RG/CNH, CPF/CNPJ e conta de energia, em foto ou PDF), informa a potência e a quantidade de inversores e módulos, e o app monta o projeto. Os cálculos e os arquivos são gerados no próprio aparelho; só a leitura dos documentos usa a internet.

## Estrutura

- `public/` – o app (HTML único, bibliotecas em `vendor/`, manifest e service worker para funcionar offline).
- `api/ler-documentos.js` – função serverless que envia as imagens à API da Anthropic e devolve os campos lidos.

## Publicar na Vercel

1. Em vercel.com, **Add New → Project** e importe este repositório (Framework: *Other*; sem comando de build; diretório de saída: `public`).
2. Em **Settings → Environment Variables**, crie:
   - `ANTHROPIC_API_KEY` – chave criada em console.anthropic.com (é cobrada por uso; cada leitura de documentos custa alguns centavos).
   - `APP_CODE` – um código à sua escolha. Quem não tiver o código não consegue usar a leitura automática (evita gastos de terceiros).
3. Faça o deploy. No app, abra **Código de acesso da leitura automática** e digite o mesmo `APP_CODE` (fica salvo no aparelho).
4. Opcional: em **Settings → Domains**, ligue um domínio próprio.

## Instalar no celular e no PC

- Android (Chrome): menu ⋮ → **Instalar app**.
- iPhone (Safari): Compartilhar → **Adicionar à Tela de Início**.
- Windows/Mac (Chrome ou Edge): ícone de instalar na barra de endereço.

## Rodar localmente

```bash
npm install
npx vercel dev   # serve public/ e a função api/
```

## Base normativa

NT.020.EQTL (Conexão de Micro e Minigeração Distribuída), REN ANEEL 1.000/2021, Lei 14.300/2022, ABNT NBR 5410, 16149, 16150, 16690 e IEC 62116. Confira a revisão vigente e os modelos do portal da Equatorial Goiás antes de protocolar; o responsável técnico revisa e assina os documentos.
