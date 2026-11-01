window.iniciarSite = function () {
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
  if (!document.getElementById("ger-senha")) return;
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
  if (!document.getElementById("ver-campo")) return;
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
  if (!document.getElementById("cri-mensagem")) return;
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

// ===== Quiz aprimorado =====
// Banco de perguntas: a cada tentativa são sorteadas 8, em ordem e alternativas embaralhadas.
// Para editar: mude o texto, as opções, o índice da resposta certa (0 = primeira opção) e a explicação.
(() => {
  const formulario = document.getElementById("quiz-form");
  if (!formulario) return;
  const banco = [
    { tema: "Pilares", texto: "Um ataque deixa o sistema de notas da escola fora do ar durante a semana de provas, mas nenhum dado é lido ou alterado. Qual pilar foi afetado?", opcoes: ["Disponibilidade", "Confidencialidade", "Integridade"], certa: 0, explicacao: "Os dados continuam corretos e secretos, mas o serviço não está acessível quando necessário." },
    { tema: "Pilares", texto: "Alguém altera a nota de um aluno no sistema sem autorização. Qual pilar foi violado?", opcoes: ["Integridade", "Disponibilidade", "Confidencialidade"], certa: 0, explicacao: "Integridade garante que os dados não sejam modificados indevidamente." },
    { tema: "Senhas", texto: "Qual destas senhas é a mais forte?", opcoes: ["Trem-Azul-Café-Noturno-42", "Maria@2009", "P@ssw0rd!"], certa: 0, explicacao: "Tamanho pesa mais que símbolos: uma frase longa tem muito mais combinações. As outras usam padrões conhecidos." },
    { tema: "Senhas", texto: "Um site em que você tem conta sofreu vazamento. Você usa a mesma senha no e-mail. O que fazer?", opcoes: ["Trocar a senha nos dois e usar senhas diferentes", "Trocar só a senha do site vazado", "Nada, pois a senha era forte"], certa: 0, explicacao: "Com a senha vazada, criminosos testam a mesma combinação em outros serviços. Cada conta precisa da sua senha." },
    { tema: "2FA", texto: "Ana recebe, sem ter tentado entrar, um código de 2FA no celular. Qual a atitude mais adequada?", opcoes: ["Não usar o código e trocar a senha da conta", "Repassar o código para o suporte confirmar", "Ignorar, pois a senha é longa"], certa: 0, explicacao: "Um código não solicitado indica que alguém pode ter a senha. O 2FA barrou o acesso; trocar a senha fecha a brecha." },
    { tema: "2FA", texto: "Qual combinação é realmente de dois fatores diferentes?", opcoes: ["Senha + código do aplicativo autenticador", "Senha + pergunta secreta", "Senha + PIN"], certa: 0, explicacao: "Senha, pergunta e PIN são todos “algo que você sabe”. O autenticador é “algo que você tem”." },
    { tema: "Criptografia", texto: "Um site usa HTTPS. O que a criptografia dessa conexão garante?", opcoes: ["Os dados viajam protegidos contra leitura", "O site é confiável e não é golpe", "O computador fica protegido de malware"], certa: 0, explicacao: "HTTPS cifra os dados no caminho. Um site falso também pode ter HTTPS." },
    { tema: "Criptografia", texto: "Por que a cifra de César não protege nada hoje?", opcoes: ["Tem só 25 chaves, testadas em instantes", "Porque só funciona com letras maiúsculas", "Porque precisa de internet"], certa: 0, explicacao: "Com tão poucas chaves, basta testar todas. A criptografia moderna usa chaves com trilhões de trilhões de possibilidades." },
    { tema: "Firewall", texto: "Qual é a configuração de firewall mais segura para uma rede escolar?", opcoes: ["Bloquear tudo e liberar só o necessário", "Liberar tudo e bloquear o que der problema", "Desligar para não deixar a internet lenta"], certa: 0, explicacao: "Esse é o princípio do menor privilégio: cada porta aberta é uma possível entrada." },
    { tema: "Firewall", texto: "O firewall está ativo e você clica num link de phishing que pede sua senha. O firewall resolve?", opcoes: ["Não necessariamente: a conexão foi iniciada por você", "Sim, o firewall bloqueia qualquer golpe", "Sim, desde que o antivírus esteja desligado"], certa: 0, explicacao: "O firewall filtra conexões, não engano. Contra phishing, a defesa é atenção e 2FA." },
    { tema: "Ameaças", texto: "Um link encurtado chega pelo grupo da turma prometendo “prova vazada”. O que fazer primeiro?", opcoes: ["Confirmar com o colega por outro meio", "Abrir só no celular, que é mais seguro", "Abrir em aba anônima"], certa: 0, explicacao: "Contas de conhecidos podem ser invadidas. Aba anônima e celular não bloqueiam golpes." },
    { tema: "Backup", texto: "Um ransomware criptografa o computador e o pen drive que estava conectado. Qual cópia salva os arquivos?", opcoes: ["HD externo guardado desconectado", "Outra pasta no mesmo computador", "O próprio pen drive"], certa: 0, explicacao: "O ransomware alcança tudo que está conectado. Cópias desconectadas ou com histórico de versões escapam." },
    { tema: "Backup", texto: "O que significa o “1” da regra de backup 3-2-1?", opcoes: ["Uma cópia fora do local", "Um backup por ano", "Uma única senha para os backups"], certa: 0, explicacao: "Uma cópia em outro lugar (nuvem ou outra casa) protege contra roubo, incêndio e enchente." },
    { tema: "Camadas", texto: "Um computador tem antivírus atualizado, mas o sistema está sem atualizações há um ano. Isso significa:", opcoes: ["Há uma camada falhando que precisa de ajuste", "O antivírus compensa a falta de atualização", "A proteção é total"], certa: 0, explicacao: "Cada camada cobre falhas diferentes. Sistema desatualizado deixa brechas conhecidas." },
  ];
  const QTD = 8;
  const areaPerguntas = document.getElementById("quiz-perguntas");
  const resultado = document.getElementById("quiz-resultado");
  const botaoRefazer = document.getElementById("quiz-refazer");
  const botaoConferir = formulario.querySelector('button[type="submit"]');
  const letras = ["A", "B", "C", "D"];
  let rodada = [];

  const embaralhar = (lista) => {
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = aleatorioSeguro(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  function montarQuiz() {
    rodada = embaralhar(banco).slice(0, QTD).map((p) => {
      const ordem = embaralhar(p.opcoes.map((_, i) => i));
      return { ...p, opcoes: ordem.map((i) => p.opcoes[i]), certa: ordem.indexOf(p.certa) };
    });
    areaPerguntas.innerHTML =
      `<p class="quiz-progresso" id="quiz-progresso">0 de ${QTD} respondidas</p>` +
      rodada.map((p, i) => `
      <div class="card pergunta">
        <fieldset>
          <legend><span class="tema">${p.tema}</span>${i + 1}. ${p.texto}</legend>
          ${p.opcoes.map((op, j) => `<label class="opcao"><input type="radio" name="p${i}" value="${j}" /> <strong>${letras[j]})</strong> ${op}</label>`).join("")}
          <p class="explicacao" hidden></p>
        </fieldset>
      </div>`).join("");
  }

  formulario.addEventListener("change", () => {
    const n = rodada.filter((_, i) => formulario.querySelector(`input[name="p${i}"]:checked`)).length;
    const el = document.getElementById("quiz-progresso");
    if (el) el.textContent = `${n} de ${QTD} respondidas`;
  });

  formulario.addEventListener("submit", (e) => {
    e.preventDefault();
    if (botaoConferir.disabled) return;
    const escolhas = rodada.map((_, i) => formulario.querySelector(`input[name="p${i}"]:checked`));
    if (escolhas.some((x) => !x)) {
      resultado.hidden = false;
      resultado.innerHTML = `<p class="quiz-alerta">Responda todas as ${QTD} perguntas antes de conferir.</p>`;
      return;
    }
    let acertos = 0;
    const errosPorTema = {};
    rodada.forEach((p, i) => {
      const ok = Number(escolhas[i].value) === p.certa;
      if (ok) acertos++; else errosPorTema[p.tema] = true;
      formulario.querySelectorAll(`input[name="p${i}"]`).forEach((input) => {
        if (Number(input.value) === p.certa) input.parentElement.classList.add("correta");
        else if (input.checked) input.parentElement.classList.add("errada");
        input.disabled = true;
      });
      const exp = formulario.querySelectorAll(".explicacao")[i];
      exp.textContent = `${ok ? "Correto." : `Resposta correta: ${letras[p.certa]}.`} ${p.explicacao}`;
      exp.hidden = false;
    });
    const pct = Math.round((acertos / QTD) * 100);
    let mensagem;
    if (pct === 100) mensagem = "Excelente! Você domina os mecanismos de segurança.";
    else if (pct >= 75) mensagem = "Muito bem! Revise as explicações das questões que errou.";
    else if (pct >= 50) mensagem = "Bom começo. Vale reler as partes indicadas abaixo.";
    else mensagem = "Que tal revisar o conteúdo e tentar de novo? As perguntas mudam a cada tentativa.";
    const temas = Object.keys(errosPorTema);
    resultado.hidden = false;
    resultado.innerHTML = `<h3>Você acertou ${acertos} de ${QTD} (${pct}%)</h3>
      <div class="medidor"><div style="width:${pct}%;background:var(--${pct >= 75 ? "sucesso" : pct >= 50 ? "ciano" : "perigo"})"></div></div>
      <p>${mensagem}</p>${temas.length ? `<p class="nota">Para revisar: ${temas.join(", ")}.</p>` : ""}`;
    botaoConferir.disabled = true;
    botaoRefazer.hidden = false;
    resultado.scrollIntoView({ block: "center" });
  });

  botaoRefazer.addEventListener("click", () => {
    montarQuiz();
    resultado.hidden = true;
    botaoRefazer.hidden = true;
    botaoConferir.disabled = false;
    document.getElementById("quiz").scrollIntoView();
  });

  montarQuiz();
})();

// ===== Demonstração fictícia de 2FA (nada é enviado ou salvo) =====
(() => {
  const $ = (id) => document.getElementById(id);
  const celular = $("fa-celular"), codigoEl = $("fa-codigo"), tempo = $("fa-tempo");
  const etapa2 = $("fa-etapa2"), campo = $("fa-campo"), status = $("fa-status");
  if (!celular) return;
  let codigo = "", timer = null, inicio = 0;
  const modo = () => document.querySelector('input[name="fa-modo"]:checked').value;
  const msg = (t, erro) => { status.textContent = t; status.classList.toggle("erro", !!erro); };
  function novoCodigo() { codigo = String(aleatorioSeguro(1000000)).padStart(6, "0"); codigoEl.textContent = codigo; inicio = Date.now(); }
  function parar() { clearInterval(timer); timer = null; celular.hidden = true; etapa2.hidden = true; campo.value = ""; }
  function iniciar2fa(mostrarCelular) {
    novoCodigo(); etapa2.hidden = false; celular.hidden = !mostrarCelular;
    clearInterval(timer);
    timer = setInterval(() => {
      const p = (Date.now() - inicio) / 30000;
      if (p >= 1) novoCodigo();
      tempo.style.width = Math.max(0, 100 - p * 100) + "%";
    }, 200);
  }
  $("fa-entrar").addEventListener("click", () => {
    parar();
    if (modo() === "senha") return msg("Senha correta. Acesso liberado — apenas uma etapa foi exigida.");
    msg("Etapa 1 concluída (senha). Agora digite o código do aplicativo autenticador.");
    iniciar2fa(true); campo.focus();
  });
  $("fa-invasor").addEventListener("click", () => {
    parar();
    if (modo() === "senha") return msg("O invasor usou a senha vazada e entrou na conta. Sem 2FA, a senha é a única barreira.", true);
    msg("O invasor acertou a senha, mas não tem o celular da vítima. Tente adivinhar o código: as chances são de 1 em 1.000.000.", true);
    iniciar2fa(false);
  });
  $("fa-verificar").addEventListener("click", () => {
    if (campo.value.trim() === codigo) { msg("Código correto. Acesso liberado com duas etapas de verificação."); parar(); }
    else msg("Código incorreto. Acesso negado.", true);
  });
  document.querySelectorAll('input[name="fa-modo"]').forEach((r) => r.addEventListener("change", () => { parar(); msg(""); }));
})();

// ===== Cifra de César passo a passo =====
(() => {
  const texto = document.getElementById("ces-texto");
  if (!texto) return;
  const chave = document.getElementById("ces-chave"), valor = document.getElementById("ces-valor");
  const a1 = document.getElementById("ces-alfa1"), a2 = document.getElementById("ces-alfa2"), saida = document.getElementById("ces-saida");
  const AB = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const tirarAcento = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  function atualizar() {
    const k = Number(chave.value);
    valor.textContent = k;
    a1.innerHTML = [...AB].map((c) => `<span>${c}</span>`).join("");
    a2.innerHTML = [...AB].map((_, i) => `<span>${AB[(i + k) % 26]}</span>`).join("");
    saida.textContent = [...tirarAcento(texto.value)].map((c) => { const i = AB.indexOf(c); return i < 0 ? c : AB[(i + k) % 26]; }).join("") || "—";
  }
  texto.addEventListener("input", atualizar);
  chave.addEventListener("input", atualizar);
  atualizar();
})();

// ===== Simulador de firewall (tráfego fictício) =====
(() => {
  const enviar = document.getElementById("fw-enviar");
  if (!enviar) return;
  const tabela = document.getElementById("fw-tabela"), corpo = tabela.querySelector("tbody"), status = document.getElementById("fw-status");
  const trafego = [
    { origem: "Colega acessando o site da turma", porta: 443, oque: "Site com HTTPS", perigo: false },
    { origem: "Visitante da feira", porta: 80, oque: "Site sem criptografia", perigo: false },
    { origem: "Origem desconhecida", porta: 23, oque: "Tentativa de login remoto antigo", perigo: true },
    { origem: "Robô de varredura", porta: 3389, oque: "Tentativa de controlar o computador", perigo: true },
    { origem: "IP desconhecido", porta: 445, oque: "Compartilhamento de arquivos", perigo: true },
  ];
  enviar.addEventListener("click", () => {
    const liberadas = [...document.querySelectorAll("#fw-regras input:checked")].map((i) => Number(i.value));
    let ataquesPassaram = 0, legitimosBloqueados = 0;
    corpo.innerHTML = trafego.map((t) => {
      const passa = liberadas.includes(t.porta);
      if (passa && t.perigo) ataquesPassaram++;
      if (!passa && !t.perigo) legitimosBloqueados++;
      return `<tr><td>${t.origem}</td><td class="mono">${t.porta}</td><td>${t.oque}</td><td class="${passa ? (t.perigo ? "txt-perigo" : "txt-sucesso") : "txt-neutro"}">${passa ? "Permitido" : "Bloqueado"}</td></tr>`;
    }).join("");
    tabela.hidden = false;
    let msg;
    if (ataquesPassaram) msg = `${ataquesPassaram} conexão(ões) suspeita(s) foram permitidas pelas regras. Isso não comprova uma invasão. Feche as portas que não são necessárias.`;
    else if (legitimosBloqueados) msg = `As conexões suspeitas foram bloqueadas, mas ${legitimosBloqueados} acesso(s) legítimo(s) também foram bloqueados. Segurança também é equilíbrio.`;
    else msg = "Configuração equilibrada: os visitantes acessam o site e as tentativas suspeitas foram barradas.";
    status.textContent = msg;
    status.classList.toggle("erro", ataquesPassaram > 0);
  });
  document.getElementById("fw-limpar").addEventListener("click", () => { corpo.innerHTML = ""; tabela.hidden = true; status.textContent = ""; });
})();

// ===== Simulador de backup e recuperação =====
(() => {
  const area = document.getElementById("sim-backup");
  if (!area) return;
  const lista = document.getElementById("bk-resultado"), status = document.getElementById("bk-status");
  const nomes = { original: "Arquivos no notebook", pendrive: "Pen drive conectado", hd: "HD externo desconectado", nuvem: "Nuvem com versões" };
  // O que cada incidente destrói
  const destroi = {
    ransomware: ["original", "pendrive"],
    roubo: ["original", "pendrive"],
    incendio: ["original", "pendrive", "hd"],
  };
  const descricao = {
    ransomware: "O ransomware criptografou tudo o que estava conectado ao computador.",
    roubo: "O notebook foi levado junto com o pen drive na mochila.",
    incendio: "Tudo o que estava dentro de casa foi perdido.",
  };
  area.querySelectorAll("[data-incidente]").forEach((b) => b.addEventListener("click", () => {
    const inc = b.dataset.incidente;
    const copias = ["original", ...[...area.querySelectorAll("#bk-copias input:checked")].map((i) => i.value)];
    const sobrou = copias.filter((c) => !destroi[inc].includes(c));
    lista.innerHTML = copias.map((c) => `<li class="${sobrou.includes(c) ? "txt-sucesso" : "txt-perigo"}">${nomes[c]}: ${sobrou.includes(c) ? "preservado" : "perdido"}</li>`).join("");
    if (sobrou.length) {
      status.textContent = `${descricao[inc]} Recuperação possível a partir de: ${sobrou.map((c) => nomes[c]).join(" e ")}.`;
      status.classList.remove("erro");
    } else {
      status.textContent = `${descricao[inc]} Nenhuma cópia sobreviveu — os trabalhos foram perdidos. Experimente combinar mídias diferentes e uma cópia fora de casa (regra 3-2-1).`;
      status.classList.add("erro");
    }
  }));
})();

};
