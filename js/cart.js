// Корзина услуг для LightArt
class ServicesCart {
    constructor() {
        this.items = [];
        this.init();
    }

    init() {
        // Загружаем корзину из localStorage
        this.loadFromStorage();
        
        // Инициализируем элементы корзины
        this.cartIcon = document.getElementById('cart-icon');
        this.cartDropdown = document.getElementById('cart-dropdown');
        this.cartCount = document.getElementById('cart-count');
        this.cartItems = document.getElementById('cart-items');
        this.cartClose = document.getElementById('cart-close');
        this.cartCheckoutBtn = document.getElementById('cart-checkout-btn');
        
        // Проверяем, что все элементы найдены
        if (!this.cartIcon || !this.cartDropdown || !this.cartCount || !this.cartItems || !this.cartClose || !this.cartCheckoutBtn) {
            console.error('Не все элементы корзины найдены');
            return;
        }
        
        // Добавляем обработчики событий
        this.bindEvents();
        
        // Обновляем отображение
        this.updateDisplay();
    }

    bindEvents() {
        // Открытие/закрытие корзины
        this.cartIcon.addEventListener('click', (e) => this.toggleCart());
        this.cartClose.addEventListener('click', (e) => this.closeCart());
        
        // Переход к заказу
        this.cartCheckoutBtn.addEventListener('click', (e) => this.goToCheckout());
        
        // Закрытие корзины при клике вне её
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.services-cart')) {
                this.closeCart();
            }
        });

        // Обработка удаления через делегирование
        this.cartItems.addEventListener('click', (e) => {
            const removeButton = e.target.closest('.cart-item-remove');
            if (removeButton) {
                const cartItem = removeButton.closest('.cart-item');
                const serviceId = cartItem.dataset.serviceId;
                if (serviceId) {
                    this.removeItem(serviceId);
                }
            }
        });

        // Синхронизация корзины между вкладками
        window.addEventListener('storage', (e) => {
            if (e.key === 'lightart-cart') {
                console.log('Обнаружено изменение корзины в другой вкладке');
                this.loadFromStorage();
                this.updateDisplay();
            }
        });
    }

    addItem(service) {
        // Проверяем, нет ли уже такой услуги в корзине
        const existingItem = this.items.find(item => item.id === service.id);
        
        if (existingItem) {
            // Если услуга уже есть, показываем уведомление
            this.showNotification('Услуга уже добавлена в корзину', 'warning');
            return;
        }

        // Добавляем услугу в корзину
        this.items.push({
            id: service.id,
            name: service.name,
            price: service.price,
            priceNumber: service.priceNumber
        });

        // Сохраняем в localStorage
        this.saveToStorage();
        
        // Обновляем отображение
        this.updateDisplay();
        
        // Показываем уведомление
        this.showNotification(`Услуга "${service.name}" добавлена в корзину`, 'success');
        
        // Отладочная информация
        console.log('Товар добавлен в корзину:', service.name);
        console.log('Всего товаров в корзине:', this.items.length);
    }

    removeItem(serviceId) {
        const index = this.items.findIndex(item => item.id === serviceId);
        
        if (index !== -1) {
            const removedItem = this.items[index];
            this.items.splice(index, 1);
            
            // Сохраняем в localStorage
            this.saveToStorage();
            
            // Обновляем отображение
            this.updateDisplay();
            
            // Показываем уведомление
            this.showNotification(`Услуга "${removedItem.name}" удалена из корзины`, 'info');
            
            // Отладочная информация
            console.log('Товар удален из корзины:', removedItem.name);
            console.log('Всего товаров в корзине:', this.items.length);
        }
    }

    clearCart(showNotify = true) {
        this.items = [];
        this.saveToStorage();
        this.updateDisplay();
        if (showNotify) {
            this.showNotification('Корзина очищена', 'info');
        }
    }

    toggleCart() {
        if (this.cartDropdown.classList.contains('active')) {
            this.closeCart();
        } else {
            this.openCart();
        }
    }

    openCart() {
        this.cartDropdown.classList.add('active');
    }

    closeCart() {
        this.cartDropdown.classList.remove('active');
    }

    updateDisplay() {
        // Обновляем счетчик
        this.cartCount.textContent = this.items.length;
        
        // Показываем/скрываем счетчик
        if (this.items.length > 0) {
            this.cartCount.style.display = 'flex';
        } else {
            this.cartCount.style.display = 'none';
        }
        
        // Обновляем содержимое корзины
        this.renderCartItems();
        
        // Обновляем состояние кнопки "Перейти к заказу"
        this.cartCheckoutBtn.disabled = this.items.length === 0;
    }

    renderCartItems() {
        if (this.items.length === 0) {
            this.cartItems.innerHTML = '<p class="cart-empty">Корзина пуста</p>';
            return;
        }

        const itemsHtml = this.items.map(item => `
            <div class="cart-item" data-service-id="${item.id}">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${item.price}</div>
                </div>
                <button class="cart-item-remove">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        `).join('');

        this.cartItems.innerHTML = itemsHtml;
    }

    goToCheckout() {
        if (this.items.length === 0) return;
        
        // Создаем строку с ID услуг для передачи в URL
        const serviceIds = this.items.map(item => item.id).join(',');
        
        // Перенаправляем на страницу контактов с выбранными услугами
        window.location.href = `contacts.html?cart=${encodeURIComponent(serviceIds)}`;
    }

    showNotification(message, type = 'info') {
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = `cart-notification cart-notification-${type}`;
        notification.textContent = message;
        
        // Добавляем стили
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'warning' ? '#FF9800' : '#2196F3'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1001;
            font-size: 14px;
            font-weight: 500;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Показываем уведомление
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Убираем уведомление через 3 секунды
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    saveToStorage() {
        localStorage.setItem('lightart-cart', JSON.stringify(this.items));
        console.log('Корзина сохранена в localStorage:', this.items);
    }

    loadFromStorage() {
        const saved = localStorage.getItem('lightart-cart');
        if (saved) {
            try {
                this.items = JSON.parse(saved);
                console.log('Корзина загружена из localStorage:', this.items);
            } catch (e) {
                console.error('Ошибка загрузки корзины:', e);
                this.items = [];
            }
        } else {
            console.log('В localStorage нет сохраненной корзины');
        }
    }

    // Метод для получения всех услуг в корзине
    getItems() {
        return this.items;
    }

    // Метод для проверки, есть ли услуга в корзине
    hasItem(serviceId) {
        return this.items.some(item => item.id === serviceId);
    }
}

// Создаем глобальный экземпляр корзины
// Инициализируем корзину после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    const cartElement = document.getElementById('services-cart');
    if (cartElement) {
        window.servicesCart = new ServicesCart();
        console.log('Корзина инициализирована на странице:', window.location.pathname);
        console.log('Текущие товары в корзине:', window.servicesCart.getItems());
    } else {
        console.warn('Элемент корзины не найден на странице:', window.location.pathname);
    }
}); 