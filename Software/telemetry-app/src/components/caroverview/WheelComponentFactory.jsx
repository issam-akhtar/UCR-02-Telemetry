import React, { useMemo } from 'react';

/**
 * WheelComponentFactory
 * 
 * Helper functions to create instances of overlay components for specific wheel positions.
 * These functions isolate each wheel's data and create position-specific overlay components.
 * 
 * Updated to use useMemo for better performance.
 */

/**
 * Creates a suspension component for a specific wheel position
 * @param {Component} CompactSuspensionOverlay - The suspension overlay component
 * @param {string} position - Wheel position (FL, FR, RL, RR)
 * @param {number} value - Suspension value
 */
export const createSuspensionComponent = (CompactSuspensionOverlay, position, value) => {
  // Create an optimized component that renders only the specified wheel's suspension
  const suspensionValues = useMemo(() => {
    // Create an object with only the position's data populated
    return {
      FL: position === 'FL' ? value : null,
      FR: position === 'FR' ? value : null,
      RL: position === 'RL' ? value : null,
      RR: position === 'RR' ? value : null
    };
  }, [position, value]);
  
  return (
    <CompactSuspensionOverlay 
      wheelFilter={position} 
      suspensionValues={suspensionValues}
      transformForCard={true}
    />
  );
};

/**
 * Creates a wheel speed component for a specific wheel position
 * @param {Component} CompactWheelSpeedOverlay - The wheel speed overlay component
 * @param {string} position - Wheel position (FL, FR, RL, RR)
 * @param {number} frequency - Wheel speed frequency value
 */
export const createWheelSpeedComponent = (CompactWheelSpeedOverlay, position, frequency) => {
  // Optimize by memoizing the values object
  const speedValues = useMemo(() => {
    // Create an object with only the position's data populated
    return {
      FL: position === 'FL' ? frequency : null,
      FR: position === 'FR' ? frequency : null,
      RL: position === 'RL' ? frequency : null,
      RR: position === 'RR' ? frequency : null
    };
  }, [position, frequency]);
  
  return (
    <CompactWheelSpeedOverlay 
      wheelFilter={position}
      speedValues={speedValues}
      transformForCard={true}
    />
  );
};

/**
 * Creates a strain component for a specific wheel position
 * @param {Component} CompactChassisStrainOverlay - The strain overlay component
 * @param {string} position - Wheel position (FL, FR, RL, RR)
 * @param {number} strain - Strain value
 */
export const createStrainComponent = (CompactChassisStrainOverlay, position, strain) => {
  // Optimize by memoizing the values object
  const strainValues = useMemo(() => {
    // Create an object with only the position's data populated
    return {
      FL: position === 'FL' ? strain : null,
      FR: position === 'FR' ? strain : null,
      RL: position === 'RL' ? strain : null,
      RR: position === 'RR' ? strain : null
    };
  }, [position, strain]);
  
  return (
    <CompactChassisStrainOverlay 
      wheelFilter={position}
      strainValues={strainValues}
      transformForCard={true}
    />
  );
};

/**
 * Creates an aero component for a specific wheel position
 * @param {Component} CompactAeroOverlay - The aero overlay component
 * @param {string} position - Wheel position (FL, FR, RL, RR)
 * @param {Object} data - Aero data with pressure and temperature
 */
export const createAeroComponent = (CompactAeroOverlay, position, data) => {
  // Optimize by memoizing the complex nested values object
  const aeroValues = useMemo(() => {
    // Extract pressure and temperature, defaulting to null if not available
    const pressure = data?.pressure;
    const temperature = data?.temperature;
    
    // Create an object with only the position's data populated
    return {
      FL: position === 'FL' ? { pressure, temperature } : null,
      FR: position === 'FR' ? { pressure, temperature } : null,
      RL: position === 'RL' ? { pressure, temperature } : null,
      RR: position === 'RR' ? { pressure, temperature } : null
    };
  }, [position, data]);
  
  return (
    <CompactAeroOverlay 
      wheelFilter={position}
      aeroValues={aeroValues}
      transformForCard={true}
    />
  );
};