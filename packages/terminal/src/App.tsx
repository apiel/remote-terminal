import React from 'react';

import './App.css';
import { Term } from './Term';
import { Tabs } from './Tabs';

const App: React.FC = () => {
    const [tabs, setTabs] = React.useState<string[]>([]);
    return (
        <div className="App">
            <Tabs tabs={tabs} setTabs={setTabs} />
            <Term tabs={tabs} setTabs={setTabs} />
        </div>
    );
}

export default App;
