// GF Frango Assado - Script.js

// Importa as funções necessárias do SDK Modular do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, onValue, push, set, remove, get } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// Configuração do Firebase (temporária para teste local - COLOQUE SEUS VALORES REAIS AQUI)
// Lembre-se: para produção, usaremos variáveis de ambiente!
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

// Inicializa o Firebase App
const app = initializeApp(firebaseConfig);
// Obtém a referência ao serviço de banco de dados
const db = getDatabase(app);


// Objeto global do carrinho (nome -> {preço, quantidade})
const cart = {};

// Variável para armazenar o status da loja (aberta/fechada)
let isStoreOpen = true; // Valor padrão, será atualizado pelo Firebase

// Formata número no formato de moeda brasileira "R$ xx,xx"
function formatCurrency(value) {
  let number = Number(value);
  return "R$ " + number.toFixed(2).replace('.', ',');
}

// =========================================================
// FUNÇÕES DE GERENCIAMENTO DO CARRINHO (Unificadas)
// =========================================================

function updateCartItem(name, price, isPlus) {
  if (isPlus) {
    if (cart[name]) {
      cart[name].quantity += 1;
    } else {
      cart[name] = { price: price, quantity: 1 };
    }
  } else {
    if (!cart[name]) return;
    cart[name].quantity -= 1;
    if (cart[name].quantity <= 0) {
      delete cart[name];
    }
  }
  updateCartButton();
  updateListingItem(name);
  renderCartModal();
}

function addProductToCart(name, price, productId) {
    if (cart[name]) {
        cart[name].quantity += 1;
    } else {
        cart[name] = { name: name, price: price, quantity: 1, id: productId };
    }
    updateCartButton();
    updateListingItem(name);
    renderCartModal();
}

function updateCartButton() {
  const cartButton = document.getElementById('btn-carrinho');
  const cartCountSpan = document.getElementById('cart-count');
  let itemCount = 0;
  for (let name in cart) {
    itemCount += cart[name].quantity;
  }
  cartCountSpan.textContent = itemCount;
}

function updateListingItem(name) {
  const itemElement = document.querySelector(`.produto-card[data-name="${name}"]`);
  if (!itemElement) return;

  const quantitySpan = itemElement.querySelector('.quantity');
  const minusButton = itemElement.querySelector('.minus');

  if (cart[name] && cart[name].quantity > 0) {
    itemElement.classList.add('added');
    if (quantitySpan) quantitySpan.textContent = cart[name].quantity;
    if (minusButton) minusButton.disabled = false;
  } else {
    itemElement.classList.remove('added');
    if (quantitySpan) quantitySpan.textContent = 0;
    if (minusButton) minusButton.disabled = true;
  }
}

function renderCartModal() {
  const cartItemsContainer = document.getElementById('cart-lista');
  const cartTotalDisplay = document.getElementById('cart-total');
  const whatsappButton = document.getElementById('whatsapp-button');

  cartItemsContainer.innerHTML = '';
  let subtotal = 0;

  const cartKeys = Object.keys(cart);
  if (cartKeys.length === 0) {
    cartItemsContainer.innerHTML = '<div class="empty-cart">Seu carrinho está vazio</div>';
    cartTotalDisplay.innerHTML = `
      <div>Subtotal: R$ 0,00</div>
      <div style="font-size:1.25em;color:#d32f2f;">Total: R$ 0,00</div>
    `;
    whatsappButton.disabled = true;
    return;
  }

  cartKeys.forEach(name => {
    const item = cart[name];
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    cartItemsContainer.innerHTML += `
      <div class="cart-item">
        <span>${item.quantity}x ${item.name}</span>
        <span>${formatCurrency(itemTotal)} <button class="cart-remove-btn" data-name="${name}">Remover</button></span>
      </div>
    `;
  });

  let delivery = document.getElementById('modo-entrega').value == "Delivery" ? 5 : 0;
  let total = subtotal + delivery;

  cartTotalDisplay.innerHTML = `
    <div>Subtotal: ${formatCurrency(subtotal)}</div>
    ${delivery > 0 ? `<div>Taxa de Entrega: ${formatCurrency(delivery)}</div>` : ''}
    <div style="font-size:1.25em;color:#d32f2f;">Total: ${formatCurrency(total)}</div>
  `;

  // Habilita/Desabilita o botão do WhatsApp com base no status da loja
  whatsappButton.disabled = !isStoreOpen;
  if (!isStoreOpen) {
    whatsappButton.textContent = "Loja Fechada - Não é possível fazer pedidos";
    whatsappButton.style.backgroundColor = "#888";
  } else {
    whatsappButton.textContent = "Finalizar Pedido via WhatsApp";
    whatsappButton.style.backgroundColor = "";
  }
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('cart-remove-btn')) {
        const nameToRemove = e.target.getAttribute('data-name');
        if (cart[nameToRemove]) {
            delete cart[nameToRemove];
            renderCartModal();
            updateCartButton();
            updateListingItem(nameToRemove);
        }
    }
});


// =========================================================
// EVENT LISTENERS (Unificadas e Adaptadas)
// =========================================================

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('plus') || e.target.classList.contains('minus')) {
    const isPlus = e.target.classList.contains('plus');
    const parentItem = e.target.closest('.item, .cart-item');
    if (!parentItem) return;

    const name = parentItem.getAttribute('data-name');
    if (!name) return;

    let price = cart[name] ? cart[name].price : parseFloat(parentItem.getAttribute('data-price') || '0');

    updateCartItem(name, price, isPlus);
  }
});

document.getElementById('btn-carrinho').addEventListener('click', () => {
  document.getElementById('cart-modal-bg').style.display = 'flex';
  renderCartModal();
});

document.getElementById('close-cart').addEventListener('click', () => {
  document.getElementById('cart-modal-bg').style.display = 'none';
});

document.getElementById('modo-entrega').addEventListener('change', function() {
  const addressField = document.getElementById('cliente-endereco');
  if (this.value === 'Delivery') {
    addressField.style.display = "block";
  } else {
    addressField.style.display = "none";
  }
  renderCartModal();
});


document.getElementById('whatsapp-button').addEventListener('click', async () => {
  if (!isStoreOpen) {
    alert('Desculpe, a loja está fechada no momento. Não é possível finalizar pedidos.');
    return;
  }

  if (Object.keys(cart).length === 0) {
    alert('Seu carrinho está vazio.');
    return;
  }

  const nome = document.getElementById('cliente-nome').value.trim();
  const telefone = document.getElementById('cliente-telefone').value.trim();
  const modo = document.getElementById('modo-entrega').value;
  const enderecoInput = document.getElementById('cliente-endereco');
  const endereco = modo === 'Delivery' ? enderecoInput.value.trim() : '';
  const pagamento = document.getElementById('forma-pagamento').value;

  if (modo === 'Delivery' && !endereco) {
    alert('Por favor, insira o endereço para entrega.');
    return;
  }

  let subtotal = 0;
  const cartItemsArray = Object.values(cart);
  cartItemsArray.forEach(item => {
    subtotal += item.price * item.quantity;
  });

  let taxa = modo === 'Delivery' ? 5 : 0;
  let total = subtotal + taxa;

  const pedidosRef = ref(db, 'pedidos/' + (telefone !== '' ? telefone : 'sem-identificacao'));
  await push(pedidosRef, {
    data: new Date().toLocaleString(),
    itens: cartItemsArray.map(i => `${i.quantity}x ${i.name}`),
    total: total.toFixed(2),
    endereco, modo, pagamento,
    nomeCliente: nome,
    telefoneCliente: telefone
  }).catch(error => {
    console.error("Erro ao salvar pedido no Firebase:", error);
    alert("Erro ao salvar pedido. Tente novamente.");
  });


  let msg = `*PEDIDO GF FRANGO ASSADO*%0AItens:%0A`;
  msg += cartItemsArray.map(item => `${item.quantity}x ${item.name} - ${formatCurrency(item.quantity * item.price)}`).join('%0A');
  msg += `%0ASubtotal: ${formatCurrency(subtotal)}`;
  if(taxa) msg += `%0ATaxa de Entrega: ${formatCurrency(taxa)}`;
  msg += `%0ATOTAL: ${formatCurrency(total)}`;
  msg += `%0ACliente: ${nome || 'Não informado'}%0ATelefone: ${telefone || 'Não informado'}`;
  if (modo === 'Delivery') msg += `%0AEndereço: ${endereco}`;
  msg += `%0APagamento: ${pagamento}`;

  const phoneNumber = '5574999797201';
  window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(msg)}`, '_blank');

  for (const key in cart) {
    delete cart[key];
  }
  renderCartModal();
  updateCartButton();
});


document.getElementById('cliente-telefone').addEventListener('input', function() {
    const telefone = this.value.trim();
    const div = document.getElementById('pedido-antigo');
    if (!telefone) { div.innerHTML = ''; return; }

    const clientePedidosRef = ref(db, 'pedidos/' + telefone);
    onValue(clientePedidosRef, (snapshot) => {
        if (!snapshot.exists()) {
            div.innerHTML = '';
            return;
        }
        let pedidos = [];
        snapshot.forEach(child => {
            pedidos.push(child.val());
        });

        pedidos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

        if (pedidos.length > 0) {
            const pedido = pedidos[0];
            let historico = `
                <div class="pedido-antigo">
                    <b>Último pedido:</b> ${pedido.data ? pedido.data : ''}<br>
                    <b>Itens:</b> ${(pedido.itens||[]).join(', ')}<br>
                    <b>Total:</b> R$ ${pedido.total}
                </div>
            `;
            div.innerHTML = historico;
        } else {
            div.innerHTML = '';
        }
    }, {
      onlyOnce: true
    });
});


// =========================================================
// POPUP CUPOM LÓGICA (Movido de index.html)
// =========================================================

function fecharPopupCupom() {
  document.getElementById('popup-cupom-bg').style.display = "none";
}
window.addEventListener('keydown', function(e){
  if(e.key === "Escape") fecharPopupCupom();
});
document.getElementById('popup-cupom-bg').addEventListener('click', function(e){
  if(e.target === this) fecharPopupCupom();
});
function verificarCupomCliente() {
  let compras = Number(localStorage.getItem('comprasGF') || 0);
  if (compras > 0 && compras % 5 === 0) {
    document.getElementById('popup-cupom-bg').style.display = "flex";
  }
}

// =========================================================
// CARREGAMENTO DINÂMICO DE PRODUTOS
// =========================================================
function loadProducts() {
  const productListingDiv = document.getElementById('product-listing');
  productListingDiv.innerHTML = '<p>Carregando produtos...</p>';

  onValue(ref(db, 'produtos'), (snapshot) => {
    productListingDiv.innerHTML = '';

    if (!snapshot.exists()) {
      productListingDiv.innerHTML = '<p>Nenhum produto cadastrado ainda.</p>';
      return;
    }

    const categories = {};
    snapshot.forEach(childSnapshot => {
      const product = childSnapshot.val();
      product.id = childSnapshot.key;
      if (!categories[product.categoria]) {
        categories[product.categoria] = [];
      }
      categories[product.categoria].push(product);
    });

    for (const category in categories) {
      const categoryTitle = document.createElement('div');
      categoryTitle.className = 'section-title';
      categoryTitle.textContent = categoriaNome(category);
      productListingDiv.appendChild(categoryTitle);

      categories[category].forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'produto-card';
        productCard.setAttribute('data-name', product.nome);
        productCard.setAttribute('data-price', product.preco);
        productCard.setAttribute('data-id', product.id);

        productCard.innerHTML = `
          <img src="${product.imgurl || 'https://placehold.co/70x70/cccccc/333333?text=Sem+Imagem'}" class="produto-img" alt="${product.nome}">
          <div class="produto-info">
            <div class="produto-nome">${product.nome}</div>
            <div class="produto-desc">${product.desc || ''}</div>
            <span class="produto-preco">${formatCurrency(product.preco)}</span>
            ${product.precoAntigo ? `<span class="produto-preco-antigo">${formatCurrency(product.precoAntigo)}</span>` : ''}
            <br>
            <button class="produto-btn" data-id="${product.id}">Adicionar</button>
          </div>
        `;
        productListingDiv.appendChild(productCard);
      });
    }

    document.querySelectorAll('.produto-btn').forEach(button => {
      button.addEventListener('click', (e) => {
          const productCard = e.target.closest('.produto-card');
          if (productCard) {
              const name = productCard.querySelector('.produto-nome').innerText;
              const priceText = productCard.querySelector('.produto-preco').innerText;
              const price = parseFloat(priceText.replace('R$', '').replace(',', '.'));
              const productId = productCard.getAttribute('data-id');
              addProductToCart(name, price, productId);
          }
      });
    });

  }, (error) => {
    console.error("Erro ao carregar produtos do Firebase:", error);
    productListingDiv.innerHTML = '<p>Erro ao carregar produtos. Tente novamente mais tarde.</p>';
  });
}

function categoriaNome(cat) {
  switch(cat) {
    case "frango": return "Frango Assado";
    case "batatas": return "Batatas";
    case "combos": return "Combos";
    case "adicionais": return "Adicionais";
    case "bebidas": return "Bebidas";
    case "acompanhamentos": return "Acompanhamentos";
    default: return cat.charAt(0).toUpperCase() + cat.slice(1);
  }
}

// =========================================================
// LÓGICA DE STATUS DA LOJA (ABERTO/FECHADO) POR DIA DA SEMANA E MANUAL
// =========================================================
function checkStoreStatus() {
  const storeStatusSpan = document.getElementById('store-status');
  const whatsappButton = document.getElementById('whatsapp-button');

  // Primeiro, verifica o status manual
  onValue(ref(db, 'config/manualStatus'), (manualSnapshot) => {
    const manualStatus = manualSnapshot.val();

    if (manualStatus && manualStatus.active) {
      // Se o controle manual estiver ativo, usa o status manual
      isStoreOpen = manualStatus.isOpen;
      if (isStoreOpen) {
        storeStatusSpan.textContent = "🟢 Aberto (Manual)";
        storeStatusSpan.className = "status-aberto";
      } else {
        storeStatusSpan.textContent = "🔴 Fechado (Manual)";
        storeStatusSpan.className = "status-fechado";
      }
      renderCartModal(); // Atualiza o botão do WhatsApp
      return; // Sai da função, pois o status manual tem prioridade
    }

    // Se o controle manual NÃO estiver ativo, usa a lógica de horários programados
    onValue(ref(db, 'config/storeHours'), (hoursSnapshot) => {
      const hoursConfig = hoursSnapshot.val();
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeInMinutes = currentHour * 60 + currentMinute;

      let openTimeInMinutes = -1;
      let closeTimeInMinutes = -1;
      let dayHours = null;

      // Seleciona os horários com base no dia da semana
      switch (dayOfWeek) {
        case 0: // Domingo
          dayHours = hoursConfig?.sunday;
          break;
        case 5: // Sexta-feira
          dayHours = hoursConfig?.friday;
          break;
        case 6: // Sábado
          dayHours = hoursConfig?.saturday;
          break;
        default: // Dias de semana (Segunda a Quinta)
          dayHours = hoursConfig?.weekday; // Agora usa 'weekday'
          break;
      }

      if (dayHours && dayHours.openTime && dayHours.closeTime) {
        const [openHour, openMinute] = dayHours.openTime.split(':').map(Number);
        const [closeHour, closeMinute] = dayHours.closeTime.split(':').map(Number);
        openTimeInMinutes = openHour * 60 + openMinute;
        closeTimeInMinutes = closeHour * 60 + closeMinute;
      } else {
        // Fallback se o horário para o dia atual não estiver configurado
        storeStatusSpan.textContent = "🟢 Aberto (Horário não configurado)";
        storeStatusSpan.className = "status-aberto";
        isStoreOpen = true;
        renderCartModal();
        return;
      }

      // Lógica para verificar se a loja está aberta
      if (openTimeInMinutes < closeTimeInMinutes) {
        isStoreOpen = (currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes < closeTimeInMinutes);
      } else {
        isStoreOpen = (currentTimeInMinutes >= openTimeInMinutes || currentTimeInMinutes < closeTimeInMinutes);
      }

      if (isStoreOpen) {
        storeStatusSpan.textContent = "🟢 Aberto";
        storeStatusSpan.className = "status-aberto";
      } else {
        storeStatusSpan.textContent = "🔴 Fechado";
        storeStatusSpan.className = "status-fechado";
      }

      renderCartModal();
    }, (error) => {
      console.error("Erro ao verificar status da loja (horários):", error);
      storeStatusSpan.textContent = "Status Indisponível";
      storeStatusSpan.className = "status-fechado";
      isStoreOpen = false;
      renderCartModal();
    });
  }, (error) => {
    console.error("Erro ao verificar status manual da loja:", error);
    // Se houver erro ao buscar status manual, tenta a lógica de horários programados
    // (A lógica de fallback já está no segundo onValue, então apenas loga o erro)
    checkStoreStatusBasedOnHours(); // Chama a função que verifica apenas por horários
  });
}

// Função auxiliar para ser chamada se houver erro no status manual ou se não houver manualStatus
function checkStoreStatusBasedOnHours() {
    const storeStatusSpan = document.getElementById('store-status');
    const whatsappButton = document.getElementById('whatsapp-button');

    onValue(ref(db, 'config/storeHours'), (hoursSnapshot) => {
        const hoursConfig = hoursSnapshot.val();
        const now = new Date();
        const dayOfWeek = now.getDay();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeInMinutes = currentHour * 60 + currentMinute;

        let openTimeInMinutes = -1;
        let closeTimeInMinutes = -1;
        let dayHours = null;

        switch (dayOfWeek) {
            case 0: dayHours = hoursConfig?.sunday; break;
            case 5: dayHours = hoursConfig?.friday; break;
            case 6: dayHours = hoursConfig?.saturday; break;
            default: dayHours = hoursConfig?.weekday; break;
        }

        if (dayHours && dayHours.openTime && dayHours.closeTime) {
            const [openHour, openMinute] = dayHours.openTime.split(':').map(Number);
            const [closeHour, closeMinute] = dayHours.closeTime.split(':').map(Number);
            openTimeInMinutes = openHour * 60 + openMinute;
            closeTimeInMinutes = closeHour * 60 + closeMinute;
        } else {
            storeStatusSpan.textContent = "🟢 Aberto (Horário não configurado)";
            storeStatusSpan.className = "status-aberto";
            isStoreOpen = true;
            renderCartModal();
            return;
        }

        if (openTimeInMinutes < closeTimeInMinutes) {
            isStoreOpen = (currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes < closeTimeInMinutes);
        } else {
            isStoreOpen = (currentTimeInMinutes >= openTimeInMinutes || currentTimeInMinutes < closeTimeInMinutes);
        }

        if (isStoreOpen) {
            storeStatusSpan.textContent = "🟢 Aberto";
            storeStatusSpan.className = "status-aberto";
        } else {
            storeStatusSpan.textContent = "🔴 Fechado";
            storeStatusSpan.className = "status-fechado";
        }

        renderCartModal();
    }, (error) => {
        console.error("Erro ao verificar status da loja (horários):", error);
        storeStatusSpan.textContent = "Status Indisponível";
        storeStatusSpan.className = "status-fechado";
        isStoreOpen = false;
        renderCartModal();
    });
}


// Chama ao carregar site - Configuração Inicial
document.addEventListener('DOMContentLoaded', function() {
  verificarCupomCliente();
  updateCartButton();
  loadProducts();
  checkStoreStatus(); // Agora esta função lida com a prioridade do status manual
  setInterval(checkStoreStatus, 60 * 1000); // A cada 1 minuto
});

// FILTROS DE CATEGORIA - (Manter, mas serão adaptados para categorias dinâmicas depois)
document.querySelectorAll('.filter-btn').forEach(button => {
  button.addEventListener('click', () => {
    const category = button.getAttribute('data-category');
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn === button);
    });
    document.querySelectorAll('.menu-section').forEach(section => {
      if (section.getAttribute('data-category-section') === category) {
        section.style.display = 'block';
      } else {
        section.style.display = 'none';
      }
    });
  });
});
