let trackingInterval = null;
let map;
let userMarker = null;  // Marcador del usuario en el mapa
let userPosition = null;  // Guardar la posición del usuario

// Función para inicializar el mapa
function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: -31.6300, lng: -60.7000 }, // Ubicación inicial en Santa Fe, Argentina
        zoom: 12
    });

    loadTaxiLocations();  // Cargar ubicaciones de los taxis al iniciar el mapa
}

// Obtener ubicación del usuario y enviarla al servidor
function getLocationAndSend() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            userPosition = { lat, lng };

            // Enviar la ubicación al servidor
            fetch('https://flota-cfj7.onrender.com/update-taxi-location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taxiId: localStorage.getItem('taxiId') || 'taxi1', // Se usa un ID único
                    lat,
                    lng
                })
            }).then(response => {
                if (response.ok) {
                    console.log('Ubicación enviada correctamente');
                } else {
                    console.error('Error al enviar la ubicación');
                }
            });

            // Actualizar marcador en el mapa
            if (!userMarker) {
                userMarker = new google.maps.Marker({
                    position: { lat, lng },
                    map,
                    title: 'Mi ubicación',
                    icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                });
            } else {
                userMarker.setPosition({ lat, lng });
            }

            // Centrar el mapa en la nueva ubicación
            map.setCenter({ lat, lng });
        }, error => {
            console.error('Error al obtener la ubicación', error);
        });
    } else {
        console.error('Geolocalización no soportada en este navegador.');
    }
}

// Iniciar seguimiento automático cada 10 segundos
function startTracking() {
    if (!trackingInterval) {
        getLocationAndSend();  // Primera actualización inmediata
        trackingInterval = setInterval(getLocationAndSend, 10000); // Luego cada 10 segundos
    }
}

// Cargar ubicaciones de los taxis en el mapa
function loadTaxiLocations() {
    fetch('https://flota-cfj7.onrender.com/get-taxi-locations')
        .then(response => response.json())
        .then(data => {
            data.forEach(taxi => {
                new google.maps.Marker({
                    position: { lat: taxi.lat, lng: taxi.lng },
                    map,
                    title: `Taxi ${taxi.id}`
                });
            });
        })
        .catch(error => {
            console.error('Error al cargar ubicaciones de taxis:', error);
        });
}

// Pedir nombre al usuario para identificar el taxi
function askTaxiId() {
    let taxiId = localStorage.getItem('taxiId');
    if (!taxiId) {
        taxiId = prompt("Ingrese su nombre o ID de taxi:");
        if (taxiId) {
            localStorage.setItem('taxiId', taxiId);
        }
    }
}

// Inicializar la app cuando se carga la página
document.addEventListener('DOMContentLoaded', function () {
    askTaxiId();  // Pregunta el ID del taxi solo una vez
    initMap();
    startTracking();
});
