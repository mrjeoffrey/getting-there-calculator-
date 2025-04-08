
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

