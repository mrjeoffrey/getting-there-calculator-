
/**
 * Format day of week from date string to abbreviated format
 * Su - Sunday, M - Monday, Tu - Tuesday, W - Wednesday, R - Thursday, F - Friday, S - Saturday
 */
export const getDayOfWeek = (dateString: string): string => {
  const date = new Date(dateString);
  const days = ['Su', 'M', 'Tu', 'W', 'R', 'F', 'S'];
  return days[date.getDay()];
};

/**
 * Group flights by day of week, used to concatenate multiple days
 */
export const groupFlightsByDay = <T extends { departureTime: string; airline: string; duration: string; arrivalTime: string }>(
  flights: T[]
): Array<T & { days: string }> => {
  const flightMap = new Map<string, { base: T; daysSet: Set<string> }>();

  flights.forEach(flight => {
    const key = `${flight.airline}-${flight.duration}-${flight.departureTime.split('T')[1]?.substring(0, 5)}-${flight.arrivalTime.split('T')[1]?.substring(0, 5)}`;

    if (!flightMap.has(key)) {
      flightMap.set(key, {
        base: flight,
        daysSet: new Set<string>()
      });
    }

    flightMap.get(key)?.daysSet.add(getDayOfWeek(flight.departureTime));
  });

  return Array.from(flightMap.values()).map(({ base, daysSet }) => {
    const days = daysSet.size === 7 ? 'Daily' : Array.from(daysSet).join(', ');
    return {
      ...base,
      days
    };
  });
};