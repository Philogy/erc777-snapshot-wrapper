# ERC777SnapshotWrapper
`ERC777SnapshotWrapper` is an ERC777 compliant token contract that serves as a
wrapper of an arbitrary ERC20 token. This means that the wrapped token can only
be minted / burnt by depositing or withdrawing the underlying ERC20 tokens.

## Methods
Beside the standard methods as defined in [EIP777](https://eips.ethereum.org/EIPS/eip-777)
the following additional methods have been implemented to support wrapping and
snapshots.

### Constructor
* Parameters: `address _backingToken`; `string _name`, `string _symbol`,
  `address[] _defaultOperators`
  * `_backingToken`: the address of the ERC20 token contract that is to be
    wrapped.
  * `_name`: name to be used for the wrapping token
  * `_symbol`: symbol to be used for the wrapping token (for example: DAI, USDT, WETH)
  * `_defaultOperators`: list of default operators as defined in EIP777

### Minting / Reedeming

* `depositFor(address, uint256)`

  Pulls the backing ERC20 token and mints wrapper tokens 1:1. Requires the
  `msg.sender` to have approved the wrapper token contract prior to calling.
  * Parameters: `address _recipient`; `uint256 _amount`
    * `_recipient`: the address to receive the newly minted wrapper tokens
    * `_amount`: the amount of backing tokens to deposit, consequently also
      represents the exact amount of wrapper tokens to be minted
  * Events: This method emits no special events beside the events defined in the
    EIP777 standard (`Minted`, `Transfer`)

* `mintTo(address, uint256)`

  Uses excess backing token balance to mint tokens (`balance` - `totalSupply`).
  Useful for contracts wishing to mint wrapper tokens as no approval is
  necessary. Contracts can atomically send the backing tokens to the wrapper
  contract and subsequently use `mintTo` to mint the wrapped equivalent.
  * Parameters: `address _recipient`; `uint256 _amount`
    * `_recipient`: the address to receive the newly minted wrapper tokens
    * `_amount`: amount of wrapper tokens to mint. Reverts if `_amount` is above
      the available excess
  * Events: This method emits no special events beside the events defined in the
    EIP777 standard (`Minted`, `Transfer`)

* `withdrawTo(address, uint256)`

  Redeems wrapper tokens for underlying backing token by burning wrapper tokens
  from the `msg.sender`.
  * Parameters: `address _recipient, uint256 _amount`
    * `_recipient`: recipient of redeemed backing tokens
    * `_amount`: amount to burn and subsequently release
  * Events: This method emits no special events beside the events defined in the
    EIP777 standard (`Burned`, `Transfer`)

### Snapshots

* `snapshot() -> (uint256)`

  Creates a new snapshot returning the new snapshotId

  * Return value(s):
    * `uint256 snapshotId`: ID of newly created snapshot. Can be used to
      retrieve balances and totalSupply as they were at the time of the creation
      of the snapshot
  * Events:
    * `Snapshot(uint256 snapshotId)`:
      * `uint256 snapshotId`: ID of new snapshot

* `[view] balanceOfAt(address, uint256) -> (uint256)`

  Retrieves historical balance. Will return the balance of the address as it was
  when the snapshot was created.

  * Parameters: `address _account`; `uint256 _snapshotId`
    * `_account`: address of account for which to retrieve the historical
      balance
    * `_snapshotId`: the ID of the snapshot to reference
  * Return value(s):
    * `uint256 balance`: historical balance of wrapper token for the querried account

* `[view] totalSupplyAt(uint256) -> (uint256)`

  Similar to `balanceOfAt` retrieves the historical totalSupply at different
  snapshots.

  * Parameters: `uint256 _snapshotId`
    * `_snapshotId`: the ID of the snapshot to reference
  * Return value(s):
    * `uint256 totalSupply`: historical totalSupply of the wrapper token at snapshot
