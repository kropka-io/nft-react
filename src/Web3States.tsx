import React from "react";

export class Web3States extends React.Component<{}, {
    web3: any,
    ethereum: any,
    web3Provider: any,
}> {
    private timerID: NodeJS.Timer;

    constructor(props: any) {
        super(props);
        this.state = {
            // @ts-ignore
            web3: window.web3,
            // @ts-ignore
            ethereum: window.ethereum,
            // @ts-ignore
            web3Provider: window.web3.currentProvider,
        };
        this.timerID = setInterval(
            () => this.tick(),
            1000
        );
    }

    componentDidMount() {
        this.timerID = setInterval(
            () => this.tick(),
            1000
        );
    }

    componentWillUnmount() {
        clearInterval(this.timerID);
    }

    tick() {
        this.setState({
            // @ts-ignore
            web3: window.web3,
            // @ts-ignore
            ethereum: window.ethereum,
            // @ts-ignore
            web3Provider: window.web3.currentProvider,
        });
    }

    render() {
        return (
            <div>
                <h3>Web3 exists: {!!this.state.web3 ? 'true' : 'false'}</h3>
                <h3>Ethereum exists: {!!this.state.ethereum ? 'true' : 'false'}</h3>
                <h3>Web3 provider exists : {!!this.state.web3Provider ? 'true' : 'false'}</h3>
            </div>
        );
    }
}
