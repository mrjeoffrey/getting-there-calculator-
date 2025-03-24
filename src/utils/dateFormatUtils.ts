
/**
 * Format day of week from date string to three-letter abbreviation
 */
export const getDayOfWeek = (dateString: string): string => {
  const date = new Date(dateString);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};

/**
 * Group flights by day of week, used to concatenate multiple days
 */
export const groupFlightsByDay = <T extends { departureTime: string }>(
  flights: T[]
): Array<{
  airline: string;
  duration: string;
  days: string;
  departureTime: string;
  arrivalTime: string;
}> => {
  const flightMap = new Map<string, Set<string>>();
  
  flights.forEach(flight => {
    // Create a unique key for each flight schedule
    const flightKey = `${(flight as any).airline}-${(flight as any).duration}-${flight.departureTime.split('T')[1]?.substring(0, 5)}-${(flight as any).arrivalTime.split('T')[1]?.substring(0, 5)}`;
    
    if (!flightMap.has(flightKey)) {
      flightMap.set(flightKey, new Set());
    }
    
    const dayOfWeek = getDayOfWeek(flight.departureTime);
    flightMap.get(flightKey)?.add(dayOfWeek);
  });
  
  return Array.from(flightMap.entries()).map(([key, days]) => {
    // Parse the key back into flight details
    const [airline, duration, departureTime, arrivalTime] = key.split('-');
    const daysString = Array.from(days).join(', ');
    
    return {
      airline,
      duration,
      days: daysString,
      departureTime,
      arrivalTime
    };
  });
};
