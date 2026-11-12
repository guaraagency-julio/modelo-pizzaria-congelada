# LENTA — Pizzas Artesanais Congeladas

Protótipo comercial de uma pizzaria artesanal fictícia, criado pela **Guará Agency**. Os produtos, preços, fotos e textos desta demonstração são ilustrativos.

## Links

- Loja: `/` (index.html)
- Administração: `/admin.html`
- Código: https://github.com/guaraagency-julio/modelo-pizzaria-congelada
- Hospedagem completa: Vercel
- Demonstração estática: GitHub Pages via GitHub Actions (sem edição compartilhada)

## Funcionalidades

- Site institucional responsivo, marca, apresentação, instruções e FAQ.
- 20 sabores de exemplo, cada um com preço, foto, categoria, ingredientes e selo opcional.
- Calendário de 4 semanas comerciais por mês: dias 1–7, 8–14, 15–21 e 22–último dia.
- Exatamente 4 sabores diferentes por semana; apenas os programados aparecem na vitrine.
- Seleção de semana futura para encomendas antecipadas.
- Carrinho com quantidades, subtotal e persistência local no navegador.
- Formulário com nome, telefone, entrega/retirada, endereço, data, pagamento e observações.
- Checkout por mensagem pré-preenchida no WhatsApp `+55 51 99182-5024`, com envio manual pelo cliente.
- Painel com autenticação, gestão de até 300 sabores, programação mensal e edição de dados da empresa.
- Publicação das alterações no Vercel Blob **privado** (não no navegador do visitante).

## Segurança e implantação

A API administrativa roda **somente na Vercel**. A URL `/admin.html` é pública, mas ler e editar dados exige sessão autenticada com cookie HttpOnly, Secure e SameSite=Strict. Senhas e chaves ficam exclusivamente nas variáveis de ambiente do projeto.

Variáveis necessárias na Vercel:

| Variável | Finalidade |
| --- | --- |
| `ADMIN_PASSWORD` | Senha de acesso ao painel |
| `ADMIN_SESSION_SECRET` | Chave forte para assinar sessões |
| `BLOB_READ_WRITE_TOKEN` | Credencial do armazenamento privado Vercel Blob |

O projeto provisionado já tem essas variáveis configuradas. Para trocar a senha, atualize `ADMIN_PASSWORD` no painel de variáveis de ambiente da Vercel e faça um novo deploy.

**Importante:** GitHub Pages é apenas uma vitrine estática. Ele não oferece API, sessão autenticada nem persistência do painel. Para editar a programação compartilhada em produção, use a URL hospedada na Vercel.

## Rodar localmente

```bash
npm install
npx vercel dev
```

Sem variáveis de ambiente e Blob, a vitrine pode exibir os dados de demonstração (seed), mas o painel não permitirá publicação persistente.

## Limitações comerciais

- A abertura do WhatsApp **não envia automaticamente** a mensagem; a pessoa precisa confirmar o envio.
- Frete, estoque, confirmação da encomenda e pagamento são combinados com a pizzaria.
- Não existe pagamento dentro do site nem registro interno de pedidos.
- A programação de semanas segue quatro faixas fixas do mês, mesmo quando o mês tem cinco semanas de calendário.
- Fotos ilustrativas carregadas de Unsplash. Antes de colocar no ar para o cliente, substituir por fotos e dados oficiais.
- O projeto usa um JSON privado para catálogo/programação; é adequado à operação proposta. Um sistema de múltiplos usuários, estoque e relatórios pode justificar migração posterior para banco de dados relacional.

## Fluxo de operação do cliente

1. Entrar no painel em `/admin.html` com a senha.
2. Cadastrar ou revisar sabores na biblioteca.
3. Selecionar um mês ou criar um novo mês.
4. Escolher exatamente 4 sabores para cada uma das 4 semanas.
5. Clicar em **Publicar alterações**.
6. Conferir o cardápio público na vitrine.

Mantido pela Guará Agency.
