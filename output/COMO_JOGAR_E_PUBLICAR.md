# 🎮 CYBER SWARM — Guia Completo (Testar no PC + Publicar na Steam)

Parabéns! Seu jogo agora é um **aplicativo de desktop de verdade** (`.exe`), que roda **100% offline**, sem navegador e sem internet. Este guia te leva do teste no PC até a página na Steam.

---

## 📦 O que você recebeu

| Arquivo | O que é |
|--------|---------|
| **CyberSwarm-Windows.zip** | O jogo pronto para Windows (64-bit). É só descompactar e jogar. Também é o que você envia para a Steam. |
| **cyber_swarm_desktop_source.zip** | O código-fonte do "empacotador" desktop, caso queira gerar novas versões (ícone próprio, Mac, etc.). |
| **COMO_JOGAR_E_PUBLICAR.md** | Este guia. |

---

## ▶️ PARTE 1 — Testar no seu PC (Windows)

1. Baixe **CyberSwarm-Windows.zip**.
2. Clique com o botão direito → **Extrair tudo** (descompacte a pasta inteira num lugar fácil, ex: Área de Trabalho).
3. Abra a pasta `Cyber Swarm-win32-x64`.
4. Dê **duplo clique** em **`Cyber Swarm.exe`**.
5. O jogo abre em janela própria. Controles:
   - **WASD** ou **Setas** = mover
   - **ESC** = pausar
   - **M** = mudo (liga/desliga som)
   - **F11** = tela cheia

> ⚠️ **Aviso do Windows SmartScreen:** como o `.exe` ainda não tem assinatura digital, o Windows pode mostrar "Windows protegeu o seu PC". Clique em **Mais informações → Executar assim mesmo**. Isso é normal para jogos indie antes de comprar um certificado de assinatura. Após publicar na Steam, o launcher da Steam elimina esse aviso.

---

## 💰 PARTE 2 — Publicar na Steam (passo a passo)

### Passo 1 — Criar conta de desenvolvedor (Steamworks)
1. Acesse **https://partner.steamgames.com**
2. Faça login com sua conta Steam (ou crie uma).
3. Complete o cadastro do **Steamworks**. Você pode entrar como:
   - **Pessoa Física** (usa seu CPF) — mais simples para começar.
   - **Pessoa Jurídica** (CNPJ) — recomendado se for levar a sério (separa finanças).

### Passo 2 — Documentação fiscal e bancária
- Preencha o formulário fiscal **W-8BEN** (evita bitributação EUA/Brasil).
- Cadastre uma conta bancária que receba em dólar (com código **SWIFT/IBAN**). Bancos digitais como Wise, Nomad ou Inter costumam funcionar bem.

### Passo 3 — Pagar a taxa Steam Direct
- **US$ 100 por jogo** (recuperável: a Valve devolve como crédito depois que o jogo fatura US$ 1.000).

### Passo 4 — Criar o App (a "ficha" do jogo)
1. No painel Steamworks, clique em **Create New App**.
2. Você recebe um **App ID** (número único do seu jogo). Anote-o.
3. Preencha a **Store Page** (página da loja):
   - Nome: **CYBER SWARM**
   - Descrição curta e longa (em português E inglês — inglês alcança mais gente)
   - **Tags/Gênero:** Roguelite, Bullet Heaven, Action, Indie, Cyberpunk
   - Screenshots (mínimo 5) e um trailer curto (15–60s)
   - Artes de cápsula (a Steam exige vários tamanhos — veja a lista no painel)

### Passo 5 — Enviar o jogo (build) via SteamPipe
A Steam usa uma ferramenta chamada **SteamPipe** (dentro do **Steamworks SDK**) para subir os arquivos do jogo.

1. Baixe o **Steamworks SDK** em: https://partner.steamgames.com/downloads/list
2. Dentro do SDK, vá em `tools/ContentBuilder/`.
3. Coloque **todo o conteúdo da pasta `Cyber Swarm-win32-x64`** dentro de `content/` (ou de uma subpasta sua).
4. Edite os arquivos de script `.vdf` (há exemplos no SDK):
   - **app_build_SEU-APPID.vdf** — aponta o `AppID` e o `depot`.
   - **depot_build_SEU-DEPOTID.vdf** — define a pasta de conteúdo.
5. Rode:
   ```
   steamcmd +login SUA_CONTA +run_app_build ..\scripts\app_build_SEU-APPID.vdf +quit
   ```
6. No painel Steamworks → **SteamPipe → Builds**, promova o build para o ramo **default**.

### Passo 6 — Configurar o lançamento (Launch Options)
No painel do App → **Installation → General**, adicione uma opção de execução:
- **Executable:** `Cyber Swarm.exe`
- **Launch type:** Windows

### Passo 7 — Revisão e lançamento
- A Valve faz uma **revisão** do build (leva alguns dias).
- Você envia uma build de teste e a Valve aprova o funcionamento.
- Defina a **data de lançamento** e o **preço**.
- Publique a página como **"Em breve" (Coming Soon)** o quanto antes para começar a juntar **Wishlists** (o fator #1 de sucesso no algoritmo da Steam).

---

## 🚀 PARTE 3 — Dicas para "viralizar" e vender

1. **Grave clipes curtos** de gameplay (a tela cheia de projéteis neon é perfeita para TikTok/Reels/Shorts). Poste 3–5x por semana.
2. **Publique a página "Em breve" cedo** e divulgue o link pedindo Wishlists.
3. **Participe do Steam Next Fest** com uma demo jogável — é a maior vitrine gratuita para indies.
4. **Meta saudável:** 5.000–10.000 wishlists antes de lançar.
5. Poste em comunidades: Reddit (r/roguelites, r/indiegames), Discord de jogos indie, X/Twitter com #screenshotsaturday.

---

## 🔧 (Opcional) Gerar novas versões do .exe você mesmo

Se quiser adicionar um ícone próprio, mudar a versão ou gerar para Mac/Linux:

1. Instale o **Node.js** (https://nodejs.org) no seu PC.
2. Descompacte **cyber_swarm_desktop_source.zip**.
3. Dentro da pasta, rode no terminal:
   ```
   npm install
   npm run pack:win     # gera a versão Windows
   npm run pack:mac     # gera a versão Mac (rode num Mac)
   npm run pack:linux   # gera a versão Linux
   ```
4. O resultado aparece na pasta `dist/`.

Para colocar um **ícone personalizado** no `.exe`, adicione `--icon=caminho/para/icone.ico` no comando `pack:win`.

---

Boa sorte com o lançamento! 🕹️⚡
