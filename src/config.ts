
const chainId = process.env.APP_CHAIN_ID || 1;
export const CUSTOM_MULTICALL = {
	97:"0xc6AF819076E344C1ffcA35a2A603Dbf9bF9AC56f",
	56:"",
}[chainId];

export const MULTICALL = {
	97:"0xae11C5B5f29A6a25e955F0CB8ddCc416f522AF5C",
	56:"0x41263cba59eb80dc200f3e2544eda4ed6a90e76c",
}[chainId];

export const FACTORY_ADDRESS = {
	97:"0xB7926C0430Afb07AA7DEfDE6DA862aE0Bde767bc",
	56:"0xca143ce32fe78f1f7019d7d551a6402fc5350c73",//pancakeswap
}[chainId];
export const INIT_CODE_HASH = {
	97: "0xecba335299a6693cb2ebc4782e74669b84290b6378ea3a3873c7231a8d7d1074",
	56: "0x00fb7f630766e6a796048ea87d01acd3068e8ff67d078148a3fa3f4a84f69bd5 ",
}[chainId];

export const WETH_ADDRESS = {
	97:"0xae13d989dac2f0debff460ac112a837c89baa7cd",// WBNB Address
	56:"0xae13d989dac2f0debff460ac112a837c89baa7cd",// WBNB Address
}[chainId];
export const ETHNAME = 'BNB';// BNB Ticker