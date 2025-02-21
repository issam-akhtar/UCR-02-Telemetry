import * as React from 'react';
import '../App.css';
import InstagramIcon from '@mui/icons-material/Instagram';
import XIcon from '@mui/icons-material/X';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import FacebookIcon from '@mui/icons-material/Facebook';
import UofCLogoWhite from '../images/UofCLogoWhite.png';

function Footer() {
  return (

    <footer className="App-Footer">

      <div className="Social-Icons">

        <a
          href="https://www.instagram.com/ucalgaryracing/"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-link"
        >
          <InstagramIcon sx={{ color: "#F5F3F4"}}/>
        </a>

        <a
          href="https://www.linkedin.com/company/schulich-racing/"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-link"
        >
          <LinkedInIcon sx={{ color: "#F5F3F4"}}/>
        </a>

        <a
          href="https://www.facebook.com/ucalgaryracing/"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-link"
        >
          <FacebookIcon sx={{ color: "#F5F3F4"}}/>
        </a>

        <a
          href="https://x.com/schulichracing"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-link"
        >
          <XIcon sx={{ color: "#F5F3F4"}}/>
        </a>

      </div>

        <div className="Footer-Info">
            <p className="Footer-Text"> Developed by: Issam Akhtar, Gibran Akmal, Hamza Niaz, Awab Khurram, Mohamed El Naggar, and Bill Thai</p>
            <img src={UofCLogoWhite} alt="University of Calgary Logo" className="UniLogo" />
        </div>

    </footer>

  );
}

export default Footer;