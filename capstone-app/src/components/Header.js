import UCR_Logo from '../images/UCR_Logo.png';
import React from 'react';
import '../App.css';
import { useNavigate } from 'react-router-dom';

function Header() {

  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate("/"); // Navigate to the home page
  };

    return(
      <header className="App-header">
            <img 
            src={UCR_Logo} 
            alt="UofC Logo"
            className="UCRLogo"
            onClick={handleLogoClick}
            style={{ cursor: "pointer" }}
            />
            <h1 className='HeaderText'> UCalgary Racing Telemetry System</h1>
      </header>
    );
}

export default Header;