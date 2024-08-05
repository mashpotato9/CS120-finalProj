let map;
let geocoder;
let placesService;
const MAX_PLACES_TO_DISPLAY = 5;
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'https://itinerary-app.adaptable.app';

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 42.4085253, lng: -71.1183164 },
        zoom: 15,
    });

    geocoder = new google.maps.Geocoder();
    placesService = new google.maps.places.PlacesService(map);

    document.getElementById('find-places-btn').addEventListener('click', findNearbyPlaces);

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
    button.onclick = function(event) {  
        savePlace(place, event); 
    };
    return button;
}

function savePlace(place, event) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please log in to save places');
        return;
    }

    fetch(`${API_URL}/places/save`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(place)
    })
    .then(response => response.text())
    .then(message => {
        alert(message);
        if (event && event.target) {  
            const saveButton = event.target;
            saveButton.textContent = 'Saved!';
            saveButton.disabled = true;
        }
    })
    .catch(error => console.error('Error:', error));
}

document.getElementById('view-saved-places-btn').addEventListener('click', function() {
    const savedPlacesList = document.getElementById('saved-places-list');
    if (savedPlacesList.style.display === 'none') {
        fetchSavedPlaces();
        this.textContent = 'View Search Results';
    } else {
        showRegularPlaces();
        this.textContent = 'View Saved Places';
    }
});

function showRegularPlaces() {
    const savedPlacesList = document.getElementById('saved-places-list');
    const placesList = document.getElementById('places-list');

    savedPlacesList.style.display = 'none';
    placesList.style.display = 'block';
}

function fetchSavedPlaces() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please log in to view saved places');
        return;
    }

    fetch(`${API_URL}/places/saved`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch saved places');
        }
        return response.json();
    })
    .then(places => {
        displaySavedPlaces(places);
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to fetch saved places. Please try again.');
    });
}

function displaySavedPlaces(places) {
    const savedPlacesList = document.getElementById('saved-places-list');
    const placesList = document.getElementById('places-list');
    
    if (!savedPlacesList) {
        console.error('Saved places list element not found');
        return;
    }

    savedPlacesList.innerHTML = '<h2>Your Saved Places:</h2>';
    
    if (places.length === 0) {
        savedPlacesList.innerHTML += '<p>You have no saved places yet.</p>';
    } else {
        places.forEach(place => {
            const placeItem = document.createElement('div');
            placeItem.className = 'place-item';
            placeItem.innerHTML = `
                <h3>${place.name}</h3>
                <p>Address: ${place.address || 'N/A'}</p>
            `;
            
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => deletePlace(place._id);
            placeItem.appendChild(deleteButton);
            
            savedPlacesList.appendChild(placeItem);
        });
    }

    placesList.style.display = 'none';
    savedPlacesList.style.display = 'block';
}

function deletePlace(placeId) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please log in to delete places');
        return;
    }

    fetch(`${API_URL}/places/delete/${placeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to delete place');
        }
        return response.text();
    })
    .then(message => {
        alert(message);
        fetchSavedPlaces();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to delete place. Please try again.');
    });
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

    fetch(`${API_URL}/auth/register`, {
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
    clearSavedPlaces();
}

function clearSavedPlaces() {
    const savedPlacesList = document.getElementById('saved-places-list');
    savedPlacesList.innerHTML = '';
    savedPlacesList.style.display = 'none';
    
    const placesList = document.getElementById('places-list');
    placesList.style.display = 'block';
    
    const viewSavedPlacesBtn = document.getElementById('view-saved-places-btn');
    viewSavedPlacesBtn.textContent = 'View Saved Places';
}

function fetchUserInfo(token) {
    fetch(`${API_URL}/auth/user`, {
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
    const viewSavedPlacesBtn = document.getElementById('view-saved-places-btn');

    if (user) {
        loginForm.style.display = 'none';
        userInfo.style.display = 'block';
        loggedUser.textContent = user.username;
        viewSavedPlacesBtn.style.display = 'inline-block'; 
    } else {
        loginForm.style.display = 'block';
        userInfo.style.display = 'none';
        loggedUser.textContent = '';
        viewSavedPlacesBtn.style.display = 'none';
    }
}

window.initMap = initMap;