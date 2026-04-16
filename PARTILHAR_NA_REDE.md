# 📱 Como partilhar o PartyMix com telemóveis na mesma rede Wi-Fi

## Método 1 — Acesso direto via IP local (mais simples)

### Passo 1: Descobre o teu IP local
No terminal do teu PC:
- **Windows**: `ipconfig` → procura "IPv4 Address" (ex: 192.168.1.100)
- **Mac/Linux**: `ip addr` ou `ifconfig` → procura "inet" (ex: 192.168.1.100)

### Passo 2: Configura o Vite para aceitar ligações externas
No ficheiro `frontend/vite.config.js`, já está configurado com `host: true`.
Se não estiver, adiciona:
```js
server: {
  port: 5173,
  host: true,   // <- isto permite acesso pela rede
  proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } }
}
```

### Passo 3: Inicia o servidor
```bash
cd frontend
npm run dev
```
O terminal vai mostrar algo como:
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.100:5173/   ← este é o link para partilhar!
```

### Passo 4: Partilha com os telemóveis
Todos os telemóveis ligados ao **mesmo Wi-Fi** podem abrir no browser:
```
http://192.168.1.100:5173
```
Podes também criar um QR Code com o link em: https://qr.io

---

## Método 2 — PWA (Progressive Web App) — instalar como app no telemóvel

Adiciona suporte a PWA para que os utilizadores possam instalar a app no telemóvel como se fosse nativa.

### Instala o plugin Vite PWA:
```bash
cd frontend
npm install vite-plugin-pwa --save-dev
```

### Atualiza o `vite.config.js`:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PartyMix',
        short_name: 'PartyMix',
        description: 'O jogo de festa definitivo',
        theme_color: '#6d28d9',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ]
      }
    })
  ],
  server: {
    port: 5173,
    host: true,
    proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } }
  }
})
```

### Adiciona ícones na pasta `frontend/public/`:
Cria ou coloca dois ficheiros PNG:
- `public/icon-192.png` (192×192px)
- `public/icon-512.png` (512×512px)

Podes gerar ícones em: https://favicon.io

### Para instalar no telemóvel:
1. Abre o link no Chrome (Android) ou Safari (iPhone)
2. Android: menu → "Adicionar ao ecrã inicial"
3. iPhone: botão partilhar → "Adicionar ao ecrã de início"

---

## Método 3 — Ngrok (partilhar pela internet, sem mesmo Wi-Fi)

Se os jogadores estiverem em locais diferentes:

### Instala o ngrok:
Descarrega em https://ngrok.com/download

### Cria um túnel:
```bash
# Com o frontend a correr em 5173
ngrok http 5173
```
Vai gerar um link público tipo:
```
https://abc123.ngrok.io
```
Qualquer pessoa com internet pode aceder! (grátis até 8 horas por sessão)

---

## Resumo rápido

| Situação | Solução |
|----------|---------|
| Todos no mesmo Wi-Fi | IP local (Método 1) |
| Instalar como app no telemóvel | PWA (Método 2) |
| Jogar remotamente | Ngrok (Método 3) |

---

## ⚠️ Notas importantes

- O **backend** (Node.js) tem de estar sempre a correr no teu PC
- Se usares MongoDB local, também tem de estar ativo
- Para `ngrok`, podes precisar de atualizar o proxy do Vite para apontar para o endereço ngrok do backend
