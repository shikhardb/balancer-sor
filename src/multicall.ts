import { Contract } from '@ethersproject/contracts';

import { Interface, FormatTypes } from "@ethersproject/abi";
import { hexDataSlice, hexZeroPad } from "@ethersproject/bytes";
import { keccak256 } from "@ethersproject/keccak256";
import { toUtf8Bytes } from "@ethersproject/strings";

import { BaseProvider } from '@ethersproject/providers';
import { Pools, Pool, SubGraphPools, PoolPairData, Token, SubGraphPool } from './types';
import * as bmath from './bmath';



// LEGACY FUNCTION - Keep Input/Output Format
export async function parsePoolDataOnChain(
    pools,
    tokenIn: string,
    tokenOut: string,
    multiAddress: string,
    provider: BaseProvider,
): Promise<PoolPairData[]> {
    if (pools.length === 0)
        throw Error('There are no pools with selected tokens');

    const multiAbi = require('./abi/multicall.json');
    const bpoolAbi = require('./abi/bpool.json');

    const multi = new Contract(multiAddress, multiAbi, provider);

    const iface = new Interface(bpoolAbi);

    const promises: Promise<any>[] = [];

    let calls = [];

    let poolData: PoolPairData[] = [];
    pools.forEach(p => {
        calls.push([p.id, iface.encodeFunctionData('getBalance', [tokenIn])]);
        calls.push([p.id, iface.encodeFunctionData('getBalance', [tokenOut])]);
        calls.push([
            p.id,
            iface.encodeFunctionData('getNormalizedWeight', [tokenIn]),
        ]);
        calls.push([
            p.id,
            iface.encodeFunctionData('getNormalizedWeight', [tokenOut]),
        ]);
        calls.push([p.id, iface.encodeFunctionData('getSwapFee', [])]);
    });

    try {
        const [blockNumber, response] = await multi.aggregate(calls);
        let i = 0;
        let chunkResponse = [];
        let returnPools: PoolPairData[] = [];
        for (let i = 0; i < response.length; i += 5) {
            let chunk = response.slice(i, i + 5);
            chunkResponse.push(chunk);
        }

        chunkResponse.forEach((r, j) => {
            let obj = {
                id: pools[j].id,
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                balanceIn: bmath.bnum(r[0]),
                balanceOut: bmath.bnum(r[1]),
                weightIn: bmath.bnum(r[2]),
                weightOut: bmath.bnum(r[3]),
                swapFee: bmath.bnum(r[4]),
            };
            returnPools.push(obj);
        });

        return returnPools;
    } catch (e) {
        console.error('Failure querying onchain balances', { error: e });
        return;
    }
}

export async function getAllPoolDataOnChain(
    pools: SubGraphPools,
    multiAddress: string,
    provider: BaseProvider
): Promise<Pools> {
    if (pools.pools.length === 0)
        throw Error('There are no pools with selected tokens');

    const multiAbi = require('./abi/multicall.json');
    const bpoolAbi = require('./abi/bpool.json');

    const multi = new Contract(multiAddress, multiAbi, provider);
    const bPool = new Interface(bpoolAbi);

    const promises: Promise<any>[] = [];

    let calls = [];

    let encodedSwapFee = bPool.encodeFunctionData('getSwapFee', []);
    let encodedBalance = hexDataSlice(
        keccak256(toUtf8Bytes('getBalance(address)')),
        0,
        4
    );
    let encodedWeight = hexDataSlice(
        keccak256(toUtf8Bytes('getDenormalizedWeight(address)')),
        0,
        4
    );

    for (let i = 0; i < pools.pools.length; i++) {
        // for (let i = 0; i < 1; i++) {
        let p = pools.pools[i];

        calls.push([p.id, encodedSwapFee]);

        // Checks all tokens for pool
        p.tokens.forEach(token => {
            let paddedAddr = hexZeroPad(token.address, 32)
                .replace(`0x`, '');

            calls.push([
                p.id,
                encodedBalance.concat(paddedAddr.replace(`0x`, '')),
            ]);

            calls.push([
                p.id,
                encodedWeight.concat(paddedAddr.replace(`0x`, '')),
            ]);
        });
    }

    try {
        // console.log(`Multicalls: ${calls.length}`);
        const [blockNumber, response] = await multi.aggregate(calls);

        let i = 0;
        let chunkResponse = [];
        let returnPools: PoolPairData[] = [];
        let j = 0;
        let onChainPools: Pools = { pools: [] };

        for (let i = 0; i < pools.pools.length; i++) {
            let tokens: Token[] = [];
            let publicSwap = true;
            if (pools.pools[i].publicSwap === 'false') publicSwap = false;

            let p: Pool = {
                id: pools.pools[i].id,
                swapFee: bmath.bnum(response[j]),
                totalWeight: bmath.scale(
                    bmath.bnum(pools.pools[i].totalWeight),
                    18
                ),
                //publicSwap: publicSwap,
                tokens: tokens,
                tokensList: pools.pools[i].tokensList,
            };
            j++;
            pools.pools[i].tokens.forEach(token => {
                let bal = bmath.bnum(response[j]);
                j++;
                let dW = bmath.bnum(response[j]);
                j++;
                p.tokens.push({
                    //id: token.id,
                    address: token.address,
                    balance: bal,
                    decimals: Number(token.decimals),
                    //symbol: token.symbol,
                    denormWeight: dW,
                });
            });
            onChainPools.pools.push(p);
        }
        return onChainPools;
    } catch (e) {
        console.error('Failure querying onchain balances', { error: e });
        return;
    }
}

// New function for CustomMulticall (experimental for BSCtestnet)
export async function getAllPoolDataOnChainNew(
    pools: SubGraphPools,
    multiAddress: string,
    provider: BaseProvider
): Promise<Pools> {
    if (pools.pools.length === 0) throw Error('There are no pools.');

    const customMultiAbi = require('./abi/customMulticall.json');
    const contract = new Contract(multiAddress, customMultiAbi, provider);

    let addresses = [];
    let total = 0;

    for (let i = 0; i < pools.pools.length; i++) {
        let pool = pools.pools[i];

        addresses.push([pool.id]);
        total++;
        pool.tokens.forEach(token => {
            addresses[i].push(token.address);
            total++;
        });
    }

    console.log(`addre:  ${JSON.stringify(addresses) }  `);
    console.log(`total:  ${JSON.stringify(total)}  `);
    let results = await contract.getPoolInfo(addresses, total);

    let j = 0;
    let onChainPools: Pools = { pools: [] };

    for (let i = 0; i < pools.pools.length; i++) {
        let tokens: Token[] = [];

        let p: Pool = {
            id: pools.pools[i].id,
            swapFee: bmath.scale(bmath.bnum(pools.pools[i].swapFee), 18),
            totalWeight: bmath.scale(
                bmath.bnum(pools.pools[i].totalWeight),
                18
            ),
            tokens: tokens,
            tokensList: pools.pools[i].tokensList,
        };

        pools.pools[i].tokens.forEach(token => {
            let bal = bmath.bnum(results[j]);
            j++;
            p.tokens.push({
                address: token.address,
                balance: bal,
                decimals: Number(token.decimals),
                denormWeight: bmath.scale(bmath.bnum(token.denormWeight), 18),
            });
        });
        onChainPools.pools.push(p);
    }
    return onChainPools;
}
