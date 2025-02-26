let map;
let userPosition = null;
let userId = null;
let markers = {};
let isAdmin = false;
let taxiPaths = {}; // Guardará los recorridos de cada taxi

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

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: -31.6300, lng: -60.7000 },
        zoom: 12
    });

    loadTaxiLocations();
}

// Obtener historial y dibujar la ruta
function loadTaxiHistory(taxiId) {
    const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

    fetch(`https://flota-cfj7.onrender.com/get-taxi-history/${taxiId}/${today}`)
        .then(response => response.json())
        .then(data => {
            if (!data || data.length === 0) {
                console.log(`No hay historial para el taxi ${taxiId}`);
                return;
            }

            const pathCoordinates = data.map(point => ({ lat: point.lat, lng: point.lng }));

            // Eliminar ruta anterior si existe
            if (taxiPaths[taxiId]) {
                taxiPaths[taxiId].setMap(null);
            }

            // Dibujar la ruta en el mapa
            taxiPaths[taxiId] = new google.maps.Polyline({
                path: pathCoordinates,
                geodesic: true,
                strokeColor: "#FF0000",
                strokeOpacity: 1.0,
                strokeWeight: 2
            });

            taxiPaths[taxiId].setMap(map);
        })
        .catch(error => console.error("Error al obtener historial:", error));
}

// Obtener ubicación del usuario
function getUserLocation(callback) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            userPosition = position.coords;
            callback(userPosition);
        }, error => {
            console.error("Error al obtener la ubicación:", error);
            document.getElementById("status").textContent = "No se pudo obtener la ubicación.";
        });
    } else {
        console.error("Geolocalización no soportada.");
        document.getElementById("status").textContent = "El navegador no soporta geolocalización.";
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
    }).then(response => {
        if (response.ok) {
            console.log("Ubicación enviada.");
        } else {
            console.error("Error al enviar ubicación.");
        }
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

            const ahora = Date.now();

            data.forEach(taxi => {
                if (!isAdmin && taxi.id !== userId) return;

                const tiempoTranscurrido = (ahora - new Date(taxi.lastUpdated).getTime()) / 1000 / 60;

                if (tiempoTranscurrido > 10) return;

                const marker = new google.maps.Marker({
                    position: new google.maps.LatLng(taxi.lat, taxi.lng),
                    map,
                    title: `Taxi: ${taxi.id}`
                });

                markers[taxi.id] = marker;

                // Cargar el historial cuando se actualice la ubicación
                loadTaxiHistory(taxi.id);
            });
        })
        .catch(error => {
            console.error("Error al cargar ubicaciones:", error);
        });

    setTimeout(loadTaxiLocations, 10000);
}

document.addEventListener("DOMContentLoaded", askUserId);
