# 🎾 LigaPRO — Gerenciamento de Liga de Tênis Recreativo

> Plataforma web mobile-first para gestão completa de ligas e torneios de tênis recreativo.

---

## ✨ Funcionalidades

### Para Atletas
- 📊 **Dashboard personalizado** com posição ao vivo, pontuação e estatísticas
- 📅 **Próximo jogo** com data e rodada na tela inicial
- ✅ **Confirmação de jogos e placares** em duas etapas (você e seu oponente)
- 🏆 **Ranking ao vivo** com zonas de classificação (Pódio / Top 8 / Zona de rebaixamento)
- 📸 **Foto de perfil** via câmera, arquivo ou avatar customizável
- 📜 Histórico completo de resultados

### Para Administradores
- 🗂️ Gestão de eventos (ligas e torneios)
- 👤 Cadastro e exclusão de atletas
- 🗑️ Exclusão de jogos, placares e resultados
- 📈 Visão geral do ranking com todas as colunas

---

## 🚀 Como usar

O LigaPRO é uma **Single Page Application (SPA)** pura — sem servidor, sem banco de dados, sem instalação.

### Rodar localmente

```bash
# Clone o repositório
git clone https://github.com/SEU_USUARIO/LigaPRO.git

# Abra o arquivo no navegador
# (duplo-clique no arquivo ou use um servidor local)
```

> ⚠️ Para usar a câmera (foto de perfil), abra via servidor local (ex: `npx serve .`) ou em HTTPS.  
> O acesso direto por `file://` bloqueia a API de câmera em alguns navegadores.

### Servidor local simples

```bash
npx serve .
# Acesse http://localhost:3000/LigaPRO.html
```

---

## 🔑 Credenciais de demonstração

| Perfil | E-mail de acesso |
|--------|-----------------|
| **Administrador** | qualquer e-mail contendo `admin` (ex: `admin@liga.com`) |
| **Atleta** | qualquer outro e-mail (ex: `josias@liga.com`) |

> Na versão demo, o atleta logado é sempre **Josias Modesto** (1º colocado).

---

## 🛠️ Stack técnica

| Camada | Tecnologia |
|--------|-----------|
| Linguagem | HTML5 + CSS3 + JavaScript (ES6+) |
| Ícones | [Tabler Icons](https://tabler.io/icons) (webfont) |
| Fontes | [Bebas Neue](https://fonts.google.com/specimen/Bebas+Neue) + [DM Sans](https://fonts.google.com/specimen/DM+Sans) (Google Fonts) |
| Câmera | Web API `getUserMedia` |
| Upload | `FileReader` API |
| Layout | CSS Grid + Flexbox, mobile-first |
| Sem framework | Zero dependências de runtime |

---

## 📁 Estrutura do projeto

```
LigaPRO/
├── LigaPRO.html    # Aplicação completa (SPA single-file)
├── README.md       # Este arquivo
└── .gitignore
```

---

## 🗺️ Roadmap

- [ ] Backend real (Node.js / Supabase / Firebase)
- [ ] Autenticação por e-mail com confirmação
- [ ] Notificações push para confirmação de jogos
- [ ] Upload de foto para CDN (Cloudinary / S3)
- [ ] Painel de estatísticas avançadas (Power BI embed)
- [ ] PWA (Progressive Web App) para instalação mobile
- [ ] Multi-liga e multi-temporada
- [ ] Exportação de relatórios em PDF

---

## 📄 Licença

Projeto privado — © 2025 [CPC Consultoria Projetos e Construções Ltda](https://cpc.com.br).  
Todos os direitos reservados.

---

## 👤 Autor

Desenvolvido por **Jaime Pessoa** · CPC Consultoria  
Minaçu - GO · Brasil
