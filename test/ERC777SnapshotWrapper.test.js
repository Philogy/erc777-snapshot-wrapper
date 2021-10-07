const { expect } = require('chai')
const { ethers } = require('hardhat')
const { changeTokensBalances, parseUnit } = require('./utils.js')

describe('ERC777SnapshotWrapper', () => {
  let coreToken, wrapperToken, snapshotter
  let user1, user2, user3, users

  before(async () => {
    const TestERC20 = await ethers.getContractFactory('TestERC20')
    const ERC777Wrapper = await ethers.getContractFactory('ERC777SnapshotWrapper')
    const Snapshotter = await ethers.getContractFactory('Snapshotter')

    coreToken = await TestERC20.deploy()
    wrapperToken = await ERC777Wrapper.deploy(coreToken.address, 'Wrapper testing token', 'WTT', [])
    snapshotter = await Snapshotter.deploy(wrapperToken.address)
    ;[user1, user2, user3, ...users] = await ethers.getSigners()
  })

  describe('initial conditions', () => {
    it('requires snapshot for historic lookup', async () => {
      await expect(wrapperToken.balanceOfAt(user1.address, 0)).to.be.revertedWith(
        'Snapshots: Id is 0'
      )
      await expect(wrapperToken.totalSupplyAt(0)).to.be.revertedWith('Snapshots: Id is 0')
    })
    it('requires specified snapshot to exist', async () => {
      await expect(wrapperToken.balanceOfAt(user1.address, 1)).to.be.revertedWith(
        'Snapshots: Nonexistent id'
      )
      await expect(wrapperToken.totalSupplyAt(1)).to.be.revertedWith('Snapshots: Nonexistent id')
    })
  })
  describe('minting and redeeming', () => {
    describe('direct mint', () => {
      const transferAmount = parseUnit(1)
      const firstMint = parseUnit(0.2)
      it('disallows mint without balance', async () => {
        await expect(wrapperToken.mintTo(user1.address, 1)).to.be.revertedWith(
          'W37: Too large mint'
        )
      })
      it('disallows mint with insufficient balance', async () => {
        await expect(() =>
          coreToken.mint(wrapperToken.address, transferAmount)
        ).to.changeTokenBalance(coreToken, wrapperToken, transferAmount)
        await expect(wrapperToken.mintTo(user1.address, transferAmount.add(1))).to.be.revertedWith(
          'W37: Too large mint'
        )
      })
      it('allows mint with available balance', async () => {
        await expect(() => wrapperToken.mintTo(user2.address, firstMint)).to.changeTokenBalance(
          wrapperToken,
          user2,
          firstMint
        )
        expect(await wrapperToken.totalSupply()).to.equal(firstMint)
      })
      it('disallows minting with allocated balance', async () => {
        expect(await coreToken.balanceOf(wrapperToken.address)).to.equal(transferAmount)
        await expect(wrapperToken.mintTo(user1.address, transferAmount)).to.be.revertedWith(
          'W37: Too large mint'
        )
      })
    })
    describe('deposit mint', () => {
      const userBalance = parseUnit(2)
      before(async () => {
        await coreToken.mint(user1.address, userBalance)
        expect(await coreToken.balanceOf(user1.address)).to.equal(userBalance)
        await expect(coreToken.approve(wrapperToken.address, ethers.constants.MaxUint256))
          .to.emit(coreToken, 'Approval')
          .withArgs(user1.address, wrapperToken.address, ethers.constants.MaxUint256)
      })
      it('disallows insufficient balance mint', async () => {
        await expect(wrapperToken.depositFor(user1.address, userBalance.add(1))).to.be.revertedWith(
          'ERC20: transfer amount exceeds balance'
        )
      })
      it('allows deposit', async () => {
        const depositAmount = userBalance.div(2)
        await changeTokensBalances(
          () => wrapperToken.depositFor(user2.address, depositAmount),
          [coreToken, coreToken, wrapperToken],
          [user1, wrapperToken, user2],
          [depositAmount.mul(-1), depositAmount, depositAmount]
        )
      })
    })
    describe('withdrawing', () => {
      it('disallows withdrawing without balance', async () => {
        expect(await wrapperToken.balanceOf(user1.address)).to.equal(0)
        await expect(wrapperToken.withdrawTo(user1.address, 1)).to.be.revertedWith(
          'ERC777: burn amount exceeds balance'
        )
      })
      it('allows withdrawing with balance', async () => {
        const withdrawAmount = await wrapperToken.balanceOf(user2.address)
        await changeTokensBalances(
          () => wrapperToken.connect(user2).withdrawTo(user1.address, withdrawAmount),
          [coreToken, coreToken, wrapperToken],
          [user1, wrapperToken, user2],
          [withdrawAmount, withdrawAmount.mul(-1), withdrawAmount.mul(-1)]
        )
      })
    })
  })
  describe('snapshotting', () => {
    const mintWrapped = async (recipient, amount) => {
      await coreToken.mint(wrapperToken.address, amount)
      await wrapperToken.mintTo(recipient, amount)
    }
    const snapshotGetId = async () => {
      await snapshotter.takeSnapshot()
      return await snapshotter.lastSnapshotId()
    }

    it('returns new snapshot id when creating snpahots', async () => {
      expect(await snapshotGetId()).equal(1)
      expect(await snapshotGetId()).equal(2)
      expect(await snapshotGetId()).equal(3)
      await wrapperToken.snapshot()
      expect(await snapshotGetId()).equal(5)
    })
    it('keep track of balance changes through snapshots', async () => {
      const snapshots = []

      const mint1 = parseUnit(1)
      await mintWrapped(user1.address, mint1)
      snapshots.push(await snapshotGetId())

      const transfer1 = parseUnit(0.5)
      await wrapperToken.transfer(user2.address, transfer1)
      snapshots.push(await snapshotGetId())

      const transfer2 = parseUnit(0.4)
      await wrapperToken.connect(user2).transfer(user1.address, transfer2)
      snapshots.push(await snapshotGetId())

      expect(await wrapperToken.balanceOfAt(user1.address, snapshots[0])).to.equal(mint1)
      expect(await wrapperToken.balanceOfAt(user2.address, snapshots[0])).to.equal(0)

      expect(await wrapperToken.balanceOfAt(user1.address, snapshots[1])).to.equal(
        mint1.sub(transfer1)
      )
      expect(await wrapperToken.balanceOfAt(user2.address, snapshots[1])).to.equal(transfer1)

      const user1FinalBal = mint1.sub(transfer1).add(transfer2)
      const user2FinalBal = transfer1.sub(transfer2)
      expect(await wrapperToken.balanceOf(user1.address)).equal(user1FinalBal)
      expect(await wrapperToken.balanceOfAt(user1.address, snapshots[2])).equal(user1FinalBal)
      expect(await wrapperToken.balanceOf(user2.address)).equal(user2FinalBal)
      expect(await wrapperToken.balanceOfAt(user2.address, snapshots[2])).equal(user2FinalBal)

      await wrapperToken.withdrawTo(user3.address, user1FinalBal)
      await wrapperToken.connect(user2).withdrawTo(user3.address, user2FinalBal)
    })
    it('keeps track of totalSupply', async () => {
      expect(await wrapperToken.totalSupply()).to.equal(0)

      const snapshots = []
      const increaseSupply = async (amount) => await mintWrapped(user1.address, parseUnit(amount))
      const decreaseSupply = async (amount) =>
        await wrapperToken.withdrawTo(user3.address, parseUnit(amount))
      const snapshot = async () => {
        snapshots.push({
          id: await snapshotGetId(),
          totalSupply: await wrapperToken.totalSupply()
        })
      }

      await increaseSupply(3)
      await snapshot()

      await increaseSupply(10)
      await increaseSupply(2.5)
      await decreaseSupply(7.3729)
      await snapshot()

      await decreaseSupply(2)
      await snapshot()

      for (const { id, totalSupply } of snapshots) {
        expect(await wrapperToken.totalSupplyAt(id)).to.equal(totalSupply)
      }
    })
  })
})
