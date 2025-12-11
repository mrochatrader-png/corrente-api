const express = require("express");
const cors = require("cors");
const fs = require("fs");
const levenshtein = require("fast-levenshtein");

const app = express();

// ==== Habilitar CORS para permitir requisição externa do Wix ====
app.use(cors());

app.use(express.json());

const PORT = process.env.PORT || 3000;

// ==== CARREGAR CATEGORIAS NO FORMATO PLANO ====
let categorias = [];
try {
  const data = fs.readFileSync("categorias.json", "utf8");
  const obj = JSON.parse(data);

  for (const cat in obj) {
    const subArray = [];
    for (const sub in obj[cat]) {
      subArray.push({ nome: sub, url: obj[cat][sub] });
    }
    categorias.push({ categoria: cat, subcategorias: subArray });
  }

  console.log("Categorias carregadas:", categorias.length);

} catch (err) {
  console.error("Erro ao carregar categorias.json:", err);
}

// ==== ROTA DE TESTE DE CORS ====
app.get("/cors-test", (req, res) => {
  res.json({ status: "ok" });
});

// ==== ROTA DE BUSCA COM IA ====
app.get("/search", (req, res) => {
  const termo = (req.query.q || "").trim().toLowerCase();
  if (!termo) {
    return res.json([]);
  }

  const palavras = termo.split(" ");

  let resultados = [];

  categorias.forEach(cat => {
    cat.subcategorias.forEach(sub => {
      const combined = (cat.categoria + " " + sub.nome).toLowerCase();

      let score = 0;
      palavras.forEach(p => {
        if (combined.includes(p)) {
          score += 1;
        }
      });

      const dist = levenshtein.get(combined, termo);
      const normalized = 1 - dist / Math.max(combined.length, termo.length);

      const finalScore = Math.max(score, normalized);

      if (finalScore > 0) {
        resultados.push({
          categoria: cat.categoria,
          subcategoria: sub.nome,
          url: sub.url,
          score: finalScore
        });
      }
    });
  });

  resultados.sort((a, b) => b.score - a.score);

  res.json(resultados.slice(0, 15));
});

// ==== ROTA DE CATEGORIAS ====
app.get("/categories", (req, res) => {
  res.json(categorias);
});

// ==== ROTA RAIZ ====
app.get("/", (req, res) => {
  res.send("API Corrente do Bem está funcionando!");
});

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
