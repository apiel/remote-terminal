import React from 'react';

export const TAB_HEIGHT = 25;

const tabHeightStyle = {
    height: TAB_HEIGHT,
}

const onClickTab = (
    setActiveTab: React.Dispatch<React.SetStateAction<string>>,
    tab: string,
) => () => {
    setActiveTab(tab);
}

interface Props {
    tabs: string[],
    setTabs: React.Dispatch<React.SetStateAction<string[]>>,
    activeTab: string,
    setActiveTab: React.Dispatch<React.SetStateAction<string>>,
    onNewTab: () => void,
}
export const Tabs = ({ tabs, onNewTab, activeTab, setActiveTab }: Props) => {
    return (
        <div className="tabs" style={tabHeightStyle}>
            {tabs.map(
                tab => <div
                    className={`tab ${activeTab === tab && 'active'}`}
                    onClick={onClickTab(setActiveTab, tab)}
                    style={tabHeightStyle}
                    key={tab}
                >{tab}</div>
            )}
            <div className="tab" style={tabHeightStyle} onClick={onNewTab}>+</div>
        </div>
    );
}