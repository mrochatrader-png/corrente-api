const express = require("express");
const cors = require("cors");
const fs = require("fs");
const levenshtein = require("fast-levenshtein");

const app = express();
app.use(cors());
app.use(express.json());

// Carregar categorias
const categorias = JSON.parse(fs.readFileSync("categorias.json", "utf8"));

// ----- SINÔNIMOS (podemos expandir depois) -----
const sinonimos = {
  "comida": ["ração", "alimento", "comestível"],
  "papagaio": ["ave", "pássaro", "aves"],
  "carro": ["automóvel", "veículo"],
  "moto": ["motocicleta"],
  "celular": ["smartphone", "telefone"],
  "roupa": ["vestuário"],
  "banco": ["assento", "cadeira", "estofado"],
  "geladeira": ["refrigerador"],
  "tv": ["televisão", "televisor"],
};

// ----- FUNÇÃO DE EXPANSÃO DE PALAVRAS -----
function expandirPalavras(query) {
  let palavras = query.toLowerCase().split(" ");
  let expandidas = [...palavras];

  palavras.forEach((p) => {
    if (sinonimos[p]) {
      expandidas.push(...sinonimos[p]);
    }
  });

  return expandidas;
}

// ----- FUNÇÃO DE SIMILARIDADE LEVENSHTEIN -----
function similaridade(a, b) {
  const dist = levenshtein.get(a.toLowerCase(), b.toLowerCase());
  const maxLen = Math.max(a.length, b.length);
  return 1 - dist / maxLen;
}

// ----- BUSCA INTELIGENTE -----
app.get("/buscar", (req, res) => {
  let termo = req.query.q;

  if (!termo) {
    return res.json({ erro: "Use ?q=busca" });
  }

  const palavras = expandirPalavras(termo);

  let melhorResultado = null;
  let melhorPontuacao = 0;

  categorias.forEach((item) => {
    const categoria = item.categoria.toLowerCase();
    const sub = item.subcategoria.toLowerCase();

    palavras.forEach((p) => {
      // 1. Fuzzy por categoria
      let score1 = similaridade(p, categoria);
      if (score1 > melhorPontuacao) {
        melhorPontuacao = score1;
        melhorResultado = item;
      }

      // 2. Fuzzy por subcategoria
      let score2 = similaridade(p, sub);
      if (score2 > melhorPontuacao) {
        melhorPontuacao = score2;
        melhorResultado = item;
      }
    });
  });

  if (!melhorResultado) {
    return res.json({ erro: "Nenhuma correspondência encontrada" });
  }

  // Retorna exatamente o link da tabela
  return res.json({
    categoria: melhorResultado.categoria,
    subcategoria: melhorResultado.subcategoria,
    link: melhorResultado.link,
    confianca: melhorPontuacao,
  });
});

// ----- INICIAR SERVIDOR -----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
