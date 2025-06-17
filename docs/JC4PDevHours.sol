// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IUSDC} from "./interfaces/IUSDC.sol";
import {Base64} from "solady/utils/Base64.sol";

/**
 * @title JC4PDevHours
 * @notice Evergreen ERC-1155 token for purchasing JC4P development hours with USDC
 * @dev Implements voucher-based discounts, weekly redemption caps, and 10% refund buffer
 */
contract JC4PDevHours is ERC1155, EIP712, Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    // Constants
    uint8 public constant TOKEN_ID = 0;
    uint16 public constant BUFFER_BPS = 1_000; // 10%
    string public constant TOKEN_NAME = "JC4P Dev Hours";
    uint256 public constant MIN_PRICE_PER_HOUR = 100 * 10**6; // 100 USDC minimum per hour
    
    // Metadata constants
    string public constant NFT_NAME = "JC4P Dev Hour";
    string public constant NFT_DESCRIPTION = "A token representing one hour of development time from JC4P. Redeemable for training, consulting, code reviews, pair programming, or custom development work.";
    string public constant NFT_IMAGE_URL = "https://images.kasra.codes/dev_hour_nft.png";
    
    // Voucher struct (no deadline for evergreen vouchers)
    struct Voucher {
        address buyer;
        uint256 qty;
        uint256 price;
        uint256 nonce;
        uint256 fid; // Farcaster ID
    }
    
    // Permit data for USDC
    struct PermitData {
        uint256 value;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }
    
    // Voucher typehash for EIP-712
    bytes32 public constant VOUCHER_TYPEHASH = 
        keccak256("Voucher(address buyer,uint256 qty,uint256 price,uint256 nonce,uint256 fid)");
    
    // Immutable
    IUSDC public immutable USDC;
    
    // State variables
    address public trustedSigner;
    uint256 public supplyCap;
    uint256 public sold;
    uint256 public weeklyCap;
    uint256 public weekStart;
    uint256 public redeemedThisWeek;
    
    // Mappings
    mapping(address => uint256) public nonces;
    mapping(address => uint256) public addressToFid; // Track FID for each address
    
    // Track total burned tokens
    uint256 private totalBurned;
    
    // Events
    event Redeemed(address indexed user, uint256 qty, string workCID, uint256 fid);
    event SupplyAdded(uint256 qty);
    event WeeklyCapUpdated(uint256 newCap);
    event TrustedSignerUpdated(address newSigner);
    event BufferSwept(uint256 amount);
    event BufferToppedUp(uint256 amount);
    event TokensPurchased(address indexed buyer, uint256 qty, uint256 price, uint256 fid);
    
    // Errors
    error InvalidSigner();
    error InvalidNonce();
    error SupplyCapExceeded();
    error WeeklyCapExceeded();
    error InvalidVoucher();
    error InvalidPermit();
    error InsufficientBalance();
    error BufferProtection();
    error ZeroAddress();
    error ZeroAmount();
    
    constructor(
        address _usdc,
        address _trustedSigner,
        uint256 _initialSupplyCap,
        uint256 _weeklyCap
    ) 
        ERC1155("") 
        EIP712("JC4PDevHours", "1")
        Ownable(msg.sender)
    {
        if (_usdc == address(0) || _trustedSigner == address(0)) revert ZeroAddress();
        
        USDC = IUSDC(_usdc);
        trustedSigner = _trustedSigner;
        supplyCap = _initialSupplyCap;
        weeklyCap = _weeklyCap;
        weekStart = block.timestamp;
    }
    
    /**
     * @notice Purchase dev hours with a signed voucher and USDC permit
     * @param v The signed voucher containing purchase details
     * @param vSig The signature of the voucher
     * @param p The permit data for USDC approval
     */
    function buyWithVoucherAndPermit(
        Voucher calldata v,
        bytes calldata vSig,
        PermitData calldata p
    ) external nonReentrant {
        // Validate voucher
        if (v.buyer != msg.sender) revert InvalidVoucher();
        if (v.qty == 0) revert ZeroAmount();
        if (v.price < v.qty * MIN_PRICE_PER_HOUR) revert InvalidVoucher(); // Minimum price validation
        if (nonces[msg.sender] != v.nonce) revert InvalidNonce();
        
        // Verify voucher signature
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
            VOUCHER_TYPEHASH,
            v.buyer,
            v.qty,
            v.price,
            v.nonce,
            v.fid
        )));
        
        // Use tryRecover to prevent signature malleability issues
        (address recovered, ECDSA.RecoverError error, ) = digest.tryRecover(vSig);
        if (error != ECDSA.RecoverError.NoError || recovered != trustedSigner) {
            revert InvalidSigner();
        }
        
        // Check supply cap
        if (sold + v.qty > supplyCap) revert SupplyCapExceeded();
        
        // Increment nonce to prevent replay
        nonces[msg.sender]++;
        
        // Verify permit value matches voucher price
        if (p.value != v.price) revert InvalidPermit();
        
        // Use USDC permit with try-catch to handle already-used permits gracefully
        try USDC.permit(msg.sender, address(this), p.value, p.deadline, p.v, p.r, p.s) {
            // Permit succeeded
        } catch {
            // Permit might have failed due to being already used, check allowance
            if (USDC.allowance(msg.sender, address(this)) < p.value) {
                revert InvalidPermit();
            }
            // If allowance is sufficient, continue (permit was already used)
        }
        
        // Calculate splits (90% to owner, 10% to buffer)
        uint256 ownerAmount = (v.price * 9_000) / 10_000;
        uint256 bufferAmount = v.price - ownerAmount;
        
        // Transfer USDC
        if (!USDC.transferFrom(msg.sender, owner(), ownerAmount)) revert InvalidPermit();
        if (!USDC.transferFrom(msg.sender, address(this), bufferAmount)) revert InvalidPermit();
        
        // Mint tokens
        sold += v.qty;
        _mint(msg.sender, TOKEN_ID, v.qty, "");
        
        // Store FID for this address
        addressToFid[msg.sender] = v.fid;
        
        emit TokensPurchased(msg.sender, v.qty, v.price, v.fid);
    }
    
    /**
     * @notice Redeem dev hours, subject to weekly cap
     * @param qty Number of hours to redeem
     * @param workCID Content identifier for the work request
     */
    function redeem(uint256 qty, string calldata workCID) external nonReentrant {
        if (qty == 0) revert ZeroAmount();
        if (balanceOf(msg.sender, TOKEN_ID) < qty) revert InsufficientBalance();
        
        // Roll week if necessary
        _rollWeek();
        
        // Check weekly cap
        if (redeemedThisWeek + qty > weeklyCap) revert WeeklyCapExceeded();
        
        // Update redeemed count
        redeemedThisWeek += qty;
        
        // Burn tokens
        _burn(msg.sender, TOKEN_ID, qty);
        totalBurned += qty;
        
        emit Redeemed(msg.sender, qty, workCID, addressToFid[msg.sender]);
    }
    
    /**
     * @notice Add supply for new drops (owner only)
     * @param qty Amount to add to supply cap
     */
    function addSupply(uint256 qty) external onlyOwner {
        if (qty == 0) revert ZeroAmount();
        supplyCap += qty;
        emit SupplyAdded(qty);
    }
    
    /**
     * @notice Update weekly redemption cap (owner only)
     * @param cap New weekly cap
     */
    function setWeeklyCap(uint256 cap) external onlyOwner {
        weeklyCap = cap;
        emit WeeklyCapUpdated(cap);
    }
    
    /**
     * @notice Update trusted signer for vouchers (owner only)
     * @param signer New trusted signer address
     */
    function setTrustedSigner(address signer) external onlyOwner {
        if (signer == address(0)) revert ZeroAddress();
        trustedSigner = signer;
        emit TrustedSignerUpdated(signer);
    }
    
    /**
     * @notice Withdraw excess buffer funds (owner only)
     * @param amount Amount to withdraw
     * @dev Maintains minimum 10% buffer based on outstanding liabilities
     */
    function sweepBuffer(uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        
        uint256 balance = USDC.balanceOf(address(this));
        uint256 totalOutstanding = sold - _totalBurned();
        uint256 requiredBuffer = (totalOutstanding * 300 * 10**6 * BUFFER_BPS) / 10_000;
        
        if (balance - amount < requiredBuffer) revert BufferProtection();
        
        if (!USDC.transfer(owner(), amount)) revert InvalidPermit();
        emit BufferSwept(amount);
    }
    
    /**
     * @notice Top up buffer after off-chain refunds (owner only)
     * @param amount Amount to add to buffer
     */
    function topUpBuffer(uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        if (!USDC.transferFrom(owner(), address(this), amount)) revert InvalidPermit();
        emit BufferToppedUp(amount);
    }
    
    /**
     * @notice Get current nonce for an address
     * @param buyer Address to check
     * @return Current nonce value
     */
    function getNonce(address buyer) external view returns (uint256) {
        return nonces[buyer];
    }
    
    /**
     * @notice Get remaining supply available for minting
     * @return Amount that can still be minted
     */
    function remainingSupply() external view returns (uint256) {
        return supplyCap > sold ? supplyCap - sold : 0;
    }
    
    /**
     * @notice Get remaining redemption capacity for current week
     * @return Hours that can still be redeemed this week
     */
    function remainingWeeklyCapacity() external view returns (uint256) {
        _checkWeekRoll();
        return weeklyCap > redeemedThisWeek ? weeklyCap - redeemedThisWeek : 0;
    }
    
    /**
     * @dev Internal function to check if week should roll (view function)
     */
    function _checkWeekRoll() internal view {
        if (block.timestamp >= weekStart + 7 days) {
            // Week would roll if this was a state-changing function
        }
    }
    
    /**
     * @dev Internal function to roll week if necessary
     */
    function _rollWeek() internal {
        if (block.timestamp >= weekStart + 7 days) {
            // Calculate how many weeks have passed and align to week boundaries
            uint256 weeksPassed = (block.timestamp - weekStart) / 7 days;
            weekStart = weekStart + (weeksPassed * 7 days);
            redeemedThisWeek = 0;
        }
    }
    
    /**
     * @dev Internal function to get total burned tokens
     */
    function _totalBurned() internal view returns (uint256) {
        return totalBurned;
    }
    
    /**
     * @notice Get the EIP-712 domain separator
     * @return The domain separator for this contract
     */
    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
    
    /**
     * @notice Returns the metadata URI for the token
     * @param tokenId The token ID (must be TOKEN_ID)
     * @return The base64-encoded JSON metadata
     */
    function uri(uint256 tokenId) public view virtual override returns (string memory) {
        require(tokenId == TOKEN_ID, "JC4PDevHours: Only TOKEN_ID 0 exists");
        
        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{',
                        '"name": "', NFT_NAME, '",',
                        '"description": "', NFT_DESCRIPTION, '",',
                        '"image": "', NFT_IMAGE_URL, '"',
                        '}'
                    )
                )
            )
        );
        
        return string(abi.encodePacked("data:application/json;base64,", json));
    }
}