// ===== ЛОГИКА САЙТА =====
// Словарь (DANGER, SAFE, SKIP, PRODUCTS) лежит в файле data.js.

const LEVEL = { "можно": 1, "осторожно": 2, "нельзя": 3 };
const NAME = { 1: "можно", 2: "осторожно", 3: "нельзя" };
const ICON = { "можно": "🟢", "осторожно": "🟡", "проверьте": "🟡", "нельзя": "🔴" };

// ---------- 1. Проверка состава ----------
function check(text, tracesDangerous) {
  // Маленькие буквы и «е» вместо «ё», чтобы слова совпадали со словарём
  text = text.toLowerCase().replaceAll("ё", "е");
  const items = [];

  // Режем состав на предложения по точкам, а предложения — на кусочки
  // по запятым, скобкам и союзу «и»
  for (const sentence of text.split(".")) {
    // После слов «может содержать» всё до конца предложения — это следы
    let traces = false;
    for (let part of sentence.replace(/[();:\[\]]|\sи\s/g, ",").split(",")) {
      part = part.trim();
      if (!part) continue;
      if (/может содержать|следы|следов/.test(part)) traces = true;

      // Ищем в кусочке опасные слова и берём самое строгое
      let level = 0;
      let why = [];
      for (const [stem, answer, reason] of DANGER) {
        if (part.includes(stem)) {
          level = Math.max(level, LEVEL[answer]);
          if (!why.includes(reason)) why.push(reason);
        }
      }

      if (level === 0) {
        // Опасного нет. Знаем ли мы это слово?
        if (SAFE.some(stem => part.includes(stem))) {
          items.push({ part, verdict: "можно", why: "" });
        } else if (SKIP.some(stem => part.includes(stem))) {
          continue; // «эмульгатор», «состав» и т.п. — пропускаем
        } else {
          items.push({ part, verdict: "проверьте", why: "слова нет в словаре" });
        }
        continue;
      }

      // Следы молока: если человек сказал, что следы не опасны, — «осторожно»
      if (traces && level === 3 && !tracesDangerous) {
        level = 2;
        why = ["только следы молока"];
      }
      items.push({ part, verdict: NAME[level], why: why.join("; ") });
    }
  }

  // Итог: хоть одно «нельзя» → НЕЛЬЗЯ; есть «осторожно» или «проверьте» → ОСТОРОЖНО
  const verdicts = items.map(i => i.verdict);
  let total = "МОЖНО";
  if (verdicts.includes("нельзя")) total = "НЕЛЬЗЯ";
  else if (verdicts.includes("осторожно") || verdicts.includes("проверьте")) total = "ОСТОРОЖНО";
  return { total, items };
}

// ---------- 2. Показ ответа ----------
function show(text, productName) {
  const box = document.getElementById("result");
  box.classList.remove("hidden");

  if (!text.trim()) {
    box.innerHTML = "<p>Вставьте состав продукта.</p>";
    return;
  }

  const tracesDangerous = document.getElementById("traces").checked;
  const { total, items } = check(text, tracesDangerous);
  const css = { "МОЖНО": "yes", "ОСТОРОЖНО": "maybe", "НЕЛЬЗЯ": "no" }[total];

  let html = "";
  if (productName) html += `<p class="product-name">${escapeHtml(productName)}</p>`;
  html += `<div class="verdict ${css}">${ICON[total.toLowerCase()]} ${total}</div>`;
  html += `<ul class="items">`;
  for (const it of items) {
    html += `<li>${ICON[it.verdict]} <b>${escapeHtml(it.part)}</b> — ${it.verdict}`;
    if (it.why) html += `<br><span class="why">${escapeHtml(it.why)}</span>`;
    html += `</li>`;
  }
  html += `</ul>`;
  box.innerHTML = html;
  box.scrollIntoView({ behavior: "smooth" });
}

// Чтобы текст из состава не превратился в кусок сайта
function escapeHtml(s) {
  return s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// ---------- 3. Режим магазина ----------
function drawProducts() {
  const box = document.getElementById("products");
  for (const p of PRODUCTS) {
    const btn = document.createElement("button");
    btn.className = "product";
    btn.innerHTML = `<b>${escapeHtml(p.name)}</b><br><small>${p.code}</small>`;
    btn.onclick = () => show(p.composition, p.name);
    box.appendChild(btn);
  }
}

function scanBarcode() {
  const code = document.getElementById("barcode").value.trim();
  const p = PRODUCTS.find(x => x.code === code);
  if (p) {
    show(p.composition, p.name);
  } else {
    const box = document.getElementById("result");
    box.classList.remove("hidden");
    box.innerHTML = "<p>Такого штрихкода нет в базе магазина.</p>";
  }
}

// ---------- 4. Запуск: связываем кнопки с действиями ----------
drawProducts();

document.getElementById("check").onclick = () =>
  show(document.getElementById("composition").value);

document.getElementById("scan").onclick = scanBarcode;
document.getElementById("barcode").addEventListener("keydown", e => {
  if (e.key === "Enter") scanBarcode();
});

for (const btn of document.querySelectorAll("[data-example]")) {
  btn.onclick = () => {
    document.getElementById("composition").value = btn.dataset.example;
    show(btn.dataset.example);
  };
}

for (const tab of document.querySelectorAll(".tab")) {
  tab.onclick = () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-text").classList.toggle("hidden", tab.dataset.tab !== "text");
    document.getElementById("tab-shop").classList.toggle("hidden", tab.dataset.tab !== "shop");
    document.getElementById("result").classList.add("hidden");
  };
}
