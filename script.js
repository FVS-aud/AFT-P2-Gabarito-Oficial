// --- CONFIGURAÇÃO DO FIREBASE ---
// Objeto com suas credenciais (Verifique se estão corretas!)
const firebaseConfig = {
  apiKey: "AIzaSyCqueuFjV1FeBgdfMtG4PIt9KkvMznAhhg", // Substitua se for diferente
  authDomain: "conferencia-gabarito-app-8dbd0.firebaseapp.com", // Substitua se for diferente
  projectId: "conferencia-gabarito-app-8dbd0", // Substitua se for diferente
  storageBucket: "conferencia-gabarito-app-8dbd0.appspot.com", // Verifique se termina com appspot.com ou firebasestorage.app no seu console
  messagingSenderId: "435528200039", // Substitua se for diferente
  appId: "1:435528200039:web:40fd7fb07b23cf1fecc9c2" // Substitua se for diferente
};

// --- DECLARAÇÃO DAS VARIÁVEIS GLOBAIS DO FIREBASE ---
let db;
let statsDocRef;

// --- DECLARAÇÃO DAS VARIÁVEIS GLOBAIS DO GRÁFICO/ESTATÍSTICAS ---
let estatisticasDiv;
let totalPessoasSpan;
let graficoCanvasElement; // Variável para o elemento <canvas>
let graficoContext;     // Variável para o contexto de desenho 2D
let graficoAcertosInstance = null; // Guarda a instância do Chart.js

// --- INICIALIZAÇÃO DO FIREBASE E FIRESTORE ---
try {
    // Inicializa o Firebase (usa o objeto 'firebase' global dos scripts -compat.js)
    firebase.initializeApp(firebaseConfig);

    // ATRIBUI os valores às variáveis globais declaradas fora do try
    db = firebase.firestore();
    statsDocRef = db.collection("statistics").doc("globalStats");

    console.log("Firebase inicializado com sucesso e variáveis db/statsDocRef definidas.");

} catch (error) {
    console.error("Erro CRÍTICO ao inicializar o Firebase:", error);
    alert("ERRO GRAVE: Não foi possível conectar ao Firebase. Verifique as credenciais, a conexão e o console (F12).");
    // Impede a continuação se o Firebase não inicializar
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
    // Adicione outros tipos se necessário
};
console.log("Gabaritos carregados.");

// --- ELEMENTOS DO DOM (HTML) ---
// É crucial que os IDs no HTML correspondam exatamente aos usados aqui.
let domElementsOk = true; // Flag para verificar se todos os elementos essenciais foram encontrados

try {
    // Elementos do Formulário e Resultado Individual (usando 'const')
    const tipoProvaSelect = document.getElementById('provaTipo');
    const formRespostas = document.getElementById('formRespostas');
    const submitBtn = document.getElementById('submitBtn');
    const resultadoDiv = document.getElementById('resultado');
    const scoreP = document.getElementById('score');
    const mensagemP = document.getElementById('mensagem');
    const imagemResultadoImg = document.getElementById('imagemResultado');
    const gabaritoCorretoDiv = document.getElementById('gabaritoCorreto');
    const gabaritoTextoPre = document.getElementById('gabaritoTexto');

    // Verifica se elementos essenciais do formulário/resultado existem
    if (!tipoProvaSelect || !formRespostas || !submitBtn || !resultadoDiv || !scoreP || !mensagemP || !imagemResultadoImg || !gabaritoCorretoDiv || !gabaritoTextoPre) {
        console.error("ERRO: Um ou mais elementos essenciais do formulário/resultado não foram encontrados! Verifique os IDs no HTML.");
        domElementsOk = false;
    }

    // Elementos das Estatísticas Gerais (atribuindo às variáveis 'let' globais)
    estatisticasDiv = document.getElementById('estatisticasGerais');
    totalPessoasSpan = document.getElementById('totalPessoas');
    graficoCanvasElement = document.getElementById('graficoAcertos'); // Pega o elemento <canvas>

    // Verifica se elementos de estatísticas existem
    if (!estatisticasDiv || !totalPessoasSpan || !graficoCanvasElement) {
        console.warn("Aviso: Um ou mais elementos HTML para estatísticas não foram encontrados. A seção de estatísticas pode não funcionar.");
        // Não definimos domElementsOk como false aqui, talvez estatísticas sejam opcionais
    } else {
        // Tenta pegar o contexto SOMENTE se o canvas foi encontrado
        try {
            graficoContext = graficoCanvasElement.getContext('2d'); // Pega o contexto 2D
            if (!graficoContext) {
                 console.error("ERRO: Falha ao obter o contexto 2D do canvas. O gráfico não funcionará.");
                 domElementsOk = false; // Se o contexto falhar, consideramos um erro crítico para o gráfico
            }
        } catch (canvasError) {
            console.error("Erro ao obter contexto 2D do canvas:", canvasError);
            domElementsOk = false;
        }
    }

    if (domElementsOk) {
        console.log("Referências DOM obtidas com sucesso.");
    } else {
         alert("ERRO GRAVE: Falha ao carregar elementos essenciais da página. Verifique o console (F12) e os IDs no HTML.");
         throw new Error("Falha ao obter elementos DOM essenciais."); // Para o script se algo crítico faltar
    }

} catch (error) {
    // Captura erros inesperados durante a busca de elementos
    console.error("Erro inesperado ao obter referências DOM:", error);
    alert("ERRO GRAVE: Falha inesperada ao preparar a página. Verifique o console (F12).");
    throw new Error("Falha inesperada na obtenção de elementos DOM.");
}


// --- FUNÇÃO PRINCIPAL DE CONFERÊNCIA ---
function conferirRespostas() {
    // Verifica se o botão que chamou a função existe (redundante, mas seguro)
    if (!submitBtn) {
        console.error("Botão de submissão não encontrado ao tentar conferir.");
        return;
    }
    console.log("Iniciando conferência de respostas...");

    // 1. Obter tipo de prova e gabarito oficial
    const tipoSelecionado = tipoProvaSelect.value;
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
            return; // Para a execução
        }
        const valor = input.value.trim().toUpperCase();
        // Verifica se não está vazio E se é A, B, C, D ou E
        if (!valor || !/^[A-E]$/.test(valor)) {
           input.style.borderColor = 'red';
           todasPreenchidas = false;
           // Não adiciona valor inválido ao array
        } else {
           input.style.borderColor = '#ccc';
           respostasUsuario.push(valor); // Adiciona apenas se válido
        }
    }

    // Verifica se exatamente 60 respostas válidas foram coletadas
    if (!todasPreenchidas || respostasUsuario.length !== 60) {
        alert('Por favor, preencha todas as 60 questões com uma letra válida de A a E.');
        // Esconde resultados anteriores se houver erro de preenchimento
        if(resultadoDiv) resultadoDiv.classList.add('hidden');
        if(gabaritoCorretoDiv) gabaritoCorretoDiv.classList.add('hidden');
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
    if (scoreP) scoreP.textContent = `Você acertou ${acertos} de 60 questões.`;
    if (mensagemP) mensagemP.textContent = mensagem;
    if (imagemResultadoImg) {
         imagemResultadoImg.src = imagemSrc;
         imagemResultadoImg.alt = `Resultado: ${acertos} acertos`;
    }
    if (resultadoDiv) resultadoDiv.classList.remove('hidden');

    // Exibir Gabarito Correto
    if (gabaritoTextoPre && gabaritoCorretoDiv) {
        let gabaritoFormatado = `Gabarito Oficial - ${tipoSelecionado.toUpperCase()}:\n\n`;
        for(let i = 0; i < gabaritoOficial.length; i++) {
            gabaritoFormatado += `${String(i + 1).padStart(2, '0')}: ${gabaritoOficial[i]}   `;
            if ((i + 1) % 10 === 0) { gabaritoFormatado += '\n'; }
        }
        gabaritoTextoPre.textContent = gabaritoFormatado;
        gabaritoCorretoDiv.classList.remove('hidden');
    }

    // 6. ATUALIZAR ESTATÍSTICAS GLOBAIS NO FIRESTORE
    try {
        // Verifica se a referência ao doc do Firestore existe
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
    if(resultadoDiv) resultadoDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    console.log("Fim da conferência de respostas.");
} // --- FIM da função conferirRespostas ---


// --- FUNÇÃO PARA ATUALIZAR GRÁFICO E CONTAGEM ---
function atualizarGraficoEstatisticas(data) {
    // Verifica se os elementos/contexto necessários (globais) existem
    // Se algum destes faltar, a função não pode continuar.
    if (!totalPessoasSpan || !graficoContext || !estatisticasDiv) {
        console.error("Elementos HTML/Contexto essenciais para estatísticas não estão definidos. Não é possível atualizar o gráfico.");
        return;
    }

    console.log("Atualizando gráfico com dados:", data);

    // Trata o caso de não haver dados válidos recebidos do Firestore
    if (!data || data.totalSubmissions === undefined || data.totalSubmissions === null) {
         totalPessoasSpan.textContent = "0"; // Mostra 0 no contador
         if (graficoAcertosInstance) {
             graficoAcertosInstance.destroy(); // Destroi gráfico antigo se existir
             graficoAcertosInstance = null;
         }
         estatisticasDiv.classList.add('hidden'); // Esconde a seção de estatísticas
         console.log("Sem dados de estatísticas válidos para exibir.");
         return;
    }

    // Processa os dados recebidos
    const totalSubmissions = data.totalSubmissions || 0; // Garante que é um número
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
         estatisticasDiv.classList.remove('hidden'); // Mostra a seção

        // Prepara dados para o Chart.js
        const labels = Object.keys(ranges);
        const values = Object.values(ranges);

        // Destrói o gráfico anterior se ele já existir (para evitar sobreposição)
        if (graficoAcertosInstance) {
            graficoAcertosInstance.destroy();
        }

        // Cria um novo gráfico Chart.js
        try {
            graficoAcertosInstance = new Chart(graficoContext, { // Usa a variável global graficoContext
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
        // Se totalSubmissions for 0, garante que a seção está escondida e não há gráfico
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

    // Verifica se a referência ao documento do Firestore foi definida na inicialização
    if (!statsDocRef) {
        console.error("Não é possível configurar o listener: statsDocRef não está definido.");
        alert("Erro grave: Falha ao conectar ao banco de dados de estatísticas.");
        return; // Não continua se a referência não existir
    }

    // Configura o listener que reage a mudanças no documento
    statsDocRef.onSnapshot((doc) => {
        // Chamado quando os dados são lidos/atualizados com sucesso
        if (doc.exists) {
            console.log("Dados das estatísticas recebidos/atualizados:", doc.data());
            atualizarGraficoEstatisticas(doc.data()); // Chama a função para redesenhar o gráfico
        } else {
            // Se o documento 'globalStats' for deletado no Firebase
            console.warn("Documento de estatísticas ('globalStats') não encontrado no Firestore!");
            atualizarGraficoEstatisticas(null); // Atualiza para mostrar estado vazio/zero
        }
    }, (error) => {
        // Chamado se ocorrer um erro ao ouvir o Firestore
        console.error("Erro no listener do Firestore (onSnapshot): ", error);
        if(totalPessoasSpan) totalPessoasSpan.textContent = "Erro"; // Mostra erro se o span existir
        alert("Falha ao carregar estatísticas em tempo real. Verifique sua conexão ou as permissões do Firebase.");
        // Esconde a seção de estatísticas em caso de erro
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
// Verifica se o botão existe ANTES de adicionar o listener
if (submitBtn) {
    submitBtn.addEventListener('click', conferirRespostas);
    console.log("Listener do botão 'Conferir' adicionado.");
} else {
    console.error("Botão 'submitBtn' não encontrado no HTML. A conferência não funcionará.");
    // Considerar alertar o usuário se o botão for essencial
    // alert("ERRO GRAVE: Botão principal não encontrado!");
}

// 2. Gatilho opcional para permitir submeter com Enter
if (formRespostas) {
    formRespostas.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Impede envio padrão do formulário
            try {
                 const currentInput = event.target;
                 // Verifica se o evento veio de um dos inputs q1-q60
                 if (currentInput && currentInput.id && currentInput.id.startsWith('q')) {
                     const currentId = parseInt(currentInput.id.replace('q',''));
                     if(!isNaN(currentId) && currentId < 60) {
                         const nextInput = document.getElementById(`q${currentId + 1}`);
                         if(nextInput) nextInput.focus(); // Foca no próximo
                     } else if (submitBtn) {
                          submitBtn.click(); // Clica no botão se for o último input
                     }
                 } else if (submitBtn) {
                     // Se pressionar Enter em outro lugar do form, clica no botão
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
        // Detalha o que pode estar faltando
        if (typeof firebase === 'undefined') console.error("--> Objeto 'firebase' global está undefined.");
        if (!db) console.error("--> Variável 'db' (Firestore) não está definida.");
        if (!statsDocRef) console.error("--> Variável 'statsDocRef' (Referência Doc) não está definida.");
        alert("Erro Crítico: Falha na inicialização do sistema de estatísticas após o carregamento da página. Verifique o console (F12).");
    }
});
