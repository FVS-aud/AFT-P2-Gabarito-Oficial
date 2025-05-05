// --- GABARITOS ---
// Adicione aqui os gabaritos corretos para cada tipo de prova.
// Certifique-se de que cada gabarito tenha EXATAMENTE 60 respostas (A, B, C, D ou E).
const gabaritos = {
    'tipo1': [
        'C', 'E', 'D', 'B', 'A', 'C', 'E', 'A', 'D', 'A', // 1-10
        'E', 'C', 'E', 'C', 'B', 'E', 'C', 'E', 'C', 'C', // 11-20
        'A', 'D', 'B', 'E', 'B', 'A', 'D', 'B', 'D', 'A', // 21-30
        'E', 'B', 'D', 'A', 'C', 'B', 'A', 'D', 'C', 'D', // 31-40
        'E', 'E', 'D', 'D', 'C', 'D', 'E', 'C', 'A', 'E', // 41-50
        'D', 'A', 'A', 'B', 'D', 'E', 'B', 'E', 'D', 'E'  // 51-60
    ],
    'tipo2': [
        'E', 'D', 'C', 'B', 'A', 'E', 'D', 'C', 'B', 'A', // 1-10
        'E', 'D', 'C', 'B', 'A', 'E', 'D', 'C', 'B', 'A', // 11-20
        'E', 'D', 'C', 'B', 'A', 'E', 'D', 'C', 'B', 'A', // 21-30
        'E', 'D', 'C', 'B', 'A', 'E', 'D', 'C', 'B', 'A', // 31-40
        'E', 'D', 'C', 'B', 'A', 'E', 'D', 'C', 'B', 'A', // 41-50
        'E', 'D', 'C', 'B', 'A', 'E', 'D', 'C', 'B', 'A'  // 51-60
    ],
    'tipo3': [ // Exemplo de outro gabarito
        'B', 'B', 'B', 'B', 'B', 'C', 'C', 'C', 'C', 'C', // 1-10
        'D', 'D', 'D', 'D', 'D', 'E', 'E', 'E', 'E', 'E', // 11-20
        'A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B', // 21-30
        'C', 'C', 'C', 'C', 'C', 'D', 'D', 'D', 'D', 'D', // 31-40
        'E', 'E', 'E', 'E', 'E', 'A', 'A', 'A', 'A', 'A', // 41-50
        'B', 'C', 'D', 'E', 'A', 'B', 'C', 'D', 'E', 'A'  // 51-60
    ]
    // Adicione mais gabaritos aqui: 'tipo4': [...], etc.
};

// --- ELEMENTOS DO DOM ---
const tipoProvaSelect = document.getElementById('provaTipo');
const formRespostas = document.getElementById('formRespostas');
const submitBtn = document.getElementById('submitBtn');
const resultadoDiv = document.getElementById('resultado');
const scoreP = document.getElementById('score');
const mensagemP = document.getElementById('mensagem');
const imagemResultadoImg = document.getElementById('imagemResultado');
const gabaritoCorretoDiv = document.getElementById('gabaritoCorreto');
const gabaritoTextoPre = document.getElementById('gabaritoTexto');

// --- FUNÇÃO PRINCIPAL DE CONFERÊNCIA ---
function conferirRespostas() {
    const tipoSelecionado = tipoProvaSelect.value;
    const gabaritoOficial = gabaritos[tipoSelecionado];

    // Verifica se o gabarito para o tipo selecionado existe
    if (!gabaritoOficial) {
        alert('Tipo de prova inválido ou gabarito não cadastrado.');
        return;
    }

    if (gabaritoOficial.length !== 60) {
        alert(`Erro interno: O gabarito para ${tipoSelecionado} não contém 60 questões.`);
        console.error(`Erro: Gabarito "${tipoSelecionado}" tem ${gabaritoOficial.length} questões, esperado 60.`);
        return;
    }


    const respostasUsuario = [];
    let todasPreenchidas = true;
    for (let i = 1; i <= 60; i++) {
        const input = document.getElementById(`q${i}`);
        const valor = input.value.trim().toUpperCase(); // Pega valor, remove espaços, converte p/ maiúscula

         // Validação básica se o campo está vazio ou com caractere inválido
        if (!valor || !/^[A-E]$/.test(valor)) {
           input.style.borderColor = 'red'; // Destaca campo inválido/vazio
           todasPreenchidas = false;
        } else {
           input.style.borderColor = '#ccc'; // Reseta borda se válido
        }
        respostasUsuario.push(valor); // Adiciona mesmo se inválido para manter a contagem
    }

    if (!todasPreenchidas) {
        alert('Por favor, preencha todas as 60 questões com uma letra de A a E.');
        resultadoDiv.classList.add('hidden'); // Garante que resultado anterior seja escondido
        gabaritoCorretoDiv.classList.add('hidden');
        return; // Para a execução se houver campos inválidos/vazios
    }


    // Comparar respostas e calcular pontuação
    let acertos = 0;
    for (let i = 0; i < 60; i++) {
        if (respostasUsuario[i] === gabaritoOficial[i]) {
            acertos++;
        }
    }

    // Determinar mensagem e imagem com base nos acertos
    let mensagem = '';
    let imagemSrc = '';
    const aprovado = acertos >= 36;

    if (!aprovado) { // Menos de 36 acertos
        mensagem = ''; // Sem mensagem específica
        imagemSrc = 'images/A5.png';
    } else if (acertos >= 36 && acertos <= 39) {
        mensagem = "Passou raspando hein fi, manéra na cachaça aí";
        imagemSrc = 'images/A1.png';
    } else if (acertos >= 40 && acertos <= 49) { // Ajustado de 39 para 40 para não sobrepor
        mensagem = "Parabéns! não fez mais do que a sua obrigação";
        imagemSrc = 'images/A2.png';
    } else if (acertos >= 50 && acertos <= 59) {
        mensagem = "É o bixão mermo hein";
        imagemSrc = 'images/A3.png';
    } else if (acertos === 60) {
        mensagem = "Deixa de mentira Rapá";
        imagemSrc = 'images/A4.png';
    }

    // Exibir Resultados
    scoreP.textContent = `Você acertou ${acertos} de 60 questões.`;
    mensagemP.textContent = mensagem;
    imagemResultadoImg.src = imagemSrc;
    imagemResultadoImg.alt = `Resultado: ${acertos} acertos`; // Alt text descritivo
    resultadoDiv.classList.remove('hidden'); // Mostra a div de resultados

    // Exibir Gabarito Correto
    let gabaritoFormatado = `Gabarito Oficial - ${tipoSelecionado.toUpperCase()}:\n\n`;
    for(let i = 0; i < gabaritoOficial.length; i++) {
        gabaritoFormatado += `${String(i + 1).padStart(2, '0')}: ${gabaritoOficial[i]}   `; // Adiciona número da questão
        if ((i + 1) % 10 === 0) { // Quebra linha a cada 10 questões
            gabaritoFormatado += '\n';
        }
    }
    gabaritoTextoPre.textContent = gabaritoFormatado;
    gabaritoCorretoDiv.classList.remove('hidden'); // Mostra a div do gabarito

    // Opcional: Rolar a página para mostrar o resultado
    resultadoDiv.scrollIntoView({ behavior: 'smooth' });
}

// --- EVENT LISTENER ---
submitBtn.addEventListener('click', conferirRespostas);

// Opcional: Permitir submeter com Enter em qualquer input
formRespostas.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        // Impede o envio padrão do formulário se ele existir
        event.preventDefault(); 
        // Encontra o próximo input ou o botão de submit se for o último input
        const currentInput = event.target;
        const currentId = parseInt(currentInput.id.replace('q',''));
        if(currentId < 60) {
            const nextInput = document.getElementById(`q${currentId + 1}`);
            if(nextInput) nextInput.focus();
        } else {
             // Se for o último input, simula o clique no botão
            submitBtn.click();
        }
    }
});
