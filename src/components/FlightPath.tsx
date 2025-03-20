import React, { useEffect, useState, useRef } from 'react';
import { Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Airport } from '../types/flightTypes';
import { calculateArcPoints, getBearing } from '../utils/flightUtils';
import { Plane, ChevronDown, Info } from 'lucide-react';
import ReactDOMServer from 'react-dom/server';

interface FlightPathProps {
  departure: Airport;
  arrival: Airport;
  animated?: boolean;
  type?: 'direct' | 'connecting';
  isActive?: boolean;
  isDarkMode?: boolean;
  duration?: string;
  flightNumber?: string;
  departureTime?: string;
  arrivalTime?: string;
  airline?: string;
  price?: number;
}

const FlightPath: React.FC<FlightPathProps> = ({ 
  departure, 
  arrival, 
  animated = true,
  type = 'direct',
  isActive = false,
  isDarkMode = false,
  duration = '',
  flightNumber = '',
  departureTime = '',
  arrivalTime = '',
  airline = '',
  price = 0
}) => {
  const arcPointsRef = useRef<[number, number][]>([]);
  const [arcPoints, setArcPoints] = useState<[number, number][]>([]);
  const [planePosition, setPlanePosition] = useState<[number, number] | null>(null);
  const [planeRotation, setPlaneRotation] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsPosition, setDetailsPosition] = useState<[number, number]>([0, 0]);
  const [popupExpanded, setPopupExpanded] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'zooming' | 'drawing' | 'flying'>('idle');
  const [displayedPoints, setDisplayedPoints] = useState<[number, number][]>([]);
  const [animationComplete, setAnimationComplete] = useState(false);
  const animationRef = useRef<number | null>(null);
  const drawingRef = useRef<number | null>(null);
  const planeMarkerRef = useRef<L.Marker | null>(null);
  const popupRef = useRef<L.Popup | null>(null);
  const drawingMarkerRef = useRef<L.Marker | null>(null);
  const map = useMap();
  
  const getFlightMinutes = () => {
    if (!duration) return 180;
    
    const durationParts = duration.match(/(\d+)h\s*(\d+)?m?/);
    if (durationParts) {
      const hours = parseInt(durationParts[1] || '0');
      const minutes = parseInt(durationParts[2] || '0');
      return hours * 60 + minutes;
    }
    return 180;
  };
  
  useEffect(() => {
    cleanup();
    
    if (!departure || !arrival || !departure.lat || !departure.lng || !arrival.lat || !arrival.lng) {
      console.error("Invalid departure or arrival data:", { departure, arrival });
      return;
    }
    
    console.log(`Starting animation for flight from ${departure.code} to ${arrival.code}`);
    console.log("Departure:", departure);
    console.log("Arrival:", arrival);
    
    const arcHeight = type === 'direct' ? 0.2 : 0.15;
    
    try {
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
      
      console.log("Generated Arc Points:", points);
      setArcPoints(points);
      arcPointsRef.current = points; 
      
      setDisplayedPoints([points[0]]);
      
      const bearing = getBearing(departure.lat, departure.lng, arrival.lat, arrival.lng);
      setPlaneRotation(bearing);
      
      setTimeout(() => {
        console.log(`Starting zoom phase for ${departure.code} to ${arrival.code}`);
        startZoomingPhase();
      }, 500 + Math.random() * 1000);
    } catch (error) {
      console.error("Error initializing flight path:", error);
    }
    
    return cleanup;
  }, [departure, arrival]);
  
  useEffect(() => {
    if (arcPoints.length > 0) {
      console.log(`arcPoints updated: ${departure.code} to ${arrival.code}, length: ${arcPoints.length}`);
    }
  }, [arcPoints, departure, arrival]);
  
  const cleanup = () => {
    console.log("Running cleanup...");
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (drawingRef.current) {
      cancelAnimationFrame(drawingRef.current);
      drawingRef.current = null;
    }
    if (planeMarkerRef.current) {
      planeMarkerRef.current.remove();
      planeMarkerRef.current = null;
    }
    if (popupRef.current && map) {
      map.closePopup(popupRef.current);
      popupRef.current = null;
    }
    if (drawingMarkerRef.current) {
      drawingMarkerRef.current.remove();
      drawingMarkerRef.current = null;
    }
  };
  
  const startZoomingPhase = () => {
    setAnimationPhase('zooming');
    console.log(`Zoom phase active: Flying to ${departure.code}`);
    
    const zoomMarkerHtml = ReactDOMServer.renderToString(
      <div className="zoom-animation-marker">
        <div className="zoom-circle"></div>
      </div>
    );
    
    const zoomMarkerIcon = L.divIcon({
      html: zoomMarkerHtml,
      className: 'zoom-marker-icon',
      iconSize: [80, 80],
      iconAnchor: [40, 40]
    });
    
    const zoomMarker = L.marker([departure.lat, departure.lng], { 
      icon: zoomMarkerIcon,
      zIndexOffset: 1000
    }).addTo(map);
    
    map.flyTo([departure.lat, departure.lng], 5, {
      duration: 2.5,
      easeLinearity: 0.5
    });
    
    console.log(`Zooming to ${departure.code} at [${departure.lat}, ${departure.lng}]`);
    
    setTimeout(() => {
      zoomMarker.remove();
      console.log(`Zoom complete, starting drawing phase for ${departure.code} to ${arrival.code}`);
      startDrawingPhase();
    }, 2500);
  };
  
  const startDrawingPhase = () => {
    if (arcPointsRef.current.length < 2) {
      console.error("Not enough points to draw path:", arcPointsRef.current);
      if (departure && arrival) {
        const newPoints = calculateArcPoints(
          departure.lat, 
          departure.lng, 
          arrival.lat, 
          arrival.lng
        );
        if (newPoints.length >= 2) {
          arcPointsRef.current = newPoints;
          setArcPoints(newPoints);
        } else {
          arcPointsRef.current = [[departure.lat, departure.lng], [arrival.lat, arrival.lng]];
          setArcPoints([[departure.lat, departure.lng], [arrival.lat, arrival.lng]]);
        }
      }
    }
    
    setAnimationPhase('drawing');
    console.log(`Drawing phase active: Creating path from ${departure.code} to ${arrival.code}`);
    
    setDisplayedPoints([arcPointsRef.current[0]]);
    
    const pulseMarkerHtml = ReactDOMServer.renderToString(
      <div className="drawing-animation-marker">
        <div className="pulse-circle" style={{
          backgroundColor: type === 'direct' ? '#4CAF50' : '#FFC107'
        }}></div>
      </div>
    );
    
    const pulseMarkerIcon = L.divIcon({
      html: pulseMarkerHtml,
      className: 'drawing-marker-icon',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
    
    let drawingMarker = L.marker(arcPointsRef.current[0], { 
      icon: pulseMarkerIcon,
      zIndexOffset: 5000
    }).addTo(map);
    drawingMarkerRef.current = drawingMarker;
    
    const drawingDuration = 4000;
    const totalPoints = arcPointsRef.current.length;
    const pointsPerFrame = Math.max(1, Math.ceil(totalPoints / (drawingDuration / 16)));
    
    let currentPointIndex = 1;
    
    const drawNextSegment = () => {
      if (currentPointIndex >= totalPoints) {
        console.log(`Drawing complete for ${departure.code} to ${arrival.code}`);
        if (drawingMarkerRef.current) {
          drawingMarkerRef.current.remove();
          drawingMarkerRef.current = null;
        }
        
        const completionMarkerHtml = ReactDOMServer.renderToString(
          <div className="completion-marker" style={{
            backgroundColor: type === 'direct' ? '#4CAF50' : '#FFC107'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        );
        
        const completionIcon = L.divIcon({
          html: completionMarkerHtml,
          className: 'completion-icon',
          iconSize: [60, 60],
          iconAnchor: [30, 30]
        });
        
        const completionMarker = L.marker(arcPointsRef.current[arcPointsRef.current.length - 1], { 
          icon: completionIcon,
          zIndexOffset: 5000
        }).addTo(map);
        
        map.fitBounds(L.latLngBounds([
          [departure.lat, departure.lng],
          [arrival.lat, arrival.lng]
        ]), {
          padding: [50, 50],
          duration: 1
        });
        
        setTimeout(() => {
          completionMarker.remove();
          console.log(`Starting flying phase for ${departure.code} to ${arrival.code}`);
          startFlyingPhase();
        }, 1500);
        
        return;
      }
      
      const newIndex = Math.min(totalPoints, currentPointIndex + pointsPerFrame);
      const newPoints = arcPointsRef.current.slice(0, newIndex);
      setDisplayedPoints(newPoints);
      
      if (drawingMarkerRef.current && newIndex > 0 && newPoints[newIndex - 1]) {
        drawingMarkerRef.current.setLatLng(newPoints[newIndex - 1]);
      }
      
      currentPointIndex = newIndex;
      
      drawingRef.current = requestAnimationFrame(() => {
        setTimeout(drawNextSegment, 16);
      });
    };
    
    setTimeout(() => {
      console.log(`Starting to draw path segments for ${departure.code} to ${arrival.code}`);
      drawingRef.current = requestAnimationFrame(drawNextSegment);
    }, 300);
  };
  
  const startFlyingPhase = () => {
    setAnimationPhase('flying');
    console.log(`Flying phase active: Plane taking off from ${departure.code} to ${arrival.code}`);
    
    const takeoffMarkerHtml = ReactDOMServer.renderToString(
      <div className="takeoff-animation">
        <div className="takeoff-rays"></div>
      </div>
    );
    
    const takeoffMarkerIcon = L.divIcon({
      html: takeoffMarkerHtml,
      className: 'takeoff-marker-icon',
      iconSize: [60, 60],
      iconAnchor: [30, 30]
    });
    
    const takeoffMarker = L.marker([departure.lat, departure.lng], { 
      icon: takeoffMarkerIcon,
      zIndexOffset: 5000
    }).addTo(map);
    
    setPlanePosition([departure.lat, departure.lng]);
    
    const speed = 40;
    let step = 0;
    const totalSteps = arcPointsRef.current.length - 1;
    
    const animate = () => {
      if (step < totalSteps) {
        const point = arcPointsRef.current[step];
        if (point) {
          setPlanePosition([point[0], point[1]]);
          
          if (step < totalSteps - 1) {
            const currPoint = arcPointsRef.current[step];
            const nextPoint = arcPointsRef.current[step + 1];
            if (currPoint && nextPoint) {
              const bearing = getBearing(currPoint[0], currPoint[1], nextPoint[0], nextPoint[1]);
              setPlaneRotation(bearing);
            }
          }
        }
        
        step++;
        animationRef.current = requestAnimationFrame(() => {
          setTimeout(animate, speed);
        });
      } else {
        if (arrival) {
          const arrivalMarkerHtml = ReactDOMServer.renderToString(
            <div className="arrival-animation">
              <div className="arrival-pulse"></div>
            </div>
          );
          
          const arrivalMarkerIcon = L.divIcon({
            html: arrivalMarkerHtml,
            className: 'arrival-marker-icon',
            iconSize: [60, 60],
            iconAnchor: [30, 30]
          });
          
          const arrivalMarker = L.marker([arrival.lat, arrival.lng], { 
            icon: arrivalMarkerIcon,
            zIndexOffset: 5000
          }).addTo(map);
          
          setTimeout(() => {
            arrivalMarker.remove();
            setAnimationComplete(true);
          }, 3000);
        }
        
        takeoffMarker.remove();
        
        console.log(`Flight animation complete for ${departure.code} to ${arrival.code}`);
        setAnimationComplete(true);
        
        setTimeout(() => {
          if (Math.random() > 0.7) {


