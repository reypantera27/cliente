let map;
let userPosition = null;
let userId = null;
let markers = {}; // Almacenar los marcadores de los taxis
let isAdmin = false; // Variable para identificar si el usuario es administrador

// Función para pedir el nombre del chofer o acceso de administrador
function askUserId() {
    const input = prompt("Ingrese su nombre (o 'admin' si es administrador):");
    
    if (!input) {
        alert("Debe ingresar un nombre.");
        return askUserId(); // Vuelve a pedir el nombre si no se ingresó nada
    }

    userId = input.trim().toLowerCase();
    isAdmin = (userId === "admin"); // Si el usuario escribe "admin", es administrador

    if (!isAdmin) {
        startTracking(); // Si no es admin, comienza a enviar su ubicación
    }

    initMap(); // Inicia el mapa después de obtener el nombre
}

// Función para inicializar el mapa
function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: -31.6300, lng: -60.7000 }, // Santa Fe, Argentina
        zoom: 12
    });

    loadTaxiLocations(); // Cargar taxis en el mapa
}

// Función para obtener la ubicación del usuario
function getUserLocation(callback) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            userPosition = position.coords;
            callback(userPosition);
        }, error => {
            console.error("Error al obtener la ubicación:", error);
        });
    } else {
        console.error("La geolocalización no es compatible con este navegador.");
    }
}

// Función para enviar la ubicación al servidor
function sendLocation() {
    if (!userPosition || !userId) return;

    fetch('https://flota-cfj7.onrender.com/update-taxi-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            taxiId: userId, // Usa el nombre ingresado como ID
            lat: userPosition.latitude,
            lng: userPosition.longitude
        })
    }).then(response => {
        if (response.ok) {
            console.log("Ubicación enviada correctamente.");
        } else {
            console.error("Error al enviar la ubicación.");
        }
    });
}

// Función para actualizar la ubicación del usuario cada 10 segundos
function startTracking() {
    getUserLocation(position => {
        sendLocation(); // Enviar ubicación al inicio
        setInterval(() => {
            getUserLocation(sendLocation);
        }, 10000); // Enviar cada 10 segundos
    });
}

// Función para obtener y mostrar las ubicaciones de los taxis
function loadTaxiLocations() {
    fetch('https://flota-cfj7.onrender.com/get-taxi-locations')
        .then(response => response.json())
        .then(data => {
            // Eliminar todos los marcadores previos
            Object.values(markers).forEach(marker => marker.setMap(null));
            markers = {};

            data.forEach(taxi => {
                // Si el usuario NO es admin, solo debe ver su taxi
                if (!isAdmin && taxi.id !== userId) return;

                const marker = new google.maps.Marker({
                    position: { lat: taxi.lat, lng: taxi.lng },
                    map,
                    title: `Taxi: ${taxi.id}`,
                    icon: {
                        url: "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png" // Icono amarillo para taxis
                    }
                });

                markers[taxi.id] = marker;
            });
        })
        .catch(error => {
            console.error("Error al cargar ubicaciones de taxis:", error);
        });

    // Recargar ubicaciones cada 10 segundos
    setTimeout(loadTaxiLocations, 10000);
}

// Inicia el sistema cuando se carga la página
document.addEventListener("DOMContentLoaded", askUserId);
