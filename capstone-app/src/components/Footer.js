import * as React from 'react';
import '../App.css';
import InstagramIcon from '@mui/icons-material/Instagram';
import XIcon from '@mui/icons-material/X';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import FacebookIcon from '@mui/icons-material/Facebook';
import UofCLogo from '../images/UofCLogo.png';

function Footer() {
  return (

    <footer className="App-footer">

      <div className="social-icons">

        <a
          href="https://www.instagram.com/ucalgaryracing/"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-link"
        >
          <InstagramIcon />
        </a>

        <a
          href="https://www.linkedin.com/company/schulich-racing/"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-link"
        >
          <LinkedInIcon />
        </a>

        <a
          href="https://www.facebook.com/ucalgaryracing/"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-link"
        >
          <FacebookIcon />
        </a>

        <a
          href="https://x.com/schulichracing"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-link"
        >
          <XIcon />
        </a>

      </div>

        <div className="Footer-info">
            <p className="Footer-text">&copy; 2024 UCalgary Racing Telemetry System. All rights reserved.</p>
            <img src={UofCLogo} alt="University of Calgary Logo" className="UniLogo" />
        </div>

    </footer>

  );
}

export default Footer;