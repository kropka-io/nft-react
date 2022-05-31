import {Connector} from "@rarible/connector";
import {WalletConnectConnectionProvider} from "@rarible/connector-walletconnect";
import {mapEthereumWallet} from '@rarible/connector-helper';
import {createRaribleSdk} from '@rarible/sdk';
import {toContractAddress} from "@rarible/types";
import {toUnionAddress} from "@rarible/types/build/union-address";
import {PrepareMintRequest} from "@rarible/sdk/build/types/nft/mint/prepare-mint-request.type";

import axios from "axios";

// listen for messages from dart
window.addEventListener('message', function (event) {
    if (event.data === 'capturePort') {
        if (event.ports[0] != null) {
            console.log('Port set');
            // @ts-ignore
            window.dartCommunicationPort = event.ports[0];
            // @ts-ignore
            window.dartCommunicationPort.onmessage = function (event) {
                console.log(`Message from dart side ${event.data}`);
            };
        }
    }
}, false);

const defaultSendMessage = (stringParam: string) => {
    // @ts-ignore
    window?.dartCommunicationPort?.postMessage(stringParam);
};

const getConnector = async (sendMessage: Function) => {
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
                return 'darova'
            }
        },
        // qrcodeModalOptions: {mobileLinks: ["metamask", "trust"]},
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

    return Connector.create(walletConnect);
};

const connectWallet = async (sendMessage: Function = () => {
    console.log('connectWallet default console log')
}) => {
    const connector = await getConnector(sendMessage);
    connector.connection.subscribe(async (con) => {
            console.log("connection: " + con.status);
            if (con.status === "connected") {
                sendMessage(JSON.stringify({
                    type: 'CONNECTED', message: {
                        address: con.connection.address,
                    }
                }))
            }
        }
    )

    await connect(connector)
};

const disconnectWallet = (sendMessage: Function) => {
    localStorage.setItem('walletconnect', '');
    sendMessage(JSON.stringify({type: 'DISCONNECTED', message: null}))
};


const mintAndSell = async (
    ipfsUri: string = '',
    name: string = 'Default name',
    description: string = 'Default description',
    price: string = '1',
    royalty: string = '0',
    sendMessage: Function = () => {
        console.log('mintAndSell default console log')
    },
) => {
    const connector = await getConnector(sendMessage);

    connector.connection.subscribe(async (con) => {
            try {
                console.log("connection: " + con.status);
                if (con.status === "connected") {
                    console.log('mint and sell logic started')
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


                    let uri;
                    try {
                        uri = await getIPFS(ipfsUri, tokenId?.tokenId, name, description);
                    } catch (err) {
                        sendMessage(JSON.stringify({
                            type: 'LOAD_TO_IPFS_ERROR',
                            message: JSON.stringify(err),
                        }))
                        throw err;
                    }


                    let mintSubmitResponse;
                    try {
                        const mintRequest: PrepareMintRequest = {
                            // @ts-ignore
                            collectionId: toContractAddress(collection),
                            tokenId,
                        };
                        const mintResponse = await sdk.nft.mint(mintRequest);
                        sendMessage(JSON.stringify({type: 'LOADED_TO_IPFS', message: null}))
                        sendMessage(JSON.stringify({type: 'LAUNCH', message: null}))
                        console.log('ipfs url ' + uri);
                        console.log(`the price is ${parseFloat(price)}`);
                        console.log(`the royalties is ${parseFloat(royalty)}`);

                        mintSubmitResponse = await mintResponse.submit({
                            uri,
                            supply: 1,
                            lazyMint: true,
                            creators: [
                                {
                                    account: toUnionAddress(`ETHEREUM:${con.connection.address}`),
                                    value: 10000,
                                },
                            ],
                            royalties: [{
                                account: toUnionAddress(`ETHEREUM:${con.connection.address}`),
                                value: parseFloat(royalty) * 100 || 0,
                            }],
                        });
                    } catch (e) {
                        sendMessage(JSON.stringify({
                            type: 'MINT_ERROR',
                            message: JSON.stringify(e),
                        }))
                        throw e;
                    }


                    try {
                        sendMessage(JSON.stringify({type: 'LAUNCH', message: null}))
                        const prepareSellResponse = await sdk.order.sell({itemId: mintSubmitResponse.itemId});
                        await prepareSellResponse.submit({
                            amount: 1,
                            price: parseFloat(price),
                            currency: {
                                "@type": "ETH",
                            },
                        });
                        console.log('EVERYTHING COMPLETED');
                        sendMessage(JSON.stringify({
                            type: 'MINTED_AND_PUT_ON_SALE',
                            message: {
                                link: `https://rarible.com/token/0xc9154424B823b10579895cCBE442d41b9Abd96Ed:${tokenId?.tokenId}`,
                            },
                        }))
                    } catch (e) {
                        sendMessage(JSON.stringify({
                            type: 'SELL_ERROR',
                            message: JSON.stringify(e),
                        }))
                        throw e;
                    }
                }
            } catch (e) {
                console.log(e);
            }
        }
    );

    await connect(connector)

};

const connect = async (connector: any) => {
    const option = (await connector.getOptions())[0];
    console.log(option);
    await connector.connect(option);
};


const getIPFS = async (ipfsUri: string, tokenId: any, name: string, description: string) => {
    const obj = {
        name: name,
        description: description,
        image: ipfsUri,
        external_url: `https://rarible.com/token/0xc9154424B823b10579895cCBE442d41b9Abd96Ed:${tokenId}`,
        attributes: []
    };

    const form = new FormData();

    const fileName = 'test.json';

    form.append('file', new Blob([JSON.stringify(obj)], {type: 'text/json'}), fileName);


    // rarible pinata
    // const response = await axios({
    //     method: "post",
    //     url: "https://pinata.rarible.com/upload",
    //     data: form,
    //     headers: {
    //         "Content-Type": "multipart/form-data",
    //     },
    // });

    // custom pinata
    const response = await axios({
        method: "post",
        url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
        data: form,
        headers: {
            "Content-Type": "multipart/form-data",
            pinata_api_key: '54847e2d543b337f65a6',
            pinata_secret_api_key: '47c8bc5bf00cb106e2173ef8b51c44e54d01307a3cf5ff28efa8692484d4ffb8',
        },
    });
    console.log('ended json upload to ipfs ')

    return `ipfs://ipfs/${response.data.IpfsHash}`

}

// @ts-ignore
window.mintAndSell = mintAndSell;
// @ts-ignore
window.connectWallet = connectWallet;
// @ts-ignore
window.disconnectWallet = disconnectWallet;

window.onerror = function myErrorHandler(errorMsg, url, lineNumber) {
    console.log(errorMsg, url, lineNumber);
    defaultSendMessage(JSON.stringify({
        type: 'ERROR',
        message: JSON.stringify(errorMsg),
    }))
    return false;
}

export default {
    mintAndSell,
};
