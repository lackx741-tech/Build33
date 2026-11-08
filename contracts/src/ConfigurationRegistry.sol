// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AccessControl.sol";

/**
 * @title ConfigurationRegistry
 * @notice Stores typed application configuration values that the backend reads
 *         at startup. Only accounts holding CONFIG_ROLE may mutate entries.
 */
contract ConfigurationRegistry is AccessControl {
    bytes32 public constant CONFIG_ROLE = keccak256("CONFIG_ROLE");

    /// @notice Upper bound on stored string length, to keep writes bounded.
    uint256 public constant MAX_STRING_LENGTH = 512;

    enum ValueType { UINT, ADDRESS, BOOL, STRING }

    struct Entry {
        ValueType valueType;
        uint256 uintValue;
        address addressValue;
        bool boolValue;
        string stringValue;
        uint256 updatedAt;
        bool exists;
    }

    mapping(bytes32 => Entry) private _entries;
    bytes32[] private _keys;

    event ConfigurationSet(bytes32 indexed key, ValueType valueType, uint256 updatedAt);
    event ConfigurationCleared(bytes32 indexed key);

    function setUint(bytes32 key, uint256 value) external onlyRole(CONFIG_ROLE) {
        _store(key, ValueType.UINT, value, address(0), false, "");
    }

    function setAddress(bytes32 key, address value) external onlyRole(CONFIG_ROLE) {
        require(value != address(0), "Config: zero address");
        _store(key, ValueType.ADDRESS, 0, value, false, "");
    }

    function setBool(bytes32 key, bool value) external onlyRole(CONFIG_ROLE) {
        _store(key, ValueType.BOOL, 0, address(0), value, "");
    }

    function setString(bytes32 key, string calldata value) external onlyRole(CONFIG_ROLE) {
        require(bytes(value).length <= MAX_STRING_LENGTH, "Config: string too long");
        _store(key, ValueType.STRING, 0, address(0), false, value);
    }

    function _store(
        bytes32 key,
        ValueType valueType,
        uint256 uintValue,
        address addressValue,
        bool boolValue,
        string memory stringValue
    ) private {
        if (!_entries[key].exists) _keys.push(key);
        _entries[key] = Entry(valueType, uintValue, addressValue, boolValue, stringValue, block.timestamp, true);
        emit ConfigurationSet(key, valueType, block.timestamp);
    }

    function clear(bytes32 key) external onlyRole(CONFIG_ROLE) {
        require(_entries[key].exists, "Config: unknown key");
        delete _entries[key];
        for (uint256 i = 0; i < _keys.length; i++) {
            if (_keys[i] == key) {
                _keys[i] = _keys[_keys.length - 1];
                _keys.pop();
                break;
            }
        }
        emit ConfigurationCleared(key);
    }

    function getUint(bytes32 key) external view returns (uint256) {
        Entry storage e = _entries[key];
        require(e.exists && e.valueType == ValueType.UINT, "Config: not a uint");
        return e.uintValue;
    }

    function getAddress(bytes32 key) external view returns (address) {
        Entry storage e = _entries[key];
        require(e.exists && e.valueType == ValueType.ADDRESS, "Config: not an address");
        return e.addressValue;
    }

    function getBool(bytes32 key) external view returns (bool) {
        Entry storage e = _entries[key];
        require(e.exists && e.valueType == ValueType.BOOL, "Config: not a bool");
        return e.boolValue;
    }

    function getString(bytes32 key) external view returns (string memory) {
        Entry storage e = _entries[key];
        require(e.exists && e.valueType == ValueType.STRING, "Config: not a string");
        return e.stringValue;
    }

    function exists(bytes32 key) external view returns (bool) {
        return _entries[key].exists;
    }

    function keys() external view returns (bytes32[] memory) {
        return _keys;
    }
}
