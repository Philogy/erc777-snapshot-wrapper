// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IEasyMinter {
    function depositFor(address _recipient, uint256 _amount) external;
    function mintTo(address _recipient, uint256 _amount) external;
    function withdrawTo(address _recipient, uint256 _amount) external;
}
