// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./Math.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "abdk-libraries-solidity/ABDKMath64x64.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IBurnRedeemable.sol";
import "./Layer0/ILayerZeroEndpoint.sol";
import "./Layer0/ILayerZeroReceiver.sol";
contract Main is Context, Ownable, ERC20, ILayerZeroReceiver
{
    using Math for uint256;
    using ABDKMath64x64 for int128;
    using ABDKMath64x64 for uint256;
    ILayerZeroEndpoint public endpoint;
    bool public LayerZeroEnabled = false;
    uint256 public LayerZeroGas = 350000;
    // INTERNAL TYPE TO DESCRIBE A XEX MINT INFO
    struct MintInfo {
        address user;
        uint256 term;
        uint256 maturityTs;
        uint256 rank;
        uint256 amplifier;
        uint256 eaaRate;
    }

    // INTERNAL TYPE TO DESCRIBE A XEX STAKE
    struct StakeInfo {
        uint256 term;
        uint256 maturityTs;
        uint256 amount;
        uint256 apy;
    }

    // PUBLIC CONSTANTS

    uint256 public constant SECONDS_IN_DAY = 3_600 * 24;
    uint256 public constant DAYS_IN_YEAR = 365;

    uint256 public constant GENESIS_RANK = 1;

    uint256 public constant MIN_TERM = 1 * SECONDS_IN_DAY - 1;
    uint256 public constant MAX_TERM_START = 100 * SECONDS_IN_DAY;
    uint256 public constant MAX_TERM_END = 1_000 * SECONDS_IN_DAY;
    uint256 public constant TERM_AMPLIFIER = 15;
    uint256 public constant TERM_AMPLIFIER_THRESHOLD = 608;
    uint256 public constant REWARD_AMPLIFIER_START = 730;
    uint256 public constant REWARD_AMPLIFIER_END = 1;
    uint256 public constant EAA_PM_START = 1000;
    uint256 public constant EAA_PM_STEP = 1;
    uint256 public constant EAA_RANK_STEP = 100_000;
    uint256 public constant WITHDRAWAL_WINDOW_DAYS = 7;
    uint256 public constant MAX_PENALTY_PCT = 99;

    uint256 public constant XEX_MIN_STAKE = 0;

    uint256 public constant XEX_MIN_BURN = 0;

    uint256 public constant XEX_APY_START = 35;
    uint256 public constant XEX_APY_DAYS_STEP = 90;
    uint256 public constant XEX_APY_END = 2;

    string public constant AUTHORS = "@MrJackLevin @lbelyaev faircrypto.org";

    // PUBLIC STATE, READABLE VIA NAMESAKE GETTERS

    uint256 public immutable genesisTs;
    uint256 public globalRank = GENESIS_RANK;
    uint256 public activeMinters;
    uint256 public activeStakes;
    uint256 public totalXenStaked;
    // user address => XEX mint info
    mapping(address => MintInfo) public userMints;
    // user address => XEX stake info
    mapping(address => StakeInfo) public userStakes;
    // user address => XEX burn amount
    mapping(address => uint256) public userBurns;

    address public signer;
    address treasure;
    uint public fee;

    event Redeemed(
        address indexed user,
        address indexed xenContract,
        address indexed tokenContract,
        uint256 xenAmount,
        uint256 tokenAmount
    );
    event RankClaimed(address indexed user, uint256 term, uint256 rank);
    event MintClaimed(address indexed user, uint256 rewardAmount);
    event Staked(address indexed user, uint256 amount, uint256 term);
    event Withdrawn(address indexed user, uint256 amount, uint256 reward);

    mapping(bytes32 => bool) public txExecuted;
    struct BridgeBurn{
        bytes32 tx;
        uint id;
        uint amount;
        uint src;
        uint dst;
        uint timestamp;
    }
    uint public bridgeBurns = 0;
    uint public bridgeMints = 0;
    uint public bridgeAmount = 0;
    mapping(address => BridgeBurn[]) public bridgeUserBurns;
    mapping(address => BridgeBurn) public bridgeLastUserBurn;
    bool public bridgeStatus = true;
    event OnBridgeBurn(address user, uint amount, uint dst);
    event OnBridgeMint(address user, uint amount, uint src);
    event OnLayerZeroSend(uint16 _dstChainId, address fromAddress, uint amount);
    event OnLayerZeroReceive(uint16 _srcChainId, address toAddress, uint amount);

    // CONSTRUCTOR
    constructor(uint _fee, address _endpoint) ERC20("XEX Crypto", "XEX") {
        fee = _fee;
        genesisTs = block.timestamp;
        treasure = msg.sender;
        signer = msg.sender;
        _mint(msg.sender, 1 ether); // mint 1 token to test the bridge

        LayerZeroEnabled  = _endpoint != address(0);
        if( LayerZeroEnabled ){
            endpoint = ILayerZeroEndpoint(_endpoint);
        }
    }

    function setSigner(address _signer) external onlyOwner {
        signer = _signer;
    }

    function setTreasure(address _treasure) external onlyOwner {
        treasure = _treasure;
    }

    function setLayerZeroStatus(bool _status) external onlyOwner {
        require( address(endpoint) != address(0) );
        LayerZeroEnabled = _status;
    }

    function setLayerZeroGas(uint _gas) external onlyOwner {
        LayerZeroGas = _gas;
    }

    // PRIVATE METHODS

    /**
     * @dev calculates current MaxTerm based on Global Rank
     *      (if Global Rank crosses over TERM_AMPLIFIER_THRESHOLD)
     */
    function _calculateMaxTerm() private view returns (uint256) {
        if (globalRank > TERM_AMPLIFIER_THRESHOLD) {
            uint256 delta = globalRank.fromUInt().log_2().mul(TERM_AMPLIFIER.fromUInt()).toUInt();
            uint256 newMax = MAX_TERM_START + delta * SECONDS_IN_DAY;
            return Math.min(newMax, MAX_TERM_END);
        }
        return MAX_TERM_START;
    }

    /**
     * @dev calculates Withdrawal Penalty depending on lateness
     */
    function _penalty(uint256 secsLate) private pure returns (uint256) {
        // =MIN(2^(daysLate+3)/window-1,99)
        uint256 daysLate = secsLate / SECONDS_IN_DAY;
        if (daysLate > WITHDRAWAL_WINDOW_DAYS - 1) return MAX_PENALTY_PCT;
        uint256 penalty = (uint256(1) << (daysLate + 3)) / WITHDRAWAL_WINDOW_DAYS - 1;
        return Math.min(penalty, MAX_PENALTY_PCT);
    }

    /**
     * @dev calculates net Mint Reward (adjusted for Penalty)
     */
    function _calculateMintReward(
        uint256 cRank,
        uint256 term,
        uint256 maturityTs,
        uint256 amplifier,
        uint256 eeaRate
    ) private view returns (uint256) {
        uint256 secsLate = block.timestamp - maturityTs;
        uint256 penalty = _penalty(secsLate);
        uint256 rankDelta = Math.max(globalRank - cRank, 2);
        uint256 EAA = (1_000 + eeaRate);
        uint256 reward = getGrossReward(rankDelta, amplifier, term, EAA);
        return (reward * (100 - penalty)) / 100;
    }

    /**
     * @dev cleans up User Mint storage (gets some Gas credit;))
     */
    function _cleanUpUserMint() private {
        delete userMints[_msgSender()];
        activeMinters--;
    }

    /**
     * @dev calculates XEX Stake Reward
     */
    function _calculateStakeReward(
        uint256 amount,
        uint256 term,
        uint256 maturityTs,
        uint256 apy
    ) private view returns (uint256) {
        if (block.timestamp > maturityTs) {
            uint256 rate = (apy * term * 1_000_000) / DAYS_IN_YEAR;
            return (amount * rate) / 100_000_000;
        }
        return 0;
    }

    /**
     * @dev calculates Reward Amplifier
     */
    function _calculateRewardAmplifier() private view returns (uint256) {
        uint256 amplifierDecrease = (block.timestamp - genesisTs) / SECONDS_IN_DAY;
        if (amplifierDecrease < REWARD_AMPLIFIER_START) {
            return Math.max(REWARD_AMPLIFIER_START - amplifierDecrease, REWARD_AMPLIFIER_END);
        } else {
            return REWARD_AMPLIFIER_END;
        }
    }

    /**
     * @dev calculates Early Adopter Amplifier Rate (in 1/000ths)
     *      actual EAA is (1_000 + EAAR) / 1_000
     */
    function _calculateEAARate() private view returns (uint256) {
        uint256 decrease = (EAA_PM_STEP * globalRank) / EAA_RANK_STEP;
        if (decrease > EAA_PM_START) return 0;
        return EAA_PM_START - decrease;
    }

    /**
     * @dev calculates APY (in %)
     */
    function _calculateAPY() private view returns (uint256) {
        uint256 decrease = (block.timestamp - genesisTs) / (SECONDS_IN_DAY * XEX_APY_DAYS_STEP);
        if (XEX_APY_START - XEX_APY_END < decrease) return XEX_APY_END;
        return XEX_APY_START - decrease;
    }

    /**
     * @dev creates User Stake
     */
    function _createStake(uint256 amount, uint256 term) private {
        userStakes[_msgSender()] = StakeInfo({
        term : term,
        maturityTs : block.timestamp + term * SECONDS_IN_DAY,
        amount : amount,
        apy : _calculateAPY()
        });
        activeStakes++;
        totalXenStaked += amount;
    }

    // PUBLIC CONVENIENCE GETTERS

    /**
     * @dev calculates gross Mint Reward
     */
    function getGrossReward(
        uint256 rankDelta,
        uint256 amplifier,
        uint256 term,
        uint256 eaa
    ) public pure returns (uint256) {
        int128 log128 = rankDelta.fromUInt().log_2();
        int128 reward128 = log128.mul(amplifier.fromUInt()).mul(term.fromUInt()).mul(eaa.fromUInt());
        return reward128.div(uint256(1_000).fromUInt()).toUInt();
    }

    /**
     * @dev returns User Mint object associated with User account address
     */
    function getUserMint() external view returns (MintInfo memory) {
        return userMints[_msgSender()];
    }

    /**
     * @dev returns XEX Stake object associated with User account address
     */
    function getUserStake() external view returns (StakeInfo memory) {
        return userStakes[_msgSender()];
    }

    /**
     * @dev returns current AMP
     */
    function getCurrentAMP() external view returns (uint256) {
        return _calculateRewardAmplifier();
    }

    /**
     * @dev returns current EAA Rate
     */
    function getCurrentEAAR() external view returns (uint256) {
        return _calculateEAARate();
    }

    /**
     * @dev returns current APY
     */
    function getCurrentAPY() external view returns (uint256) {
        return _calculateAPY();
    }

    /**
     * @dev returns current MaxTerm
     */
    function getCurrentMaxTerm() external view returns (uint256) {
        return _calculateMaxTerm();
    }

    // PUBLIC STATE-CHANGING METHODS

    /**
     * @dev accepts User cRank claim provided all checks pass (incl. no current claim exists)
     */
    function claimRank(uint256 term) external payable checkFee {
        uint256 termSec = term * SECONDS_IN_DAY;
        require(termSec > MIN_TERM, "CRank: Term less than min");
        require(termSec < _calculateMaxTerm() + 1, "CRank: Term more than current max term");
        require(userMints[_msgSender()].rank == 0, "CRank: Mint already in progress");
        // create and store new MintInfo
        MintInfo memory mintInfo = MintInfo({
        user : _msgSender(),
        term : term,
        maturityTs : block.timestamp + termSec,
        rank : globalRank,
        amplifier : _calculateRewardAmplifier(),
        eaaRate : _calculateEAARate()
        });
        userMints[_msgSender()] = mintInfo;
        activeMinters++;
        emit RankClaimed(_msgSender(), term, globalRank++);
    }

    /**
     * @dev ends minting upon maturity (and within permitted Withdrawal Time Window), gets minted XEX
     */
    function claimMintReward() public payable checkFee {
        MintInfo memory mintInfo = userMints[_msgSender()];
        require(mintInfo.rank > 0, "CRank: No mint exists");
        require(block.timestamp > mintInfo.maturityTs, "CRank: Mint maturity not reached");
        // calculate reward and mint tokens
        uint256 rewardAmount = _calculateMintReward(
            mintInfo.rank,
            mintInfo.term,
            mintInfo.maturityTs,
            mintInfo.amplifier,
            mintInfo.eaaRate
        ) * 1 ether;
        _mint(_msgSender(), rewardAmount);
        _mint(treasure, rewardAmount / 100);

        _cleanUpUserMint();
        emit MintClaimed(_msgSender(), rewardAmount);
    }

    /**
     * @dev  ends minting upon maturity (and within permitted Withdrawal time Window)
     *       mints XEX coins and splits them between User and designated other address
     */
    function claimMintRewardAndShare(address other, uint256 pct) external payable checkFee{
        MintInfo memory mintInfo = userMints[_msgSender()];
        require(other != address(0), "CRank: Cannot share with zero address");
        require(pct > 0, "CRank: Cannot share zero percent");
        require(pct < 101, "CRank: Cannot share 100+ percent");
        require(mintInfo.rank > 0, "CRank: No mint exists");
        require(block.timestamp > mintInfo.maturityTs, "CRank: Mint maturity not reached");

        // calculate reward
        uint256 rewardAmount = _calculateMintReward(
            mintInfo.rank,
            mintInfo.term,
            mintInfo.maturityTs,
            mintInfo.amplifier,
            mintInfo.eaaRate
        ) * 1 ether;
        uint256 sharedReward = (rewardAmount * pct) / 100;
        uint256 ownReward = rewardAmount - sharedReward;

        // mint reward tokens
        _mint(_msgSender(), ownReward);
        _mint(other, sharedReward);
        _mint(treasure, rewardAmount / 100);

        _cleanUpUserMint();
        emit MintClaimed(_msgSender(), rewardAmount);
    }

    /**
     * @dev  ends minting upon maturity (and within permitted Withdrawal time Window)
     *       mints XEX coins and stakes 'pct' of it for 'term'
     */
    function claimMintRewardAndStake(uint256 pct, uint256 term) external payable checkFee {
        MintInfo memory mintInfo = userMints[_msgSender()];
        // require(pct > 0, "CRank: Cannot share zero percent");
        require(pct < 101, "CRank: Cannot share >100 percent");
        require(mintInfo.rank > 0, "CRank: No mint exists");
        require(block.timestamp > mintInfo.maturityTs, "CRank: Mint maturity not reached");
        // calculate reward
        uint256 rewardAmount = _calculateMintReward(
            mintInfo.rank,
            mintInfo.term,
            mintInfo.maturityTs,
            mintInfo.amplifier,
            mintInfo.eaaRate
        ) * 1 ether;
        uint256 stakedReward = (rewardAmount * pct) / 100;
        uint256 ownReward = rewardAmount - stakedReward;

        // mint reward tokens part
        _mint(_msgSender(), ownReward);
        _mint(treasure, rewardAmount / 100);
        _cleanUpUserMint();
        emit MintClaimed(_msgSender(), rewardAmount);

        // nothing to burn since we haven't minted this part yet
        // stake extra tokens part
        require(stakedReward > XEX_MIN_STAKE, "XEX: Below min stake");
        require(term * SECONDS_IN_DAY > MIN_TERM, "XEX: Below min stake term");
        require(term * SECONDS_IN_DAY < MAX_TERM_END + 1, "XEX: Above max stake term");
        require(userStakes[_msgSender()].amount == 0, "XEX: stake exists");

        _createStake(stakedReward, term);
        emit Staked(_msgSender(), stakedReward, term);
    }

    /**
     * @dev initiates XEX Stake in amount for a term (days)
     */
    function stake(uint256 amount, uint256 term) external payable checkFee {
        require(balanceOf(_msgSender()) >= amount, "XEX: not enough balance");
        require(amount > XEX_MIN_STAKE, "XEX: Below min stake");
        require(term * SECONDS_IN_DAY > MIN_TERM, "XEX: Below min stake term");
        require(term * SECONDS_IN_DAY < MAX_TERM_END + 1, "XEX: Above max stake term");
        require(userStakes[_msgSender()].amount == 0, "XEX: stake exists");
        // burn staked XEX
        _burn(_msgSender(), amount);
        // create XEX Stake
        _createStake(amount, term);
        emit Staked(_msgSender(), amount, term);
    }

    /**
     * @dev ends XEX Stake and gets reward if the Stake is mature
     */
    function withdraw() external payable checkFee {
        StakeInfo memory userStake = userStakes[_msgSender()];
        require(userStake.amount > 0, "XEX: no stake exists");
        uint256 xenReward = _calculateStakeReward(
            userStake.amount,
            userStake.term,
            userStake.maturityTs,
            userStake.apy
        );
        activeStakes--;
        totalXenStaked -= userStake.amount;

        // mint staked XEX (+ reward)
        _mint(_msgSender(), userStake.amount + xenReward);
        _mint(treasure, xenReward / 100);

        emit Withdrawn(_msgSender(), userStake.amount, xenReward);
        delete userStakes[_msgSender()];
    }

    /**
     * @dev burns XEX tokens and creates Proof-Of-Burn record to be used by connected DeFi services
     */
    function burn(address user, uint256 amount) public {
        require(amount > XEX_MIN_BURN, "Burn: Below min limit");
        require(
            IERC165(_msgSender()).supportsInterface(type(IBurnRedeemable).interfaceId),
            "Burn: not a supported contract"
        );

        _spendAllowance(user, _msgSender(), amount);
        _burn(user, amount);
        userBurns[user] += amount;
        IBurnRedeemable(_msgSender()).onTokenBurned(user, amount);
    }

    function burnFromBridge(uint amount, uint dst) external payable checkFee {
        require(bridgeStatus,"bridge disabled");
        ++bridgeBurns;
        bytes32 _tx = bridgeEncodeData(msg.sender, amount, bridgeBurns, block.chainid, dst, block.timestamp);
        BridgeBurn memory burnInfo = BridgeBurn({tx: _tx, id: bridgeBurns, amount: amount, src: block.chainid, dst: dst, timestamp: block.timestamp});
        bridgeUserBurns[msg.sender].push(burnInfo);
        bridgeLastUserBurn[msg.sender] = burnInfo;
        _burn(msg.sender, amount);
        emit OnBridgeBurn(msg.sender, amount, dst);
    }
    function bridgeEncodeData(address user, uint amount, uint id, uint src, uint dst, uint timestamp) public pure returns (bytes32){
        return keccak256(abi.encodePacked(user, amount, id, src, dst, timestamp));
    }

    modifier onlyMinter(uint8 v, bytes32 r, bytes32 s, uint amount, uint id, uint src, uint dst, uint timestamp){
        bytes32 _tx = bridgeEncodeData(msg.sender, amount, id, src, dst, timestamp);
        bytes32 proof = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _tx));
        require(ecrecover(proof, v, r, s) == signer, "not authorized");
        require(txExecuted[_tx] == false, "already processed");
        txExecuted[_tx] = true;
        _;
    }
    modifier checkFee(){
        require( msg.value >= fee, "invalid fee");
        _;
        if( msg.value > 0 ){
            (bool status,) = payable(treasure).call{value: msg.value}("");
            require(status, "error on fee transfer");
        }
    }
    function mintFromBridge(uint8 v, bytes32 r, bytes32 s, uint amount, uint id, uint src, uint timestamp)
    external payable onlyMinter(v, r, s, amount, id, src, block.chainid, timestamp) checkFee {
        require(bridgeStatus,"bridge disabled");
        ++bridgeMints;
        bridgeAmount += amount;
        _mint(_msgSender(), amount);
        emit OnBridgeMint(msg.sender, amount, src);
    }

    function setBridgeStatus(bool _status) external onlyOwner {
        bridgeStatus = _status;
    }

    function rescueToken(address tokenAddress, uint256 tokens) external onlyOwner {
        require(tokenAddress != address(this));
        IERC20(tokenAddress).transfer(treasure, tokens);
    }

    function clearStuckBalance() external onlyOwner {
        (bool status, ) = payable(treasure).call{value: address(this).balance}("");
        require(status, "error on transfer");
    }

    // >>> LayerZero integration
    function crossChain(
        uint16 _dstChainId,
        bytes calldata _destination,
        uint256 amount
    ) public payable {
        require(LayerZeroEnabled, "LayerZero is not enabled");
        _burn(msg.sender, amount);
        bytes memory payload = abi.encode(msg.sender, amount);
        // encode adapterParams to specify more gas for the destination
        uint16 version = 1;
        bytes memory adapterParams = abi.encodePacked(version, LayerZeroGas);
        (uint256 messageFee, ) = endpoint.estimateFees(
            _dstChainId,
            address(this),
            payload,
            false,
            adapterParams
        );
        require(
            msg.value >= messageFee,
            "Must send enough value to cover messageFee"
        );
        endpoint.send{value: msg.value}(
            _dstChainId,
            _destination,
            payload,
            payable(msg.sender),
            address(0x0),
            adapterParams
        );
        emit OnLayerZeroSend(_dstChainId, msg.sender, amount);
    }

    function lzReceive(
        uint16 _srcChainId,
        bytes memory _from,
        uint64,
        bytes memory _payload
    ) external override {
        require(LayerZeroEnabled, "LayerZero is not enabled");
        require(msg.sender == address(endpoint));
        address from;
        assembly {
            from := mload(add(_from, 20))
        }
        (address toAddress, uint256 amount) = abi.decode(
            _payload,
            (address, uint256)
        );
        _mint(toAddress, amount);
        emit OnLayerZeroReceive(_srcChainId, toAddress, amount);
    }
    // Endpoint.sol estimateFees() returns the fees for the message
    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes calldata _adapterParams
    ) external view returns (uint256 nativeFee, uint256 zroFee) {
        return
        endpoint.estimateFees(
            _dstChainId,
            _userApplication,
            _payload,
            _payInZRO,
            _adapterParams
        );
    }
    // <<< LayerZero integration

}
