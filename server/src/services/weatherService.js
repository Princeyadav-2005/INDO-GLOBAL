const fetch = require('node-fetch');

// Approximate coordinates lookup for major Indian districts / agricultural hubs
const DISTRICT_COORDINATES = {
  // Maharashtra
  pune: { lat: 18.5204, lon: 73.8567, location: 'Pune, Maharashtra' },
  nashik: { lat: 19.9975, lon: 73.7898, location: 'Nashik, Maharashtra' },
  nagpur: { lat: 21.1458, lon: 79.0882, location: 'Nagpur, Maharashtra' },
  aurangabad: { lat: 19.8762, lon: 75.3433, location: 'Chhatrapati Sambhaji Nagar, Maharashtra' },
  solapur: { lat: 17.6599, lon: 75.9064, location: 'Solapur, Maharashtra' },
  kolhapur: { lat: 16.7050, lon: 74.2433, location: 'Kolhapur, Maharashtra' },
  mumbai: { lat: 19.0760, lon: 72.8777, location: 'Mumbai, Maharashtra' },

  // Punjab & Haryana
  ludhiana: { lat: 30.9010, lon: 75.8573, location: 'Ludhiana, Punjab' },
  amritsar: { lat: 31.6340, lon: 74.8723, location: 'Amritsar, Punjab' },
  jalandhar: { lat: 31.3260, lon: 75.5762, location: 'Jalandhar, Punjab' },
  karnal: { lat: 29.6857, lon: 76.9905, location: 'Karnal, Haryana' },
  hisar: { lat: 29.1492, lon: 75.7217, location: 'Hisar, Haryana' },

  // Uttar Pradesh
  lucknow: { lat: 26.8467, lon: 80.9462, location: 'Lucknow, Uttar Pradesh' },
  kanpur: { lat: 26.4499, lon: 80.3319, location: 'Kanpur, Uttar Pradesh' },
  varanasi: { lat: 25.3176, lon: 82.9739, location: 'Varanasi, Uttar Pradesh' },
  agra: { lat: 27.1767, lon: 78.0081, location: 'Agra, Uttar Pradesh' },
  meerut: { lat: 28.9845, lon: 77.7064, location: 'Meerut, Uttar Pradesh' },

  // Madhya Pradesh
  bhopal: { lat: 23.2599, lon: 77.4126, location: 'Bhopal, Madhya Pradesh' },
  indore: { lat: 22.7196, lon: 75.8577, location: 'Indore, Madhya Pradesh' },
  ujjain: { lat: 23.1765, lon: 75.7885, location: 'Ujjain, Madhya Pradesh' },
  jabalpur: { lat: 23.1815, lon: 79.9864, location: 'Jabalpur, Madhya Pradesh' },

  // Rajasthan
  jaipur: { lat: 26.9124, lon: 75.7873, location: 'Jaipur, Rajasthan' },
  jodhpur: { lat: 26.2389, lon: 73.0243, location: 'Jodhpur, Rajasthan' },
  kota: { lat: 25.2138, lon: 75.8648, location: 'Kota, Rajasthan' },
  ganganagar: { lat: 29.9038, lon: 73.8772, location: 'Sri Ganganagar, Rajasthan' },

  // Gujarat
  ahmedabad: { lat: 23.0225, lon: 72.5714, location: 'Ahmedabad, Gujarat' },
  surat: { lat: 21.1702, lon: 72.8311, location: 'Surat, Gujarat' },
  rajkot: { lat: 22.3039, lon: 70.8022, location: 'Rajkot, Gujarat' },
  vadodara: { lat: 22.3072, lon: 73.1812, location: 'Vadodara, Gujarat' },

  // South India
  bengaluru: { lat: 12.9716, lon: 77.5946, location: 'Bengaluru, Karnataka' },
  hyderabad: { lat: 17.3850, lon: 78.4867, location: 'Hyderabad, Telangana' },
  chennai: { lat: 13.0827, lon: 80.2707, location: 'Chennai, Tamil Nadu' },
  coimbatore: { lat: 11.0168, lon: 76.9558, location: 'Coimbatore, Tamil Nadu' },

  // East & Delhi
  delhi: { lat: 28.6139, lon: 77.2090, location: 'New Delhi, Delhi' },
  patna: { lat: 25.5941, lon: 85.1376, location: 'Patna, Bihar' },
  kolkata: { lat: 22.5726, lon: 88.3639, location: 'Kolkata, West Bengal' }
};

const getWeatherDescription = (code) => {
  const codes = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snowfall',
    73: 'Moderate snowfall',
    75: 'Heavy snowfall',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
  };
  return codes[code] || 'Varied conditions';
};

const getWeather = async ({ lat, lon, location }) => {
  try {
    let targetLat = lat ? parseFloat(lat) : null;
    let targetLon = lon ? parseFloat(lon) : null;
    let resolvedLocation = location || 'Current Location';

    if ((!targetLat || !targetLon) && location) {
      const normalized = location.toLowerCase().trim();
      const match = DISTRICT_COORDINATES[normalized] || Object.values(DISTRICT_COORDINATES).find(
        (d) => d.location.toLowerCase().includes(normalized)
      );

      if (match) {
        targetLat = match.lat;
        targetLon = match.lon;
        resolvedLocation = match.location;
      }
    }

    // Fallback to New Delhi if still no coords
    if (!targetLat || !targetLon) {
      targetLat = 28.6139;
      targetLon = 77.2090;
      resolvedLocation = 'New Delhi, India (Default)';
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode&timezone=Asia/Kolkata&forecast_days=7`;

    const response = await fetch(url, { timeout: 10000 });
    if (!response.ok) {
      throw new Error(`Open-Meteo HTTP ${response.status}`);
    }

    const data = await response.json();

    const current = data.current_weather ? {
      temperature: data.current_weather.temperature,
      windspeed: data.current_weather.windspeed,
      weathercode: data.current_weather.weathercode,
      condition: getWeatherDescription(data.current_weather.weathercode),
      time: data.current_weather.time
    } : null;

    const forecast = [];
    if (data.daily && Array.isArray(data.daily.time)) {
      for (let i = 0; i < data.daily.time.length; i++) {
        const code = data.daily.weathercode ? data.daily.weathercode[i] : 0;
        forecast.push({
          date: data.daily.time[i],
          tempMax: data.daily.temperature_2m_max ? data.daily.temperature_2m_max[i] : null,
          tempMin: data.daily.temperature_2m_min ? data.daily.temperature_2m_min[i] : null,
          precipitationSum: data.daily.precipitation_sum ? data.daily.precipitation_sum[i] : 0,
          windspeedMax: data.daily.windspeed_10m_max ? data.daily.windspeed_10m_max[i] : null,
          weathercode: code,
          condition: getWeatherDescription(code)
        });
      }
    }

    return {
      current,
      forecast,
      location: resolvedLocation,
      coordinates: {
        lat: targetLat,
        lon: targetLon
      }
    };
  } catch (err) {
    console.error('[WeatherService] Error:', err.message);
    return {
      error: 'Weather service unavailable'
    };
  }
};

module.exports = {
  getWeather
};
