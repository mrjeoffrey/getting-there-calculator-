import React, { useEffect, useState, useRef } from 'react';
import { Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Airport } from '../types/flightTypes';
import { calculateArcPoints, getBearing } from '../utils/flightUtils';
import ReactDOMServer from 'react-dom/server';
import { Plane } from 'lucide-react';

interface FlightPathProps {
  departure: Airport;
  arrival: Airport;
  type?: 'direct' | 'connecting';
  isActive?: boolean;
  isDarkMode?: boolean;
  duration?: string;
  flightNumber?: string;
  departureTime?: string;
  arrivalTime?: string;
  airline?: string;
  price?: number;
  flightInfo?: Array<{
    flightNumber: string;
    airline: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    price: number;
  }>;
}

const FlightPath: React.FC<FlightPathProps> = ({ 
  departure, 
  arrival, 
  type = 'direct',
  isActive = false,
  isDarkMode = false,
  duration = '',
  flightNumber = '',
  departureTime = '',
  arrivalTime = '',
  airline = '',
  price = 0,
  flightInfo = []
}) => {
  const arcPointsRef = useRef<[number, number][]>([]);
  const [arcPoints, setArcPoints] = useState<[number, number][]>([]);
  const [planeRotation, setPlaneRotation] = useState(0);
  const [displayedPoints, setDisplayedPoints] = useState<[number, number][]>([]);
  const [animationComplete, setAnimationComplete] = useState(false);
  const drawingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const popupRef = useRef<L.Popup | null>(null);
  const planeMarkersRef = useRef<L.Marker[]>([]);
  const currentIndexRef = useRef<number>(1);
  const map = useMap();
  
  // Calculate flight duration in minutes for animation timing
  const getDurationInMinutes = (): number => {
    if (duration) {
      const hourMatch = duration.match(/(\d+)h/);
      const minuteMatch = duration.match(/(\d+)m/);
      const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
      const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
      return hours * 60 + minutes;
    }
    // Default duration if not provided
    return 150; // 2.5 hours in minutes
  };
  
  useEffect(() => {
    cleanup();
    
    if (!departure || !arrival || !departure.lat || !departure.lng || !arrival.lat || !arrival.lng) {
      console.error("Invalid departure or arrival data:", { departure, arrival });
      return;
    }
    
    console.log(`Initializing flight path from ${departure.code} to ${arrival.code}`);
    
    // Initial map setup to show origin airport
    zoomToOrigin();
    
    const arcHeight = type === 'direct' ? 0.2 : 0.15;
    
    try {
      // Calculate the arc points for the flight path
      const points = calculateArcPoints(
        departure.lat, 
        departure.lng, 
        arrival.lat, 
        arrival.lng,
        arcHeight
      );
      
      if (!points || points.length < 2) {
        console.error("ERROR: calculateArcPoints returned insufficient points!");
        return;
      }
      
      setArcPoints(points);
      arcPointsRef.current = points;
      
      // Start with just the departure point
      setDisplayedPoints([points[0]]);
      
      // Calculate the initial bearing for later use
      const bearing = getBearing(departure.lat, departure.lng, arrival.lat, arrival.lng);
      setPlaneRotation(bearing);
      
      // Begin drawing after a short delay
      setTimeout(() => {
        startPathDrawing();
      }, 500);
    } catch (error) {
      console.error("Error initializing flight path:", error);
    }
    
    return cleanup;
  }, [departure, arrival]);
  
  const cleanup = () => {
    console.log("Running cleanup...");
    
    if (drawingTimerRef.current) {
      clearTimeout(drawingTimerRef.current);
      drawingTimerRef.current = null;
    }
    
    if (popupRef.current && map) {
      map.closePopup(popupRef.current);
      popupRef.current = null;
    }
    
    // Clear all plane markers
    planeMarkersRef.current.forEach(marker => {
      marker.remove();
    });
    planeMarkersRef.current = [];
    
    currentIndexRef.current = 1;
  };
  
  // Zoom to origin airport
  const zoomToOrigin = () => {
    if (!departure || !departure.lat || !departure.lng) return;
    
    map.flyTo([departure.lat, departure.lng], 6, {
      duration: 1,
      animate: true
    });
  };
  
  // Create plane markers for all flights on this path
  const createPlaneMarkers = () => {
    if (planeMarkersRef.current.length > 0) {
      // Already created markers
      return;
    }
    
    // Use flight info or create a default single flight
    const flights = flightInfo && flightInfo.length > 0 
      ? flightInfo 
      : [{
          flightNumber: flightNumber || `FL${Math.floor(Math.random() * 1000)}`,
          airline: airline || 'Airline',
          departureTime: departureTime || '09:00',
          arrivalTime: arrivalTime || '11:30',
          duration: duration || '2h 30m',
          price: price || Math.floor(Math.random() * 500) + 200
        }];
    
    // Create a marker for each flight
    flights.forEach((flight, index) => {
      const startPoint = arcPointsRef.current[0];
      const planeMarker = createSinglePlaneMarker(startPoint, planeRotation, flight, index);
      planeMarkersRef.current.push(planeMarker);
    });
  };
  
  // Create a single plane marker with lucide plane icon
  const createSinglePlaneMarker = (position: [number, number], rotation: number, flight: any, index: number) => {
    if (!map) return null;
    
    // Create the plane icon with proper colors
    const planeIconHtml = ReactDOMServer.renderToString(
      <div className="plane-marker">
        <Plane 
          size={24}
          fill={type === 'direct' ? '#4CAF50' : '#FFC107'}
          stroke={isDarkMode ? 'white' : 'black'} 
          strokeWidth={1.5}
          style={{ 
            transform: `rotate(${rotation}deg)`, 
            filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.4))'
          }}
        />
      </div>
    );
    
    const planeIcon = L.divIcon({
      html: planeIconHtml,
      className: 'plane-icon-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    
    // Create the marker with a slight position offset for multiple planes
    const positionWithOffset: [number, number] = [
      position[0] + (index * 0.02),
      position[1] + (index * 0.02)
    ];
    
    const marker = L.marker(positionWithOffset, {
      icon: planeIcon,
      zIndexOffset: 1000 + index
    }).addTo(map);
    
    // Store flight info with the marker for later use
    marker.options.title = flight.flightNumber;
    // @ts-ignore - Adding custom property for flight data
    marker.flightData = flight;
    
    return marker;
  };
  
  // Update positions of all plane markers
  const updatePlanePositions = (position: [number, number], nextPosition: [number, number] | null) => {
    planeMarkersRef.current.forEach((marker, index) => {
      if (!marker) return;
      
      // Add slight offset for multiple planes so they don't overlap perfectly
      const positionWithOffset: [number, number] = [
        position[0] + (index * 0.02),
        position[1] + (index * 0.02)
      ];
      
      // Move the plane to the new position
      marker.setLatLng(positionWithOffset);
      
      // Update rotation if we have a next position
      if (nextPosition) {
        const newBearing = getBearing(position[0], position[1], nextPosition[0], nextPosition[1]);
        
        // Update the plane icon with new rotation
        const planeDiv = marker.getElement();
        if (planeDiv) {
          const svgElement = planeDiv.querySelector('svg');
          if (svgElement) {
            svgElement.style.transform = `rotate(${newBearing}deg)`;
          }
        }
      }
    });
  };
  
  // Start drawing the path while panning the map
  const startPathDrawing = () => {
    const points = arcPointsRef.current;
    if (points.length < 2) return;
    
    currentIndexRef.current = 1;
    const totalPoints = points.length;
    
    // Use fewer map updates to prevent glitching
    const mapUpdateInterval = Math.max(5, Math.floor(totalPoints / 20));
    
    // Draw points with timing proportional to flight duration
    const durationInMinutes = getDurationInMinutes();
    const animationDuration = 2000; // Base animation in ms
    const pointDelay = animationDuration / totalPoints;
    
    const drawNextSegment = () => {
      if (currentIndexRef.current < totalPoints) {
        // Add the next point to displayed points
        setDisplayedPoints(points.slice(0, currentIndexRef.current + 1));
        
        // Only pan the map occasionally to reduce jerkiness
        if (currentIndexRef.current % mapUpdateInterval === 0) {
          // Smooth pan to follow the path
          map.panTo(points[currentIndexRef.current], {
            animate: true,
            duration: 0.5
          });
        }
        
        currentIndexRef.current++;
        
        // Schedule the next segment
        drawingTimerRef.current = setTimeout(drawNextSegment, pointDelay);
      } else {
        // Drawing complete, create plane markers and start flight
        createPlaneMarkers();
        startFlightAnimation();
      }
    };
    
    // Start the drawing process
    drawNextSegment();
  };
  
  // Animate planes along the complete path
  const startFlightAnimation = () => {
    const points = arcPointsRef.current;
    if (points.length < 2) return;
    
    // Reset to start
    currentIndexRef.current = 0;
    const totalPoints = points.length;
    
    // Calculate animation speed based on flight duration
    const durationInMinutes = getDurationInMinutes();
    const totalAnimationTime = Math.min(30000, Math.max(10000, durationInMinutes * 50)); // Scale with duration, but keep reasonable
    const pointDelay = totalAnimationTime / totalPoints;
    
    const animateNextStep = () => {
      if (currentIndexRef.current < totalPoints - 1) {
        const currentPosition = points[currentIndexRef.current];
        const nextPosition = currentIndexRef.current + 1 < totalPoints 
          ? points[currentIndexRef.current + 1] 
          : null;
          
        // Update all plane positions
        updatePlanePositions(currentPosition, nextPosition);
        
        currentIndexRef.current++;
        
        // Schedule the next step
        drawingTimerRef.current = setTimeout(animateNextStep, pointDelay);
      } else {
        console.log("Flight animation complete");
        setAnimationComplete(true);
        
        // Keep plane markers at destination
        const finalPosition = points[points.length - 1];
        updatePlanePositions(finalPosition, null);
      }
    };
    
    // Start the flight animation
    animateNextStep();
  };
  
  // Create flight info popup for all flights on this path
  const createFlightInfoPopup = (e: L.LeafletMouseEvent) => {
    if (!map) return;
    
    // Close any existing popup
    if (popupRef.current) {
      map.closePopup(popupRef.current);
    }
    
    // Get all flights on this path
    const flights = flightInfo && flightInfo.length > 0 
      ? flightInfo 
      : [{
          flightNumber: flightNumber || `FL${Math.floor(Math.random() * 1000)}`,
          airline: airline || 'Airline',
          departureTime: departureTime || '09:00',
          arrivalTime: arrivalTime || '11:30',
          duration: duration || '2h 30m',
          price: price || Math.floor(Math.random() * 500) + 200
        }];
    
    // Create HTML for all flights
    const flightsHtml = flights.map(flight => {
      return `
        <div class="flight-popup-item ${flights.length > 1 ? 'multi-flight' : ''}">
          <div class="flight-popup-header">
            <span class="flight-type ${type === 'direct' ? 'direct' : 'connecting'}">
              ${type === 'direct' ? 'Direct Flight' : 'Connecting Flight'}
            </span>
            <span class="flight-number">${flight.flightNumber}</span>
          </div>
          <div class="flight-popup-content">
            <div class="flight-route">
              <div class="flight-airport">
                <div class="airport-code">${departure.code}</div>
                <div class="airport-time">${flight.departureTime}</div>
              </div>
              <div class="flight-duration">
                <div class="duration-line"></div>
                <div class="duration-text">${flight.duration}</div>
              </div>
              <div class="flight-airport">
                <div class="airport-code">${arrival.code}</div>
                <div class="airport-time">${flight.arrivalTime}</div>
              </div>
            </div>
            <div class="flight-details">
              <div class="flight-airline">${flight.airline}</div>
              ${flight.price > 0 ? `<div class="flight-price">$${flight.price}</div>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('<div class="flight-separator"></div>');
    
    const popupContent = `<div class="flight-popup ${flights.length > 1 ? 'multi-flights' : ''}">${flightsHtml}</div>`;
    
    const popup = L.popup({
      closeButton: true,
      autoClose: false,
      className: `flight-info-popup ${type === 'direct' ? 'direct' : 'connecting'}`
    })
      .setLatLng(e.latlng)
      .setContent(popupContent)
      .openOn(map);
    
    popupRef.current = popup;
  };
  
  // Function to handle path click
  const handlePathClick = (e: L.LeafletMouseEvent) => {
    // Show popup with all flights on this path
    createFlightInfoPopup(e);
  };
  
  const color = type === 'direct' ? '#4CAF50' : '#FFC107';
  const weight = isActive ? 4 : 3;
  const opacity = isActive ? 0.8 : 0.6;
  
  return (
    <>
      {displayedPoints.length >= 2 && (
        <Polyline
          positions={displayedPoints}
          pathOptions={{
            color,
            weight,
            opacity,
            dashArray: type === 'connecting' ? '5, 10' : '',
            className: `flight-path ${type} ${animationComplete ? 'animation-complete' : ''}`
          }}
          eventHandlers={{
            click: handlePathClick
          }}
        />
      )}
      <style>
        {`
          .flight-info-popup {
            min-width: 220px;
          }
          
          .flight-popup-header {
            padding: 6px 10px;
            border-radius: 4px 4px 0 0;
            color: white;
            display: flex;
            justify-content: space-between;
          }
          
          .flight-info-popup.direct .flight-popup-header {
            background-color: #4CAF50;
          }
          
          .flight-info-popup.connecting .flight-popup-header {
            background-color: #FFC107;
            color: #333;
          }
          
          .flight-popup-content {
            padding: 10px;
          }
          
          .flight-route {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
          }
          
          .flight-airport {
            text-align: center;
          }
          
          .airport-code {
            font-weight: bold;
            font-size: 14px;
          }
          
          .airport-time {
            font-size: 12px;
            color: #555;
          }
          
          .flight-duration {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            margin: 0 10px;
          }
          
          .duration-line {
            height: 2px;
            width: 100%;
            background-color: #ddd;
            position: relative;
          }
          
          .duration-text {
            font-size: 11px;
            color: #777;
            margin-top: 2px;
          }
          
          .flight-details {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            border-top: 1px solid #eee;
            padding-top: 8px;
          }
          
          .flight-price {
            font-weight: bold;
            color: #d32f2f;
          }
          
          .plane-icon-marker {
            z-index: 1500;
          }
          
          .plane-marker svg {
            transition: transform 0.2s ease-in-out;
          }
          
          .flight-path {
            cursor: pointer;
          }
          
          .flight-path:hover {
            stroke-opacity: 1;
          }
          
          .flight-popup.multi-flights {
            max-height: 300px;
            overflow-y: auto;
          }
          
          .flight-popup-item.multi-flight {
            border: 1px solid #eee;
            border-radius: 4px;
            margin-bottom: 8px;
          }
          
          .flight-separator {
            height: 1px;
            background-color: #ddd;
            margin: 8px 0;
          }
        `}
      </style>
    </>
  );
};

export default FlightPath;
