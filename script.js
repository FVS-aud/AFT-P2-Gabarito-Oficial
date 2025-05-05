// ========================================================================
// ARQUIVO: script.js - Conferência de Gabarito com Estatísticas Firebase
// ========================================================================

// --- CONFIGURAÇÃO DO FIREBASE ---
// Objeto com suas credenciais (Verifique se estão corretas!)
const firebaseConfig = {
  apiKey: "AIzaSyCqueuFjV1FeBgdfMtG4PIt9KkvMznAhhg",
  authDomain: "conferencia-gabarito-app-8dbd0.firebaseapp.com",
  projectId: "conferencia-gabarito-app-8dbd0",
  storageBucket: "conferencia-gabarito-app-8dbd0.appspot.com", // Verifique se termina com appspot.com ou firebasestorage.app no seu console
  messagingSenderId: "435528200039",
  appId: "1:435528200039:web:40fd7fb07b23cf1fecc9c2"
};

// --- DECLARAÇÃO DAS VARIÁVEIS GLOBAIS DO FIREBASE ---
// Declaradas aqui FORA do try/catch para serem acessíveis globalmente no script
let db;
let statsDocRef;

// --- INICIALIZAÇÃO DO FIREBASE E FIRESTORE (Estilo v8/Compat CORRIGIDO) ---
try {
    // Inicializa o Firebase (usa o objeto 'firebase' global dos scripts -compat.js)
    firebase.initializeApp(firebaseConfig);

    // ATRIBUI os valores às variáveis declaradas fora do try
    db = firebase.firestore();
    statsDocRef = db.collection("statistics").doc("globalStats");

    console.log("Firebase inicializado com sucesso e variáveis db/statsDocRef definidas.");

} catch (error) {
    console.error("Erro CRÍTICO ao inicializar o Firebase:", error);
    alert("ERRO GRAVE: Não foi possível conectar ao Firebase. Verifique as credenciais, a conexão e o console (F12).");
    // Impede a continuação se o Firebase não inicializar
    throw new Error("Falha na inicialização do Firebase.");
}

// --- VARIÁVEL GLOBAL PARA O GRÁFICO ---
let graficoAcertosInstance = null;

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

try {
    // Tenta pegar os elementos pelo ID
    const estatisticasDiv = document.getElementById('estatisticasGerais');
    const totalPessoasSpan = document.getElementById('totalPessoas');
    const graficoCanvas = document.getElementById('graficoAcertos').getContext('2d'); // << Ponto crítico

    console.log("Referências DOM obtidas com sucesso.");

} catch (error) { // Se QUALQUER linha dentro do 'try' falhar...
    console.error("Erro ao obter referências DOM:", error); // Mostra o erro no console (F12)
    alert("ERRO GRAVE: Elementos HTML necessários não foram encontrados..."); // Alerta o usuário
    // Impede a execução do resto do script se elementos cruciais faltarem
    throw new Error("Elementos DOM faltando."); // << ISSO PARA TUDO!
}

// --- FUNÇÃO PRINCIPAL DE CONFERÊNCIA ---
function conferirRespostas() {
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
        if (!valor || !/^[A-E]$/.test(valor)) {
           input.style.borderColor = 'red';
           todasPreenchidas = false;
        } else {
           input.style.borderColor = '#ccc';
           respostasUsuario.push(valor); // Adiciona apenas se válido
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
        // Compara a resposta do usuário (já validada) com a oficial
        if (respostasUsuario[i] === gabaritoOficial[i]) {
            acertos++;
        }
    }
    console.log(`Total de acertos: ${acertos}`);

    // 4. Determinar mensagem e imagem individual (LÓGICA ORIGINAL)
    let mensagem = '';
    let imagemSrc = '';
    if (acertos < 36) {
        mensagem = ''; // Sem mensagem específica para reprovado
        imagemSrc = 'images/A5.png';
    } else if (acertos <= 39) { // 36-39
        mensagem = "Passou raspando hein fi, manéra na cachaça aí";
        imagemSrc = 'images/A1.png';
    } else if (acertos <= 49) { // 40-49
        mensagem = "Parabéns! não fez mais do que a sua obrigação";
        imagemSrc = 'images/A2.png';
    } else if (acertos <= 59) { // 50-59
        mensagem = "É o bixão mermo hein";
        imagemSrc = 'images/A3.png';
    } else { // 60
        mensagem = "Deixa de mentira Rapá";
        imagemSrc = 'images/A4.png';
    }

    // 5. Exibir Resultado Individual na Tela (LÓGICA ORIGINAL)
    scoreP.textContent = `Você acertou ${acertos} de 60 questões.`;
    mensagemP.textContent = mensagem;
    imagemResultadoImg.src = imagemSrc;
    imagemResultadoImg.alt = `Resultado: ${acertos} acertos`;
    resultadoDiv.classList.remove('hidden'); // Mostra a div de resultado individual

    // Exibir Gabarito Correto (LÓGICA ORIGINAL)
    let gabaritoFormatado = `Gabarito Oficial - ${tipoSelecionado.toUpperCase()}:\n\n`;
    for(let i = 0; i < gabaritoOficial.length; i++) {
        gabaritoFormatado += `${String(i + 1).padStart(2, '0')}: ${gabaritoOficial[i]}   `;
        if ((i + 1) % 10 === 0) { gabaritoFormatado += '\n'; }
    }
    gabaritoTextoPre.textContent = gabaritoFormatado;
    gabaritoCorretoDiv.classList.remove('hidden'); // Mostra a div do gabarito

    // 6. >>> ATUALIZAR ESTATÍSTICAS GLOBAIS NO FIRESTORE (NOVA LÓGICA) <<<
    try {
        if (!statsDocRef) throw new Error("Referência do Firestore (statsDocRef) não está definida.");

        let scoreRangeKey; // Variável para guardar o nome do campo no Firestore
        if (acertos < 36) { scoreRangeKey = 'range_lt_36'; }
        else if (acertos <= 39) { scoreRangeKey = 'range_36_39'; }
        else if (acertos <= 49) { scoreRangeKey = 'range_40_49'; }
        else { scoreRangeKey = 'range_50_60'; } // Inclui 50-60

        // Cria o objeto com os campos a serem incrementados atomicamente
        const updateData = {
            totalSubmissions: firebase.firestore.FieldValue.increment(1),
            [scoreRangeKey]: firebase.firestore.FieldValue.increment(1) // Usa a chave dinâmica
        };

        console.log("Tentando atualizar Firestore com:", updateData);
        // Envia o comando de atualização para o Firestore
        statsDocRef.update(updateData)
            .then(() => {
                console.log("Estatísticas globais no Firestore atualizadas com sucesso!");
                // Não precisamos chamar a atualização do gráfico aqui, pois o listener fará isso.
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
    console.log("Atualizando gráfico com dados:", data);

    // Verifica se os elementos HTML necessários existem
    if (!totalPessoasSpan || !graficoCanvas || !estatisticasDiv) {
        console.error("Elementos HTML para estatísticas não encontrados ao tentar atualizar gráfico.");
        return;
    }

    // Trata o caso de não haver dados (documento não existe ou vazio)
    if (!data || !data.totalSubmissions) {
         totalPessoasSpan.textContent = "0";
         if (graficoAcertosInstance) {
             graficoAcertosInstance.destroy(); // Destroi gráfico antigo
             graficoAcertosInstance = null;
         }
         estatisticasDiv.classList.add('hidden'); // Esconde a seção
         console.log("Sem dados de estatísticas para exibir.");
         return;
    }

    // Processa os dados recebidos
    const totalSubmissions = data.totalSubmissions || 0;
    const ranges = {
        '< 36': data.range_lt_36 || 0,
        '36-39': data.range_36_39 || 0,
        '40-49': data.range_40_49 || 0,
        '50-60': data.range_50_60 || 0 // Inclui 60
    };

    // Atualiza o texto do total
    totalPessoasSpan.textContent = totalSubmissions;

    // Prepara dados para o Chart.js
    const labels = Object.keys(ranges);
    const values = Object.values(ranges);

    // Mostra a seção de estatísticas
    estatisticasDiv.classList.remove('hidden');

    // Destrói o gráfico anterior se ele já existir
    if (graficoAcertosInstance) {
        graficoAcertosInstance.destroy();
    }

    // Cria um novo gráfico Chart.js
    try {
        graficoAcertosInstance = new Chart(graficoCanvas, {
            type: 'pie', // Tipo de gráfico: pizza (setores)
            data: {
                labels: labels, // Nomes das fatias (faixas de acerto)
                datasets: [{
                    label: '# de Pessoas', // Rótulo do conjunto de dados
                    data: values, // Valores (quantidade em cada faixa)
                    backgroundColor: [ // Cores das fatias
                        'rgba(255, 99, 132, 0.7)', // Vermelho
                        'rgba(255, 206, 86, 0.7)', // Amarelo
                        'rgba(75, 192, 192, 0.7)', // Verde/Azulado
                        'rgba(54, 162, 235, 0.7)'  // Azul
                    ],
                    borderColor: [ // Cores das bordas
                        'rgba(255, 99, 132, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(54, 162, 235, 1)'
                    ],
                    borderWidth: 1 // Largura da borda
                }]
            },
            options: {
                responsive: true, // Faz o gráfico se adaptar ao tamanho do container
                maintainAspectRatio: false, // Permite que o gráfico não mantenha proporção fixa
                plugins: {
                    legend: { // Configuração da legenda
                        position: 'top', // Posição (top, bottom, left, right)
                    },
                    tooltip: { // Configuração do popup que aparece ao passar o mouse
                        callbacks: {
                            label: function(context) { // Função para formatar o texto do tooltip
                                let label = context.label || '';
                                if (label) { label += ': '; }
                                const value = context.parsed || 0;
                                // Calcula a porcentagem relativa ao total
                                const sum = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = sum === 0 ? 0 : ((value / sum) * 100);
                                label += `${value} (${percentage.toFixed(1)}%)`; // Mostra valor e %
                                return label;
                            }
                        }
                    },
                    title: { // Configuração do título do gráfico
                         display: true, // Mostra o título
                         text: 'Distribuição de Acertos (%)' // Texto do título
                    }
                }
            }
        });
        console.log("Gráfico atualizado/criado com sucesso.");
    } catch (error) {
        console.error("Erro ao criar/atualizar o gráfico:", error);
        alert("Ocorreu um erro ao tentar exibir o gráfico de estatísticas.");
    }
} // --- FIM da função atualizarGraficoEstatisticas ---

// --- CONFIGURA O LISTENER EM TEMPO REAL DO FIRESTORE ---
function setupRealtimeUpdates() {
    console.log("Configurando listener de atualizações em tempo real do Firestore...");

    // Verifica se a referência ao documento existe
    if (!statsDocRef) {
        console.error("Não é possível configurar o listener: statsDocRef não está definido.");
        alert("Erro grave: Falha ao conectar ao banco de dados de estatísticas.");
        return;
    }

    // statsDocRef.onSnapshot(...) : 'Ouve' mudanças no documento 'statistics/globalStats'
    // A função dentro de onSnapshot será chamada imediatamente com os dados atuais
    // e depois toda vez que os dados nesse documento mudarem no servidor.
    statsDocRef.onSnapshot((doc) => {
        // Chamado quando os dados são lidos/atualizados com sucesso
        if (doc.exists) {
            console.log("Dados das estatísticas recebidos/atualizados:", doc.data());
            atualizarGraficoEstatisticas(doc.data()); // Chama a função para redesenhar o gráfico
        } else {
            // Isso acontece se o documento 'globalStats' for deletado no Firebase
            console.warn("Documento de estatísticas ('globalStats') não encontrado no Firestore!");
            atualizarGraficoEstatisticas(null); // Atualiza o gráfico para mostrar estado vazio/zero
            // Considerar recriar o documento com valores zerados aqui, se desejado:
            // statsDocRef.set({ totalSubmissions: 0, range_lt_36: 0, ... }).catch(err => console.error("Erro ao recriar doc:", err));
        }
    }, (error) => {
        // Chamado se ocorrer um erro ao tentar ouvir o Firestore
        // (Ex: problemas de permissão nas regras, falta de conexão com a internet)
        console.error("Erro no listener do Firestore (onSnapshot): ", error);
        totalPessoasSpan.textContent = "Erro";
        alert("Falha ao carregar estatísticas em tempo real. Verifique sua conexão ou as permissões do Firebase.");
        // Esconde a seção de estatísticas em caso de erro persistente
        estatisticasDiv.classList.add('hidden');
        if (graficoAcertosInstance) {
            graficoAcertosInstance.destroy();
            graficoAcertosInstance = null;
        }
    });
    console.log("Listener do Firestore configurado.");
} // --- FIM da função setupRealtimeUpdates ---

// --- EVENT LISTENERS (GATILHOS DE AÇÃO) ---

// 1. Gatilho para o botão "Conferir Respostas"
if (submitBtn) {
    submitBtn.addEventListener('click', conferirRespostas);
    console.log("Listener do botão 'Conferir' adicionado.");
} else {
    console.error("Botão 'submitBtn' não encontrado. A conferência não funcionará.");
}

// 2. Gatilho opcional para permitir submeter com Enter (se você tinha isso antes)
if (formRespostas) {
    formRespostas.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            // Impede o envio padrão do formulário se ele existir
            event.preventDefault();
            // Tenta focar no próximo input ou clica no botão se for o último
            try {
                 const currentInput = event.target;
                 const currentId = parseInt(currentInput.id.replace('q',''));
                 if(!isNaN(currentId) && currentId < 60) {
                     const nextInput = document.getElementById(`q${currentId + 1}`);
                     if(nextInput) nextInput.focus();
                 } else if (submitBtn) {
                      submitBtn.click(); // Simula o clique no botão
                 }
            } catch (e) { console.warn("Erro na navegação com Enter:", e); }
        }
    });
    console.log("Listener de 'Enter' no formulário adicionado.");
}


// --- INICIALIZAÇÃO QUANDO A PÁGINA CARREGA (COM MAIS LOGS) ---
    document.addEventListener('DOMContentLoaded', () => {
        console.log("Evento DOMContentLoaded disparado.");

        // LOG ADICIONAL: Verificar o estado das variáveis neste momento
        console.log("Verificando variáveis no DOMContentLoaded:");
        console.log("typeof firebase:", typeof firebase); // << O que aparece aqui?
        console.log("typeof db:", typeof db); // << O que aparece aqui?
        console.log("typeof statsDocRef:", typeof statsDocRef); // << O que aparece aqui?

        // A verificação original
        if (typeof firebase !== 'undefined' && typeof db !== 'undefined' && typeof statsDocRef !== 'undefined') {
            console.log("Firebase, db e statsDocRef parecem definidos. Chamando setupRealtimeUpdates...");
            setupRealtimeUpdates();
        } else {
            console.error("Firebase não parece estar inicializado corretamente. Listener não será configurado.");
            if (typeof firebase === 'undefined') console.error("--> Objeto 'firebase' global está undefined.");
            if (typeof db === 'undefined') console.error("--> Variável 'db' (Firestore) está undefined.");
            if (typeof statsDocRef === 'undefined') console.error("--> Variável 'statsDocRef' (Referência Doc) está undefined.");
            alert("Erro Crítico: Falha na inicialização do sistema de estatísticas após o carregamento da página.");
        }
    });

console.log("Fim do script.js alcançado.");
// ========================================================================
// FIM DO ARQUIVO script.js
// ========================================================================
