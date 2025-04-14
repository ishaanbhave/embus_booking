// Configuration
const CONFIG = {
    // Auto refresh interval in milliseconds (default: 1 minute)
    refreshInterval: 60000,
    // Get API endpoint, Sheet ID and API key from the config.js file
    apiEndpoint: SHEETS_CONFIG.apiEndpoint,
    sheetId: SHEETS_CONFIG.sheetId,
    apiKey: SHEETS_CONFIG.apiKey
};

// DOM Elements
const DOM = {
    busInfoContainer: document.getElementById('bus-info-container'),
    busCardTemplate: document.getElementById('bus-card-template'),
    stopInfoTemplate: document.getElementById('stop-info-template'),
    pickupFilter: document.getElementById('pickup-filter'),
    refreshButton: document.getElementById('refresh-btn'),
    loadingIndicator: document.getElementById('loading-indicator'),
    errorContainer: document.getElementById('error-container'),
    errorText: document.getElementById('error-text'),
    noResultsContainer: document.getElementById('no-results-container'),
    lastUpdatedText: document.getElementById('last-updated-text')
};

// Application State
const STATE = {
    busData: [],
    stops: new Set(),
    routes: new Map(), // Map of route_number -> array of bus objects
    currentFilter: 'all',
    isLoading: false,
    hasError: false,
    expandedRoutes: new Set() // Track which routes are expanded
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Set up event listeners
    DOM.pickupFilter.addEventListener('change', handleFilterChange);
    DOM.refreshButton.addEventListener('click', fetchBusData);
    
    // Initial data fetch
    fetchBusData();
    
    // Set up auto-refresh
    setInterval(fetchBusData, CONFIG.refreshInterval);
});

/**
 * Fetches bus data from Google Sheets API
 */
async function fetchBusData() {
    try {
        // Show loading indicator
        showLoading(true);
        hideError();
        hideNoResults();
        
        // Construct the API URL
        const apiUrl = `${CONFIG.apiEndpoint}${CONFIG.sheetId}/values/Sheet1?key=${CONFIG.apiKey}`;
        
        // Fetch data from Google Sheets API
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`API request failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Process the data
        if (data && data.values && data.values.length > 1) {
            // First row contains headers
            const headers = data.values[0];
            
            // Create an array of objects with mapped keys
            const processedData = data.values.slice(1).map(row => {
                const rowData = {};
                headers.forEach((header, index) => {
                    rowData[header.toLowerCase().replace(/\s+/g, '_')] = row[index] || '';
                });
                return rowData;
            });
            
            // Update state
            STATE.busData = processedData;
            
            // Collect all unique stops
            STATE.stops = new Set();
            processedData.forEach(bus => {
                if (bus.stop) {
                    STATE.stops.add(bus.stop);
                }
            });
            
            // Organize data by routes
            STATE.routes.clear();
            processedData.forEach(bus => {
                if (bus.route_number) {
                    if (!STATE.routes.has(bus.route_number)) {
                        STATE.routes.set(bus.route_number, []);
                    }
                    STATE.routes.get(bus.route_number).push(bus);
                }
            });
            
            // Update filter dropdown options
            updateFilterOptions();
            
            // Display the data
            renderBusData();
            
            // Update last updated time
            updateLastUpdatedTime();
        } else {
            throw new Error("No data found in the Google Sheet");
        }
    } catch (error) {
        console.error('Error fetching bus data:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

/**
 * Updates the filter dropdown with available stop options
 */
function updateFilterOptions() {
    // Clear all options except the 'All Stops' option
    while (DOM.pickupFilter.options.length > 1) {
        DOM.pickupFilter.remove(1);
    }
    
    // Add options for each unique stop
    STATE.stops.forEach(stop => {
        const option = document.createElement('option');
        option.value = stop;
        option.textContent = stop;
        DOM.pickupFilter.appendChild(option);
    });
}

/**
 * Renders bus data based on the current filter
 */
function renderBusData() {
    // Clear existing cards
    DOM.busInfoContainer.innerHTML = '';
    
    if (STATE.currentFilter === 'all') {
        // When showing all data, group by routes
        renderRouteGroups();
    } else {
        // When filtered by stop, show routes that contain this stop
        renderFilteredRoutes();
    }
}

/**
 * Render all routes grouped by route number
 */
function renderRouteGroups() {
    // Show no results message if no data
    if (STATE.routes.size === 0) {
        showNoResults();
        return;
    }
    
    hideNoResults();
    
    // Create and append route cards
    STATE.routes.forEach((busesInRoute, routeNumber) => {
        // Use the first bus in the route for route info
        const firstBus = busesInRoute[0];
        const routeCard = createRouteCard(firstBus, busesInRoute);
        DOM.busInfoContainer.appendChild(routeCard);
    });
}

/**
 * Render routes filtered by selected stop
 */
function renderFilteredRoutes() {
    // Find routes that contain the selected stop
    const routesWithStop = [];
    
    STATE.routes.forEach((busesInRoute, routeNumber) => {
        const hasSelectedStop = busesInRoute.some(bus => bus.stop === STATE.currentFilter);
        if (hasSelectedStop) {
            routesWithStop.push({
                routeInfo: busesInRoute[0], // First bus for route info
                buses: busesInRoute
            });
        }
    });
    
    // Show no results message if no routes match
    if (routesWithStop.length === 0) {
        showNoResults();
        return;
    }
    
    hideNoResults();
    
    // Create and append route cards
    routesWithStop.forEach(({ routeInfo, buses }) => {
        const routeCard = createRouteCard(routeInfo, buses);
        DOM.busInfoContainer.appendChild(routeCard);
    });
}

/**
 * Creates a route card with all its stops
 * @param {Object} routeInfo - Bus object containing route information
 * @param {Array} allStops - Array of bus objects for this route
 * @returns {HTMLElement} - The route card element
 */
function createRouteCard(routeInfo, allStops) {
    const template = DOM.busCardTemplate.cloneNode(true);
    const routeCard = template.querySelector('.bus-card');
    const routeNumber = routeInfo.route_number || 'Route';
    
    // Set route information
    routeCard.querySelector('.route-number').textContent = routeNumber;
    routeCard.querySelector('.route-name').textContent = routeInfo.route_name || 'Embus Service';
    
    // For filtered view, highlight the selected stop
    let displayBus = routeInfo;
    if (STATE.currentFilter !== 'all') {
        // Find the bus with the selected stop
        const matchingBus = allStops.find(bus => bus.stop === STATE.currentFilter);
        if (matchingBus) {
            displayBus = matchingBus;
        }
    }
    
    // Set the main bus details (stop, ETA, seats)
    setBusDetails(routeCard, displayBus);
    
    // Set up the WhatsApp booking button
    const bookButton = routeCard.querySelector('.book-button');
    let bookingLink = SHEETS_CONFIG.bookingWhatsAppLink;
    
    // Add route info to the booking message
    const routeInfo_text = `Route ${routeNumber} - ${routeInfo.route_name || 'Embus Service'}`;
    const encodedRouteInfo = encodeURIComponent(routeInfo_text);
    
    // Add the route info to the WhatsApp link
    if (bookingLink.includes('?')) {
        // If the link already has parameters, append to them
        if (bookingLink.includes('text=')) {
            bookingLink = bookingLink.replace('text=', `text=${encodedRouteInfo} - `);
        } else {
            bookingLink += `&text=${encodedRouteInfo}`;
        }
    } else {
        // If no parameters yet, add them
        bookingLink += `?text=${encodedRouteInfo}`;
    }
    
    bookButton.href = bookingLink;
    
    // Set up the expand button click handler
    const expandBtn = routeCard.querySelector('.route-expand-btn');
    const stopsContainer = routeCard.querySelector('.route-stops-container');
    
    // Check if this route was previously expanded
    if (STATE.expandedRoutes.has(routeNumber)) {
        expandBtn.classList.add('expanded');
        stopsContainer.classList.add('active');
        // Populate the stops container
        populateStopsContainer(stopsContainer, allStops, displayBus.stop);
    }
    
    expandBtn.addEventListener('click', () => {
        expandBtn.classList.toggle('expanded');
        stopsContainer.classList.toggle('active');
        
        if (stopsContainer.classList.contains('active')) {
            // Route was expanded
            STATE.expandedRoutes.add(routeNumber);
            // Populate the stops container if it hasn't been populated yet
            if (stopsContainer.children.length === 0) {
                populateStopsContainer(stopsContainer, allStops, displayBus.stop);
            }
        } else {
            // Route was collapsed
            STATE.expandedRoutes.delete(routeNumber);
        }
    });
    
    return routeCard;
}

/**
 * Sets the bus details (stop, ETA, seats) in the route card
 * @param {HTMLElement} routeCard - The route card element
 * @param {Object} bus - Bus object with details
 */
function setBusDetails(routeCard, bus) {
    // Set stop information
    routeCard.querySelector('.stop-name').textContent = bus.stop || 'Unknown Stop';
    
    // Set ETA information
    const etaTime = bus.eta || 'N/A';
    routeCard.querySelector('.eta-time').textContent = etaTime;
    
    // Set seats information
    const seatsAvailable = parseInt(bus.available_seats) || 0;
    const seatsElement = routeCard.querySelector('.seats-available');
    seatsElement.textContent = `${seatsAvailable} seats available`;
    
    // Add class based on seat availability
    if (seatsAvailable > 15) {
        seatsElement.classList.add('seats-high');
    } else if (seatsAvailable > 5) {
        seatsElement.classList.add('seats-medium');
    } else {
        seatsElement.classList.add('seats-low');
    }
}

/**
 * Populates the stops container with all stops for a route
 * @param {HTMLElement} stopsContainer - The container element for stops
 * @param {Array} stops - Array of bus objects for the stops
 * @param {string} highlightStop - The stop to highlight (optional)
 */
function populateStopsContainer(stopsContainer, stops, highlightStop) {
    stops.forEach(stop => {
        const stopItemElement = createStopItem(stop);
        
        // Highlight the current stop if it matches the filter
        if (stop.stop === highlightStop) {
            stopItemElement.classList.add('highlighted-stop');
        }
        
        stopsContainer.appendChild(stopItemElement);
    });
}

/**
 * Creates a stop item element from the template
 * @param {Object} bus - Bus object for the stop
 * @returns {HTMLElement} - The stop item element
 */
function createStopItem(bus) {
    const template = DOM.stopInfoTemplate.cloneNode(true);
    const stopItem = template.querySelector('.route-stop-item');
    
    // Set stop information
    stopItem.querySelector('.stop-name').textContent = bus.stop || 'Unknown Stop';
    
    // Set ETA information
    const etaTime = bus.eta || 'N/A';
    stopItem.querySelector('.eta-time').textContent = etaTime;
    
    // Set seats information
    const seatsAvailable = parseInt(bus.available_seats) || 0;
    const seatsElement = stopItem.querySelector('.seats-available');
    seatsElement.textContent = `${seatsAvailable} seats available`;
    
    // Add class based on seat availability
    if (seatsAvailable > 15) {
        seatsElement.classList.add('seats-high');
    } else if (seatsAvailable > 5) {
        seatsElement.classList.add('seats-medium');
    } else {
        seatsElement.classList.add('seats-low');
    }
    
    return stopItem;
}

/**
 * Handles filter change event
 * @param {Event} event - The change event
 */
function handleFilterChange(event) {
    STATE.currentFilter = event.target.value;
    renderBusData();
}

/**
 * Shows or hides the loading indicator
 * @param {boolean} show - Whether to show the loading indicator
 */
function showLoading(show) {
    STATE.isLoading = show;
    DOM.loadingIndicator.style.display = show ? 'flex' : 'none';
}

/**
 * Shows error message
 * @param {string} message - The error message to display
 */
function showError(message) {
    STATE.hasError = true;
    DOM.errorContainer.style.display = 'block';
    DOM.errorText.textContent = message || 'Error loading bus data. Please try again.';
}

/**
 * Hides the error message
 */
function hideError() {
    STATE.hasError = false;
    DOM.errorContainer.style.display = 'none';
}

/**
 * Shows no results message
 */
function showNoResults() {
    DOM.noResultsContainer.style.display = 'block';
}

/**
 * Hides no results message
 */
function hideNoResults() {
    DOM.noResultsContainer.style.display = 'none';
}

/**
 * Updates the last updated time text
 */
function updateLastUpdatedTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const dateString = now.toLocaleDateString();
    DOM.lastUpdatedText.textContent = `Last updated: ${dateString} ${timeString}`;
}

/**
 * Handles errors in the application
 * @param {Error} error - The error object
 */
function handleError(error) {
    console.error('Application error:', error);
    showError(error.message);
}

// Global error handler
window.addEventListener('error', (event) => {
    handleError(event.error);
});
