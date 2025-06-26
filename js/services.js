// LightArt intelligent search module using Lunr.js
const LightArtSearch = (() => {
  let lunrIndex;
  let servicesMap = {};

  /**
   * Initializes the search index.
   * @param {Array<Object>} services - The array of service objects to index.
   */
  const init = (services) => {
    // Create a map for quick lookup of service data by ID
    services.forEach(service => {
      servicesMap[service.id] = service;
    });

    // Configure and build the Lunr.js index
    lunrIndex = lunr(function () {
      // Use the Russian language stemmer for better search
      this.use(lunr.ru);
      
      // Define the reference field for search results
      this.ref('id');

      // Define the fields to be indexed, with a boost for the name field
      this.field('name', { boost: 10 });
      this.field('description');
      this.field('features', { boost: 5 });
      this.field('category');

      // Add each service document to the index
      services.forEach(service => {
        this.add({
          id: service.id,
          name: service.name,
          description: service.description,
          features: service.features.join(' '), // Join features array into a string
          category: service.category
        });
      });
    });
  };

  /**
   * Performs a search against the index.
   * @param {string} query - The search query.
   * @returns {Array<Object>} - An array of service objects matching the query, sorted by relevance.
   */
  const search = (query) => {
    if (!lunrIndex) {
      console.error('Search index is not initialized.');
      return [];
    }
    
    // An empty query should return all documents from the map
    if (!query.trim()) {
      return Object.values(servicesMap);
    }

    try {
      // Perform the search. The wildcard '*' allows for partial matches.
      const results = lunrIndex.search(`${query.trim()}*`);
      
      // Map the results back to the original service objects
      return results.map(result => servicesMap[result.ref]);
    } catch (e) {
      // Handle potential errors from Lunr, e.g., invalid query syntax
      console.error("Search error:", e);
      return [];
    }
  };

  return {
    init,
    search
  };
})();

// Services JavaScript functionality
// This file handles services-related features for the LightArt photography studio

// Services data structure (fallback)
const servicesData = {
    photography: {
        name: "Photography",
        description: "Professional photography services for all occasions",
        price: "From $200",
        features: ["Portrait sessions", "Event coverage", "Commercial photography", "Photo editing"]
    },
    videography: {
        name: "Videography", 
        description: "High-quality video production and editing",
        price: "From $500",
        features: ["Event videos", "Commercial videos", "Music videos", "Video editing"]
    },
    editing: {
        name: "Photo Editing",
        description: "Professional photo retouching and enhancement",
        price: "From $50",
        features: ["Color correction", "Retouching", "Background removal", "Special effects"]
    }
};

// Global variables for filter and sort state
let allServices = [];
let currentFilter = 'all';
let currentSort = 'name';

// Function to load services from XML
function loadServicesFromXML() {
    fetch('data/services.xml')
        .then(response => response.text())
        .then(data => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, "text/xml");
            parseServicesData(xmlDoc);
            
            // Initialize the search module with the parsed data
            LightArtSearch.init(allServices);

            // Initial display of services
            displayServices();
        })
        .catch(error => {
            console.error('Error loading services:', error);
        });
}

// Function to parse XML data into a structured format
function parseServicesData(xmlDoc) {
    const services = xmlDoc.getElementsByTagName('service');
    
    allServices = Array.from(services).map(service => {
        const id = service.getAttribute('id');
        const name = service.getElementsByTagName('name')[0]?.textContent || '';
        const description = service.getElementsByTagName('description')[0]?.textContent || '';
        const price = service.getElementsByTagName('price')[0]?.textContent || '';
        const features = Array.from(service.getElementsByTagName('feature')).map(f => f.textContent);
        const category = service.getAttribute('category') || 'photography';
        
        // Extract numeric price for sorting
        const priceNumber = extractPriceNumber(price);
        
        return { id, name, description, price, priceNumber, features, category };
    });
}

// Function to extract numeric price from a price string
function extractPriceNumber(priceString) {
    const match = priceString.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
}

// Main function to display services on the page
function displayServices() {
    const servicesContainer = document.querySelector('.services-container');
    if (!servicesContainer) return;

    const searchQuery = document.querySelector('#service-search')?.value || '';
    
    // Get search results from our new search module
    let servicesToDisplay = LightArtSearch.search(searchQuery);
    
    // Filter by category
    servicesToDisplay = filterServicesByCategory(servicesToDisplay, currentFilter);
    
    // Sort the results ONLY if there is no active search query.
    // Otherwise, we rely on the relevance sorting from Lunr.
    if (!searchQuery.trim()) {
        servicesToDisplay = sortServices(servicesToDisplay, currentSort);
    }
    
    renderServiceCards(servicesToDisplay, servicesContainer);
}

// Function to render service cards to the DOM
function renderServiceCards(services, container) {
    container.innerHTML = '';
    
    if (services.length === 0) {
        container.innerHTML = '<p class="no-results-message">По вашему запросу ничего не найдено.</p>';
        return;
    }
    
    services.forEach(service => {
        const serviceCard = createServiceCard(service);
        container.appendChild(serviceCard);
    });
}

// Function to filter services by category
function filterServicesByCategory(services, category) {
    if (category === 'all') {
        return services;
    }
    return services.filter(service => service.category === category);
}

// Function to sort services
function sortServices(services, sortBy) {
    const sortedServices = [...services];
    
    switch (sortBy) {
        case 'price-asc':
            return sortedServices.sort((a, b) => a.priceNumber - b.priceNumber);
        case 'price-desc':
            return sortedServices.sort((a, b) => b.priceNumber - a.priceNumber);
        case 'name':
        default:
            return sortedServices.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    }
}

// Function to create a service card element
function createServiceCard(service) {
    const card = document.createElement('div');
    card.className = 'service-card';
    
    const featuresList = service.features.map(feature => `<li>${feature}</li>`).join('');
    
    card.innerHTML = `
        <div class="service-header">
            <h3>${service.name}</h3>
            <div class="service-price">${service.price}</div>
        </div>
        <p class="service-description">${service.description}</p>
        <ul class="service-features">
            ${featuresList}
        </ul>
        <button class="service-btn book-service-btn" onclick="bookService('${service.name}')">
            <span>Добавить</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
        </button>
    `;
    
    return card;
}

// Function to handle service booking
function bookService(serviceName) {
    // Находим услугу по имени
    const service = allServices.find(s => s.name === serviceName);
    
    console.log('Попытка добавить услугу:', serviceName);
    console.log('Найденная услуга:', service);
    console.log('Корзина доступна:', typeof window.servicesCart !== 'undefined');
    
    if (service && typeof window.servicesCart !== 'undefined') {
        window.servicesCart.addItem(service);
        console.log('Услуга успешно добавлена в корзину');
    } else {
        console.error('Не удалось добавить услугу в корзину:', {
            service: service,
            cartAvailable: typeof window.servicesCart !== 'undefined'
        });
    }
}

// --- Event Handlers ---

// Function to handle search input and show suggestions
function handleSearchInput(e) {
    const query = e.target.value;
    displayServices(); // Re-render the main list based on search
    
    // Suggestions should be based on the unfiltered search results
    const suggestions = LightArtSearch.search(query).slice(0, 5);
    showSuggestions(suggestions, query);
}

// Function to show search suggestions
function showSuggestions(suggestions, query) {
    hideSuggestions();
    if (query.length < 2) return;

    const searchContainer = document.querySelector('.search-container');
    const dropdown = createSuggestionDropdown(suggestions);
    searchContainer.appendChild(dropdown);
}

// Function to hide search suggestions
function hideSuggestions() {
    const existingDropdown = document.querySelector('.search-suggestions');
    if (existingDropdown) {
        existingDropdown.remove();
    }
}

// Function to create the suggestions dropdown element
function createSuggestionDropdown(suggestions) {
    const dropdown = document.createElement('div');
    dropdown.className = 'search-suggestions';
    
    if (suggestions.length === 0) {
        dropdown.innerHTML = '<div class="suggestion-item no-results">Ничего не найдено</div>';
    } else {
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
                <span class="suggestion-name">${suggestion.name}</span>
                <span class="suggestion-price">${suggestion.price}</span>
            `;
            item.addEventListener('click', () => {
                document.querySelector('#service-search').value = suggestion.name;
                hideSuggestions();
                displayServices();
            });
            dropdown.appendChild(item);
        });
    }
    
    return dropdown;
}

// Function to handle category filter clicks
function handleFilterClick(e) {
    const filterButtons = document.querySelectorAll('.service-filter');
    filterButtons.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    
    currentFilter = e.target.dataset.category;
    displayServices();
}

// Function to handle sort button clicks
function handleSortClick(e) {
    const sortButtons = document.querySelectorAll('.sort-btn');
    sortButtons.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    currentSort = e.target.dataset.sort;
    displayServices();
}

// --- DOM Initialization ---

document.addEventListener('DOMContentLoaded', function() {
    loadServicesFromXML();
    
    const searchInput = document.querySelector('#service-search');
    if (searchInput) {
        // Debounce the search input to avoid excessive processing
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                handleSearchInput(e);
            }, 250); // Wait 250ms after the user stops typing
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                hideSuggestions();
            }
        });
    }
    
    document.querySelectorAll('.service-filter').forEach(button => {
        button.addEventListener('click', handleFilterClick);
    });
    
    document.querySelectorAll('.sort-btn').forEach(button => {
        button.addEventListener('click', handleSortClick);
    });
});

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadServicesFromXML,
        displayServices,
        displayDefaultServices,
        createServiceCard,
        bookService,
        filterServicesByCategory,
        sortServices,
        getSearchSuggestions,
        applySearchAndFilter,
        handleSorting
    };
} 