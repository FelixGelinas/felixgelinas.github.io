console.log("Webpage loaded.");

function toggleMenu() {
  const menu = document.getElementById("mobileMenu");
  menu.style.display = (menu.style.display === "flex") ? "none" : "flex";
}

// Initialize map and load GPX track if #gpxMap exists
document.addEventListener('DOMContentLoaded', () => {
  const mapEl = document.getElementById('gpxMap');
  if (!mapEl) return; // no map container on this page

  // Dynamic offset: make room for the top navigation so the map isn't overlapped
  function updateMapOffset() {
    const nav = document.querySelector('.topnav');
    const navHeight = nav ? Math.ceil(nav.getBoundingClientRect().height) : 0;
    // make the map fixed under the nav so it fills the viewport and doesn't produce inner scrollbars
    const mapSection = document.getElementById('map-section');
    if (mapSection) mapSection.style.paddingTop = '0';
    mapEl.style.position = 'fixed';
    mapEl.style.top = navHeight + 'px';
    mapEl.style.left = '0';
    mapEl.style.right = '0';
    mapEl.style.bottom = '0';
    mapEl.style.height = 'auto';
    // prevent the page body from scrolling on the map page (keeps map interaction clean)
    try { document.body.style.overflow = 'hidden'; } catch(e) {}
    return navHeight;
  }
  // run once and on resize
  let _navH = updateMapOffset();
  window.addEventListener('resize', () => {
    const newH = updateMapOffset();
    _navH = newH;
    // if a Leaflet map exists, tell it to invalidate size so it redraws correctly
    if (window._leafletMapInstance) {
      setTimeout(() => window._leafletMapInstance.invalidateSize(), 200);
    }
  });

  // Ensure Leaflet is available
  if (typeof L === 'undefined') {
    console.error('Leaflet (L) is not loaded. Make sure Leaflet JS is included before script.js');
    mapEl.innerText = 'Map cannot load: Leaflet missing.';
    return;
  }

  // Basic map setup
  let map = L.map('gpxMap', { scrollWheelZoom: true });
  // expose map instance globally for resize handling
  window._leafletMapInstance = map;

  // ensure Leaflet lays out tiles correctly after we've set container sizes
  setTimeout(() => { try { map.invalidateSize(); } catch(e){} }, 200);

  // Use OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Default view until GPX loaded
  map.setView([46.8, -71.2], 8);

  // Determine GPX file from query string (?gpx=...) or fallback to repo file.
  // Use encodeURI so filenames with accents still work in fetch requests.
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('gpx');
  // Use ASCII fallback filename to avoid percent-encoded URLs in links.
  const GPX_FILE = encodeURI(requested ? requested : 'gpx/Randonnee_le_soir.gpx');

  // Ensure GPX plugin is available
  if (typeof L.GPX === 'undefined') {
    console.warn('leaflet-gpx plugin not found; attempting to load GPX via fetch and display as GeoJSON');
    // fallback: try to fetch and parse as text (basic) — recommend adding leaflet-gpx script
    fetch(GPX_FILE).then(r => {
      if (!r.ok) throw new Error('GPX fetch failed');
      return r.text();
    }).then(gpxText => {
      // Lightweight fallback: display raw GPX as text if plugin missing
      const pre = document.createElement('pre');
      pre.style.whiteSpace = 'pre-wrap';
      pre.textContent = 'GPX loaded but leaflet-gpx plugin is missing. Please include the plugin to render tracks.\n\nFirst 200 chars:\n' + gpxText.slice(0,200);
      mapEl.innerHTML = '';
      mapEl.appendChild(pre);
    }).catch(err => {
      console.error(err);
      mapEl.innerText = 'Unable to load GPX file: ' + err.message;
    });
    return;
  }

  // Load GPX using leaflet-gpx plugin
  const gpx = new L.GPX(GPX_FILE, {
    async: true,
    polyline_options: {
      color: '#ff0000',
      opacity: 0.9,
      weight: 4
    },
    marker_options: {
      startIconUrl: '',
      endIconUrl: '',
      shadowUrl: ''
    }
  }).on('loaded', function(e) {
    map.fitBounds(e.target.getBounds());
  }).on('error', function(err) {
    console.error('GPX load error', err);
  }).addTo(map);

  L.control.scale().addTo(map);
});



