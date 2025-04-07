import axios from 'axios';
import { Flight } from '../types/flightTypes';
import { findAirportByCode } from '../utils/flightUtils';

const FLIGHTLABS_API_BASE_URL = 'https://app.goflightlabs.com';
const FLIGHTLABS_ACCESS_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI0IiwianRpIjoiMDhjNmY0NjZlYWQzNTk3ZjgzNzA2Mjc3MDAwZTg3MzVjZTc2NmMzOTI5NGI0NDA2NTM3NjZhOTA5NTI2Zjk4NGRkN2NlMzA3YmNjZWM1NmIiLCJpYXQiOjE3NDM4MDA0MzEsIm5iZiI6MTc0MzgwMDQzMSwiZXhwIjoxNzc1MzM2NDMxLCJzdWIiOiIyNDYzNiIsInNjb3BlcyI6W119.dhMcsswd2Wq_icW0mwcOpCUkXJzjGVyfbgc4FKQA_nra6dLquDwDsXTq_P8zy-AOong81nBUXOfG2MJK83cWtQ'; // Replace with your FlightLabs access key

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
  const durationMs = arrivalTime - departureTime;
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

  return {
    id: flightInfo.id,
    departureAirport,
    arrivalAirport,
    departureTime: departureTime.toISOString(),
    arrivalTime: arrivalTime.toISOString(),
    flightNumber: leg.segments[0].flightNumber,
    airline: leg.carriers.marketing[0].alternateId,
    duration: calculateFlightDuration(departureTime, arrivalTime),
    direct: leg.stopCount === 0,
    segments: leg.segments.map((segment) => ({
      departureAirport: findAirportByCode(segment.origin.displayCode),
      arrivalAirport: findAirportByCode(segment.destination.displayCode),
      departureTime: new Date(segment.departure).toISOString(),
      arrivalTime: new Date(segment.arrival).toISOString(),
      flightNumber: segment.flightNumber,
    })),
  };
};

export const searchWeeklyFlights = async (originSkyId, destinationSkyId) => {
  const directFlights = [];
  const connectingFlights = [];
  const weeklyData = {};
  const startDate = new Date();

  for (let i = 0; i < 1; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const dateString = currentDate.toISOString().split('T')[0];

    const params = {
        originSkyId: 'JFK',
        destinationSkyId: 'GND',
        originEntityId: '95565058',       // Entity ID for JFK
        destinationEntityId: '128667998', // Entity ID for Grenada (GND)
        date: '2025-04-07',
        adults: 1,
        currency: 'USD',
      };
      
      

    try {
      const flightData = await flightLabsRequest('retrieveFlights', params);

      if (!flightData.itineraries || flightData.itineraries.length === 0) {
        weeklyData[dateString] = [];
        continue;
      }

      const flights = flightData.itineraries.map(convertFlightLabsDataToFlight);
      weeklyData[dateString] = flights;

      flights.forEach((flight) => {
        if (flight.direct) {
          directFlights.push(flight);
        } else {
          connectingFlights.push(flight);
        }
      });
    } catch (error) {
      console.error(`Error fetching flights for date: ${dateString}`, error);
      weeklyData[dateString] = [];
    }
  }

  return {
    directFlights,
    connectingFlights,
    weeklyData,
  };
};