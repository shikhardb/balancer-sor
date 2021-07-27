// Example showing full swapExactIn - run using: $ ts-node ./test/testScripts/example-swapExactIn.ts
require('dotenv').config();
//const sor = require('../../src');
import * as sor from '../../src';
const BigNumber = require('bignumber.js');
import { JsonRpcProvider } from '@ethersproject/providers';
const provider = new JsonRpcProvider(
    `${process.env.RPC_URL}${process.env.INFURA}` // If running this example make sure you have a .env file saved in root DIR with INFURA=your_key
);
const DAI = '0x8a9424745056Eb399FD19a0EC26A14316684e274'; // DAI Address
const BUSD = '0x78867BbEeF44f2326bF8DDd1941a4439382EF2A7'; // BUSD Address
const amountIn = new BigNumber('1000000'); // 1 BUSD, Always pay attention to Token Decimals. i.e. In this case BUSD has 6 decimals.
const tokenIn = BUSD;
const tokenOut = DAI;
const swapType = 'swapExactIn';
const noPools = 4; // This determines how many pools the SOR will use to swap.
const gasPrice = new BigNumber('30000000000'); // You can set gas price to whatever the current price is.
const swapCost = new BigNumber('100000'); // A pool swap costs approx 100000 gas
// URL for pools data
    //const poolsUrl = `https://ipfs.fleek.co/ipns/balancer-team-bucket.storage.fleek.co/balancer-exchange-kovan/pools`;
const poolsUrl = 'https://api.thegraph.com/subgraphs/name/aaron-foster-wallace/balancer-on-bsc-chapel-a1'

async function swapExactIn() {

    // This calculates the cost in output token (output token is tokenOut for swapExactIn and 
    // tokenIn for a swapExactOut) for each additional pool added to the final SOR swap result. 
    // This is used as an input to SOR to allow it to make gas efficient recommendations, i.e. 
    // if it costs 5 DAI to add another pool to the SOR solution and that only generates 1 more DAI,
    // then SOR should not add that pool (if gas costs were zero that pool would be added)
    const costOutputToken = await sor.getCostOutputToken(
        DAI,
        gasPrice,
        swapCost,
        provider
    );

    // Fetch all pools information
    const poolsHelper = new sor.POOLS();
    console.log('Fetching Pools...');
    let allPoolsNonZeroBalances_onchain = await poolsHelper.getAllPublicSwapPools(
        poolsUrl
    );

    console.log(`Retrieving Onchain Balances...`);
    let allPoolsNonZeroBalances = await sor.getAllPoolDataOnChain(
        allPoolsNonZeroBalances_onchain,
        sor.config.MULTICALL,
        //'0xc6AF819076E344C1ffcA35a2A603Dbf9bF9AC56f', // Address of Multicall contract
        provider
    );

    console.log(`Processing Data...`);
    // 'directPools' are all pools that contain both tokenIn and tokenOut, i.e. pools that 
    // can be used for direct swaps
    // 'hopTokens' are all tokens that can connect tokenIn and tokenOut in a multihop swap 
    // with two legs. WETH is a hopToken if its possible to trade BUSD to WETH then WETH to DAI 
    // 'poolsTokenIn' are the pools that contain tokenIn and a hopToken
    // 'poolsTokenOut' are the pools that contain a hopToken and tokenOut
    let directPools, hopTokens, poolsTokenIn, poolsTokenOut;
    [directPools, hopTokens, poolsTokenIn, poolsTokenOut] = sor.filterPools(
        allPoolsNonZeroBalances.pools,
        tokenIn.toLowerCase(), // The Subgraph returns tokens in lower case format so we must match this
        tokenOut.toLowerCase(),
        noPools
    );

    // For each hopToken, find the most liquid pool for the first and the second hops
    let mostLiquidPoolsFirstHop, mostLiquidPoolsSecondHop;
    [
        mostLiquidPoolsFirstHop,
        mostLiquidPoolsSecondHop,
    ] = sor.sortPoolsMostLiquid(
        tokenIn,
        tokenOut,
        hopTokens,
        poolsTokenIn,
        poolsTokenOut
    );

    // Finds the possible paths to make the swap, each path can be a direct swap 
    // or a multihop composed of 2 swaps 
    let pools, pathData;
    [pools, pathData] = sor.parsePoolData(
        directPools,
        tokenIn.toLowerCase(),
        tokenOut.toLowerCase(),
        mostLiquidPoolsFirstHop,
        mostLiquidPoolsSecondHop,
        hopTokens    
    );

    // For each path, find its spot price, slippage and limit amount
    // The spot price of a multihop is simply the multiplication of the spot prices of each
    // of the swaps. The slippage of a multihop is a bit more complicated (out of scope for here)
    // The limit amount is due to the fact that Balancer protocol limits a trade to 50% of the pool 
    // balance of tokenIn (for swapExactIn) and 33.33% of the pool balance of tokenOut (for 
    // swapExactOut)
    // 'paths' are ordered by ascending spot price
    let paths = sor.processPaths(pathData, pools, swapType);

    // epsOfInterest stores a list of all relevant prices: these are either 
    // 1) Spot prices of a path
    // 2) Prices where paths cross, meaning they would move to the same spot price after trade
    //    for the same amount traded.
    // For each price of interest we have:
    //   - 'bestPathsIds' a list of the id of the best paths to get to this price and
    //   - 'amounts' a list of how much each path would need to trade to get to that price of
    //     interest
    let epsOfInterest = sor.processEpsOfInterestMultiHop(
        paths,
        swapType,
        noPools
    );

    // Returns 'swaps' which is the optimal list of swaps to make and 
    // 'totalReturnWei' which is the total amount of tokenOut (eg. DAI) will be returned 
    let swaps, totalReturnWei;
    [swaps, totalReturnWei] = sor.smartOrderRouterMultiHopEpsOfInterest(
        pools,
        paths,
        swapType,
        amountIn,
        noPools,
        costOutputToken,
        epsOfInterest
    );

    console.log(`Total DAI Return: ${totalReturnWei.toString()}`);
    console.log(`Swaps: `);
    console.log(swaps);
}

swapExactIn();
