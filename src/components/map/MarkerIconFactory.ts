
import { differenceInCalendarWeeks } from 'date-fns';
import L from 'leaflet';

type MarkerType = 'origin' | 'destination' | 'connection';

export const createAirportMarkerIcon = (type: MarkerType): L.DivIcon => {
  const size = type === 'origin' || type === 'destination' ? 20 : 14;
  const color = type === 'origin'
    ? '#2e7d32' // green
    : type === 'destination'
      ? '#c62828' // red
      : '#1565c0'; // blue
  
  return L.divIcon({
    className: 'airport-marker-icon',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 0 4px rgba(0,0,0,0.4);
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    shadowUrl: '', // disable default shadow
  });
};

// Add a new method for creating plane markers that align perfectly with flight paths
export const createPlaneMarkerIcon = (rotation: number, type: 'direct' | 'connecting', isDarkMode = false): L.DivIcon => {
  const color = type === 'direct' ? '#4CAF50' : '#FFC107';
  const strokeColor = isDarkMode ? 'white' : 'black';
  
  return L.divIcon({
    className: 'plane-marker-icon',
    html: `
      <div style="
        display: flex;
        justify-content: center;
        align-items: center;
      ">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          fill="${color}"
          stroke="${strokeColor}"
          stroke-width="1.5"
          style="transform: rotate(${rotation}deg); filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.4));"
        >
          <path d="M21 13.5v4.74a2 2 0 0 1-1.84 2 19.82 19.82 0 0 1-8.16 0 2 2 0 0 1-1.84-2V13.5"></path>
          <path d="M5.64 15.36a1 1 0 0 1-.28-.72v-2.94a2 2 0 0 1 1.36-1.9l11.04-3.68a2 2 0 0 1 2.64 1.9v2.94a1 1 0 0 1-.64.93L8.64 15.36a1 1 0 0 1-1 0z"></path>
          <path d="M3 8.5h1"></path>
          <path d="M1 11.5h1"></path>
          <path d="M5 11.5a2 2 0 0 0-2-2"></path>
        </svg>
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9], // Perfectly centered
  });
};
