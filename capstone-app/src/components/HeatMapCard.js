import * as React from 'react';
import { useNavigate } from "react-router-dom";
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';
import HeatMapImage from '../images/HeatMapImage.png';

function HeatMapCard() {
const navigate = useNavigate();

  return (
    <Card sx={{ maxWidth: 345 }} onClick={() => navigate('/heatmaps')}>
      <CardActionArea>
        <CardMedia
          component="img"
          height="350"
          src={HeatMapImage}
        />

        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Heat Maps
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default HeatMapCard;