import {
    Connector,
    IConnectorStateProvider,
    InjectedWeb3ConnectionProvider
} from "@rarible/connector";
import {WalletConnectConnectionProvider} from "@rarible/connector-walletconnect";
import {mapEthereumWallet} from '@rarible/connector-helper';
import {createRaribleSdk} from '@rarible/sdk';
import {toContractAddress} from "@rarible/types";
import {toUnionAddress} from "@rarible/types/build/union-address";
import {PrepareMintRequest} from "@rarible/sdk/build/types/nft/mint/prepare-mint-request.type";


import axios from "axios";


// import {CustomProvider} from "./CustomProvider";


const raribleTest = async (ipfsUri: string = '', sendMessage: Function = () => {console.log('default console log')}) => {
    let hasBeenConnected = false;
    console.log('darova')
    const ethereumRpcMap: Record<number, string> = {
        1: "https://node-mainnet.rarible.com",
        3: "https://node-ropsten.rarible.com",
        4: "https://node-rinkeby.rarible.com",
        17: "https://node-e2e.rarible.com",
    }

    const injected = mapEthereumWallet(new InjectedWeb3ConnectionProvider())

    const walletConnect = mapEthereumWallet(new WalletConnectConnectionProvider({

        bridge: "https://bridge.walletconnect.org",
        clientMeta: {
            description: "WalletConnect NodeJS Client",
            url: "https://nodejs.org/en/",
            icons: ["https://nodejs.org/static/images/logo.svg"],
            name: "WalletConnect",
        },
        rpc: {
            // 1: "https://node-mainnet.rarible.com",
            1: "https://mainnet-nethermind.blockscout.com/",
            3: "https://node-ropsten.rarible.com",
            4: "https://node-rinkeby.rarible.com",
            137: "https://matic-mainnet.chainstacklabs.com",
        },
        chainId: 1,
        qrcode: true,
        // qrcodeModal:QRCodeModal,
        qrcodeModal: {
            async open(uri: string, cb: any, opts?: any) {
                sendMessage(JSON.stringify({type: 'LAUNCH', message: uri}))
                console.log(uri)
            },
            async close() {
                console.log('closed method was called ')
                // const connection = await walletConnect.getConnection();
                // const sdk = createRaribleSdk((await walletConnect.getConnection())., "staging");
                // const isConnected = await walletConnect.isConnected()
                return 'darova'
            }
        },
        qrcodeModalOptions: {mobileLinks: ["metamask","trust"]},
        signingMethods: [
            'eth_signTypedData_v4',

            'eth_sendTransaction',
            'eth_signTransaction',
            'eth_sign',
            'eth_signTypedData',

            'eth_signTypedData_v1',
            'eth_signTypedData_v2',
            'eth_signTypedData_v3',
            'eth_signTypedData_v4',
            'personal_sign',
        ],
    }))

    const state: IConnectorStateProvider = {
        async getValue(): Promise<string | undefined> {
            const value = localStorage.getItem("saved_provider")
            return value ? value : undefined
        },
        async setValue(value: string | undefined): Promise<void> {
            localStorage.setItem("saved_provider", value || "")
        },
    }

        const connector = Connector
            .create(injected, state)
            .add(walletConnect)


    connector.connection.subscribe(async (con) => {
            console.log("connection: " + con.status);
            if (con.status === "connected" && !hasBeenConnected) {
                hasBeenConnected = true;
                console.log('connection logic started')
                // prod
                const collection = 'ETHEREUM:0xc9154424B823b10579895cCBE442d41b9Abd96Ed';
                // staging
                // const collection = 'ETHEREUM:0x6ede7f3c26975aad32a475e1021d8f6f39c89d82';
                // dev
                // const collection = 'ETHEREUM:0xB0EA149212Eb707a1E5FC1D2d3fD318a8d94cf05';
                // @ts-ignore
                const sdk = createRaribleSdk(con.connection.wallet, "prod");
                const tokenId = await sdk.nft.generateTokenId({
                    collection: toContractAddress(collection),
                    minter: toUnionAddress(`ETHEREUM:${con.connection.address}`),
                })
                console.log(tokenId);
                const mintRequest: PrepareMintRequest = {
                    // @ts-ignore
                    collectionId: toContractAddress(collection),
                    tokenId,
                };
                const mintResponse = await sdk.nft.mintAndSell(mintRequest);
                const uri = await getIPFS(ipfsUri, tokenId?.tokenId);
                sendMessage(JSON.stringify({type: 'LAUNCH', message: null}))
                console.log(uri);
                const response = await mintResponse.submit({
                    uri,
                    supply: 1,
                    lazyMint: true,
                    price: 1,
                    creators: [
                        {
                            account: toUnionAddress(`ETHEREUM:${con.connection.address}`),
                            value: 10000,
                        },
                    ],
                    royalties: [{
                        account: toUnionAddress(`ETHEREUM:${con.connection.address}`),
                        value: 1000,
                    }],
                    // currency: 'ERC20'
                    currency: {
                        "@type": "ETH",
                    },
                })

                console.log(response);
            }
        }
    )

    const option = (await connector.getOptions())[0]; // get list of available option
    console.log(option);
    const tmp = await connector.connect(option);

    console.log('dkdkjd')
}

const getIPFS = async (ipfsUri: string, tokenId: any) => {
    const obj = {
        "name": "112",
        "description": "123",
        "image": ipfsUri,
        "external_url": `https://rarible.com/token/0xc9154424B823b10579895cCBE442d41b9Abd96Ed:${tokenId}`,
        "attributes": []
    };

    const form = new FormData();

    const fileName = 'test.json';

    form.append('file', new Blob([JSON.stringify(obj)], {type: 'text/json'} ), fileName);


    const response = await axios({
        method: "post",
        url: "https://pinata.rarible.com/upload",
        data: form,
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    console.log('ended json upload on ipfs ')

    return `ipfs://ipfs/${response.data.IpfsHash}`

}

// @ts-ignore
window.raribleTest = raribleTest;

export default {
    raribleTest,
};
