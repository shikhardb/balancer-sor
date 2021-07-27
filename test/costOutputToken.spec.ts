// Tests costOutputToken
require('dotenv').config();
import { expect } from 'chai';
import { JsonRpcProvider } from '@ethersproject/providers';
import { BigNumber } from '../src/utils/bignumber';
import { BONE, scale } from '../src/bmath';
import { calculateTotalSwapCost, getAddress } from '../src/costToken';
const sor = require('../src');

const DAI = '0x8a9424745056Eb399FD19a0EC26A14316684e274';
const WETH = '0xae13d989dac2f0debff460ac112a837c89baa7cd'; //WBNB
const BUSD = '0x78867BbEeF44f2326bF8DDd1941a4439382EF2A7';

describe('Test costOutputToken', () => {
    it('Should get token pair', async () => {
        // See Factory https://uniswap.org/docs/v2/smart-contracts/factory/#getpair
        const CONFIRMED_ADDR = '0xAE4C99935B1AA0e76900e86cD155BFA63aB77A2a';

        let addr = getAddress(WETH, DAI);
        expect(addr).to.eql(CONFIRMED_ADDR);
        addr = getAddress(DAI, WETH);
        expect(addr).to.eql(CONFIRMED_ADDR);
        addr = getAddress(DAI, WETH.toLowerCase());
        expect(addr).to.eql(CONFIRMED_ADDR);
        addr = getAddress(DAI.toLowerCase(), WETH);
        expect(addr).to.eql(CONFIRMED_ADDR);
        addr = getAddress(DAI.toLowerCase(), WETH.toLowerCase());
        expect(addr).to.eql(CONFIRMED_ADDR);
    });

    it('Should return correct total swap cost', async () => {
        let gasPriceWei = new BigNumber(30000000000); // 30GWEI
        let swapGasCost = new BigNumber(100000);
        let tokenPriceWei = new BigNumber(352480995000000000);

        let totalSwapCost = calculateTotalSwapCost(
            tokenPriceWei,
            swapGasCost,
            gasPriceWei
        );

        let expectedTotalSwapCost = new BigNumber(1057442985000000);
        expect(expectedTotalSwapCost).to.eql(totalSwapCost);
    });

    it('Should return correct total swap cost', async () => {
        let gasPriceWei = new BigNumber(30000000000); // 30GWEI
        let swapGasCost = new BigNumber(100000);
        let tokenPriceWei = new BigNumber(240000000000000000000);

        let totalSwapCost = calculateTotalSwapCost(
            tokenPriceWei,
            swapGasCost,
            gasPriceWei
        );

        let expectedTotalSwapCost = new BigNumber(720000000000000000);
        expect(expectedTotalSwapCost).to.eql(totalSwapCost);
    });

    it('Should return 0 cost if no UniSwap pool for Eth/Token', async () => {
        let provider = new JsonRpcProvider(
            `${process.env.RPC_URL}${process.env.INFURA}`
        );
        let gasPriceWei = new BigNumber(30000000000);
        let swapGasCost = new BigNumber(100000);

        let costExpected = new BigNumber(0);
        let cost = await sor.getCostOutputToken(
            '0x0',
            gasPriceWei,
            swapGasCost,
            provider
        );

        expect(cost).to.eql(costExpected);
    });

    it('Should return 0 if not Mainnet', async () => {
        let provider = new JsonRpcProvider(
            `https://kovan.infura.io/v3/${process.env.INFURA}`
        );
        let gasPriceWei = new BigNumber(30000000000);
        let swapGasCost = new BigNumber(100000);

        let costExpected = new BigNumber(0);
        let cost = await sor.getCostOutputToken(
            DAI,
            gasPriceWei,
            swapGasCost,
            provider
        );

        expect(cost).to.eql(costExpected);
    }).timeout(5000);

    

    it('Example of full call with BUSD & 30GWEI Gas Price', async () => {
        let provider = new JsonRpcProvider(
            `${process.env.RPC_URL}${process.env.INFURA}`
        );
        let gasPriceWei = new BigNumber(30000000000);
        let swapGasCost = new BigNumber(100000);

        let cost = await sor.getCostOutputToken(
            BUSD,
            gasPriceWei,
            swapGasCost,
            provider
        );
        const costEth = scale(cost, -6);
        console.log(`CostOutputToken BUSD: ${costEth.toString()}`);
    }).timeout(5000);

});
