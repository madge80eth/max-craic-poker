// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../contracts/CraicHomeGame.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract CraicHomeGameTest is Test {
    CraicHomeGame homeGame;
    MockERC20 buyIn;
    MockERC20 sToken; // sponsor token

    address deployer = makeAddr("deployer");
    address signerAddr;
    uint256 signerKey = 0xA11CE;
    address protocol = makeAddr("protocol");
    address host = makeAddr("host");
    address p1 = makeAddr("p1");
    address p2 = makeAddr("p2");
    address p3 = makeAddr("p3");
    address p4 = makeAddr("p4");
    address p5 = makeAddr("p5");
    address p6 = makeAddr("p6");
    address sponsor1 = makeAddr("sponsor1");

    uint256 constant BUY_IN = 100e18;

    function setUp() public {
        signerAddr = vm.addr(signerKey);

        vm.prank(deployer);
        homeGame = new CraicHomeGame(signerAddr, protocol);

        buyIn = new MockERC20("BuyIn", "BUY");
        sToken = new MockERC20("SponsorToken", "SPO");

        address[6] memory players = [p1, p2, p3, p4, p5, p6];
        for (uint256 i = 0; i < 6; i++) {
            buyIn.mint(players[i], 10_000e18);
            vm.prank(players[i]);
            buyIn.approve(address(homeGame), type(uint256).max);
        }

        sToken.mint(sponsor1, 10_000e18);
        vm.prank(sponsor1);
        sToken.approve(address(homeGame), type(uint256).max);
    }

    // ─── Helpers ───

    function _createGame(uint16 feeBps) internal returns (bytes32) {
        vm.prank(host);
        return homeGame.createGame("game-1", address(buyIn), BUY_IN, feeBps);
    }

    function _createFreeGame() internal returns (bytes32) {
        vm.prank(host);
        return homeGame.createGame("free-1", address(0), 0, 100);
    }

    function _createETHGame() internal returns (bytes32) {
        vm.prank(host);
        return homeGame.createGame("eth-1", address(0), 1 ether, 100);
    }

    function _joinN(bytes32 gh, uint8 n) internal {
        address[6] memory players = [p1, p2, p3, p4, p5, p6];
        for (uint8 i = 0; i < n; i++) {
            vm.prank(players[i]);
            homeGame.join(gh);
        }
    }

    function _joinNETH(bytes32 gh, uint8 n) internal {
        address[6] memory players = [p1, p2, p3, p4, p5, p6];
        for (uint8 i = 0; i < n; i++) {
            vm.deal(players[i], 10 ether);
            vm.prank(players[i]);
            homeGame.join{value: 1 ether}(gh);
        }
    }

    function _start(bytes32 gh) internal {
        vm.prank(signerAddr);
        homeGame.startGame(gh);
    }

    function _complete2Winners(
        bytes32 gh,
        address w1,
        address w2,
        address token,
        uint256 amt1,
        uint256 amt2
    ) internal {
        address[] memory winners = new address[](2);
        winners[0] = w1;
        winners[1] = w2;

        address[] memory tokens = new address[](1);
        tokens[0] = token;

        uint256[][] memory amounts = new uint256[][](2);
        amounts[0] = new uint256[](1);
        amounts[0][0] = amt1;
        amounts[1] = new uint256[](1);
        amounts[1][0] = amt2;

        vm.prank(signerAddr);
        homeGame.completeGame(gh, winners, tokens, amounts);
    }

    // ═══════════════════════════════════════════════════════════════
    //  1. createGame
    // ═══════════════════════════════════════════════════════════════

    function test_createGame_basic() public {
        bytes32 gh = _createGame(100);
        CraicHomeGame.Game memory g = homeGame.getGame(gh);

        assertEq(g.creator, host);
        assertEq(g.buyInToken, address(buyIn));
        assertEq(g.buyInAmount, BUY_IN);
        assertEq(g.protocolFeeBps, 100);
        assertEq(g.playerCount, 0);
        assertEq(uint8(g.status), uint8(CraicHomeGame.GameStatus.Open));
        assertTrue(g.createdAt > 0);
    }

    function test_createGame_reverts_feeTooLow() public {
        vm.prank(host);
        vm.expectRevert(CraicHomeGame.InvalidFee.selector);
        homeGame.createGame("x", address(buyIn), BUY_IN, 99);
    }

    function test_createGame_reverts_emptyGameId() public {
        vm.prank(host);
        vm.expectRevert(CraicHomeGame.InvalidParams.selector);
        homeGame.createGame("", address(buyIn), BUY_IN, 100);
    }

    function test_createGame_reverts_feeTooHigh() public {
        vm.prank(host);
        vm.expectRevert(CraicHomeGame.InvalidFee.selector);
        homeGame.createGame("x", address(buyIn), BUY_IN, 501);
    }

    // ═══════════════════════════════════════════════════════════════
    //  2. join
    // ═══════════════════════════════════════════════════════════════

    function test_join_transfersBuyIn() public {
        bytes32 gh = _createGame(100);
        uint256 before_ = buyIn.balanceOf(p1);

        vm.prank(p1);
        homeGame.join(gh);

        assertEq(buyIn.balanceOf(p1), before_ - BUY_IN);
        assertEq(homeGame.tokenBalance(gh, address(buyIn)), BUY_IN);
        assertTrue(homeGame.hasJoined(gh, p1));

        CraicHomeGame.Game memory g = homeGame.getGame(gh);
        assertEq(g.playerCount, 1);
    }

    function test_join_freeGame() public {
        bytes32 gh = _createFreeGame();
        vm.prank(p1);
        homeGame.join(gh);
        assertTrue(homeGame.hasJoined(gh, p1));
    }

    function test_join_ethBuyIn() public {
        bytes32 gh = _createETHGame();
        vm.deal(p1, 10 ether);

        vm.prank(p1);
        homeGame.join{value: 1 ether}(gh);

        assertEq(homeGame.tokenBalance(gh, address(0)), 1 ether);
        assertTrue(homeGame.hasJoined(gh, p1));
    }

    function test_join_reverts_doubleJoin() public {
        bytes32 gh = _createGame(100);
        vm.prank(p1);
        homeGame.join(gh);

        vm.prank(p1);
        vm.expectRevert(CraicHomeGame.AlreadyJoined.selector);
        homeGame.join(gh);
    }

    function test_join_reverts_notOpen() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 2);
        _start(gh);

        vm.prank(p3);
        vm.expectRevert(CraicHomeGame.GameNotOpen.selector);
        homeGame.join(gh);
    }

    function test_join_reverts_wrongETH() public {
        bytes32 gh = _createETHGame();
        vm.deal(p1, 10 ether);

        vm.prank(p1);
        vm.expectRevert(CraicHomeGame.WrongETHAmount.selector);
        homeGame.join{value: 0.5 ether}(gh);
    }

    function test_join_reverts_ethSentWithERC20BuyIn() public {
        bytes32 gh = _createGame(100);
        vm.deal(p1, 1 ether);

        vm.prank(p1);
        vm.expectRevert(CraicHomeGame.InvalidParams.selector);
        homeGame.join{value: 1 ether}(gh);
    }

    // ═══════════════════════════════════════════════════════════════
    //  3. sponsor
    // ═══════════════════════════════════════════════════════════════

    function test_sponsor_erc20() public {
        bytes32 gh = _createGame(100);

        vm.prank(sponsor1);
        homeGame.sponsor(gh, address(sToken), 500e18);

        assertEq(homeGame.tokenBalance(gh, address(sToken)), 500e18);

        address[] memory tokens = homeGame.getGameTokens(gh);
        assertEq(tokens.length, 1);
        assertEq(tokens[0], address(sToken));
    }

    function test_sponsor_eth() public {
        bytes32 gh = _createGame(100);
        vm.deal(sponsor1, 5 ether);

        vm.prank(sponsor1);
        homeGame.sponsor{value: 3 ether}(gh, address(0), 0);

        assertEq(homeGame.tokenBalance(gh, address(0)), 3 ether);
    }

    function test_sponsor_reverts_completedGame() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 2);
        _start(gh);
        _complete2Winners(gh, p1, p2, address(buyIn), 99e18, 99e18);

        vm.prank(sponsor1);
        vm.expectRevert(CraicHomeGame.InvalidParams.selector);
        homeGame.sponsor(gh, address(sToken), 100e18);
    }

    // ═══════════════════════════════════════════════════════════════
    //  4. startGame
    // ═══════════════════════════════════════════════════════════════

    function test_startGame_bySigner() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 3);
        _start(gh);

        CraicHomeGame.Game memory g = homeGame.getGame(gh);
        assertEq(uint8(g.status), uint8(CraicHomeGame.GameStatus.Active));
    }

    function test_startGame_byCreator() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 2);

        vm.prank(host);
        homeGame.startGame(gh);

        CraicHomeGame.Game memory g = homeGame.getGame(gh);
        assertEq(uint8(g.status), uint8(CraicHomeGame.GameStatus.Active));
    }

    function test_startGame_reverts_unauthorized() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 2);

        vm.prank(p1);
        vm.expectRevert(CraicHomeGame.NotAuthorized.selector);
        homeGame.startGame(gh);
    }

    function test_startGame_reverts_lessThan2() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 1);

        vm.prank(signerAddr);
        vm.expectRevert(CraicHomeGame.InvalidParams.selector);
        homeGame.startGame(gh);
    }

    // ═══════════════════════════════════════════════════════════════
    //  5. completeGame — happy path
    // ═══════════════════════════════════════════════════════════════

    function test_completeGame_singleToken() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 6);
        _start(gh);

        _complete2Winners(gh, p1, p2, address(buyIn), 390e18, 204e18);

        CraicHomeGame.Game memory g = homeGame.getGame(gh);
        assertEq(uint8(g.status), uint8(CraicHomeGame.GameStatus.Completed));
        assertEq(homeGame.getPayoutAmount(gh, p1, address(buyIn)), 390e18);
        assertEq(homeGame.getPayoutAmount(gh, p2, address(buyIn)), 204e18);
    }

    function test_completeGame_multiToken() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 6);

        vm.prank(sponsor1);
        homeGame.sponsor(gh, address(sToken), 400e18);

        _start(gh);

        // buyIn pool: 600e18, fee 6e18, distributable 594e18
        // sToken pool: 400e18, fee 4e18, distributable 396e18
        address[] memory winners = new address[](2);
        winners[0] = p1;
        winners[1] = p2;

        address[] memory tokens = new address[](2);
        tokens[0] = address(buyIn);
        tokens[1] = address(sToken);

        uint256[][] memory amounts = new uint256[][](2);
        amounts[0] = new uint256[](2);
        amounts[0][0] = 390e18;
        amounts[0][1] = 264e18;
        amounts[1] = new uint256[](2);
        amounts[1][0] = 204e18;
        amounts[1][1] = 132e18;

        vm.prank(signerAddr);
        homeGame.completeGame(gh, winners, tokens, amounts);

        assertEq(homeGame.getPayoutAmount(gh, p1, address(buyIn)), 390e18);
        assertEq(homeGame.getPayoutAmount(gh, p1, address(sToken)), 264e18);
        assertEq(homeGame.getPayoutAmount(gh, p2, address(buyIn)), 204e18);
        assertEq(homeGame.getPayoutAmount(gh, p2, address(sToken)), 132e18);
    }

    function test_completeGame_reverts_notSigner() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 2);
        _start(gh);

        address[] memory winners = new address[](1);
        winners[0] = p1;
        address[] memory tokens = new address[](1);
        tokens[0] = address(buyIn);
        uint256[][] memory amounts = new uint256[][](1);
        amounts[0] = new uint256[](1);
        amounts[0][0] = 200e18;

        vm.prank(host);
        vm.expectRevert(CraicHomeGame.NotAuthorized.selector);
        homeGame.completeGame(gh, winners, tokens, amounts);
    }

    function test_completeGame_reverts_distributionExceeds() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 2);
        _start(gh);

        address[] memory winners = new address[](1);
        winners[0] = p1;
        address[] memory tokens = new address[](1);
        tokens[0] = address(buyIn);
        uint256[][] memory amounts = new uint256[][](1);
        amounts[0] = new uint256[](1);
        amounts[0][0] = 300e18; // pool is only 200e18

        vm.prank(signerAddr);
        vm.expectRevert(CraicHomeGame.DistributionExceedsBalance.selector);
        homeGame.completeGame(gh, winners, tokens, amounts);
    }

    function test_completeGame_reverts_notActive() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 2);

        address[] memory winners = new address[](1);
        winners[0] = p1;
        address[] memory tokens = new address[](0);
        uint256[][] memory amounts = new uint256[][](1);
        amounts[0] = new uint256[](0);

        vm.prank(signerAddr);
        vm.expectRevert(CraicHomeGame.GameNotActive.selector);
        homeGame.completeGame(gh, winners, tokens, amounts);
    }

    // ═══════════════════════════════════════════════════════════════
    //  6. claim
    // ═══════════════════════════════════════════════════════════════

    function test_claim_singleToken() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 6);
        _start(gh);
        _complete2Winners(gh, p1, p2, address(buyIn), 390e18, 204e18);

        uint256 before_ = buyIn.balanceOf(p1);
        vm.prank(p1);
        homeGame.claim(gh);

        assertEq(buyIn.balanceOf(p1), before_ + 390e18);
        assertTrue(homeGame.hasClaimed(gh, p1));
    }

    function test_claim_multiToken() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 2);

        vm.prank(sponsor1);
        homeGame.sponsor(gh, address(sToken), 400e18);

        _start(gh);

        address[] memory winners = new address[](2);
        winners[0] = p1;
        winners[1] = p2;
        address[] memory tokens = new address[](2);
        tokens[0] = address(buyIn);
        tokens[1] = address(sToken);
        uint256[][] memory amounts = new uint256[][](2);
        amounts[0] = new uint256[](2);
        amounts[0][0] = 130e18;
        amounts[0][1] = 260e18;
        amounts[1] = new uint256[](2);
        amounts[1][0] = 68e18;
        amounts[1][1] = 136e18;

        vm.prank(signerAddr);
        homeGame.completeGame(gh, winners, tokens, amounts);

        uint256 buyBefore = buyIn.balanceOf(p1);
        uint256 sBefore = sToken.balanceOf(p1);

        vm.prank(p1);
        homeGame.claim(gh);

        assertEq(buyIn.balanceOf(p1), buyBefore + 130e18);
        assertEq(sToken.balanceOf(p1), sBefore + 260e18);
    }

    function test_claim_reverts_doubleClaim() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 2);
        _start(gh);
        _complete2Winners(gh, p1, p2, address(buyIn), 99e18, 99e18);

        vm.prank(p1);
        homeGame.claim(gh);

        vm.prank(p1);
        vm.expectRevert(CraicHomeGame.AlreadyClaimed.selector);
        homeGame.claim(gh);
    }

    function test_claim_reverts_nonWinner() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 3);
        _start(gh);
        _complete2Winners(gh, p1, p2, address(buyIn), 195e18, 102e18);

        vm.prank(p3);
        vm.expectRevert(CraicHomeGame.NothingToClaim.selector);
        homeGame.claim(gh);
    }

    function test_claim_reverts_beforeCompletion() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 2);
        _start(gh);

        vm.prank(p1);
        vm.expectRevert(CraicHomeGame.GameNotCompleted.selector);
        homeGame.claim(gh);
    }

    function test_claim_bothWinners() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 6);
        _start(gh);
        _complete2Winners(gh, p1, p2, address(buyIn), 390e18, 204e18);

        vm.prank(p1);
        homeGame.claim(gh);
        vm.prank(p2);
        homeGame.claim(gh);

        assertEq(homeGame.tokenBalance(gh, address(buyIn)), 0);
    }

    // ═══════════════════════════════════════════════════════════════
    //  7. cancelGame
    // ═══════════════════════════════════════════════════════════════

    function test_cancel_refundsBuyIns() public {
        bytes32 gh = _createGame(100);
        uint256 before1 = buyIn.balanceOf(p1);
        uint256 before2 = buyIn.balanceOf(p2);
        _joinN(gh, 2);

        vm.prank(host);
        homeGame.cancelGame(gh, "changed my mind");

        assertEq(buyIn.balanceOf(p1), before1);
        assertEq(buyIn.balanceOf(p2), before2);

        CraicHomeGame.Game memory g = homeGame.getGame(gh);
        assertEq(uint8(g.status), uint8(CraicHomeGame.GameStatus.Cancelled));
    }

    function test_cancel_refundsMixedDeposits() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 2);

        uint256 sBefore = sToken.balanceOf(sponsor1);
        vm.prank(sponsor1);
        homeGame.sponsor(gh, address(sToken), 500e18);

        vm.prank(host);
        homeGame.cancelGame(gh, "sponsors pulled out");

        assertEq(sToken.balanceOf(sponsor1), sBefore);
        assertEq(homeGame.tokenBalance(gh, address(buyIn)), 0);
        assertEq(homeGame.tokenBalance(gh, address(sToken)), 0);
    }

    function test_cancel_bySigner() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 2);
        _start(gh);

        vm.prank(signerAddr);
        homeGame.cancelGame(gh, "server error");

        CraicHomeGame.Game memory g = homeGame.getGame(gh);
        assertEq(uint8(g.status), uint8(CraicHomeGame.GameStatus.Cancelled));
    }

    function test_cancel_reverts_unauthorized() public {
        bytes32 gh = _createGame(100);

        vm.prank(p1);
        vm.expectRevert(CraicHomeGame.NotAuthorized.selector);
        homeGame.cancelGame(gh, "nope");
    }

    function test_cancel_reverts_alreadyCompleted() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 2);
        _start(gh);
        _complete2Winners(gh, p1, p2, address(buyIn), 99e18, 99e18);

        vm.prank(host);
        vm.expectRevert(CraicHomeGame.InvalidParams.selector);
        homeGame.cancelGame(gh, "too late");
    }

    function test_cancel_ethGame() public {
        bytes32 gh = _createETHGame();
        _joinNETH(gh, 3);

        uint256 before1 = p1.balance;
        uint256 before2 = p2.balance;
        uint256 before3 = p3.balance;

        vm.prank(host);
        homeGame.cancelGame(gh, "eth cancel");

        assertEq(p1.balance, before1 + 1 ether);
        assertEq(p2.balance, before2 + 1 ether);
        assertEq(p3.balance, before3 + 1 ether);
    }

    // ═══════════════════════════════════════════════════════════════
    //  8. refundUnclaimed
    // ═══════════════════════════════════════════════════════════════

    function test_refundUnclaimed_fullRefund() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 2);
        _start(gh);
        _complete2Winners(gh, p1, p2, address(buyIn), 99e18, 99e18);

        vm.warp(block.timestamp + 48 hours + 1);

        uint256 hostBefore = buyIn.balanceOf(host);
        homeGame.refundUnclaimed(gh);

        assertEq(buyIn.balanceOf(host), hostBefore + 198e18);
        assertEq(homeGame.tokenBalance(gh, address(buyIn)), 0);
    }

    function test_refundUnclaimed_partialClaim() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 6);
        _start(gh);
        _complete2Winners(gh, p1, p2, address(buyIn), 390e18, 204e18);

        vm.prank(p1);
        homeGame.claim(gh);

        vm.warp(block.timestamp + 48 hours + 1);

        uint256 hostBefore = buyIn.balanceOf(host);
        homeGame.refundUnclaimed(gh);

        assertEq(buyIn.balanceOf(host), hostBefore + 204e18);
    }

    function test_refundUnclaimed_reverts_beforeWindow() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 2);
        _start(gh);
        _complete2Winners(gh, p1, p2, address(buyIn), 99e18, 99e18);

        vm.warp(block.timestamp + 47 hours);

        vm.expectRevert(CraicHomeGame.ClaimWindowOpen.selector);
        homeGame.refundUnclaimed(gh);
    }

    function test_refundUnclaimed_reverts_allClaimed() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 2);
        _start(gh);
        _complete2Winners(gh, p1, p2, address(buyIn), 99e18, 99e18);

        vm.prank(p1);
        homeGame.claim(gh);
        vm.prank(p2);
        homeGame.claim(gh);

        vm.warp(block.timestamp + 48 hours + 1);

        vm.expectRevert(CraicHomeGame.NothingToRefund.selector);
        homeGame.refundUnclaimed(gh);
    }

    // ═══════════════════════════════════════════════════════════════
    //  9. Protocol fee
    // ═══════════════════════════════════════════════════════════════

    function test_fee_1percent() public {
        bytes32 gh = _createGame(100); // 1% = 100 bps
        _joinN(gh, 6);
        _start(gh);

        // Pool: 600e18, fee: 6e18, distributable: 594e18
        _complete2Winners(gh, p1, p2, address(buyIn), 390e18, 204e18);

        assertEq(buyIn.balanceOf(protocol), 6e18);
        assertEq(homeGame.tokenBalance(gh, address(buyIn)), 594e18);
    }

    function test_fee_5percent() public {
        bytes32 gh = _createGame(500); // 5%
        _joinN(gh, 6);
        _start(gh);

        // Pool: 600e18, fee: 30e18, distributable: 570e18
        _complete2Winners(gh, p1, p2, address(buyIn), 370e18, 200e18);

        assertEq(buyIn.balanceOf(protocol), 30e18);
    }


    function test_fee_multiToken() public {
        bytes32 gh = _createGame(100); // 1%
        _joinN(gh, 2);

        vm.prank(sponsor1);
        homeGame.sponsor(gh, address(sToken), 1000e18);

        _start(gh);

        // buyIn pool: 200e18, fee 2e18, dist 198e18
        // sToken pool: 1000e18, fee 10e18, dist 990e18
        address[] memory winners = new address[](2);
        winners[0] = p1;
        winners[1] = p2;
        address[] memory tokens = new address[](2);
        tokens[0] = address(buyIn);
        tokens[1] = address(sToken);
        uint256[][] memory amounts = new uint256[][](2);
        amounts[0] = new uint256[](2);
        amounts[0][0] = 130e18;
        amounts[0][1] = 640e18;
        amounts[1] = new uint256[](2);
        amounts[1][0] = 68e18;
        amounts[1][1] = 350e18;

        vm.prank(signerAddr);
        homeGame.completeGame(gh, winners, tokens, amounts);

        assertEq(buyIn.balanceOf(protocol), 2e18);
        assertEq(sToken.balanceOf(protocol), 10e18);
    }

    // ═══════════════════════════════════════════════════════════════
    //  10. Payout splits by bracket size
    // ═══════════════════════════════════════════════════════════════

    function test_payout_6players_65_35() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 6);
        _start(gh);

        _complete2Winners(gh, p1, p2, address(buyIn), 390e18, 204e18);

        vm.prank(p1);
        homeGame.claim(gh);
        vm.prank(p2);
        homeGame.claim(gh);

        assertEq(buyIn.balanceOf(p1), 10_000e18 - BUY_IN + 390e18);
        assertEq(buyIn.balanceOf(p2), 10_000e18 - BUY_IN + 204e18);
    }

    function test_payout_3winners_50_30_20() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 6);
        _start(gh);

        // 600e18 pool, fee 6e18, distributable 594e18, ~50/30/20
        address[] memory winners = new address[](3);
        winners[0] = p1;
        winners[1] = p2;
        winners[2] = p3;

        address[] memory tokens = new address[](1);
        tokens[0] = address(buyIn);

        uint256[][] memory amounts = new uint256[][](3);
        amounts[0] = new uint256[](1);
        amounts[0][0] = 297e18;
        amounts[1] = new uint256[](1);
        amounts[1][0] = 178e18;
        amounts[2] = new uint256[](1);
        amounts[2][0] = 119e18;

        vm.prank(signerAddr);
        homeGame.completeGame(gh, winners, tokens, amounts);

        vm.prank(p1);
        homeGame.claim(gh);
        vm.prank(p2);
        homeGame.claim(gh);
        vm.prank(p3);
        homeGame.claim(gh);

        assertEq(buyIn.balanceOf(p1), 10_000e18 - BUY_IN + 297e18);
        assertEq(buyIn.balanceOf(p2), 10_000e18 - BUY_IN + 178e18);
        assertEq(buyIn.balanceOf(p3), 10_000e18 - BUY_IN + 119e18);
    }

    function test_payout_4winners_40_25_20_15() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 6);
        _start(gh);

        // 600e18, fee 6e18, distributable 594e18, ~40/25/20/15
        address[] memory winners = new address[](4);
        winners[0] = p1;
        winners[1] = p2;
        winners[2] = p3;
        winners[3] = p4;

        address[] memory tokens = new address[](1);
        tokens[0] = address(buyIn);

        uint256[][] memory amounts = new uint256[][](4);
        for (uint256 i = 0; i < 4; i++) {
            amounts[i] = new uint256[](1);
        }
        amounts[0][0] = 237e18;
        amounts[1][0] = 149e18;
        amounts[2][0] = 119e18;
        amounts[3][0] = 89e18;

        vm.prank(signerAddr);
        homeGame.completeGame(gh, winners, tokens, amounts);

        vm.prank(p1);
        homeGame.claim(gh);
        vm.prank(p2);
        homeGame.claim(gh);
        vm.prank(p3);
        homeGame.claim(gh);
        vm.prank(p4);
        homeGame.claim(gh);

        assertEq(homeGame.tokenBalance(gh, address(buyIn)), 0);
    }

    function test_payout_5winners_35_22_18_14_11() public {
        vm.prank(host);
        bytes32 gh = homeGame.createGame("big-game", address(buyIn), 200e18, 100);

        address[6] memory players = [p1, p2, p3, p4, p5, p6];
        for (uint8 i = 0; i < 5; i++) {
            vm.prank(players[i]);
            homeGame.join(gh);
        }
        _start(gh);

        // 5 * 200e18 = 1000e18, fee 10e18, distributable 990e18, ~35/22/18/14/11
        address[] memory winners = new address[](5);
        winners[0] = p1;
        winners[1] = p2;
        winners[2] = p3;
        winners[3] = p4;
        winners[4] = p5;

        address[] memory tokens = new address[](1);
        tokens[0] = address(buyIn);

        uint256[][] memory amounts = new uint256[][](5);
        for (uint256 i = 0; i < 5; i++) {
            amounts[i] = new uint256[](1);
        }
        amounts[0][0] = 346e18;
        amounts[1][0] = 218e18;
        amounts[2][0] = 178e18;
        amounts[3][0] = 139e18;
        amounts[4][0] = 109e18;

        vm.prank(signerAddr);
        homeGame.completeGame(gh, winners, tokens, amounts);

        for (uint8 i = 0; i < 5; i++) {
            vm.prank(players[i]);
            homeGame.claim(gh);
        }

        assertEq(homeGame.tokenBalance(gh, address(buyIn)), 0);
    }

    // ═══════════════════════════════════════════════════════════════
    //  11. ETH support
    // ═══════════════════════════════════════════════════════════════

    function test_ethGame_fullCycle() public {
        bytes32 gh = _createETHGame();
        _joinNETH(gh, 4);
        _start(gh);

        // Pool: 4 ether, fee 1% = 0.04 ether, distributable 3.96 ether
        _complete2Winners(gh, p1, p2, address(0), 2.6 ether, 1.36 ether);

        assertEq(protocol.balance, 0.04 ether);

        uint256 before1 = p1.balance;
        vm.prank(p1);
        homeGame.claim(gh);
        assertEq(p1.balance, before1 + 2.6 ether);

        uint256 before2 = p2.balance;
        vm.prank(p2);
        homeGame.claim(gh);
        assertEq(p2.balance, before2 + 1.36 ether);
    }

    function test_ethSponsor_plusERC20BuyIn() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 2);

        vm.deal(sponsor1, 5 ether);
        vm.prank(sponsor1);
        homeGame.sponsor{value: 2 ether}(gh, address(0), 0);

        _start(gh);

        address[] memory winners = new address[](2);
        winners[0] = p1;
        winners[1] = p2;
        address[] memory tokens = new address[](2);
        tokens[0] = address(buyIn);
        tokens[1] = address(0);
        uint256[][] memory amounts = new uint256[][](2);
        amounts[0] = new uint256[](2);
        amounts[0][0] = 130e18;
        amounts[0][1] = 1.3 ether;
        amounts[1] = new uint256[](2);
        amounts[1][0] = 68e18;
        amounts[1][1] = 0.68 ether;

        vm.prank(signerAddr);
        homeGame.completeGame(gh, winners, tokens, amounts);

        uint256 ethBefore = p1.balance;
        uint256 buyBefore = buyIn.balanceOf(p1);
        vm.prank(p1);
        homeGame.claim(gh);

        assertEq(p1.balance, ethBefore + 1.3 ether);
        assertEq(buyIn.balanceOf(p1), buyBefore + 130e18);
    }

    // ═══════════════════════════════════════════════════════════════
    //  12. Admin
    // ═══════════════════════════════════════════════════════════════

    function test_setSigner() public {
        address newSigner = makeAddr("newSigner");
        vm.prank(deployer);
        homeGame.setSigner(newSigner);
        assertEq(homeGame.signer(), newSigner);
    }

    function test_setProtocolWallet() public {
        address newWallet = makeAddr("newWallet");
        vm.prank(deployer);
        homeGame.setProtocolWallet(newWallet);
        assertEq(homeGame.protocolWallet(), newWallet);
    }

    function test_transferOwnership() public {
        vm.prank(deployer);
        homeGame.transferOwnership(host);

        vm.prank(host);
        homeGame.setSigner(makeAddr("x"));
        assertEq(homeGame.signer(), makeAddr("x"));
    }

    function test_admin_reverts_nonOwner() public {
        vm.prank(p1);
        vm.expectRevert(CraicHomeGame.NotAuthorized.selector);
        homeGame.setSigner(p1);
    }

    // ═══════════════════════════════════════════════════════════════
    //  13. Views
    // ═══════════════════════════════════════════════════════════════

    function test_getPlayers() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 3);

        address[] memory players = homeGame.getPlayers(gh);
        assertEq(players.length, 3);
        assertEq(players[0], p1);
        assertEq(players[1], p2);
        assertEq(players[2], p3);
    }

    function test_getGameTokens() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 1);

        vm.prank(sponsor1);
        homeGame.sponsor(gh, address(sToken), 100e18);

        address[] memory tokens = homeGame.getGameTokens(gh);
        assertEq(tokens.length, 2);
        assertEq(tokens[0], address(buyIn));
        assertEq(tokens[1], address(sToken));
    }

    function test_getDeposits() public {
        bytes32 gh = _createGame(100);
        _joinN(gh, 2);

        vm.prank(sponsor1);
        homeGame.sponsor(gh, address(sToken), 100e18);

        CraicHomeGame.Deposit[] memory deps = homeGame.getDeposits(gh);
        assertEq(deps.length, 3);
        assertEq(deps[0].depositor, p1);
        assertEq(deps[0].amount, BUY_IN);
        assertEq(deps[1].depositor, p2);
        assertEq(deps[2].depositor, sponsor1);
        assertEq(deps[2].token, address(sToken));
    }
}
