// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC777/ERC777.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./lib/Snapshots.sol";
import "./ISnapper.sol";
import "./IEasyMinter.sol";

/// @author Philippe Dumonet
contract ERC777SnapshotWrapper is ERC777, ISnapper {
    using SafeERC20 for IERC20;
    using Snapshots for Snapshots.Uint256Snapshots;

    event Snapshot(uint256 id);

    IERC20 public immutable backingToken;
    mapping(address => Snapshots.Uint256Snapshots) private accountBalSnapshots;
    Snapshots.Uint256Snapshots private totalSupplySnapshots;
    uint256 private currentSnapshotId;

    constructor(
        IERC20 _backingToken,
        string memory _name,
        string memory _symbol,
        address[] memory _defaultOperators
    ) 
        ERC777(_name, _symbol, _defaultOperators)
    {
        backingToken = _backingToken;
    }

    function depositFor(address _recipient, uint256 _amount) external {
        backingToken.safeTransferFrom(msg.sender, address(this), _amount);
        _mint(_recipient, _amount, "", "", false);
    }

    function mintTo(address _recipient, uint256 _amount) external {
        require(
            _amount + totalSupply() <= backingToken.balanceOf(address(this)),
            "W37: Too large mint"
        );
        _mint(_recipient, _amount, "", "", false);
    }

    function withdrawTo(address _recipient, uint256 _amount) external {
        _burn(msg.sender, _amount, "", "");
        backingToken.safeTransfer(_recipient, _amount);
    }

    function snapshot() external returns (uint256) {
        uint256 currentId = ++currentSnapshotId;
        emit Snapshot(currentId);
        return currentId;
    }

    function balanceOfAt(address _account, uint256 _snapshotId) public view returns (uint256) {
        (bool snapshotted, uint256 value) =
            accountBalSnapshots[_account].getValueAt(_snapshotId, currentSnapshotId);
        return snapshotted ? value : balanceOf(_account);
    }

    function totalSupplyAt(uint256 _snapshotId) public view returns (uint256) {
        (bool snapshotted, uint256 value) =
            totalSupplySnapshots.getValueAt(_snapshotId, currentSnapshotId);
        return snapshotted ? value : totalSupply();
    }

    function _beforeTokenTransfer(
        address _operator,
        address _from,
        address _to,
        uint256 _amount
    ) internal override {
        super._beforeTokenTransfer(_operator, _from, _to, _amount);

        if (_from == address(0)) {
            _updateTotalSupplySnapshot();
            _updateAccountSnapshot(_to);
        } else if (_to == address(0)) {
            _updateAccountSnapshot(_from);
            _updateTotalSupplySnapshot();
        } else {
            _updateAccountSnapshot(_from);
            _updateAccountSnapshot(_to);
        }
    }

    function _updateAccountSnapshot(address _account) private {
        accountBalSnapshots[_account].update(balanceOf(_account), currentSnapshotId);
    }

    function _updateTotalSupplySnapshot() private {
        totalSupplySnapshots.update(totalSupply(), currentSnapshotId);
    }
}
