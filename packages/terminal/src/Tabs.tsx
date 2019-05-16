import React from 'react';

export const TAB_HEIGHT = 25;

const tabHeightStyle = {
    height: TAB_HEIGHT,
}

interface Props {
    tabs: string[],
    setTabs: React.Dispatch<React.SetStateAction<string[]>>,
    onNewTab: () => void,
}
export const Tabs = ({ tabs, onNewTab }: Props) => {
    return (
        <div className="tabs" style={tabHeightStyle}>
            {tabs.map(tab => <div className="tab" style={tabHeightStyle} key={tab}>{tab}</div>)}
            <div className="tab" style={tabHeightStyle} onClick={onNewTab}>+</div>
        </div>
    );
}