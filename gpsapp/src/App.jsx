import LapMap from "./components/LapMap";
import LiveLapMap from "./components/LiveLapMap";
import JSONLap from "./components/JSONLap";

function App() {
  return (
    <div style={{ padding: "20px" }}>

      <h1>Lap Visualization</h1>
      <LapMap/>

      <h1> Live Lap Visualization</h1>
      <LiveLapMap/>

      <h1> JSON Lap</h1>
      <JSONLap/>
    </div>

  );
}

export default App;
