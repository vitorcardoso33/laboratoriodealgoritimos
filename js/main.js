/**
 * Laboratório de Algoritmos de Ordenação - Versão Melhorada
 * Autor: José isaac
 */

// --- 1. SELETORES DO DOM ---
const dom = {
    input: document.getElementById('array-input'),
    btnSort: document.getElementById('btn-sort'),
    btnRandom: document.getElementById('btn-random'),
    btnRunTests: document.getElementById('btn-run-tests'),
    algorithm: document.getElementById('algorithm-select'),
    order: document.getElementById('order-select'),
    errorMsg: document.getElementById('error-message'),
    
    // Visuais
    visSection: document.getElementById('visualization-section'),
    visContainer: document.getElementById('visualizer-container'),
    btnPlay: document.getElementById('btn-play'),
    btnPause: document.getElementById('btn-pause'),
    btnNext: document.getElementById('btn-next'),
    btnEnd: document.getElementById('btn-end'),
    
    // Métricas
    metricsSection: document.getElementById('metrics-section'),
    countComps: document.getElementById('count-comparisons'),
    countActions: document.getElementById('count-actions'),
    execLog: document.getElementById('execution-log'),
    
    // Testes
    testPanel: document.getElementById('test-panel'),
    testBody: document.getElementById('test-results-body'),
    testPassed: document.getElementById('test-passed'),
    testFailed: document.getElementById('test-failed')
};

// --- 2. ESTADO DA VISUALIZAÇÃO ---
let visualizer = {
    steps: [],
    currentStepIndex: 0,
    timer: null,
    isPlaying: false,
    speed: 800 // ms por frame
};

// --- 3. VALIDAÇÃO ROBUSTA DE DADOS ---
function parseInput(rawText) {
    const text = rawText.trim();
    if (!text) throw new Error("O campo não pode estar vazio.");
    
    // Rejeita vírgulas consecutivas ou vazias (ex: 3,,2 ou ,3 ou 2,)
    const semEspacos = text.replace(/\s+/g, '');
    if (semEspacos.includes(',,') || semEspacos.startsWith(',') || semEspacos.endsWith(',')) {
        throw new Error("Formato inválido: verifique se há vírgulas repetidas ou sobrando.");
    }

    // Divide por vírgulas ou múltiplos espaços
    const tokens = text.split(/[\s,]+/);
    const arr = [];

    for (let t of tokens) {
        if (t === "") continue; 
        const num = Number(t);
        // isFinite garante que NaN ou Infinity sejam rejeitados
        if (!isFinite(num)) {
            throw new Error(`Entrada inválida: "${t}" não é um número válido.`);
        }
        arr.push(num);
    }

    if (arr.length === 0) throw new Error("Nenhum número válido foi extraído da entrada.");
    return arr;
}

// --- 4. MOTORES DOS ALGORITMOS (GERADORES DE ESTADOS) ---

// Função auxiliar para gerar um "Quadro" da animação
function createStep(array, compIndices, actionIndices, sortedIndices, message, isAction = false) {
    return {
        array: [...array], 
        compIndices: [...compIndices], // Amarelo
        actionIndices: [...actionIndices], // Vermelho (Troca/Deslocamento)
        sortedIndices: [...sortedIndices], // Verde
        message: message,
        isAction: isAction // True se for uma troca ou deslocamento (para métricas)
    };
}

function bubbleSortEngine(inputArray, isAscending) {
    const arr = [...inputArray];
    const steps = [];
    const n = arr.length;
    const sorted = [];
    let swapped;

    steps.push(createStep(arr, [], [], [], "Iniciando Bubble Sort. Estado original."));

    for (let i = 0; i < n - 1; i++) {
        swapped = false;
        for (let j = 0; j < n - i - 1; j++) {
            // Passo 1: Comparação
            steps.push(createStep(arr, [j, j + 1], [], sorted, `Comparando posições ${j} (${arr[j]}) e ${j + 1} (${arr[j + 1]}).`));
            
            const condition = isAscending ? arr[j] > arr[j + 1] : arr[j] < arr[j + 1];
            
            if (condition) {
                // Passo 2: Troca
                const temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
                swapped = true;
                steps.push(createStep(arr, [], [j, j + 1], sorted, `> Troca efetuada: ${arr[j + 1]} ↔ ${arr[j]}.`, true));
            }
        }
        // Elemento final da iteração já está ordenado
        sorted.push(n - i - 1);
        steps.push(createStep(arr, [], [], sorted, `Elemento ${arr[n - i - 1]} posicionado corretamente no final.`));
        
        if (!swapped) {
            steps.push(createStep(arr, [], [], sorted, "Nenhuma troca nesta passagem. Vetor já está ordenado."));
            break;
        }
    }
    
    // Marca todos como ordenados no final
    for(let i = 0; i < n; i++) if(!sorted.includes(i)) sorted.push(i);
    steps.push(createStep(arr, [], [], sorted, "Ordenação Bubble Sort concluída!"));
    
    return { finalArray: arr, steps: steps };
}

function insertionSortEngine(inputArray, isAscending) {
    const arr = [...inputArray];
    const steps = [];
    const n = arr.length;
    const sorted = [0]; // O primeiro elemento assume-se ordenado virtualmente

    steps.push(createStep(arr, [], [], [], "Iniciando Insertion Sort. Estado original."));

    for (let i = 1; i < n; i++) {
        let current = arr[i];
        let j = i - 1;
        
        steps.push(createStep(arr, [i], [], sorted, `Avaliando chave atual: ${current}.`));

        const condition = isAscending ? (val, curr) => val > curr : (val, curr) => val < curr;
        
        while (j >= 0) {
            steps.push(createStep(arr, [j, j + 1], [], sorted, `Comparando chave (${current}) com ${arr[j]}.`));
            
            if (condition(arr[j], current)) {
                // Deslocamento
                arr[j + 1] = arr[j];
                steps.push(createStep(arr, [], [j, j + 1], sorted, `> Deslocando ${arr[j]} para a direita.`, true));
                j--;
            } else {
                break;
            }
        }
        
        if (j + 1 !== i) {
            arr[j + 1] = current;
            steps.push(createStep(arr, [], [j + 1], sorted, `> Inserindo chave (${current}) na posição ${j + 1}.`, true));
        } else {
             steps.push(createStep(arr, [], [], sorted, `Chave ${current} já está na posição correta.`));
        }
        sorted.push(i);
    }
    
    steps.push(createStep(arr, [], [], sorted, "Ordenação Insertion Sort concluída!"));
    return { finalArray: arr, steps: steps };
}

// --- 5. LÓGICA DE INTERFACE E REPRODUÇÃO ---

function renderStep(step) {
    // 1. Limpa contêiner de blocos
    dom.visContainer.innerHTML = '';
    
    // 2. Renderiza blocos seguramente via createElement
    step.array.forEach((num, index) => {
        const div = document.createElement('div');
        div.className = 'array-block';
        div.textContent = num;
        
        if (step.actionIndices.includes(index)) {
            div.classList.add('action');
        } else if (step.compIndices.includes(index)) {
            div.classList.add('compare');
        } else if (step.sortedIndices.includes(index)) {
            div.classList.add('sorted');
        }
        dom.visContainer.appendChild(div);
    });

    // 3. Adiciona Log de forma segura
    const p = document.createElement('p');
    if (step.isAction) {
        const span = document.createElement('span');
        span.className = 'highlight';
        span.textContent = step.message;
        p.appendChild(span);
    } else {
        p.textContent = step.message;
    }
    
    dom.execLog.appendChild(p);
    dom.execLog.scrollTop = dom.execLog.scrollHeight; // Auto-scroll
}

function updateMetricsUI() {
    let comps = 0;
    let actions = 0;
    
    // Contabiliza até o passo atual
    for (let i = 0; i <= visualizer.currentStepIndex; i++) {
        const s = visualizer.steps[i];
        if (s.compIndices.length > 0) comps++;
        if (s.isAction) actions++;
    }
    
    dom.countComps.textContent = comps;
    dom.countActions.textContent = actions;
}

function processNextStep() {
    if (visualizer.currentStepIndex < visualizer.steps.length - 1) {
        visualizer.currentStepIndex++;
        renderStep(visualizer.steps[visualizer.currentStepIndex]);
        updateMetricsUI();
    } else {
        pauseVisualization();
    }
}

function playVisualization() {
    if (visualizer.currentStepIndex >= visualizer.steps.length - 1) return;
    visualizer.isPlaying = true;
    dom.btnPlay.classList.add('hidden');
    dom.btnPause.classList.remove('hidden');
    visualizer.timer = setInterval(processNextStep, visualizer.speed);
}

function pauseVisualization() {
    visualizer.isPlaying = false;
    clearInterval(visualizer.timer);
    dom.btnPlay.classList.remove('hidden');
    dom.btnPause.classList.add('hidden');
}

function prepareVisualization(array, algo, order) {
    pauseVisualization();
    
    const isAscending = order === 'asc';
    const process = algo === 'bubble' ? bubbleSortEngine(array, isAscending) : insertionSortEngine(array, isAscending);
    
    visualizer.steps = process.steps;
    visualizer.currentStepIndex = 0;
    
    // UI Reset
    dom.execLog.innerHTML = '';
    dom.visSection.classList.remove('hidden');
    dom.metricsSection.classList.remove('hidden');
    dom.testPanel.classList.add('hidden'); // Esconde painel de testes se estiver aberto
    
    renderStep(visualizer.steps[0]);
    updateMetricsUI();
}

function showError(msg) {
    dom.errorMsg.textContent = msg;
    dom.errorMsg.classList.remove('hidden');
    dom.input.classList.add('error-border');
}

function clearError() {
    dom.errorMsg.textContent = '';
    dom.errorMsg.classList.add('hidden');
    dom.input.classList.remove('error-border');
}

// --- 6. TESTES AUTOMATIZADOS ROBUSTOS ---

function runAutomatedTests() {
    dom.testBody.innerHTML = '';
    let passCount = 0;
    let failCount = 0;
    
    const scenarios = [
        { name: "Comum", input: [5,2,8,1] },
        { name: "Repetidos", input: [4,2,4,1] },
        { name: "Negativos", input: [3,-5,0,-1] },
        { name: "Zero e Neg. Repetidos", input: [0, -2, 0, -2, 1] },
        { name: "Um Elemento", input: [7] },
        { name: "Já Ordenado", input: [1, 2, 3, 4] },
        { name: "Ordem Inversa", input: [9, 7, 5, 3] },
        { name: "Todos Iguais", input: [2, 2, 2, 2] },
        { name: "Decimais", input: [3.5, 1.2, 4.8, 1.2] }
    ];

    const algorithms = ['bubble', 'insertion'];
    const directions = ['asc', 'desc'];

    scenarios.forEach(scenario => {
        algorithms.forEach(algo => {
            directions.forEach(dir => {
                const isAsc = dir === 'asc';
                // Clone profundo para não alterar entrada no meio do loop
                const inputCopy = [...scenario.input]; 
                
                // Referência usando sort() nativo
                const expected = [...inputCopy].sort((a, b) => isAsc ? a - b : b - a);
                
                // Executa algoritmo manual
                let result;
                try {
                    if (algo === 'bubble') result = bubbleSortEngine(inputCopy, isAsc).finalArray;
                    else result = insertionSortEngine(inputCopy, isAsc).finalArray;
                    
                    // Verifica mutação indesejada da variável original do teste
                    const mutated = JSON.stringify(inputCopy) !== JSON.stringify(scenario.input);
                    
                    const passed = !mutated && JSON.stringify(result) === JSON.stringify(expected);
                    if(passed) passCount++; else failCount++;
                    
                    appendTestResult(scenario.name, algo, dir, expected.join(', '), result.join(', '), passed ? "PASSOU" : mutated ? "FALHOU (Mutação)" : "FALHOU");
                } catch(e) {
                    failCount++;
                    appendTestResult(scenario.name, algo, dir, expected.join(', '), "ERRO DE EXECUÇÃO", "FALHOU");
                }
            });
        });
    });
    
    // Testes de Validação (Entradas Inválidas e Vazias)
    runValidationTest("Entrada Vazia", "", failCount, passCount);
    runValidationTest("Texto misturado", "3,abc,2", failCount, passCount);
    runValidationTest("Vírgulas consecutivas", "1,,2", failCount, passCount);
    
    dom.testPassed.textContent = `Aprovados: ${passCount}`;
    dom.testFailed.textContent = `Reprovados: ${failCount}`;
    dom.testPanel.classList.remove('hidden');
    dom.visSection.classList.add('hidden');
    dom.metricsSection.classList.add('hidden');
}

function runValidationTest(name, inputStr, failRef, passRef) {
    let passed = false;
    try {
        parseInput(inputStr);
    } catch(e) {
        passed = true; // Esperamos que lance erro!
    }
    // Como não posso alterar vars por referência nativamente, atualizo no DOM e contagem externa
    appendTestResult(name, "Parser", "-", "Lançar Erro", passed ? "Erro Capturado" : "Passou Indevidamente", passed ? "PASSOU" : "FALHOU");
}

function appendTestResult(scenario, algo, dir, expected, got, status) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${scenario}</td>
        <td>${algo}</td>
        <td>${dir.toUpperCase()}</td>
        <td>${expected}</td>
        <td>${got}</td>
        <td class="${status === 'PASSOU' ? 'status-pass' : 'status-fail'}">${status}</td>
    `;
    dom.testBody.appendChild(tr);
}

// --- 7. LISTENERS DE EVENTOS ---

dom.btnSort.addEventListener('click', () => {
    clearError();
    try {
        const arr = parseInput(dom.input.value);
        prepareVisualization(arr, dom.algorithm.value, dom.order.value);
    } catch (err) {
        showError(err.message);
    }
});

dom.btnRandom.addEventListener('click', () => {
    const randomArr = Array.from({length: 8}, () => Math.floor(Math.random() * 40) - 10);
    dom.input.value = randomArr.join(', ');
    clearError();
});

dom.btnRunTests.addEventListener('click', () => {
    clearError();
    pauseVisualization();
    runAutomatedTests();
});

dom.btnPlay.addEventListener('click', playVisualization);
dom.btnPause.addEventListener('click', pauseVisualization);
dom.btnNext.addEventListener('click', () => {
    pauseVisualization();
    processNextStep();
});
dom.btnEnd.addEventListener('click', () => {
    pauseVisualization();
    while (visualizer.currentStepIndex < visualizer.steps.length - 1) {
        visualizer.currentStepIndex++;
    }
    renderStep(visualizer.steps[visualizer.currentStepIndex]);
    updateMetricsUI();
});