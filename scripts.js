let map;
let userPosition = null;
let userId = null;
let markers = {};
let isAdmin = false;
let routePaths = {};
let trackingInterval = null;
let requestCheckInterval = null;
let markerTimeouts = {}; // Nuevo objeto para almacenar temporizadores por taxiId

const MAP_TIMEOUT = 3 * 60 * 1000; // 3 minutos en milisegundos

function askUserId() {
    const input = prompt("Ingrese su nombre (o 'admin' si es administrador):");
    
    if (!input) {
        alert("Debe ingresar un nombre.");
        return askUserId();
    }

    userId = input.trim().toLowerCase();
    isAdmin = userId === "admin";

    if (!isAdmin) {
        startTracking();
        addUpdateButton();
        startRequestCheck();
    }

    loadGoogleMaps();
}

function loadGoogleMaps(retries = 5) {
    if (typeof google !== "undefined") {
        initMap();
    } else if (retries > 0) {
        setTimeout(() => loadGoogleMaps(retries - 1), 500);
    } else {
        document.getElementById("status").textContent = "No se pudo cargar Google Maps.";
    }
}

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: -31.6300, lng: -60.7000 },
        zoom: 12,
    });

    loadTaxiLocations();
}

function getUserLocation(callback) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userPosition = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                callback(userPosition);
            },
            (error) => {
                console.error("Error al obtener la ubicación:", error);
                document.getElementById("status").textContent = "Error al obtener tu ubicación.";
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 10000
            }
        );
    } else {
        document.getElementById("status").textContent = "Geolocalización no soportada.";
    }
}

function sendLocation() {
    if (!userPosition || !userId) return;

    fetch("https://flota-cfj7.onrender.com/update-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            taxiId: userId,
            lat: userPosition.lat,
            lng: userPosition.lng,
        }),
    })
    .then(() => {
        loadTaxiLocations();
    })
    .catch((error) => {
        console.error("Error al enviar ubicación:", error);
        document.getElementById("status").textContent = "Error al enviar ubicación.";
    });
}

function startTracking() {
    getUserLocation((position) => {
        sendLocation();
        if (trackingInterval) clearInterval(trackingInterval);
        trackingInterval = setInterval(() => {
            getUserLocation(sendLocation);
        }, 10000);
    });
}

function addUpdateButton() {
    const container = document.querySelector(".container");
    const button = document.createElement("button");
    button.id = "updateLocationButton";
    button.innerText = "Actualizar Ubicación";
    button.onclick = () => {
        document.getElementById("status").textContent = "Solicitando ubicación...";
        getUserLocation((position) => {
            sendLocation();
            document.getElementById("status").textContent = "Ubicación actualizada.";
        });
    };
    container.appendChild(button);
}

function startRequestCheck() {
    if (requestCheckInterval) clearInterval(requestCheckInterval);
    requestCheckInterval = setInterval(() => {
        fetch(`https://flota-cfj7.onrender.com/check-request?taxiId=${userId}`)
            .then((response) => response.json())
            .then((data) => {
                if (data.requested) {
                    getUserLocation(sendLocation);
                }
            })
            .catch((error) => console.error("Error al verificar solicitud:", error));
    }, 10000);
}

function loadTaxiLocations() {
    document.getElementById("status").textContent = "Cargando ubicaciones...";
    fetch("https://flota-cfj7.onrender.com/get-location")
        .then((response) => response.json())
        .then((data) => {
            document.getElementById("status").textContent = "";
            if (!data || Object.keys(data).length === 0) return;

            // Limpiar marcadores antiguos (solo si no están en los nuevos datos)
            Object.keys(markers).forEach((taxiId) => {
                if (!data[taxiId]) {
                    markers[taxiId].setMap(null);
                    delete markers[taxiId];
                    clearTimeout(markerTimeouts[taxiId]); // Limpiar temporizador
                    delete markerTimeouts[taxiId];
                }
            });

            Object.entries(data).forEach(([taxiId, location]) => {
                if (!isAdmin && taxiId !== userId) return;

                // Actualizar o crear marcador
                if (markers[taxiId]) {
                    markers[taxiId].setPosition(new google.maps.LatLng(location.lat, location.lng));
                } else {
                    markers[taxiId] = new google.maps.Marker({
                        position: new google.maps.LatLng(location.lat, location.lng),
                        map,
                        title: `Taxi: ${taxiId}`,
                    });
                }

                // Limpiar temporizador anterior si existe
                if (markerTimeouts[taxiId]) {
                    clearTimeout(markerTimeouts[taxiId]);
                }

                // Calcular tiempo transcurrido desde la última actualización
                const lastUpdate = new Date(location.timestamp).getTime();
                const now = Date.now();
                const timeElapsed = now - lastUpdate;

                // Si han pasado más de 3 minutos, no mostramos el marcador
                if (timeElapsed >= MAP_TIMEOUT) {
                    markers[taxiId].setMap(null);
                    delete markers[taxiId];
                } else {
                    // Programar borrado del marcador después de 3 minutos desde la última actualización
                    const timeRemaining = MAP_TIMEOUT - timeElapsed;
                    markerTimeouts[taxiId] = setTimeout(() => {
                        if (markers[taxiId]) {
                            markers[taxiId].setMap(null);
                            delete markers[taxiId];
                            console.log(`Marcador de ${taxiId} borrado por inactividad`);
                        }
                    }, timeRemaining);
                }
            });

            showDriverMenu();
        })
        .catch((error) => {
            console.error("Error al cargar ubicaciones:", error);
            document.getElementById("status").textContent = "Error al cargar ubicaciones.";
        });

    setTimeout(loadTaxiLocations, 10000);
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function showDriverMenu() {
    fetch("https://flota-cfj7.onrender.com/get-location")
        .then((response) => response.json())
        .then((data) => {
            let menu = document.getElementById("driverMenu");
            menu.innerHTML = "";

            Object.entries(data).forEach(([taxiId, location]) => {
                const div = document.createElement("div");
                div.className = "driver-item";

                const routeButton = document.createElement("button");
                routeButton.innerText = `Taxi ${taxiId}`;
                routeButton.onclick = () => showRoute(taxiId);

                const timestampSpan = document.createElement("span");
                timestampSpan.className = "timestamp";
                timestampSpan.innerText = `Última actualización: ${formatTimestamp(location.timestamp)}`;

                div.appendChild(routeButton);
                if (isAdmin) {
                    const updateButton = document.createElement("button");
                    updateButton.className = "admin-update-button";
                    updateButton.innerText = "Actualizar";
                    updateButton.onclick = () => requestLocationUpdate(taxiId);
                    div.appendChild(updateButton);
                }
                div.appendChild(timestampSpan);
                menu.appendChild(div);
            });

            menu.style.display = "block";
        })
        .catch((error) => console.error("Error al cargar menú de choferes:", error));
}

function requestLocationUpdate(taxiId) {
    fetch("https://flota-cfj7.onrender.com/request-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taxiId }),
    })
    .then((response) => response.json())
    .then((data) => {
        document.getElementById("status").textContent = data.message;
        setTimeout(loadTaxiLocations, 2000);
    })
    .catch((error) => {
        console.error("Error al solicitar actualización:", error);
        document.getElementById("status").textContent = "Error al solicitar actualización.";
    });
}

function showRoute(taxiId) {
    fetch(`https://flota-cfj7.onrender.com/get-taxi-route?taxiId=${taxiId}`)
        .then((response) => response.json())
        .then((data) => {
            if (!data.route || data.route.length === 0) {
                console.log("No hay recorrido disponible para este taxi.");
                return;
            }

            if (routePaths[taxiId]) {
                routePaths[taxiId].setMap(null);
            }

            const path = new google.maps.Polyline({
                path: data.route.map((r) => new google.maps.LatLng(r.lat, r.lng)),
                geodesic: true,
                strokeColor: "#FF0000",
                strokeOpacity: 1.0,
                strokeWeight: 2,
                map: map,
            });

            routePaths[taxiId] = path;
        })
        .catch((error) => console.error("Error al cargar la ruta del taxi:", error));
}

document.addEventListener("DOMContentLoaded", askUserId);