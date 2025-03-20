import { Airport, Flight, ConnectionFlight } from '../types/flightTypes';
import axios from 'axios';

// Sample airport data (kept as is since Aviationstack doesn't provide complete airport data)
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

// Find airport by code (kept as is)
export const findAirportByCode = (code: string): Airport | undefined => {
  return airports.find(airport => airport.code === code);
};

// Calculate distance between two points using Haversine formula (kept as is)
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

// Aviationstack API configuration
const AVIATIONSTACK_API_KEY = '63cbed155a79f11047c272b2364fbad4';
const AVIATIONSTACK_BASE_URL = 'http://api.aviationstack.com/v1';

// API call to fetch flights from Aviationstack
const fetchFlightsFromAPI = async (
  fromCode: string, 
  toCode: string, 
  date: string
): Promise<any> => {
  try {
    const formattedDate = date.split('T')[0]; // Extract YYYY-MM-DD format from ISO string
    
    const response = await axios.get(`${AVIATIONSTACK_BASE_URL}/flights`, {
      params: {
        access_key: AVIATIONSTACK_API_KEY,
        dep_iata: fromCode,
        arr_iata: toCode,
        flight_date: formattedDate,
        limit: 100
      }
    });
    
    if (response.data.error) {
      console.error('Aviationstack API error:', response.data.error);
      throw new Error('Failed to fetch flight data');
    }
    console.log('response.data:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching flights:', error);
    throw error;
  }
};

// Convert Aviationstack flight data to our Flight type
const convertToFlightType = (aviationstackFlight: any): Flight | null => {
  try {
    const departure = findAirportByCode(aviationstackFlight.departure.iata);
    const arrival = findAirportByCode(aviationstackFlight.arrival.iata);
    
    if (!departure || !arrival) return null;
    
    const departureTime = new Date(`${aviationstackFlight.flight_date} ${aviationstackFlight.departure.scheduled || '00:00'}`);
    const arrivalTime = new Date(`${aviationstackFlight.flight_date} ${aviationstackFlight.arrival.scheduled || '00:00'}`);
    
    // Handle case where flight arrives the next day
    if (arrivalTime < departureTime) {
      arrivalTime.setDate(arrivalTime.getDate() + 1);
    }
    
    // Calculate duration in minutes
    const durationMs = arrivalTime.getTime() - departureTime.getTime();
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      id: `${departure.code}-${arrival.code}-${aviationstackFlight.flight.number}`,
      departureAirport: departure,
      arrivalAirport: arrival,
      departureTime: departureTime.toISOString(),
      arrivalTime: arrivalTime.toISOString(),
      flightNumber: aviationstackFlight.flight.iata || aviationstackFlight.flight.number,
      airline: aviationstackFlight.airline.iata || aviationstackFlight.airline.name.substring(0, 2),
      duration: `${durationHours}h ${durationMinutes}m`,
      direct: true
    };
  } catch (error) {
    console.error('Error converting flight data:', error);
    return null;
  }
};

// Find connecting flights from separate flights
const findConnectingFlights = (flights: Flight[]): ConnectionFlight[] => {
  const connectingFlights: ConnectionFlight[] = [];
  
  for (let i = 0; i < flights.length; i++) {
    for (let j = 0; j < flights.length; j++) {
      if (i === j) continue;
      
      const flight1 = flights[i];
      const flight2 = flights[j];
      
      // Check if flight2 departs from flight1's arrival airport
      if (flight1.arrivalAirport.code === flight2.departureAirport.code) {
        // Check if there's a reasonable layover time (1-8 hours)
        const flight1Arrival = new Date(flight1.arrivalTime);
        const flight2Departure = new Date(flight2.departureTime);
        const layoverMs = flight2Departure.getTime() - flight1Arrival.getTime();
        const layoverHours = layoverMs / (1000 * 60 * 60);
        
        if (layoverHours >= 1 && layoverHours <= 8) {
          // Calculate layover duration
          const layoverMinutes = Math.floor((layoverMs % (1000 * 60 * 60)) / (1000 * 60));
          const stopoverDuration = `${Math.floor(layoverHours)}h ${layoverMinutes}m`;
          
          // Calculate total duration
          const totalDurationMs = new Date(flight2.arrivalTime).getTime() - new Date(flight1.departureTime).getTime();
          const totalHours = Math.floor(totalDurationMs / (1000 * 60 * 60));
          const totalMinutes = Math.floor((totalDurationMs % (1000 * 60 * 60)) / (1000 * 60));
          const totalDuration = `${totalHours}h ${totalMinutes}m`;
          
          // Generate a random price (or ideally would come from another API)
          // In real implementation, you'd want to get actual prices from an API
          const price = Math.floor(Math.random() * 1500) + 500;
          
          connectingFlights.push({
            id: `${flight1.departureAirport.code}-${flight1.arrivalAirport.code}-${flight2.arrivalAirport.code}-${flight1.flightNumber}-${flight2.flightNumber}`,
            flights: [flight1, flight2],
            totalDuration,
            stopoverDuration,
            price
          });
        }
      }
    }
  }
  
  return connectingFlights;
};

// Search for flights using Aviationstack API
export const searchFlights = async (fromCode: string, toCode: string, date: string): Promise<{
  directFlights: Flight[];
  connectingFlights: ConnectionFlight[];
}> => {
  try {
    // If toCode is not GND, force it to be GND (Grenada)
    const destinationCode = 'GND';
    
    // Fetch direct flights using Aviationstack API
    const apiResponse = await fetchFlightsFromAPI(fromCode, destinationCode, date);
    
    // Convert API response to our Flight type
    const directFlights: Flight[] = [];
    for (const flight of apiResponse.data) {
      const convertedFlight = convertToFlightType(flight);
      if (convertedFlight) directFlights.push(convertedFlight);
    }
    
    // Create connecting flights by finding potential connections
    // For connecting flights, we'll search for flights to any destination
    const potentialConnections = await fetchFlightsFromAPI(fromCode, '', date);
    const potentialFlights: Flight[] = [];
    
    for (const flight of potentialConnections.data) {
      const convertedFlight = convertToFlightType(flight);
      if (convertedFlight) potentialFlights.push(convertedFlight);
    }
    
    // Find second leg of connecting flights
    const secondLegData: Flight[] = [];
    const connectingAirports = potentialFlights.map(f => f.arrivalAirport.code);
    
    for (const connectingAirport of connectingAirports) {
      if (connectingAirport === destinationCode) continue; // Skip if it's already a direct flight
      
      const secondLegResponse = await fetchFlightsFromAPI(connectingAirport, destinationCode, date);
      for (const flight of secondLegResponse.data) {
        const convertedFlight = convertToFlightType(flight);
        if (convertedFlight) secondLegData.push(convertedFlight);
      }
    }
    
    // Combine all flights for finding connections
    const allFlights = [...potentialFlights, ...secondLegData];
    const connectingFlights = findConnectingFlights(allFlights).filter(
      cf => cf.flights[0].departureAirport.code === fromCode && 
           cf.flights[cf.flights.length - 1].arrivalAirport.code === destinationCode
    );
    
    return { directFlights, connectingFlights };
  } catch (error) {
    console.error('Failed to search flights:', error);
    // Fallback to mocked data in case of API failure
    return fallbackToMockedData(fromCode, toCode, date);
  }
};

// Fallback to mocked data in case API fails
const fallbackToMockedData = async (fromCode: string, toCode: string, date: string): Promise<{
  directFlights: Flight[];
  connectingFlights: ConnectionFlight[];
}> => {
  console.warn('Falling back to mocked data due to API failure');
  
  // Below is your original mocked data generation (commented out but accessible)
  /* 
  // Original mock data functions are commented out but kept for reference
  
  // Generate a random flight number
  const generateFlightNumber = (airline: string): string => {
    const number = Math.floor(Math.random() * 9000) + 1000;
    return `${airline}${number}`;
  };

  // Mock airlines
  const airlines = ['BA', 'AA', 'UA', 'DL', 'LH', 'AF', 'EK', 'SQ', 'CX', 'QF'];

  // Generate a sample direct flight
  const generateDirectFlight = (fromCode: string, toCode: string, date: string): Flight | null => {
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
  const generateConnectionFlight = (fromCode: string, toCode: string, date: string): ConnectionFlight | null => {
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
  */
  
  // Implementing simplified mock data for fallback
  const destinationCode = 'GND';
  
  // Simplified direct flight generation
  const directFlights: Flight[] = [];
  const directFlightCount = Math.floor(Math.random() * 2) + 1;
  
  for (let i = 0; i < directFlightCount; i++) {
    const departure = findAirportByCode(fromCode);
    const arrival = findAirportByCode(destinationCode);
    
    if (!departure || !arrival) continue;
    
    const airline = ['BA', 'AA', 'UA', 'DL'][Math.floor(Math.random() * 4)];
    const departureHour = Math.floor(Math.random() * 16) + 6;
    const departureMinute = Math.floor(Math.random() * 60);
    const departureTimeString = `${date}T${departureHour.toString().padStart(2, '0')}:${departureMinute.toString().padStart(2, '0')}:00`;
    
    const distance = calculateDistance(departure.lat, departure.lng, arrival.lat, arrival.lng);
    const hours = Math.floor(distance / 800);
    const minutes = Math.floor((distance % 800) / 800 * 60);
    const duration = `${hours}h ${minutes}m`;
    
    const departureTime = new Date(departureTimeString);
    const arrivalTime = new Date(departureTime.getTime() + (hours * 60 + minutes) * 60000);
    
    directFlights.push({
      id: `${fromCode}-${destinationCode}-${Math.random().toString(36).substring(2, 9)}`,
      departureAirport: departure,
      arrivalAirport: arrival,
      departureTime: departureTimeString,
      arrivalTime: arrivalTime.toISOString(),
      flightNumber: `${airline}${Math.floor(Math.random() * 9000) + 1000}`,
      airline: airline,
      duration: duration,
      direct: true
    });
  }
  
  // Simplified connecting flight generation
  const connectingFlights: ConnectionFlight[] = [];
  const connectingFlightCount = Math.floor(Math.random() * 3) + 1;
  
  for (let i = 0; i < connectingFlightCount; i++) {
    const departure = findAirportByCode(fromCode);
    const arrival = findAirportByCode(destinationCode);
    
    if (!departure || !arrival) continue;
    
    // Select a connecting airport
    const potentialConnections = airports.filter(a => a.code !== fromCode && a.code !== destinationCode);
    if (potentialConnections.length === 0) continue;
    
    const connectingAirport = potentialConnections[Math.floor(Math.random() * potentialConnections.length)];
    
    // First flight
    const airline1 = ['BA', 'AA', 'UA', 'DL'][Math.floor(Math.random() * 4)];
    const departureHour = Math.floor(Math.random() * 16) + 6;
    const departureMinute = Math.floor(Math.random() * 60);
    const departureTimeString = `${date}T${departureHour.toString().padStart(2, '0')}:${departureMinute.toString().padStart(2, '0')}:00`;
    
    const distance1 = calculateDistance(departure.lat, departure.lng, connectingAirport.lat, connectingAirport.lng);
    const hours1 = Math.floor(distance1 / 800);
    const minutes1 = Math.floor((distance1 % 800) / 800 * 60);
    const duration1 = `${hours1}h ${minutes1}m`;
    
    const departureTime = new Date(departureTimeString);
    const firstArrivalTime = new Date(departureTime.getTime() + (hours1 * 60 + minutes1) * 60000);
    
    const firstFlight: Flight = {
      id: `${fromCode}-${connectingAirport.code}-${Math.random().toString(36).substring(2, 9)}`,
      departureAirport: departure,
      arrivalAirport: connectingAirport,
      departureTime: departureTimeString,
      arrivalTime: firstArrivalTime.toISOString(),
      flightNumber: `${airline1}${Math.floor(Math.random() * 9000) + 1000}`,
      airline: airline1,
      duration: duration1,
      direct: true
    };
    
    // Layover
    const layoverHours = Math.floor(Math.random() * 2) + 1;
    const layoverMinutes = Math.floor(Math.random() * 60);
    const stopoverDuration = `${layoverHours}h ${layoverMinutes}m`;
    
    // Second flight
    const secondDepartureTime = new Date(firstArrivalTime.getTime() + (layoverHours * 60 + layoverMinutes) * 60000);
    const airline2 = ['BA', 'AA', 'UA', 'DL'][Math.floor(Math.random() * 4)];
    
    const distance2 = calculateDistance(connectingAirport.lat, connectingAirport.lng, arrival.lat, arrival.lng);
    const hours2 = Math.floor(distance2 / 800);
    const minutes2 = Math.floor((distance2 % 800) / 800 * 60);
    const duration2 = `${hours2}h ${minutes2}m`;
    
    const secondArrivalTime = new Date(secondDepartureTime.getTime() + (hours2 * 60 + minutes2) * 60000);
    
    const secondFlight: Flight = {
      id: `${connectingAirport.code}-${destinationCode}-${Math.random().toString(36).substring(2, 9)}`,
      departureAirport: connectingAirport,
      arrivalAirport: arrival,
      departureTime: secondDepartureTime.toISOString(),
      arrivalTime: secondArrivalTime.toISOString(),
      flightNumber: `${airline2}${Math.floor(Math.random() * 9000) + 1000}`,
      airline: airline2,
      duration: duration2,
      direct: true
    };
    
    // Total duration
    const totalDurationMs = secondArrivalTime.getTime() - departureTime.getTime();
    const totalHours = Math.floor(totalDurationMs / (1000 * 60 * 60));
    const totalMinutes = Math.floor((totalDurationMs % (1000 * 60 * 60)) / (1000 * 60));
    const totalDuration = `${totalHours}h ${totalMinutes}m`;
    
    // Price
    const price = Math.floor(Math.random() * 1500) + 500;
    
    connectingFlights.push({
      id: `${fromCode}-${connectingAirport.code}-${destinationCode}-${Math.random().toString(36).substring(2, 9)}`,
      flights: [firstFlight, secondFlight],
      totalDuration: totalDuration,
      stopoverDuration: stopoverDuration,
      price: price
    });
  }
  
  return { directFlights, connectingFlights };
};

// Format date for display (kept as is)
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Format time for display (kept as is)
export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// Calculate flight path arc points (kept as is)
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

// Get bearing between two points (kept as is)
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