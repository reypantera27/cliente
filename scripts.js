// script cliente actualizado
let map;
let userPosition = null;
let userId = null;
let markers = {}; 
let isAdmin = false; 
let routePaths = {}; // Almacena las rutas de cada chofer

// Pedir el nombre del usuario o si es administrador
function askUserId() {
    const input = prompt("Ingrese su nombre (o 'admin' si es administrador):");
    
    if (!input) {
        alert("Debe ingresar un nombre.");
        return askUserId();
    }

    userId = input.trim().toLowerCase();
    isAdmin = (userId === "admin");

    if (!isAdmin) {
        startTracking();
    }

    initMap();
}

// Inicializar el mapa
function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: -31.6300, lng: -60.7000 },
        zoom: 12
    });

    loadTaxiLocations();
}

// Obtener ubicación del usuario
function getUserLocation(callback) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            userPosition = position.coords;
            callback(userPosition);
        }, error => {
            console.error("Error al obtener la ubicación:", error);
        });
    }
}

// Enviar ubicación al servidor
function sendLocation() {
    if (!userPosition || !userId) return;

    fetch('https://flota-cfj7.onrender.com/update-taxi-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            taxiId: userId,
            lat: userPosition.latitude,
            lng: userPosition.longitude
        })
    });
}

// Actualizar ubicación cada 10 segundos
function startTracking() {
    getUserLocation(position => {
        sendLocation();
        setInterval(() => {
            getUserLocation(sendLocation);
        }, 10000);
    });
}

// Cargar ubicaciones de los taxis
function loadTaxiLocations() {
    fetch('https://flota-cfj7.onrender.com/get-taxi-locations')
        .then(response => response.json())
        .then(data => {
            Object.values(markers).forEach(marker => marker.setMap(null));
            markers = {};
            
            data.forEach(taxi => {
                if (!isAdmin && taxi.id !== userId) return;
                
                const marker = new google.maps.Marker({
                    position: new google.maps.LatLng(taxi.lat, taxi.lng),
                    map,
                    title: `Taxi: ${taxi.id}`
                });

                markers[taxi.id] = marker;
            });

            // Llamar a la función que muestra el menú de choferes
            showDriverMenu();
        });

    setTimeout(loadTaxiLocations, 10000);
}


// Mostrar menú de choferes y sus recorridos
function showDriverMenu() {
    fetch('https://flota-cfj7.onrender.com/get-taxi-locations')
        .then(response => response.json())
        .then(data => {
            let menu = document.getElementById("driverMenu");
            menu.innerHTML = "";
            
            data.forEach(taxi => {
                let button = document.createElement("button");
                button.innerText = `Taxi ${taxi.id}`;
                button.onclick = () => showRoute(taxi.id);
                menu.appendChild(button);
            });

            menu.style.display = "block";
        });
}

// Mostrar la ruta de un chofer
function showRoute(taxiId) {
    fetch(`https://flota-cfj7.onrender.com/get-taxi-route?taxiId=${taxiId}`)
        .then(response => response.json())
        .then(route => {
            if (routePaths[taxiId]) {
                routePaths[taxiId].setMap(null);
            }
            
            const path = new google.maps.Polyline({
                path: route,
                geodesic: true,
                strokeColor: "#FF0000",
                strokeOpacity: 1.0,
                strokeWeight: 2,
                map: map
            });

            routePaths[taxiId] = path;
        });
}

document.addEventListener("DOMContentLoaded", askUserId);
