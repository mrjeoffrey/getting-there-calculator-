import React, { useEffect, useState, useRef } from 'react';
import { Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Airport } from '../types/flightTypes';
import { calculateArcPoints, getBearing } from '../utils/flightUtils';
import ReactDOMServer from 'react-dom/server';

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
  const planeMarkerRef = useRef<L.Marker | null>(null);
  const currentIndexRef = useRef<number>(1);
  const map = useMap();
  
  useEffect(() => {
    cleanup();
    
    if (!departure || !arrival || !departure.lat || !departure.lng || !arrival.lat || !arrival.lng) {
      console.error("Invalid departure or arrival data:", { departure, arrival });
      return;
    }
    
    console.log(`Initializing flight path from ${departure.code} to ${arrival.code}`);
    
    // Initial map setup to show both airports
    fitMapToAirports();
    
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
      
      // Create the plane marker at the starting point
      createPlaneMarker(points[0], bearing);
      
      // Begin slow drawing after a short delay
      setTimeout(() => {
        startSlowDrawing();
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
    
    // Clear plane marker
    if (planeMarkerRef.current) {
      planeMarkerRef.current.remove();
      planeMarkerRef.current = null;
    }
    
    currentIndexRef.current = 1;
  };
  
  const createPlaneMarker = (position: [number, number], rotation: number) => {
    if (!map) return;
    
    // Remove existing plane marker if it exists
    if (planeMarkerRef.current) {
      planeMarkerRef.current.remove();
    }
    
    // Create the plane icon with proper rotation
    const planeIconHtml = ReactDOMServer.renderToString(
      <div className="plane-marker">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill={type === 'direct' ? '#4CAF50' : '#FFC107'}
          stroke={isDarkMode ? 'white' : 'black'} 
          strokeWidth="1" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <path d="M22 16.32c0 1.4-1.12 2.52-2.52 2.52H4.52C3.12 18.84 2 17.72 2 16.32V7.68C2 6.28 3.12 5.16 4.52 5.16h14.96c1.4 0 2.52 1.12 2.52 2.52v8.64z" />
          <path d="M18 12.34v-1.89l3-2.25h-3v-1.8L10.5 7.5 3 6.4v1.8h-3l3 2.25v1.89L6 14.06v1.08l-3 1.8h3v1.8l7.5-1.08 7.5 1.08v-1.8h3l-3-1.8v-1.08l3-1.72z" />
        </svg>
      </div>
    );
    
    const planeIcon = L.divIcon({
      html: planeIconHtml,
      className: 'plane-icon-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    
    // Create the marker
    const marker = L.marker(position, {
      icon: planeIcon,
      zIndexOffset: 1000
    }).addTo(map);
    
    planeMarkerRef.current = marker;
  };
  
  const updatePlanePosition = (position: [number, number], nextPosition: [number, number] | null) => {
    if (!planeMarkerRef.current) return;
    
    // Move the plane to the new position
    planeMarkerRef.current.setLatLng(position);
    
    // Update rotation if we have a next position
    if (nextPosition) {
      const newBearing = getBearing(position[0], position[1], nextPosition[0], nextPosition[1]);
      setPlaneRotation(newBearing);
      
      // Update the plane icon with new rotation
      const planeDiv = planeMarkerRef.current.getElement();
      if (planeDiv) {
        const svgElement = planeDiv.querySelector('svg');
        if (svgElement) {
          svgElement.style.transform = `rotate(${newBearing}deg)`;
        }
      }
    }
  };
  
  const fitMapToAirports = () => {
    if (!departure || !arrival || !departure.lat || !departure.lng || !arrival.lat || !arrival.lng) {
      return;
    }
    
    // Create a bounds object that includes both departure and arrival airports
    const bounds = L.latLngBounds(
      [departure.lat, departure.lng],
      [arrival.lat, arrival.lng]
    );
    
    // Add padding to the bounds for better visibility
    map.fitBounds(bounds, {
      padding: [50, 50],
      animate: false, // No animation for the initial view
      maxZoom: 6      // Limit the zoom level to keep the context
    });
    
    console.log(`Map fitted to show both ${departure.code} and ${arrival.code}`);
  };
  
  const startSlowDrawing = () => {
    const points = arcPointsRef.current;
    if (points.length < 2) return;
    
    currentIndexRef.current = 1; // Start from 1 since we already have the first point
    const totalPoints = points.length;
    
    // Draw points with a delay between each segment
    const drawNextSegment = () => {
      if (currentIndexRef.current < totalPoints) {
        // Add the next point to displayed points
        setDisplayedPoints(points.slice(0, currentIndexRef.current + 1));
        
        // Update plane position
        const currentPosition = points[currentIndexRef.current];
        const nextPosition = currentIndexRef.current + 1 < totalPoints 
          ? points[currentIndexRef.current + 1] 
          : null;
          
        updatePlanePosition(currentPosition, nextPosition);
        
        currentIndexRef.current++;
        
        // Schedule the next segment
        drawingTimerRef.current = setTimeout(drawNextSegment, 50); // Adjust speed as needed
      } else {
        console.log("Drawing complete");
        setAnimationComplete(true);
        
        // Remove plane marker when animation completes
        if (planeMarkerRef.current) {
          planeMarkerRef.current.remove();
          planeMarkerRef.current = null;
        }
      }
    };
    
    // Start the drawing process
    drawNextSegment();
  };
  
  const createFlightInfoPopup = (e: L.LeafletMouseEvent, flight: any) => {
    if (!map) return;
    
    // Close any existing popup
    if (popupRef.current) {
      map.closePopup(popupRef.current);
    }
    
    const popupContent = ReactDOMServer.renderToString(
      <div className="flight-popup">
        <div className="flight-popup-header">
          <span className={`flight-type ${type === 'direct' ? 'direct' : 'connecting'}`}>
            {type === 'direct' ? 'Direct Flight' : 'Connecting Flight'}
          </span>
          <span className="flight-number">{flight.flightNumber}</span>
        </div>
        <div className="flight-popup-content">
          <div className="flight-route">
            <div className="flight-airport">
              <div className="airport-code">{departure.code}</div>
              <div className="airport-time">{flight.departureTime}</div>
            </div>
            <div className="flight-duration">
              <div className="duration-line"></div>
              <div className="duration-text">{flight.duration}</div>
            </div>
            <div className="flight-airport">
              <div className="airport-code">{arrival.code}</div>
              <div className="airport-time">{flight.arrivalTime}</div>
            </div>
          </div>
          <div className="flight-details">
            <div className="flight-airline">{flight.airline}</div>
            {flight.price > 0 && <div className="flight-price">${flight.price}</div>}
          </div>
        </div>
      </div>
    );
    
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
    if (!animationComplete || !map) return;
    
    // Get the flight data
    const flightData = flightInfo && flightInfo.length > 0 
      ? flightInfo[0] 
      : { 
          flightNumber: flightNumber || `FL${Math.floor(Math.random() * 1000)}`, 
          airline: airline || 'Airline', 
          departureTime: departureTime || '09:00', 
          arrivalTime: arrivalTime || '11:30', 
          duration: duration || '2h 30m',
          price: price || Math.floor(Math.random() * 500) + 200
        };
    
    // Show the popup at the click location
    createFlightInfoPopup(e, flightData);
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
      <style>{`
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
          filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.4));
        }
        
        .flight-path {
          cursor: pointer;
        }
        
        .flight-path:hover {
          stroke-opacity: 1;
        }
      `}</style>
    </>
  );
};

export default FlightPath;