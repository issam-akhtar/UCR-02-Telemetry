import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import PropTypes from 'prop-types';

/**
 * OverlayWrapper Component
 * 
 * A specialized wrapper that adapts telemetry overlay components to fit within wheel cards
 * with consistent styling and proper tooltip handling. This component ensures overlays
 * display correctly regardless of their original implementation.
 * 
 * @param {React.ReactNode} children - The overlay component to be wrapped
 * @param {boolean} compact - Whether to use compact styling for space-constrained containers
 * @param {string} name - Semantic name of the wrapped component for accessibility
 */
const OverlayWrapper = ({ children, compact = false, name = '' }) => {
  // Memoize the style to prevent unnecessary prop calculations
  const boxStyle = useMemo(() => ({
    position: 'relative',
    width: '100%',
    height: '100%',
    mb: compact ? 0.25 : 0.5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // Critical: Enable pointer events to ensure tooltips work properly
    pointerEvents: 'auto',
    // Create stacking context to prevent z-index issues with tooltips
    zIndex: 1,
    // Ensure overlay content doesn't overflow container
    overflow: 'visible',
  }), [compact]);

  // Memoize the modified props for child components to reduce renders
  const childProps = useMemo(() => ({
    // Remove absolute positioning and fit to container
    sx: {
      position: 'relative',
      top: 'auto',
      left: 'auto',
      right: 'auto',
      bottom: 'auto',
      width: '100%',
      height: '100%',
    },
    // Signal to child component that it's being rendered in a card
    transformForCard: true,
    // Pass compact mode for responsive sizing
    compact: compact,
  }), [compact]);
    
  return (
    <Box
      sx={boxStyle}
      role="region"
      aria-label={name || 'Telemetry overlay'}
    >
      {/* Clone the child element with appropriate props for card layout */}
      {React.Children.map(children, child => {
        // Skip if no child is provided
        if (!child) return null;
        
        // Clone the child element with modified props, preserving original sx if present
        return React.cloneElement(child, {
          ...childProps,
          sx: {
            ...childProps.sx,
            ...(child.props.sx || {})
          },
        });
      })}
    </Box>
  );
};

OverlayWrapper.propTypes = {
  children: PropTypes.node,
  compact: PropTypes.bool,
  name: PropTypes.string
};

export default React.memo(OverlayWrapper);