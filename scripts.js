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
    if (typeof google === 'undefined') {
        console.error("Google Maps no se ha cargado correctamente.");
        return;
    }

    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: -31.6300, lng: -60.7000 },
        zoom: 12
    });

    loadTaxiLocations();
}


// Usar watchPosition para obtener la ubicación en tiempo real
function startTracking() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(position => {
            userPosition = position.coords;
            sendLocation();
        }, error => {
            console.error("Error en geolocalización:", error);
        }, {
            enableHighAccuracy: true,
            maximumAge: 5000
        });
    } else {
        console.error("Geolocalización no soportada.");
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
    }).catch(error => console.error("Error en fetch:", error));
}

// Cargar ubicaciones de los taxis y actualizar el mapa en tiempo real
function loadTaxiLocations() {
    fetch('https://flota-cfj7.onrender.com/get-taxi-locations')
        .then(response => response.json())
        .then(data => {
            const ahora = Date.now();

            data.forEach(taxi => {
                if (!isAdmin && taxi.id !== userId) return;

                const tiempoTranscurrido = (ahora - new Date(taxi.lastUpdated).getTime()) / 1000 / 60; // minutos

                if (tiempoTranscurrido > 10) {
                    if (markers[taxi.id]) {
                        markers[taxi.id].setMap(null);
                        delete markers[taxi.id];
                        console.log(`movil ${taxi.id} eliminado por inactividad.`);
                    }
                    return;
                }

                if (markers[taxi.id]) {
                    markers[taxi.id].setPosition(new google.maps.LatLng(taxi.lat, taxi.lng));
                } else {
                    markers[taxi.id] = new google.maps.Marker({
                        position: new google.maps.LatLng(taxi.lat, taxi.lng),
                        map,
                        title: `movil: ${taxi.id}`
                    });
                }

                markers[taxi.id].setLabel({
                    text: `Última actualización: ${new Date(taxi.lastUpdated).toLocaleTimeString()}`,
                    fontSize: "10px",
                    color: "#000000"
                });
            });
        })
        .catch(error => console.error("Error al cargar ubicaciones:", error));

    setTimeout(loadTaxiLocations, 10000);
}

// Iniciar el sistema al cargar la página
document.addEventListener("DOMContentLoaded", askUserId);
