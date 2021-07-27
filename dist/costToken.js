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
Object.defineProperty(exports, "__esModule", { value: true });
const address_1 = require("@ethersproject/address");
const contracts_1 = require("@ethersproject/contracts");
const solidity_1 = require("@ethersproject/solidity");
const bignumber_1 = require("./utils/bignumber");
const bmath_1 = require("./bmath");
//PancakeSwap testnet: PancakeFactory (equivalent to UniswapV2Factory)
const config_1 = require("./config");
function getAddress(tokenA, tokenB) {
    const tokens = tokenA.toLowerCase() < tokenB.toLowerCase()
        ? [tokenA, tokenB]
        : [tokenB, tokenA];
    let address = address_1.getCreate2Address(config_1.FACTORY_ADDRESS, solidity_1.keccak256(['bytes'], [solidity_1.pack(['address', 'address'], [tokens[0], tokens[1]])]), config_1.INIT_CODE_HASH);
    return address;
}
exports.getAddress = getAddress;
function getOnChainReserves(PairAddr, provider) {
    return __awaiter(this, void 0, void 0, function* () {
        const uniswapV2PairAbi = require('./abi/UniswapV2Pair.json');
        const pairContract = new contracts_1.Contract(PairAddr, uniswapV2PairAbi, provider);
        let [reserve0, reserve1, blockTimestamp] = yield pairContract.getReserves();
        return [reserve0, reserve1];
    });
}
exports.getOnChainReserves = getOnChainReserves;
function getTokenWeiPrice(TokenAddr, provider) {
    return __awaiter(this, void 0, void 0, function* () {
        if (TokenAddr.toLowerCase() === config_1.WETH_ADDRESS.toLowerCase())
            return new bignumber_1.BigNumber(bmath_1.BONE);
        let addr = getAddress(config_1.WETH_ADDRESS, TokenAddr);
        let [reserve0, reserve1] = yield getOnChainReserves(addr, provider);
        console.log([reserve0, reserve1]);
        const numerator = new bignumber_1.BigNumber(reserve0.toString());
        const denominator = new bignumber_1.BigNumber(reserve1.toString());
        const price1eth = numerator.div(denominator);
        return price1eth.times(bmath_1.BONE);
    });
}
exports.getTokenWeiPrice = getTokenWeiPrice;
function calculateTotalSwapCost(TokenPrice, SwapCost, GasPriceWei) {
    return GasPriceWei.times(SwapCost)
        .times(TokenPrice)
        .div(bmath_1.BONE);
}
exports.calculateTotalSwapCost = calculateTotalSwapCost;
function getCostOutputToken(TokenAddr, GasPriceWei, SwapGasCost, Provider, ChainId = 0) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!ChainId) {
            let network = yield Provider.getNetwork();
            ChainId = network.chainId;
        }
        // If not mainnet return 0 as UniSwap price unlikely to be correct?
        // Provider can be used to fetch token data (i.e. Decimals) via UniSwap SDK when Ethers V5 is used
        //if (ChainId !== 1) return new BigNumber(0);
        let tokenPrice = new bignumber_1.BigNumber(0);
        try {
            tokenPrice = yield getTokenWeiPrice(TokenAddr, Provider);
        }
        catch (err) {
            // console.log(err)
            // If no pool for provided address (or addr incorrect) then default to 0
            console.log('Error Getting Token Price. Defaulting to 0.');
        }
        console.log(`Prreecio ${tokenPrice}`);
        let costOutputToken = calculateTotalSwapCost(tokenPrice, SwapGasCost, GasPriceWei);
        return costOutputToken;
    });
}
exports.getCostOutputToken = getCostOutputToken;
