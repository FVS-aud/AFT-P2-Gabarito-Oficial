// ========================================================================
// ARQUIVO: script.js - Conferência de Gabarito com Estatísticas Firebase
// ========================================================================

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCqueuFjV1FeBgdfMtG4PIt9KkvMznAhhg", // Substitua se for diferente
  authDomain: "conferencia-gabarito-app-8dbd0.firebaseapp.com", // Substitua se for diferente
  projectId: "conferencia-gabarito-app-8dbd0", // Substitua se for diferente
  storageBucket: "conferencia-gabarito-app-8dbd0.appspot.com", // Verifique se termina com appspot.com ou firebasestorage.app no seu console
  messagingSenderId: "435528200039", // Substitua se for diferente
  appId: "1:435528200039:web:40fd7fb07b23cf1fecc9c2" // Substitua se for diferente
};

// --- DECLARAÇÃO DAS VARIÁVEIS GLOBAIS ---
// Firebase
let db;
let statsDocRef;
// DOM - Formulário e Resultado
let tipoProvaSelect, formRespostas, submitBtn, resultadoDiv, scoreP, mensagemP, imagemResultadoImg, gabaritoCorretoDiv, gabaritoTextoPre;
// DOM - Estatísticas e Gráfico
let estatisticasDiv;
let totalPessoasSpan;
let graficoCanvasElement;
let graficoContext;
let graficoAcertosInstance = null;

// --- INICIALIZAÇÃO DO FIREBASE E FIRESTORE ---
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    statsDocRef = db.collection("statistics").doc("globalStats");
    console.log("Firebase inicializado com sucesso e variáveis db/statsDocRef definidas.");
} catch (error) {
    console.error("Erro CRÍTICO ao inicializar o Firebase:", error);
    alert("ERRO GRAVE: Não foi possível conectar ao Firebase. Verifique as credenciais, a conexão e o console (F12).");
    throw new Error("Falha na inicialização do Firebase.");
}

// --- GABARITOS ---
const gabaritos = {
    'tipo1': [ // Certifique-se que este gabarito está correto
        'C', 'E', 'D', 'B', 'A', 'C', 'E', 'A', 'D', 'A', // 1-10
        'E', 'C', 'E', 'C', 'B', 'E', 'C', 'E', 'C', 'C', // 11-20
        'A', 'D', 'B', 'E', 'B', 'A', 'D', 'B', 'D', 'A', // 21-30
        'E', 'B', 'D', 'A', 'C', 'B', 'A', 'D', 'C', 'D', // 31-40
        'E', 'E', 'D', 'D', 'C', 'D', 'E', 'C', 'A', 'E', // 41-50
        'D', 'A', 'A', 'B', 'D', 'E', 'B', 'E', 'D', 'E'  // 51-60
    ],
};
console.log("Gabaritos carregados.");

// --- ELEMENTOS DO DOM (HTML) ---
// Atribui os elementos às variáveis globais declaradas com 'let' acima
let domElementsOk = true;
try {
    // Elementos do Formulário e Resultado Individual
    tipoProvaSelect = document.getElementById('provaTipo');
    formRespostas = document.getElementById('formRespostas');
    submitBtn = document.getElementById('submitBtn');
    resultadoDiv = document.getElementById('resultado');
    scoreP = document.getElementById('score');
    mensagemP = document.getElementById('mensagem');
    imagemResultadoImg = document.getElementById('imagemResultado');
    gabaritoCorretoDiv = document.getElementById('gabaritoCorreto');
    gabaritoTextoPre = document.getElementById('gabaritoTexto');

    // Verifica se elementos essenciais do formulário/resultado existem
    if (!tipoProvaSelect || !formRespostas || !submitBtn || !resultadoDiv || !scoreP || !mensagemP || !imagemResultadoImg || !gabaritoCorretoDiv || !gabaritoTextoPre) {
        console.error("ERRO: Um ou mais elementos essenciais do formulário/resultado não foram encontrados! Verifique os IDs no HTML.");
        domElementsOk = false;
    }

    // Elementos das Estatísticas Gerais
    estatisticasDiv = document.getElementById('estatisticasGerais');
    totalPessoasSpan = document.getElementById('totalPessoas');
    graficoCanvasElement = document.getElementById('graficoAcertos');

    // Verifica se elementos de estatísticas existem
    if (!estatisticasDiv || !totalPessoasSpan || !graficoCanvasElement) {
        console.warn("Aviso: Um ou mais elementos HTML para estatísticas não foram encontrados. A seção de estatísticas pode não funcionar.");
    } else {
        // Tenta pegar o contexto SOMENTE se o canvas foi encontrado
        try {
            graficoContext = graficoCanvasElement.getContext('2d');
            if (!graficoContext) {
                 console.error("ERRO: Falha ao obter o contexto 2D do canvas. O gráfico não funcionará.");
                 // Considerar domElementsOk = false se o gráfico for essencial
            }
        } catch (canvasError) {
            console.error("Erro ao obter contexto 2D do canvas:", canvasError);
            domElementsOk = false; // Erro no contexto é problemático
        }
    }

    if (domElementsOk) {
        console.log("Referências DOM obtidas com sucesso.");
    } else {
         alert("ERRO GRAVE: Falha ao carregar elementos essenciais da página. Verifique o console (F12) e os IDs no HTML.");
         throw new Error("Falha ao obter elementos DOM essenciais.");
    }

} catch (error) {
    console.error("Erro inesperado ao obter referências DOM:", error);
    alert("ERRO GRAVE: Falha inesperada ao preparar a página. Verifique o console (F12).");
    throw new Error("Falha inesperada na obtenção de elementos DOM.");
}


// --- FUNÇÃO PRINCIPAL DE CONFERÊNCIA ---
function conferirRespostas() {
    console.log("Função conferirRespostas INICIADA.");

    // Verifica se elementos essenciais usados aqui existem (agora globais)
    if (!tipoProvaSelect || !gabaritos || !resultadoDiv || !scoreP || !mensagemP || !imagemResultadoImg || !gabaritoCorretoDiv || !gabaritoTextoPre) {
         console.error("Erro dentro de conferirRespostas: Elementos DOM ou gabaritos essenciais estão faltando.");
         alert("Erro interno ao tentar conferir. Elementos da página não encontrados.");
         return;
    }

    console.log("Iniciando conferência de respostas...");

    // 1. Obter tipo de prova e gabarito oficial
    const tipoSelecionado = tipoProvaSelect.value; // Usa a variável global tipoProvaSelect
    const gabaritoOficial = gabaritos[tipoSelecionado];

    if (!gabaritoOficial) {
        alert(`Tipo de prova "${tipoSelecionado}" inválido ou gabarito não cadastrado.`);
        return;
    }
    if (gabaritoOficial.length !== 60) {
        alert(`Erro interno: O gabarito para ${tipoSelecionado} não contém 60 questões.`);
        console.error(`Erro: Gabarito "${tipoSelecionado}" tem ${gabaritoOficial.length} questões, esperado 60.`);
        return;
    }

    // 2. Obter respostas do usuário e validar
    const respostasUsuario = [];
    let todasPreenchidas = true;
    for (let i = 1; i <= 60; i++) {
        const input = document.getElementById(`q${i}`);
        if (!input) {
            console.error(`Erro: Input q${i} não encontrado!`);
            alert(`Erro interno: Campo da questão ${i} não encontrado.`);
            return;
        }
        const valor = input.value.trim().toUpperCase();
        if (!valor || !/^[A-E]$/.test(valor)) {
           input.style.borderColor = 'red';
           todasPreenchidas = false;
        } else {
           input.style.borderColor = '#ccc';
           respostasUsuario.push(valor);
        }
    }

    if (!todasPreenchidas || respostasUsuario.length !== 60) {
        alert('Por favor, preencha todas as 60 questões com uma letra válida de A a E.');
        resultadoDiv.classList.add('hidden');
        gabaritoCorretoDiv.classList.add('hidden');
        return;
    }
    console.log("Respostas do usuário coletadas e validadas.");

    // 3. Comparar respostas e calcular pontuação
    let acertos = 0;
    for (let i = 0; i < 60; i++) {
        if (respostasUsuario[i] === gabaritoOficial[i]) {
            acertos++;
        }
    }
    console.log(`Total de acertos: ${acertos}`);

    // 4. Determinar mensagem e imagem individual
    let mensagem = '';
    let imagemSrc = '';
    if (acertos < 36) {
        mensagem = '';
        imagemSrc = 'images/A5.png';
    } else if (acertos <= 39) {
        mensagem = "Passou raspando hein fi, manéra na cachaça aí";
        imagemSrc = 'images/A1.png';
    } else if (acertos <= 49) {
        mensagem = "Parabéns! não fez mais do que a sua obrigação";
        imagemSrc = 'images/A2.png';
    } else if (acertos <= 59) {
        mensagem = "É o bixão mermo hein";
        imagemSrc = 'images/A3.png';
    } else { // 60
        mensagem = "Deixa de mentira Rapá";
        imagemSrc = 'images/A4.png';
    }

    // 5. Exibir Resultado Individual na Tela
    scoreP.textContent = `Você acertou ${acertos} de 60 questões.`;
    mensagemP.textContent = mensagem;
    imagemResultadoImg.src = imagemSrc;
    imagemResultadoImg.alt = `Resultado: ${acertos} acertos`;
    resultadoDiv.classList.remove('hidden');

    // Exibir Gabarito Correto
    let gabaritoFormatado = `Gabarito Oficial - ${tipoSelecionado.toUpperCase()}:\n\n`;
    for(let i = 0; i < gabaritoOficial.length; i++) {
        gabaritoFormatado += `${String(i + 1).padStart(2, '0')}: ${gabaritoOficial[i]}   `;
        if ((i + 1) % 10 === 0) { gabaritoFormatado += '\n'; }
    }
    gabaritoTextoPre.textContent = gabaritoFormatado;
    gabaritoCorretoDiv.classList.remove('hidden');


    // 6. ATUALIZAR ESTATÍSTICAS GLOBAIS NO FIRESTORE
    try {
        if (!statsDocRef) throw new Error("Referência do Firestore (statsDocRef) não está definida.");

        let scoreRangeKey;
        if (acertos < 36) { scoreRangeKey = 'range_lt_36'; }
        else if (acertos <= 39) { scoreRangeKey = 'range_36_39'; }
        else if (acertos <= 49) { scoreRangeKey = 'range_40_49'; }
        else { scoreRangeKey = 'range_50_60'; }

        const updateData = {
            totalSubmissions: firebase.firestore.FieldValue.increment(1),
            [scoreRangeKey]: firebase.firestore.FieldValue.increment(1)
        };

        console.log("Tentando atualizar Firestore com:", updateData);
        statsDocRef.update(updateData)
            .then(() => {
                console.log("Estatísticas globais no Firestore atualizadas com sucesso!");
            })
            .catch((error) => {
                console.error("Erro ao atualizar estatísticas globais no Firestore: ", error);
                alert("Atenção: Seu resultado foi calculado, mas houve um erro ao salvar as estatísticas globais. O gráfico pode não ser atualizado.");
            });
    } catch (error) {
         console.error("Erro crítico ao tentar atualizar Firestore:", error);
         alert("Erro grave ao tentar comunicar com o banco de dados de estatísticas.");
    }

    // 7. Opcional: Rolar a página para mostrar o resultado individual
    resultadoDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    console.log("Fim da conferência de respostas.");
} // --- FIM da função conferirRespostas ---


// --- FUNÇÃO PARA ATUALIZAR GRÁFICO E CONTAGEM ---
function atualizarGraficoEstatisticas(data) {
    // Verifica se os elementos/contexto necessários (globais) existem
    if (!totalPessoasSpan || !graficoContext || !estatisticasDiv) {
        console.error("Elementos HTML/Contexto essenciais para estatísticas não estão definidos. Não é possível atualizar o gráfico.");
        return;
    }

    console.log("Atualizando gráfico com dados:", data);

    // Trata o caso de não haver dados válidos recebidos do Firestore
    if (!data || data.totalSubmissions === undefined || data.totalSubmissions === null) {
         totalPessoasSpan.textContent = "0";
         if (graficoAcertosInstance) {
             graficoAcertosInstance.destroy();
             graficoAcertosInstance = null;
         }
         estatisticasDiv.classList.add('hidden');
         console.log("Sem dados de estatísticas válidos para exibir.");
         return;
    }

    // Processa os dados recebidos
    const totalSubmissions = data.totalSubmissions || 0;
    const ranges = {
        '< 36': data.range_lt_36 || 0,
        '36-39': data.range_36_39 || 0,
        '40-49': data.range_40_49 || 0,
        '50-60': data.range_50_60 || 0
    };

    // Atualiza o texto do total de pessoas
    totalPessoasSpan.textContent = totalSubmissions;

    // Só mostra a seção e desenha/atualiza o gráfico se houver submissões
    if (totalSubmissions > 0) {
         estatisticasDiv.classList.remove('hidden');

        // Prepara dados para o Chart.js
        const labels = Object.keys(ranges);
        const values = Object.values(ranges);

        // Destrói o gráfico anterior se ele já existir
        if (graficoAcertosInstance) {
            graficoAcertosInstance.destroy();
        }

        // Cria um novo gráfico Chart.js
        try {
            graficoAcertosInstance = new Chart(graficoContext, { // Usa graficoContext
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '# de Pessoas',
                        data: values,
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.7)', // Vermelho
                            'rgba(255, 206, 86, 0.7)', // Amarelo
                            'rgba(75, 192, 192, 0.7)', // Verde/Azulado
                            'rgba(54, 162, 235, 0.7)'  // Azul
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(54, 162, 235, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) { label += ': '; }
                                    const value = context.parsed || 0;
                                    const sum = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = sum === 0 ? 0 : ((value / sum) * 100);
                                    label += `${value} (${percentage.toFixed(1)}%)`;
                                    return label;
                                }
                            }
                        },
                        title: { display: true, text: 'Distribuição de Acertos (%)' }
                    }
                }
            });
            console.log("Gráfico atualizado/criado com sucesso.");
        } catch (error) {
            console.error("Erro ao criar/atualizar o gráfico:", error);
            alert("Ocorreu um erro ao tentar exibir o gráfico de estatísticas.");
        }

    } else {
         estatisticasDiv.classList.add('hidden');
         if (graficoAcertosInstance) {
             graficoAcertosInstance.destroy();
             graficoAcertosInstance = null;
         }
         console.log("Total de submissões é 0. Gráfico não será exibido.");
    }
} // --- FIM da função atualizarGraficoEstatisticas ---


// --- CONFIGURA O LISTENER EM TEMPO REAL DO FIRESTORE ---
function setupRealtimeUpdates() {
    console.log("Configurando listener de atualizações em tempo real do Firestore...");

    if (!statsDocRef) {
        console.error("Não é possível configurar o listener: statsDocRef não está definido.");
        alert("Erro grave: Falha ao conectar ao banco de dados de estatísticas.");
        return;
    }

    statsDocRef.onSnapshot((doc) => {
        if (doc.exists) {
            console.log("Dados das estatísticas recebidos/atualizados:", doc.data());
            atualizarGraficoEstatisticas(doc.data());
        } else {
            console.warn("Documento de estatísticas ('globalStats') não encontrado no Firestore!");
            atualizarGraficoEstatisticas(null);
        }
    }, (error) => {
        console.error("Erro no listener do Firestore (onSnapshot): ", error);
        if(totalPessoasSpan) totalPessoasSpan.textContent = "Erro";
        alert("Falha ao carregar estatísticas em tempo real. Verifique sua conexão ou as permissões do Firebase.");
        if(estatisticasDiv) estatisticasDiv.classList.add('hidden');
        if (graficoAcertosInstance) {
            graficoAcertosInstance.destroy();
            graficoAcertosInstance = null;
        }
    });
    console.log("Listener do Firestore configurado.");
} // --- FIM da função setupRealtimeUpdates ---


// --- EVENT LISTENERS (GATILHOS DE AÇÃO) ---

// 1. Gatilho para o botão "Conferir Respostas"
console.log("Tentando adicionar listener ao botão...");
if (submitBtn) { // Verifica se a variável submitBtn (agora global) foi definida
    submitBtn.addEventListener('click', function() {
        console.log("Botão 'Conferir' CLICADO!");
        try { // Adiciona try/catch em volta da chamada para pegar erros imediatos
             conferirRespostas();
        } catch (error) {
             console.error("Erro CRÍTICO ao executar conferirRespostas:", error);
             alert("Ocorreu um erro inesperado ao processar suas respostas. Verifique o console (F12).");
        }
    });
    console.log("Listener do botão 'Conferir' adicionado.");
} else {
    console.error("Botão 'submitBtn' não encontrado ou não definido. A conferência não funcionará.");
    alert("ERRO GRAVE: Botão principal não encontrado!");
}

// 2. Gatilho opcional para permitir submeter com Enter
if (formRespostas) {
    formRespostas.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            try {
                 const currentInput = event.target;
                 if (currentInput && currentInput.id && currentInput.id.startsWith('q')) {
                     const currentId = parseInt(currentInput.id.replace('q',''));
                     if(!isNaN(currentId) && currentId < 60) {
                         const nextInput = document.getElementById(`q${currentId + 1}`);
                         if(nextInput) nextInput.focus();
                     } else if (submitBtn) {
                          submitBtn.click();
                     }
                 } else if (submitBtn) {
                     submitBtn.click();
                 }
            } catch (e) { console.warn("Erro na navegação com Enter:", e); }
        }
    });
    console.log("Listener de 'Enter' no formulário adicionado.");
} else {
    console.warn("Elemento 'formRespostas' não encontrado. Navegação com Enter não funcionará.");
}


// 3. Gatilho para iniciar o listener do Firebase QUANDO a página carregar
document.addEventListener('DOMContentLoaded', () => {
    console.log("Evento DOMContentLoaded disparado.");

    // Verifica se o Firebase e as refs essenciais estão prontas
    if (typeof firebase !== 'undefined' && db && statsDocRef) {
        console.log("Firebase, db e statsDocRef parecem definidos. Chamando setupRealtimeUpdates...");
        setupRealtimeUpdates(); // Começa a ouvir o Firestore
    } else {
        console.error("Firebase ou referências essenciais (db, statsDocRef) não estão prontos no DOMContentLoaded. Listener não será configurado.");
        if (typeof firebase === 'undefined') console.error("--> Objeto 'firebase' global está undefined.");
        if (!db) console.error("--> Variável 'db' (Firestore) não está definida.");
        if (!statsDocRef) console.error("--> Variável 'statsDocRef' (Referência Doc) não está definida.");
        alert("Erro Crítico: Falha na inicialização do sistema de estatísticas após o carregamento da página. Verifique o console (F12).");
    }
});

console.log("Fim do script.js alcançado.");
// ========================================================================
// FIM DO ARQUIVO script.js
// ========================================================================
