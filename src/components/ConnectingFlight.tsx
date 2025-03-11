
import React from 'react';
import { ConnectionFlight } from '../types/flightTypes';
import { formatTime, formatDate } from '../utils/flightUtils';
import { ArrowRight, Clock, Plane } from 'lucide-react';

interface ConnectingFlightProps {
  flight: ConnectionFlight;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const ConnectingFlight: React.FC<ConnectingFlightProps> = ({ flight, isSelected, onSelect }) => {
  const firstFlight = flight.flights[0];
  const lastFlight = flight.flights[flight.flights.length - 1];

  return (
    <div 
      className={`relative rounded-xl overflow-hidden transition-all duration-300 ${
        isSelected ? 'bg-white shadow-lg scale-[1.02]' : 'bg-white/70 hover:bg-white/90'
      }`}
      onClick={() => onSelect(flight.id)}
    >
      {isSelected && (
        <div className="absolute inset-0 border-2 border-primary rounded-xl pointer-events-none" />
      )}
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center text-lg font-semibold">
            <span className="mr-2 text-primary">
              ${flight.price}
            </span>
            <span className="text-xs bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full">
              Connecting
            </span>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock size={14} className="mr-1" />
              <span>{flight.totalDuration}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <span className="text-lg font-medium">{formatTime(firstFlight.departureTime)}</span>
            <span className="text-sm text-muted-foreground">{firstFlight.departureAirport.code}</span>
          </div>
          
          <div className="flex-1 flex flex-col items-center mx-4">
            <div className="w-full flex items-center">
              <div className="h-0.5 flex-1 bg-accent/30" />
              <div className="mx-2 p-1 rounded-full bg-accent/20">
                <Plane size={14} className="text-accent" />
              </div>
              <div className="h-0.5 flex-1 bg-accent/30" />
            </div>
            <span className="text-xs text-muted-foreground mt-1">
              {flight.flights.length - 1} stop • {flight.stopoverDuration} layover
            </span>
          </div>
          
          <div className="flex flex-col items-end">
            <span className="text-lg font-medium">{formatTime(lastFlight.arrivalTime)}</span>
            <span className="text-sm text-muted-foreground">{lastFlight.arrivalAirport.code}</span>
          </div>
        </div>
        
        {isSelected && (
          <div className="mt-4 pt-4 border-t border-border/30 text-sm animate-slide-up">
            <h4 className="font-medium mb-2">Flight Details</h4>
            
            {flight.flights.map((segment, index) => (
              <div key={segment.id} className="mb-3 last:mb-0">
                <div className="flex items-center mb-1">
                  <div className="mr-2 p-1 rounded-full bg-primary/10">
                    <Plane size={14} className="text-primary" />
                  </div>
                  <span className="font-medium">{segment.airline} {segment.flightNumber}</span>
                </div>
                
                <div className="flex items-start ml-8">
                  <div className="flex flex-col items-end mr-3">
                    <span className="font-medium">{formatTime(segment.departureTime)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(segment.departureTime)}
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-center mx-2">
                    <div className="h-12 w-0.5 bg-muted" />
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="font-medium">{segment.departureAirport.code}</span>
                    <span className="text-xs text-muted-foreground">
                      {segment.departureAirport.city}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center ml-8 my-2">
                  <div className="w-[30px] flex justify-center">
                    <Clock size={14} className="text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">
                    {segment.duration}
                  </span>
                </div>
                
                <div className="flex items-start ml-8">
                  <div className="flex flex-col items-end mr-3">
                    <span className="font-medium">{formatTime(segment.arrivalTime)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(segment.arrivalTime)}
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-center mx-2">
                    <div className="h-12 w-0.5 bg-muted" />
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="font-medium">{segment.arrivalAirport.code}</span>
                    <span className="text-xs text-muted-foreground">
                      {segment.arrivalAirport.city}
                    </span>
                  </div>
                </div>
                
                {index < flight.flights.length - 1 && (
                  <div className="flex items-center ml-10 my-2 pb-2 border-b border-border/20">
                    <div className="p-1 rounded-full bg-accent/10">
                      <Clock size={12} className="text-accent" />
                    </div>
                    <span className="text-xs text-accent-foreground ml-2">
                      {flight.stopoverDuration} layover in {segment.arrivalAirport.city}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectingFlight;
