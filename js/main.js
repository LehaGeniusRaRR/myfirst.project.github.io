document.addEventListener('DOMContentLoaded', () => {

    // --- Logic for Contacts Page (Dynamic Calculator) ---
    const bookingForm = document.querySelector('.booking-form');
    if (bookingForm) {
        const servicesContainer = document.getElementById('services-container');
        const calculatorsContainer = document.getElementById('calculators-container');
        const totalCostOutput = document.getElementById('total-cost-output');

        let servicesData = {}; // Store all services data by ID

        /**
         * Fetches service data from XML and initializes the form.
         */
        async function setupForm() {
            try {
                const response = await fetch('data/services.xml');
                const data = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(data, "text/xml");
                
                parseAndStoreServiceData(xmlDoc);
                populateServiceCheckboxes();

            } catch (error) {
                console.error('Failed to load services for the form:', error);
                if (servicesContainer) {
                    servicesContainer.innerHTML = '<p class="error-text">Не удалось загрузить услуги. Попробуйте позже.</p>';
                }
            }
        }

        /**
         * Parses XML data and stores it in the servicesData object.
         */
        function parseAndStoreServiceData(xmlDoc) {
            const services = xmlDoc.getElementsByTagName('service');
            Array.from(services).forEach(service => {
                const id = service.getAttribute('id');
                const name = service.getElementsByTagName('name')[0]?.textContent || '';
                const price = service.getElementsByTagName('price')[0]?.textContent || '';
                
                servicesData[id] = {
                    id,
                    name,
                    rate: parseInt(price.match(/(\d+)/)[0]) || 0,
                    isPhotoRate: price.includes('/фото'),
                };
            });
        }

        /**
         * Populates the container with service checkboxes.
         */
        function populateServiceCheckboxes() {
            if (!servicesContainer) return;
            servicesContainer.innerHTML = ''; // Clear loading text

            for (const id in servicesData) {
                const service = servicesData[id];
                const serviceEl = document.createElement('div');
                serviceEl.className = 'checkbox-group';
                serviceEl.innerHTML = `
                    <input type="checkbox" id="service-${service.id}" name="services" value="${service.id}">
                    <label for="service-${service.id}">${service.name}</label>
                `;
                servicesContainer.appendChild(serviceEl);

                serviceEl.querySelector('input').addEventListener('change', (e) => {
                    handleCheckboxChange(e.target);
                });
            }
            
            // Загружаем состояние из корзины при инициализации
            loadStateFromCart();
        }

        /**
         * Синхронизирует состояние формы с корзиной
         */
        function handleCheckboxChange(checkbox) {
            const serviceId = checkbox.value;
            const service = servicesData[serviceId];
            
            if (!service) return;

            // Используем глобальный объект корзины
            if (window.servicesCart) {
                // Сохраняем и восстанавливаем текущее состояние уведомлений
                const originalShowNotification = window.servicesCart.showNotification;
                window.servicesCart.showNotification = () => {}; // Временно отключаем уведомления

                if (checkbox.checked) {
                    if (!window.servicesCart.hasItem(serviceId)) {
                        window.servicesCart.addItem({
                            id: service.id,
                            name: service.name,
                            price: `${service.rate} BYN/${service.isPhotoRate ? 'фото' : 'час'}`,
                            priceNumber: service.rate
                        });
                    }
                } else {
                    if (window.servicesCart.hasItem(serviceId)) {
                        window.servicesCart.removeItem(serviceId);
                    }
                }

                // Восстанавливаем оригинальную функцию уведомлений
                window.servicesCart.showNotification = originalShowNotification;
            }
            
            updateCalculatorsUI();
        }
        
        /**
         * Загружает состояние из корзины в форму при первой загрузке
         */
        function loadStateFromCart() {
            if (window.servicesCart) {
                const cartItems = window.servicesCart.getItems();
                const cartItemIds = cartItems.map(item => item.id);
                
                const checkboxes = bookingForm.querySelectorAll('input[name="services"]');
                checkboxes.forEach(cb => {
                    if (cartItemIds.includes(cb.value)) {
                        cb.checked = true;
                    }
                });
                
                updateCalculatorsUI();
            }
        }

        /**
         * Updates the UI by adding or removing calculators based on checkbox state.
         */
        function updateCalculatorsUI() {
            const checkedServices = Array.from(bookingForm.querySelectorAll('input[name="services"]:checked'));

            // Remove calculators for unchecked services
            Array.from(calculatorsContainer.children).forEach(calc => {
                const calcId = calc.dataset.serviceId;
                if (!checkedServices.some(s => s.value === calcId)) {
                    calc.remove();
                }
            });

            // Add calculators for newly checked services
            checkedServices.forEach(checkbox => {
                const serviceId = checkbox.value;
                if (!calculatorsContainer.querySelector(`[data-service-id="${serviceId}"]`)) {
                    const service = servicesData[serviceId];
                    const calculator = createCalculatorElement(service);
                    calculatorsContainer.appendChild(calculator);
                }
            });

            calculateTotalCost();
        }
        
        /**
         * Creates a calculator element for a given service.
         * @param {Object} service - The service data object.
         * @returns {HTMLElement} - The calculator element.
         */
        function createCalculatorElement(service) {
            const calculator = document.createElement('div');
            calculator.className = 'calculator-item';
            calculator.dataset.serviceId = service.id;

            if (service.isPhotoRate) {
                // Calculator for photo-based services
                calculator.innerHTML = `
                    <label>${service.name} (${service.rate} BYN/фото)</label>
                    <div class="range-slider-container">
                        <input type="number" name="${service.id}-photos" value="10" min="1" class="photo-input">
                        <span class="calculator-cost">100 BYN</span>
                    </div>
                `;
                calculator.querySelector('input').addEventListener('input', calculateTotalCost);
            } else {
                // Calculator for hour-based services
                calculator.innerHTML = `
                    <label>${service.name} (${service.rate} BYN/час)</label>
                    <div class="range-slider-container">
                        <input type="range" name="${service.id}-hours" min="1" max="8" value="2" step="1">
                        <span class="calculator-cost">2 часа - 300 BYN</span>
                    </div>
                `;
                calculator.querySelector('input').addEventListener('input', calculateTotalCost);
            }
            return calculator;
        }

        /**
         * Calculates the total cost from all active calculators and updates the display.
         */
        function calculateTotalCost() {
            let totalCost = 0;
            const getHoursText = (h) => (h == 1 ? '1 час' : (h > 1 && h < 5 ? `${h} часа` : `${h} часов`));

            Array.from(calculatorsContainer.children).forEach(calc => {
                const serviceId = calc.dataset.serviceId;
                const service = servicesData[serviceId];
                let itemCost = 0;

                if (service.isPhotoRate) {
                    const input = calc.querySelector('input[type="number"]');
                    const photoCount = parseInt(input.value) || 0;
                    itemCost = photoCount * service.rate;
                    calc.querySelector('.calculator-cost').textContent = `${itemCost} BYN`;
                } else {
                    const slider = calc.querySelector('input[type="range"]');
                    const hours = parseInt(slider.value);
                    itemCost = hours * service.rate;
                    calc.querySelector('.calculator-cost').textContent = `${getHoursText(hours)} - ${itemCost} BYN`;
                }
                totalCost += itemCost;
            });

            totalCostOutput.textContent = `${totalCost} BYN`;
        }

        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Clear the cart if it exists
            if (window.servicesCart) {
                window.servicesCart.clearCart(false); // Do not show notification
            }

            alert('Спасибо за вашу заявку! Мы скоро свяжемся с вами.');
            bookingForm.reset();
            updateCalculatorsUI();
        });
        
        // Initial setup
        setupForm();
    }
    
    // Auto-resize textarea
    const messageTextArea = document.getElementById('message');
    if (messageTextArea) {
        const charCounter = document.getElementById('char-counter');
        const maxLength = messageTextArea.getAttribute('maxlength');

        const updateCharCounter = () => {
            const remaining = maxLength - messageTextArea.value.length;
            charCounter.textContent = remaining;
        };

        const autoResize = () => {
            messageTextArea.style.height = 'auto'; // Reset height
            messageTextArea.style.height = (messageTextArea.scrollHeight) + 'px'; // Set to scroll height
        };

        messageTextArea.addEventListener('input', () => {
            updateCharCounter();
            autoResize();
        });

        // Initial setup
        updateCharCounter();
        autoResize(); // Set initial size correctly
    }
    
    // --- Logic for Portfolio Modal on index.html ---
    const portfolioModal = document.getElementById('portfolio-modal');
    if (portfolioModal) {
        const portfolioItems = document.querySelectorAll('.portfolio-item');
        const modalImg = document.getElementById('modal-img-content');
        const captionText = document.getElementById('modal-caption');
        const closeBtn = document.querySelector('.portfolio-modal-close');
        const prevBtn = document.querySelector('.portfolio-modal-prev');
        const nextBtn = document.querySelector('.portfolio-modal-next');

        let portfolioData = [];
        try {
            portfolioData = [
                [{ src: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80', caption: 'Портреты' }, { src: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=1200&q=80', caption: 'Свадьбы' }, { src: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', caption: 'Репортажи' }],
                [{ src: 'https://images.unsplash.com/photo-1523438885272-e62a256d941r?auto=format&fit=crop&w=1200&q=80', caption: 'Свадебный портрет на закате' }, { src: 'https://images.unsplash.com/photo-1519225421980-341e92167822?auto=format&fit=crop&w=1200&q=80', caption: 'Детали свадебного декора' }, { src: 'https://images.unsplash.com/photo-1515934751635-481eff60f8e9?auto=format&fit=crop&w=1200&q=80', caption: 'Первый танец молодоженов' }],
                [{ src: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1200&q=80', caption: 'Мужской портрет в студии' }, { src: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=1200&q=80', caption: 'Женский фэшн-портрет' }, { src: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=80', caption: 'Классический портрет в профиль' }],
                [{ src: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80', caption: 'Концертная съёмка' }, { src: 'https://images.unsplash.com/photo-1496337589254-7e19d01cec43?auto=format&fit=crop&w=1200&q=80', caption: 'Городской фестиваль' }, { src: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80', caption: 'Атмосфера мероприятия' }],
                [{ src: 'https://images.unsplash.com/photo-1505628346881-b72b27e84530?auto=format&fit=crop&w=1200&q=80', caption: 'Сюрреалистичный портрет с животными' }, { src: 'https://images.unsplash.com/photo-1534824399942-7a1a427f7532?auto=format&fit=crop&w=1200&q=80', caption: 'Абстрактная игра света и тени' }, { src: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80', caption: 'Цветовая абстракция' }]
            ];
        } catch (e) {
            console.error("Error initializing portfolio data", e);
        }

        let currentSetIndex;
        let currentImageIndex;

        function openModal(setIndex, imageIndex = 0) {
            currentSetIndex = setIndex;
            currentImageIndex = imageIndex;
            portfolioModal.style.display = 'flex';
            updateModalContent();
        }

        function closeModal() {
            portfolioModal.style.display = 'none';
        }

        function updateModalContent() {
            if (portfolioData[currentSetIndex] && portfolioData[currentSetIndex][currentImageIndex]) {
                modalImg.src = portfolioData[currentSetIndex][currentImageIndex].src;
                captionText.textContent = portfolioData[currentSetIndex][currentImageIndex].caption;
            }
        }

        function showNextImage() {
            currentImageIndex = (currentImageIndex + 1) % portfolioData[currentSetIndex].length;
            updateModalContent();
        }

        function showPrevImage() {
            currentImageIndex = (currentImageIndex - 1 + portfolioData[currentSetIndex].length) % portfolioData[currentSetIndex].length;
            updateModalContent();
        }

        portfolioItems.forEach((item, index) => {
            const itemImages = item.querySelectorAll('img');
            itemImages.forEach((img, imgIndex) => {
                img.addEventListener('click', () => {
                    openModal(index, imgIndex);
                });
            });
        });

        if(closeBtn) {
            closeBtn.addEventListener('click', () => {
                portfolioModal.style.display = 'none';
            });
        }

        if(prevBtn) {
            prevBtn.addEventListener('click', showPrevImage);
        }

        if(nextBtn) {
            nextBtn.addEventListener('click', showNextImage);
        }

        window.addEventListener('click', (e) => {
            if (e.target === portfolioModal) {
                portfolioModal.style.display = 'none';
            }
        });
    }
    
    // --- Portfolio Slider Logic ---
    const sliderContainer = document.querySelector('.portfolio-slider');
    if (sliderContainer) {
        const slides = [
            {
                img: 'img/port.jpg',
                caption: 'Портретная съемка',
                position: 'top'
            },
            {
                img: 'img/famaly.jpg',
                caption: 'Семейная фотосессия',
                position: 'center'
            },
            {
                img: 'img/wedding.jpg',
                caption: 'Свадебная фотосессия',
                position: 'center'
            },
            {
                img: 'img/reportage.jpg',
                caption: 'Репортажная съемка',
                position: 'center'
            },
            {
                img: 'img/fashion.jpg',
                caption: 'Fashion-съемка',
                position: 'top'
            }
        ];

        const dotsContainer = document.querySelector('.slider-dots');
        let currentSlide = 0;

        // Создаем слайды и точки
        slides.forEach((slideData, index) => {
            const slide = document.createElement('div');
            slide.className = 'portfolio-slide';
            if (slideData.position) {
                slide.classList.add(`img-pos-${slideData.position}`);
            }
            // Сразу активируем первый слайд
            if (index === 0) {
                slide.classList.add('active');
            }
            slide.innerHTML = `
                <img src="${slideData.img}" alt="${slideData.caption}">
                <div class="slide-caption">${slideData.caption}</div>
            `;
            sliderContainer.appendChild(slide);

            const dot = document.createElement('button');
            dot.className = 'slider-dot';
            dot.dataset.index = index;
             // Сразу активируем первую точку
            if (index === 0) {
                dot.classList.add('active');
            }
            dot.addEventListener('click', () => {
                goToSlide(index);
            });
            dotsContainer.appendChild(dot);
        });

        const slidesElements = document.querySelectorAll('.portfolio-slide');
        const dots = document.querySelectorAll('.slider-dot');

        function goToSlide(slideIndex) {
            if (slideIndex === currentSlide) return; // Не делать ничего, если слайд уже активен

            slidesElements[currentSlide].classList.remove('active');
            dots[currentSlide].classList.remove('active');
            
            currentSlide = slideIndex;
            
            slidesElements[currentSlide].classList.add('active');
            dots[currentSlide].classList.add('active');
        }

        function nextSlide() {
            const nextIndex = (currentSlide + 1) % slidesElements.length;
            goToSlide(nextIndex);
        }

        // Запускаем авто-проигрывание, если слайды есть
        if (slidesElements.length > 0) {
            setInterval(nextSlide, 5000); // 5 секунд на слайд
        }
    }
    
    // --- Gallery Modal Logic on About Page ---
    const galleryItems = document.querySelectorAll('.equipment-icon img');
    if (galleryItems.length > 0) {
        const galleryModal = document.createElement('div');
        galleryModal.className = 'gallery-modal';
        galleryModal.innerHTML = `
            <span class="modal-close">&times;</span>
            <button class="modal-nav modal-prev">&#10094;</button>
            <div class="modal-content">
                <img class="modal-image" id="gallery-modal-img">
                <div class="modal-caption" id="gallery-modal-caption"></div>
            </div>
            <button class="modal-nav modal-next">&#10095;</button>
        `;
        document.body.appendChild(galleryModal);

        const modalImg = document.getElementById('gallery-modal-img');
        const modalCaption = document.getElementById('gallery-modal-caption');
        const closeButton = galleryModal.querySelector('.modal-close');
        const prevButton = galleryModal.querySelector('.modal-prev');
        const nextButton = galleryModal.querySelector('.modal-next');

        let currentGalleryIndex = 0;

        function openGalleryModal(index) {
            currentGalleryIndex = index;
            galleryModal.classList.add('active');
            updateGalleryModal();
        }

        function closeGalleryModal() {
            galleryModal.classList.remove('active');
        }

        function updateGalleryModal() {
            const img = galleryItems[currentGalleryIndex];
            modalImg.src = img.src;
            modalCaption.textContent = img.alt;
        }

        function showNextGalleryImage() {
            currentGalleryIndex = (currentGalleryIndex + 1) % galleryItems.length;
            updateGalleryModal();
        }

        function showPrevGalleryImage() {
            currentGalleryIndex = (currentGalleryIndex - 1 + galleryItems.length) % galleryItems.length;
            updateGalleryModal();
        }

        galleryItems.forEach((item, index) => {
            item.addEventListener('click', () => openGalleryModal(index));
        });

        closeButton.addEventListener('click', closeGalleryModal);
        prevButton.addEventListener('click', showPrevGalleryImage);
        nextButton.addEventListener('click', showNextGalleryImage);

        galleryModal.addEventListener('click', (e) => {
            if (e.target === galleryModal) {
                closeGalleryModal();
            }
        });
    }

    // --- Logic for Cart ---
    const cartIcon = document.getElementById('cart-icon');
    if (cartIcon) {
        // ... existing cart logic ...
    }
});

