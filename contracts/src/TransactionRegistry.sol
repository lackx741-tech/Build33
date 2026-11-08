// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AccessControl.sol";
import "./UserAuthorization.sol";

/**
 * @title TransactionRegistry
 * @notice Records application-level transaction metadata and emits an event for
 *         every record. The backend's transaction monitor listens for
 *         `TransactionRecorded` and correlates it with the on-chain receipt.
 *
 *         Only accounts holding RECORDER_ROLE may write; authorization is
 *         additionally checked against the UserAuthorization contract.
 */
contract TransactionRegistry is AccessControl {
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");

    enum TxStatus { PENDING, CONFIRMED, FAILED }

    struct Record {
        address account;
        bytes32 operation;
        uint256 value;
        TxStatus status;
        bytes32 refId;
        uint256 createdAt;
        uint256 updatedAt;
        bool exists;
    }

    UserAuthorization public immutable authorization;

    mapping(bytes32 => Record) private _records;
    bytes32[] private _refIds;
    uint256 public totalRecorded;

    event TransactionRecorded(
        bytes32 indexed refId,
        address indexed account,
        bytes32 indexed operation,
        uint256 value,
        TxStatus status
    );
    event TransactionStatusChanged(bytes32 indexed refId, TxStatus status);

    constructor(address authorizationContract) {
        require(authorizationContract != address(0), "TxRegistry: zero auth");
        authorization = UserAuthorization(authorizationContract);
    }

    modifier onlyAuthorizedAccount(address account) {
        require(authorization.isAuthorized(account), "TxRegistry: account not authorized");
        _;
    }

    function record(
        bytes32 refId,
        address account,
        bytes32 operation,
        uint256 value
    ) external onlyRole(RECORDER_ROLE) onlyAuthorizedAccount(account) {
        require(!_records[refId].exists, "TxRegistry: reference exists");
        _records[refId] = Record(account, operation, value, TxStatus.PENDING, refId, block.timestamp, block.timestamp, true);
        _refIds.push(refId);
        totalRecorded += 1;
        emit TransactionRecorded(refId, account, operation, value, TxStatus.PENDING);
    }

    function setStatus(bytes32 refId, TxStatus status) external onlyRole(RECORDER_ROLE) {
        Record storage r = _records[refId];
        require(r.exists, "TxRegistry: unknown reference");
        require(r.status == TxStatus.PENDING, "TxRegistry: already finalized");
        r.status = status;
        r.updatedAt = block.timestamp;
        emit TransactionStatusChanged(refId, status);
    }

    function get(bytes32 refId)
        external
        view
        returns (address account, bytes32 operation, uint256 value, TxStatus status, uint256 createdAt)
    {
        Record storage r = _records[refId];
        require(r.exists, "TxRegistry: unknown reference");
        return (r.account, r.operation, r.value, r.status, r.createdAt);
    }

    function count() external view returns (uint256) {
        return _refIds.length;
    }

    function refIdAt(uint256 index) external view returns (bytes32) {
        return _refIds[index];
    }
}
