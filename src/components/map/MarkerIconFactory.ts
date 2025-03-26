
import L from 'leaflet';

type MarkerType = 'origin' | 'destination' | 'connection';

export const createAirportMarkerIcon = (type: MarkerType): L.DivIcon => {
  let size = type === 'origin' || type === 'destination' ? 28 : 18; // Slightly larger for visibility
  let color = '';
  let darkerColor = '';

  switch (type) {
    case 'origin':
      color = '#E91E63'; // Pink
      darkerColor = '#AD1457'; // Darker pink
      break;
    case 'destination':
      color = '#4CAF50'; // Green
      darkerColor = '#2E7D32'; // Darker green
      break;
    case 'connection':
      color = '#FFC107'; // Amber
      darkerColor = '#FFA000'; // Darker amber
      break;
    default:
      color = '#E91E63';
      darkerColor = '#AD1457';
  }

  const html = `
    <div style="width: ${size}px; height: ${size}px;">
      <div style="
        background-color: ${darkerColor};
        border-radius: 50%;
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 0 2px ${darkerColor}, 0 0 10px rgba(0,0,0,0.6);
        cursor: pointer;
      ">
        <div style="
          background-color: ${color};
          border-radius: 50%;
          width: ${size * 0.6}px;
          height: ${size * 0.6}px;
          ${type === 'origin' ? 'animation: pulse 2s infinite;' : ''}
        "></div>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-div-icon',
    html: html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};
