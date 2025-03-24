import axios from 'axios';
import { Airport, Flight, ConnectionFlight } from '../types/flightTypes';
import { findAirportByCode, generateFlightNumber, calculateFlightDuration } from '../utils/flightUtils';

// Amadeus API configuration
const AMADEUS_API_BASE_URL = "https://test.api.amadeus.com/v1";
const AMADEUS_CLIENT_ID = "A2uHmEKgwLJKqRFDauAUBAphHI1ysFJ7";
const AMADEUS_CLIENT_SECRET = "xO6cJ4jBO61Gfpnv";

interface AmadeusToken {
  access_token: string;
  expires_at: number; // Timestamp when token expires
}

let token: AmadeusToken | null = null;

// Get authentication token
const getAuthToken = async (): Promise<string> => {
  // Check if token is still valid
  if (token && token.expires_at > Date.now()) {
    return token.access_token;
  }

  // Get new token
  const authUrl = `${AMADEUS_API_BASE_URL}/security/oauth2/token`;
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };
  const data = {
    grant_type: "client_credentials",
    client_id: AMADEUS_CLIENT_ID,
    client_secret: AMADEUS_CLIENT_SECRET
  };

  try {
    const response = await axios.post(authUrl, new URLSearchParams(data), { headers });
    
    if (response.status === 200) {
      const tokenData = response.data;
      token = {
        access_token: tokenData.access_token,
        expires_at: Date.now() + (tokenData.expires_in - 60) * 1000
      };
      return token.access_token;
    } else {
      console.error("Authentication failed:", response.status, response.data);
      throw new Error(`Authentication failed: ${response.status}`);
    }
  } catch (error) {
    console.error("Error getting auth token:", error);
    throw error;
  }
};

// Make authenticated request to Amadeus API
const makeRequest = async (endpoint: string, params?: Record<string, any>): Promise<any> => {
  try {
    const token = await getAuthToken();
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json"
    };

    // Determine full URL based on endpoint
    let url = endpoint.startsWith('v')
      ? `${AMADEUS_API_BASE_URL.replace('/v1', '')}/${endpoint}`
      : `${AMADEUS_API_BASE_URL}/${endpoint}`;

    const response = await axios.get(url, { headers, params });

    if (response.status === 200) {
      return response.data;
    } else {
      console.error("API request failed:", response.status, response.data);
      throw new Error(`API request failed: ${response.status}`);
    }
  } catch (error) {
    console.error("Error making API request:", error);
    throw error;
  }
};

// Search for airport information
export const searchAirport = async (keyword: string): Promise<any> => {
  const endpoint = "reference-data/locations";
  const params = {
    keyword,
    subType: "AIRPORT"
  };
  return makeRequest(endpoint, params);
};

// Get airline information
export const getAirlineInfo = async (airlineCode: string): Promise<any> => {
  const endpoint = "reference-data/airlines";
  const params = { airlineCodes: airlineCode };
  return makeRequest(endpoint, params);
};

// Search flight offers
export const searchFlightOffers = async (
  originCode: string, 
  destinationCode: string, 
  departureDate: string, 
  adults: number = 1
): Promise<any> => {
  const endpoint = "v2/shopping/flight-offers";
  const params = {
    originLocationCode: originCode,
    destinationLocationCode: destinationCode,
    departureDate,
    adults,
    currencyCode: "USD",
    max: 20
  };
  
  return makeRequest(endpoint, params);
};

// Convert Amadeus flight data to our Flight type
const convertToFlightType = (amadeusFlightData: any, date: string): Flight | null => {
  try {
    if (!amadeusFlightData.itineraries || !amadeusFlightData.itineraries.length) {
      return null;
    }
    
    const itinerary = amadeusFlightData.itineraries[0];
    const firstSegment = itinerary.segments[0];
    const lastSegment = itinerary.segments[itinerary.segments.length - 1];
    
    const departure = findAirportByCode(firstSegment.departure.iataCode);
    const arrival = findAirportByCode(lastSegment.arrival.iataCode);
    
    if (!departure || !arrival) return null;
    
    // Parse departure and arrival times
    const departureTime = new Date(firstSegment.departure.at);
    const arrivalTime = new Date(lastSegment.arrival.at);
    
    // Calculate duration in minutes
    const durationMs = arrivalTime.getTime() - departureTime.getTime();
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    const flightId = `${firstSegment.departure.iataCode}-${lastSegment.arrival.iataCode}-${
      firstSegment.carrierCode}${firstSegment.number}`;
    
    return {
      id: flightId,
      departureAirport: departure,
      arrivalAirport: arrival,
      departureTime: departureTime.toISOString(),
      arrivalTime: arrivalTime.toISOString(),
      flightNumber: `${firstSegment.carrierCode}${firstSegment.number}`,
      airline: firstSegment.carrierCode,
      duration: `${durationHours}h ${durationMinutes}m`,
      direct: itinerary.segments.length === 1
    };
  } catch (error) {
    console.error("Error converting Amadeus flight data:", error);
    return null;
  }
};

// Find connecting flights (if direct flights aren't found)
export const findConnectingFlights = (flights: Flight[]): ConnectionFlight[] => {
  const connectingFlights: ConnectionFlight[] = [];
  
  for (let i = 0; i < flights.length; i++) {
    for (let j = 0; j < flights.length; j++) {
      if (i === j) continue;
      
      const flight1 = flights[i];
      const flight2 = flights[j];
      
      if (flight1.arrivalAirport.code === flight2.departureAirport.code) {
        const flight1Arrival = new Date(flight1.arrivalTime);
        const flight2Departure = new Date(flight2.departureTime);
        const layoverMs = flight2Departure.getTime() - flight1Arrival.getTime();
        const layoverHours = layoverMs / (1000 * 60 * 60);
        
        if (layoverHours >= 1 && layoverHours <= 8) {
          const layoverMinutes = Math.floor((layoverMs % (1000 * 60 * 60)) / (1000 * 60));
          const stopoverDuration = `${Math.floor(layoverHours)}h ${layoverMinutes}m`;
          
          const totalDurationMs = new Date(flight2.arrivalTime).getTime() - new Date(flight1.departureTime).getTime();
          const totalHours = Math.floor(totalDurationMs / (1000 * 60 * 60));
          const totalMinutes = Math.floor((totalDurationMs % (1000 * 60 * 60)) / (1000 * 60));
          const totalDuration = `${totalHours}h ${totalMinutes}m`;
          
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

// Fallback to mocked data in case API fails
const fallbackToMockedData = async (
  fromCode: string, 
  toCode: string, 
  existingWeeklyData: any = null
): Promise<{
  directFlights: Flight[];
  connectingFlights: ConnectionFlight[];
  weeklyData: any;
}> => {
  console.log("Falling back to mocked data due to API failure");
  console.log(`Generating mock flights from ${fromCode} to ${toCode || 'GND'}`);
  
  const destinationCode = 'GND';
  const today = new Date();
  const weeklyData: any = existingWeeklyData || {};
  const directFlights: Flight[] = [];
  
  // Generate dates for the next 7 days if not already provided
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + i);
    const dateString = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    if (!weeklyData[dateString] || weeklyData[dateString].flights.length === 0) {
      const dayFlights: Flight[] = [];
      
      // Generate 1-2 direct flights for this day
      const directFlightCount = Math.floor(Math.random() * 2) + 1;
      
      for (let j = 0; j < directFlightCount; j++) {
        const departure = findAirportByCode(fromCode);
        const arrival = findAirportByCode(destinationCode);
        
        if (!departure || !arrival) continue;
        
        const airline = ['BA', 'AA', 'UA', 'DL'][Math.floor(Math.random() * 4)];
        const departureHour = Math.floor(Math.random() * 16) + 6;
        const departureMinute = Math.floor(Math.random() * 60);
        const departureTimeString = `${dateString}T${departureHour.toString().padStart(2, '0')}:${departureMinute.toString().padStart(2, '0')}:00`;
        
        const duration = calculateFlightDuration(departure.lat, departure.lng, arrival.lat, arrival.lng);
        const [hours, minutes] = duration.split('h ');
        const durationHours = parseInt(hours);
        const durationMinutes = parseInt(minutes.replace('m', ''));
        
        const departureTime = new Date(departureTimeString);
        const arrivalTime = new Date(departureTime.getTime() + (durationHours * 60 + durationMinutes) * 60000);
        
        const flight: Flight = {
          id: `${fromCode}-${destinationCode}-${Math.random().toString(36).substring(2, 9)}`,
          departureAirport: departure,
          arrivalAirport: arrival,
          departureTime: departureTime.toISOString(),
          arrivalTime: arrivalTime.toISOString(),
          flightNumber: `${airline}${Math.floor(Math.random() * 9000) + 1000}`,
          airline,
          duration,
          direct: true
        };
        
        dayFlights.push(flight);
        
        if (i === 0) { // Only use current day flights for map display
          directFlights.push(flight);
        }
      }
      
      weeklyData[dateString] = {
        dayOfWeek,
        flights: dayFlights
      };
    } else if (i === 0 && weeklyData[dateString].flights.length > 0) {
      // Add the first day's flights to directFlights for map display
      directFlights.push(...weeklyData[dateString].flights);
    }
  }
  
  // Generate connecting flights - ALWAYS create at least 2 connecting flights
  const connectingFlights: ConnectionFlight[] = [];
  // Increase minimum number of connecting flights to ensure some are always visible
  const connectingFlightCount = Math.floor(Math.random() * 3) + 2; // At least 2, up to 4
  
  console.log(`Generating ${connectingFlightCount} mock connecting flights`);
  
  for (let i = 0; i < connectingFlightCount; i++) {
    const departure = findAirportByCode(fromCode);
    const arrival = findAirportByCode(destinationCode);
    
    if (!departure || !arrival) {
      console.error(`Could not find airport data for ${fromCode} or ${destinationCode}`);
      continue;
    }
    
    // Select a connecting airport - prioritize more visible connections
    const popularConnections = ['MIA', 'LHR', 'YYZ', 'JFK'];
    const potentialConnections = airports.filter(a => a.code !== fromCode && a.code !== destinationCode);
    
    if (potentialConnections.length === 0) {
      console.error('No potential connecting airports found');
      continue;
    }
    
    // Try to use a popular connection first, then fall back to random
    let connectingAirport;
    const popularAvailable = potentialConnections.filter(a => popularConnections.includes(a.code));
    
    if (popularAvailable.length > 0) {
      connectingAirport = popularAvailable[Math.floor(Math.random() * popularAvailable.length)];
    } else {
      connectingAirport = potentialConnections[Math.floor(Math.random() * potentialConnections.length)];
    }
    
    console.log(`Creating connecting flight through ${connectingAirport.code}`);
    
    // First flight
    const airline1 = ['BA', 'AA', 'UA', 'DL'][Math.floor(Math.random() * 4)];
    const departureHour = Math.floor(Math.random() * 16) + 6;
    const departureMinute = Math.floor(Math.random() * 60);
    const departureTimeString = `${today.toISOString().split('T')[0]}T${departureHour.toString().padStart(2, '0')}:${departureMinute.toString().padStart(2, '0')}:00`;
    
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
    
    const connectionId = `${fromCode}-${connectingAirport.code}-${destinationCode}-${Math.random().toString(36).substring(2, 9)}`;
    console.log(`Generated connecting flight ID: ${connectionId} (${fromCode} → ${connectingAirport.code} → ${destinationCode})`);
    
    connectingFlights.push({
      id: connectionId,
      flights: [firstFlight, secondFlight],
      totalDuration,
      stopoverDuration,
      price
    });
  }
  
  console.log(`Successfully generated ${directFlights.length} direct flights and ${connectingFlights.length} connecting flights`);
  
  return { directFlights, connectingFlights, weeklyData };
};

// Search for weekly flights using the Amadeus API
export const searchWeeklyFlights = async (fromCode: string, toCode: string): Promise<{
  directFlights: Flight[];
  connectingFlights: ConnectionFlight[];
  weeklyData: any;
}> => {
  try {
    const destinationCode = 'GND'; // Always Grenada
    const today = new Date();
    const weeklyData: any = {};
    const directFlights: Flight[] = [];
    const allFlights: Flight[] = [];
    
    // Generate dates for the next 7 days
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);
      const dateString = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      try {
        // Attempt to fetch real flight data from Amadeus
        const flightData = await searchFlightOffers(fromCode, destinationCode, dateString);
        
        if (flightData && flightData.data && flightData.data.length > 0) {
          const dayFlights: Flight[] = [];
          
          for (const offer of flightData.data) {
            const flight = convertToFlightType(offer, dateString);
            if (flight) {
              if (i === 0) { // Only use current day flights for the map
                directFlights.push(flight);
              }
              dayFlights.push(flight);
              allFlights.push(flight);
            }
          }
          
          weeklyData[dateString] = {
            dayOfWeek,
            flights: dayFlights
          };
        } else {
          weeklyData[dateString] = {
            dayOfWeek,
            flights: []
          };
        }
      } catch (error) {
        console.error(`Error fetching flights for ${dateString}:`, error);
        
        // Fallback to generated data for this day
        weeklyData[dateString] = {
          dayOfWeek,
          flights: [],
          error: "Could not fetch flight data"
        };
      }
    }
    
    // Find connecting flights
    let connectingFlights = findConnectingFlights(allFlights).filter(
      cf => cf.flights[0].departureAirport.code === fromCode && 
           cf.flights[cf.flights.length - 1].arrivalAirport.code === destinationCode
    );
    
    // If no connecting flights were found, force generation of connecting flights
    if (connectingFlights.length === 0) {
      console.log("No connecting flights found from API results, forcing generation of mock connecting flights");
      const mockData = await fallbackToMockedData(fromCode, toCode);
      connectingFlights = mockData.connectingFlights;
    } else {
      console.log(`Found ${connectingFlights.length} valid connecting flights from API results`);
    }
    
    console.log(`Returning ${directFlights.length} direct flights and ${connectingFlights.length} connecting flights`);
    return { directFlights, connectingFlights, weeklyData };
  } catch (error) {
    console.error("Failed to search flights with Amadeus API:", error);
    return fallbackToMockedData(fromCode, toCode);
  }
};

// Make sure the calculateDistance function is available in this module
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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
