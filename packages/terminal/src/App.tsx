import React from 'react';

import './App.css';
import { Term, openNewTerm, fitScreen } from './Term';
import { Tabs } from './Tabs';

const onNewTab = (tabs: string[]) => async () => {
    if (openNewTerm) {
        await openNewTerm(tabs);
    }
}

const onResize = () => {
    console.log('onResize');
    fitScreen();
}

const App: React.FC = () => {
    const [tabs, setTabs] = React.useState<string[]>([]);
    const [activeTab, setActiveTab] = React.useState<string>('');

    return (
        <div className="App">
            <Tabs
                tabs={tabs}
                setTabs={setTabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onNewTab={onNewTab(tabs)}
                onResize={onResize}
            />
            <Term
                tabs={tabs}
                setTabs={setTabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />
        </div>
    );
}

export default App;
