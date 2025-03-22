import React from 'react'
import Weather from './components/Weather'
import Weather2 from './components/Weather2'
import BatteryPack from './components/BatteryPack'
import Segment1 from './components/Segment1'
import Segment2 from './components/Segment2'
import Segment3 from './components/Segment3'
import Segment4 from './components/Segment4'
import Segment5 from './components/Segment5'
import CellVoltageScene from './components/cellvoltagescene'

const App = () => {
  return (
    <div className='app'>
      {/* <h1> <Weather/> </h1> */}
      {/* <h1> <Weather2/> </h1> */}
      {/* <BatteryPack/> */}
      <CellVoltageScene/>
      {/* <Segment1/>
      <Segment2/>
      <Segment3/>
      <Segment4/>
      <Segment5/>
       */}
    </div>
    
  )
}

export default App
