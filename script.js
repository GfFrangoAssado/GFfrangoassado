// script.js - Lógica do Cliente para o GF Frango Assado

// Importações Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getDatabase, ref, onValue, set, push, update, get } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// Configuração Firebase
const firebaseConfig = {
    apiKey: "AIzaSyApKcOo6okadeurYY0tQzV1KTFx0WoVJLA",
    authDomain: "gf-frango-assado.firebaseapp.com",
    databaseURL: "https://gf-frango-assado-default-rtdb.firebaseio.com",
    projectId: "gf-frango-assado",
    storageBucket: "gf-frango-assado.appspot.com",
    messagingSenderId: "651353269015",
    appId: "1:651353269015:web:3fb1488d45daac6aa90d52",
    measurementId: "G-BNX9JNGYSD"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);


// Referências DOM
const menuInicioLink = document.getElementById('menu-inicio');
const menuPerfilLink = document.getElementById('menu-perfil');
const menuCardapioLink = document.getElementById('menu-cardapio');
const menuPedidosLink = document.getElementById('menu-pedidos');
const profileModalBg = document.getElementById('profile-modal-bg');
const closeProfileModalButton = document.getElementById('close-profile-modal');
const profileForm = document.getElementById('profileForm');
const profileNameInput = document.getElementById('profile-name');
const profileCpfCnpjInput = document.getElementById('profile-cpf-cnpj');
const profileBirthdateInput = document.getElementById('profile-birthdate');
const profilePhoneInput = document.getElementById('profile-phone');
const profileGenderSelect = document.getElementById('profile-gender');
const profileEmailInput = document.getElementById('profile-email');
const profileCepInput = document.getElementById('profile-cep');
const profileAddressInput = document.getElementById('profile-address');
const profileNumberInput = document.getElementById('profile-number');
const profileComplementInput = document.getElementById('profile-complement');
const profileNeighborhoodInput = document.getElementById('profile-neighborhood');
const profileCityInput = document.getElementById('profile-city');
const profileStateInput = document.getElementById('profile-state');
const menuModalBg = document.getElementById('menu-modal-bg');
const closeMenuModalButton = document.getElementById('close-menu-modal');
const categoryFilterNav = document.getElementById('category-filter-nav');
const productListingDiv = document.getElementById('product-listing');
const cartModalBg = document.getElementById('cart-modal-bg');
const closeCartButton = document.getElementById('close-cart');
const cartListaDiv = document.getElementById('cart-lista');
const discountMessageDiv = document.getElementById('discount-message');
const cartTotalDiv = document.getElementById('cart-total');
const clienteNomeInput = document.getElementById('cliente-nome');
const clienteTelefoneInput = document.getElementById('cliente-telefone');
const modoEntregaSelect = document.getElementById('modo-entrega');
const clienteEnderecoInput = document.getElementById('cliente-endereco');
const formaPagamentoSelect = document.getElementById('forma-pagamento');
const whatsappButton = document.getElementById('whatsapp-button');
const btnCarrinho = document.getElementById('btn-carrinho');
const cartCountSpan = document.getElementById('cart-count');
const ordersModalBg = document.getElementById('orders-modal-bg');
const closeOrdersModalButton = document.getElementById('close-orders-modal');
const ordersHistoryListDiv = document.getElementById('orders-history-list');
const storeStatusSpan = document.getElementById('store-status');
const mostSoldProductsList = document.getElementById('most-sold-products-list');


let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentUser = null;
let currentDiscount = 0;

// Função global para fechar popup de cupom
window.fecharPopupCupom = function() {
    const popup = document.getElementById('popup-cupom-bg');
    if (popup) popup.style.display = 'none';
};

// Funções auxiliares
function formatCurrency(value) {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function showMessageModal(message, actions = []) {
    let messageModal = document.getElementById('custom-message-modal-bg');
    if (!messageModal) {
        messageModal = document.createElement('div');
        messageModal.id = 'custom-message-modal-bg';
        messageModal.className = 'modal-bg';
        messageModal.innerHTML = `
            <div class="modal-content" style="max-width: 350px; text-align: center; padding: 25px;">
                <p id="custom-message-text" style="margin-bottom: 20px; font-size: 1.1em; color: #232338;"></p>
                <div id="custom-message-actions" style="display: flex; justify-content: center; gap: 10px;"></div>
            </div>
        `;
        document.body.appendChild(messageModal);
        messageModal.addEventListener('click', (e) => {
            if (e.target === messageModal) hideMessageModal();
        });
    }
    const messageTextElem = document.getElementById('custom-message-text');
    const messageActionsElem = document.getElementById('custom-message-actions');
    messageTextElem.textContent = message;
    messageActionsElem.innerHTML = '';
    if (actions.length > 0) {
        actions.forEach(action => {
            const button = document.createElement('button');
            button.textContent = action.text;
            button.className = 'produto-btn';
            button.style.width = 'auto';
            button.style.padding = '8px 15px';
            button.onclick = () => { action.onClick(); hideMessageModal(); };
            messageActionsElem.appendChild(button);
        });
    } else {
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Fechar';
        closeButton.className = 'produto-btn';
        closeButton.style.width = 'auto';
        closeButton.style.padding = '8px 15px';
        closeButton.onclick = hideMessageModal;
        messageActionsElem.appendChild(closeButton);
    }
    messageModal.style.display = 'flex';
}
function hideMessageModal() {
    const messageModal = document.getElementById('custom-message-modal-bg');
    if (messageModal) messageModal.style.display = 'none';
}

// Navegação entre modais
function showModal(modalBgId) {
    document.querySelectorAll('.modal-bg').forEach(modal => {
        modal.style.display = 'none';
    });
    const modal = document.getElementById(modalBgId);
    if (modal) modal.style.display = 'flex';
}
function hideModal(modalBgId) {
    const modal = document.getElementById(modalBgId);
    if (modal) modal.style.display = 'none';
}

// Menu lateral
if (menuInicioLink) menuInicioLink.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.modal-bg').forEach(modal => modal.style.display = 'none');
    document.querySelectorAll('.side-link').forEach(link => link.classList.remove('active'));
    menuInicioLink.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
});
if (menuPerfilLink) menuPerfilLink.addEventListener('click', async (e) => {
    e.preventDefault();
    if (await ensureUserIsSignedIn()) {
        showModal('profile-modal-bg');
        document.querySelectorAll('.side-link').forEach(link => link.classList.remove('active'));
        menuPerfilLink.classList.add('active');
        loadUserProfile(currentUser.uid);
    }
});
if (menuCardapioLink) menuCardapioLink.addEventListener('click', (e) => {
    e.preventDefault();
    showModal('menu-modal-bg');
    document.querySelectorAll('.side-link').forEach(link => link.classList.remove('active'));
    menuCardapioLink.classList.add('active');
    loadProducts(); // Corrigido: agora carrega o cardápio ao abrir
});
if (menuPedidosLink) menuPedidosLink.addEventListener('click', async (e) => {
    e.preventDefault();
    if (await ensureUserIsSignedIn()) {
        showModal('orders-modal-bg');
        document.querySelectorAll('.side-link').forEach(link => link.classList.remove('active'));
        menuPedidosLink.classList.add('active');
        // loadUserOrders(currentUser.uid);
    }
});
if (closeProfileModalButton) closeProfileModalButton.addEventListener('click', () => hideModal('profile-modal-bg'));
if (closeMenuModalButton) closeMenuModalButton.addEventListener('click', () => hideModal('menu-modal-bg'));
if (closeCartButton) closeCartButton.addEventListener('click', () => hideModal('cart-modal-bg'));
if (closeOrdersModalButton) closeOrdersModalButton.addEventListener('click', () => hideModal('orders-modal-bg'));
if (btnCarrinho) btnCarrinho.addEventListener('click', () => {
    showModal('cart-modal-bg');
    renderCartItems(); // Renderiza os itens do carrinho ao abrir o modal
});

document.querySelectorAll('.modal-bg').forEach(modalBg => {
    modalBg.addEventListener('click', (e) => {
        if (e.target === modalBg) hideModal(modalBg.id);
    });
});

// Função para garantir usuário autenticado
async function ensureUserIsSignedIn() {
    if (!auth.currentUser) {
        try {
            const userCredential = await signInAnonymously(auth);
            currentUser = userCredential.user;
            return true;
        } catch (error) {
            showMessageModal('Não foi possível iniciar a sessão. Tente novamente mais tarde.');
            return false;
        }
    }
    currentUser = auth.currentUser;
    return true;
}

// Função para carregar perfil do usuário
function loadUserProfile(uid) {
    const userProfileRef = ref(database, `users/${uid}/profile`);
    onValue(userProfileRef, (snapshot) => {
        const profile = snapshot.val();
        if (profile) {
            profileNameInput.value = profile.name || '';
            profileCpfCnpjInput.value = profile.cpfCnpj || '';
            profileBirthdateInput.value = profile.birthdate || '';
            profilePhoneInput.value = profile.phone || '';
            profileGenderSelect.value = profile.gender || '';
            profileEmailInput.value = profile.email || '';
            profileCepInput.value = profile.cep || '';
            profileAddressInput.value = profile.address || '';
            profileNumberInput.value = profile.number || '';
            profileComplementInput.value = profile.complement || '';
            profileNeighborhoodInput.value = profile.neighborhood || '';
            profileCityInput.value = profile.city || '';
            profileStateInput.value = profile.state || '';
            if (!clienteNomeInput.value) clienteNomeInput.value = profile.name || '';
            if (!clienteTelefoneInput.value) clienteTelefoneInput.value = profile.phone || '';
            if (!clienteEnderecoInput.value) clienteEnderecoInput.value = profile.address || '';
        } else {
            profileForm.reset();
        }
    }, { onlyOnce: true });
}

// Função para status da loja
function loadStoreStatus() {
    const statusRef = ref(database, 'config/manualStatus');
    onValue(statusRef, (statusSnapshot) => {
        const manualStatus = statusSnapshot.val();
        if (manualStatus && manualStatus.active) {
            if (manualStatus.isOpen) {
                storeStatusSpan.textContent = '🟢 Aberto';
                storeStatusSpan.className = 'status-aberto';
            } else {
                storeStatusSpan.textContent = '🔴 Fechado';
                storeStatusSpan.className = 'status-fechado';
            }
        } else {
            storeStatusSpan.textContent = '🔴 Fechado (Horários não configurados)';
            storeStatusSpan.className = 'status-fechado';
        }
    });
}

// Função para carregar produtos do cardápio
function loadProducts() {
    productListingDiv.innerHTML = '<p>Carregando produtos...</p>';
    const produtosRef = ref(database, 'produtos');
    onValue(produtosRef, (snapshot) => {
        if (!snapshot.exists()) {
            productListingDiv.innerHTML = '<p style="color:#bbb; text-align:center;">Nenhum produto disponível no momento.</p>';
            return;
        }
        let html = '';
        snapshot.forEach(child => {
            const prod = child.val();
            const prodId = child.key;
            html += `<div class=\"produto-item\" style=\"display:flex;align-items:center;margin-bottom:18px;background:#232338;padding:15px;border-radius:10px;box-shadow:0 2px 8px #0002;\">
                <img src=\"${prod.imgurl || 'logo-gf.png'}\" alt=\"${prod.nome}\" style=\"width:70px;height:70px;object-fit:cover;border-radius:8px;margin-right:18px;\">
                <div style=\"flex:1;\">
                    <div style=\"font-weight:bold;font-size:1.1em;color:#ffe66e;\">${prod.nome}</div>
                    <div style=\"color:#bbb;font-size:0.97em;\">${prod.desc || ''}</div>
                    <div style=\"margin-top:6px;font-size:1.1em;color:#fff;\">R$ ${Number(prod.preco).toFixed(2).replace('.', ',')}</div>
                </div>
                <button class=\"produto-btn btn-add-cart\" data-prod-id=\"${prodId}\" style=\"margin-left:18px;padding:10px 18px;font-weight:bold;background:#7d37ff;color:#fff;border:none;border-radius:8px;cursor:pointer;transition:background .1s;\">Adicionar</button>
            </div>`;
        });
        productListingDiv.innerHTML = html;

        // Adiciona event listener para todos os botões de adicionar ao carrinho
        document.querySelectorAll('.btn-add-cart').forEach(btn => {
            btn.addEventListener('click', function() {
                const prodId = this.getAttribute('data-prod-id');
                addProductToCart(prodId);
            });
        });
    });
}

// Função para adicionar produto ao carrinho
function addProductToCart(prodId) {
    // Busca o produto no Firebase
    const prodRef = ref(database, 'produtos/' + prodId);
    onValue(prodRef, (snapshot) => {
        if (!snapshot.exists()) {
            showMessageModal('Produto não encontrado.');
            return;
        }
        const prod = snapshot.val();
        // Verifica se já está no carrinho
        const idx = cart.findIndex(item => item.id === prodId);
        if (idx !== -1) {
            cart[idx].qtd += 1;
        } else {
            cart.push({
                id: prodId,
                nome: prod.nome,
                preco: prod.preco,
                qtd: 1,
                imgurl: prod.imgurl || '',
            });
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
        showMessageModal('Produto adicionado ao carrinho!');
    }, { onlyOnce: true });
}

// Função para atualizar o contador do carrinho
function updateCartUI() {
    cartCountSpan.textContent = cart.reduce((sum, item) => sum + item.qtd, 0);
}

// Função para renderizar o conteúdo do carrinho no modal
function renderCartItems() {
    if (cart.length === 0) {
        cartListaDiv.innerHTML = '<p style="color:#bbb; text-align:center;">Carrinho vazio. Adicione produtos do cardápio!</p>';
        cartTotalDiv.innerHTML = '<div style="text-align:center; font-size:1.2em; color:#fff; font-weight:bold;">Total: R$ 0,00</div>';
        return;
    }

    let html = '';
    let total = 0;
    
    cart.forEach((item, index) => {
        const subtotal = item.preco * item.qtd;
        total += subtotal;
        html += `
            <div class="cart-item" style="display:flex; align-items:center; margin-bottom:15px; padding:10px; background:#232338; border-radius:8px;">
                <img src="${item.imgurl || 'logo-gf.png'}" alt="${item.nome}" style="width:50px; height:50px; object-fit:cover; border-radius:6px; margin-right:12px;">
                <div style="flex:1;">
                    <div style="font-weight:bold; color:#ffe66e;">${item.nome}</div>
                    <div style="color:#bbb; font-size:0.9em;">R$ ${Number(item.preco).toFixed(2).replace('.', ',')} x ${item.qtd}</div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <button class="btn-decrease-qty" data-index="${index}" style="background:#f44336; color:#fff; border:none; border-radius:4px; width:30px; height:30px; cursor:pointer;">-</button>
                    <span style="color:#fff; font-weight:bold;">${item.qtd}</span>
                    <button class="btn-increase-qty" data-index="${index}" style="background:#4CAF50; color:#fff; border:none; border-radius:4px; width:30px; height:30px; cursor:pointer;">+</button>
                    <button class="btn-remove-item" data-index="${index}" style="background:#ff9800; color:#fff; border:none; border-radius:4px; padding:5px 8px; cursor:pointer; margin-left:8px;">🗑️</button>
                </div>
            </div>
        `;
    });

    // Adiciona taxa de delivery se for delivery
    const modoEntrega = modoEntregaSelect ? modoEntregaSelect.value : 'Retirada';
    if (modoEntrega === 'Delivery') {
        total += 7.00;
        html += `<div style="color:#bbb; font-size:0.9em; text-align:center; margin-bottom:10px;">+ Taxa de Delivery: R$ 7,00</div>`;
    }

    cartListaDiv.innerHTML = html;
    cartTotalDiv.innerHTML = `<div style="text-align:center; font-size:1.2em; color:#fff; font-weight:bold;">Total: R$ ${total.toFixed(2).replace('.', ',')}</div>`;

    // Adiciona event listeners para os botões do carrinho
    document.querySelectorAll('.btn-increase-qty').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            cart[index].qtd += 1;
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartUI();
            renderCartItems();
        });
    });

    document.querySelectorAll('.btn-decrease-qty').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            if (cart[index].qtd > 1) {
                cart[index].qtd -= 1;
            } else {
                cart.splice(index, 1);
            }
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartUI();
            renderCartItems();
        });
    });

    document.querySelectorAll('.btn-remove-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            cart.splice(index, 1);
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartUI();
            renderCartItems();
        });
    });
}

// Função para finalizar pedido via WhatsApp
async function finalizarPedido() {
    if (cart.length === 0) {
        showMessageModal('Adicione produtos ao carrinho antes de finalizar o pedido.');
        return;
    }

    const nomeCliente = clienteNomeInput.value.trim() || 'Cliente';
    const telefoneCliente = clienteTelefoneInput.value.trim() || 'Não informado';
    const modoEntrega = modoEntregaSelect.value;
    const enderecoCliente = clienteEnderecoInput.value.trim() || '';
    const formaPagamento = formaPagamentoSelect.value;

    // Validações
    if (modoEntrega === 'Delivery' && !enderecoCliente) {
        showMessageModal('Para delivery, informe o endereço de entrega.');
        return;
    }

    // Garante que o usuário esteja autenticado
    if (!(await ensureUserIsSignedIn())) {
        return;
    }

    // Calcula total
    let total = cart.reduce((sum, item) => sum + (item.preco * item.qtd), 0);
    
    // Adiciona taxa de delivery se necessário
    if (modoEntrega === 'Delivery') {
        total += 7.00;
    }

    // Gera lista de itens para WhatsApp
    let itensTexto = '';
    cart.forEach(item => {
        itensTexto += `${item.qtd}x ${item.nome} - R$ ${(item.preco * item.qtd).toFixed(2).replace('.', ',')}\n`;
    });

    // Gera lista de itens para Firebase
    let itensArray = [];
    cart.forEach(item => {
        itensArray.push(`${item.qtd}x ${item.nome} - R$ ${(item.preco * item.qtd).toFixed(2).replace('.', ',')}`);
    });

    // Salva o pedido no Firebase
    try {
        const pedidoData = {
            nomeCliente: nomeCliente,
            telefoneCliente: telefoneCliente,
            modo: modoEntrega,
            endereco: modoEntrega === 'Delivery' ? enderecoCliente : '',
            pagamento: formaPagamento,
            itens: itensArray,
            total: total,
            status: 'Pendente',
            data: new Date().toLocaleString('pt-BR')
        };

        const userPedidosRef = ref(database, `users/${currentUser.uid}/pedidos`);
        await push(userPedidosRef, pedidoData);
        
        // Garante que o perfil do usuário existe (para o sistema de fidelidade)
        const userProfileRef = ref(database, `users/${currentUser.uid}/profile`);
        const profileSnapshot = await get(userProfileRef);
        
        if (!profileSnapshot.exists()) {
            // Cria perfil básico se não existir
            await set(userProfileRef, {
                name: nomeCliente,
                phone: telefoneCliente,
                completedOrders: 0 // Inicializa contador de fidelidade
            });
            console.log('Perfil básico criado para o usuário');
        } else {
            // Atualiza informações básicas se o perfil já existe
            const existingProfile = profileSnapshot.val();
            await update(userProfileRef, {
                name: nomeCliente || existingProfile.name,
                phone: telefoneCliente || existingProfile.phone,
                completedOrders: existingProfile.completedOrders || 0 // Garante que o contador existe
            });
        }
        
        console.log('Pedido salvo no Firebase com sucesso');
    } catch (error) {
        console.error('Erro ao salvar pedido no Firebase:', error);
        showMessageModal('Erro ao salvar pedido. Tente novamente.');
        return;
    }

    // Monta mensagem do pedido para WhatsApp
    let mensagem = `🍗 *NOVO PEDIDO - GF FRANGO ASSADO* 🍗\n\n`;
    mensagem += `👤 *Cliente:* ${nomeCliente}\n`;
    mensagem += `📞 *Telefone:* ${telefoneCliente}\n`;
    mensagem += `🚚 *Entrega:* ${modoEntrega}\n`;
    
    if (modoEntrega === 'Delivery') {
        mensagem += `📍 *Endereço:* ${enderecoCliente}\n`;
        mensagem += `💰 *Taxa de Delivery:* R$ 7,00\n`;
    }
    
    mensagem += `💳 *Pagamento:* ${formaPagamento}\n\n`;
    mensagem += `📋 *ITENS DO PEDIDO:*\n${itensTexto}\n`;
    mensagem += `💰 *TOTAL:* R$ ${total.toFixed(2).replace('.', ',')}\n\n`;
    mensagem += `⏰ *Tempo estimado:* 40 a 60 minutos\n\n`;
    mensagem += `Obrigado pela preferência! 🙏`;

    // Número do WhatsApp da loja (substitua pelo número real)
    const numeroWhatsApp = '5574999797201'; // Substitua pelo número real da loja
    
    // Codifica a mensagem para URL
    const mensagemCodificada = encodeURIComponent(mensagem);
    
    // Gera link do WhatsApp
    const linkWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${mensagemCodificada}`;
    
    // Abre o WhatsApp
    window.open(linkWhatsApp, '_blank');
    
    // Limpa o carrinho após finalizar
    cart = [];
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
    renderCartItems();
    
    showMessageModal('Pedido enviado via WhatsApp e salvo no sistema! Aguarde o contato da loja.');
}

// Event listener para o botão de finalizar pedido
if (whatsappButton) {
    whatsappButton.addEventListener('click', finalizarPedido);
}

// Event listener para mostrar/esconder campo de endereço baseado no modo de entrega
if (modoEntregaSelect) {
    modoEntregaSelect.addEventListener('change', function() {
        if (this.value === 'Delivery') {
            clienteEnderecoInput.style.display = 'block';
            clienteEnderecoInput.required = true;
        } else {
            clienteEnderecoInput.style.display = 'none';
            clienteEnderecoInput.required = false;
        }
        // Atualiza o total do carrinho quando muda o modo de entrega
        renderCartItems();
    });
}

// Event listener para salvar perfil do usuário
if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!(await ensureUserIsSignedIn())) {
            return;
        }

        const profileData = {
            name: profileNameInput.value.trim(),
            cpfCnpj: profileCpfCnpjInput.value.trim(),
            birthdate: profileBirthdateInput.value,
            phone: profilePhoneInput.value.trim(),
            gender: profileGenderSelect.value,
            email: profileEmailInput.value.trim(),
            cep: profileCepInput.value.trim(),
            address: profileAddressInput.value.trim(),
            number: profileNumberInput.value.trim(),
            complement: profileComplementInput.value.trim(),
            neighborhood: profileNeighborhoodInput.value.trim(),
            city: profileCityInput.value.trim(),
            state: profileStateInput.value.trim(),
            completedOrders: 0 // Inicializa contador se for primeira vez
        };

        try {
            const userProfileRef = ref(database, `users/${currentUser.uid}/profile`);
            const profileSnapshot = await get(userProfileRef);
            
            if (profileSnapshot.exists()) {
                // Mantém o contador atual se já existir
                profileData.completedOrders = profileSnapshot.val().completedOrders || 0;
            }
            
            await set(userProfileRef, profileData);
            showMessageModal('Perfil salvo com sucesso!');
            
            // Atualiza campos do carrinho se estiverem vazios
            if (!clienteNomeInput.value && profileData.name) {
                clienteNomeInput.value = profileData.name;
            }
            if (!clienteTelefoneInput.value && profileData.phone) {
                clienteTelefoneInput.value = profileData.phone;
            }
            if (!clienteEnderecoInput.value && profileData.address) {
                clienteEnderecoInput.value = profileData.address;
            }
            
        } catch (error) {
            console.error('Erro ao salvar perfil:', error);
            showMessageModal('Erro ao salvar perfil. Tente novamente.');
        }
    });
}

// Inicialização
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        loadStoreStatus();
        // updateCartUI();
        ensureUserIsSignedIn();
        // loadMaisVendidos();
        loadProducts(); // Garante que o cardápio seja carregado ao iniciar
        updateCartUI(); // Atualiza o contador do carrinho ao iniciar
    });
}