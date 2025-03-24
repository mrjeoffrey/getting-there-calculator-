
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
    
    // If we couldn't get any real flights, fall back to generated flights for display
    if (directFlights.length === 0) {
      return fallbackToMockedData(fromCode, toCode, weeklyData);
    }
    
    // Find connecting flights
    const connectingFlights = findConnectingFlights(allFlights).filter(
      cf => cf.flights[0].departureAirport.code === fromCode && 
           cf.flights[cf.flights.length - 1].arrivalAirport.code === destinationCode
    );
    
    return { directFlights, connectingFlights, weeklyData };
  } catch (error) {
    console.error("Failed to search flights with Amadeus API:", error);
    return fallbackToMockedData(fromCode, toCode);
  }
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
  console.warn("Falling back to mocked data due to API failure");
  
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
          departureTime: departureTimeString,
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
  
  // Generate connecting flights
  const connectingFlights: ConnectionFlight[] = [];
  const connectingFlightCount = Math.floor(Math.random() * 3) + 1;
  
  for (let i = 0; i < connectingFlightCount; i++) {
    const departure = findAirportByCode(fromCode);
    const arrival = findAirportByCode(destinationCode);
    
    if (!departure || !arrival) continue;
    
    // Select a connecting airport
    const potentialConnections = findPotentialConnections(fromCode, destinationCode);
    if (potentialConnections.length === 0) continue;
    
    const connectingAirport = potentialConnections[Math.floor(Math.random() * potentialConnections.length)];
    
    // First flight
    const airline1 = ['BA', 'AA', 'UA', 'DL'][Math.floor(Math.random() * 4)];
    const departureHour = Math.floor(Math.random() * 16) + 6;
    const departureMinute = Math.floor(Math.random() * 60);
    const departureTimeString = `${today.toISOString().split('T')[0]}T${departureHour.toString().padStart(2, '0')}:${departureMinute.toString().padStart(2, '0')}:00`;
    
    const duration1 = calculateFlightDuration(departure.lat, departure.lng, connectingAirport.lat, connectingAirport.lng);
    const [hours1, minutes1] = duration1.split('h ');
    const durationHours1 = parseInt(hours1);
    const durationMinutes1 = parseInt(minutes1.replace('m', ''));
    
    const departureTime = new Date(departureTimeString);
    const firstArrivalTime = new Date(departureTime.getTime() + (durationHours1 * 60 + durationMinutes1) * 60000);
    
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
    
    const duration2 = calculateFlightDuration(connectingAirport.lat, connectingAirport.lng, arrival.lat, arrival.lng);
    const [hours2, minutes2] = duration2.split('h ');
    const durationHours2 = parseInt(hours2);
    const durationMinutes2 = parseInt(minutes2.replace('m', ''));
    
    const secondArrivalTime = new Date(secondDepartureTime.getTime() + (durationHours2 * 60 + durationMinutes2) * 60000);
    
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
      totalDuration,
      stopoverDuration,
      price
    });
  }
  
  return { directFlights, connectingFlights, weeklyData };
};

// Helper to find potential connecting airports
const findPotentialConnections = (fromCode: string, toCode: string): Airport[] => {
  // Import the airports array from flightUtils
  const { airports } = require('../utils/flightUtils');
  return airports.filter(a => a.code !== fromCode && a.code !== toCode);
};
