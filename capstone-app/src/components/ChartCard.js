import * as React from 'react';
import { useNavigate } from "react-router-dom";
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';
import ChartImage from '../images/ChartsImage.png';

function ChartCard() {
const navigate = useNavigate();

  return (
    <Card sx={{ maxWidth: 345 }} onClick={() => navigate('/charts')}>
      <CardActionArea>
        <CardMedia
          component="img"
          height="350"
          src={ChartImage}
        />

        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Data Charts
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default ChartCard;