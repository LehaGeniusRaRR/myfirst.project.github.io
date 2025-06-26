// Navigation.js - Функциональность навигационного меню
document.addEventListener('DOMContentLoaded', () => {
    // Элементы навигации
    const navToggle = document.getElementById('navToggle');
    const navList = document.getElementById('navList');
    const menuOverlay = document.getElementById('menuOverlay');

    // Инициализация навигации
    function initNavigation() {
        if (!navToggle || !navList) {
            console.warn('Элементы навигации не найдены');
            return;
        }

        // Обработчик клика по кнопке мобильного меню
        navToggle.addEventListener('click', toggleMobileMenu);

        // Обработчик клика по оверлею для закрытия меню
        if (menuOverlay) {
            menuOverlay.addEventListener('click', closeMobileMenu);
        }

        // Обработчик клика по ссылкам в меню для закрытия мобильного меню
        const navLinks = navList.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', closeMobileMenu);
        });

        // Обработчик изменения размера окна
        window.addEventListener('resize', handleResize);

        // Обработчик клавиши Escape для закрытия меню
        document.addEventListener('keydown', handleKeydown);
    }

    // Переключение мобильного меню
    function toggleMobileMenu() {
        navList.classList.toggle('active');
        navToggle.classList.toggle('active');
        
        if (menuOverlay) {
            menuOverlay.classList.toggle('active');
        }

        // Блокировка скролла при открытом меню
        if (navList.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }

    // Закрытие мобильного меню
    function closeMobileMenu() {
        navList.classList.remove('active');
        navToggle.classList.remove('active');
        
        if (menuOverlay) {
            menuOverlay.classList.remove('active');
        }

        document.body.style.overflow = '';
    }

    // Обработка изменения размера окна
    function handleResize() {
        if (window.innerWidth > 768) {
            closeMobileMenu();
        }
    }

    // Обработка нажатия клавиш
    function handleKeydown(event) {
        if (event.key === 'Escape' && navList.classList.contains('active')) {
            closeMobileMenu();
        }
    }

    // Подсветка активной страницы в навигации
    function highlightActivePage() {
        const currentPath = window.location.pathname;
        const navLinks = navList.querySelectorAll('a');
        
        navLinks.forEach(link => {
            const linkPath = link.getAttribute('href');
            
            // Удаляем предыдущую активную страницу
            link.removeAttribute('aria-current');
            
            // Проверяем, является ли текущая страница активной
            if (currentPath.endsWith(linkPath) || 
                (currentPath.endsWith('/') && linkPath === 'index.html') ||
                (currentPath.endsWith('index.html') && linkPath === 'index.html')) {
                link.setAttribute('aria-current', 'page');
            }
        });
    }

    // Плавная прокрутка для якорных ссылок
    function initSmoothScroll() {
        const anchorLinks = document.querySelectorAll('a[href^="#"]');
        
        anchorLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                
                if (href === '#') return;
                
                const targetElement = document.querySelector(href);
                if (targetElement) {
                    e.preventDefault();
                    
                    const headerHeight = document.querySelector('header').offsetHeight;
                    const targetPosition = targetElement.offsetTop - headerHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    // Инициализация всех функций навигации
    initNavigation();
    highlightActivePage();
    initSmoothScroll();
}); 