let map;
let userPosition = null;
let userId = null;
let markers = {}; 
let isAdmin = false; 

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
            // Eliminar marcadores antiguos
            Object.values(markers).forEach(marker => marker.setMap(null));
            markers = {};

            const ahora = Date.now();

            data.forEach(taxi => {
                if (!isAdmin && taxi.id !== userId) return;

                // Calcular tiempo transcurrido desde la última actualización
                const tiempoTranscurrido = (ahora - new Date(taxi.lastUpdated).getTime()) / 1000 / 60; // en minutos

                // Si han pasado más de 10 minutos, no dibujar el marcador
                if (tiempoTranscurrido > 10) {
                    console.log(`Taxi ${taxi.id} eliminado por inactividad.`);
                    return;
                }

                const marker = new google.maps.Marker({
                    position: new google.maps.LatLng(taxi.lat, taxi.lng),
                    map,
                    title: `Taxi: ${taxi.id}`
                });

                const lastUpdatedLabel = new Date(taxi.lastUpdated);
                const formattedTime = lastUpdatedLabel.toLocaleString('es-AR', {
                    timeZone: 'America/Argentina/Buenos_Aires',
                    hour: 'numeric',
                    minute: 'numeric',
                    second: 'numeric',
                });

                marker.setLabel({
                    text: `Última actualización: ${formattedTime}`,
                    fontSize: "10px",
                    color: "#000000",
                    className: 'marker-label'
                });

                markers[taxi.id] = marker;
            });
        })
        .catch(error => {
            console.error("Error al cargar ubicaciones:", error);
        });

    setTimeout(loadTaxiLocations, 10000);
}

// Iniciar el sistema al cargar la página
document.addEventListener("DOMContentLoaded", askUserId);
