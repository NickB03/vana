/**
 * Improved Sample Artifacts Using Real APIs
 *
 * These artifacts showcase real-world API integration with the whitelisted domains.
 * Each demonstrates a different category of API usage.
 */

export const IMPROVED_API_SAMPLES = {
  /**
   * 1. Pokemon Explorer (Gaming API)
   * Demonstrates: PokeAPI integration, image loading, search, Recharts
   */
  pokemonExplorer: `const { useState, useEffect } = React;
import { Search, Zap, Heart, Shield, Sword } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function App() {
  const [pokemon, setPokemon] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("pikachu");

  const fetchPokemon = async (name) => {
    setLoading(true);
    try {
      const res = await fetch(\`https://pokeapi.co/api/v2/pokemon/\${name.toLowerCase()}\`);
      const data = await res.json();
      setPokemon(data);
    } catch (err) {
      alert("Pokemon not found!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPokemon(search);
  }, []);

  const stats = pokemon?.stats.map(s => ({
    name: s.stat.name.replace('-', ' '),
    value: s.base_stat
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold text-white mb-8 text-center">
          Pokédex Explorer
        </h1>

        {/* Search */}
        <div className="mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchPokemon(search)}
              placeholder="Enter Pokemon name or ID..."
              className="flex-1 px-6 py-4 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl text-white placeholder-white/60 text-lg focus:outline-none focus:border-yellow-400"
            />
            <button
              onClick={() => fetchPokemon(search)}
              className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-xl transition-colors flex items-center gap-2"
            >
              <Search className="w-5 h-5" />
              Search
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center text-white text-xl">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-yellow-400 border-t-transparent mb-4"></div>
            <p>Loading Pokemon...</p>
          </div>
        )}

        {pokemon && !loading && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Pokemon Card */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 border-white/20">
              <div className="text-center mb-6">
                <img
                  src={pokemon.sprites.other['official-artwork'].front_default}
                  alt={pokemon.name}
                  className="w-64 h-64 mx-auto drop-shadow-2xl"
                />
                <h2 className="text-4xl font-bold text-white capitalize mt-4">
                  {pokemon.name}
                </h2>
                <p className="text-white/60 text-lg">#{pokemon.id.toString().padStart(3, '0')}</p>
              </div>

              <div className="flex justify-center gap-2 mb-6">
                {pokemon.types.map((t) => (
                  <span
                    key={t.type.name}
                    className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 font-semibold rounded-full capitalize"
                  >
                    {t.type.name}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-red-500/20 rounded-lg p-4">
                  <Heart className="w-6 h-6 text-red-400 mx-auto mb-2" />
                  <p className="text-white/60 text-sm">HP</p>
                  <p className="text-white font-bold text-xl">{stats[0]?.value}</p>
                </div>
                <div className="bg-yellow-500/20 rounded-lg p-4">
                  <Sword className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                  <p className="text-white/60 text-sm">Attack</p>
                  <p className="text-white font-bold text-xl">{stats[1]?.value}</p>
                </div>
                <div className="bg-blue-500/20 rounded-lg p-4">
                  <Shield className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-white/60 text-sm">Defense</p>
                  <p className="text-white font-bold text-xl">{stats[2]?.value}</p>
                </div>
              </div>
            </div>

            {/* Stats Chart */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 border-white/20">
              <h3 className="text-2xl font-bold text-white mb-6">Base Stats</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats}>
                  <XAxis dataKey="name" stroke="#fff" angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#fff" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="value" fill="#fbbf24" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-6">
                <h4 className="text-lg font-semibold text-white mb-3">Abilities</h4>
                <div className="space-y-2">
                  {pokemon.abilities.map((a) => (
                    <div key={a.ability.name} className="bg-white/5 rounded-lg px-4 py-2">
                      <span className="text-yellow-400 capitalize">
                        {a.ability.name.replace('-', ' ')}
                      </span>
                      {a.is_hidden && (
                        <span className="ml-2 text-xs bg-purple-500 px-2 py-1 rounded-full">
                          Hidden
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}`,

  /**
   * 2. Global Weather Dashboard (Weather API)
   * Demonstrates: Open-Meteo API, geolocation, charts, animations
   */
  weatherDashboard: `const { useState, useEffect } = React;
import { Cloud, CloudRain, Sun, Wind, Droplets, Eye } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

export default function App() {
  const [weather, setWeather] = useState(null);
  const [city, setCity] = useState("New York");
  const [loading, setLoading] = useState(false);

  const cities = [
    { name: "New York", lat: 40.7128, lon: -74.006 },
    { name: "London", lat: 51.5074, lon: -0.1278 },
    { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
    { name: "Sydney", lat: -33.8688, lon: 151.2093 },
    { name: "Paris", lat: 48.8566, lon: 2.3522 },
  ];

  const fetchWeather = async (cityName) => {
    setLoading(true);
    const location = cities.find(c => c.name === cityName);
    try {
      const res = await fetch(
        \`https://api.open-meteo.com/v1/forecast?latitude=\${location.lat}&longitude=\${location.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m&timezone=auto\`
      );
      const data = await res.json();
      setWeather(data);
    } catch (err) {
      alert("Failed to fetch weather");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(city);
  }, [city]);

  const hourlyData = weather?.hourly.temperature_2m.slice(0, 24).map((temp, i) => ({
    hour: new Date(weather.hourly.time[i]).getHours() + ":00",
    temp: Math.round(temp)
  })) || [];

  const getWeatherIcon = (code) => {
    if (code === 0) return <Sun className="w-24 h-24 text-yellow-400" />;
    if (code < 3) return <Cloud className="w-24 h-24 text-gray-400" />;
    return <CloudRain className="w-24 h-24 text-blue-400" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 p-8">
      <div className="max-w-6xl mx-auto">
        <motion.h1
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-5xl font-bold text-white mb-8 text-center drop-shadow-lg"
        >
          🌍 Global Weather Dashboard
        </motion.h1>

        {/* City Selector */}
        <div className="flex justify-center gap-4 mb-8 flex-wrap">
          {cities.map((c) => (
            <button
              key={c.name}
              onClick={() => setCity(c.name)}
              className={\`px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 \${
                city === c.name
                  ? 'bg-white text-blue-600 shadow-xl'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }\`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center text-white text-2xl">
            <div className="inline-block animate-bounce mb-4">☁️</div>
            <p>Fetching weather data...</p>
          </div>
        )}

        {weather && !loading && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Current Weather */}
            <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-12 mb-8 border-2 border-white/30">
              <div className="grid md:grid-cols-2 gap-12">
                <div className="text-center">
                  {getWeatherIcon(weather.current.weather_code)}
                  <h2 className="text-7xl font-bold text-white mt-6">
                    {Math.round(weather.current.temperature_2m)}°C
                  </h2>
                  <p className="text-white/80 text-2xl mt-2">{city}</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white/10 rounded-2xl p-6 text-center">
                    <Wind className="w-12 h-12 text-white mx-auto mb-3" />
                    <p className="text-white/70">Wind Speed</p>
                    <p className="text-white text-3xl font-bold">
                      {Math.round(weather.current.wind_speed_10m)} km/h
                    </p>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-6 text-center">
                    <Droplets className="w-12 h-12 text-white mx-auto mb-3" />
                    <p className="text-white/70">Humidity</p>
                    <p className="text-white text-3xl font-bold">
                      {weather.current.relative_humidity_2m}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 24-Hour Forecast */}
            <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-8 border-2 border-white/30">
              <h3 className="text-3xl font-bold text-white mb-6">24-Hour Forecast</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={hourlyData}>
                  <XAxis dataKey="hour" stroke="#fff" />
                  <YAxis stroke="#fff" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e3a8a', border: 'none', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="temp"
                    stroke="#fbbf24"
                    strokeWidth={3}
                    dot={{ fill: '#fbbf24', r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}`,

  /**
   * 3. Country Explorer (Geography API)
   * Demonstrates: REST Countries API, search, filtering, responsive design
   */
  countryExplorer: `const { useState, useEffect } = React;
import { Search, Users, Globe, MapPin, DollarSign } from "lucide-react";

export default function App() {
  const [countries, setCountries] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all')
      .then(res => res.json())
      .then(data => {
        setCountries(data);
        setFiltered(data);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let result = countries;

    if (region !== "all") {
      result = result.filter(c => c.region === region);
    }

    if (search) {
      result = result.filter(c =>
        c.name.common.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFiltered(result.slice(0, 50)); // Limit to 50 for performance
  }, [search, region, countries]);

  const regions = ["all", "Africa", "Americas", "Asia", "Europe", "Oceania"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-bold text-white mb-8 text-center">
          🌍 World Country Explorer
        </h1>

        {/* Controls */}
        <div className="mb-8 grid md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search countries..."
              className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-pink-400"
            />
          </div>

          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="px-4 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-xl text-white focus:outline-none focus:border-pink-400"
          >
            {regions.map(r => (
              <option key={r} value={r} className="bg-gray-900">
                {r === "all" ? "All Regions" : r}
              </option>
            ))}
          </select>
        </div>

        <p className="text-white/80 text-center mb-6">
          Showing {filtered.length} countries
        </p>

        {loading && (
          <div className="text-center text-white text-xl">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-pink-400 border-t-transparent mb-4"></div>
            <p>Loading countries...</p>
          </div>
        )}

        {/* Country Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((country) => (
            <div
              key={country.cca3}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-white/20 hover:bg-white/20 transition-all hover:scale-105 cursor-pointer"
            >
              <img
                src={country.flags.svg}
                alt={country.name.common}
                className="w-full h-40 object-cover rounded-xl mb-4 shadow-lg"
              />

              <h3 className="text-2xl font-bold text-white mb-2">
                {country.name.common}
              </h3>

              <div className="space-y-2 text-white/90">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-pink-400" />
                  <span className="text-sm">{country.region} • {country.subregion || 'N/A'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-sm">
                    {country.population.toLocaleString()} people
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-green-400" />
                  <span className="text-sm">
                    {country.capital?.[0] || 'No capital'}
                  </span>
                </div>

                {country.currencies && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm">
                      {Object.values(country.currencies)[0]?.name || 'N/A'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}`,

  /**
   * 4. Crypto Tracker (Finance API)
   * Demonstrates: CoinGecko API, real-time data, price changes, responsive tables
   */
  cryptoTracker: `const { useState, useEffect } = React;
import { TrendingUp, TrendingDown, RefreshCw, DollarSign } from "lucide-react";

export default function App() {
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchCrypto = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&sparkline=false&price_change_percentage=24h'
      );
      const data = await res.json();
      setCoins(data);
      setLastUpdate(new Date());
    } catch (err) {
      alert("Failed to fetch crypto data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrypto();
    const interval = setInterval(fetchCrypto, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price) => {
    if (price >= 1) return \`$\${price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\`;
    return \`$\${price.toFixed(6)}\`;
  };

  const formatMarketCap = (cap) => {
    if (cap >= 1e12) return \`$\${(cap / 1e12).toFixed(2)}T\`;
    if (cap >= 1e9) return \`$\${(cap / 1e9).toFixed(2)}B\`;
    if (cap >= 1e6) return \`$\${(cap / 1e6).toFixed(2)}M\`;
    return \`$\${cap.toLocaleString()}\`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-5xl font-bold text-white">
            💎 Crypto Price Tracker
          </h1>
          <button
            onClick={fetchCrypto}
            disabled={loading}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={\`w-5 h-5 \${loading ? 'animate-spin' : ''}\`} />
            Refresh
          </button>
        </div>

        <p className="text-white/70 text-sm mb-6">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </p>

        {loading && coins.length === 0 && (
          <div className="text-center text-white text-xl">
            <div className="inline-block animate-bounce mb-4">💰</div>
            <p>Loading cryptocurrency data...</p>
          </div>
        )}

        {/* Desktop Table */}
        <div className="hidden md:block bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden border-2 border-white/20">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-white font-semibold">#</th>
                <th className="px-6 py-4 text-left text-white font-semibold">Coin</th>
                <th className="px-6 py-4 text-right text-white font-semibold">Price</th>
                <th className="px-6 py-4 text-right text-white font-semibold">24h Change</th>
                <th className="px-6 py-4 text-right text-white font-semibold">Market Cap</th>
              </tr>
            </thead>
            <tbody>
              {coins.map((coin, index) => (
                <tr
                  key={coin.id}
                  className="border-t border-white/10 hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4 text-white/70">{index + 1}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={coin.image} alt={coin.name} className="w-8 h-8" />
                      <div>
                        <p className="text-white font-semibold">{coin.name}</p>
                        <p className="text-white/50 text-sm uppercase">{coin.symbol}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-white font-mono">
                    {formatPrice(coin.current_price)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={\`flex items-center justify-end gap-1 font-semibold \${
                      coin.price_change_percentage_24h >= 0
                        ? 'text-green-400'
                        : 'text-red-400'
                    }\`}>
                      {coin.price_change_percentage_24h >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-white font-mono">
                    {formatMarketCap(coin.market_cap)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {coins.map((coin, index) => (
            <div
              key={coin.id}
              className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border-2 border-white/20"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-white/50 text-sm">#{index + 1}</span>
                  <img src={coin.image} alt={coin.name} className="w-10 h-10" />
                  <div>
                    <p className="text-white font-bold">{coin.name}</p>
                    <p className="text-white/50 text-sm uppercase">{coin.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold font-mono">
                    {formatPrice(coin.current_price)}
                  </p>
                  <span className={\`text-sm font-semibold \${
                    coin.price_change_percentage_24h >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
                  }\`}>
                    {coin.price_change_percentage_24h >= 0 ? '+' : ''}
                    {coin.price_change_percentage_24h.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Market Cap:</span>
                <span className="text-white font-mono">
                  {formatMarketCap(coin.market_cap)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}`,

  /**
   * 5. Random Fact Generator (Fun/Reference API)
   * Demonstrates: Multiple APIs, random data, animations, sharing
   */
  randomFactGenerator: `const { useState } = React;
import { Sparkles, RefreshCw, Heart, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function App() {
  const [fact, setFact] = useState(null);
  const [joke, setJoke] = useState(null);
  const [quote, setQuote] = useState(null);
  const [activeTab, setActiveTab] = useState("fact");
  const [loading, setLoading] = useState(false);
  const [liked, setLiked] = useState(false);

  const fetchFact = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://numbersapi.com/random/trivia');
      const text = await res.text();
      setFact(text);
    } catch (err) {
      setFact("Did you know? The earth is approximately 4.5 billion years old!");
    } finally {
      setLoading(false);
    }
  };

  const fetchJoke = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://official-joke-api.appspot.com/random_joke');
      const data = await res.json();
      setJoke(data);
    } catch (err) {
      setJoke({ setup: "Error loading joke", punchline: "Please try again!" });
    } finally {
      setLoading(false);
    }
  };

  const fetchQuote = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://api.quotable.io/random');
      const data = await res.json();
      setQuote(data);
    } catch (err) {
      setQuote({ content: "The only way to do great work is to love what you do.", author: "Steve Jobs" });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setLiked(false);
    if (tab === "fact") fetchFact();
    else if (tab === "joke") fetchJoke();
    else fetchQuote();
  };

  const shareContent = () => {
    let text = "";
    if (activeTab === "fact") text = fact;
    else if (activeTab === "joke") text = \`\${joke.setup} \${joke.punchline}\`;
    else text = \`"\${quote.content}" - \${quote.author}\`;

    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
      alert("Copied to clipboard!");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-orange-600 p-8">
      <div className="max-w-3xl mx-auto">
        <motion.h1
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-6xl font-bold text-white mb-12 text-center flex items-center justify-center gap-4"
        >
          <Sparkles className="w-12 h-12 text-yellow-300" />
          Daily Inspiration
        </motion.h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 justify-center">
          {["fact", "joke", "quote"].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={\`px-8 py-4 rounded-2xl font-bold text-lg transition-all transform hover:scale-105 \${
                activeTab === tab
                  ? 'bg-white text-purple-900 shadow-2xl'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }\`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content Card */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="bg-white/20 backdrop-blur-xl rounded-3xl p-12 border-4 border-white/30 shadow-2xl min-h-[400px] flex flex-col justify-center"
        >
          {loading && (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mb-4"></div>
              <p className="text-white text-xl">Loading...</p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {!loading && activeTab === "fact" && fact && (
              <motion.div
                key="fact-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <p className="text-3xl text-white leading-relaxed font-light mb-8">
                  {fact}
                </p>
              </motion.div>
            )}

            {!loading && activeTab === "joke" && joke && (
              <motion.div
                key="joke-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <p className="text-3xl text-white leading-relaxed font-light mb-6">
                  {joke.setup}
                </p>
                <p className="text-4xl text-yellow-300 font-bold">
                  {joke.punchline}
                </p>
              </motion.div>
            )}

            {!loading && activeTab === "quote" && quote && (
              <motion.div
                key="quote-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <p className="text-4xl text-white leading-relaxed font-serif italic mb-8">
                  "{quote.content}"
                </p>
                <p className="text-2xl text-yellow-300 font-semibold">
                  — {quote.author}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          {!loading && (
            <div className="flex justify-center gap-4 mt-12">
              <button
                onClick={() => handleTabChange(activeTab)}
                className="px-8 py-4 bg-white/30 hover:bg-white/40 text-white font-bold rounded-2xl flex items-center gap-2 transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                New {activeTab}
              </button>
              <button
                onClick={() => setLiked(!liked)}
                className={\`px-8 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all \${
                  liked ? 'bg-red-500 text-white' : 'bg-white/30 hover:bg-white/40 text-white'
                }\`}
              >
                <Heart className={\`w-5 h-5 \${liked ? 'fill-current' : ''}\`} />
                {liked ? 'Liked!' : 'Like'}
              </button>
              <button
                onClick={shareContent}
                className="px-8 py-4 bg-white/30 hover:bg-white/40 text-white font-bold rounded-2xl flex items-center gap-2 transition-all"
              >
                <Share2 className="w-5 h-5" />
                Share
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}`,

  /**
   * 6. GitHub Repository Search (Developer API)
   * Demonstrates: GitHub API, debounced search, pagination, responsive cards
   */
  githubRepoSearch: `const { useState, useEffect, useCallback } = React;
import { Search, Star, GitFork, Code, ExternalLink, GitBranch } from "lucide-react";
import { motion } from "framer-motion";

export default function App() {
  const [query, setQuery] = useState("react");
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState("stars");

  const searchRepos = useCallback(async (searchTerm) => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(
        \`https://api.github.com/search/repositories?q=\${searchTerm}&sort=\${sort}&per_page=12\`
      );
      const data = await res.json();
      setRepos(data.items || []);
    } catch (err) {
      alert("Failed to fetch repositories");
    } finally {
      setLoading(false);
    }
  }, [sort]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchRepos(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query, searchRepos]);

  const formatNumber = (num) => {
    if (num >= 1000) return \`\${(num / 1000).toFixed(1)}k\`;
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-8">
      <div className="max-w-7xl mx-auto">
        <motion.h1
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-6xl font-bold text-white mb-12 text-center flex items-center justify-center gap-4"
        >
          <GitBranch className="w-12 h-12 text-purple-400" />
          GitHub Explorer
        </motion.h1>

        {/* Search Controls */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search repositories..."
              className="w-full pl-14 pr-6 py-5 bg-gray-800 border-2 border-gray-700 rounded-2xl text-white text-lg placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-6 py-5 bg-gray-800 border-2 border-gray-700 rounded-2xl text-white text-lg focus:outline-none focus:border-purple-500 transition-colors"
          >
            <option value="stars">Most Stars</option>
            <option value="forks">Most Forks</option>
            <option value="updated">Recently Updated</option>
          </select>
        </div>

        {loading && (
          <div className="text-center text-white text-2xl">
            <div className="inline-block animate-spin rounded-full h-20 w-20 border-4 border-purple-500 border-t-transparent mb-6"></div>
            <p>Searching repositories...</p>
          </div>
        )}

        {/* Repository Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repos.map((repo, index) => (
            <motion.div
              key={repo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border-2 border-gray-700 hover:border-purple-500 transition-all hover:shadow-2xl hover:shadow-purple-500/20 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors line-clamp-1">
                    {repo.name}
                  </h3>
                  <p className="text-gray-500 text-sm mb-2">
                    {repo.owner.login}
                  </p>
                </div>
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-5 h-5 text-gray-400 hover:text-white" />
                </a>
              </div>

              <p className="text-gray-400 text-sm mb-6 line-clamp-3 min-h-[60px]">
                {repo.description || "No description provided"}
              </p>

              <div className="flex items-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="font-semibold">{formatNumber(repo.stargazers_count)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <GitFork className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold">{formatNumber(repo.forks_count)}</span>
                </div>
                {repo.language && (
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-green-400" />
                    <span className="font-semibold">{repo.language}</span>
                  </div>
                )}
              </div>

              {repo.topics && repo.topics.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {repo.topics.slice(0, 3).map((topic) => (
                    <span
                      key={topic}
                      className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {!loading && repos.length === 0 && (
          <div className="text-center text-gray-400 text-xl mt-12">
            No repositories found. Try a different search term.
          </div>
        )}
      </div>
    </div>
  );
}`,
};
