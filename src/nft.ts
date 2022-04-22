import {Connector, InjectedWeb3ConnectionProvider} from "@rarible/connector";
import {WalletConnectConnectionProvider} from "@rarible/connector-walletconnect";
import {mapEthereumWallet} from '@rarible/connector-helper';
import {createRaribleSdk} from '@rarible/sdk';
import {toContractAddress} from "@rarible/types";
import {toUnionAddress} from "@rarible/types/build/union-address";
import {PrepareMintRequest} from "@rarible/sdk/build/types/nft/mint/prepare-mint-request.type";
import axios from "axios";


const darova = async () => {
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
            1: "https://node-mainnet.rarible.com",
            3: "https://node-ropsten.rarible.com",
            4: "https://node-rinkeby.rarible.com",
        },
        chainId: 1,
        qrcode: true,
        qrcodeModal: {
            async open(uri: string, cb: any, opts?: any) {

                // console.log(cb.toString())
                console.log(window)
                // @ts-ignore
                console.log(window?.TESTCHANNEL)
                console.log(uri)
                // await cb()
            },
            async close() {
                console.log('skdfjksdjf')
                // const connection = await walletConnect.getConnection();
                // const sdk = createRaribleSdk((await walletConnect.getConnection())., "staging");
                // const isConnected = await walletConnect.isConnected()
                return 'darova'
            }
        },
        // qrcodeModalOptions: {
        //     mobileLinks: ['lol']
        // }

    }))


    const connector = Connector
        .create(injected)
        .add(walletConnect)


    connector.connection.subscribe(async (con) => {
            console.log("connection: " + con.status);
            if (con.status === "connected") {
                console.log('ccccccccccccccccon')
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
                    collectionId: toContractAddress(collection),
                    tokenId,
                };
                const mintResponse = await sdk.nft.mintAndSell(mintRequest);
                const uri = await getIPFS(tokenId?.tokenId);
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

const getIPFS = async (tokenId: any) => {
    const obj = {
        "name": "112",
        "description": "123",
        "image": "ipfs://ipfs/QmdFFGs19hry4NjWMgZj2XTxGFEhywRsvD41bpR68uHCCq/image.png",
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
    console.log(response);
    console.log(2432452352345)

    return `ipfs://ipfs/${response.data.IpfsHash}`

}


export default darova;
