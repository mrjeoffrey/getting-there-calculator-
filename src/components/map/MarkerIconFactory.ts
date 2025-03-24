
import L from 'leaflet';

type MarkerType = 'origin' | 'destination' | 'connection';

/**
 * Create custom icons for different types of airport markers
 */
export const createAirportMarkerIcon = (type: MarkerType): L.DivIcon => {
  let className = 'flex items-center justify-center ';
  let size = type === 'origin' || type === 'destination' ? 32 : 24;
  let color = '';
  
  switch (type) {
    case 'origin':
      color = '#E91E63'; // Pink for origin like in reference
      className += 'origin-marker';
      break;
    case 'destination':
      color = '#4CAF50'; // Green for destination like in reference
      className += 'destination-marker';
      break;
    case 'connection':
      color = '#FFC107'; // Amber for connection
      className += 'connection-marker';
      break;
    default:
      color = '#E91E63';
      className += 'origin-marker';
  }
  
  // Create HTML for the marker with a shadow effect and inner dot
  const html = `
    <div class="${className}" style="width: ${size}px; height: ${size}px;">
      <div class="marker-outer" style="
        background-color: white;
        border-radius: 50%;
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 0 2px white, 0 0 8px rgba(0,0,0,0.5);
      ">
        <div class="marker-inner" style="
          background-color: ${color};
          border-radius: 50%;
          width: ${size * 0.7}px;
          height: ${size * 0.7}px;
          ${type === 'origin' ? 'animation: pulse 2s infinite;' : ''}
        "></div>
      </div>
    </div>
  `;
  
  return L.divIcon({
    className: 'custom-div-icon',
    html: html,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  });
};
