// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AccessControl.sol";

/**
 * @title PermissionRegistry
 * @notice Maps named application permissions to accounts. Other contracts and
 *         the backend use `hasPermission` to gate behaviour. Only the
 *         PERMISSION_ADMIN_ROLE may grant or revoke.
 */
contract PermissionRegistry is AccessControl {
    bytes32 public constant PERMISSION_ADMIN_ROLE = keccak256("PERMISSION_ADMIN_ROLE");

    mapping(bytes32 => mapping(address => bool)) private _permissions;
    mapping(bytes32 => bool) private _knownPermissions;

    event PermissionDefined(bytes32 indexed permission);
    event PermissionGranted(bytes32 indexed permission, address indexed account);
    event PermissionRevoked(bytes32 indexed permission, address indexed account);

    function definePermission(bytes32 permission) external onlyRole(PERMISSION_ADMIN_ROLE) {
        require(permission != bytes32(0), "Permissions: empty id");
        require(!_knownPermissions[permission], "Permissions: already defined");
        _knownPermissions[permission] = true;
        emit PermissionDefined(permission);
    }

    function grant(bytes32 permission, address account) external onlyRole(PERMISSION_ADMIN_ROLE) {
        require(_knownPermissions[permission], "Permissions: unknown permission");
        require(account != address(0), "Permissions: zero address");
        require(!_permissions[permission][account], "Permissions: already granted");
        _permissions[permission][account] = true;
        emit PermissionGranted(permission, account);
    }

    function revoke(bytes32 permission, address account) external onlyRole(PERMISSION_ADMIN_ROLE) {
        require(_permissions[permission][account], "Permissions: not granted");
        _permissions[permission][account] = false;
        emit PermissionRevoked(permission, account);
    }

    function hasPermission(bytes32 permission, address account) external view returns (bool) {
        return _permissions[permission][account];
    }

    function isDefined(bytes32 permission) external view returns (bool) {
        return _knownPermissions[permission];
    }
}
