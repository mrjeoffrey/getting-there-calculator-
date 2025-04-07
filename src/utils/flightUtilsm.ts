
import { Airport, Flight, ConnectionFlight, FlightSegment } from '../types/flightTypes';
import { airports } from './airports.json';
import { findAirportByCode } from './flightUtils';

export const transformAirports = (originalAirports: any[]): Airport[] => {
  return originalAirports.map(airport => ({
    code: airport.iata_code,
    name: airport.name,
    city: airport.city,
    country: airport.country,
    lat: airport._geoloc.lat,
    lng: airport._geoloc.lng
  }));
};

// Create proper Airport objects instead of just using {code: string}
export const createFullAirportObject = (code: string): Airport => {
  const airport = findAirportByCode(code);
  
  if (!airport) {
    // Return a default airport object with required fields if not found
    return {
      code: code,
      name: `Airport ${code}`,
      city: 'Unknown',
      country: 'Unknown',
      lat: 0,
      lng: 0
    };
  }
  
  return airport;
};

// The rest of the file would go here, with airport objects properly created
// using the createFullAirportObject function whenever needed
