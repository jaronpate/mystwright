import { WorldProvider } from './context/world-context';
import MystwrightSidebar from './components/Sidebar';
import MainPage from './components/MainPage';
import './App.css';

function App() {

    return (
        <>
            <WorldProvider>
                <div className='mystwright-app dark'>
                    <MystwrightSidebar />
                    <MainPage />
                </div>
            </WorldProvider>
        </>
    );
}

export default App;
