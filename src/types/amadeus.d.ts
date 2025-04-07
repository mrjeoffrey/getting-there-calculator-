
declare module 'amadeus' {
  export default class Amadeus {
    constructor(options: { clientId: string; clientSecret: string });
    
    shopping: {
      flightOffersSearch: {
        get: (params: any) => Promise<{ data: any }>;
      };
      flightDestinations: {
        get: (params: any) => Promise<{ data: any }>;
      };
      flightOffers: {
        pricing: {
          post: (data: string) => Promise<{ data: any }>;
        };
        prediction: {
          post: (data: string) => Promise<{ data: any }>;
        };
      };
      activities: {
        get: (params: any) => Promise<{ data: any }>;
      };
      hotelOffersSearch: {
        get: (params: any) => Promise<{ data: any }>;
      };
      carRentals: {
        get: (params: any) => Promise<{ data: any }>;
      };
      transferOffers: {
        get: (params: any) => Promise<{ data: any }>;
      };
      seatMaps: {
        get: (params: any) => Promise<{ data: any }>;
      };
    };
    
    booking: {
      flightOrders: {
        post: (data: string) => Promise<{ data: any }>;
        get: (id: string) => Promise<{ data: any }>;
      };
    };
    
    referenceData: {
      locations: {
        get: (params: any) => Promise<{ data: any }>;
        airports: {
          get: (params: any) => Promise<{ data: any }>;
        };
        byGeocode: {
          get: (params: any) => Promise<{ data: any }>;
        };
        byCity: {
          get: (params: any) => Promise<{ data: any }>;
        };
        hotels: {
          byCity: {
            get: (params: any) => Promise<{ data: any }>;
          };
        };
        cars: {
          get: (params: any) => Promise<{ data: any }>;
        };
        pois: {
          get: (params: any) => Promise<{ data: any }>;
        };
      };
      airlines: {
        get: (params: any) => Promise<{ data: any }>;
      };
      aircrafts: {
        get: (params: any) => Promise<{ data: any }>;
      };
      travel: {
        visaRequirements: {
          get: (params: any) => Promise<{ data: any }>;
        };
      };
      airport: {
        directDestinations: {
          get: (params: any) => Promise<{ data: any }>;
        };
      };
    };
    
    schedule: {
      flights: {
        get: (params: any) => Promise<{ data: any }>;
      };
    };
    
    analytics: {
      itineraryPriceMetrics: {
        get: (params: any) => Promise<{ data: any }>;
      };
      flights: {
        booked: {
          get: (params: any) => Promise<{ data: any }>;
        };
        traveled: {
          get: (params: any) => Promise<{ data: any }>;
        };
      };
      location: {
        get: (params: any) => Promise<{ data: any }>;
      };
    };
    
    travel: {
      predictions: {
        flightDelay: {
          get: (params: any) => Promise<{ data: any }>;
        };
      };
      document: {
        get: (id: string) => Promise<{ data: any }>;
      };
    };
    
    dutyOfCare: {
      diseases: {
        covid19AreaReport: {
          get: (params: any) => Promise<{ data: any }>;
        };
      };
    };
    
    airport: {
      predictions: {
        onTime: {
          get: (params: any) => Promise<{ data: any }>;
        };
      };
    };
    
    flight: {
      status: {
        get: (params: any) => Promise<{ data: any }>;
      };
    };
    
    safety: {
      safetyRatedLocations: {
        get: (params: any) => Promise<{ data: any }>;
      };
      adverseWeatherConditions: {
        get: (params: any) => Promise<{ data: any }>;
      };
    };
    
    ordering: {
      seatAssignments: {
        get: (params: any) => Promise<{ data: any }>;
      };
      ancillaries: {
        get: (params: any) => Promise<{ data: any }>;
      };
      meals: {
        get: (params: any) => Promise<{ data: any }>;
      };
      ssr: {
        get: (params: any) => Promise<{ data: any }>;
      };
    };
    
    insurance: {
      products: {
        get: (params: any) => Promise<{ data: any }>;
      };
    };
    
    customer: {
      preferences: {
        get: (id: string) => Promise<{ data: any }>;
      };
      loyaltyPrograms: {
        get: (id: string) => Promise<{ data: any }>;
      };
      paymentInformation: {
        get: (id: string) => Promise<{ data: any }>;
      };
      travelCompanions: {
        get: (id: string) => Promise<{ data: any }>;
      };
      travelProducts: {
        get: (id: string) => Promise<{ data: any }>;
      };
      travelSeasons: {
        get: (id: string) => Promise<{ data: any }>;
      };
      travelTypes: {
        get: (id: string) => Promise<{ data: any }>;
      };
      tripPurpose: {
        get: (id: string) => Promise<{ data: any }>;
      };
      valueBands: {
        get: (id: string) => Promise<{ data: any }>;
      };
      demographics: {
        get: (id: string) => Promise<{ data: any }>;
      };
      interests: {
        get: (id: string) => Promise<{ data: any }>;
      };
      socialMediaAccounts: {
        get: (id: string) => Promise<{ data: any }>;
      };
      reviews: {
        get: (id: string) => Promise<{ data: any }>;
      };
      ratings: {
        get: (id: string) => Promise<{ data: any }>;
      };
      feedback: {
        get: (id: string) => Promise<{ data: any }>;
      };
      supportRequests: {
        get: (id: string) => Promise<{ data: any }>;
      };
      serviceInteractions: {
        get: (id: string) => Promise<{ data: any }>;
      };
      communicationPreferences: {
        get: (id: string) => Promise<{ data: any }>;
      };
      privacySettings: {
        get: (id: string) => Promise<{ data: any }>;
      };
      securitySettings: {
        get: (id: string) => Promise<{ data: any }>;
      };
      accountActivity: {
        get: (id: string) => Promise<{ data: any }>;
      };
      sessionHistory: {
        get: (id: string) => Promise<{ data: any }>;
      };
      deviceInformation: {
        get: (id: string) => Promise<{ data: any }>;
      };
      networkInformation: {
        get: (id: string) => Promise<{ data: any }>;
      };
      locationInformation: {
        get: (id: string) => Promise<{ data: any }>;
      };
      contextInformation: {
        get: (id: string) => Promise<{ data: any }>;
      };
      consent: {
        get: (id: string) => Promise<{ data: any }>;
      };
    };
  }
}
