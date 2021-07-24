import { BaseProvider } from '@ethersproject/providers';
import { Pools, SubGraphPools, PoolPairData } from './types';
export declare function parsePoolDataOnChain(pools: any, tokenIn: string, tokenOut: string, multiAddress: string, provider: BaseProvider): Promise<PoolPairData[]>;
export declare function getAllPoolDataOnChain(pools: SubGraphPools, multiAddress: string, provider: BaseProvider): Promise<Pools>;
export declare function getAllPoolDataOnChainNew(pools: SubGraphPools, multiAddress: string, provider: BaseProvider): Promise<Pools>;
