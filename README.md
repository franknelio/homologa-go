# HomologaGO

Aplicativo instalável (PWA) que gera os documentos de homologação de micro e minigeração fotovoltaica para a Equatorial Goiás: formulário de solicitação (Anexo I/II, PDF e Excel), memorial descritivo, diagrama unifilar, diagrama de blocos, planta de situação, placa de advertência, lista de beneficiárias e checklist de protocolo.

O usuário anexa os documentos do cliente (RG/CNH, CPF/CNPJ e conta de energia, em foto ou PDF), informa a potência e a quantidade de inversores e módulos, e o app monta o projeto. Os cálculos e os arquivos são gerados no próprio aparelho; só a leitura dos documentos usa a internet.

## Estrutura

- `public/` – o app (HTML único, bibliotecas em `vendor/`, manifest e service worker para funcionar offline).
- `api/ler-documentos.js` – função serverless que envia as imagens à API da Anthropic e devolve os campos lidos. Só atende usuários logados.
- `api/config.js` – entrega ao app a URL e a chave pública do Supabase.
- `supabase/migrations/0001_projetos.sql` – tabela de projetos com RLS (cada usuário vê só os seus).

Os projetos ficam na conta do usuário (Supabase) e também numa cópia no aparelho. Sem internet o app continua funcionando; o que foi salvo offline sobe quando a conexão volta. Os dados do responsável técnico ficam guardados na conta e voltam em qualquer aparelho.

## Publicar

### 1. Supabase (login e projetos)

1. Em supabase.com, crie um projeto (pode ser na mesma organização do Hospeda).
2. **SQL Editor**: cole e execute o conteúdo de `supabase/migrations/0001_projetos.sql`.
3. **Authentication → Sign In / Providers → Email**: desligue **Allow new users to sign up** (só entra quem você cadastrar) e, se quiser, **Confirm email**.
4. **Authentication → Users → Add user**: crie o seu usuário (e-mail e senha) e o de quem mais for usar.
5. **Project Settings → API**: copie a **Project URL** e a chave **anon public**.

### 2. Vercel (o app)

1. Em vercel.com, **Add New → Project** e importe este repositório (Framework: *Other*; sem comando de build; diretório de saída: `public`).
2. Em **Settings → Environment Variables**, crie:
   - `SUPABASE_URL` – a Project URL do passo anterior.
   - `SUPABASE_ANON_KEY` – a chave anon public.
   - `ANTHROPIC_API_KEY` – chave criada em console.anthropic.com (cobrada por uso; cada leitura de documentos custa alguns centavos).
   - `EMAILS_PERMITIDOS` – e-mails (separados por vírgula) que podem usar a leitura automática.
3. Faça o deploy e entre com o usuário criado no Supabase.
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
