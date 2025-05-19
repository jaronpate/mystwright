import { WorldProvider } from './context/world-context';
import './App.css';

function App() {

  return (
    <>
      <WorldProvider>
        <div className="App">
          <h1>Welcome to Mystwright!</h1>
        </div>
      </WorldProvider>
    </>
  );
}

export default App;
