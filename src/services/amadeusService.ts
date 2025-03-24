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
  try {
    // Check if token is still valid
    if (token && token.expires_at > Date.now()) {
      console.log('Using existing authentication token');
      return token.access_token;
    }

    console.log('Requesting new authentication token');
    const authUrl = `${AMADEUS_API_BASE_URL}/security/oauth2/token`;
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    const data = {
      grant_type: "client_credentials",
      client_id: AMADEUS_CLIENT_ID,
      client_secret: AMADEUS_CLIENT_SECRET
    };

    const response = await axios.post(authUrl, new URLSearchParams(data), { headers });
    
    if (response.status === 200) {
      const tokenData = response.data;
      token = {
        access_token: tokenData.access_token,
        expires_at: Date.now() + (tokenData.expires_in - 60) * 1000
      };
      console.log('Authentication token obtained successfully');
      return token.access_token;
    } else {
      console.error('Authentication failed', response.status, response.data);
      throw new Error(`Authentication failed: ${response.status}`);
    }
  } catch (error) {
    console.error('Error obtaining authentication token', error);
    throw error;
  }
};

// Make authenticated request to Amadeus API
const makeRequest = async (endpoint: string, params?: Record<string, any>): Promise<any> => {
  try {
    console.log('Making API request', { endpoint, params });
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
      console.log('API request successful', endpoint, response.data ? Object.keys(response.data).length : 0);
      return response.data;
    } else {
      console.error('API request failed', response.status, response.data);
      throw new Error(`API request failed: ${response.status}`);
    }
  } catch (error) {
    console.error('Error making API request', endpoint, params, error);
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
      console.warn('No itineraries found in flight data');
      return null;
    }
    
    const itinerary = amadeusFlightData.itineraries[0];
    const segments = itinerary.segments;
    
    // Validate segments
    if (!segments || !segments.length) {
      console.warn('No segments found in itinerary');
      return null;
    }
    
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];
    
    // Validate segment airports
    if (!firstSegment.departure || !lastSegment.arrival) {
      console.warn('Missing departure or arrival information', { 
        firstSegment, 
        lastSegment 
      });
      return null;
    }
    
    const departure = findAirportByCode(firstSegment.departure.iataCode);
    const arrival = findAirportByCode(lastSegment.arrival.iataCode);
    
    if (!departure || !arrival) {
      console.warn('Could not find departure or arrival airport', 
        firstSegment.departure.iataCode, 
        lastSegment.arrival.iataCode
      );
      return null;
    }
    
    // Ensure all required fields are present
    const processedSegments = segments.map(segment => {
      const departureAirport = findAirportByCode(segment.departure.iataCode);
      const arrivalAirport = findAirportByCode(segment.arrival.iataCode);
      
      if (!departureAirport) {
        console.warn('departure airport not found', {
          departureCode: segment.departure.iataCode
        });
      }

      if (!arrivalAirport) {
        console.warn('arrival airport not found', {
          arrivalCode: segment.arrival.iataCode
        });
      }
      
      return {
        departureAirport: departureAirport || { code: segment.departure.iataCode, name: 'Unknown' },
        arrivalAirport: arrivalAirport || { code: segment.arrival.iataCode, name: 'Unknown' },
        departureTime: new Date(segment.departure.at).toISOString(),
        arrivalTime: new Date(segment.arrival.at).toISOString(),
        carrierCode: segment.carrierCode,
        flightNumber: `${segment.carrierCode}${segment.number}`
      };
    });
    
    // Parse times
    const departureTime = new Date(firstSegment.departure.at);
    const arrivalTime = new Date(lastSegment.arrival.at);
    
    // Calculate duration
    const durationMs = arrivalTime.getTime() - departureTime.getTime();
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    const flight: Flight = {
      id: `${firstSegment.departure.iataCode}-${lastSegment.arrival.iataCode}-${
        firstSegment.carrierCode}${firstSegment.number}`,
      departureAirport: departure,
      arrivalAirport: arrival,
      departureTime: departureTime.toISOString(),
      arrivalTime: arrivalTime.toISOString(),
      flightNumber: `${firstSegment.carrierCode}${firstSegment.number}`,
      airline: firstSegment.carrierCode,
      duration: `${durationHours}h ${durationMinutes}m`,
      direct: segments.length === 1,
      segments: processedSegments
    };

    console.log(`Flight type: ${flight.direct ? 'Direct' : 'Connecting'}`, flight.id, flight.flightNumber);
    
    return flight;
  } catch (error) {
    console.error('Error converting Amadeus flight data', error);
    return null;
  }
};

// Enhanced search for weekly flights
export const searchWeeklyFlights = async (fromCode: string, toCode: string): Promise<{
  directFlights: Flight[];
  connectingFlights: ConnectionFlight[];
  weeklyData: any;
}> => {
  console.log('🗓️ Searching Weekly Flights', fromCode, toCode);
  
  try {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 7);
    
    const weeklyData: any = {};
    const directFlights: Flight[] = [];
    const connectingFlights: Flight[] = [];
    const allFlights: Flight[] = [];
    
    for (let i = 0; i < 1; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateString = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      try {
        const flightData = await searchFlightOffers(fromCode, toCode, dateString);
        
        if (flightData && flightData.data && flightData.data.length > 0) {
          const dayFlights: Flight[] = [];
          
          for (const offer of flightData.data) {
            const flight = convertToFlightType(offer, dateString);
            console.log('Converted flight:', flight);
            if (flight) {
              console.log('inside flight:');
              allFlights.push(flight);
              dayFlights.push(flight);
              
              // Categorize flights
              if (flight.direct) {
                directFlights.push(flight);
              } else {
                connectingFlights.push(flight);
              }
            }
            console.log('Flightsdeets:', allFlights);
          }
          
          weeklyData[dateString] = {
            dayOfWeek,
            flights: dayFlights
          };
        } else {
          console.warn(`No flights found for ${dateString}`);
          weeklyData[dateString] = {
            dayOfWeek,
            flights: []
          };
        }
      } catch (error) {
        console.error(`Error fetching flights for ${dateString}:`, error);
        
        weeklyData[dateString] = {
          dayOfWeek,
          flights: [],
          error: "Could not fetch flight data"
        };
      }
    }
    
    const createConnectionFlights = (flights: Flight[]): ConnectionFlight[] => {
      console.log('Creating Connection Flights');
      console.log('Total Flights Input:', flights.length);
    
      const connectionFlights: ConnectionFlight[] = [];
    
      // Filter flights that are not direct (have multiple segments)
      const multiSegmentFlights = flights.filter(flight => flight.segments.length > 1);
    
      console.log('Multi-segment Flights:', multiSegmentFlights.length);
    
      multiSegmentFlights.forEach(flight => {
        // Process each multi-segment flight
        const connectionDetails = extractConnectionDetails(flight);
        
        if (connectionDetails) {
          const connectionFlight: ConnectionFlight = {
            id: generateConnectionId(flight),
            flights: [flight],
            totalDuration: flight.duration,
            stopoverDuration: connectionDetails.stopoverDuration,
            price: calculateConnectionPrice(flight)
          };
    
          connectionFlights.push(connectionFlight);
        }
      });
    
      console.log('Total Connection Flights Created:', connectionFlights.length);
      return connectionFlights;
    };
    
    const generateConnectionId = (flight: Flight): string => {
      // Generate a unique ID for the connection flight
      const segments = flight.segments;
      if (segments.length < 2) return flight.id;
    
      const firstSegmentStart = segments[0].departureAirport.code;
      const lastSegmentEnd = segments[segments.length - 1].arrivalAirport.code;
      
      return `${firstSegmentStart}-${lastSegmentEnd}-${flight.flightNumber}`;
    };
    
    const calculateConnectionPrice = (flight: Flight): number => {
      // Basic price calculation logic - you might want to replace this with more sophisticated pricing
      const basePrice = 100; // Base connection price
      const segmentMultiplier = flight.segments.length;
      
      return basePrice * segmentMultiplier;
    };
    
    interface ConnectionDetails {
      stopoverDuration: string;
    }
    
    const extractConnectionDetails = (flight: Flight): ConnectionDetails | null => {
      // Ensure the flight has multiple segments
      if (flight.segments.length <= 1) return null;
    
      let totalStopoverDuration = 0;
    
      // Iterate through segments to calculate stopover
      for (let i = 0; i < flight.segments.length - 1; i++) {
        const currentSegment = flight.segments[i];
        const nextSegment = flight.segments[i + 1];
    
        // Calculate stopover duration
        const currentArrival = new Date(currentSegment.arrivalTime);
        const nextDeparture = new Date(nextSegment.departureTime);
        
        const stopoverMs = nextDeparture.getTime() - currentArrival.getTime();
        totalStopoverDuration += stopoverMs;
      }
    
      // Convert total stopover duration to readable format
      const stopoverHours = Math.floor(totalStopoverDuration / (1000 * 60 * 60));
      const stopoverMinutes = Math.floor((totalStopoverDuration % (1000 * 60 * 60)) / (1000 * 60));
      const stopoverDuration = `${stopoverHours}h ${stopoverMinutes}m`;
    
      return { stopoverDuration };
    };
    // Filter connection flights to match from and to codes
    const filteredConnectionFlights = createConnectionFlights(allFlights).filter(cf => {
      console.log('Connection Flight Filtering:', cf.id);
      console.log('Connection Flight Filtering Details:', {
        connectionFlightId: cf.id,
        firstFlightDetails: {
          departureAirportCode: cf.flights[0].departureAirport.code,
          arrivalAirportCode: cf.flights[0].arrivalAirport.code,
          flightNumber: cf.flights[0].flightNumber
        },
        lastFlightDetails: {
          departureAirportCode: cf.flights[cf.flights.length - 1].departureAirport.code,
          arrivalAirportCode: cf.flights[cf.flights.length - 1].arrivalAirport.code,
          flightNumber: cf.flights[cf.flights.length - 1].flightNumber
        },
        expectedFromCode: fromCode,
        expectedToCode: toCode,
        matchesFromCode: cf.flights[0].departureAirport.code === fromCode,
        matchesToCode: cf.flights[cf.flights.length - 1].arrivalAirport.code === toCode
      });
    
      return cf.flights[0].departureAirport.code === fromCode && 
             cf.flights[cf.flights.length - 1].arrivalAirport.code === toCode;
    });
    console.log('TAll flgohts length:', allFlights);
    console.log('Total Connection Flights before filtering:', createConnectionFlights(allFlights).length);
    console.log('Filtered Connection Flights:', filteredConnectionFlights.length);
    
    console.log('Flight search results', 
      directFlights.length + ' direct flights', 
      filteredConnectionFlights.length + ' connecting flights'
    );
    
    return { 
      directFlights, 
      connectingFlights: filteredConnectionFlights, 
      weeklyData 
    };
  } catch (error) {
    console.error('Weekly Flight Search Error', error);
    throw error;
  }
};