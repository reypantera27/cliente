let trackingInterval = null;
let map;  // Se mantiene la referencia al mapa
let userPosition = null;  // Guardar la posición del usuario para que no se vuelva a pedir

// Función para inicializar el mapa
function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: -31.6300, lng: -60.7000 }, // Ubicación inicial en Santa Fe, Argentina
        zoom: 12
    });

    // Cargar las ubicaciones de los taxis al cargar el mapa
    loadTaxiLocations();
}

// Función para obtener las ubicaciones de los taxis desde el servidor
function loadTaxiLocations() {
    fetch('https://flota-cfj7.onrender.com/get-taxi-locations')
        .then(response => response.json())
        .then(data => {
            // Agregar un marcador para cada taxi en el mapa
            data.forEach(taxi => {
                new google.maps.Marker({
                    position: { lat: taxi.lat, lng: taxi.lng },
                    map,
                    title: `Taxi ${taxi.id}`
                });
            });
        })
        .catch(error => {
            console.error('Error al cargar las ubicaciones de los taxis:', error);
        });
}

// Función para obtener la ubicación y enviarla al servidor
function getLocationAndSend() {
    if (userPosition) {
        // Usar las coordenadas obtenidas previamente
        const lat = userPosition.latitude;
        const lng = userPosition.longitude;

        // Enviar la ubicación al servidor
        fetch('https://flota-cfj7.onrender.com/update-taxi-location', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                taxiId: 'taxi1', // Usa un ID único por taxi
                lat: lat,
                lng: lng
            })
        }).then(response => {
            if (response.ok) {
                console.log('Ubicación enviada correctamente');
            } else {
                console.error('Error al enviar la ubicación');
            }
        });

        // Mostrar la ubicación en el mapa
        const taxiMarker = new google.maps.Marker({
            position: { lat, lng },
            map,
            title: 'Mi ubicación'
        });
        map.setCenter({ lat, lng });
    } else {
        console.error("La ubicación aún no ha sido obtenida.");
    }
}

// Función para obtener la ubicación del usuario
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            // Guardar las coordenadas del usuario
            userPosition = position.coords;
            console.log('Ubicación obtenida:', userPosition);  // Verifica en la consola

            // Iniciar el seguimiento solo después de obtener la ubicación
            startTracking();
        }, function(error) {
            console.error('Error al obtener la ubicación', error);
        });
    } else {
        console.error('La geolocalización no es compatible con este navegador.');
    }
}

// Función para iniciar el seguimiento del taxi
function startTracking() {
    if (!trackingInterval && userPosition) {
        trackingInterval = setInterval(getLocationAndSend, 10000); // Usa las coordenadas obtenidas y las envía cada 10 segundos
        document.getElementById('status').textContent = 'Seguimiento iniciado.';
    }
}

// Inicializa el mapa y comienza a hacer seguimiento automáticamente al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    initMap();  // Inicializa el mapa
    getUserLocation();  // Obtén la ubicación del usuario una sola vez
});
