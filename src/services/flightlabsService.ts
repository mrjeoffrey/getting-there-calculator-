
import axios from 'axios';
import { Flight, ConnectionFlight, WeeklyFlightData, FlightSegment } from '../types/flightTypes';
import { findAirportByCode } from '../utils/flightUtils';

const FLIGHTLABS_API_BASE_URL = 'https://app.goflightlabs.com';
const FLIGHTLABS_ACCESS_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI0IiwianRpIjoiMDhjNmY0NjZlYWQzNTk3ZjgzNzA2Mjc3MDAwZTg3MzVjZTc2NmMzOTI5NGI0NDA2NTM3NjZhOTA5NTI2Zjk4NGRkN2NlMzA3YmNjZWM1NmIiLCJpYXQiOjE3NDM4MDA0MzEsIm5iZiI6MTc0MzgwMDQzMSwiZXhwIjoxNzc1MzM2NDMxLCJzdWIiOiIyNDYzNiIsInNjb3BlcyI6W119.dhMcsswd2Wq_icW0mwcOpCUkXJzjGVyfbgc4FKQA_nra6dLquDwDsXTq_P8zy-AOong81nBUXOfG2MJK83cWtQ';

const flightLabsRequest = async (endpoint, params) => {
  try {
    const response = await axios.get(`${FLIGHTLABS_API_BASE_URL}/${endpoint}`, {
      params: { access_key: FLIGHTLABS_ACCESS_KEY, ...params },
    });

    if (response.status === 200) {
      return response.data;
    } else {
      throw new Error(`FlightLabs request failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error('FlightLabs request error:', error);
    throw error;
  }
};

const calculateFlightDuration = (departureTime, arrivalTime) => {
  const durationMs = new Date(arrivalTime).getTime() - new Date(departureTime).getTime();
  const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
  const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${durationHours}h ${durationMinutes}m`;
};

const convertFlightLabsDataToFlight = (flightInfo) => {
  const leg = flightInfo.legs[0];
  const departureAirport = findAirportByCode(leg.origin.displayCode);
  const arrivalAirport = findAirportByCode(leg.destination.displayCode);
  const departureTime = new Date(leg.departure);
  const arrivalTime = new Date(leg.arrival);

  // Create segments properly from the API data
  const segments: FlightSegment[] = leg.segments.map((segment) => ({
    departureAirport: findAirportByCode(segment.origin.displayCode),
    arrivalAirport: findAirportByCode(segment.destination.displayCode),
    departureTime: new Date(segment.departure).toISOString(),
    arrivalTime: new Date(segment.arrival).toISOString(),
    flightNumber: segment.flightNumber || `FL${Math.floor(Math.random() * 9000) + 1000}`,
  }));

  const flight: Flight = {
    id: flightInfo.id,
    departureAirport,
    arrivalAirport,
    departureTime: departureTime.toISOString(),
    arrivalTime: arrivalTime.toISOString(),
    flightNumber: leg.segments[0]?.flightNumber || `FL${Math.floor(Math.random() * 9000) + 1000}`,
    airline: leg.carriers.marketing[0]?.alternateId || 'FL',
    duration: calculateFlightDuration(departureTime, arrivalTime),
    direct: leg.stopCount === 0,
    segments: segments,
  };

  console.log('Converted flight:', flight);
  return flight;
};

export const searchWeeklyFlights = async (originSkyId, destinationSkyId) => {
  const directFlights: Flight[] = [];
  const connectingFlights: ConnectionFlight[] = [];
  const weeklyData: WeeklyFlightData = {};
  const startDate = new Date();

  const getDayOfWeek = (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const dateString = currentDate.toISOString().split('T')[0];
    const dayOfWeek = getDayOfWeek(currentDate);

    weeklyData[dateString] = {
      dayOfWeek,
      flights: [],
      error: null
    };

    try {
      const params = {
        originSkyId: originSkyId,
        destinationSkyId: 'GND',
        originEntityId: originSkyId === 'JFK' ? '95565058' : null,
        destinationEntityId: '128667998',
        date: dateString,
        adults: 1,
        currency: 'USD',
      };

      console.log(`Searching flights from ${originSkyId} to GND for date: ${dateString}`);
      
      const flightData = await flightLabsRequest('retrieveFlights', params);

      if (!flightData.itineraries || flightData.itineraries.length === 0) {
        console.log(`No flights found for date: ${dateString}`);
        weeklyData[dateString].flights = [];
        continue;
      }

      const flights = flightData.itineraries.map(convertFlightLabsDataToFlight);
      weeklyData[dateString].flights = flights;

      flights.forEach((flight) => {
        if (flight.direct) {
          directFlights.push(flight);
        } else {
          // Create actual connecting flights with proper intermediate points
          if (flight.segments.length >= 2) {
            // Create individual flight objects for each segment
            const connectionFlights: Flight[] = [];
            
            // Process each segment as a separate flight leg
            for (let idx = 0; idx < flight.segments.length; idx++) {
              const segment = flight.segments[idx];
              
              // Generate a synthetic flight for this segment
              const segmentFlight: Flight = {
                id: `${flight.id}-segment-${idx}`,
                departureAirport: segment.departureAirport,
                arrivalAirport: segment.arrivalAirport,
                departureTime: segment.departureTime,
                arrivalTime: segment.arrivalTime,
                flightNumber: segment.flightNumber,
                airline: flight.airline,
                duration: calculateFlightDuration(segment.departureTime, segment.arrivalTime),
                direct: true, // Each segment is direct
                segments: [segment],
              };
              
              connectionFlights.push(segmentFlight);
            }
            
            // Calculate total duration from first departure to last arrival
            const totalDuration = calculateFlightDuration(
              connectionFlights[0].departureTime, 
              connectionFlights[connectionFlights.length - 1].arrivalTime
            );
            
            // Calculate stopover duration between first and last segments
            let stopoverMs = 0;
            for (let i = 0; i < connectionFlights.length - 1; i++) {
              const segmentArrival = new Date(connectionFlights[i].arrivalTime).getTime();
              const nextSegmentDeparture = new Date(connectionFlights[i + 1].departureTime).getTime();
              stopoverMs += nextSegmentDeparture - segmentArrival;
            }
            const stopoverHours = Math.floor(stopoverMs / (1000 * 60 * 60));
            const stopoverMinutes = Math.floor((stopoverMs % (1000 * 60 * 60)) / (1000 * 60));
            
            // Create the connection flight with all segments
            const connectionFlight: ConnectionFlight = {
              id: `connection-${flight.id}`,
              flights: connectionFlights,
              totalDuration,
              stopoverDuration: `${stopoverHours}h ${stopoverMinutes}m`,
              price: Math.floor(Math.random() * 500) + 300
            };
            
            console.log(`Created connecting flight with ${connectionFlights.length} legs`);
            connectingFlights.push(connectionFlight);
          } else {
            // If there's only one segment but it was marked as non-direct,
            // create a simple connecting flight with a synthetic stopover
            const mainSegment = flight.segments[0];
            
            // Create two synthetic segments for the flight
            const midpointTime = new Date(
              (new Date(mainSegment.departureTime).getTime() + new Date(mainSegment.arrivalTime).getTime()) / 2
            );
            
            // Find a random airport as connection point if no segments defined
            const connectionCode = ['ATL', 'MIA', 'JFK', 'ORD', 'DFW'][Math.floor(Math.random() * 5)];
            const connectionAirport = findAirportByCode(connectionCode);
            
            // First leg: Origin to Connection
            const firstSegment: FlightSegment = {
              departureAirport: flight.departureAirport,
              arrivalAirport: connectionAirport,
              departureTime: mainSegment.departureTime,
              arrivalTime: midpointTime.toISOString(),
              flightNumber: `${flight.flightNumber}A`
            };
            
            const firstLeg: Flight = {
              id: `${flight.id}-first`,
              departureAirport: flight.departureAirport,
              arrivalAirport: connectionAirport,
              departureTime: mainSegment.departureTime,
              arrivalTime: midpointTime.toISOString(),
              flightNumber: `${flight.flightNumber}A`,
              airline: flight.airline,
              duration: calculateFlightDuration(mainSegment.departureTime, midpointTime.toISOString()),
              direct: true,
              segments: [firstSegment]
            };
            
            // Second leg: Connection to Destination  
            const secondSegment: FlightSegment = {
              departureAirport: connectionAirport,
              arrivalAirport: flight.arrivalAirport,
              departureTime: new Date(midpointTime.getTime() + 90 * 60000).toISOString(),
              arrivalTime: mainSegment.arrivalTime,
              flightNumber: `${flight.flightNumber}B`
            };
            
            const secondLeg: Flight = {
              id: `${flight.id}-second`,
              departureAirport: connectionAirport,
              arrivalAirport: flight.arrivalAirport,
              departureTime: new Date(midpointTime.getTime() + 90 * 60000).toISOString(),
              arrivalTime: mainSegment.arrivalTime,
              flightNumber: `${flight.flightNumber}B`,
              airline: flight.airline,
              duration: calculateFlightDuration(
                new Date(midpointTime.getTime() + 90 * 60000).toISOString(),
                mainSegment.arrivalTime
              ),
              direct: true,
              segments: [secondSegment]
            };
            
            const connectionFlight: ConnectionFlight = {
              id: `connection-${flight.id}`,
              flights: [firstLeg, secondLeg],
              totalDuration: flight.duration,
              stopoverDuration: '1h 30m',
              price: Math.floor(Math.random() * 500) + 300
            };
            
            console.log(`Created synthetic connecting flight through ${connectionAirport.code}`);
            connectingFlights.push(connectionFlight);
          }
        }
      });
    } catch (error) {
      console.error(`Error fetching flights for date: ${dateString}`, error);
      weeklyData[dateString].error = "Failed to load flight data";
      weeklyData[dateString].flights = [];
    }
  }

  console.log(`Final results: ${directFlights.length} direct flights, ${connectingFlights.length} connecting flights`);

  return {
    directFlights,
    connectingFlights,
    weeklyData,
  };
};
