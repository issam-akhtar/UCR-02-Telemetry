import * as React from 'react';
import '../App.css';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  GaugeContainer,
  GaugeValueArc,
  GaugeReferenceArc,
  useGaugeState,
} from '@mui/x-charts/Gauge';

function GaugePointer() {
  const { valueAngle, outerRadius, cx, cy } = useGaugeState();

  if (valueAngle === null) {
    return null;
  }

  const target = {
    x: cx + outerRadius * Math.sin(valueAngle),
    y: cy - outerRadius * Math.cos(valueAngle),
  };

  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill="#B1A7A6" />
      <path d={`M ${cx} ${cy} L ${target.x} ${target.y}`} stroke="#B1A7A6" strokeWidth={4} />
    </g>
  );
}

export default function Speedometer(/*{speed}*/) {
  const speed = 120; // filler speed value
  const maxDisplaySpeed = 160;
  const maxGaugeValue = 100;

  const normalizedSpeed = Math.min((speed / maxDisplaySpeed) * maxGaugeValue, maxGaugeValue);

  return (
    <Stack alignItems="center" > 
      <GaugeContainer
        width={250}
        height={250}
        minValue={0}
        maxValue={maxGaugeValue}
        startAngle={-120}
        endAngle={120}
        value={normalizedSpeed}
      >
        <GaugeReferenceArc />
        <GaugeValueArc sx={{ fill: '#BA181B' }} />
        <GaugePointer />
      </GaugeContainer>

      <Typography className='SpeedText' variant="h4" color="#B1A7A6" sx={{ fontWeight: 'bold' }} >
        {speed} km/h
      </Typography>
    </Stack>
  );
}
