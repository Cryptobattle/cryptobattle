export const factoryAbi = [
  {
    type: "function",
    name: "token",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "core",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "operatorRegistry",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "predict",
    stateMutability: "view",
    inputs: [{
      name: "key",
      type: "tuple",
      components: [
        { name: "assetA", type: "uint16" },
        { name: "assetB", type: "uint16" },
        { name: "duration", type: "uint32" },
        { name: "sideB", type: "bool" },
        { name: "beneficiary", type: "address" },
        { name: "operator", type: "address" },
      ],
    }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "deploy",
    stateMutability: "nonpayable",
    inputs: [{
      name: "key",
      type: "tuple",
      components: [
        { name: "assetA", type: "uint16" },
        { name: "assetB", type: "uint16" },
        { name: "duration", type: "uint32" },
        { name: "sideB", type: "bool" },
        { name: "beneficiary", type: "address" },
        { name: "operator", type: "address" },
      ],
    }],
    outputs: [{ name: "proxy", type: "address" }],
  },
  {
    type: "function",
    name: "predictPersonal",
    stateMutability: "view",
    inputs: [{
      name: "key",
      type: "tuple",
      components: [
        { name: "assetA", type: "uint16" }, { name: "assetB", type: "uint16" },
        { name: "duration", type: "uint32" }, { name: "sideB", type: "bool" },
        { name: "beneficiary", type: "address" }, { name: "operator", type: "address" },
      ],
    }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "deployPersonal",
    stateMutability: "nonpayable",
    inputs: [{
      name: "key",
      type: "tuple",
      components: [
        { name: "assetA", type: "uint16" }, { name: "assetB", type: "uint16" },
        { name: "duration", type: "uint32" }, { name: "sideB", type: "bool" },
        { name: "beneficiary", type: "address" }, { name: "operator", type: "address" },
      ],
    }],
    outputs: [{ name: "proxy", type: "address" }],
  },
] as const;

export const keeperTreasuryAbi = [
  { type: "function", name: "isOperatorActive", stateMutability: "view", inputs: [{ name: "operator", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "activationFee", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "activateOperator", stateMutability: "payable", inputs: [], outputs: [] },
] as const;

export const coreAbi = [
  { type: "event", name: "DepositRecorded", inputs: [
    { name: "id", type: "bytes32", indexed: true }, { name: "start", type: "uint64", indexed: true },
    { name: "beneficiary", type: "address", indexed: true }, { name: "sideB", type: "bool", indexed: false },
    { name: "index", type: "uint256", indexed: false }, { name: "operator", type: "address", indexed: false },
    { name: "amount", type: "uint128", indexed: false },
  ] },
  { type: "function", name: "FEE_BPS", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint16" }] },
  { type: "function", name: "minDeposit", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "minDepositFloor", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "assetRegistry", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "supportedAsset", stateMutability: "view", inputs: [{ name: "asset", type: "uint16" }], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "claimable", stateMutability: "view", inputs: [{ name: "beneficiary", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "claim", stateMutability: "nonpayable", inputs: [{ name: "recipient", type: "address" }], outputs: [] },
  { type: "function", name: "operatorFees", stateMutability: "view", inputs: [{ name: "operator", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "claimOperatorFee", stateMutability: "nonpayable", inputs: [{ name: "recipient", type: "address" }], outputs: [] },
  { type: "function", name: "marketId", stateMutability: "pure", inputs: [{ name: "a", type: "uint16" }, { name: "b", type: "uint16" }, { name: "duration", type: "uint32" }], outputs: [{ name: "", type: "bytes32" }] },
  { type: "function", name: "roundStart", stateMutability: "pure", inputs: [{ name: "duration", type: "uint32" }, { name: "timestamp", type: "uint256" }], outputs: [{ name: "", type: "uint64" }] },
  { type: "function", name: "entryWindow", stateMutability: "pure", inputs: [{ name: "duration", type: "uint32" }], outputs: [{ name: "", type: "uint32" }] },
  { type: "function", name: "roundTotals", stateMutability: "view", inputs: [{ name: "id", type: "bytes32" }, { name: "start", type: "uint64" }], outputs: [{ name: "totalA", type: "uint128" }, { name: "totalB", type: "uint128" }, { name: "matchedPerSide", type: "uint128" }] },
] as const;

export const assetRegistryAbi = [
  { type: "function", name: "allAssets", stateMutability: "view", inputs: [], outputs: [{ name: "symbols", type: "bytes32[]" }, { name: "enabled", type: "bool[]" }] },
] as const;

export const erc20Abi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
] as const;

export const proxyAbi = [
  { type: "function", name: "process", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "refundDust", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

export const swapDistributorAbi = [
  { type: "function", name: "token", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "claimable", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "claim", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;
