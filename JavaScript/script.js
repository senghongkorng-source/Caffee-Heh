document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
    setupAddToCartButtons();
    setupContactForm();
    setupCartCheckoutModal();
});

/**
 * Parses numeric price from strings containing Khmer digits or Arabic numerals.
 * Example: "២០០០រៀល" -> 2000
 */
function parseKhmerPrice(priceStr) {
    const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    let numStr = '';
    
    for (let char of priceStr) {
        const index = khmerDigits.indexOf(char);
        if (index !== -1) {
            numStr += index;
        } else if (!isNaN(parseInt(char))) {
            numStr += char;
        }
    }
    return parseInt(numStr, 10) || 0;
}

/* ==========================================================================
   LocalStorage Cart Handlers
   ========================================================================== */
function getCart() {
    return JSON.parse(localStorage.getItem('cafeFreeCart') || '[]');
}

function saveCart(cart) {
    localStorage.setItem('cafeFreeCart', JSON.stringify(cart));
    updateCartUI();
}

function addToCart(item) {
    const cart = getCart();
    // Check if item already exists in cart to update quantity
    const existingIndex = cart.findIndex(i => i.name === item.name);
    
    if (existingIndex > -1) {
        cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + 1;
    } else {
        cart.push({ ...item, quantity: 1 });
    }
    
    saveCart(cart);
}

function updateQuantity(name, change) {
    let cart = getCart();
    const item = cart.find(i => i.name === name);
    
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.name !== name);
        }
        saveCart(cart);
        renderCartModalContent(); // Refresh modal view
    }
}

function removeFromCart(name) {
    let cart = getCart();
    cart = cart.filter(i => i.name !== name);
    saveCart(cart);
    renderCartModalContent(); // Refresh modal view
}

function clearCart() {
    localStorage.removeItem('cafeFreeCart');
    updateCartUI();
}

function updateCartUI() {
    const cartBtn = document.querySelector('.cart-bag');
    const cart = getCart();
    const totalCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    if (cartBtn) {
        cartBtn.innerHTML = `Cart <span id="cart-count">${totalCount}</span>`;
    }
}

/* ==========================================================================
   Add to Cart Handlers & Visual Feedback
   ========================================================================== */
function setupAddToCartButtons() {
    const productCards = document.querySelectorAll('.product-cart, .product-card');

    productCards.forEach((card) => {
        const button = card.querySelector('button');
        const titleEl = card.querySelector('h3');
        const priceEl = card.querySelector('p');

        if (button && titleEl && priceEl) {
            button.addEventListener('click', () => {
                const name = titleEl.textContent.trim();
                const rawPrice = priceEl.textContent.trim();
                const numericPrice = parseKhmerPrice(rawPrice);

                addToCart({ name, price: numericPrice, rawPrice });

                // Smooth Button Feedback
                const originalText = button.textContent;
                button.textContent = 'Added! ✓';
                button.style.backgroundColor = '#28a745';
                button.disabled = true;

                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.backgroundColor = '';
                    button.disabled = false;
                }, 1000);
            });
        }
    });
}

/* ==========================================================================
   KHQR & Order Breakdown Modal Logic
   ========================================================================== */
function setupCartCheckoutModal() {
    const cartBtn = document.querySelector('.cart-bag');
    if (!cartBtn) return;

    if (!document.getElementById('khqr-modal')) {
        const modalHtml = `
            <div id="khqr-modal" class="modal-overlay">
                <div class="khqr-card" style="width: 360px; max-height: 90vh; overflow-y: auto;">
                    <div class="khqr-header">Cafe Free - Order & KHQR</div>
                    
                    <!-- Itemized Order Summary -->
                    <div id="cart-items-container" style="text-align: left; margin-bottom: 1rem; border-bottom: 1px dashed #ccc; padding-bottom: 0.5rem;">
                        <!-- Items rendered dynamically -->
                    </div>

                    <div class="khqr-details">
                        <div class="khqr-amount" id="khqr-total">0 KHR</div>
                    </div>
                    
                    <div class="khqr-qr-box">
                        <img id="khqr-img" src="./Image/QR.jpg"
                    </div>
                    
                    <p style="font-size: 0.8rem; color: #6C757D; margin-bottom: 0.8rem;">
                        Scan with Bakong or any supported Cambodian Bank App
                    </p>
                    
                    <button class="close-modal-btn" id="clear-cart-btn" style="margin-bottom: 0.5rem; background: #6F4E37; color: #fff;">Complete & Clear Cart</button>
                    <button class="close-modal-btn" id="close-khqr-btn">Close</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    const modal = document.getElementById('khqr-modal');
    const closeBtn = document.getElementById('close-khqr-btn');
    const clearCartBtn = document.getElementById('clear-cart-btn');

    cartBtn.addEventListener('click', () => {
        const cart = getCart();
        if (cart.length === 0) {
            alert('Your cart is empty! Add items from the shop.');
            return;
        }
        renderCartModalContent();
        modal.classList.add('active');
    });

    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    
    clearCartBtn.addEventListener('click', () => {
        alert('Payment received! Thank you for supporting Cafe Free.');
        clearCart();
        modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
}

function renderCartModalContent() {
    const container = document.getElementById('cart-items-container');
    const totalEl = document.getElementById('khqr-total');
    const modal = document.getElementById('khqr-modal');
    const cart = getCart();

    if (!container || !totalEl) return;

    if (cart.length === 0) {
        if (modal) modal.classList.remove('active');
        return;
    }

    let itemsHtml = '';
    let grandTotal = 0;

    cart.forEach(item => {
        const itemTotal = item.price * (item.quantity || 1);
        grandTotal += itemTotal;

        itemsHtml += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; font-size: 0.9rem;">
                <div style="flex: 1;">
                    <strong>${item.name}</strong>
                    <div style="font-size: 0.8rem; color: #6C757D;">${item.price.toLocaleString()} KHR each</div>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <button onclick="updateQuantity('${item.name}', -1)" style="padding: 2px 8px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc;">-</button>
                    <span>${item.quantity || 1}</span>
                    <button onclick="updateQuantity('${item.name}', 1)" style="padding: 2px 8px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc;">+</button>
                    <button onclick="removeFromCart('${item.name}')" style="background: none; border: none; color: red; cursor: pointer; font-size: 1.1rem; margin-left: 4px;">&times;</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = itemsHtml;
    totalEl.textContent = `${grandTotal.toLocaleString()} KHR`;
}

/* ==========================================================================
   Contact Form Handler
   ========================================================================== */
function setupContactForm() {
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Thank you for contacting Cafe Free! We will get back to you shortly.');
            contactForm.reset();
        });
    }
}
