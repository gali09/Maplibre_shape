// Configura el mapa
const map = new maplibregl.Map({
  container: 'map', // ID del contenedor en el HTML
  style: 'https://demotiles.maplibre.org/style.json', // Estilo del mapa
  center: [-3.7038, 40.4168], // Coordenadas iniciales [lng, lat]
  zoom: 5 // Nivel de zoom inicial
});

// Opcional: Añade controles de navegación
map.addControl(new maplibregl.NavigationControl());

// Variable global para almacenar el GeoJSON
let geojsonData;

// Referencia al input de archivo
const fileInput = document.getElementById('shapefile-input');

// Manejar el evento de cambio del input
fileInput.addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      // Utiliza shp.js para convertir el archivo a GeoJSON
      shp(e.target.result).then(function(geojson) {
        // Mostrar el GeoJSON en la consola
        console.log('GeoJSON obtenido:', geojson);

        // Guardar el GeoJSON en una variable global
        geojsonData = geojson;

        // Añade el GeoJSON al mapa
        addGeoJSONToMap(geojson);

        // Descargar el GeoJSON con el mismo nombre que el archivo de entrada
        downloadGeoJSON(geojson, file.name);
      }).catch(function(error) {
        console.error('Error al leer el Shapefile:', error);
        alert('Hubo un error al cargar el Shapefile. Asegúrate de que el archivo sea válido.');
      });
    };
    reader.readAsArrayBuffer(file);
  }
});

// Función para añadir el GeoJSON al mapa
function addGeoJSONToMap(data) {
  // Elimina la capa y fuente existentes si las hay
  if (map.getLayer('shapefile-layer')) {
    map.removeLayer('shapefile-layer');
  }
  if (map.getSource('shapefile-data')) {
    map.removeSource('shapefile-data');
  }

  // Añade la fuente de datos
  map.addSource('shapefile-data', {
    type: 'geojson',
    data: data
  });

  // Determina el tipo de geometría para configurar la capa apropiadamente
  let layerType = '';
  if (data.features.length > 0) {
    const geometryType = data.features[0].geometry.type;
    if (geometryType.includes('Point')) {
      layerType = 'circle';
    } else if (geometryType.includes('LineString')) {
      layerType = 'line';
    } else if (geometryType.includes('Polygon')) {
      layerType = 'fill';
    }
  }

  // Añade la capa según el tipo de geometría
  if (layerType === 'circle') {
    map.addLayer({
      id: 'shapefile-layer',
      type: 'circle',
      source: 'shapefile-data',
      paint: {
        'circle-radius': 5,
        'circle-color': '#ff0000',
        'circle-stroke-color': '#000000', // Borde negro
        'circle-stroke-width': 1 // Grosor del borde
      }
    });
  } else if (layerType === 'line') {
    map.addLayer({
      id: 'shapefile-layer',
      type: 'line',
      source: 'shapefile-data',
      paint: {
        'line-width': 2,
        'line-color': '#0000ff'
      }
    });
  } else if (layerType === 'fill') {
    map.addLayer({
      id: 'shapefile-layer',
      type: 'fill',
      source: 'shapefile-data',
      paint: {
        'fill-color': '#00ff00',
        'fill-opacity': 0.5,
        'fill-outline-color': '#000000' // Borde negro
      }
    });
  } else {
    alert('Tipo de geometría no soportado.');
    return;
  }

  // Ajusta el mapa para mostrar el área del Shapefile
  const bounds = new maplibregl.LngLatBounds();
  data.features.forEach(function(feature) {
    const coordinates = feature.geometry.coordinates;
    expandBounds(bounds, coordinates, feature.geometry.type);
  });
  map.fitBounds(bounds, { padding: 20 });
}

// Función auxiliar para expandir los límites del mapa según las coordenadas
function expandBounds(bounds, coordinates, type) {
  if (type === 'Point') {
    bounds.extend(coordinates);
  } else if (type === 'MultiPoint' || type === 'LineString') {
    coordinates.forEach(function(coord) {
      bounds.extend(coord);
    });
  } else if (type === 'MultiLineString' || type === 'Polygon') {
    coordinates.forEach(function(coord) {
      expandBounds(bounds, coord, 'LineString');
    });
  } else if (type === 'MultiPolygon') {
    coordinates.forEach(function(coord) {
      expandBounds(bounds, coord, 'Polygon');
    });
  }
}

// Función para descargar el GeoJSON con el mismo nombre que el archivo de entrada
function downloadGeoJSON(geojson, originalFileName) {
  // Obtener el nombre del archivo sin extensión
  const fileNameWithoutExtension = originalFileName.replace(/\.[^/.]+$/, "");

  // Crear el nombre del archivo .geojson
  const geojsonFileName = fileNameWithoutExtension + '.geojson';

  // Convertir el GeoJSON a una cadena JSON
  const geojsonStr = JSON.stringify(geojson);

  // Crear un blob del tipo MIME apropiado
  const blob = new Blob([geojsonStr], { type: 'application/geo+json' });

  // Crear un enlace temporal para descargar el archivo
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = geojsonFileName;

  // Añadir el enlace al documento y simular un clic para iniciar la descarga
  document.body.appendChild(link);
  link.click();

  // Eliminar el enlace y liberar el objeto URL
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
