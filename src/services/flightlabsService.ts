import axios from 'axios';
import { Flight, ConnectionFlight, WeeklyFlightData, FlightSegment } from '../types/flightTypes';
import { findAirportByCode } from '../utils/flightUtils';

const FLIGHTLABS_API_BASE_URL = 'https://app.goflightlabs.com';
const FLIGHTLABS_ACCESS_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI0IiwianRpIjoiMDhjNmY0NjZlYWQzNTk3ZjgzNzA2Mjc3MDAwZTg3MzVjZTc2NmMzOTI5NGI0NDA2NTM3NjZhOTA5NTI2Zjk4NGRkN2NlMzA3YmNjZWM1NmIiLCJpYXQiOjE3NDM4MDA0MzEsIm5iZiI6MTc0MzgwMDQzMSwiZXhwIjoxNzc1MzM2NDMxLCJzdWIiOiIyNDYzNiIsInNjb3BlcyI6W119.dhMcsswd2Wq_icW0mwcOpCUkXJzjGVyfbgc4FKQA_nra6dLquDwDsXTq_P8zy-AOong81nBUXOfG2MJK83cWtQ';

const flightLabsRequest = async (endpoint, params) => {
  console.log(`[API Request] ➜ ${endpoint}`, params);
  try {
    const response = await axios.get(`${FLIGHTLABS_API_BASE_URL}/${endpoint}`, {
      params: { access_key: FLIGHTLABS_ACCESS_KEY, ...params },
    });

    console.log(`[API Response] ✔ ${endpoint}: Status ${response.status}`);
    return response.data;
  } catch (error) {
    console.error(`[API Error] ❌ ${endpoint}:`, error);
    throw error;
  }
};

const formatMinutesToHours = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const formatted = `${hours}h ${remainingMinutes}m`;
  console.log(`[Format Duration] ${minutes} min → ${formatted}`);
  return formatted;
};

const convertFlightLabsDataToFlights = (flightInfo) => {
  const flights = [];

  flightInfo.legs.forEach((leg, legIndex) => {
    const departureAirport = findAirportByCode(leg.origin.displayCode);
    const arrivalAirport = findAirportByCode(leg.destination.displayCode);
    const departureTime = new Date(leg.departure);
    const arrivalTime = new Date(leg.arrival);

    const segments = leg.segments.map((segment, idx) => {
      const seg = {
        departureAirport: findAirportByCode(segment.origin.displayCode),
        arrivalAirport: findAirportByCode(segment.destination.displayCode),
        departureTime: new Date(segment.departure).toISOString(),
        arrivalTime: new Date(segment.arrival).toISOString(),
        flightNumber: segment.flightNumber || `FL${Math.floor(Math.random() * 9000) + 1000}`,
        duration: formatMinutesToHours(segment.durationInMinutes) || 'N/A',
        durationInMinutes: segment.durationInMinutes
      };
      console.log(`[Segment Created] [${idx}]`, seg);
      return seg;
    });

    const flight = {
      id: `${flightInfo.id}-leg-${legIndex}`,
      departureAirport,
      arrivalAirport,
      departureTime: departureTime.toISOString(),
      arrivalTime: arrivalTime.toISOString(),
      flightNumber: leg.segments[0]?.flightNumber || `FL${Math.floor(Math.random() * 9000) + 1000}`,
      airline: leg.carriers.marketing[0]?.alternateId || 'FL',
      duration: formatMinutesToHours(leg.durationInMinutes) || 'N/A',
      direct: leg.stopCount === 0,
      segments,
    };

    console.log(`[Flight Parsed] ✈️`, flight);
    flights.push(flight);
  });

  return flights;
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

  for (let i = 0; i < 1; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const dateString = currentDate.toISOString().split('T')[0];
    const dayOfWeek = getDayOfWeek(currentDate);

    console.log(`\n[🔍 Searching Flights for] ${dateString} (${dayOfWeek})`);
    weeklyData[dateString] = {
      dayOfWeek,
      flights: [],
      error: null
    };

    try {
      const params = {
        originSkyId,
        destinationSkyId: 'GND',
        originEntityId: originSkyId === 'JFK' ? '95565058' : null,
        destinationEntityId: '128667998',
        date: dateString,
        adults: 1,
        currency: 'USD',
      };

      const flightData = await flightLabsRequest('retrieveFlights', params);
      console.log(`[Itinerary Count] 📦 ${flightData.itineraries?.length || 0}`);

      if (!flightData.itineraries || flightData.itineraries.length === 0) {
        weeklyData[dateString].flights = [];
        continue;
      }

      const flights = flightData.itineraries.flatMap(convertFlightLabsDataToFlights);
      weeklyData[dateString].flights = flights;

      flights.forEach((flight) => {
        if (flight.direct) {
          console.log(`[Direct Flight] ➡️ ${flight.flightNumber}`);
          directFlights.push(flight);
        } else {
          console.log(`[Connection Detected] 🔁 Segments: ${flight.segments.length}`);
          if (flight.segments.length >= 2) {
            const connectionFlightsArray = flight.segments.map((segment, idx) => {
              const f = {
                id: `${flight.id}-segment-${idx}`,
                departureAirport: segment.departureAirport,
                arrivalAirport: segment.arrivalAirport,
                departureTime: segment.departureTime,
                arrivalTime: segment.arrivalTime,
                flightNumber: segment.flightNumber,
                airline: flight.airline,
                duration: segment.duration,
                direct: true,
                segments: [segment],
              };
              console.log(`[Segment Flight Created] ✈️`, f);
              return f;
            });

            const totalDuration = formatMinutesToHours(
              flight.segments.reduce((acc, seg) => acc + seg.durationInMinutes, 0)
            );

            let stopoverMs = 0;
            for (let i = 0; i < connectionFlightsArray.length - 1; i++) {
              const segmentArrival = new Date(connectionFlightsArray[i].arrivalTime).getTime();
              const nextSegmentDeparture = new Date(connectionFlightsArray[i + 1].departureTime).getTime();
              stopoverMs += nextSegmentDeparture - segmentArrival;
            }

            const stopoverDuration = formatMinutesToHours(Math.floor(stopoverMs / (1000 * 60)));

            const connectionFlight = {
              id: `connection-${flight.id}`,
              flights: connectionFlightsArray,
              totalDuration,
              stopoverDuration,
            };

            console.log(`[Connection Flight Built] ✈️`, connectionFlight);
            connectingFlights.push(connectionFlight);
          }
        }
      });
    } catch (error) {
      console.error(`❌ Error fetching flights for ${dateString}`, error);
      weeklyData[dateString].error = "Failed to load flight data";
    }
  }

  console.log(`\n📊 Final Result: ${directFlights.length} direct | ${connectingFlights.length} connecting`);
  return {
    directFlights,
    connectingFlights,
    weeklyData,
  };
};
