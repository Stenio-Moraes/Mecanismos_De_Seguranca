// ===== Menu no celular: abre e fecha a lista de links =====
const menuBotao = document.querySelector(".menu-botao");
const menuLinks = document.querySelector(".menu-links");
menuBotao.addEventListener("click", () => {
  const aberto = menuLinks.classList.toggle("aberto");
  menuBotao.setAttribute("aria-expanded", aberto);
});
menuLinks.querySelectorAll("a").forEach((link) =>
  link.addEventListener("click", () => menuLinks.classList.remove("aberto"))
);

// Link do site ainda sem endereço: impede que o "#" leve ao topo
document.getElementById("link-site").addEventListener("click", (e) => {
  if (e.currentTarget.getAttribute("href") === "#") e.preventDefault();
});

// ===== Quiz =====
// Para editar: mude o texto, as opções e o índice da resposta certa (0, 1 ou 2).
const perguntas = [
  {
    texto: "Quais são os três pilares da segurança da informação?",
    opcoes: ["Velocidade, Memória e Armazenamento", "Confidencialidade, Integridade e Disponibilidade", "Senha, Antivírus e Internet"],
    certa: 1,
  },
  {
    texto: "Qual destas é a senha mais forte?",
    opcoes: ["123456", "meunome2008", "Lua!Verde7#Caderno"],
    certa: 2,
  },
  {
    texto: "O que a autenticação em dois fatores (2FA) faz?",
    opcoes: ["Adiciona uma etapa extra de verificação além da senha", "Deixa a internet mais rápida", "Apaga vírus do computador"],
    certa: 0,
  },
  {
    texto: "Uma mensagem urgente pede sua senha para “evitar o bloqueio da conta”. Isso provavelmente é:",
    opcoes: ["Um aviso oficial confiável", "Phishing", "Uma atualização do sistema"],
    certa: 1,
  },
  {
    texto: "O que fazer ao receber um link suspeito?",
    opcoes: ["Clicar para ver do que se trata", "Encaminhar para os amigos", "Não clicar e confirmar a origem por outro meio"],
    certa: 2,
  },
];

const areaPerguntas = document.getElementById("quiz-perguntas");
const formulario = document.getElementById("quiz-form");
const resultado = document.getElementById("quiz-resultado");
const botaoRefazer = document.getElementById("quiz-refazer");

// Cria o HTML de cada pergunta
function montarQuiz() {
  areaPerguntas.innerHTML = perguntas
    .map((p, i) => `
      <div class="card pergunta">
        <fieldset>
          <legend>${i + 1}. ${p.texto}</legend>
          ${p.opcoes.map((op, j) => `
            <label class="opcao"><input type="radio" name="p${i}" value="${j}" /> ${op}</label>
          `).join("")}
        </fieldset>
      </div>`)
    .join("");
}

// Confere as respostas e mostra a pontuação
formulario.addEventListener("submit", (e) => {
  e.preventDefault();
  const respondidas = perguntas.filter((_, i) => formulario.querySelector(`input[name="p${i}"]:checked`));
  if (respondidas.length < perguntas.length) {
    resultado.hidden = false;
    resultado.innerHTML = `<p class="quiz-alerta">Responda todas as ${perguntas.length} perguntas antes de conferir.</p>`;
    return;
  }

  let acertos = 0;
  perguntas.forEach((p, i) => {
    formulario.querySelectorAll(`input[name="p${i}"]`).forEach((input) => {
      const label = input.parentElement;
      const valor = Number(input.value);
      if (valor === p.certa) label.classList.add("correta");
      else if (input.checked) label.classList.add("errada");
      input.disabled = true;
    });
    if (Number(formulario.querySelector(`input[name="p${i}"]:checked`).value) === p.certa) acertos++;
  });

  let mensagem;
  if (acertos === 5) mensagem = "Excelente! Você está pronto para proteger seus dados.";
  else if (acertos >= 3) mensagem = "Muito bem! Revise os pontos marcados em vermelho para ficar ainda mais seguro.";
  else mensagem = "Que tal reler o conteúdo? Segurança digital se aprende com prática.";

  resultado.hidden = false;
  resultado.innerHTML = `<h3>Você acertou ${acertos} de ${perguntas.length}</h3><p>${mensagem}</p>`;
  botaoRefazer.hidden = false;
});

// Recomeça o quiz
botaoRefazer.addEventListener("click", () => {
  montarQuiz();
  resultado.hidden = true;
  botaoRefazer.hidden = true;
  document.getElementById("quiz").scrollIntoView();
});

montarQuiz();
