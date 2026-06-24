document.addEventListener('DOMContentLoaded', () => {
  const loadingOverlay = document.getElementById('loadingOverlay');
  const searchInput = document.getElementById('searchInput');
  const locationBadge = document.getElementById('locationBadge');
  const darkModeToggle = document.getElementById('darkModeToggle');
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    darkModeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
  }

  darkModeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
      darkModeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      darkModeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
  });

  function updateTime() {
    const now = new Date();
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    document.getElementById('currentTime').textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  updateTime();
  setInterval(updateTime, 1000); 

  function getWeatherMapping(code) {
    if (code === 0) return { icon: 'fa-sun', text: 'Clear' };
    if (code >= 1 && code <= 3) return { icon: 'fa-cloud-sun', text: 'Cloudy' };
    if (code >= 45 && code <= 48) return { icon: 'fa-smog', text: 'Fog' };
    if (code >= 51 && code <= 67) return { icon: 'fa-cloud-rain', text: 'Rain' };
    if (code >= 71 && code <= 77) return { icon: 'fa-snowflake', text: 'Snow' };
    if (code >= 95 && code <= 99) return { icon: 'fa-cloud-bolt', text: 'Storm' };
    return { icon: 'fa-cloud', text: 'Cloudy' };
  }

  async function fetchWeatherByLocation(lat, lon, providedCityName = null) {
    loadingOverlay.classList.remove('hidden');
    try {
      if (!providedCityName) {
        const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
        const geoData = await geoRes.json();
        document.getElementById('cityName').textContent = geoData.city || geoData.locality || "Unknown Location";
      } else {
        document.getElementById('cityName').textContent = providedCityName;
      }

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,precipitation_probability,wind_speed_10m,relative_humidity_2m,weather_code&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
      const weatherRes = await fetch(weatherUrl);
      const data = await weatherRes.json();

      const currentMapping = getWeatherMapping(data.current.weather_code);
      document.getElementById('currentTemp').textContent = Math.round(data.current.temperature_2m);
      document.getElementById('weatherDesc').textContent = currentMapping.text;
      document.getElementById('mainIcon').className = `fa-solid ${currentMapping.icon} weather-icon-large`; 
      document.getElementById('feelsLike').textContent = Math.round(data.current.apparent_temperature);
      document.getElementById('windSpeed').textContent = Math.round(data.current.wind_speed_10m);
      document.getElementById('humidity').textContent = Math.round(data.current.relative_humidity_2m);
      document.getElementById('rainChance').textContent = data.current.precipitation_probability || 0;

      const hourlyContainer = document.getElementById('hourlyForecast');
      hourlyContainer.innerHTML = '';
      const currentHour = new Date().getHours();
      
      for (let i = currentHour; i < currentHour + 12; i += 1) { 
        let timeStr = new Date(data.hourly.time[i]).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).replace(':00', '');
        if (i === currentHour) timeStr = 'Now'; 
        let temp = Math.round(data.hourly.temperature_2m[i]);
        let iconClass = getWeatherMapping(data.hourly.weather_code[i]).icon;

        hourlyContainer.innerHTML += `
          <div class="hour-item">
            <span class="hour-time">${timeStr}</span>
            <i class="fa-solid ${iconClass} hour-icon"></i>
            <span class="hour-temp">${temp}°</span>
          </div>
        `;
      }

      const dailyContainer = document.getElementById('dailyForecast');
      dailyContainer.innerHTML = '';
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      for (let i = 0; i < 7; i++) {
        let date = new Date(data.daily.time[i]);
        let dayName = i === 0 ? 'Today' : days[date.getDay()];
        let maxTemp = Math.round(data.daily.temperature_2m_max[i]);
        let minTemp = Math.round(data.daily.temperature_2m_min[i]);
        let dailyMapping = getWeatherMapping(data.daily.weather_code[i]);

        dailyContainer.innerHTML += `
          <div class="day-row">
            <span class="day-name">${dayName}</span>
            <i class="fa-solid ${dailyMapping.icon} day-icon"></i>
            <div class="day-temps">${maxTemp}° <span>/ ${minTemp}°</span></div>
          </div>
        `;
      }

      loadingOverlay.classList.add('hidden');
    } catch (error) {
      console.error("Error:", error);
      loadingOverlay.innerHTML = `<p>Failed to load data. Please refresh.</p>`;
    }
  }

  searchInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim();
      if (query) {
        loadingOverlay.classList.remove('hidden');
        try {
          const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=1&language=en&format=json`;
          const response = await fetch(geoUrl);
          const data = await response.json();

          if (data.results && data.results.length > 0) {
            const { latitude, longitude, name } = data.results[0];
            fetchWeatherByLocation(latitude, longitude, name);
            searchInput.value = ''; // تفريغ الحقل بعد البحث
          } else {
            alert("City not found!");
            loadingOverlay.classList.add('hidden');
          }
        } catch (error) {
          console.error("Search error:", error);
          loadingOverlay.classList.add('hidden');
        }
      }
    }
  });

  function getAutoLocation() {
    loadingOverlay.classList.remove('hidden');
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => fetchWeatherByLocation(position.coords.latitude, position.coords.longitude),
        (error) => fetchWeatherByLocation(30.0444, 31.2357, 'Cairo') // القاهرة افتراضياً لو رفض
      );
    } else {
      fetchWeatherByLocation(30.0444, 31.2357, 'Cairo');
    }
  }

  getAutoLocation();

  locationBadge.addEventListener('click', getAutoLocation);
});