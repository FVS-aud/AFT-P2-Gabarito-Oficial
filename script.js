    // ========================================================================
    // ARQUIVO: script.js - Conferência com Inscrição e Estatísticas Firebase
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
    let statsDocRef; // Referência para /statistics/globalStats
    // DOM - Formulário e Resultado
    let inscricaoInput; // Input da inscrição
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
        console.log("Firebase inicializado com sucesso.");
    } catch (error) {
        console.error("Erro CRÍTICO ao inicializar o Firebase:", error);
        alert("ERRO GRAVE: Não foi possível conectar ao Firebase.");
        throw new Error("Falha na inicialização do Firebase.");
    }

    // --- GABARITOS ---
const gabaritos = {
    'tipo1': [
        'C', 'E', 'D', 'B', 'A', 'C', 'E', 'A', 'D', 'A', // 1-10
        'E', 'C', 'E', 'C', 'B', 'E', 'C', 'E', 'C', 'C', // 11-20
        'A', 'D', 'B', 'E', 'B', 'A', 'D', 'B', 'D', 'A', // 21-30
        'E', 'B', 'D', 'A', 'C', 'B', 'A', 'D', 'C', 'D', // 31-40
        'E', 'E', 'D', 'D', 'C', 'D', 'E', 'C', 'A', 'E', // 41-50
        'D', 'A', 'D', 'B', 'D', 'E', 'B', 'E', 'D', 'E'  // 51-60
    ],
};
    console.log("Gabaritos carregados.");

    // --- ELEMENTOS DO DOM (HTML) ---
    // Pega as referências aos elementos da página
    function getDomElements() {
        try {
            inscricaoInput = document.getElementById('inscricao');
            tipoProvaSelect = document.getElementById('provaTipo');
            formRespostas = document.getElementById('formRespostas');
            submitBtn = document.getElementById('submitBtn');
            resultadoDiv = document.getElementById('resultado');
            scoreP = document.getElementById('score');
            mensagemP = document.getElementById('mensagem');
            imagemResultadoImg = document.getElementById('imagemResultado');
            gabaritoCorretoDiv = document.getElementById('gabaritoCorreto');
            gabaritoTextoPre = document.getElementById('gabaritoTexto');
            estatisticasDiv = document.getElementById('estatisticasGerais');
            totalPessoasSpan = document.getElementById('totalPessoas');
            graficoCanvasElement = document.getElementById('graficoAcertos');

            // Verifica se elementos essenciais foram encontrados
            if (!inscricaoInput || !tipoProvaSelect || !formRespostas || !submitBtn || !resultadoDiv || !scoreP || !mensagemP || !imagemResultadoImg || !gabaritoCorretoDiv || !gabaritoTextoPre) {
                 throw new Error("Um ou mais elementos essenciais do formulário/resultado não foram encontrados!");
            }
            if (!estatisticasDiv || !totalPessoasSpan || !graficoCanvasElement) {
                 console.warn("Aviso: Elementos para estatísticas não encontrados.");
            } else {
                graficoContext = graficoCanvasElement.getContext('2d');
                if (!graficoContext) {
                    console.error("ERRO: Falha ao obter o contexto 2D do canvas.");
                }
            }
            console.log("Referências DOM obtidas.");
            return true; // Indica sucesso
        } catch (error) {
            console.error("Erro ao obter referências DOM:", error);
            alert("ERRO GRAVE: Falha ao carregar elementos da página. Verifique os IDs no HTML e o console (F12).");
            return false; // Indica falha
        }
    }


// --- FUNÇÃO DE VALIDAÇÃO DA INSCRIÇÃO (ATUALIZADA PARA 8 DÍGITOS) ---
function validarInscricao(inscricao) {
    if (!inscricao) {
        return { valido: false, mensagem: "Número de inscrição não pode estar vazio." };
    }
    // Regex: Deve conter exatamente 8 dígitos numéricos.
    const regex = /^\d{8}$/;
    if (!regex.test(inscricao)) {
        // Mensagem de erro mais genérica para 8 dígitos
        return { valido: false, mensagem: "Formato inválido. Use exatamente 8 dígitos numéricos (Ex: 10000###)." };
    }
    // Se chegou aqui, o formato está correto
    return { valido: true, mensagem: "Inscrição válida." };
}


    // --- FUNÇÃO PRINCIPAL DE CONFERÊNCIA ---
    async function conferirRespostas() {
        console.log("Função conferirRespostas INICIADA.");

        // Garante que os elementos DOM estejam disponíveis
        if (!inscricaoInput || !tipoProvaSelect || !gabaritos || !resultadoDiv || !scoreP || !mensagemP || !imagemResultadoImg || !gabaritoCorretoDiv || !gabaritoTextoPre || !db || !statsDocRef) {
             console.error("Erro dentro de conferirRespostas: Elementos/Refs essenciais estão faltando.");
             alert("Erro interno ao tentar conferir.");
             return;
        }

        // 0. Obter e Validar Número de Inscrição
        const inscricao = inscricaoInput.value.trim();
        const validacao = validarInscricao(inscricao);
        if (!validacao.valido) {
            alert(`Erro na Inscrição: ${validacao.mensagem}`);
            inscricaoInput.style.borderColor = 'red';
            inscricaoInput.focus();
            return; // Para aqui
        }
        inscricaoInput.style.borderColor = '#ccc'; // Reseta borda se válido
        console.log(`Inscrição validada: ${inscricao}`);

        // 1. Obter tipo de prova e gabarito oficial
        const tipoSelecionado = tipoProvaSelect.value;
        const gabaritoOficial = gabaritos[tipoSelecionado];
        if (!gabaritoOficial || gabaritoOficial.length !== 60) {
            alert(`Erro interno com o gabarito da prova tipo ${tipoSelecionado}.`);
            return;
        }

        // 2. Obter respostas do usuário e validar
        const respostasUsuario = [];
        let todasPreenchidas = true;
        for (let i = 1; i <= 60; i++) {
            const input = document.getElementById(`q${i}`);
            const valor = input ? input.value.trim().toUpperCase() : ''; // Pega valor ou string vazia se input não existir
            if (!input || !valor || !/^[A-E]$/.test(valor)) {
               if(input) input.style.borderColor = 'red';
               todasPreenchidas = false;
            } else {
               if(input) input.style.borderColor = '#ccc';
               respostasUsuario.push(valor);
            }
        }
        if (!todasPreenchidas || respostasUsuario.length !== 60) {
            alert('Por favor, preencha todas as 60 questões com uma letra válida de A a E.');
            resultadoDiv.classList.add('hidden');
            gabaritoCorretoDiv.classList.add('hidden');
            return;
        }
        console.log("Respostas do usuário coletadas.");

        // 3. Calcular pontuação
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
        if (acertos < 36) { mensagem = ''; imagemSrc = 'images/A5.png'; }
        else if (acertos <= 39) { mensagem = "Passou raspando hein fi, manéra na cachaça aí"; imagemSrc = 'images/A1.png'; }
        else if (acertos <= 49) { mensagem = "Parabéns! não fez mais do que a sua obrigação"; imagemSrc = 'images/A2.png'; }
        else if (acertos <= 59) { mensagem = "É o bixão mermo hein"; imagemSrc = 'images/A3.png'; }
        else { mensagem = "Deixa de mentira Rapá"; imagemSrc = 'images/A4.png'; }

        // 5. Exibir Resultado Individual na Tela (ANTES de salvar)
        scoreP.textContent = `Você acertou ${acertos} de 60 questões.`;
        mensagemP.textContent = mensagem;
        imagemResultadoImg.src = imagemSrc;
        imagemResultadoImg.alt = `Resultado: ${acertos} acertos`;
        resultadoDiv.classList.remove('hidden');

        let gabaritoFormatado = `Gabarito Oficial - ${tipoSelecionado.toUpperCase()}:\n\n`;
        for(let i = 0; i < gabaritoOficial.length; i++) {
            gabaritoFormatado += `${String(i + 1).padStart(2, '0')}: ${gabaritoOficial[i]}   `;
            if ((i + 1) % 10 === 0) { gabaritoFormatado += '\n'; }
        }
        gabaritoTextoPre.textContent = gabaritoFormatado;
        gabaritoCorretoDiv.classList.remove('hidden');

        // Desabilitar botão para evitar cliques múltiplos
        if(submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processando...';
        }

        // 6. SALVAR NO FIRESTORE (Verificar duplicidade e usar transação)
        const submissionRef = db.collection("submissions").doc(inscricao); // Usa inscrição como ID

        try {
            await db.runTransaction(async (transaction) => {
                console.log(`Verificando inscrição ${inscricao}...`);
                const submissionDoc = await transaction.get(submissionRef);

                if (submissionDoc.exists) {
                    console.log(`Inscrição ${inscricao} já existe.`);
                    throw new Error("duplicado"); // Erro para o catch tratar
                } else {
                    console.log(`Inscrição ${inscricao} nova. Salvando...`);
                    let scoreRangeKey;
                    if (acertos < 36) { scoreRangeKey = 'range_lt_36'; }
                    else if (acertos <= 39) { scoreRangeKey = 'range_36_39'; }
                    else if (acertos <= 49) { scoreRangeKey = 'range_40_49'; }
                    else { scoreRangeKey = 'range_50_60'; }

                    // Cria o registro individual
                    transaction.set(submissionRef, {
                        tipoProva: tipoSelecionado,
                        acertos: acertos,
                        respostas: respostasUsuario,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // Atualiza as estatísticas globais
                    transaction.update(statsDocRef, {
                        totalSubmissions: firebase.firestore.FieldValue.increment(1),
                        [scoreRangeKey]: firebase.firestore.FieldValue.increment(1)
                    });
                    console.log("Submissão e estatísticas salvas.");
                    // Mostra um alerta de sucesso APÓS salvar
                    alert("Respostas enviadas com sucesso!");
                }
            });
        } catch (error) {
            if (error.message === "duplicado") {
                alert(`O número de inscrição ${inscricao} já foi utilizado.`);
            } else {
                console.error("Erro na transação do Firestore: ", error);
                alert("Ocorreu um erro ao salvar suas respostas. Tente novamente.");
            }
        } finally {
            // Reabilitar o botão sempre
            if(submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Conferir Respostas';
            }
        }

        // 7. Opcional: Rolar para o resultado
        resultadoDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        console.log("Fim da conferência de respostas.");
    } // --- FIM da função conferirRespostas ---


    // --- FUNÇÃO PARA ATUALIZAR GRÁFICO E CONTAGEM ---
    function atualizarGraficoEstatisticas(data) {
        if (!totalPessoasSpan || !graficoContext || !estatisticasDiv) {
            console.error("Elementos para estatísticas não definidos.");
            return;
        }
        console.log("Atualizando gráfico com dados:", data);

        if (!data || data.totalSubmissions === undefined || data.totalSubmissions === null) {
             totalPessoasSpan.textContent = "0";
             if (graficoAcertosInstance) { graficoAcertosInstance.destroy(); graficoAcertosInstance = null; }
             estatisticasDiv.classList.add('hidden');
             console.log("Sem dados válidos para exibir.");
             return;
        }

        const totalSubmissions = data.totalSubmissions || 0;
        const ranges = {
            '< 36': data.range_lt_36 || 0, '36-39': data.range_36_39 || 0,
            '40-49': data.range_40_49 || 0, '50-60': data.range_50_60 || 0
        };
        totalPessoasSpan.textContent = totalSubmissions;

        if (totalSubmissions > 0) {
             estatisticasDiv.classList.remove('hidden');
            const labels = Object.keys(ranges);
            const values = Object.values(ranges);
            if (graficoAcertosInstance) { graficoAcertosInstance.destroy(); }
            try {
                graficoAcertosInstance = new Chart(graficoContext, {
                    type: 'pie', data: { labels: labels, datasets: [{ label: '# de Pessoas', data: values,
                    backgroundColor: ['rgba(255, 99, 132, 0.7)', 'rgba(255, 206, 86, 0.7)', 'rgba(75, 192, 192, 0.7)', 'rgba(54, 162, 235, 0.7)'],
                    borderColor: ['rgba(255, 99, 132, 1)', 'rgba(255, 206, 86, 1)', 'rgba(75, 192, 192, 1)', 'rgba(54, 162, 235, 1)'], borderWidth: 1 }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: function(context) { let label = context.label || ''; if (label) { label += ': '; } const value = context.parsed || 0; const sum = context.dataset.data.reduce((a, b) => a + b, 0); const percentage = sum === 0 ? 0 : ((value / sum) * 100); label += `${value} (${percentage.toFixed(1)}%)`; return label; } } }, title: { display: true, text: 'Distribuição de Acertos (%)' } } }
                });
                console.log("Gráfico atualizado.");
            } catch (error) { console.error("Erro ao criar/atualizar gráfico:", error); }
        } else {
             estatisticasDiv.classList.add('hidden');
             if (graficoAcertosInstance) { graficoAcertosInstance.destroy(); graficoAcertosInstance = null; }
             console.log("Total 0. Gráfico não exibido.");
        }
    } // --- FIM da função atualizarGraficoEstatisticas ---


    // --- CONFIGURA O LISTENER EM TEMPO REAL DO FIRESTORE ---
    function setupRealtimeUpdates() {
        console.log("Configurando listener do Firestore...");
        if (!statsDocRef) { console.error("statsDocRef não definido."); return; }
        statsDocRef.onSnapshot((doc) => {
            if (doc.exists) {
                console.log("Dados stats recebidos:", doc.data());
                atualizarGraficoEstatisticas(doc.data());
            } else {
                console.warn("Doc stats não encontrado!");
                atualizarGraficoEstatisticas(null);
            }
        }, (error) => {
            console.error("Erro no listener: ", error);
            if(totalPessoasSpan) totalPessoasSpan.textContent = "Erro";
            alert("Falha ao carregar estatísticas.");
            if(estatisticasDiv) estatisticasDiv.classList.add('hidden');
            if (graficoAcertosInstance) { graficoAcertosInstance.destroy(); graficoAcertosInstance = null; }
        });
        console.log("Listener configurado.");
    } // --- FIM da função setupRealtimeUpdates ---


    // --- EVENT LISTENERS (GATILHOS DE AÇÃO) ---
    function setupEventListeners() {
        if (submitBtn) {
            submitBtn.addEventListener('click', function() {
                console.log("Botão 'Conferir' CLICADO!");
                conferirRespostas().catch(error => { // Chama a função async
                     console.error("Erro não capturado por conferirRespostas:", error);
                     alert("Ocorreu um erro inesperado.");
                     if(submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Conferir Respostas';} // Garante reabilitar
                });
            });
            console.log("Listener do botão 'Conferir' adicionado.");
        } else {
            console.error("Botão 'submitBtn' não encontrado.");
        }

        if (formRespostas) {
            formRespostas.addEventListener('keypress', function(event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    if (event.target && event.target.id && event.target.id.startsWith('q')) {
                        const currentId = parseInt(event.target.id.replace('q',''));
                        if(!isNaN(currentId) && currentId < 60) {
                            const nextInput = document.getElementById(`q${currentId + 1}`);
                            if(nextInput) nextInput.focus();
                        } else if (submitBtn && !submitBtn.disabled) { submitBtn.click(); }
                    } else if (submitBtn && !submitBtn.disabled) { submitBtn.click(); }
                }
            });
            console.log("Listener de 'Enter' adicionado.");
        } else {
            console.warn("Form 'formRespostas' não encontrado.");
        }
    }

    // --- INICIALIZAÇÃO QUANDO A PÁGINA CARREGA ---
    document.addEventListener('DOMContentLoaded', () => {
        console.log("DOMContentLoaded disparado.");
        // 1. Pega os elementos DOM primeiro
        if (getDomElements()) {
            // 2. Se os elementos foram pegos, configura os listeners de eventos
            setupEventListeners();
            // 3. Se Firebase estiver pronto, configura o listener dele
            if (typeof firebase !== 'undefined' && db && statsDocRef) {
                console.log("Firebase pronto. Chamando setupRealtimeUpdates...");
                setupRealtimeUpdates();
            } else {
                console.error("Firebase não pronto no DOMContentLoaded.");
                alert("Erro Crítico: Falha na inicialização do sistema de estatísticas.");
            }
        } else {
             console.error("Falha ao obter elementos DOM. App não pode continuar.");
        }
    });

    console.log("Fim do script.js alcançado.");
    // ========================================================================
    // FIM DO ARQUIVO script.js
    // ========================================================================
    
