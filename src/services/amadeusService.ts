import axios from 'axios';
import { Airport, Flight, ConnectionFlight } from '../types/flightTypes';
import { findAirportByCode, generateFlightNumber, calculateFlightDuration } from '../utils/flightUtils';


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

// Function to calculate duration between two dates
const formatFlightDuration = (start: Date, end: Date): string => {
  const durationMs = end.getTime() - start.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
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
    
    for (let i = 0; i < 3; i++) {
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
      const multiSegmentFlights = flights.filter(flight => !flight.direct || flight.segments.length > 1);
    
      console.log('Multi-segment Flights:', multiSegmentFlights.length);
    
      multiSegmentFlights.forEach(flight => {
        // Process each multi-segment flight
        const connectionDetails = extractConnectionDetails(flight);
        
        if (connectionDetails) {
          // Create separate Flight objects for each segment
          const segmentFlights: Flight[] = [];
          
          for (let i = 0; i < flight.segments.length; i++) {
            const segment = flight.segments[i];
            const fullDepartureAirport = findAirportByCode(segment.departureAirport.code);
            const fullArrivalAirport = findAirportByCode(segment.arrivalAirport.code);
            
            // Create proper Airport objects with all required fields
            const departureAirport: Airport = fullDepartureAirport || {
              code: segment.departureAirport.code,
              name: segment.departureAirport.code + " Airport",
              city: 'Unknown City',
              country: 'Unknown Country',
              lat: 0,
              lng: 0
            };
            
            const arrivalAirport: Airport = fullArrivalAirport || {
              code: segment.arrivalAirport.code,
              name: segment.arrivalAirport.code + " Airport",
              city: 'Unknown City',
              country: 'Unknown Country',
              lat: 0,
              lng: 0
            };
            
            const segmentFlight: Flight = {
              id: `${flight.id}-segment-${i}`,
              departureAirport: i === 0 ? flight.departureAirport : departureAirport,
              arrivalAirport: arrivalAirport,
              departureTime: segment.departureTime,
              arrivalTime: segment.arrivalTime,
              flightNumber: `${flight.flightNumber}-${i+1}`,
              airline: flight.airline,
              duration: formatFlightDuration(new Date(segment.departureTime), new Date(segment.arrivalTime)),
              direct: true,
              segments: [segment]
            };
            segmentFlights.push(segmentFlight);
          }
          
          // Log the segment flights
          console.log(`Connection ${flight.id} has ${segmentFlights.length} segment flights`);
          segmentFlights.forEach((segment, idx) => {
            console.log(`  Segment ${idx+1}: ${segment.departureAirport.code} to ${segment.arrivalAirport.code}`);
          });
          
          const connectionFlight: ConnectionFlight = {
            id: generateConnectionId(flight),
            flights: segmentFlights,
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
    
    // If we don't have enough flights, generate some mocked data
    if (allFlights.length < 3) {
      console.log("Not enough real flights, adding mocked data");
      const mockedFlights = fallbackToMockedData(fromCode, toCode);
      allFlights.push(...mockedFlights);
      directFlights.push(...mockedFlights.filter(f => f.direct));
    }

    // Always ensure we have connecting flights for testing
    const mockConnectingFlights = generateMockConnectingFlights(fromCode, toCode);
    
    // Log the mock connecting flights for debugging
    console.log(`Generated ${mockConnectingFlights.length} mock connecting flights`);
    mockConnectingFlights.forEach((flight, index) => {
      console.log(`Mock connecting flight ${index+1}:`, flight.id);
      console.log(`  Segments:`, flight.segments.length);
      console.log(`  Path: ${flight.departureAirport.code} -> ${flight.segments.map(s => s.arrivalAirport.code).join(' -> ')}`);
    });
    
    allFlights.push(...mockConnectingFlights);
    
    const directMockConnectionFlights = createSpecificConnectionFlights(fromCode, toCode);
    
    console.log(`Created ${directMockConnectionFlights.length} direct mock connection flights`);
    directMockConnectionFlights.forEach((connection, idx) => {
      console.log(`Direct mock connection #${idx+1}: ${connection.id}`);
      connection.flights.forEach((flight, flightIdx) => {
        console.log(`  Flight ${flightIdx+1}: ${flight.departureAirport.code} to ${flight.arrivalAirport.code}`);
      });
    });
    
    // Create regular connection flights from multi-segment flights
    const regularConnectionFlights = createConnectionFlights(allFlights);
    
    // Combine both types of connection flights
    const allConnectionFlights = [...directMockConnectionFlights, ...regularConnectionFlights];
    
    // Filter connection flights to match from and to codes
    const filteredConnectionFlights = allConnectionFlights.filter(cf => {
      console.log('Connection Flight Filtering:', cf.id);
      const firstFlight = cf.flights[0];
      const lastFlight = cf.flights[cf.flights.length - 1];
      
      console.log('Connection Flight Filtering Details:', {
        connectionFlightId: cf.id,
        firstFlightDetails: {
          departureAirportCode: firstFlight.departureAirport.code,
          arrivalAirportCode: firstFlight.arrivalAirport.code,
          flightNumber: firstFlight.flightNumber
        },
        lastFlightDetails: {
          departureAirportCode: lastFlight.departureAirport.code,
          arrivalAirportCode: lastFlight.arrivalAirport.code,
          flightNumber: lastFlight.flightNumber
        },
        expectedFromCode: fromCode,
        expectedToCode: toCode,
        matchesFromCode: firstFlight.departureAirport.code === fromCode,
        matchesToCode: lastFlight.arrivalAirport.code === toCode
      });
    
      return firstFlight.departureAirport.code === fromCode && 
             lastFlight.arrivalAirport.code === toCode;
    });
    
    console.log('Total Connection Flights before filtering:', allConnectionFlights.length);
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

// Helper functions for connection flights
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

// Fallback to mocked data when API fails or returns insufficient results
const fallbackToMockedData = (originCode: string, destinationCode: string): Flight[] => {
  console.log('Generating mocked flight data for', originCode, 'to', destinationCode);
  
  const originAirport = findAirportByCode(originCode);
  const destinationAirport = findAirportByCode(destinationCode);
  
  if (!originAirport || !destinationAirport) {
    console.error('Could not find airports for codes', originCode, destinationCode);
    return [];
  }
  
  const mockedFlights: Flight[] = [];
  
  // Generate a few direct flights
  for (let i = 0; i < 3; i++) {
    const flightNumber = generateFlightNumber("JS");
    const departureTime = new Date();
    departureTime.setHours(8 + i * 4);
    departureTime.setMinutes(Math.floor(Math.random() * 60));
    
    const flightDurationMs = (5 + Math.floor(Math.random() * 3)) * 60 * 60 * 1000;
    const arrivalTime = new Date(departureTime.getTime() + flightDurationMs);
    
    // Create a complete Airport object from the code
    const segmentDepartureAirport: Airport = {
      code: originCode,
      name: originAirport.name,
      city: originAirport.city,
      country: originAirport.country,
      lat: originAirport.lat,
      lng: originAirport.lng
    };
    
    const segmentArrivalAirport: Airport = {
      code: destinationCode,
      name: destinationAirport.name,
      city: destinationAirport.city,
      country: destinationAirport.country,
      lat: destinationAirport.lat,
      lng: destinationAirport.lng
    };
    
    const flight: Flight = {
      id: `${originCode}-${destinationCode}-${flightNumber}`,
      departureAirport: originAirport,
      arrivalAirport: destinationAirport,
      departureTime: departureTime.toISOString(),
      arrivalTime: arrivalTime.toISOString(),
      flightNumber,
      airline: flightNumber.substring(0, 2),
      duration: `${Math.floor(flightDurationMs / (60 * 60 * 1000))}h ${Math.floor((flightDurationMs % (60 * 60 * 1000)) / (60 * 1000))}m`,
      direct: true,
      segments: [{
        departureAirport: segmentDepartureAirport,
        arrivalAirport: segmentArrivalAirport,
        departureTime: departureTime.toISOString(),
        arrivalTime: arrivalTime.toISOString()
      }]
    };
    
    mockedFlights.push(flight);
  }
  
  return mockedFlights;
};

// Generate connecting flights with actual layovers
const generateMockConnectingFlights = (originCode: string, destinationCode: string): Flight[] => {
  console.log('Generating mock connecting flights from', originCode, 'to', destinationCode);
  
  const originAirport = findAirportByCode(originCode);
  const destinationAirport = findAirportByCode(destinationCode);
  
  if (!originAirport || !destinationAirport) {
    console.error('Could not find airports for codes', originCode, destinationCode);
    return [];
  }
  
  // Potential layover airports (use major hub airports)
  const layoverOptions = ['LHR', 'FRA', 'DXB', 'HKG', 'ICN', 'CDG', 'AMS'];
  const mockedConnectingFlights: Flight[] = [];
  
  // Generate 3 connecting flights with different layovers
  for (let i = 0; i < 3; i++) {
    const flightNumber = generateFlightNumber("JS");
    const departureTime = new Date();
    departureTime.setHours(7 + i * 5);
    departureTime.setMinutes(Math.floor(Math.random() * 60));
    
    // Select 1 or 2 layover airports
    const numLayovers = 1 + (i % 2); // 1 or 2 layovers
    const selectedLayovers: string[] = [];
    
    for (let j = 0; j < numLayovers; j++) {
      const layoverIndex = (i + j) % layoverOptions.length;
      selectedLayovers.push(layoverOptions[layoverIndex]);
    }
    
    console.log(`Creating connecting flight with ${numLayovers} layovers:`, selectedLayovers.join(', '));
    
    // Create segments
    const segments: any[] = [];
    let currentDepartureTime = new Date(departureTime);
    let currentOrigin = originAirport;
    
    // Add segments for each layover
    for (let j = 0; j < selectedLayovers.length; j++) {
      const layoverCode = selectedLayovers[j];
      const layoverAirport = findAirportByCode(layoverCode);
      
      if (!layoverAirport) {
        console.error('Could not find layover airport', layoverCode);
        continue;
      }
      
      // Flight duration to layover
      const flightDurationMs = (3 + Math.floor(Math.random() * 4)) * 60 * 60 * 1000;
      const arrivalTime = new Date(currentDepartureTime.getTime() + flightDurationMs);
      
      segments.push({
        departureAirport: currentOrigin,
        arrivalAirport: layoverAirport,
        departureTime: currentDepartureTime.toISOString(),
        arrivalTime: arrivalTime.toISOString()
      });
      
      // Layover duration
      const layoverDurationMs = (1 + Math.floor(Math.random() * 3)) * 60 * 60 * 1000;
      currentDepartureTime = new Date(arrivalTime.getTime() + layoverDurationMs);
      currentOrigin = layoverAirport;
    }
    
    // Final segment to destination
    const finalFlightDurationMs = (4 + Math.floor(Math.random() * 5)) * 60 * 60 * 1000;
    const finalArrivalTime = new Date(currentDepartureTime.getTime() + finalFlightDurationMs);
    
    segments.push({
      departureAirport: currentOrigin,
      arrivalAirport: destinationAirport,
      departureTime: currentDepartureTime.toISOString(),
      arrivalTime: finalArrivalTime.toISOString()
    });
    
    // Calculate total duration
    const totalDurationMs = finalArrivalTime.getTime() - departureTime.getTime();
    const hours = Math.floor(totalDurationMs / (60 * 60 * 1000));
    const minutes = Math.floor((totalDurationMs % (60 * 60 * 1000)) / (60 * 1000));
    
    // Create the flight
    const flight: Flight = {
      id: `${originCode}-${destinationCode}-${flightNumber}-via-${selectedLayovers.join('-')}`,
      departureAirport: originAirport,
      arrivalAirport: destinationAirport,
      departureTime: departureTime.toISOString(),
      arrivalTime: finalArrivalTime.toISOString(),
      flightNumber,
      airline: flightNumber.substring(0, 2),
      duration: `${hours}h ${minutes}m`,
      direct: false,
      segments
    };
    
    mockedConnectingFlights.push(flight);
  }
  
  return mockedConnectingFlights;
};

// Create specific connection flights with multiple segments
const createSpecificConnectionFlights = (originCode: string, destinationCode: string): ConnectionFlight[] => {
  console.log('Creating specific connection flights from', originCode, 'to', destinationCode);
  
  const originAirport = findAirportByCode(originCode);
  const destinationAirport = findAirportByCode(destinationCode);
  
  if (!originAirport || !destinationAirport) {
    console.error('Could not find airports for origin or destination');
    return [];
  }
  
  // Potential connecting airports
  const connectingOptions = ['LHR', 'FRA', 'DXB', 'HKG', 'ICN'];
  const connectionFlights: ConnectionFlight[] = [];
  
  // Create 3 different connecting flights
  for (let i = 0; i < 3; i++) {
    const connectingCode = connectingOptions[i % connectingOptions.length];
    const connectingAirport = findAirportByCode(connectingCode);
    
    if (!connectingAirport) {
      console.error('Could not find connecting airport', connectingCode);
      continue;
    }
    
    console.log(`Creating specific connection via ${connectingCode}`);
    
    // Create first leg
    const firstFlightNumber = generateFlightNumber("JS");
    const firstDepartureTime = new Date();
    firstDepartureTime.setHours(8 + i * 3);
    firstDepartureTime.setMinutes(Math.floor(Math.random() * 60));
    
    const firstFlightDurationMs = (4 + Math.floor(Math.random() * 3)) * 60 * 60 * 1000;
    const firstArrivalTime = new Date(firstDepartureTime.getTime() + firstFlightDurationMs);
    
    const firstLeg: Flight = {
      id: `${originCode}-${connectingCode}-${firstFlightNumber}`,
      departureAirport: originAirport,
      arrivalAirport: connectingAirport,
      departureTime: firstDepartureTime.toISOString(),
      arrivalTime: firstArrivalTime.toISOString(),
      flightNumber: firstFlightNumber,
      airline: firstFlightNumber.substring(0, 2),
      duration: `${Math.floor(firstFlightDurationMs / (60 * 60 * 1000))}h ${Math.floor((firstFlightDurationMs % (60 * 60 * 1000)) / (60 * 1000))}m`,
      direct: true,
      segments: [{
        departureAirport: originAirport,
        arrivalAirport: connectingAirport,
        departureTime: firstDepartureTime.toISOString(),
        arrivalTime: firstArrivalTime.toISOString()
      }]
    };
    
    // Create second leg
    const secondFlightNumber = generateFlightNumber("JS");
    
    // Layover time
    const layoverTimeMs = (1 + Math.floor(Math.random() * 3)) * 60 * 60 * 1000;
    const secondDepartureTime = new Date(firstArrivalTime.getTime() + layoverTimeMs);
    
    const secondFlightDurationMs = (5 + Math.floor(Math.random() * 4)) * 60 * 60 * 1000;
    const secondArrivalTime = new Date(secondDepartureTime.getTime() + secondFlightDurationMs);
    
    const secondLeg: Flight = {
      id: `${connectingCode}-${destinationCode}-${secondFlightNumber}`,
      departureAirport: connectingAirport,
      arrivalAirport: destinationAirport,
      departureTime: secondDepartureTime.toISOString(),
      arrivalTime: secondArrivalTime.toISOString(),
      flightNumber: secondFlightNumber,
      airline: secondFlightNumber.substring(0, 2),
      duration: `${Math.floor(secondFlightDurationMs / (60 * 60 * 1000))}h ${Math.floor((secondFlightDurationMs % (60 * 60 * 1000)) / (60 * 1000))}m`,
      direct: true,
      segments: [{
        departureAirport: connectingAirport,
        arrivalAirport: destinationAirport,
        departureTime: secondDepartureTime.toISOString(),
        arrivalTime: secondArrivalTime.toISOString()
      }]
    };
    
    // Calculate total duration
    const totalDurationMs = secondArrivalTime.getTime() - firstDepartureTime.getTime();
    const totalHours = Math.floor(totalDurationMs / (60 * 60 * 1000));
    const totalMinutes = Math.floor((totalDurationMs % (60 * 60 * 1000)) / (60 * 1000));
    
    // Calculate layover duration
    const layoverHours = Math.floor(layoverTimeMs / (60 * 60 * 1000));
    const layoverMinutes = Math.floor((layoverTimeMs % (60 * 60 * 1000)) / (60 * 1000));
    
    // Create the connection flight
    const connectionFlight: ConnectionFlight = {
      id: `${originCode}-${destinationCode}-via-${connectingCode}-${i}`,
      flights: [firstLeg, secondLeg],
      totalDuration: `${totalHours}h ${totalMinutes}m`,
      stopoverDuration: `${layoverHours}h ${layoverMinutes}m`,
      price: 350 + (i * 50)
    };
    
    connectionFlights.push(connectionFlight);
  }
  
  return connectionFlights;
};

