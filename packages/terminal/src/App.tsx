import React from 'react';

import './App.css';
import { Term } from './Term';
import { Tabs } from './Tabs';

const App: React.FC = () => {
    const remove = (targetKey: any) => {
        console.log('targetKey',targetKey);
    }
    return (
        <div className="App">
            <Tabs />
            <Term />
        </div>
    );
}

export default App;
