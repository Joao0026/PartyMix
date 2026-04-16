# 📱 PartyMix - Guia Completo de Acesso no Telemóvel

## ✅ 3 Maneiras de Jogar no Telemóvel

---

## **Opção 1: Wi-Fi Local (MAIS FÁCIL) ⭐**

### O que é?
- Jogas na mesma Wi-Fi que o PC
- Sem instalar nada a mais
- Funciona em qualquer telemóvel

### Como fazer?

1. **Conecta o telemóvel à mesma Wi-Fi que o PC**

2. **No terminal (onde está `npm run dev`), procura uma linha assim:**
   ```
   ➜  Network: http://192.168.1.152:5173/
   ```

3. **No telemóvel, abre o browser e cola o link:**
   ```
   http://192.168.1.152:5173/
   ```
   (substitui `192.168.1.152` pelo IP que aparece no teu terminal)

4. **Pronto! 🎉**

### ⚠️ Dicas
- Se não funcionar, garante que está na mesma Wi-Fi
- Procura a linha que começa por `http://192.168.`
- Se vir `localhost` ou `127.0.0.1`, não é essa!

---

## **Opção 2: PWA - Instalar como App 📱**

### O que é?
- Instala PartyMix como app nativo no telemóvel
- Sem ir pela App Store
- Funciona offline (depois de carregar uma vez)
- Fica no ecrã inicial

### Como fazer?

1. **Primeiro, vai ao link (Opção 1):**
   ```
   http://192.168.1.152:5173/
   ```

2. **No telemóvel:**
   - **Android**: Clica em `⋮` (3 pontos) → "Instalar app" ou "Instalar"
   - **iPhone**: Clica em `↑` (share) → "Adicionar à Tela de Início"

3. **Confirma**

4. **Aparece no teu ecrã inicial como app! 🎮**

### ✨ Benefícios
- ✅ Fica como app nativa
- ✅ Funciona sem internet (offline)
- ✅ Mais rápido de carregar
- ✅ Sem barra de URL

---

## **Opção 3: ngrok - Internet (Qualquer Pessoa) 🌐**

### O que é?
- Cria um link público que qualquer pessoa consegue aceder
- Funciona de qualquer Wi-Fi
- Ideal para partilhar com amigos que não estão na tua rede

### Como fazer?

#### Passo 1: Instalar ngrok
```bash
npm install -g ngrok
```

#### Passo 2: Crear um túnel para o frontend (porta 5173)
```bash
ngrok http 5173
```

Aparece algo assim:
```
Session Status                online
Account                       your-email@example.com
Version                       3.3.5
Region                        us (United States)
Latency                       45ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123-abc123.ngrok.io -> http://localhost:5173
```

#### Passo 3: Copia e partilha o link
```
https://abc123-abc123.ngrok.io
```

#### Passo 4: Amigos abrem o link
- No telemóvel de qualquer pessoa
- Em qualquer Wi-Fi ou dados móveis
- Copia o link HTTPS
- Pronto! 🎉

### ⚠️ Importante
- O link **muda de cada vez** que reinicia (free plan)
- Pode pedir autenticação (grátis)
- Para deixar permanente, compra uma conta paga

### ✨ Dicas
- Usa para testar com amigos
- Depois quando tiveres no Render/Netlify, não precisas ngrok
- Funciona com qualquer número de pessoas

---

## 🚀 Roadmap de Deployment

### Fase 1: Desenvolvimento Local (AGORA)
```
✅ PC + Telemóvel na mesma Wi-Fi
✅ Funciona em casa/no café
✅ Perfeito para testes
```

### Fase 2: Partilha com Amigos (ngrok)
```
✅ Qualquer pessoa, qualquer Wi-Fi
✅ Link público temporário
✅ Bom para testes em grupo
```

### Fase 3: Produção (Depois)
```
🔄 Deploy no Render (backend)
🔄 Deploy no Netlify (frontend)
🔄 Link permanente
🔄 Sem limite de tempo
```

---

## 📊 Comparação das 3 Opções

| Aspecto | Wi-Fi Local | PWA App | ngrok |
|---------|-------------|---------|-------|
| **Facilidade** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Setup** | 0 minutos | 1 minuto | 5 minutos |
| **Funciona offline** | ❌ | ✅ | ❌ |
| **Link permanente** | ❌ | ✅ | ❌ |
| **Qualquer Wi-Fi** | ❌ | ✅ | ✅ |
| **Internet necessária** | ✅ | ✅ | ✅ |
| **Amigos fora da rede** | ❌ | ❌ | ✅ |

---

## 🔧 Troubleshooting

### ❌ "Não consigo aceder ao link no telemóvel"
```
Solução:
1. Verifica se está na mesma Wi-Fi
2. Tenta com outro telemóvel
3. Desliga firewall (Windows)
4. Reinicia o router
```

### ❌ "ngrok diz 'No command found'"
```bash
# Instala corretamente
npm install -g ngrok

# Se não funcionar, tenta
winget install ngrok  # Windows
brew install ngrok    # Mac
```

### ❌ "O link ngrok expirou"
```
Normal! Links grátis expiram depois de 2 horas.
Cria um novo:
ngrok http 5173
```

### ❌ "Telemóvel mostra página em branco"
```
1. Abre DevTools (F12)
2. Vê a consola
3. Se há erro, comunica-me
4. Tenta hard refresh: Ctrl+Shift+R (ou Cmd+Shift+R no Mac)
```

---

## ✨ Features que Tens Agora

### PWA (Aplicação Instalável)
- ✅ Ícone customizado
- ✅ Splashscreen
- ✅ App de standalone
- ✅ Offline support
- ✅ Shortcuts de modo

### Animations (que adicionei)
- ✅ Dado com tremor 3D
- ✅ Mapa com pulsação
- ✅ Cards com spring animation
- ✅ Penalty banner animado
- ✅ Scoreboard dinâmico

### MongoDB Atlas
- ✅ Base de dados na nuvem
- ✅ Backups automáticos
- ✅ 512MB grátis

---

## 📝 Quick Reference

### Iniciar servidor
```bash
npm run dev
```

### Via Wi-Fi Local
```
http://192.168.X.X:5173
```

### Via ngrok
```bash
ngrok http 5173
# Copia o link HTTPS
```

### Instalar como App (telemóvel)
```
Menu → Instalar / Add to Home
```

---

## 🎯 Próximos Passos

1. ✅ **Agora**: Testa com Wi-Fi Local (Opção 1)
2. 🔄 **Depois**: Convida amigos com ngrok (Opção 3)
3. 🚀 **Futuro**: Deploy em produção (Render + Netlify)

---

## 💬 Dúvidas?

Se algo não funcionar:
1. Verifica o terminal (há erros?)
2. Tenta hard refresh no telemóvel
3. Reinicia o servidor (`Ctrl+C` e `npm run dev`)
4. Garante que MongoDB está conectado (deve ver ✅)

---

**Divirte-te a jogar! 🎉🎊**
