import React from 'react';

export const TAB_HEIGHT = 25;

const tabHeightStyle = {
    height: TAB_HEIGHT,
}

const onClickTab = (
    setActiveTab: React.Dispatch<React.SetStateAction<string>>,
    tab: string,
    onSelectTab: (tab: string) => void,
) => () => {
    setActiveTab(tab);
    onSelectTab(tab);
}

interface Props {
    tabs: string[],
    setTabs: React.Dispatch<React.SetStateAction<string[]>>,
    activeTab: string,
    setActiveTab: React.Dispatch<React.SetStateAction<string>>,
    onNewTab: () => void,
    onSelectTab?: (tab: string) => void,
    onResize?: () => void,
}
export const Tabs = ({
    tabs,
    onNewTab = () => { },
    activeTab,
    setActiveTab,
    onSelectTab = () => { },
    onResize = () => { },
}: Props) => {
    return (
        <div className="tabs" style={tabHeightStyle}>
            {tabs.map(
                tab => <div
                    className={`tab ${activeTab === tab && 'active'}`}
                    onClick={onClickTab(setActiveTab, tab, onSelectTab)}
                    style={tabHeightStyle}
                    key={tab}
                >{tab}</div>
            )}
            <div className="tab" style={tabHeightStyle} onClick={onNewTab}>+</div>
            <div className="tab" style={tabHeightStyle} onClick={onResize}>⤢</div>
        </div>
    );
}