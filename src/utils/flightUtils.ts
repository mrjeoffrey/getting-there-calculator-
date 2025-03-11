
import { Airport, Flight, ConnectionFlight } from '../types/flightTypes';

// Sample airport data
export const airports: Airport[] = [
  { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'USA', lat: 40.6413, lng: -73.7781 },
  { code: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'UK', lat: 51.4700, lng: -0.4543 },
  { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', lat: 49.0097, lng: 2.5479 },
  { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore', lat: 1.3644, lng: 103.9915 },
  { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'UAE', lat: 25.2532, lng: 55.3657 },
  { code: 'GND', name: 'Maurice Bishop International Airport', city: 'Grenada', country: 'Grenada', lat: 12.0042, lng: -61.7863 },
  { code: 'MIA', name: 'Miami International Airport', city: 'Miami', country: 'USA', lat: 25.7952, lng: -80.2857 },
  { code: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto', country: 'Canada', lat: 43.6777, lng: -79.6248 },
  { code: 'FCO', name: 'Leonardo da Vinci International Airport', city: 'Rome', country: 'Italy', lat: 41.8003, lng: 12.2389 },
  { code: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'China', lat: 22.3080, lng: 113.9185 },
];

// Find airport by code
export const findAirportByCode = (code: string): Airport | undefined => {
  return airports.find(airport => airport.code === code);
};

// Calculate distance between two points using Haversine formula
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Calculate flight duration based on distance
export const calculateFlightDuration = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  // Assuming average speed of 800 km/h
  const hours = Math.floor(distance / 800);
  const minutes = Math.floor((distance % 800) / 800 * 60);
  return `${hours}h ${minutes}m`;
};

// Generate a random flight number
export const generateFlightNumber = (airline: string): string => {
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `${airline}${number}`;
};

// Mock airlines
const airlines = ['BA', 'AA', 'UA', 'DL', 'LH', 'AF', 'EK', 'SQ', 'CX', 'QF'];

// Generate a sample direct flight
export const generateDirectFlight = (fromCode: string, toCode: string, date: string): Flight | null => {
  const departure = findAirportByCode(fromCode);
  const arrival = findAirportByCode(toCode);
  
  if (!departure || !arrival) return null;
  
  const airline = airlines[Math.floor(Math.random() * airlines.length)];
  
  // Generate departure time (between 6 AM and 10 PM)
  const departureHour = Math.floor(Math.random() * 16) + 6;
  const departureMinute = Math.floor(Math.random() * 60);
  const departureTimeString = `${date}T${departureHour.toString().padStart(2, '0')}:${departureMinute.toString().padStart(2, '0')}:00`;
  
  // Calculate duration
  const duration = calculateFlightDuration(departure.lat, departure.lng, arrival.lat, arrival.lng);
  
  // Calculate arrival time based on duration
  const durationHours = parseInt(duration.split('h')[0]);
  const durationMinutes = parseInt(duration.split('h ')[1].split('m')[0]);
  const departureTime = new Date(departureTimeString);
  const arrivalTime = new Date(departureTime.getTime() + (durationHours * 60 + durationMinutes) * 60000);
  
  return {
    id: `${fromCode}-${toCode}-${Math.random().toString(36).substring(2, 9)}`,
    departureAirport: departure,
    arrivalAirport: arrival,
    departureTime: departureTimeString,
    arrivalTime: arrivalTime.toISOString(),
    flightNumber: generateFlightNumber(airline),
    airline: airline,
    duration: duration,
    direct: true
  };
};

// Generate connecting flights
export const generateConnectionFlight = (fromCode: string, toCode: string, date: string): ConnectionFlight | null => {
  const departure = findAirportByCode(fromCode);
  const arrival = findAirportByCode(toCode);
  
  if (!departure || !arrival) return null;
  
  // Randomly select a connecting airport (different from departure and arrival)
  const potentialConnections = airports.filter(a => a.code !== fromCode && a.code !== toCode);
  if (potentialConnections.length === 0) return null;
  
  const connectingAirport = potentialConnections[Math.floor(Math.random() * potentialConnections.length)];
  
  // Generate first flight
  const firstFlight = generateDirectFlight(fromCode, connectingAirport.code, date);
  if (!firstFlight) return null;
  
  // Generate layover time (1-3 hours)
  const layoverHours = Math.floor(Math.random() * 2) + 1;
  const layoverMinutes = Math.floor(Math.random() * 60);
  const stopoverDuration = `${layoverHours}h ${layoverMinutes}m`;
  
  // Calculate second flight departure time
  const firstArrivalTime = new Date(firstFlight.arrivalTime);
  const secondDepartureTime = new Date(firstArrivalTime.getTime() + (layoverHours * 60 + layoverMinutes) * 60000);
  
  // Generate second flight
  const airline = airlines[Math.floor(Math.random() * airlines.length)];
  const duration = calculateFlightDuration(connectingAirport.lat, connectingAirport.lng, arrival.lat, arrival.lng);
  const durationHours = parseInt(duration.split('h')[0]);
  const durationMinutes = parseInt(duration.split('h ')[1].split('m')[0]);
  const secondArrivalTime = new Date(secondDepartureTime.getTime() + (durationHours * 60 + durationMinutes) * 60000);
  
  const secondFlight: Flight = {
    id: `${connectingAirport.code}-${toCode}-${Math.random().toString(36).substring(2, 9)}`,
    departureAirport: connectingAirport,
    arrivalAirport: arrival,
    departureTime: secondDepartureTime.toISOString(),
    arrivalTime: secondArrivalTime.toISOString(),
    flightNumber: generateFlightNumber(airline),
    airline: airline,
    duration: duration,
    direct: false
  };
  
  // Calculate total duration
  const totalDurationMs = secondArrivalTime.getTime() - new Date(firstFlight.departureTime).getTime();
  const totalHours = Math.floor(totalDurationMs / (1000 * 60 * 60));
  const totalMinutes = Math.floor((totalDurationMs % (1000 * 60 * 60)) / (1000 * 60));
  const totalDuration = `${totalHours}h ${totalMinutes}m`;
  
  // Generate random price between $500 and $2000
  const price = Math.floor(Math.random() * 1500) + 500;
  
  return {
    id: `${fromCode}-${connectingAirport.code}-${toCode}-${Math.random().toString(36).substring(2, 9)}`,
    flights: [firstFlight, secondFlight],
    totalDuration: totalDuration,
    stopoverDuration: stopoverDuration,
    price: price
  };
};

// Search for flights
export const searchFlights = async (fromCode: string, toCode: string, date: string): Promise<{
  directFlights: Flight[];
  connectingFlights: ConnectionFlight[];
}> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Generate 0-2 direct flights
  const directFlights: Flight[] = [];
  const directFlightCount = Math.floor(Math.random() * 3);
  
  for (let i = 0; i < directFlightCount; i++) {
    const flight = generateDirectFlight(fromCode, toCode, date);
    if (flight) directFlights.push(flight);
  }
  
  // Generate 1-3 connecting flights
  const connectingFlights: ConnectionFlight[] = [];
  const connectingFlightCount = Math.floor(Math.random() * 3) + 1;
  
  for (let i = 0; i < connectingFlightCount; i++) {
    const flight = generateConnectionFlight(fromCode, toCode, date);
    if (flight) connectingFlights.push(flight);
  }
  
  return { directFlights, connectingFlights };
};

// Format date for display
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Format time for display
export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// Calculate flight path arc points
export const calculateArcPoints = (
  startLat: number, 
  startLng: number, 
  endLat: number, 
  endLng: number, 
  bend: number = 0.2
): [number, number][] => {
  const points: [number, number][] = [];
  const segments = 100;
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const lat = startLat * (1 - t) + endLat * t;
    const lng = startLng * (1 - t) + endLng * t;
    
    // Add curvature
    const altitude = Math.sin(Math.PI * t) * bend * calculateDistance(startLat, startLng, endLat, endLng) / 111; // 111 km per degree
    const curvedLat = lat + altitude * (endLng - startLng) / Math.sqrt(Math.pow(endLng - startLng, 2) + Math.pow(endLat - startLat, 2));
    const curvedLng = lng - altitude * (endLat - startLat) / Math.sqrt(Math.pow(endLng - startLng, 2) + Math.pow(endLat - startLat, 2));
    
    points.push([curvedLat, curvedLng]);
  }
  
  return points;
};

// Get bearing between two points
export const getBearing = (startLat: number, startLng: number, endLat: number, endLng: number): number => {
  const startLatRad = startLat * Math.PI / 180;
  const startLngRad = startLng * Math.PI / 180;
  const endLatRad = endLat * Math.PI / 180;
  const endLngRad = endLng * Math.PI / 180;
  
  const y = Math.sin(endLngRad - startLngRad) * Math.cos(endLatRad);
  const x = Math.cos(startLatRad) * Math.sin(endLatRad) -
            Math.sin(startLatRad) * Math.cos(endLatRad) * Math.cos(endLngRad - startLngRad);
  const bearingRad = Math.atan2(y, x);
  
  return (bearingRad * 180 / Math.PI + 360) % 360;
};
