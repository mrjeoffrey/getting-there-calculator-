
import { Airport, Flight, ConnectionFlight } from '../types/flightTypes';
import { airports } from './airports.json';

export const transformAirports = (originalAirports: any[]): Airport[] => {
  return originalAirports.map(airport => ({
    code: airport.iata_code,
    name: airport.name,
    city: airport.city,
    country: airport.country,
    lat: airport._geoloc.lat,
    lng: airport._geoloc.lng
  }));
};

const transformedAirports = transformAirports(airports);

export const findAirportByCode = (code: string): Airport | undefined => {
  return transformedAirports.find(airport => airport.code === code);
};

// Create proper Airport objects instead of just using {code: string}
export const createFullAirportObject = (code: string): Airport => {
  const airport = findAirportByCode(code);
  
  if (!airport) {
    // Return a default airport object with required fields if not found
    return {
      code: code,
      name: `Airport ${code}`,
      city: 'Unknown',
      country: 'Unknown',
      lat: 0,
      lng: 0
    };
  }
  
  return airport;
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
    direct: true,
    segments: [
     
    ],
  };
};

// Generate connecting flights
export const generateConnectionFlight = (fromCode: string, toCode: string, date: string): ConnectionFlight | null => {
  const departure = findAirportByCode(fromCode);
  const arrival = findAirportByCode(toCode);
  
  if (!departure || !arrival) return null;
  
  // Randomly select a connecting airport (different from departure and arrival)
  const potentialConnections = transformedAirports.filter(a => a.code !== fromCode && a.code !== toCode);
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
    direct: false,
    segments: [],
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

// Update the search function to always include Grenada
export const searchFlights = async (fromCode: string, toCode: string, date: string): Promise<{
  directFlights: Flight[];
  connectingFlights: ConnectionFlight[];
}> => {
  // If toCode is not GND, force it to be GND (Grenada)
  const destinationCode = 'GND';
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Generate 1-2 direct flights
  const directFlights: Flight[] = [];
  const directFlightCount = Math.floor(Math.random() * 2) + 1;
  
  for (let i = 0; i < directFlightCount; i++) {
    const flight = generateDirectFlight(fromCode, destinationCode, date);
    if (flight) directFlights.push(flight);
  }
  
  // Generate 1-3 connecting flights
  const connectingFlights: ConnectionFlight[] = [];
  const connectingFlightCount = Math.floor(Math.random() * 3) + 1;
  
  for (let i = 0; i < connectingFlightCount; i++) {
    const flight = generateConnectionFlight(fromCode, destinationCode, date);
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

// Calculate flight path arc points - FIXED to ensure it never returns null or empty array
export const calculateArcPoints = (
  startLat: number, 
  startLng: number, 
  endLat: number, 
  endLng: number, 
  bend: number = 0.2
): [number, number][] => {
  // Validate inputs
  if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
    console.error("Invalid coordinates provided to calculateArcPoints:", { startLat, startLng, endLat, endLng });
    // Return a straight line between valid coordinates or fallbacks
    const validStartLat = isNaN(startLat) ? 0 : startLat;
    const validStartLng = isNaN(startLng) ? 0 : startLng;
    const validEndLat = isNaN(endLat) ? 0 : endLat;
    const validEndLng = isNaN(endLng) ? 0 : endLng;
    return [[validStartLat, validStartLng], [validEndLat, validEndLng]];
  }
  
  const points: [number, number][] = [];
  const segments = 100; // Keep high number of segments for smooth curve
  
  try {
    // Always add the starting point first
    points.push([startLat, startLng]);
    
    // Use linear interpolation with altitude adjustment for intermediate points
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const lat = startLat * (1 - t) + endLat * t;
      const lng = startLng * (1 - t) + endLng * t;
      
      // Add curvature based on sine function (maximum at t=0.5)
      const altitude = Math.sin(Math.PI * t) * bend * calculateDistance(startLat, startLng, endLat, endLng) / 111; // 111 km per degree
      
      // Calculate perpendicular offset
      const dx = endLng - startLng;
      const dy = endLat - startLat;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Avoid division by zero
      if (dist > 0.000001) {
        const curvedLat = lat + altitude * dx / dist;
        const curvedLng = lng - altitude * dy / dist;
        points.push([curvedLat, curvedLng]);
      } else {
        // If points are extremely close, just use linear interpolation
        points.push([lat, lng]);
      }
    }
    
    // Always add the ending point last
    points.push([endLat, endLng]);
    
    // Verify we have at least 2 points
    if (points.length < 2) {
      console.warn("Generated less than 2 points, adding fallback points");
      return [[startLat, startLng], [endLat, endLng]];
    }
  } catch (error) {
    console.error("Error in calculateArcPoints:", error);
    // Return a fallback straight line
    return [[startLat, startLng], [endLat, endLng]];
  }
  
  return points;
};

// Get bearing between two points
export const getBearing = (startLat: number, startLng: number, endLat: number, endLng: number): number => {
  // Validate inputs
  if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
    console.error("Invalid coordinates provided to getBearing:", { startLat, startLng, endLat, endLng });
    return 0; // Default bearing
  }
  
  try {
    const startLatRad = startLat * Math.PI / 180;
    const startLngRad = startLng * Math.PI / 180;
    const endLatRad = endLat * Math.PI / 180;
    const endLngRad = endLng * Math.PI / 180;
    
    const y = Math.sin(endLngRad - startLngRad) * Math.cos(endLatRad);
    const x = Math.cos(startLatRad) * Math.sin(endLatRad) -
              Math.sin(startLatRad) * Math.cos(endLatRad) * Math.cos(endLngRad - startLngRad);
    const bearingRad = Math.atan2(y, x);
    
    return (bearingRad * 180 / Math.PI + 360) % 360;
  } catch (error) {
    console.error("Error calculating bearing:", error);
    return 0; // Default bearing
  }
};
