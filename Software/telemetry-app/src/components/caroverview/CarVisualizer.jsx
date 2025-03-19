import React, { useMemo } from 'react';
import { Box, Tooltip, alpha, useTheme } from '@mui/material';
import PropTypes from 'prop-types';

const CarVisualizer = ({ 
    suspensionData, 
    activeTooltip, 
    setActiveTooltip, 
    tireSize = {
        width: { xs: 16, sm: 21, md: 23, lg: 25 },
        height: { xs: 40, sm: 45, md: 50, lg: 55 }
    }
}) => {
    const theme = useTheme();

    // Constants for suspension threshold values
    const SUSPENSION_THRESHOLDS = {
        CRITICAL: 25,  // Critical - red
        LOW: 40,       // Warning - orange
        MEDIUM: 70     // Good - green
    };

    // Helper function to determine color based on suspension value
    const getSuspensionColor = (value) => {
        if (value < SUSPENSION_THRESHOLDS.CRITICAL) return theme.palette.error.main;
        if (value < SUSPENSION_THRESHOLDS.LOW) return theme.palette.warning.main;
        return theme.palette.success.main;
    };

    // Generate tire elements with dynamic colors and positions
    const tires = useMemo(() => {
        const positions = [
            { code: 'FL', label: 'Front Left', x: 39.5, y: 39 },
            { code: 'FR', label: 'Front Right', x: 60.5, y: 39 },
            { code: 'RL', label: 'Rear Left', x: 39.5, y: 70 },
            { code: 'RR', label: 'Rear Right', x: 60.5, y: 70 }
        ];

        return positions.map(({ code, label, x, y }) => {
            const suspensionValue = suspensionData[code] || 0;
            const color = getSuspensionColor(suspensionValue);

            // Increased opacity for more apparent color changes
            const opacity = Math.min(0.6 + (suspensionValue / 100) * 0.4, 1);

            // Glow effect strength based on suspension status
            const glowStrength = suspensionValue < SUSPENSION_THRESHOLDS.CRITICAL ? 15 :
                suspensionValue < SUSPENSION_THRESHOLDS.LOW ? 10 : 6;
                
            // Calculate compression percentage for visual representation
            const compressionPct = Math.max(0, Math.min(100 - suspensionValue, 60));

            return (
                <Tooltip
                    key={`tire-${code}`}
                    title={
                        <Box sx={{ p: 0.5 }}>
                            <Box sx={{ fontWeight: 'bold', mb: 0.5 }}>{label} Suspension</Box>
                            <Box>Value: {suspensionValue.toFixed(1)}</Box>
                            <Box>Compression: {compressionPct.toFixed(0)}%</Box>
                            <Box>Status: {
                                suspensionValue < SUSPENSION_THRESHOLDS.CRITICAL ? "CRITICAL" :
                                suspensionValue < SUSPENSION_THRESHOLDS.LOW ? "WARNING" : "NORMAL"
                            }</Box>
                        </Box>
                    }
                    placement="top"
                    arrow
                    open={activeTooltip === `tire-${code}`}
                    onClose={() => setActiveTooltip(null)}
                >
                    <Box
                        sx={{
                            position: 'absolute',
                            width: tireSize.width,
                            height: tireSize.height,
                            // More rectangular shape with light border radius
                            borderRadius: '8px', 
                            backgroundColor: color,
                            opacity,
                            // Slight border to define edges
                            border: `1px solid ${alpha(theme.palette.common.black, 0.2)}`,
                            boxShadow: `0 0 ${glowStrength}px ${color}`,
                            transition: 'all 0.5s ease',
                            top: `${y}%`,
                            left: `${x}%`,
                            transform: 'translate(-50%, -50%)',
                            cursor: 'pointer',
                            overflow: 'hidden',

                            // Animation for critical suspension values
                            animation: suspensionValue < SUSPENSION_THRESHOLDS.CRITICAL
                                ? 'pulse 1.5s infinite'
                                : 'none',
                            '@keyframes pulse': {
                                '0%': { opacity: opacity * 0.6 },
                                '50%': { opacity },
                                '100%': { opacity: opacity * 0.6 }
                            }
                        }}
                        onClick={() => setActiveTooltip(`tire-${code}`)}
                        onMouseEnter={() => setActiveTooltip(`tire-${code}`)}
                        onMouseLeave={() => setActiveTooltip(null)}
                        role="button"
                        tabIndex={0}
                        aria-label={`${label} tire with suspension value ${suspensionValue.toFixed(1)}`}
                    >
                        {/* Removed gradient, keeping a solid color representation */}
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: `${compressionPct}%`,
                                backgroundColor: alpha(theme.palette.common.black, 0.2),
                                transition: 'height 0.5s ease',
                                zIndex: 2,
                            }}
                        />
                    </Box>
                </Tooltip>
            );
        });
    }, [suspensionData, theme, activeTooltip, setActiveTooltip, tireSize]);

    return (
        <Box
            sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: { xs: '400px', sm: '500px', md: '600px' },
                backgroundColor: alpha(theme.palette.background.paper, 0.15),
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow: `inset 0 0 30px ${alpha(theme.palette.common.black, 0.3)}`,
            }}
        >
            {/* Background gradient for depth */}
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    background: `radial-gradient(circle at center, ${alpha(theme.palette.primary.main, 0.05)}, transparent 70%)`,
                    pointerEvents: 'none',
                }}
            />
            {/* Tires with dynamic colors */}
            {tires}

            {/* Central car icon */}
            <Box
                sx={{
                    position: 'absolute',
                    inset: '0%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    pointerEvents: 'none',
                }}
            >
                <Box
                    component="img"
                    src="/SVG/UCR-01-Drawing-Top.svg"
                    alt="Car Top View"
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) rotate(90deg)',
                        maxHeight: { xs: '75%', sm: '85%', md: '95%' },
                        maxWidth: { xs: '65%', sm: '75%', md: '85%' },
                        width: 'auto',
                        height: 'auto',
                        pointerEvents: 'none',
                        zIndex: 1,
                        filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.2))',
                    }}
                    loading="lazy"
                />
            </Box>
        </Box>
    );
};

CarVisualizer.propTypes = {
    suspensionData: PropTypes.shape({
        FL: PropTypes.number,
        FR: PropTypes.number,
        RL: PropTypes.number,
        RR: PropTypes.number
    }).isRequired,
    activeTooltip: PropTypes.string,
    setActiveTooltip: PropTypes.func.isRequired,
    tireSize: PropTypes.shape({
        width: PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.shape({
                xs: PropTypes.number,
                sm: PropTypes.number,
                md: PropTypes.number,
                lg: PropTypes.number
            })
        ]),
        height: PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.shape({
                xs: PropTypes.number,
                sm: PropTypes.number,
                md: PropTypes.number,
                lg: PropTypes.number
            })
        ])
    })
};

export default React.memo(CarVisualizer);