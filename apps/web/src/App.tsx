import { WorldProvider } from './context/world-context';
import MystwrightSidebar from './components/Sidebar';
import './App.css';

function App() {

    return (
        <>
            <WorldProvider>
                <div className='mystwright-app dark'>
                    <MystwrightSidebar />
                </div>
            </WorldProvider>
        </>
    );
}

export default App;
