"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const contracts_1 = require("@ethersproject/contracts");
const abi_1 = require("@ethersproject/abi");
const bytes_1 = require("@ethersproject/bytes");
const keccak256_1 = require("@ethersproject/keccak256");
const strings_1 = require("@ethersproject/strings");
const bmath = __importStar(require("./bmath"));
// LEGACY FUNCTION - Keep Input/Output Format
function parsePoolDataOnChain(pools, tokenIn, tokenOut, multiAddress, provider) {
    return __awaiter(this, void 0, void 0, function* () {
        if (pools.length === 0)
            throw Error('There are no pools with selected tokens');
        const multiAbi = require('./abi/multicall.json');
        const bpoolAbi = require('./abi/bpool.json');
        const multi = new contracts_1.Contract(multiAddress, multiAbi, provider);
        const iface = new abi_1.Interface(bpoolAbi);
        const promises = [];
        let calls = [];
        let poolData = [];
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
            const [blockNumber, response] = yield multi.aggregate(calls);
            let i = 0;
            let chunkResponse = [];
            let returnPools = [];
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
        }
        catch (e) {
            console.error('Failure querying onchain balances', { error: e });
            return;
        }
    });
}
exports.parsePoolDataOnChain = parsePoolDataOnChain;
function getAllPoolDataOnChain(pools, multiAddress, provider) {
    return __awaiter(this, void 0, void 0, function* () {
        if (pools.pools.length === 0)
            throw Error('There are no pools with selected tokens');
        const multiAbi = require('./abi/multicall.json');
        const bpoolAbi = require('./abi/bpool.json');
        const multi = new contracts_1.Contract(multiAddress, multiAbi, provider);
        const bPool = new abi_1.Interface(bpoolAbi);
        const promises = [];
        let calls = [];
        let encodedSwapFee = bPool.encodeFunctionData('getSwapFee', []);
        let encodedBalance = bytes_1.hexDataSlice(keccak256_1.keccak256(strings_1.toUtf8Bytes('getBalance(address)')), 0, 4);
        let encodedWeight = bytes_1.hexDataSlice(keccak256_1.keccak256(strings_1.toUtf8Bytes('getDenormalizedWeight(address)')), 0, 4);
        for (let i = 0; i < pools.pools.length; i++) {
            // for (let i = 0; i < 1; i++) {
            let p = pools.pools[i];
            calls.push([p.id, encodedSwapFee]);
            // Checks all tokens for pool
            p.tokens.forEach(token => {
                let paddedAddr = bytes_1.hexZeroPad(token.address, 32)
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
            const [blockNumber, response] = yield multi.aggregate(calls);
            let i = 0;
            let chunkResponse = [];
            let returnPools = [];
            let j = 0;
            let onChainPools = { pools: [] };
            for (let i = 0; i < pools.pools.length; i++) {
                let tokens = [];
                let publicSwap = true;
                if (pools.pools[i].publicSwap === 'false')
                    publicSwap = false;
                let p = {
                    id: pools.pools[i].id,
                    swapFee: bmath.bnum(response[j]),
                    totalWeight: bmath.scale(bmath.bnum(pools.pools[i].totalWeight), 18),
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
        }
        catch (e) {
            console.error('Failure querying onchain balances', { error: e });
            return;
        }
    });
}
exports.getAllPoolDataOnChain = getAllPoolDataOnChain;
// New function for CustomMulticall (experimental for BSCtestnet)
function getAllPoolDataOnChainNew(pools, multiAddress, provider) {
    return __awaiter(this, void 0, void 0, function* () {
        if (pools.pools.length === 0)
            throw Error('There are no pools.');
        const customMultiAbi = require('./abi/customMulticall.json');
        const contract = new contracts_1.Contract(multiAddress, customMultiAbi, provider);
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
        console.log(`addre:  ${JSON.stringify(addresses)}  `);
        console.log(`total:  ${JSON.stringify(total)}  `);
        let results = yield contract.getPoolInfo(addresses, total);
        let j = 0;
        let onChainPools = { pools: [] };
        for (let i = 0; i < pools.pools.length; i++) {
            let tokens = [];
            let p = {
                id: pools.pools[i].id,
                swapFee: bmath.scale(bmath.bnum(pools.pools[i].swapFee), 18),
                totalWeight: bmath.scale(bmath.bnum(pools.pools[i].totalWeight), 18),
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
    });
}
exports.getAllPoolDataOnChainNew = getAllPoolDataOnChainNew;
