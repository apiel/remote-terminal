import React from 'react';
import { Tabs as ATabs } from 'antd';

export class Tabs extends React.Component {
    remove = (targetKey: any) => {
        console.log('remove?', targetKey);
    };

    render() {
        return (
            <ATabs
                hideAdd
                onChange={e => console.log('tab change', e)}
                // activeKey={this.state.activeKey}
                type="editable-card"
                onEdit={e => console.log('tab edit', e)}
            >
                <ATabs.TabPane tab="hello" closable={true} />
                <ATabs.TabPane tab="hello2" closable={true} />
            </ATabs>
        );
    }
}