// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title UserAuthorization
 * @notice Tracks which wallet addresses are authorized to use the application.
 *         Authorization can be self-service (a user signs up) or operator
 *         driven, and expires at a caller-supplied timestamp.
 */
contract UserAuthorization {
    struct Authorization {
        bool active;
        uint64 grantedAt;
        uint64 expiresAt;
        bytes32 tier;
    }

    mapping(address => Authorization) private _authorizations;

    address public operator;
    bytes32 public constant TIER_DEFAULT = keccak256("TIER_DEFAULT");

    event OperatorChanged(address indexed previousOperator, address indexed newOperator);
    event Authorized(address indexed account, bytes32 tier, uint64 expiresAt);
    event Deauthorized(address indexed account);
    event TierChanged(address indexed account, bytes32 tier);

    modifier onlyOperator() {
        require(msg.sender == operator, "UserAuth: not operator");
        _;
    }

    constructor() {
        operator = msg.sender;
    }

    function setOperator(address newOperator) external onlyOperator {
        require(newOperator != address(0), "UserAuth: zero address");
        emit OperatorChanged(operator, newOperator);
        operator = newOperator;
    }

    /** Self-service authorization: the caller authorizes their own address. */
    function authorizeSelf(uint64 expiresAt) external {
        _authorize(msg.sender, TIER_DEFAULT, expiresAt);
    }

    function authorize(address account, bytes32 tier, uint64 expiresAt) external onlyOperator {
        _authorize(account, tier, expiresAt);
    }

    function _authorize(address account, bytes32 tier, uint64 expiresAt) private {
        require(account != address(0), "UserAuth: zero address");
        require(expiresAt == 0 || expiresAt > block.timestamp, "UserAuth: expiry in past");
        _authorizations[account] = Authorization(true, uint64(block.timestamp), expiresAt, tier);
        emit Authorized(account, tier, expiresAt);
    }

    function deauthorize(address account) external onlyOperator {
        require(_authorizations[account].active, "UserAuth: not active");
        delete _authorizations[account];
        emit Deauthorized(account);
    }

    function setTier(address account, bytes32 tier) external onlyOperator {
        require(_authorizations[account].active, "UserAuth: not active");
        _authorizations[account].tier = tier;
        emit TierChanged(account, tier);
    }

    function isAuthorized(address account) public view returns (bool) {
        Authorization memory a = _authorizations[account];
        if (!a.active) return false;
        if (a.expiresAt != 0 && a.expiresAt <= block.timestamp) return false;
        return true;
    }

    function tierOf(address account) external view returns (bytes32) {
        return _authorizations[account].tier;
    }
}
