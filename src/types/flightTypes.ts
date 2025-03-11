
export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export interface Flight {
  id: string;
  departureAirport: Airport;
  arrivalAirport: Airport;
  departureTime: string;
  arrivalTime: string;
  flightNumber: string;
  airline: string;
  duration: string;
  direct: boolean;
}

export interface ConnectionFlight {
  id: string;
  flights: Flight[];
  totalDuration: string;
  stopoverDuration: string;
  price: number;
}

export interface SearchParams {
  from: string;
  to: string;
  date: string;
}

export interface SearchResults {
  directFlights: Flight[];
  connectingFlights: ConnectionFlight[];
  loading: boolean;
  error: string | null;
}
