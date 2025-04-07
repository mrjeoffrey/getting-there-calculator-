import axios from 'axios';
import { Flight, ConnectionFlight, WeeklyFlightData } from '../types/flightTypes';
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

  const flight = {
    id: flightInfo.id,
    departureAirport,
    arrivalAirport,
    departureTime: departureTime.toISOString(),
    arrivalTime: arrivalTime.toISOString(),
    flightNumber: leg.segments[0]?.flightNumber || `FL${Math.floor(Math.random() * 9000) + 1000}`,
    airline: leg.carriers.marketing[0]?.alternateId || 'FL',
    duration: calculateFlightDuration(departureTime, arrivalTime),
    direct: leg.stopCount === 0,
    segments: leg.segments.map((segment) => ({
      departureAirport: findAirportByCode(segment.origin.displayCode),
      arrivalAirport: findAirportByCode(segment.destination.displayCode),
      departureTime: new Date(segment.departure).toISOString(),
      arrivalTime: new Date(segment.arrival).toISOString(),
      flightNumber: segment.flightNumber || `FL${Math.floor(Math.random() * 9000) + 1000}`,
    })),
  };

  console.log('Converted flight:', flight);
  return flight;
};

export const searchWeeklyFlights = async (originSkyId, destinationSkyId) => {
  const directFlights = [];
  const connectingFlights = [];
  const weeklyData = {};
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
          const connectionFlight = {
            id: `connection-${flight.id}`,
            flights: [flight],
            totalDuration: flight.duration,
            stopoverDuration: '1h 30m',
            price: Math.floor(Math.random() * 500) + 300
          };
          connectingFlights.push(connectionFlight);
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
