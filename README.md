# Branding Experience Prototype

Protótipo mobile-first para testar uma entrada interativa usando sensores do smartphone.

## Como testar

1. Suba este projeto em um repositório no GitHub.
2. Ative o GitHub Pages.
3. Abra a URL HTTPS no celular.
4. Toque em "Começar experiência".
5. No iPhone, aceite a permissão de movimento/orientação.

## Desktop

No computador, clique e arraste o núcleo até o centro.

## Arquivos

- `index.html`: estrutura da página
- `style.css`: visual do protótipo
- `script.js`: sensores, física, colisão e encaixe

## Ajustes rápidos

No arquivo `script.js`, altere o objeto `CONFIG`:

- `sensorForce`: sensibilidade do acelerômetro
- `friction`: atrito do movimento
- `bounce`: força do rebote na borda
- `magnetDistance`: distância em que o centro começa a puxar
- `lockDistance`: distância necessária para encaixar
