let map;
let geocoder;
let placesService;
const MAX_PLACES_TO_DISPLAY = 5;
const API_URL = 'https://your-app-name.adaptable.app';

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 42.4085253, lng: -71.1183164 },
        zoom: 15,
    });

    geocoder = new google.maps.Geocoder();
    placesService = new google.maps.places.PlacesService(map);

    document.getElementById('find-places-btn').addEventListener('click', findNearbyPlaces);

    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
        fetchUserInfo(token);
    }
    updateUI();
}

function findNearbyPlaces() {
    const location = document.getElementById('location').value.trim();
    const placeType = document.getElementById('place-type').value;

    if (!location) {
        alert('Please enter a location');
        return;
    }

    geocodeAddress(location, function(center) {
        const request = {
            location: center,
            radius: '5000',
            type: [placeType],
            rankBy: google.maps.places.RankBy.PROMINENCE
        };

        placesService.nearbySearch(request, function(results, status) {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                displayNearbyPlaces(results.slice(0, MAX_PLACES_TO_DISPLAY));
                map.setCenter(center);
            } else {
                alert('Places search failed due to ' + status);
            }
        });
    });
}

function geocodeAddress(address, callback) {
    geocoder.geocode({ 'address': address }, function(results, status) {
        if (status === 'OK') {
            callback(results[0].geometry.location);
        } else {
            alert('Geocode was not successful for the following reason: ' + status);
        }
    });
}

function displayNearbyPlaces(places) {
    const placesList = document.getElementById('places-list');
    placesList.innerHTML = `<h2>Top ${MAX_PLACES_TO_DISPLAY} Nearby Places:</h2>`;
    
    places.forEach((place) => {
        const placeItem = document.createElement('div');
        placeItem.className = 'place-item';
        placeItem.innerHTML = `
            <h3>${place.name}</h3>
            <p>Rating: ${place.rating || 'N/A'}</p>
            <p>Address: ${place.vicinity || 'N/A'}</p>
        `;
        
        // Create and append the save button
        const saveButton = createSaveButton({
            name: place.name,
            address: place.vicinity,
            placeId: place.place_id
        });
        placeItem.appendChild(saveButton);

        placesList.appendChild(placeItem);

        new google.maps.Marker({
            position: place.geometry.location,
            map: map,
            title: place.name
        });
    });
}

function createSaveButton(place) {
    const button = document.createElement('button');
    button.textContent = 'Save Place';
    button.className = 'save-button';
    button.onclick = () => savePlace(place);
    return button;
}

function savePlace(place) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please log in to save places');
        return;
    }

    fetch('http://localhost:3000/places/save', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(place)
    })
    .then(response => response.text())
    .then(message => alert(message))
    .catch(error => console.error('Error:', error));
}

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        localStorage.setItem('token', data.token);
        fetchUserInfo(data.token);
    })
    .catch(error => console.error('Error:', error));
}

function register() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.text())
    .then(message => {
        alert(message);
        if (message === 'User registered successfully') {
            login();
        }
    })
    .catch(error => console.error('Error:', error));
}

function logout() {
    localStorage.removeItem('token');
    updateUI();
}

function fetchUserInfo(token) {
    fetch('http://localhost:3000/auth/user', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(user => updateUI(user))
    .catch(error => {
        console.error('Error:', error);
        localStorage.removeItem('token');
        updateUI();
    });
}

function updateUI(user) {
    const loginForm = document.getElementById('login-form');
    const userInfo = document.getElementById('user-info');
    const loggedUser = document.getElementById('logged-user');

    if (user) {
        loginForm.style.display = 'none';
        userInfo.style.display = 'block';
        loggedUser.textContent = user.username;
    } else {
        loginForm.style.display = 'block';
        userInfo.style.display = 'none';
        loggedUser.textContent = '';
    }
}

window.initMap = initMap;