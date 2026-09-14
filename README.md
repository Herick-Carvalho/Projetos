# Fichas de Parasitologia Veterinária — Artrópodes

Site estático com as fichas dos principais artrópodes de importância médica e veterinária,
organizadas conforme o roteiro da disciplina: treze tópicos por parasito, painel de ilustração
e bloco de observações taxonômicas.

## Estrutura do repositório

```
/
├── index.html                  página única, sem dados embutidos
├── .nojekyll                   arquivo vazio, evita o processamento do Jekyll
├── README.md
├── assets/
│   ├── css/
│   │   └── styles.css          toda a aparência
│   ├── js/
│   │   └── app.js              carregamento dos dados e interações
│   └── img/
│       ├── anophelinae_lineart.png
│       ├── culicinae_lineart.png
│       ├── lutzomyia_lineart.png
│       ├── culicoides_lineart.png
│       └── simulium_lineart.png
└── data/
    ├── manifest.json           lista os grupos e os arquivos de dados
    ├── grupo-a.json            Diptera — Nematocera        (5 fichas)
    ├── grupo-b.json            Diptera — moscas e miíases  (8 fichas)
    ├── grupo-c.json            Siphonaptera                (3 fichas)
    ├── grupo-d.json            Phthiraptera                (1 ficha)
    ├── grupo-e.json            Acari                       (5 fichas)
    └── grupo-f.json            Ixodida                     (11 fichas)
```

## Publicação no GitHub Pages

1. Crie o repositório e envie os arquivos respeitando a estrutura acima.
2. Adicione um arquivo vazio chamado `.nojekyll` na raiz.
3. Em **Settings → Pages**, selecione a branch `main` e a pasta `/ (root)`.
4. O endereço gerado terá o formato `https://usuario.github.io/nome-do-repositorio/`.

O carregamento dos dados usa `fetch`, que exige um servidor. A página funciona no GitHub Pages,
mas não funciona ao abrir o arquivo diretamente do disco. Para testar localmente, execute
`python3 -m http.server` na raiz do projeto e acesse `http://localhost:8000`.

## Como editar uma ficha

Abra o arquivo do grupo correspondente em `data/` e altere apenas o objeto do parasito desejado.
Nenhum outro arquivo precisa ser tocado. Campos de texto aceitam uma frase única ou uma lista
de itens, e a página se ajusta automaticamente.

```json
{
  "id": 6,
  "cientifico": "Musca domestica",
  "italico": true,
  "popular": "Mosca doméstica",
  "taxonomia": { "reino": "...", "filo": "...", "especie": "..." },
  "img": {
    "arquivo": "musca_lineart.png",
    "legenda": "...",
    "estruturas": ["...", "..."]
  },
  "morfologia": ["...", "..."],
  "formas": ["..."],
  "hospedeiros": ["..."],
  "localizacao": ["..."],
  "ciclo": ["..."],
  "transmissao": ["..."],
  "doenca": ["..."],
  "diagnostico": ["..."],
  "controle": ["..."],
  "zoonose": ["..."],
  "observacoes": ["..."],
  "fonte": "Aula 3 — ...; Livro Didático Vol. 1 (PEREIRA-JUNIOR, 2023)."
}
```

Observações úteis:

- os campos aceitam marcação HTML simples, principalmente `<em>` para nomes científicos;
- uma ficha sem o campo `taxonomia` aparece como pendente, em cinza, no índice lateral;
- se um arquivo de grupo falhar, apenas aquele grupo fica indisponível e o restante do site continua funcionando;
- ao alterar o CSS, o JS ou os dados, atualize a constante `VERSAO` em `app.js` e o parâmetro `?v=` em `index.html` para forçar a renovação do cache dos visitantes.

## Recursos da interface

- índice lateral agrupado por ordem, com busca instantânea;
- navegação por setas do teclado e botões de ficha anterior e próxima;
- link direto para cada ficha, no formato `#p12`, com botão de copiar;
- marcação de fichas já transcritas, guardada no navegador;
- ajuste do tamanho do texto;
- impressão com uma ficha por folha, sem elementos de interface.

## Fontes

- Aulas 1 a 4 da disciplina de Parasitologia Veterinária, Prof. Dr. Reiner Silveira de Moraes, UNICEP, 2026.
- CRUZ, K. D. M.; MENDANHA, M. R.; DÉA, G. M. T. O. D. *Livro didático de parasitologia veterinária: principais parasitos de importância médica e veterinária — Artrópodes*. Organização: Ronaldo Alves Pereira-Junior. Goiânia: Instituto Dering Educacional, 2023.
