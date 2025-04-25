import axios from 'axios';
import { Flight, ConnectionFlight, WeeklyFlightData, FlightSegment } from '../types/flightTypes';
import { findAirportByCode } from '../utils/flightUtils';
import { supabase } from '../utils/supabaseClient';


const FLIGHTLABS_API_BASE_URL = 'https://app.goflightlabs.com';
// Manual deployment 3
const FLIGHTLABS_ACCESS_KEY = process.env.NEXT_PUBLIC_FLIGHTLABS_API_KEY;

const flightLabsRequest = async (endpoint, params) => {
  const { originSkyId,originairport,dayOfWeek, originEntityId, destinationSkyId = 'GND', date } = params;
  console.log(`[FlightLabs date] 🔍 ${dayOfWeek}`);
  console.log(`[Cache Check] 🔍 origin: ${originSkyId}, destination: ${destinationSkyId}, date: ${date}`);

  // Step 1: Check if data is already cached
  const { data: cached, error: cacheError } = await supabase
    .from('flight_cache')
    .select('raw_data')
    .eq('origin_sky_id', originSkyId)
    .eq('origin_entity_id', originEntityId)
    .eq('origin_airport', originairport)
    .eq('destination_sky_id', destinationSkyId)
    .eq ('day_of_week', dayOfWeek)
    .maybeSingle();

  if (cached?.raw_data && !cacheError) {
    console.log(`✅ [Cache Hit] Returning cached raw response`, cached.raw_data);
    return cached.raw_data;
  }

  // Step 2: Fetch from FlightLabs API
  console.log(`[API Request] ➜ ${endpoint}`, params);

  try {
    const response = await axios.get(`${FLIGHTLABS_API_BASE_URL}/${endpoint}`, {
      params: { access_key: FLIGHTLABS_ACCESS_KEY, ...params },
    });

    console.log(`[API Response] ✔ ${endpoint}: Status ${response.status}`);
    console.log(`[API Response Data] 📦`, response.data);

    // Step 3: Store raw response in DB
    const { error: insertError } = await supabase.from('flight_cache').insert({
      origin_sky_id: originSkyId,
      origin_entity_id: originEntityId,
      destination_sky_id: destinationSkyId,
      origin_airport: originairport,
      date,
      day_of_week: dayOfWeek,
      raw_data: response.data
    });

    if (insertError) {
      console.error(`[Supabase Insert] ❌ Failed to store raw response`, insertError);
    } else {
      console.log(`[Supabase Insert] ✅ Raw response cached`);
    }

    return response.data;
  } catch (error) {
    console.error(`[API Error] ❌ ${endpoint}:`, error?.response?.data || error.message);
    throw error;
  }
};


export const getAirportInfo = async (query: string) => {
  const endpoint = 'retrieveAirport';
  const params = {
    access_key: FLIGHTLABS_ACCESS_KEY,
    query
  };
  console.log(`[acess_key]  "${FLIGHTLABS_ACCESS_KEY}"`);
  console.log(`[Airport Lookup] 🔍 Searching for "${query}"`);

  // Step 1: Check Supabase first
  const { data: cached, error: cacheError } = await supabase
    .from('airport_info_cache')
    .select('sky_id, entity_id')
    .eq('query', query)
    .maybeSingle();

  if (cached && !cacheError) {
    console.log(`[Airport Lookup] ✅ Cache Hit`, cached);
    return {
      skyId: cached.sky_id,
      entityId: cached.entity_id
    };
  }

  // Step 2: If not in cache, hit the API
  try {
    const response = await axios.get(`${FLIGHTLABS_API_BASE_URL}/${endpoint}`, { params });
    const airports = response.data;

    if (airports.length === 0) {
      console.warn(`[Airport Lookup] No results for "${query}"`);
      return null;
    }

    const topMatch = airports[0];
    const { skyId, entityId } = topMatch;
    console.log(`[Airport Lookup] acess`, FLIGHTLABS_ACCESS_KEY);
    console.log(`[Airport Lookup] ✅ Found`, { skyId, entityId });

    // Step 3: Save to Supabase
    await supabase.from('airport_info_cache').insert({
      query,
      sky_id: skyId,
      entity_id: entityId
    });

    return { skyId, entityId };
  } catch (error) {
    console.error(`[Airport Lookup] ❌ Error searching airport "${query}":`, error);
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
      direct: leg.stopCount === 0 && leg.segments.length === 1,
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
  let originQuery = originSkyId;
  let originairport = originSkyId;
  let originEntityId = '128667998'; // fallback

  const originInfo = await getAirportInfo(originQuery);
  if (originInfo) {
    console.log(`[Origin Airport Info] Found: ${originInfo.skyId} (${originInfo.entityId})`);
    originSkyId = originInfo.skyId;
    originEntityId = originInfo.entityId;
  } else {
    console.warn(`[Origin Airport Info] Not found for "${originQuery}", using fallback`);
  }
  for (let i = 0; i < 7; i++) {
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
originEntityId,
destinationSkyId: 'GND',
destinationEntityId: '128667998',
date: dateString,
originairport:originairport,
dayOfWeek: dayOfWeek
};

const flightData = await flightLabsRequest('retrieveFlights', params);
      console.log(`[Itinerary Count] 📦 ${flightData.itineraries?.length || 0}`);

      if (!flightData.itineraries || flightData.itineraries.length === 0) {
        weeklyData[dateString].flights = [];
        continue;
      }
      const desiredAirportCode = originairport; 
const matchingItineraries = (flightData.itineraries || []).filter(itinerary => {
  const firstLeg = itinerary.legs?.[0];
  return firstLeg?.origin?.displayCode === desiredAirportCode;
});

if (matchingItineraries.length === 0) {
  weeklyData[dateString].flights = [];
  continue;
}

      const flights = matchingItineraries.flatMap(convertFlightLabsDataToFlights);

      // const flights = flightData.itineraries.flatMap(convertFlightLabsDataToFlights);
      console.log(`flights📦 ${flights}`);
      weeklyData[dateString].flights = flights;

      flights.forEach((flight) => {
        if (flight.direct) {
          console.log(`[Direct Flight] ➡️ ${flight.flightNumber}`);
          directFlights.push(flight);
        } else {
          console.log(`[Connection Detected] 🔁 Segments: ${flight.segments.length}`);
          if (flight.segments.length >= 1) {
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
