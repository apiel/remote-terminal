import React from 'react';

import './App.css';
import { Term, openNewTerm } from './Term';
import { Tabs } from './Tabs';

const App: React.FC = () => {
    const [tabs, setTabs] = React.useState<string[]>([]);
    const [activeTab, setActiveTab] = React.useState<string>('');
    const onNewTab = async () => {
        if (openNewTerm) {
            const pid = await openNewTerm(tabs);
        }
    }
    return (
        <div className="App">
            <Tabs
                tabs={tabs}
                setTabs={setTabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onNewTab={onNewTab}
            />
            <Term tabs={tabs} setTabs={setTabs} activeTab={activeTab} />
        </div>
    );
}

export default App;
