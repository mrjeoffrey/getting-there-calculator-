
export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export interface FlightSegment {
  departureAirport: Airport;
  arrivalAirport: Airport;
  departureTime: string;
  arrivalTime: string;
  flightNumber: string;
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
  segments: FlightSegment[];
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
  date?: string; // Make date optional
}

export interface SearchResults {
  directFlights: Flight[];
  connectingFlights: ConnectionFlight[];
  loading: boolean;
  error: string | null;
}

export interface WeeklyFlightData {
  [date: string]: {
    dayOfWeek: string;
    flights: Flight[];
    error?: string;
  };
}

// Enhanced interface for connection leg tracking
export interface ConnectionLegStatus {
  connectionId: string;
  legIndex: number;
  isComplete: boolean;
  nextLegStarted: boolean; // Added flag to track whether next leg started
}
