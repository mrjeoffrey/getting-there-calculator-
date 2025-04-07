import Amadeus from 'amadeus';
import { Flight, FlightSegment, Airport, ConnectionFlight, WeeklyFlightData } from '../types/flightTypes';
import { transformAirports, createFullAirportObject } from '../utils/flightUtils';
import { addDays, format, subDays } from 'date-fns';

// Amadeus API configuration
const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

// Function to fetch flight offers from Amadeus API
export const getFlightOffers = async (originCode: string, destinationCode: string, departureDate: string): Promise<any> => {
  try {
    const response = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode: originCode,
      destinationLocationCode: destinationCode,
      departureDate: departureDate,
      adults: 1,
      max: 5
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching flight offers:", error);
    throw error;
  }
};

// Function to map Amadeus API response to Flight type
export const mapFlightOffers = (flightOffers: any[]): Flight[] => {
  return flightOffers.map(offer => {
    const segments = offer.itineraries[0].segments;
    const departureAirport = createFullAirportObject(segments[0].departure.iataCode);
    const arrivalAirport = createFullAirportObject(segments[segments.length - 1].arrival.iataCode);
    const departureTime = segments[0].departure.at;
    const arrivalTime = segments[segments.length - 1].arrival.at;
    const duration = offer.itineraries[0].duration;
    const price = offer.offerPricing?.price?.total || '0';
    const flightNumber = segments[0].number || `Unknown-${Math.random().toString(36).substring(7)}`;
    const airline = segments[0].carrierCode;

    return {
      id: offer.id,
      departureAirport,
      arrivalAirport,
      departureTime,
      arrivalTime,
      duration,
      flightNumber,
      airline,
      direct: segments.length === 1,
      segments: extractFlightSegments(offer) || []
    };
  });
};

// Function to fetch airport information from Amadeus API
export const getAirportInformation = async (keyword: string): Promise<Airport[]> => {
  try {
    const response = await amadeus.referenceData.locations.get({
      keyword: keyword,
      subType: 'AIRPORT'
    });
    
    if (response && response.data) {
      return transformAirports(response.data);
    } else {
      console.warn("No data received from Amadeus Airport API");
      return [];
    }
  } catch (error) {
    console.error("Error fetching airport information:", error);
    return [];
  }
};

// Function to calculate the date range for a week
const getWeekDateRange = (date: Date) => {
  const startDate = subDays(date, 3);
  const endDate = addDays(date, 3);
  return {
    start: format(startDate, 'yyyy-MM-dd'),
    end: format(endDate, 'yyyy-MM-dd')
  };
};

// Function to fetch weekly flight data
export const getWeeklyFlightData = async (originCode: string, destinationCode: string, date: Date) => {
  const { start, end } = getWeekDateRange(date);
  
  try {
    const response = await amadeus.analytics.itineraryPriceMetrics.get({
      originIataCode: originCode,
      destinationIataCode: destinationCode,
      departureDate: `${start},${end}`
    });
    
    return response.data;
  } catch (error) {
    console.error("Error fetching weekly flight data:", error);
    return null;
  }
};

// Function to search for the cheapest destinations
export const searchCheapestDestinations = async (originCode: string, departureDate: string, maxPrice: number = 200) => {
  try {
    const response = await amadeus.shopping.flightDestinations.get({
      origin: originCode,
      departureDate: departureDate,
      maxPrice: maxPrice
    });
    return response.data;
  } catch (error) {
    console.error("Error searching cheapest destinations:", error);
    throw error;
  }
};

// Function to confirm flight price
export const confirmFlightPrice = async (flightOffer: any) => {
  try {
    const response = await amadeus.shopping.flightOffers.pricing.post(
      JSON.stringify({
        'data': {
          'type': 'flight-offer-pricing',
          'flightOffers': [flightOffer]
        }
      })
    );
    return response.data;
  } catch (error) {
    console.error("Error confirming flight price:", error);
    throw error;
  }
};

// Function to book a flight
export const bookFlight = async (flightOffer: any, passengers: any[]) => {
  try {
    const response = await amadeus.booking.flightOrders.post(
      JSON.stringify({
        'data': {
          'type': 'flight-order',
          'flightOffers': [flightOffer],
          'passengers': passengers
        }
      })
    );
    return response.data;
  } catch (error) {
    console.error("Error booking flight:", error);
    throw error;
  }
};

// Function to get flight inspiration
export const getFlightInspiration = async (originCode: string) => {
  try {
    const response = await amadeus.shopping.flightInspirationSearch.get({
      origin: originCode
    });
    return response.data;
  } catch (error) {
    console.error("Error getting flight inspiration:", error);
    throw error;
  }
};

// Function to get flight most booked destinations
export const getMostBookedDestinations = async (originCode: string) => {
  try {
    const response = await amadeus.analytics.flights.booked.get({
      originCityCode: originCode,
      period: '2023-07'
    });
    return response.data;
  } catch (error) {
    console.error("Error getting most booked destinations:", error);
    throw error;
  }
};

// Function to get flight most traveled destinations
export const getMostTraveledDestinations = async () => {
  try {
    const response = await amadeus.analytics.flights.traveled.get({
      period: '2023-07'
    });
    return response.data;
  } catch (error) {
    console.error("Error getting most traveled destinations:", error);
    throw error;
  }
};

// Function to convert duration to human-readable format
const durationToHumanReadable = (duration: string) => {
  const hours = parseInt(duration.slice(2, 4));
  const minutes = parseInt(duration.slice(5, 7));
  return `${hours}h ${minutes}m`;
};

// Function to search for flights with multiple connections
export const searchMultiCityFlights = async (segments: { originCode: string, destinationCode: string, departureDate: string }[]) => {
  try {
    const response = await amadeus.shopping.flightOffersSearch.get({
      segments: segments.map(segment => ({
        departureLocationCode: segment.originCode,
        arrivalLocationCode: segment.destinationCode,
        departureDateTime: segment.departureDate
      })),
      adults: 1,
      max: 5
    });
    return response.data;
  } catch (error) {
    console.error("Error searching multi-city flights:", error);
    throw error;
  }
};

// Function to extract flight segments from a flight offer
const extractFlightSegments = (flightOffer: any): FlightSegment[] => {
  const segments = flightOffer.itineraries[0].segments;
  return segments.map(segment => {
    const flightSegment: FlightSegment = {
      departureAirport: createFullAirportObject(segment.departure.iataCode),
      arrivalAirport: createFullAirportObject(segment.arrival.iataCode),
      departureTime: segment.departure.at,
      arrivalTime: segment.arrival.at,
      flightNumber: segment.number || `Unknown-${Math.random().toString(36).substring(7)}`
    };
    return flightSegment;
  });
};

// Function to map Amadeus API response to ConnectionFlight type
export const mapConnectionFlights = (flightOffers: any[]): ConnectionFlight[] => {
  return flightOffers.map(offer => {
    const segments = offer.itineraries[0].segments;
    const departureAirport = createFullAirportObject(segments[0].departure.iataCode);
    const arrivalAirport = createFullAirportObject(segments[segments.length - 1].arrival.iataCode);
    const departureTime = segments[0].departure.at;
    const arrivalTime = segments[segments.length - 1].arrival.at;
    const duration = offer.itineraries[0].duration;
    const price = offer.offerPricing?.price?.total || 0;
    
    // Extract flight segments and create Flight objects
    const flightSegments = extractFlightSegments(offer);
    const flights: Flight[] = flightSegments.map((segment, index) => {
      return {
        id: `${offer.id}-segment-${index}`,
        departureAirport: segment.departureAirport,
        arrivalAirport: segment.arrivalAirport,
        departureTime: segment.departureTime,
        arrivalTime: segment.arrivalTime,
        flightNumber: segment.flightNumber,
        airline: segments[index].carrierCode || 'Unknown',
        duration: segments[index].duration || 'Unknown',
        direct: true,
        segments: []
      };
    });
    
    // Calculate stopover duration if there are multiple segments
    let stopoverDuration = 'N/A';
    if (segments.length > 1) {
      // Try to calculate time between segments
      try {
        const firstArrival = new Date(segments[0].arrival.at);
        const secondDeparture = new Date(segments[1].departure.at);
        const diffMs = secondDeparture.getTime() - firstArrival.getTime();
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        stopoverDuration = `${diffHrs}h ${diffMins}m`;
      } catch (e) {
        console.error("Error calculating stopover duration:", e);
      }
    }
    
    return {
      id: offer.id,
      departureAirport,
      arrivalAirport,
      departureTime,
      arrivalTime,
      duration,
      price: Number(price),
      flights,
      totalDuration: duration || 'Unknown',
      stopoverDuration
    };
  });
};

// Function to search for flights with multiple connections using price range
export const searchFlightsWithPriceRange = async (originCode: string, destinationCode: string, departureDate: string, maxPrice: number) => {
    try {
        const response = await amadeus.shopping.flightOffersSearch.get({
            originLocationCode: originCode,
            destinationLocationCode: destinationCode,
            departureDate: departureDate,
            adults: 1,
            maxPrice: maxPrice
        });
        return response.data;
    } catch (error) {
        console.error("Error searching flights with price range:", error);
        throw error;
    }
};

// Function to get flight schedules
export const getFlightSchedules = async (originCode: string, destinationCode: string, departureDate: string) => {
  try {
    const response = await amadeus.schedule.flights.get({
      originLocationCode: originCode,
      destinationLocationCode: destinationCode,
      departureDate: departureDate
    });
    return response.data;
  } catch (error) {
    console.error("Error getting flight schedules:", error);
    throw error;
  }
};

// Function to map Amadeus API response to Flight type for flight schedules
export const mapFlightSchedules = (flightSchedules: any[]): Flight[] => {
  return flightSchedules.map(schedule => {
    const flightNumber = schedule.flightNumber;
    const airline = schedule.operatingCarrierCode;
    const departureAirport = createFullAirportObject(schedule.departure.airportCode);
    const arrivalAirport = createFullAirportObject(schedule.arrival.airportCode);
    const departureTime = schedule.departure.scheduledTime;
    const arrivalTime = schedule.arrival.scheduledTime;
    const duration = schedule.duration;

    return {
      id: schedule.id,
      flightNumber,
      airline,
      departureAirport,
      arrivalAirport,
      departureTime,
      arrivalTime,
      duration,
      direct: true,
      segments: []
    };
  });
};

// Function to get flight delays
export const getFlightDelays = async (airlineCode: string, flightNumber: string, departureDate: string) => {
  try {
    const response = await amadeus.dutyOfCare.diseases.covid19AreaReport.get({
      airlineCode: airlineCode,
      flightNumber: flightNumber,
      departureDate: departureDate
    });
    return response.data;
  } catch (error) {
    console.error("Error getting flight delays:", error);
    throw error;
  }
};

// Function to get travel restrictions
export const getTravelRestrictions = async (countryCode: string) => {
  try {
    const response = await amadeus.dutyOfCare.diseases.covid19AreaReport.get({
      countryCode: countryCode
    });
    return response.data;
  } catch (error) {
    console.error("Error getting travel restrictions:", error);
    throw error;
  }
};

// Function to get airport on-time performance
export const getAirportOnTimePerformance = async (airportCode: string, date: string) => {
  try {
    const response = await amadeus.airport.predictions.onTime.get({
      airportCode: airportCode,
      date: date
    });
    return response.data;
  } catch (error) {
    console.error("Error getting airport on-time performance:", error);
    throw error;
  }
};

// Function to get flight status
export const getFlightStatus = async (airlineCode: string, flightNumber: string, departureDate: string) => {
  try {
    const response = await amadeus.flight.status.get({
      carrierCode: airlineCode,
      flightNumber: flightNumber,
      scheduledDepartureDate: departureDate
    });
    return response.data;
  } catch (error) {
    console.error("Error getting flight status:", error);
    throw error;
  }
};

// Function to get seat maps
export const getSeatMaps = async (flightOffer: any) => {
  try {
    const response = await amadeus.shopping.seatMaps.get(flightOffer);
    return response.data;
  } catch (error) {
    console.error("Error getting seat maps:", error);
    throw error;
  }
};

// Function to get flight offers from flight order
export const getFlightOffersFromFlightOrder = async (orderId: string) => {
  try {
    const response = await amadeus.booking.flightOrders.get(orderId);
    return response.data;
  } catch (error) {
    console.error("Error getting flight offers from flight order:", error);
    throw error;
  }
};

// Function to get airline code from flight number
export const getAirlineCodeFromFlightNumber = (flightNumber: string) => {
  const airlineCode = flightNumber.slice(0, 2);
  return airlineCode;
};

// Function to get terminal information from airport
export const getTerminalInformationFromAirport = async (airportCode: string) => {
  try {
    const response = await amadeus.referenceData.airport.directDestinations.get({
      airportCode: airportCode
    });
    return response.data;
  } catch (error) {
    console.error("Error getting terminal information from airport:", error);
    throw error;
  }
};

// Function to get flight recommendations
export const getFlightRecommendations = async (originCode: string, destinationCode: string, departureDate: string) => {
  try {
    const response = await amadeus.shopping.flightOffers.prediction.post(
      JSON.stringify({
        'data': {
          'type': 'flight-offer-prediction',
          'originLocationCode': originCode,
          'destinationLocationCode': destinationCode,
          'departureDate': departureDate,
          'adults': 1
        }
      })
    );
    return response.data;
  } catch (error) {
    console.error("Error getting flight recommendations:", error);
    throw error;
  }
};

// Function to get activity recommendations
export const getActivityRecommendations = async (latitude: number, longitude: number) => {
  try {
    const response = await amadeus.shopping.activities.get({
      latitude: latitude,
      longitude: longitude
    });
    return response.data;
  } catch (error) {
    console.error("Error getting activity recommendations:", error);
    throw error;
  }
};

// Function to get hotel recommendations
export const getHotelRecommendations = async (cityCode: string) => {
  try {
    const response = await amadeus.referenceData.locations.hotels.byCity.get({
      cityCode: cityCode
    });
    return response.data;
  } catch (error) {
    console.error("Error getting hotel recommendations:", error);
    throw error;
  }
};

// Function to get car rental recommendations
export const getCarRentalRecommendations = async (latitude: number, longitude: number) => {
  try {
    const response = await amadeus.referenceData.locations.cars.get({
      latitude: latitude,
      longitude: longitude
    });
    return response.data;
  } catch (error) {
    console.error("Error getting car rental recommendations:", error);
    throw error;
  }
};

// Function to get points of interest
export const getPointsOfInterest = async (latitude: number, longitude: number) => {
  try {
    const response = await amadeus.referenceData.locations.pointsOfInterest.get({
      latitude: latitude,
      longitude: longitude
    });
    return response.data;
  } catch (error) {
    console.error("Error getting points of interest:", error);
    throw error;
  }
};

// Function to get safe place API
export const getSafePlaceAPI = async (latitude: number, longitude: number) => {
  try {
    const response = await amadeus.safety.safetyRatedLocations.get({
      latitude: latitude,
      longitude: longitude
    });
    return response.data;
  } catch (error) {
    console.error("Error getting safe place API:", error);
    throw error;
  }
};

// Function to get area adverse weather conditions
export const getAreaAdverseWeatherConditions = async (latitude: number, longitude: number) => {
  try {
    const response = await amadeus.safety.adverseWeatherConditions.get({
      latitude: latitude,
      longitude: longitude
    });
    return response.data;
  } catch (error) {
    console.error("Error getting area adverse weather conditions:", error);
    throw error;
  }
};

// Function to get disruption reports
export const getDisruptionReports = async (airlineCode: string, flightNumber: string, date: string) => {
  try {
    const response = await amadeus.travel.predictions.flightDelay.get({
      airlineCode: airlineCode,
      flightNumber: flightNumber,
      date: date
    });
    return response.data;
  } catch (error) {
    console.error("Error getting disruption reports:", error);
    throw error;
  }
};

// Function to get airport nearest relevant airport
export const getAirportNearestRelevantAirport = async (latitude: number, longitude: number) => {
  try {
    const response = await amadeus.referenceData.locations.airports.get({
      latitude: latitude,
      longitude: longitude
    });
    return response.data;
  } catch (error) {
    console.error("Error getting airport nearest relevant airport:", error);
    throw error;
  }
};

// Function to get airline code lookup
export const getAirlineCodeLookup = async (airlineCode: string) => {
  try {
    const response = await amadeus.referenceData.airlines.get({
      airlineCode: airlineCode
    });
    return response.data;
  } catch (error) {
    console.error("Error getting airline code lookup:", error);
    throw error;
  }
};

// Function to get equipment type
export const getEquipmentType = async (aircraftCode: string) => {
  try {
    const response = await amadeus.referenceData.aircrafts.get({
      aircraftCode: aircraftCode
    });
    return response.data;
  } catch (error) {
    console.error("Error getting equipment type:", error);
    throw error;
  }
};

// Function to get location from coordinates
export const getLocationFromCoordinates = async (latitude: number, longitude: number) => {
  try {
    const response = await amadeus.referenceData.locations.byGeocode.get({
      latitude: latitude,
      longitude: longitude
    });
    return response.data;
  } catch (error) {
    console.error("Error getting location from coordinates:", error);
    throw error;
  }
};

// Function to get hotel offers
export const getHotelOffers = async (cityCode: string) => {
  try {
    const response = await amadeus.shopping.hotelOffersSearch.get({
      cityCode: cityCode
    });
    return response.data;
  } catch (error) {
    console.error("Error getting hotel offers:", error);
    throw error;
  }
};

// Function to get car rental offers
export const getCarRentalOffers = async (pickupLatitude: number, pickupLongitude: number, dropoffLatitude: number, dropoffLongitude: number) => {
  try {
    const response = await amadeus.shopping.carRentals.get({
      pickupLatitude: pickupLatitude,
      pickupLongitude: pickupLongitude,
      dropoffLatitude: dropoffLatitude,
      dropoffLongitude: dropoffLongitude
    });
    return response.data;
  } catch (error) {
    console.error("Error getting car rental offers:", error);
    throw error;
  }
};

// Function to get transfer offers
export const getTransferOffers = async (pickupLatitude: number, pickupLongitude: number, dropoffLatitude: number, dropoffLongitude: number) => {
  try {
    const response = await amadeus.shopping.transferOffers.get({
      pickupLatitude: pickupLatitude,
      pickupLongitude: pickupLongitude,
      dropoffLatitude: dropoffLatitude,
      dropoffLongitude: dropoffLongitude
    });
    return response.data;
  } catch (error) {
    console.error("Error getting transfer offers:", error);
    throw error;
  }
};

// Function to get insurance offers
export const getInsuranceOffers = async (departureDate: string, returnDate: string, originCode: string, destinationCode: string) => {
  try {
    const response = await amadeus.insurance.products.get({
      departureDate: departureDate,
      returnDate: returnDate,
      originLocationCode: originCode,
      destinationLocationCode: destinationCode
    });
    return response.data;
  } catch (error) {
    console.error("Error getting insurance offers:", error);
    throw error;
  }
};

// Function to get seat selection
export const getSeatSelection = async (flightOffer: any) => {
  try {
    const response = await amadeus.ordering.seatAssignments.get(flightOffer);
    return response.data;
  } catch (error) {
    console.error("Error getting seat selection:", error);
    throw error;
  }
};

// Function to get baggage information
export const getBaggageInformation = async (flightOffer: any) => {
  try {
    const response = await amadeus.ordering.ancillaries.get(flightOffer);
    return response.data;
  } catch (error) {
    console.error("Error getting baggage information:", error);
    throw error;
  }
};

// Function to get meal information
export const getMealInformation = async (flightOffer: any) => {
  try {
    const response = await amadeus.ordering.meals.get(flightOffer);
    return response.data;
  } catch (error) {
    console.error("Error getting meal information:", error);
    throw error;
  }
};

// Function to get special service request information
export const getSpecialServiceRequestInformation = async (flightOffer: any) => {
  try {
    const response = await amadeus.ordering.ssr.get(flightOffer);
    return response.data;
  } catch (error) {
    console.error("Error getting special service request information:", error);
    throw error;
  }
};

// Function to get travel document information
export const getTravelDocumentInformation = async (passengerId: string) => {
  try {
    const response = await amadeus.travel.document.get(passengerId);
    return response.data;
  } catch (error) {
    console.error("Error getting travel document information:", error);
    throw error;
  }
};

// Function to get visa information
export const getVisaInformation = async (countryCode: string) => {
  try {
    const response = await amadeus.referenceData.travel.visaRequirements.get({
      countryCode: countryCode
    });
    return response.data;
  } catch (error) {
    console.error("Error getting visa information:", error);
    throw error;
  }
};

// Function to get destination content
export const getDestinationContent = async (cityCode: string) => {
  try {
    const response = await amadeus.referenceData.locations.pois.get({
      cityCode: cityCode
    });
    return response.data;
  } catch (error) {
    console.error("Error getting destination content:", error);
    throw error;
  }
};

// Function to get location analytics
export const getLocationAnalytics = async (latitude: number, longitude: number) => {
  try {
    const response = await amadeus.analytics.location.get({
      latitude: latitude,
      longitude: longitude
    });
    return response.data;
  } catch (error) {
    console.error("Error getting location analytics:", error);
    throw error;
  }
};

// Function to get customer preferences
export const getCustomerPreferences = async (customerId: string) => {
  try {
    const response = await amadeus.customer.preferences.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer preferences:", error);
    throw error;
  }
};

// Function to get customer loyalty programs
export const getCustomerLoyaltyPrograms = async (customerId: string) => {
  try {
    const response = await amadeus.customer.loyaltyPrograms.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer loyalty programs:", error);
    throw error;
  }
};

// Function to get customer payment information
export const getCustomerPaymentInformation = async (customerId: string) => {
  try {
    const response = await amadeus.customer.paymentInformation.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer payment information:", error);
    throw error;
  }
};

// Function to get customer travel companions
export const getCustomerTravelCompanions = async (customerId: string) => {
  try {
    const response = await amadeus.customer.travelCompanions.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer travel companions:", error);
    throw error;
  }
};

// Function to get customer travel products
export const getCustomerTravelProducts = async (customerId: string) => {
  try {
    const response = await amadeus.customer.travelProducts.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer travel products:", error);
    throw error;
  }
};

// Function to get customer travel seasons
export const getCustomerTravelSeasons = async (customerId: string) => {
  try {
    const response = await amadeus.customer.travelSeasons.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer travel seasons:", error);
    throw error;
  }
};

// Function to get customer travel types
export const getCustomerTravelTypes = async (customerId: string) => {
  try {
    const response = await amadeus.customer.travelTypes.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer travel types:", error);
    throw error;
  }
};

// Function to get customer trip purpose
export const getCustomerTripPurpose = async (customerId: string) => {
  try {
    const response = await amadeus.customer.tripPurpose.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer trip purpose:", error);
    throw error;
  }
};

// Function to get customer value bands
export const getCustomerValueBands = async (customerId: string) => {
  try {
    const response = await amadeus.customer.valueBands.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer value bands:", error);
    throw error;
  }
};

// Function to get customer demographics
export const getCustomerDemographics = async (customerId: string) => {
  try {
    const response = await amadeus.customer.demographics.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer demographics:", error);
    throw error;
  }
};

// Function to get customer interests
export const getCustomerInterests = async (customerId: string) => {
  try {
    const response = await amadeus.customer.interests.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer interests:", error);
    throw error;
  }
};

// Function to get customer social media accounts
export const getCustomerSocialMediaAccounts = async (customerId: string) => {
  try {
    const response = await amadeus.customer.socialMediaAccounts.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer social media accounts:", error);
    throw error;
  }
};

// Function to get customer reviews
export const getCustomerReviews = async (customerId: string) => {
  try {
    const response = await amadeus.customer.reviews.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer reviews:", error);
    throw error;
  }
};

// Function to get customer ratings
export const getCustomerRatings = async (customerId: string) => {
  try {
    const response = await amadeus.customer.ratings.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer ratings:", error);
    throw error;
  }
};

// Function to get customer feedback
export const getCustomerFeedback = async (customerId: string) => {
  try {
    const response = await amadeus.customer.feedback.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer feedback:", error);
    throw error;
  }
};

// Function to get customer support requests
export const getCustomerSupportRequests = async (customerId: string) => {
  try {
    const response = await amadeus.customer.supportRequests.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer support requests:", error);
    throw error;
  }
};

// Function to get customer service interactions
export const getCustomerServiceInteractions = async (customerId: string) => {
  try {
    const response = await amadeus.customer.serviceInteractions.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer service interactions:", error);
    throw error;
  }
};

// Function to get customer communication preferences
export const getCustomerCommunicationPreferences = async (customerId: string) => {
  try {
    const response = await amadeus.customer.communicationPreferences.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer communication preferences:", error);
    throw error;
  }
};

// Function to get customer privacy settings
export const getCustomerPrivacySettings = async (customerId: string) => {
  try {
    const response = await amadeus.customer.privacySettings.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer privacy settings:", error);
    throw error;
  }
};

// Function to get customer security settings
export const getCustomerSecuritySettings = async (customerId: string) => {
  try {
    const response = await amadeus.customer.securitySettings.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer security settings:", error);
    throw error;
  }
};

// Function to get customer account activity
export const getCustomerAccountActivity = async (customerId: string) => {
  try {
    const response = await amadeus.customer.accountActivity.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer account activity:", error);
    throw error;
  }
};

// Function to get customer session history
export const getCustomerSessionHistory = async (customerId: string) => {
  try {
    const response = await amadeus.customer.sessionHistory.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer session history:", error);
    throw error;
  }
};

// Function to get customer device information
export const getCustomerDeviceInformation = async (customerId: string) => {
  try {
    const response = await amadeus.customer.deviceInformation.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer device information:", error);
    throw error;
  }
};

// Function to get customer network information
export const getCustomerNetworkInformation = async (customerId: string) => {
  try {
    const response = await amadeus.customer.networkInformation.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer network information:", error);
    throw error;
  }
};

// Function to get customer location information
export const getCustomerLocationInformation = async (customerId: string) => {
  try {
    const response = await amadeus.customer.locationInformation.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer location information:", error);
    throw error;
  }
};

// Function to get customer context information
export const getCustomerContextInformation = async (customerId: string) => {
  try {
    const response = await amadeus.customer.contextInformation.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer context information:", error);
    throw error;
  }
};

// Function to get customer consent information
export const getCustomerConsentInformation = async (customerId: string) => {
  try {
    const response = await amadeus.customer.consent.get(customerId);
    return response.data;
  } catch (error) {
    console.error("Error getting customer consent information:", error);
    throw error;
  }
};

// Function to search for weekly flights
export const searchWeeklyFlights = async (
  originCode: string,
  destinationCode: string
): Promise<{
  directFlights: Flight[];
  connectingFlights: ConnectionFlight[];
  weeklyData: WeeklyFlightData;
}> => {
  try {
    const response = await amadeus.analytics.itineraryPriceMetrics.get({
      originIataCode: originCode,
      destinationIataCode: destinationCode,
      departureDate: '2023-07-01,2023-07-07'
    });
    
    return {
      directFlights: [],
      connectingFlights: [],
      weeklyData: response.data
    };
  } catch (error) {
    console.error("Error searching weekly flights:", error);
    return {
      directFlights: [],
      connectingFlights: [],
      weeklyData: {}
    };
  }
};
