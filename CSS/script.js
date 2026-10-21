// ===== Menu no celular: abre e fecha a lista de links =====
const menuBotao = document.querySelector(".menu-botao");
const menuLinks = document.querySelector(".menu-links");
menuBotao.addEventListener("click", () => {
  const aberto = menuLinks.classList.toggle("aberto");
  menuBotao.setAttribute("aria-expanded", aberto);
});
menuLinks.querySelectorAll("a").forEach((link) =>
  link.addEventListener("click", () => {
    menuLinks.classList.remove("aberto");
    menuBotao.setAttribute("aria-expanded", "false");
  })
);

// Número aleatório seguro em [0, max) — usa crypto, sem viés (rejection sampling)
function aleatorioSeguro(max) {
  const limite = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  do { crypto.getRandomValues(buf); } while (buf[0] >= limite);
  return buf[0] % max;
}

// ===== A. Gerador de senhas =====
(() => {
  const grupos = {
    "ger-mai": "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "ger-min": "abcdefghijklmnopqrstuvwxyz",
    "ger-num": "0123456789",
    "ger-sim": "!@#$%&*()-_=+[]{};:,.?/",
  };
  const saida = document.getElementById("ger-senha");
  const tamanho = document.getElementById("ger-tamanho");
  const tamValor = document.getElementById("ger-tam-valor");
  const copiar = document.getElementById("ger-copiar");
  const status = document.getElementById("ger-status");
  let senhaAtual = "";

  const avisar = (texto, erro = false) => { status.textContent = texto; status.classList.toggle("erro", erro); };
  tamanho.addEventListener("input", () => (tamValor.textContent = tamanho.value));

  document.getElementById("ger-gerar").addEventListener("click", () => {
    const ativos = Object.keys(grupos).filter((id) => document.getElementById(id).checked).map((id) => grupos[id]);
    if (ativos.length === 0) {
      senhaAtual = ""; saida.textContent = "—"; copiar.disabled = true;
      return avisar("Selecione pelo menos um tipo de caractere.", true);
    }
    const n = Number(tamanho.value);
    // Garante 1 caractere de cada tipo escolhido, completa com o conjunto total e embaralha
    const todos = ativos.join("");
    const chars = ativos.map((g) => g[aleatorioSeguro(g.length)]);
    while (chars.length < n) chars.push(todos[aleatorioSeguro(todos.length)]);
    for (let i = chars.length - 1; i > 0; i--) {
      const j = aleatorioSeguro(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    senhaAtual = chars.join("");
    saida.textContent = senhaAtual;
    copiar.disabled = false;
    avisar("");
  });

  copiar.addEventListener("click", async () => {
    if (!senhaAtual) return;
    try {
      await navigator.clipboard.writeText(senhaAtual);
      avisar("Senha copiada");
    } catch {
      avisar("Não foi possível copiar automaticamente. Selecione a senha e copie manualmente.", true);
    }
  });

  // Não guarda a senha quando o visitante sai da página
  window.addEventListener("pagehide", () => { senhaAtual = ""; saida.textContent = ""; });
})();

// ===== B. Verificador de senhas (100% local, nada é enviado ou salvo) =====
const comuns = ["123456", "senha", "password", "qwerty", "abc123", "111111", "brasil", "admin", "iloveyou", "102030", "futebol", "flamengo", "corinthians", "palmeiras", "teste", "mudar"];
const sequencias = ["0123456789", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl", "zxcvbnm"];

// Exportada para testes: retorna { nivel, pontos, dicas }
function avaliarSenha(s) {
  const dicas = [];
  if (!s) return { nivel: "", pontos: 0, dicas };
  const min = s.toLowerCase();
  let pontos = 0;

  if (s.length >= 16) pontos += 3; else if (s.length >= 12) pontos += 2; else if (s.length >= 8) pontos += 1;
  if (s.length < 12) dicas.push("Aumente o comprimento: prefira 12 caracteres ou mais.");

  const tipos = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((r) => r.test(s)).length;
  pontos += tipos >= 4 ? 2 : tipos === 3 ? 1 : 0;
  if (tipos < 3) dicas.push("Misture letras maiúsculas, minúsculas, números e símbolos.");

  let temSequencia = false;
  for (const seq of sequencias) {
    const ida = seq, volta = [...seq].reverse().join("");
    for (let i = 0; i + 4 <= seq.length && !temSequencia; i++) {
      if (min.includes(ida.slice(i, i + 4)) || min.includes(volta.slice(i, i + 4))) temSequencia = true;
    }
  }
  if (temSequencia) { pontos -= 2; dicas.push("Evite sequências óbvias como 1234, abcd ou qwerty."); }

  if (/(.)\1{2,}/.test(s) || new Set(s).size <= s.length / 3) { pontos -= 2; dicas.push("Evite repetir o mesmo caractere muitas vezes."); }

  if (comuns.some((c) => min.includes(c))) { pontos -= 3; dicas.push("Evite palavras e senhas muito comuns."); }

  if (/(19|20)\d{2}/.test(s)) dicas.push("Evite datas e anos, como o ano de nascimento.");

  let nivel;
  if (pontos <= 0 || s.length < 8) nivel = "Muito fraca";
  else if (pontos <= 2) nivel = "Fraca";
  else if (pontos <= 4) nivel = "Razoável";
  else nivel = "Forte";
  dicas.push("Use uma senha exclusiva para cada conta e ative a 2FA.");
  return { nivel, pontos, dicas };
}

(() => {
  const campo = document.getElementById("ver-campo");
  const barra = document.getElementById("ver-barra");
  const nivelEl = document.getElementById("ver-nivel");
  const dicasEl = document.getElementById("ver-dicas");
  const mostrar = document.getElementById("ver-mostrar");
  const estilos = {
    "Muito fraca": ["15%", "var(--perigo)"],
    Fraca: ["40%", "var(--perigo)"],
    "Razoável": ["70%", "var(--eletrico)"],
    Forte: ["100%", "var(--sucesso)"],
  };

  function atualizar() {
    const { nivel, dicas } = avaliarSenha(campo.value);
    dicasEl.className = "lista dica";
    if (!nivel) {
      barra.style.width = "0"; nivelEl.textContent = "Aguardando uma senha…"; dicasEl.innerHTML = ""; return;
    }
    const [largura, cor] = estilos[nivel];
    barra.style.width = largura; barra.style.background = cor;
    nivelEl.textContent = `Avaliação estimada: ${nivel}` + (nivel === "Forte" ? " (boa, mas nenhuma senha é 100% segura)" : "");
    dicasEl.innerHTML = "";
    dicas.forEach((d) => { const li = document.createElement("li"); li.textContent = d; dicasEl.appendChild(li); });
  }

  campo.addEventListener("input", atualizar);
  mostrar.addEventListener("click", () => {
    const oculto = campo.type === "password";
    campo.type = oculto ? "text" : "password";
    mostrar.textContent = oculto ? "Ocultar" : "Mostrar";
  });
  document.getElementById("ver-limpar").addEventListener("click", () => { campo.value = ""; atualizar(); campo.focus(); });
  window.addEventListener("pagehide", () => { campo.value = ""; });
})();

// ===== C. Criptografia real com Web Crypto (AES-GCM + PBKDF2) =====
// Formato do resultado: MDS1.<salt base64>.<iv base64>.<dados base64>  (salt e IV não são secretos)
const ITERACOES = 250000;
const b64 = (bytes) => btoa(String.fromCharCode(...bytes));
const deB64 = (txt) => Uint8Array.from(atob(txt), (c) => c.charCodeAt(0));

async function derivarChave(senha, salt) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERACOES, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
}

async function criptografar(mensagem, senha) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const chave = await derivarChave(senha, salt);
  const dados = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, chave, new TextEncoder().encode(mensagem)));
  return `MDS1.${b64(salt)}.${b64(iv)}.${b64(dados)}`;
}

async function descriptografar(texto, senha) {
  const partes = texto.trim().split(".");
  if (partes.length !== 4 || partes[0] !== "MDS1") throw new Error("formato");
  let salt, iv, dados;
  try { [salt, iv, dados] = partes.slice(1).map(deB64); } catch { throw new Error("formato"); }
  if (salt.length !== 16 || iv.length !== 12 || dados.length < 17) throw new Error("formato");
  const chave = await derivarChave(senha, salt);
  try {
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, chave, dados));
  } catch { throw new Error("chave"); }
}

(() => {
  const msg = document.getElementById("cri-mensagem");
  const chave = document.getElementById("cri-chave");
  const resultado = document.getElementById("cri-resultado");
  const recuperada = document.getElementById("cri-recuperada");
  const status = document.getElementById("cri-status");
  const avisar = (t, erro = false) => { status.textContent = t; status.classList.toggle("erro", erro); };

  if (!window.crypto || !crypto.subtle) {
    avisar("Seu navegador não oferece a Web Crypto API (abra o site por https). A ferramenta está indisponível.", true);
    return;
  }

  document.getElementById("cri-cifrar").addEventListener("click", async () => {
    if (!msg.value.trim()) return avisar("Escreva uma mensagem para criptografar.", true);
    if (!chave.value) return avisar("Informe uma chave de demonstração.", true);
    avisar("Criptografando…");
    try {
      resultado.value = await criptografar(msg.value, chave.value);
      recuperada.textContent = "—";
      avisar("Mensagem criptografada! Agora use a mesma chave para descriptografar.");
    } catch {
      resultado.value = "";
      recuperada.textContent = "—";
      avisar("Não foi possível criptografar. Tente novamente com uma mensagem menor.", true);
    }
  });

  document.getElementById("cri-decifrar").addEventListener("click", async () => {
    if (!resultado.value.trim()) return avisar("Não há texto criptografado para descriptografar.", true);
    if (!chave.value) return avisar("Informe a chave de demonstração.", true);
    avisar("Descriptografando…");
    try {
      recuperada.textContent = await descriptografar(resultado.value, chave.value);
      avisar("Mensagem recuperada com sucesso");
    } catch (e) {
      recuperada.textContent = "—";
      avisar(e.message === "formato"
        ? "Texto criptografado inválido: ele precisa começar com MDS1 e não pode ser editado."
        : "Não foi possível descriptografar: a chave está incorreta ou o texto foi alterado.", true);
    }
  });

  window.addEventListener("pagehide", () => { msg.value = ""; chave.value = ""; resultado.value = ""; recuperada.textContent = "—"; });
})();

// ===== Quiz (nível intermediário) =====
// Para editar: mude o texto, as opções, o índice da resposta certa (0=A, 1=B, 2=C) e a explicação.
const perguntas = [
  {
    texto: "Um ataque deixa o sistema de notas da escola fora do ar durante a semana de provas, mas nenhum dado é lido ou alterado. Qual pilar foi afetado?",
    opcoes: ["Confidencialidade", "Disponibilidade", "Integridade"],
    certa: 1,
    explicacao: "Os dados continuam corretos e secretos, mas o serviço não está acessível quando necessário: isso é disponibilidade.",
  },
  {
    texto: "Ana usa uma senha longa e única e recebe, sem ter tentado entrar, um código de 2FA no celular. Qual a atitude mais adequada?",
    opcoes: ["Repassar o código para o suporte confirmar", "Ignorar, pois a senha longa já basta", "Não usar o código e trocar a senha da conta"],
    certa: 2,
    explicacao: "Um código não solicitado indica que alguém pode ter a senha. O 2FA barrou o acesso; trocar a senha fecha a brecha.",
  },
  {
    texto: "Um site usa HTTPS. O que a criptografia dessa conexão garante ao enviar um formulário?",
    opcoes: ["Os dados viajam protegidos contra leitura", "O site é confiável e não é um golpe", "O computador fica protegido de malware"],
    certa: 0,
    explicacao: "HTTPS cifra os dados no caminho. Um site falso também pode ter HTTPS, e ele não substitui o antivírus.",
  },
  {
    texto: "Um link encurtado chega pelo grupo da turma, enviado por um colega, prometendo “prova vazada”. O que fazer primeiro?",
    opcoes: ["Abrir só no celular, que é mais seguro", "Confirmar com o colega por outro meio", "Abrir em aba anônima para não deixar rastro"],
    certa: 1,
    explicacao: "Contas de conhecidos podem ser invadidas. A aba anônima e o celular não bloqueiam golpes nem malware.",
  },
  {
    texto: "Um computador tem antivírus atualizado, mas o sistema está sem atualizações há um ano. Segundo a segurança em camadas:",
    opcoes: ["Há uma camada falhando que precisa de ajuste", "O antivírus compensa a falta de atualização", "A proteção é total, pois há uma camada ativa"],
    certa: 0,
    explicacao: "Cada camada cobre falhas diferentes. Sistema desatualizado deixa brechas que o antivírus pode não impedir.",
  },
];
// Gabarito: B, C, A, B, A

const areaPerguntas = document.getElementById("quiz-perguntas");
const formulario = document.getElementById("quiz-form");
const resultado = document.getElementById("quiz-resultado");
const botaoRefazer = document.getElementById("quiz-refazer");
const botaoConferir = formulario.querySelector('button[type="submit"]');
const letras = ["A", "B", "C"];

function montarQuiz() {
  areaPerguntas.innerHTML = perguntas
    .map((p, i) => `
      <div class="card pergunta">
        <fieldset>
          <legend>${i + 1}. ${p.texto}</legend>
          ${p.opcoes.map((op, j) => `
            <label class="opcao"><input type="radio" name="p${i}" value="${j}" /> <strong>${letras[j]})</strong> ${op}</label>
          `).join("")}
          <p class="explicacao" hidden></p>
        </fieldset>
      </div>`)
    .join("");
}

formulario.addEventListener("submit", (e) => {
  e.preventDefault();
  if (botaoConferir.disabled) return; // impede contar duas vezes
  const escolhas = perguntas.map((_, i) => formulario.querySelector(`input[name="p${i}"]:checked`));
  if (escolhas.some((x) => !x)) {
    resultado.hidden = false;
    resultado.innerHTML = `<p class="quiz-alerta">Responda todas as ${perguntas.length} perguntas antes de conferir.</p>`;
    return;
  }

  let acertos = 0;
  perguntas.forEach((p, i) => {
    if (Number(escolhas[i].value) === p.certa) acertos++;
    formulario.querySelectorAll(`input[name="p${i}"]`).forEach((input) => {
      if (Number(input.value) === p.certa) input.parentElement.classList.add("correta");
      else if (input.checked) input.parentElement.classList.add("errada");
      input.disabled = true;
    });
    const exp = formulario.querySelectorAll(".explicacao")[i];
    exp.textContent = `Resposta correta: ${letras[p.certa]}. ${p.explicacao}`;
    exp.hidden = false;
  });

  let mensagem;
  if (acertos === 5) mensagem = "Excelente! Você aplicou muito bem os conceitos.";
  else if (acertos >= 3) mensagem = "Muito bem! Leia as explicações das questões que errou.";
  else mensagem = "Vale revisar o conteúdo e as explicações abaixo de cada questão.";

  resultado.hidden = false;
  resultado.innerHTML = `<h3>Você acertou ${acertos} de ${perguntas.length}</h3><p>${mensagem}</p>`;
  botaoConferir.disabled = true;
  botaoRefazer.hidden = false;
});

botaoRefazer.addEventListener("click", () => {
  montarQuiz();
  resultado.hidden = true;
  botaoRefazer.hidden = true;
  botaoConferir.disabled = false;
  document.getElementById("quiz").scrollIntoView();
});

montarQuiz();
