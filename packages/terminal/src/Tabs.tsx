import React from 'react';

export const TAB_HEIGHT = 25;

const tabStyle = {
    height: TAB_HEIGHT,
    padding: '0px 10px',
    float: 'left' as 'left',
    borderRight: '1px #333 solid',
}

const tabsStyle = {
    height: TAB_HEIGHT,
    background: '#111',
    color: '#999',
}

interface Props {
    tabs: number[],
    setTabs: React.Dispatch<React.SetStateAction<number[]>>,
}
export const Tabs = ({ tabs }: Props) => {
    return (
        <div style={tabsStyle}>
            {tabs.map(tab => <div style={tabStyle} key={tab}>{tab}</div>)}
            <div style={tabStyle}>+</div>
        </div>
    );
}