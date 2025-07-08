// admin.js - Lógica do Painel de Administração GF Frango Assado

// Importa as funções necessárias do SDK Modular do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
// CORREÇÃO: Usando a importação padrão do Realtime Database para evitar problemas de CORS
import { getDatabase, ref, onValue, push, set, remove, get, update, runTransaction, onChildAdded } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
// Importa o Firebase Storage
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";


// Configuração do Firebase
// ATENÇÃO: Em produção, estas chaves devem ser gerenciadas via variáveis de ambiente
// para segurança. Para este ambiente de demonstração, elas estão aqui.
const firebaseConfig = {
  apiKey: "AIzaSyApKcOo6okadeurYY0tQzV1KTFx0WoVJLA",
  authDomain: "gf-frango-assado.firebaseapp.com",
  databaseURL: "https://gf-frango-assado-default-rtdb.firebaseio.com",
  projectId: "gf-frango-assado",
  storageBucket: "gf-frango-assado.firebasestorage.app",
  messagingSenderId: "651353269015",
  appId: "1:651353269015:web:3fb1488d45daac6aa90d52",
  measurementId: "G-BNX9JNGYSD"
};

// Inicializa o Firebase App e serviços
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app); // Inicializa o Firebase Storage

// ==========================================================
// ELEMENTOS DOM
// ==========================================================
const loadingOverlay = document.getElementById('loadingOverlay');
const mainContent = document.querySelector('.main-content'); // O container principal do admin

// Produtos
const productForm = document.getElementById('productForm');
const productIdInput = document.getElementById('produto-id');
const productNameInput = document.getElementById('produto-nome');
const productDescInput = document.getElementById('produto-desc');
const productPriceInput = document.getElementById('produto-preco');
const productOldPriceInput = document.getElementById('produto-preco-antigo');
const productImgUploadInput = document.getElementById('produto-img-upload'); // NOVO: Input de arquivo
const productImgInput = document.getElementById('produto-img'); // Campo hidden para a URL da imagem
const imagePreview = document.getElementById('image-preview'); // Pré-visualização
const uploadProgress = document.getElementById('upload-progress'); // Barra de progresso
const uploadProgressBar = document.getElementById('upload-progress-bar'); // Barra de progresso interna
const productCategorySelect = document.getElementById('produto-categoria');
const listaProdutosDiv = document.getElementById('lista-produtos');
const resetFormBtn = document.getElementById('reset-form-btn');

// Categorias
const categoryForm = document.getElementById('categoryForm');
const categoryIdInput = document.getElementById('category-id');
const categoryNameInput = document.getElementById('category-name');
const listaCategoriasDiv = document.getElementById('lista-categorias');
const resetCategoryFormBtn = document.getElementById('reset-category-form-btn');

// Horários de Funcionamento
const storeHoursForm = document.getElementById('storeHoursForm');
const weekdayOpenTimeInput = document.getElementById('weekday-open-time');
const weekdayCloseTimeInput = document.getElementById('weekday-close-time');
const fridayOpenTimeInput = document.getElementById('friday-open-time');
const fridayCloseTimeInput = document.getElementById('friday-close-time');
const saturdayOpenTimeInput = document.getElementById('saturday-open-time');
const saturdayCloseTimeInput = document.getElementById('saturday-close-time');
const sundayOpenTimeInput = document.getElementById('sunday-open-time');
const sundayCloseTimeInput = document.getElementById('sunday-close-time');

// Controle Manual de Status
const manualStatusForm = document.getElementById('manualStatusForm');
const manualOpenRadio = document.getElementById('manual-open');
const manualClosedRadio = document.getElementById('manual-closed'); 
const manualOverrideActiveCheckbox = document.getElementById('manual-override-active');

// Pedidos
const pedidosSection = document.getElementById('pedidos-section');
const listaPedidosDiv = document.getElementById('lista-pedidos');
// Novos elementos para busca, filtro e paginação de pedidos
const orderSearchInput = document.getElementById('order-search-input');
const orderStatusFilter = document.getElementById('order-status-filter');
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');
const pageInfoSpan = document.getElementById('page-info');

// Relatórios
const relatoriosSection = document.getElementById('relatorios-section');
const totalSalesDisplay = document.getElementById('total-sales');
const totalOrdersDisplay = document.getElementById('total-orders');
const mostOrderedProductsList = document.getElementById('most-ordered-products');
const filterTodayBtn = document.getElementById('filter-today');
const filterWeekBtn = document.getElementById('filter-week');
const filterMonthBtn = document.getElementById('filter-month');
const filterStartDateInput = document.getElementById('filter-start-date');
const filterEndDateInput = document.getElementById('filter-end-date');
const filterCustomBtn = document.getElementById('filter-custom');
const detailedSalesExtractList = document.getElementById('detailed-sales-extract');


// Clientes Fidelidade
const clientesFidelidadeSection = document.getElementById('clientes-fidelidade-section');
const listaClientesFidelidadeDiv = document.getElementById('lista-clientes-fidelidade');

// Botão de Logout
const logoutBtn = document.getElementById('logoutBtn');

// Variável para controlar se o som já foi tocado para um pedido específico (mantido para lógica de notificação visual)
const notifiedOrders = new Set();

// Variável global para o gráfico
let ordersChartInstance = null; 

// Variável para armazenar todos os pedidos para filtros de relatório (será populada em loadAllOrdersForReports)
let allOrdersForReports = [];

// Variável para armazenar TODOS os pedidos para a seção de Pedidos (para busca/filtro/paginação)
let allOrdersForOrderList = [];
let currentPage = 1;
const itemsPerPage = 5; // Quantidade de pedidos por página

// Elementos do Modal (NOVO)
const ordersModalOverlay = document.getElementById('ordersModalOverlay');
const closeOrdersModalBtn = document.getElementById('closeOrdersModal');
const modalTitle = document.getElementById('modalTitle');
const modalOrdersList = document.getElementById('modalOrdersList');


// ==========================================================
// FUNÇÕES AUXILIARES DE DATA
// ==========================================================

/**
 * Converte uma string de data do Firebase (ex: "DD/MM/YYYY, HH:MM:SS") 
 * para um objeto Date no fuso horário local, normalizado para 00:00:00.
 * @param {string} dateString A string de data do Firebase.
 * @returns {Date | null} O objeto Date normalizado ou null se a string for inválida.
 */
function parseFirebaseDateString(dateString) {
    if (!dateString || typeof dateString !== 'string') {
        return null;
    }

    // Tenta extrair partes: "DD/MM/YYYY" e "HH:MM:SS"
    const parts = dateString.split(', ');
    if (parts.length !== 2) {
        // Se não tiver o formato esperado, tenta o parse padrão do JS
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? null : date;
    }

    const dateParts = parts[0].split('/'); // DD, MM, YYYY
    const timeParts = parts[1].split(':'); // HH, MM, SS

    // Cria um objeto Date no fuso horário local
    // Mês é 0-indexed no JavaScript (janeiro = 0, julho = 6)
    const year = parseInt(dateParts[2]);
    const month = parseInt(dateParts[1]) - 1; // Subtrai 1 para o mês
    const day = parseInt(dateParts[0]);
    const hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);
    const seconds = parseInt(timeParts[2]);

    const date = new Date(year, month, day, hours, minutes, seconds);
    
    // Normaliza para o início do dia para comparação de relatórios
    date.setHours(0, 0, 0, 0); 
    
    return isNaN(date.getTime()) ? null : date;
}


// ==========================================================
// FUNÇÕES DO DASHBOARD 
// ==========================================================
async function loadDashboardData() {
    console.log("Dashboard: Carregando dados...");
    const usersRef = ref(db, 'users');

    onValue(usersRef, (snapshot) => {
        let pendingCount = 0;
        let preparingCount = 0;
        let deliveredCount = 0;
        let cancelledCount = 0;
        let dailySales = 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Zera a hora para comparar apenas a data

        if (snapshot.exists()) {
            snapshot.forEach(userSnapshot => {
                const userOrders = userSnapshot.child('pedidos').val();
                if (userOrders) {
                    for (const orderId in userOrders) {
                        const order = userOrders[orderId];
                        
                        // Usa a nova função auxiliar para parsear a data do pedido
                        const orderDate = parseFirebaseDateString(order.data); 

                        switch (order.status) {
                            case 'Pendente':
                                pendingCount++;
                                break;
                            case 'Preparando':
                                preparingCount++;
                                break;
                            case 'Entregue':
                                deliveredCount++;
                                // Verifica se o pedido foi entregue hoje e se a data é válida
                                if (orderDate && orderDate.toDateString() === today.toDateString()) {
                                    dailySales += Number(order.total || 0);
                                }
                                break;
                            case 'Cancelado':
                                cancelledCount++;
                                break;
                        }
                    }
                }
            });
        }

        // Atualiza os cards do dashboard
        document.getElementById('dashboard-pendente').textContent = pendingCount;
        document.getElementById('dashboard-preparando').textContent = preparingCount;
        document.getElementById('dashboard-entregue').textContent = deliveredCount;
        document.getElementById('dashboard-cancelado').textContent = cancelledCount;
        document.getElementById('dashboard-vendas-dia').textContent = `R$ ${dailySales.toFixed(2).replace('.', ',')}`;

        // Renderiza o gráfico
        // Adiciona um pequeno atraso para garantir que o canvas tenha sido renderizado e dimensionado pelo navegador
        setTimeout(() => {
            renderOrdersChart(pendingCount, preparingCount, deliveredCount, cancelledCount);
        }, 100); // 100ms de atraso

    }, (error) => {
        console.error("Dashboard: Erro ao carregar dados:", error);
        // Garante que os valores sejam 0 em caso de erro
        document.getElementById('dashboard-pendente').textContent = '0';
        document.getElementById('dashboard-preparando').textContent = '0';
        document.getElementById('dashboard-entregue').textContent = '0';
        document.getElementById('dashboard-cancelado').textContent = '0';
        document.getElementById('dashboard-vendas-dia').textContent = 'R$ 0,00';
        setTimeout(() => {
            renderOrdersChart(0, 0, 0, 0); // Renderiza gráfico vazio mesmo com erro
        }, 100);
    });
}

function renderOrdersChart(pending, preparing, delivered, cancelled) {
    const canvas = document.getElementById('orders-chart');
    if (!canvas) {
        console.error("Canvas para o gráfico não encontrado!");
        return;
    }
    const ctx = canvas.getContext('2d');

    // Limpa o canvas antes de desenhar
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Destrói a instância anterior do gráfico se existir
    if (ordersChartInstance) {
        ordersChartInstance.destroy();
    }

    ordersChartInstance = new Chart(ctx, {
        type: 'bar', // Alterado para gráfico de barras
        data: {
            labels: ['Pendente', 'Preparando', 'Entregue', 'Cancelado'],
            datasets: [{
                label: 'Número de Pedidos',
                data: [pending, preparing, delivered, cancelled],
                backgroundColor: [
                    '#ff9800', // Laranja para Pendente
                    '#2196F3', // Azul para Preparando
                    '#4CAF50', // Verde para Entregue
                    '#f44336'  // Vermelho para Cancelado
                ],
                borderColor: [
                    '#181829',
                    '#181829',
                    '#181829',
                    '#181829'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Manter falso para controlar o tamanho com CSS
            plugins: {
                legend: {
                    labels: {
                        color: '#fff' // Cor do texto da legenda
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) { // Para gráfico de barras, use parsed.y
                                label += context.parsed.y;
                            }
                            return label;
                        }
                    }
                }
            },
            scales: { // Configurações de escala para gráfico de barras
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#fff', // Cor dos rótulos do eixo Y
                        precision: 0 // Garante números inteiros
                    },
                    grid: {
                        color: '#3a3a5a' // Cor das linhas de grade do eixo Y
                    }
                },
                x: {
                    ticks: {
                        color: '#fff' // Cor dos rótulos do eixo X
                    },
                    grid: {
                        color: '#3a3a5a' // Cor das linhas de grade do eixo X
                    }
                }
            },
            animation: { // Desativa animações para tentar resolver o "crescimento"
                duration: 0
            }
        }
    });
    console.log("Gráfico de pedidos renderizado (tipo: barras).");
}


// ==========================================================
// LÓGICA DE NAVEGAÇÃO DO ADMIN
// ==========================================================
function showSection(sectionId, filterParams = {}) {
    // Esconde todas as seções
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    // Remove a classe 'active' de todos os links do sidebar
    document.querySelectorAll('.side-link').forEach(link => {
        link.classList.remove('active');
    });

    // Mostra a seção desejada
    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
        activeSection.classList.add('active');
    }

    // Adiciona a classe 'active' ao link do sidebar correspondente
    const activeLink = document.querySelector(`.side-link[data-section="${sectionId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // Ações específicas ao mostrar certas seções
    if (sectionId === 'pedidos-section') {
        // Ao mostrar a seção de pedidos, carregamos todos os pedidos e aplicamos filtros/paginação
        loadAllOrdersForOrderList(); 
    } else if (sectionId === 'relatorios-section') {
        loadReports('today'); // Carrega relatórios do dia por padrão
    } else if (sectionId === 'clientes-fidelidade-section') {
        loadLoyaltyCustomers();
    } else if (sectionId === 'dashboard-section') { 
        loadDashboardData();
    } else if (sectionId === 'produtos-section') { // Ao ir para a seção de produtos
        resetProductForm(); // Limpa o formulário de produtos
    }
}

// Adiciona event listeners aos links do sidebar
document.querySelectorAll('.side-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = e.currentTarget.getAttribute('data-section');
        showSection(sectionId);
    });
});

// ==========================================================
// LÓGICA DE AUTENTICAÇÃO
// ==========================================================
onAuthStateChanged(auth, function(user) {
    if (user) {
        console.log("Usuário logado:", user.email);
        loadingOverlay.style.display = 'none';
        mainContent.style.display = 'block';
        
        loadCategories();
        renderProdutos();
        loadStoreHours();
        loadManualStatus();
        listenForNewOrders(); // Inicia a escuta por novos pedidos
        loadAllOrdersForReports(); // Carrega todos os pedidos para os relatórios
        loadAllOrdersForOrderList(); // Carrega todos os pedidos para a lista de pedidos (para busca/filtro/paginação)

        showSection('dashboard-section'); // Define o dashboard como seção inicial
    } else {
        console.log("Usuário não logado. Redirecionando para login.html");
        window.location.href = 'login.html';
    }
});

// Botão de Logout
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error("Erro ao fazer logout:", error);
        alert("Erro ao fazer logout. Tente novamente.");
    });
});

// ==========================================================
// FUNÇÕES DE CRUD DE PRODUTOS (COM UPLOAD DE IMAGEM)
// ==========================================================

// Variável para armazenar o arquivo de imagem selecionado
let selectedProductImageFile = null;

// Event listener para o input de arquivo
productImgUploadInput.addEventListener('change', (event) => {
    selectedProductImageFile = event.target.files[0];
    if (selectedProductImageFile) {
        // Exibe a pré-visualização da imagem
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(selectedProductImageFile);
    } else {
        imagePreview.src = '#';
        imagePreview.style.display = 'none';
    }
    // Esconde a barra de progresso ao selecionar um novo arquivo
    uploadProgress.style.display = 'none';
    uploadProgressBar.style.width = '0%';
});

productForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = productIdInput.value;
    const productName = productNameInput.value;
    const productDesc = productDescInput.value;
    const productPrice = parseFloat(productPriceInput.value);
    const productOldPrice = productOldPriceInput.value ? parseFloat(productOldPriceInput.value) : null;
    const productCategory = productCategorySelect.value;
    let imgurl = productImgInput.value; // Pega a URL atual (se já existir ou for de edição)

    // Se um novo arquivo foi selecionado, faz o upload
    if (selectedProductImageFile) {
        try {
            // Mostra a barra de progresso
            uploadProgress.style.display = 'block';
            uploadProgressBar.style.width = '0%';

            const fileName = `${Date.now()}_${selectedProductImageFile.name}`;
            const storageReference = storageRef(storage, `product_images/${fileName}`);
            const uploadTask = uploadBytesResumable(storageReference, selectedProductImageFile);

            // Monitora o progresso do upload
            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    uploadProgressBar.style.width = `${progress}%`;
                    console.log('Upload is ' + progress + '% done');
                }, 
                (error) => {
                    console.error("Erro no upload da imagem:", error);
                    alert("Erro ao fazer upload da imagem. Tente novamente.");
                    uploadProgress.style.display = 'none';
                }, 
                async () => {
                    // Upload completo, obtém a URL de download
                    imgurl = await getDownloadURL(uploadTask.snapshot.ref);
                    productImgInput.value = imgurl; // Salva a URL no campo hidden
                    console.log("URL da imagem obtida:", imgurl);
                    uploadProgress.style.display = 'none'; // Esconde a barra ao finalizar

                    // Agora que temos a URL, salvamos o produto
                    await saveProductToDatabase(id, productName, productDesc, productPrice, productOldPrice, productCategory, imgurl);
                }
            );
        } catch (error) {
            console.error("Erro ao iniciar upload:", error);
            alert("Erro ao iniciar o upload da imagem. Tente novamente.");
            uploadProgress.style.display = 'none';
        }
    } else {
        // Se nenhum novo arquivo foi selecionado, salva o produto com a URL existente (ou vazia)
        await saveProductToDatabase(id, productName, productDesc, productPrice, productOldPrice, productCategory, imgurl);
    }
};

// Função auxiliar para salvar o produto no banco de dados
async function saveProductToDatabase(id, nome, desc, preco, precoAntigo, categoria, imgurl) {
    const produto = {
        nome: nome,
        desc: desc,
        preco: preco,
        precoAntigo: precoAntigo,
        categoria: categoria,
        imgurl: imgurl // Usa a URL final (upload ou existente)
    };

    try {
        if (id) {
            await set(ref(db, 'produtos/' + id), produto);
            alert('Produto atualizado com sucesso!');
        } else {
            await push(ref(db, 'produtos'), produto);
            alert('Produto adicionado com sucesso!');
        }
    } catch (err) {
        console.error("Erro ao salvar/cadastrar produto:", err);
        alert('Erro ao salvar/cadastrar!');
    }
    resetProductForm();
}

function renderProdutos() {
    onValue(ref(db, 'produtos'), (snapshot) => {
        listaProdutosDiv.innerHTML = '';
        if (!snapshot.exists()) {
            listaProdutosDiv.innerHTML = '<p style="color:#bbb; text-align: center;">Nenhum produto cadastrado.</p>';
            return;
        }
        snapshot.forEach((childSnapshot) => {
            const key = childSnapshot.key;
            const produto = childSnapshot.val();

            const productItem = document.createElement('div');
            productItem.className = 'product-item';
            productItem.innerHTML = `
                <img src="${produto.imgurl || 'https://placehold.co/80x80/cccccc/333333?text=Sem+Imagem'}" alt="${produto.nome}" onerror="this.onerror=null;this.src='https://placehold.co/80x80/cccccc/333333?text=Sem+Imagem';">
                <div class="product-details">
                    <div class="product-name">${produto.nome}</div>
                    <div class="product-category">Categoria: ${produto.categoria}</div>
                    <div class="product-price">Preço: R$ ${Number(produto.preco).toFixed(2).replace('.', ',')}</div>
                    ${produto.precoAntigo ? `<div class="product-price">De: R$ ${Number(produto.precoAntigo).toFixed(2).replace('.', ',')}</div>` : ''}
                </div>
                <div class="product-actions">
                    <button class="btn-edit" data-id="${key}">Editar</button>
                    <button class="btn-delete" data-id="${key}">Excluir</button>
                </div>
            `;
            listaProdutosDiv.appendChild(productItem);
        });

        document.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = e.target.getAttribute('data-id');
                editProduto(productId);
            });
        });

        document.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = e.target.getAttribute('data-id');
                deleteProduto(productId);
            });
        });
    });
}

// Função editProduto ajustada para carregar a imagem existente
async function editProduto(id) {
    const productRef = ref(db, 'produtos/' + id);
    const snapshot = await get(productRef);
    if (snapshot.exists()) {
        const produto = snapshot.val();
        productIdInput.value = id;
        productNameInput.value = produto.nome;
        productDescInput.value = produto.desc;
        productPriceInput.value = produto.preco;
        productOldPriceInput.value = produto.precoAntigo;
        productCategorySelect.value = produto.categoria;
        productImgInput.value = produto.imgurl || ''; // Carrega a URL existente (se houver)

        // Exibe a pré-visualização da imagem existente
        if (produto.imgurl) {
            imagePreview.src = produto.imgurl;
            imagePreview.style.display = 'block';
        } else {
            imagePreview.src = '#';
            imagePreview.style.display = 'none';
        }
        selectedProductImageFile = null; // Reseta o arquivo selecionado ao editar
        uploadProgress.style.display = 'none'; // Esconde a barra de progresso
        uploadProgressBar.style.width = '0%';

        window.scrollTo({top: document.getElementById('productForm').offsetTop, behavior: 'smooth'});
    } else {
        alert('Produto não encontrado para edição.');
    }
}

async function deleteProduto(id) {
    showCustomConfirm('Deseja realmente excluir este produto?', async () => {
        try {
            // Opcional: Excluir a imagem do Storage se ela existir
            const productRef = ref(db, 'produtos/' + id);
            const snapshot = await get(productRef);
            if (snapshot.exists() && snapshot.val().imgurl) {
                const imageUrl = snapshot.val().imgurl;
                // Extrai o caminho do arquivo do Storage a partir da URL
                // Ex: "https://firebasestorage.googleapis.com/.../product_images%2Fnome_do_arquivo.jpg?..."
                // Precisamos de "product_images/nome_do_arquivo.jpg"
                const decodedUrl = decodeURIComponent(imageUrl);
                const pathStartIndex = decodedUrl.indexOf('/o/product_images%2F') + '/o/'.length;
                const pathEndIndex = decodedUrl.indexOf('?');
                if (pathStartIndex !== -1 && pathEndIndex !== -1) {
                    const imagePath = decodedUrl.substring(pathStartIndex, pathEndIndex);
                    const imageFileName = imagePath.split('%2F')[1]; // Pega o nome do arquivo após %2F
                    console.log("Tentando excluir imagem do Storage:", `product_images/${imageFileName}`);
                    try {
                        const fileRef = storageRef(storage, `product_images/${imageFileName}`);
                        await remove(fileRef); // Use remove do Storage
                        console.log("Imagem excluída do Storage com sucesso.");
                    } catch (storageError) {
                        console.warn("Erro ao excluir imagem do Storage (pode não existir ou permissão):", storageError);
                    }
                }
            }

            await remove(ref(db, 'produtos/' + id));
            alert('Produto excluído com sucesso!');
        } catch (err) {
            console.error("Erro ao excluir produto:", err);
            alert('Erro ao excluir!');
        }
    });
}

function resetProductForm() {
    productIdInput.value = '';
    productNameInput.value = '';
    productDescInput.value = '';
    productPriceInput.value = '';
    productOldPriceInput.value = '';
    productCategorySelect.value = '';
    productImgInput.value = ''; // Limpa o campo hidden da URL
    productImgUploadInput.value = ''; // Limpa o input de arquivo
    imagePreview.src = '#'; // Limpa a pré-visualização
    imagePreview.style.display = 'none'; // Esconde a pré-visualização
    selectedProductImageFile = null; // Reseta o arquivo selecionado
    uploadProgress.style.display = 'none'; // Esconde a barra de progresso
    uploadProgressBar.style.width = '0%';
}

resetFormBtn.addEventListener('click', resetProductForm);


// ==========================================================
// FUNÇÕES DE CONFIGURAÇÃO DE HORÁRIO DE FUNCIONAMENTO PROGRAMADO
// ==========================================================
storeHoursForm.onsubmit = async (e) => {
    e.preventDefault();
    const storeHoursData = {
        weekday: {
            openTime: weekdayOpenTimeInput.value,
            closeTime: weekdayCloseTimeInput.value
        },
        friday: {
            openTime: fridayOpenTimeInput.value,
            closeTime: fridayCloseTimeInput.value
        },
        saturday: {
            openTime: saturdayOpenTimeInput.value,
            closeTime: saturdayCloseTimeInput.value
        },
        sunday: {
            openTime: sundayOpenTimeInput.value,
            closeTime: sundayCloseTimeInput.value
        }
    };

    try {
        await set(ref(db, 'config/storeHours'), storeHoursData);
        alert('Horários de funcionamento programados salvos com sucesso!');
    }
    catch (error) {
        console.error("Erro ao salvar horários de funcionamento programados:", error);
        alert('Erro ao salvar horários de funcionamento programados. Tente novamente.');
    }
};

function loadStoreHours() {
    onValue(ref(db, 'config/storeHours'), (snapshot) => {
        const hours = snapshot.val();
        if (hours) {
            weekdayOpenTimeInput.value = hours.weekday?.openTime || '';
            weekdayCloseTimeInput.value = hours.weekday?.closeTime || '';
            fridayOpenTimeInput.value = hours.friday?.openTime || '';
            fridayCloseTimeInput.value = hours.friday?.closeTime || '';
            saturdayOpenTimeInput.value = hours.saturday?.openTime || '';
            saturdayCloseTimeInput.value = hours.saturday?.closeTime || '';
            sundayOpenTimeInput.value = hours.sunday?.openTime || '';
            sundayCloseTimeInput.value = hours.sunday?.closeTime || '';
        } else {
            weekdayOpenTimeInput.value = '09:00'; weekdayCloseTimeInput.value = '22:00';
            fridayOpenTimeInput.value = '09:00'; fridayCloseTimeInput.value = '14:00';
            saturdayOpenTimeInput.value = '09:00'; saturdayCloseTimeInput.value = '16:00';
            sundayOpenTimeInput.value = '09:00'; sundayCloseTimeInput.value = '14:00';
        }
    }, (error) => {
        console.error("Erro ao carregar horários de funcionamento programados:", error);
    });
}

// ==========================================================
// FUNÇÕES DE CONTROLE MANUAL DE STATUS
// ==========================================================
manualStatusForm.onsubmit = async (e) => {
    e.preventDefault();
    const manualStatusData = {
        active: manualOverrideActiveCheckbox.checked,
        isOpen: manualOpenRadio.checked // Se o rádio "Aberto" estiver marcado, isOpen é true
    };

    try {
        await set(ref(db, 'config/manualStatus'), manualStatusData);
        alert('Status manual salvo com sucesso!');
    } catch (error) {
        console.error("Erro ao salvar status manual:", error);
        alert('Erro ao salvar status manual. Tente novamente.');
    }
};

function loadManualStatus() {
    onValue(ref(db, 'config/manualStatus'), (snapshot) => {
        const manualStatus = snapshot.val();
        if (manualStatus) {
            manualOverrideActiveCheckbox.checked = manualStatus.active || false;
            if (manualStatus.isOpen) {
                manualOpenRadio.checked = true;
                manualClosedRadio.checked = false; // Garante que o outro esteja desmarcado
            } else {
                manualClosedRadio.checked = true;
                manualOpenRadio.checked = false; // Garante que o outro esteja desmarcado
            }
        } else {
            // Se não houver status salvo, define como desativado e aberto por padrão
            manualOverrideActiveCheckbox.checked = false;
            manualOpenRadio.checked = true;
            manualClosedRadio.checked = false;
        }
    }, (error) => {
        console.error("Erro ao carregar status manual:", error);
        // Em caso de erro, define um estado padrão seguro
        manualOverrideActiveCheckbox.checked = false;
        manualOpenRadio.checked = true;
        manualClosedRadio.checked = false;
    });
}

// ==========================================================
// FUNÇÕES DE GERENCIAMENTO DE CATEGORIAS
// ==========================================================
let currentEditingCategoryId = null;

categoryForm.onsubmit = async (e) => {
    e.preventDefault();
    const name = categoryNameInput.value.trim();

    if (!name) {
        alert('O nome da categoria não pode ser vazio.');
        return;
    }

    try {
        if (currentEditingCategoryId) {
            await set(ref(db, 'config/categories/' + currentEditingCategoryId), { name: name });
            alert('Categoria atualizada com sucesso!');
        } else {
            await push(ref(db, 'config/categories'), { name: name });
            alert('Categoria adicionada com sucesso!');
        }
        resetCategoryForm();
    } catch (error) {
        console.error("Erro ao salvar categoria:", error); 
        alert('Erro ao salvar categoria. Tente novamente.');
    }
};

function loadCategories() {
    onValue(ref(db, 'config/categories'), (snapshot) => {
        listaCategoriasDiv.innerHTML = '';
        productCategorySelect.innerHTML = '<option value="">-- Selecione uma Categoria --</option>';

        if (!snapshot.exists()) {
            listaCategoriasDiv.innerHTML = '<p style="color:#bbb; text-align: center;">Nenhuma categoria cadastrada ainda.</p>';
            return;
        }

        snapshot.forEach((childSnapshot) => {
            const key = childSnapshot.key;
            const category = childSnapshot.val();

            const option = document.createElement('option');
            option.value = key;
            option.textContent = category.name;
            productCategorySelect.appendChild(option);

            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.innerHTML = `
                <span>${category.name}</span>
                <div>
                    <button class="btn-edit-category btn-edit" data-id="${key}" data-name="${category.name}">Editar</button>
                    <button class="btn-delete-category btn-delete" data-id="${key}">Excluir</button>
                </div>
            `;
            listaCategoriasDiv.appendChild(categoryItem);
        });

        document.querySelectorAll('.btn-edit-category').forEach(button => {
            button.addEventListener('click', (e) => {
                const categoryId = e.target.getAttribute('data-id');
                const categoryName = e.target.getAttribute('data-name');
                editCategory(categoryId, categoryName);
            });
        });

        document.querySelectorAll('.btn-delete-category').forEach(button => {
            button.addEventListener('click', (e) => {
                const categoryId = e.target.getAttribute('data-id');
                deleteCategory(categoryId);
            });
        });
    });
}

function editCategory(id, name) {
    categoryIdInput.value = id;
    categoryNameInput.value = name;
    currentEditingCategoryId = id;
    window.scrollTo({top: document.getElementById('categoryForm').offsetTop, behavior: 'smooth'});
}

async function deleteCategory(id) {
    showCustomConfirm('Deseja realmente excluir esta categoria? Isso não removerá produtos associados, mas eles ficarão sem categoria.', async () => {
        try {
            await remove(ref(db, 'config/categories/' + id));
            alert('Categoria excluída com sucesso!');
        } catch (error) {
            console.error("Erro ao excluir categoria:", error);
            alert('Erro ao excluir categoria. Tente novamente.');
        }
    });
}

function resetCategoryForm() {
    categoryIdInput.value = '';
    categoryNameInput.value = '';
    currentEditingCategoryId = null;
}

resetCategoryFormBtn.addEventListener('click', resetCategoryForm);

// ==========================================================
// FUNÇÕES DE GERENCIAMENTO DE PEDIDOS (COM BUSCA, FILTRO E PAGINAÇÃO)
// ==========================================================

// Função para carregar TODOS os pedidos do Firebase uma única vez para a lista de pedidos
function loadAllOrdersForOrderList() {
    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
        allOrdersForOrderList = []; // Limpa dados anteriores
        if (snapshot.exists()) {
            snapshot.forEach(userSnapshot => {
                const userId = userSnapshot.key;
                const userOrders = userSnapshot.child('pedidos').val();
                if (userOrders) {
                    for (const orderId in userOrders) {
                        const order = userOrders[orderId];
                        allOrdersForOrderList.push({
                            userId: userId,
                            orderId: orderId,
                            ...order
                        });
                    }
                }
            });
        }
        // Ordena os pedidos do mais recente para o mais antigo
        allOrdersForOrderList.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        console.log("Pedidos: Todos os pedidos carregados para a lista:", allOrdersForOrderList.length);
        // Após carregar, renderiza a primeira página com os filtros atuais
        renderOrdersList(); 
    }, (error) => {
        console.error("Pedidos: Erro ao carregar todos os pedidos para a lista:", error);
        allOrdersForOrderList = []; // Garante que a lista esteja vazia em caso de erro
        renderOrdersList(); // Renderiza uma lista vazia
    });
}

// Função para renderizar a lista de pedidos com base nos filtros e paginação
function renderOrdersList() {
    listaPedidosDiv.innerHTML = '<p style="color:#bbb; text-align: center;">Carregando pedidos...</p>';

    const searchTerm = orderSearchInput.value.toLowerCase();
    const statusFilter = orderStatusFilter.value;

    let filteredAndSearchedOrders = allOrdersForOrderList.filter(order => {
        const matchesSearch = searchTerm === '' || 
                              order.orderId.toLowerCase().includes(searchTerm) || 
                              (order.nomeCliente && order.nomeCliente.toLowerCase().includes(searchTerm));
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredAndSearchedOrders.length / itemsPerPage);
    currentPage = Math.min(Math.max(1, currentPage), totalPages > 0 ? totalPages : 1); // Garante que currentPage é válida

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const ordersToDisplay = filteredAndSearchedOrders.slice(startIndex, endIndex);

    listaPedidosDiv.innerHTML = ''; // Limpa a lista antes de adicionar os novos itens

    if (ordersToDisplay.length === 0) {
        listaPedidosDiv.innerHTML = '<p style="color:#bbb; text-align: center;">Nenhum pedido encontrado com os filtros aplicados.</p>';
        pageInfoSpan.textContent = `Página 0 de ${totalPages}`;
        prevPageBtn.disabled = true;
        nextPageBtn.disabled = true;
        return;
    }

    ordersToDisplay.forEach(order => {
        const orderItem = document.createElement('div');
        orderItem.className = 'order-item';

        const itemsHtml = order.itens ? order.itens.map(item => `<li>${item}</li>`).join('') : '<li>Nenhum item</li>';

        let statusClass = '';
        switch (order.status) {
            case 'Pendente': statusClass = 'status-pendente'; break;
            case 'Preparando': statusClass = 'status-preparando'; break;
            case 'Entregue': statusClass = 'status-entregue'; break;
            case 'Cancelado': statusClass = 'status-cancelado'; break;
            default: statusClass = 'status-pendente';
        }

        orderItem.innerHTML = `
            <h3>Pedido #${order.orderId.substring(0, 8)} (Cliente: ${order.nomeCliente || 'Não informado'})</h3>
            <p><strong>Data:</strong> ${order.data || 'N/A'}</p>
            <p><strong>Total:</strong> R$ ${Number(order.total || 0).toFixed(2).replace('.', ',')}</p>
            <p><strong>Telefone:</strong> ${order.telefoneCliente || 'Não informado'}</p>
            <p><strong>Modo de Entrega:</strong> ${order.modo || 'N/A'}</p>
            ${order.endereco ? `<p><strong>Endereço:</strong> ${order.endereco}</p>` : ''}
            <p><strong>Forma de Pagamento:</strong> ${order.pagamento || 'N/A'}</p>
            <p><strong>Status:</strong> <span class="${statusClass}">${order.status || 'Pendente'}</span></p>
            <p><strong>Itens:</strong></p>
            <ul>${itemsHtml}</ul>
            <div class="order-actions">
                <select class="status-select" data-user-id="${order.userId}" data-order-id="${order.orderId}">
                    <option value="Pendente" ${order.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                    <option value="Preparando" ${order.status === 'Preparando' ? 'selected' : ''}>Preparando</option>
                    <option value="Entregue" ${order.status === 'Entregue' ? 'selected' : ''}>Entregue</option>
                    <option value="Cancelado" ${order.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                </select>
                <button class="btn-delete-order btn-delete" data-user-id="${order.userId}" data-order-id="${order.orderId}">Excluir Pedido</button>
            </div>
        `;
        listaPedidosDiv.appendChild(orderItem);
    });

    // Atualiza controles de paginação
    pageInfoSpan.textContent = `Página ${currentPage} de ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;

    // Adiciona event listeners para os botões de status e exclusão nos pedidos carregados
    listaPedidosDiv.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const userId = e.target.getAttribute('data-user-id');
            const orderId = e.target.getAttribute('data-order-id');
            const newStatus = e.target.value;
            updateOrderStatus(userId, orderId, newStatus);
        });
    });

    listaPedidosDiv.querySelectorAll('.btn-delete-order').forEach(button => {
        button.addEventListener('click', (e) => {
            const userId = e.target.getAttribute('data-user-id');
            const orderId = e.target.getAttribute('data-order-id');
            deleteOrder(userId, orderId);
        });
    });
}

// Event Listeners para busca, filtro e paginação
orderSearchInput.addEventListener('input', () => {
    currentPage = 1; // Reseta para a primeira página ao buscar
    renderOrdersList();
});

orderStatusFilter.addEventListener('change', () => {
    currentPage = 1; // Reseta para a primeira página ao filtrar
    renderOrdersList();
});

prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderOrdersList();
    }
});

nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(allOrdersForOrderList.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderOrdersList();
    }
});

// A função loadOrders original é agora o renderOrdersList, e loadAllOrdersForOrderList
// é a que busca os dados do Firebase.
// A função loadOrders original foi removida/refatorada.
// A função loadOrders(filterStatus = null, targetElement = listaPedidosDiv) não é mais usada diretamente.
// O modal agora chama renderOrdersList com um filtro de status, mas a busca e paginação
// só se aplicam à lista principal de pedidos.
function loadOrders(filterStatus = null, targetElement = listaPedidosDiv) {
    // Esta função é agora um wrapper para a lógica de exibição no modal
    // ou para compatibilidade com chamadas antigas.
    // A lógica principal de carregamento e filtragem da lista de pedidos
    // está em loadAllOrdersForOrderList e renderOrdersList.

    if (targetElement === modalOrdersList) {
        // Lógica específica para o modal, que não usa paginação ou busca global
        targetElement.innerHTML = '<p style="color:#bbb; text-align: center;">Carregando pedidos...</p>';
        let ordersForModal = allOrdersForOrderList.filter(order => {
            return filterStatus === null || order.status === filterStatus;
        });
        
        if (ordersForModal.length === 0) {
            targetElement.innerHTML = '<p style="color:#bbb; text-align: center;">Nenhum pedido encontrado com este filtro.</p>';
            return;
        }

        ordersForModal.forEach(order => {
            const orderItem = document.createElement('div');
            orderItem.className = 'order-item';

            const itemsHtml = order.itens ? order.itens.map(item => `<li>${item}</li>`).join('') : '<li>Nenhum item</li>';

            let statusClass = '';
            switch (order.status) {
                case 'Pendente': statusClass = 'status-pendente'; break;
                case 'Preparando': statusClass = 'status-preparando'; break;
                case 'Entregue': statusClass = 'status-entregue'; break;
                case 'Cancelado': statusClass = 'status-cancelado'; break;
                default: statusClass = 'status-pendente';
            }

            orderItem.innerHTML = `
                <h3>Pedido #${order.orderId.substring(0, 8)} (Cliente: ${order.nomeCliente || 'Não informado'})</h3>
                <p><strong>Data:</strong> ${order.data || 'N/A'}</p>
                <p><strong>Total:</strong> R$ ${Number(order.total || 0).toFixed(2).replace('.', ',')}</p>
                <p><strong>Telefone:</strong> ${order.telefoneCliente || 'Não informado'}</p>
                <p><strong>Modo de Entrega:</strong> ${order.modo || 'N/A'}</p>
                ${order.endereco ? `<p><strong>Endereço:</strong> ${order.endereco}</p>` : ''}
                <p><strong>Forma de Pagamento:</strong> ${order.pagamento || 'N/A'}</p>
                <p><strong>Status:</strong> <span class="${statusClass}">${order.status || 'Pendente'}</span></p>
                <p><strong>Itens:</strong></p>
                <ul>${itemsHtml}</ul>
                <div class="order-actions">
                    <select class="status-select" data-user-id="${order.userId}" data-order-id="${order.orderId}">
                        <option value="Pendente" ${order.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="Preparando" ${order.status === 'Preparando' ? 'selected' : ''}>Preparando</option>
                        <option value="Entregue" ${order.status === 'Entregue' ? 'selected' : ''}>Entregue</option>
                        <option value="Cancelado" ${order.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                    </select>
                    <button class="btn-delete-order btn-delete" data-user-id="${order.userId}" data-order-id="${order.orderId}">Excluir Pedido</button>
                </div>
            `;
            targetElement.appendChild(orderItem);
        });

        // Adiciona event listeners para os botões de status e exclusão nos pedidos carregados
        targetElement.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const userId = e.target.getAttribute('data-user-id');
                const orderId = e.target.getAttribute('data-order-id');
                const newStatus = e.target.value;
                updateOrderStatus(userId, orderId, newStatus);
            });
        });

        targetElement.querySelectorAll('.btn-delete-order').forEach(button => {
            button.addEventListener('click', (e) => {
                const userId = e.target.getAttribute('data-user-id');
                const orderId = e.target.getAttribute('data-order-id');
                deleteOrder(userId, orderId);
            });
        });
    } else {
        // Se não for o modal, assume que é a lista principal e chama renderOrdersList
        renderOrdersList();
    }
}


async function updateOrderStatus(userId, orderId, newStatus) {
    try {
        const orderRef = ref(db, `users/${userId}/pedidos/${orderId}`);
        const orderSnapshot = await get(orderRef);
        const oldOrder = orderSnapshot.val();
        const oldStatus = oldOrder ? oldOrder.status : 'Pendente';

        await update(orderRef, { status: newStatus });
        console.log(`Status do pedido ${orderId.substring(0, 8)} atualizado para: ${newStatus}`);

        const clientProfileRef = ref(db, `users/${userId}/profile`);
        const completedOrdersRef = ref(db, `users/${userId}/profile/completedOrders`);

        const profileSnapshot = await get(clientProfileRef);
        if (!profileSnapshot.exists()) {
            console.log(`Profile node for user ${userId} does not exist. Creating it.`);
            await set(clientProfileRef, { completedOrders: 0 });
        }

        if (newStatus === 'Entregue' && oldStatus !== 'Entregue') {
            console.log(`Incrementing completedOrders for user ${userId}. Old status: ${oldStatus}, New status: ${newStatus}`);
            await runTransaction(completedOrdersRef, (currentCount) => {
                const newCount = (currentCount || 0) + 1;
                console.log(`Transaction: Old count: ${currentCount}, New count: ${newCount}`);
                return newCount;
            });
            alert(`Status do pedido ${orderId.substring(0, 8)} atualizado para: ${newStatus}. Contador de fidelidade incrementado.`);
        } else if (newStatus !== 'Entregue' && oldStatus === 'Entregue') {
            console.log(`Decrementing completedOrders for user ${userId}. Old status: ${oldStatus}, New status: ${newStatus}`);
            await runTransaction(completedOrdersRef, (currentCount) => {
                const newCount = Math.max(0, (currentCount || 0) - 1);
                console.log(`Transaction: Old count: ${currentCount}, New count: ${newCount}`);
                return newCount;
            });
            alert(`Status do pedido ${orderId.substring(0, 8)} atualizado para: ${newStatus}. Contador de fidelidade decrementado.`);
        } else {
            console.log(`Status changed from ${oldStatus} to ${newStatus}. No change in completedOrders count.`);
            alert(`Status do pedido ${orderId.substring(0, 8)} atualizado para: ${newStatus}.`);
        }
        // Após a atualização do status, recarrega a lista de pedidos para refletir a mudança
        // e o dashboard/relatórios caso o status afete as contagens.
        loadAllOrdersForOrderList(); // Recarrega e renderiza a lista principal
        loadDashboardData(); // Atualiza o dashboard
        loadReports(orderStatusFilter.value); // Atualiza os relatórios com o filtro atual
    } catch (error) {
        console.error("Erro ao atualizar status do pedido ou contador de fidelidade:", error);
        alert("Erro ao atualizar status do pedido. Tente novamente.");
    }
}

async function deleteOrder(userId, orderId) {
    showCustomConfirm('Deseja realmente excluir este pedido? Esta ação é irreversível.', async () => {
        try {
            const orderRef = ref(db, `users/${userId}/pedidos/${orderId}`);
            const orderSnapshot = await get(orderRef);
            const orderToDelete = orderSnapshot.val();

            await remove(orderRef);
            console.log(`Pedido ${orderId.substring(0, 8)} excluído.`);

            if (orderToDelete && orderToDelete.status === 'Entregue') {
                const clientProfileRef = ref(db, `users/${userId}/profile`);
                const completedOrdersRef = ref(db, `users/${userId}/profile/completedOrders`);

                const profileSnapshot = await get(clientProfileRef);
                if (!profileSnapshot.exists()) {
                    console.log(`Profile node for user ${userId} does not exist on delete. Creating it with 0 completed orders.`);
                    await set(clientProfileRef, { completedOrders: 0 });
                }

                console.log(`Decrementing completedOrders for user ${userId} due to order deletion.`);
                await runTransaction(completedOrdersRef, (currentCount) => {
                    const newCount = Math.max(0, (currentCount || 0) - 1);
                    console.log(`Transaction (delete): Old count: ${currentCount}, New count: ${newCount}`);
                    return newCount;
                });
                alert('Pedido excluído com sucesso! Contador de fidelidade decrementado.');
            } else {
                alert('Pedido excluído com sucesso!');
            }
            // Após a exclusão, recarrega a lista de pedidos para refletir a mudança
            loadAllOrdersForOrderList(); // Recarrega e renderiza a lista principal
            loadDashboardData(); // Atualiza o dashboard
            loadReports(orderStatusFilter.value); // Atualiza os relatórios com o filtro atual
        } catch (error) {
            console.error("Erro ao excluir pedido ou atualizar contador de fidelidade:", error);
            alert('Erro ao excluir pedido. Tente novamente.');
        }
    });
}

// ==========================================================
// FUNÇÕES DE RELATÓRIOS
// ==========================================================

// Função para carregar TODOS os pedidos uma única vez para uso nos relatórios
function loadAllOrdersForReports() {
    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
        allOrdersForReports = []; // Limpa dados anteriores
        if (snapshot.exists()) {
            snapshot.forEach(userSnapshot => {
                const userId = userSnapshot.key;
                const userOrders = userSnapshot.child('pedidos').val();
                if (userOrders) {
                    for (const orderId in userOrders) {
                        const order = userOrders[orderId];
                        allOrdersForReports.push({
                            userId: userId,
                            orderId: orderId,
                            ...order
                        });
                    }
                }
            });
        }
        console.log("Relatórios: Todos os pedidos carregados para relatórios:", allOrdersForReports.length);
        // Após carregar todos os pedidos, carregue os relatórios iniciais
        loadReports('today'); 
    }, (error) => {
        console.error("Relatórios: Erro ao carregar todos os pedidos para relatórios:", error);
        allOrdersForReports = []; // Garante que a lista esteja vazia em caso de erro
    });
}


function loadReports(filterType = 'today', startDate = null, endDate = null) {
    console.log(`Relatórios: Carregando relatórios para o tipo: ${filterType}, Início: ${startDate}, Fim: ${endDate}`);
    totalSalesDisplay.textContent = 'R$ 0,00';
    totalOrdersDisplay.textContent = '0';
    mostOrderedProductsList.innerHTML = '<p style="color:#bbb; text-align: center;">Carregando dados...</p>';
    detailedSalesExtractList.innerHTML = '<p style="color:#bbb; text-align: center;">Detalhes das vendas aparecerão aqui.</p>';

    // Remove a classe 'active' de todos os botões de filtro e adiciona ao botão ativo
    document.querySelectorAll('.report-filters button').forEach(btn => btn.classList.remove('active'));
    if (filterType === 'today') {
        filterTodayBtn.classList.add('active');
    } else if (filterType === 'week') {
        filterWeekBtn.classList.add('active');
    } else if (filterType === 'month') {
        filterMonthBtn.classList.add('active');
    } else if (filterType === 'custom') {
        filterCustomBtn.classList.add('active');
    }

    let filteredOrders = [];
    const now = new Date();
    // Ajusta 'now' para o início do dia localmente
    now.setHours(0, 0, 0, 0); 

    console.log("Relatórios: Total de pedidos na memória para filtrar:", allOrdersForReports.length);

    allOrdersForReports.forEach(order => {
        // Verifica se order.data existe antes de criar um objeto Date
        if (!order.data) {
            console.warn("Relatórios: Pedido sem data encontrada, ignorando:", order.orderId);
            return;
        }

        // Usa a nova função auxiliar para parsear a data do pedido
        const orderDate = parseFirebaseDateString(order.data); 
        if (!orderDate) {
            console.warn(`Relatórios: Não foi possível parsear a data do pedido ${order.orderId}: "${order.data}", ignorando.`);
            return;
        }
        // orderDate já está normalizada para 00:00:00 pelo parseFirebaseDateString


        let startFilterDate = null;
        let endFilterDate = null;

        if (filterType === 'today') {
            startFilterDate = new Date(now);
            startFilterDate.setHours(0, 0, 0, 0);
            endFilterDate = new Date(now);
            endFilterDate.setHours(23, 59, 59, 999);
        } else if (filterType === 'week') {
            startFilterDate = new Date(now);
            // Ajusta para a segunda-feira da semana atual
            startFilterDate.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1)); 
            startFilterDate.setHours(0, 0, 0, 0);
            
            endFilterDate = new Date(startFilterDate);
            endFilterDate.setDate(startFilterDate.getDate() + 6); // Domingo
            endFilterDate.setHours(23, 59, 59, 999); // Fim do dia
        } else if (filterType === 'month') {
            startFilterDate = new Date(now.getFullYear(), now.getMonth(), 1);
            startFilterDate.setHours(0, 0, 0, 0);
            endFilterDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Último dia do mês
            endFilterDate.setHours(23, 59, 59, 999); // Fim do dia
        } else if (filterType === 'custom' && startDate && endDate) {
            // Reconstruir as datas para evitar problemas de fuso horário
            const partsStart = startDate.split('-');
            startFilterDate = new Date(parseInt(partsStart[0]), parseInt(partsStart[1]) - 1, parseInt(partsStart[2]));
            startFilterDate.setHours(0, 0, 0, 0);

            const partsEnd = endDate.split('-');
            endFilterDate = new Date(parseInt(partsEnd[0]), parseInt(partsEnd[1]) - 1, parseInt(partsEnd[2]));
            endFilterDate.setHours(23, 59, 59, 999); // Fim do dia
        }

        let includeOrder = false;
        if (startFilterDate && endFilterDate) {
            // Comparar usando getTime() para precisão
            if (orderDate.getTime() >= startFilterDate.getTime() && orderDate.getTime() <= endFilterDate.getTime()) {
                includeOrder = true;
            }
        }
        
        // Apenas pedidos "Entregues" são considerados para relatórios de vendas
        if (includeOrder && order.status === 'Entregue') {
            filteredOrders.push(order);
        }
    });

    console.log("Relatórios: Pedidos filtrados para o período (Entregues e dentro da data):", filteredOrders.length);

    let totalSales = 0;
    let totalOrdersCount = 0;
    const productSales = {};
    const salesExtract = [];

    filteredOrders.forEach(order => {
        totalSales += Number(order.total || 0);
        totalOrdersCount++;

        salesExtract.push({
            id: order.orderId.substring(0, 8),
            date: order.data,
            total: Number(order.total).toFixed(2).replace('.', ','),
            customer: order.nomeCliente || 'N/A',
            items: order.itens ? order.itens.join(', ') : 'N/A'
        });

        if (order.itens) {
            order.itens.forEach(itemString => {
                const match = itemString.match(/(\d+)x (.+) - R\$ ([\d,.]+)/);
                if (match) {
                    const quantity = parseInt(match[1]);
                    const productName = match[2].trim();
                    productSales[productName] = (productSales[productName] || 0) + quantity;
                }
            });
        }
    });

    totalSalesDisplay.textContent = `R$ ${totalSales.toFixed(2).replace('.', ',')}`;
    totalOrdersDisplay.textContent = totalOrdersCount;

    const sortedProducts = Object.entries(productSales).sort(([, countA], [, countB]) => countB - countA);

    mostOrderedProductsList.innerHTML = '';
    if (sortedProducts.length === 0) {
        mostOrderedProductsList.innerHTML = '<p style="color:#bbb; text-align: center;">Nenhum produto vendido (ainda).</p>';
    } else {
        const ul = document.createElement('ul');
        ul.className = 'most-ordered-list';
        sortedProducts.slice(0, 10).forEach(([productName, count]) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${productName}</span><span>${count} unidades</span>`;
            ul.appendChild(li);
        });
        mostOrderedProductsList.appendChild(ul);
    }

    // Renderiza o extrato de vendas detalhado
    detailedSalesExtractList.innerHTML = '';
    if (salesExtract.length === 0) {
        detailedSalesExtractList.innerHTML = '<p style="color:#bbb; text-align: center;">Nenhum detalhe de vendas para o período selecionado.</p>';
    } else {
        const ul = document.createElement('ul');
        ul.className = 'report-details-list';
        salesExtract.forEach(sale => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>Pedido #${sale.id}</span>
                <span>Data: ${sale.date}</span>
                <span>Total: R$ ${sale.total}</span>
                <span>Cliente: ${sale.customer}</span>
                <span>Itens: ${sale.items}</span>
            `;
            ul.appendChild(li);
        });
        detailedSalesExtractList.appendChild(ul);
    }
}


// Event Listeners para os botões de filtro de relatório
filterTodayBtn.addEventListener('click', () => loadReports('today'));
filterWeekBtn.addEventListener('click', () => loadReports('week'));
filterMonthBtn.addEventListener('click', () => loadReports('month'));
filterCustomBtn.addEventListener('click', () => {
    const startDate = filterStartDateInput.value;
    const endDate = filterEndDateInput.value;
    if (startDate && endDate) {
        loadReports('custom', startDate, endDate);
    } else {
        alert('Por favor, selecione as datas de início e fim para o filtro personalizado.');
    }
});


// ==========================================================
// FUNÇÕES DE CLIENTES FIDELIDADE
// ==========================================================
function loadLoyaltyCustomers() {
    listaClientesFidelidadeDiv.innerHTML = '<p style="color:#bbb; text-align: center;">Carregando clientes...</p>';
    const usersRef = ref(db, 'users');

    onValue(usersRef, async (snapshot) => {
        listaClientesFidelidadeDiv.innerHTML = '';
        const customers = {}; // { userId: { name, phone, totalOrders, totalSpent } }

        if (!snapshot.exists()) {
            listaClientesFidelidadeDiv.innerHTML = '<p style="color:#bbb; text-align: center;">Nenhum cliente encontrado.</p>';
            return;
        }

        for (const userId in snapshot.val()) {
            const userSnapshot = snapshot.child(userId);
            const userProfile = userSnapshot.child('profile').val();
            
            const completedOrders = userProfile?.completedOrders || 0; 
            
            let totalSpent = 0;
            const userOrders = userSnapshot.child('pedidos').val();
            if (userOrders) {
                for (const orderId in userOrders) {
                    const order = userOrders[orderId];
                    if (order.status === 'Entregue') {
                        totalSpent += Number(order.total || 0);
                    }
                }
            }

            if (completedOrders >= 5) {
                customers[userId] = {
                    name: userProfile?.name || 'Não informado',
                    phone: userProfile?.phone || 'Não informado',
                    totalOrders: completedOrders,
                    totalSpent: totalSpent
                };
            }
        }

        const sortedCustomers = Object.entries(customers).sort(([, a], [, b]) => b.totalOrders - a.totalOrders);

        if (sortedCustomers.length === 0) {
            listaClientesFidelidadeDiv.innerHTML = '<p style="color:#bbb; text-align: center;">Nenhum cliente com 5 ou mais pedidos entregues ainda.</p>';
            return;
        }

        sortedCustomers.forEach(([userId, customer]) => {
            const customerItem = document.createElement('div');
            customerItem.className = 'loyalty-customer-item';
            customerItem.innerHTML = `
                <h3>${customer.name}</h3>
                <p>Telefone: ${customer.phone}</p>
                <p>Pedidos Entregues: ${customer.totalOrders}</p>
                <p>Total Gasto: R$ ${customer.totalSpent.toFixed(2).replace('.', ',')}</p>
                <div class="customer-actions">
                    <button class="btn-send-discount" data-user-id="${userId}" data-customer-phone="${customer.phone}" data-customer-name="${customer.name}">Enviar Desconto</button>
                </div>
            `;
            listaClientesFidelidadeDiv.appendChild(customerItem);
        });

        document.querySelectorAll('.btn-send-discount').forEach(button => {
            button.addEventListener('click', (e) => {
                const userId = e.target.getAttribute('data-user-id');
                const customerPhone = e.target.getAttribute('data-customer-phone');
                const customerName = e.target.getAttribute('data-customer-name');
                sendLoyaltyDiscount(userId, customerPhone, customerName);
            });
        });

    }, (error) => {
        console.error("Erro ao carregar clientes fidelidade:", error);
        listaClientesFidelidadeDiv.innerHTML = '<p style="color:#bbb; text-align: center;">Erro ao carregar clientes fidelidade. Tente novamente.</p>';
    });
}

async function sendLoyaltyDiscount(userId, customerPhone, customerName) {
    showCustomConfirm(`Deseja enviar uma mensagem de desconto para ${customerName} (${customerPhone})?`, () => {
        const message = encodeURIComponent(`🎉 Olá ${customerName}! Parabéns! Você é um cliente fiel do GF Frango Assado! Como agradecimento, você ganhou um desconto especial de 10% na sua próxima compra. Use o cupom FIDELIDADE10 no nosso site!`);
        const whatsappUrl = `https://wa.me/${customerPhone}?text=${message}`;
        window.open(whatsappUrl, '_blank');
        alert('Mensagem de desconto enviada via WhatsApp!');
    });
}

// ==========================================================
// FUNÇÕES DE NOTIFICAÇÃO DE NOVOS PEDIDOS (APENAS VISUAL)
// ==========================================================
let initialLoadComplete = false; // Flag para ignorar pedidos existentes na carga inicial

function listenForNewOrders() {
    const allUsersRef = ref(db, 'users');

    onValue(allUsersRef, (snapshot) => {
        if (!initialLoadComplete) {
            // Na primeira carga, apenas armazena os IDs dos pedidos existentes
            snapshot.forEach(userSnapshot => {
                const userOrders = userSnapshot.child('pedidos').val();
                if (userOrders) {
                    for (const orderId in userOrders) {
                        notifiedOrders.add(`${userSnapshot.key}-${orderId}`);
                    }
                }
            });
            initialLoadComplete = true;
            console.log("Notificações: Carga inicial de pedidos existentes completa. Pronto para novas notificações.");
            return;
        }

        // Após a carga inicial, verifica se há novos pedidos
        snapshot.forEach(userSnapshot => {
            const userId = userSnapshot.key;
            const userOrders = userSnapshot.child('pedidos').val();

            if (userOrders) {
                for (const orderId in userOrders) {
                    const orderUniqueId = `${userId}-${orderId}`;
                    if (!notifiedOrders.has(orderUniqueId)) {
                        // Novo pedido detectado!
                        console.log(`Notificações: Novo pedido detectado: ${orderUniqueId}`);
                        
                        alert(`NOVO PEDIDO RECEBIDO!\n\nCliente: ${userOrders[orderId].nomeCliente || 'Não informado'}\nTotal: R$ ${Number(userOrders[orderId].total).toFixed(2).replace('.', ',')}`);
                        notifiedOrders.add(orderUniqueId); // Adiciona para não notificar novamente
                        
                        // Opcional: Se a seção de pedidos estiver aberta, recarregue-a
                        if (document.getElementById('pedidos-section').classList.contains('active')) {
                            loadAllOrdersForOrderList(); // Atualiza a lista de pedidos com o novo item
                        }
                        // Se o dashboard estiver aberto, recarregue-o
                        if (document.getElementById('dashboard-section').classList.contains('active')) {
                            loadDashboardData();
                        }
                    }
                }
            }
        });
    }, (error) => {
        console.error("Notificações: Erro ao escutar novos pedidos:", error);
    });
}

// ==========================================================
// FUNÇÕES DE MODAL CUSTOMIZADA (Substitui alert/confirm)
// ==========================================================
function showCustomConfirm(message, onConfirm) {
    const modalHtml = `
        <div id="customConfirmModal" style="
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.7); display: flex; justify-content: center;
            align-items: center; z-index: 1001;
        ">
            <div style="
                background: #232338; padding: 25px; border-radius: 10px;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3); text-align: center;
                color: #fff; max-width: 350px; width: 90%;
            ">
                <p style="margin-bottom: 20px; font-size: 1.1em;">${message}</p>
                <button id="confirmYes" style="
                    background: #4CAF50; color: white; padding: 10px 20px;
                    border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;
                ">Sim</button>
                <button id="confirmNo" style="
                    background: #f44336; color: white; padding: 10px 20px;
                    border: none; border-radius: 5px; cursor: pointer;
                ">Não</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('confirmYes').onclick = () => {
        onConfirm();
        document.getElementById('customConfirmModal').remove();
    };
    document.getElementById('confirmNo').onclick = () => {
        document.getElementById('customConfirmModal').remove();
    };
}

// ==========================================================
// LÓGICA DE MODAL DE PEDIDOS FILTRADOS (NOVO)
// ==========================================================
function showOrdersModal(title, statusFilter) {
    modalTitle.textContent = title;
    // A função loadOrders agora é um wrapper para carregar no modal
    loadOrders(statusFilter, modalOrdersList); 
    ordersModalOverlay.classList.add('active'); // Mostra o modal
}

function hideOrdersModal() {
    ordersModalOverlay.classList.remove('active'); // Esconde o modal
    modalOrdersList.innerHTML = ''; // Limpa o conteúdo do modal
}

// Event listeners para os cards do dashboard (agora abrem o modal)
document.querySelectorAll('.dashboard-card[data-status-filter]').forEach(card => {
    card.addEventListener('click', (e) => {
        const status = e.currentTarget.getAttribute('data-status-filter');
        const title = `Pedidos ${status}`;
        showOrdersModal(title, status);
    });
});

// Event listener para fechar o modal
closeOrdersModalBtn.addEventListener('click', hideOrdersModal);

// Fechar o modal ao clicar fora dele
ordersModalOverlay.addEventListener('click', (e) => {
    if (e.target === ordersModalOverlay) {
        hideOrdersModal();
    }
});
